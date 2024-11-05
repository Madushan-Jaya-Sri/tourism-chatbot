from app import db
from datetime import datetime

class Chat(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    messages = db.relationship('Message', backref='chat', lazy=True, cascade='all, delete-orphan')

class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    chat_id = db.Column(db.Integer, db.ForeignKey('chat.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    role = db.Column(db.String(20), nullable=False)  # 'user' or 'assistant'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class PDFDocument(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    s3_key = db.Column(db.String(255), nullable=False)
    uploaded_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20), default='pending')  # 'pending', 'uploading', 'processing', 'completed', 'error'
    error_message = db.Column(db.Text)
    processing_progress = db.Column(db.Integer, default=0)  # Progress percentage
    current_step = db.Column(db.String(50))  # Current processing step description
    total_pages = db.Column(db.Integer)  # Total number of pages in the PDF
    processed_pages = db.Column(db.Integer, default=0)  # Number of pages processed
    total_chunks = db.Column(db.Integer)  # Total number of text chunks
    processed_chunks = db.Column(db.Integer, default=0)  # Number of chunks processed
    
    def to_dict(self):
        return {
            'id': self.id,
            'filename': self.filename,
            'status': self.status,
            'uploaded_at': self.uploaded_at.isoformat() if self.uploaded_at else None,
            'error_message': self.error_message,
            'progress': self.processing_progress,
            'current_step': self.current_step,
            'total_pages': self.total_pages,
            'processed_pages': self.processed_pages
        }