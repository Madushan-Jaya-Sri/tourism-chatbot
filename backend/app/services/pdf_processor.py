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

class PDFProcessor:
    def __init__(self):
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

    def download_from_s3(self, s3_key, local_path):
        try:
            self.s3.download_file(Config.S3_BUCKET, s3_key, local_path)
            return True
        except ClientError as e:
            print(f"Error downloading from S3: {e}")
            return False

    def extract_text_from_pdf(self, pdf_path):
        text_chunks = []
        try:
            reader = PdfReader(pdf_path)
            
            for page in reader.pages:
                # Extract text content
                text = page.extract_text()
                
                # Process images in the page
                if '/XObject' in page['/Resources']:
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
        
        except Exception as e:
            print(f"Error processing PDF: {e}")
            raise
        
        return text_chunks

    def create_embeddings(self, text_chunks):
        try:
            embeddings = []
            for chunk in text_chunks:
                response = self.openai_client.embeddings.create(
                    model=Config.EMBEDDING_MODEL,
                    input=chunk
                )
                embeddings.append(response.data[0].embedding)
            return embeddings
        except Exception as e:
            print(f"Error creating embeddings: {e}")
            raise

    def process_pdf(self, s3_key, document_id):
        try:
            with tempfile.NamedTemporaryFile(delete=False) as temp_file:
                # Download PDF from S3
                if not self.download_from_s3(s3_key, temp_file.name):
                    raise Exception("Failed to download PDF from S3")

                # Extract text from PDF
                text_chunks = self.extract_text_from_pdf(temp_file.name)

                # Create embeddings
                embeddings = self.create_embeddings(text_chunks)

                # Store in ChromaDB
                self.collection.add(
                    embeddings=embeddings,
                    documents=text_chunks,
                    ids=[f"{document_id}_{i}" for i in range(len(text_chunks))]
                )

            os.unlink(temp_file.name)
            return True

        except Exception as e:
            print(f"Error processing PDF: {e}")
            raise

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