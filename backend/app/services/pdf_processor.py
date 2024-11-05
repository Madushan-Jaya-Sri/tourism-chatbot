import os
import tempfile
from PyPDF2 import PdfReader
import pytesseract
from PIL import Image
import io
import boto3
from botocore.exceptions import ClientError
import chromadb
from chromadb.config import Settings
from openai import OpenAI
import pandas as pd
from app.config import Config
from flask_socketio import SocketIO
from app import socketio, db
from app.models.chat import PDFDocument

class PDFProcessor:
    def __init__(self, document_id=None):
        self.s3 = boto3.client(
            's3',
            aws_access_key_id=Config.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=Config.AWS_SECRET_ACCESS_KEY,
            region_name=Config.AWS_REGION
        )
        
        self.chroma_client = chromadb.Client(Settings(
            persist_directory=Config.CHROMA_PERSIST_DIRECTORY,
            is_persistent=True
        ))
        
        self.openai_client = OpenAI(api_key=Config.OPENAI_API_KEY)
        self.collection = self.chroma_client.get_or_create_collection("tourism_docs")
        self.document_id = document_id

    # Update the emit_progress method in the PDFProcessor class

    def emit_progress(self, status: str, message: str, percentage: int):
        """Emit processing progress through Socket.IO and update database."""
        if self.document_id and socketio:
            try:
                socketio.emit('document_progress', {
                    'document_id': self.document_id,
                    'status': status,
                    'message': message,
                    'percentage': percentage
                })
                
                # Update document in database
                from flask import current_app
                with current_app.app_context():
                    try:
                        document = PDFDocument.query.get(self.document_id)
                        if document:
                            document.status = status
                            document.processing_progress = percentage
                            document.current_step = message
                            db.session.commit()
                    except Exception as e:
                        print(f"Error updating document progress: {e}")
            except Exception as e:
                print(f"Error emitting progress: {e}")


    def download_from_s3(self, s3_key, local_path):
        """Download file from S3 with progress tracking."""
        try:
            self.emit_progress('processing', 'Downloading PDF from S3...', 30)
            self.s3.download_file(Config.S3_BUCKET, s3_key, local_path)
            return True
        except ClientError as e:
            print(f"Error downloading from S3: {e}")
            self.emit_progress('error', f'Error downloading from S3: {str(e)}', -1)
            raise

    def extract_text_from_pdf(self, pdf_path):
        """Extract text from PDF with enhanced progress tracking."""
        text_chunks = []
        try:
            self.emit_progress('processing', 'Starting text extraction...', 40)
            
            reader = PdfReader(pdf_path)
            total_pages = len(reader.pages)
            
            # Update total pages in database
            if self.document_id:
                try:
                    document = PDFDocument.query.get(self.document_id)
                    if document:
                        document.total_pages = total_pages
                        db.session.commit()
                except Exception as e:
                    print(f"Error updating total pages: {e}")
            
            for i, page in enumerate(reader.pages):
                current_page = i + 1
                self.emit_progress(
                    'processing',
                    f'Processing page {current_page}/{total_pages}',
                    40 + int((current_page / total_pages) * 20)
                )

                # Extract text content
                text = page.extract_text()
                
                # Process images in the page if they exist
                if '/XObject' in page['/Resources']:
                    xObject = page['/Resources']['/XObject'].get_object()
                    
                    for obj in xObject:
                        if xObject[obj]['/Subtype'] == '/Image':
                            try:
                                data = xObject[obj].get_data()
                                img = Image.open(io.BytesIO(data))
                                image_text = pytesseract.image_to_string(img)
                                text += "\n" + image_text
                            except Exception as e:
                                print(f"Error processing image on page {current_page}: {e}")
                
                # Split text into chunks of specified size
                words = text.split()
                for j in range(0, len(words), Config.CHUNK_SIZE):
                    chunk = " ".join(words[j:j + Config.CHUNK_SIZE])
                    if chunk.strip():  # Only add non-empty chunks
                        text_chunks.append(chunk)

        except Exception as e:
            self.emit_progress('error', f'Error processing PDF: {str(e)}', -1)
            raise
        
        return text_chunks

    def create_embeddings(self, text_chunks):
        """Create embeddings with detailed progress tracking."""
        try:
            embeddings = []
            total_chunks = len(text_chunks)
            
            self.emit_progress('processing', 'Starting embeddings creation...', 65)
            
            for i, chunk in enumerate(text_chunks):
                response = self.openai_client.embeddings.create(
                    model=Config.EMBEDDING_MODEL,
                    input=chunk
                )
                embeddings.append(response.data[0].embedding)
                
                if i % 5 == 0 or i == total_chunks - 1:  # Update progress every 5 chunks or on last chunk
                    progress = 65 + int((i / total_chunks) * 20)
                    self.emit_progress(
                        'processing', 
                        f'Creating embeddings {i+1}/{total_chunks}', 
                        progress
                    )
            
            return embeddings
                
        except Exception as e:
            self.emit_progress('error', f'Error creating embeddings: {str(e)}', -1)
            raise

    def process_pdf(self, s3_key, document_id):
        """Main processing function with comprehensive error handling."""
        try:
            self.document_id = document_id
            self.emit_progress('processing', 'Starting PDF processing...', 25)
            
            with tempfile.NamedTemporaryFile(delete=False) as temp_file:
                # Download PDF from S3
                if not self.download_from_s3(s3_key, temp_file.name):
                    raise Exception("Failed to download PDF from S3")

                # Extract text from PDF
                text_chunks = self.extract_text_from_pdf(temp_file.name)
                if not text_chunks:
                    raise Exception("No text content extracted from PDF")

                # Create embeddings
                self.emit_progress('processing', 'Creating embeddings...', 65)
                embeddings = self.create_embeddings(text_chunks)

                # Store in ChromaDB
                self.emit_progress('processing', 'Storing in vector database...', 90)
                self.collection.add(
                    embeddings=embeddings,
                    documents=text_chunks,
                    ids=[f"{document_id}_{i}" for i in range(len(text_chunks))]
                )

                self.emit_progress('completed', 'Processing complete!', 100)

                # Clean up temporary file
                os.unlink(temp_file.name)
                return True

        except Exception as e:
            error_message = f"Error processing PDF: {str(e)}"
            self.emit_progress('error', error_message, -1)
            
            # Update document error status in database
            try:
                document = PDFDocument.query.get(document_id)
                if document:
                    document.status = 'error'
                    document.error_message = error_message
                    document.processing_progress = 0
                    db.session.commit()
            except Exception as db_error:
                print(f"Error updating document error status: {db_error}")
            
            raise

    def delete_document_embeddings(self, document_id):
        """Delete document embeddings with error handling."""
        try:
            # Find all chunk IDs for this document
            ids_to_delete = [
                id for id in self.collection.get()["ids"]
                if id.startswith(f"{document_id}_")
            ]
            
            if ids_to_delete:
                self.collection.delete(ids=ids_to_delete)
            
            return True
        
        except Exception as e:
            print(f"Error deleting embeddings: {e}")
            raise

    def search_similar_chunks(self, query, n_results=5):
        """Search for similar chunks with error handling."""
        try:
            # Create embedding for the query
            query_embedding = self.openai_client.embeddings.create(
                model=Config.EMBEDDING_MODEL,
                input=query
            ).data[0].embedding

            # Search in ChromaDB
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results
            )

            return results["documents"][0] if results["documents"] else []

        except Exception as e:
            print(f"Error searching similar chunks: {e}")
            raise