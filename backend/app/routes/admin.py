from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
import boto3
from botocore.exceptions import ClientError
import os
from app.models.user import User
from app.models.chat import PDFDocument
from app import db, socketio
from app.services.pdf_processor import PDFProcessor
from app.config import Config
import threading

admin_bp = Blueprint('admin', __name__)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() == 'pdf'

def get_s3_client():
    return boto3.client(
        's3',
        aws_access_key_id=Config.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=Config.AWS_SECRET_ACCESS_KEY,
        region_name=Config.AWS_REGION
    )

def emit_progress(document_id, status, message, percentage):
    """Emit processing progress through Socket.IO."""
    try:
        socketio.emit('document_progress', {
            'document_id': document_id,
            'status': status,
            'message': message,
            'percentage': percentage
        }, namespace='/')
    except Exception as e:
        print(f"Error emitting progress: {e}")

def process_document_async(app, document_id, s3_key):
    """Process document in a separate thread with application context."""
    with app.app_context():
        try:
            document = PDFDocument.query.get(document_id)
            if not document:
                emit_progress(document_id, 'error', 'Document not found', -1)
                return

            try:
                # Initialize PDF processor with document ID
                pdf_processor = PDFProcessor(document_id=document_id)
                
                # Process PDF
                pdf_processor.process_pdf(s3_key, document_id)
                
                # Update document status
                document.status = 'completed'
                document.processing_progress = 100
                db.session.commit()
                
                emit_progress(document_id, 'completed', 'Processing complete!', 100)

            except Exception as e:
                print(f"Processing error: {str(e)}")
                document.status = 'error'
                document.error_message = str(e)
                document.processing_progress = 0
                db.session.commit()
                
                emit_progress(document_id, 'error', f'Error: {str(e)}', -1)

        except Exception as e:
            print(f"Thread error: {str(e)}")
            emit_progress(document_id, 'error', f'System error: {str(e)}', -1)

@admin_bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_file():
    try:
        # Check if user is admin
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user or not user.is_admin:
            return jsonify({'error': 'Unauthorized'}), 403

        # Check if file exists in request
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type. Only PDF files are allowed'}), 400

        try:
            filename = secure_filename(file.filename)
            s3_key = f'pdfs/{user_id}/{filename}'
            
            # Create document record first
            document = PDFDocument(
                filename=filename,
                s3_key=s3_key,
                uploaded_by=user_id,
                status='uploading',
                processing_progress=0
            )
            db.session.add(document)
            db.session.commit()

            emit_progress(document.id, 'uploading', 'Starting upload to S3...', 10)

            # Upload to S3
            s3_client = get_s3_client()
            s3_client.upload_fileobj(file, Config.S3_BUCKET, s3_key)
            
            emit_progress(document.id, 'processing', 'Upload complete. Starting PDF processing...', 25)

            # Start processing in a separate thread with app context
            app = current_app._get_current_object()  # Get the actual app object
            processing_thread = threading.Thread(
                target=process_document_async,
                args=(app, document.id, s3_key)
            )
            processing_thread.start()

            return jsonify({
                'message': 'File uploaded and processing started',
                'document': {
                    'id': document.id,
                    'filename': document.filename,
                    'status': document.status,
                    'progress': document.processing_progress
                }
            }), 201

        except Exception as e:
            if document:
                document.status = 'error'
                document.error_message = str(e)
                document.processing_progress = 0
                db.session.commit()
                emit_progress(document.id, 'error', f'Error: {str(e)}', -1)
            raise

    except Exception as e:
        print(f"Upload error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/documents', methods=['GET'])
@jwt_required()
def get_documents():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user or not user.is_admin:
            return jsonify({'error': 'Unauthorized'}), 403

        documents = PDFDocument.query.order_by(PDFDocument.uploaded_at.desc()).all()
        return jsonify({
            'documents': [{
                'id': doc.id,
                'filename': doc.filename,
                'status': doc.status,
                'progress': doc.processing_progress,
                'uploaded_at': doc.uploaded_at.isoformat(),
                'error_message': doc.error_message,
                'total_pages': doc.total_pages,
                'current_step': doc.current_step
            } for doc in documents]
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/documents/<int:document_id>', methods=['DELETE'])
@jwt_required()
def delete_document(document_id):
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user or not user.is_admin:
            return jsonify({'error': 'Unauthorized'}), 403

        document = PDFDocument.query.get(document_id)
        if not document:
            return jsonify({'error': 'Document not found'}), 404

        # Delete from S3
        s3_client = get_s3_client()
        try:
            s3_client.delete_object(Bucket=Config.S3_BUCKET, Key=document.s3_key)
        except ClientError as e:
            return jsonify({'error': f'Error deleting from S3: {str(e)}'}), 500

        # Delete embeddings
        try:
            pdf_processor = PDFProcessor()
            pdf_processor.delete_document_embeddings(document_id)
        except Exception as e:
            return jsonify({'error': f'Error deleting embeddings: {str(e)}'}), 500

        # Delete document record
        db.session.delete(document)
        db.session.commit()

        return jsonify({'message': 'Document deleted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500