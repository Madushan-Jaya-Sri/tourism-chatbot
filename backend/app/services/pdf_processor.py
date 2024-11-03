# backend/app/services/pdf_processor.py

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

class PDFProcessor:
    def __init__(self, socketio=None):
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
        self.socketio = socketio

    def emit_progress(self, message, percentage):
        if self.socketio:
            self.socketio.emit('processing_progress', {
                'message': message,
                'percentage': percentage
            })
            print(f"Progress: {message} - {percentage}%")

    def download_from_s3(self, s3_key, local_path):
        try:
            self.emit_progress("Downloading PDF from S3...", 10)
            self.s3.download_file(Config.S3_BUCKET, s3_key, local_path)
            return True
        except ClientError as e:
            print(f"Error downloading from S3: {e}")
            self.emit_progress(f"Error downloading from S3: {str(e)}", -1)
            return False

    def extract_text_from_pdf(self, pdf_path):
        text_chunks = []
        try:
            reader = PdfReader(pdf_path)
            total_pages = len(reader.pages)
            
            self.emit_progress("Starting text extraction...", 20)
            
            for i, page in enumerate(reader.pages):
                # Extract text content
                text = page.extract_text()
                
                # Process images in the page
                if '/XObject' in page['/Resources']:
                    self.emit_progress(f"Processing images on page {i+1}/{total_pages}", 30 + (i * 20 // total_pages))
                    xObject = page['/Resources']['/XObject'].get_object()
                    
                    for obj in xObject:
                        if xObject[obj]['/Subtype'] == '/Image':
                            try:
                                data = xObject[obj].get_data()
                                img = Image.open(io.BytesIO(data))
                                # Extract text from image using OCR
                                image_text = pytesseract.image_to_string(img)
                                text += "\n" + image_text
                            except Exception as e:
                                print(f"Error processing image: {e}")
                
                # Split text into chunks
                words = text.split()
                for i in range(0, len(words), Config.CHUNK_SIZE):
                    chunk = " ".join(words[i:i + Config.CHUNK_SIZE])
                    text_chunks.append(chunk)
                
                self.emit_progress(f"Processed page {i+1}/{total_pages}", 40 + (i * 20 // total_pages))
        
        except Exception as e:
            print(f"Error processing PDF: {e}")
            self.emit_progress(f"Error processing PDF: {str(e)}", -1)
            raise
        
        return text_chunks

    def create_embeddings(self, text_chunks):
        try:
            embeddings = []
            total_chunks = len(text_chunks)
            self.emit_progress("Starting embeddings creation...", 60)
            
            for i, chunk in enumerate(text_chunks):
                response = self.openai_client.embeddings.create(
                    model=Config.EMBEDDING_MODEL,
                    input=chunk
                )
                embeddings.append(response.data[0].embedding)
                
                if i % 5 == 0:  # Update progress every 5 chunks
                    progress = 60 + (i * 20 // total_chunks)
                    self.emit_progress(f"Creating embeddings {i+1}/{total_chunks}", progress)
                    
            return embeddings
        except Exception as e:
            print(f"Error creating embeddings: {e}")
            self.emit_progress(f"Error creating embeddings: {str(e)}", -1)
            raise

    def process_pdf(self, s3_key, document_id):
        try:
            self.emit_progress("Starting PDF processing...", 5)
            
            with tempfile.NamedTemporaryFile(delete=False) as temp_file:
                # Download PDF from S3
                if not self.download_from_s3(s3_key, temp_file.name):
                    raise Exception("Failed to download PDF from S3")

                # Extract text from PDF
                text_chunks = self.extract_text_from_pdf(temp_file.name)

                # Create embeddings
                embeddings = self.create_embeddings(text_chunks)

                # Store in ChromaDB
                self.emit_progress("Storing in vector database...", 90)
                self.collection.add(
                    embeddings=embeddings,
                    documents=text_chunks,
                    ids=[f"{document_id}_{i}" for i in range(len(text_chunks))]
                )

                self.emit_progress("Processing complete!", 100)

            os.unlink(temp_file.name)
            return True

        except Exception as e:
            print(f"Error processing PDF: {e}")
            self.emit_progress(f"Error processing PDF: {str(e)}", -1)
            raise

    # Rest of the methods remain the same
    def delete_document_embeddings(self, document_id):
        try:
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
        try:
            query_embedding = self.openai_client.embeddings.create(
                model=Config.EMBEDDING_MODEL,
                input=query
            ).data[0].embedding

            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results
            )

            return results["documents"][0] if results["documents"] else []

        except Exception as e:
            print(f"Error searching similar chunks: {e}")
            raise