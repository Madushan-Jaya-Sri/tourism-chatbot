# backend/app/routes/admin.py

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
import boto3
from botocore.exceptions import ClientError
import os
from app.models.user import User
from app.models.chat import PDFDocument
from app import db
from app.services.pdf_processor import PDFProcessor
from app.config import Config

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

@admin_bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_file():
    try:
        # Check if user is admin
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user or not user.is_admin:
            return jsonify({'error': 'Unauthorized'}), 403

        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type. Only PDF files are allowed'}), 400

        filename = secure_filename(file.filename)
        s3_key = f'pdfs/{user_id}/{filename}'
        
        # Upload to S3
        s3_client = get_s3_client()
        try:
            s3_client.upload_fileobj(file, Config.S3_BUCKET, s3_key)
        except ClientError as e:
            return jsonify({'error': str(e)}), 500

        # Create document record
        document = PDFDocument(
            filename=filename,
            s3_key=s3_key,
            uploaded_by=user_id,
            status='processing'
        )
        db.session.add(document)
        db.session.commit()

        # Process PDF
        try:
            pdf_processor = PDFProcessor()
            pdf_processor.process_pdf(s3_key, document.id)
            document.status = 'completed'
            db.session.commit()
        except Exception as e:
            document.status = 'error'
            document.error_message = str(e)
            db.session.commit()
            return jsonify({'error': f'Error processing PDF: {str(e)}'}), 500

        return jsonify({
            'message': 'File uploaded successfully',
            'document': {
                'id': document.id,
                'filename': document.filename,
                'status': document.status
            }
        }), 201

    except Exception as e:
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

        documents = PDFDocument.query.all()
        return jsonify({
            'documents': [{
                'id': doc.id,
                'filename': doc.filename,
                'status': doc.status,
                'uploaded_at': doc.uploaded_at.isoformat(),
                'error_message': doc.error_message
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