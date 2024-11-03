# backend/app/models/user.py

from app import db
from datetime import datetime
import bcrypt

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.LargeBinary, nullable=False)  # Changed to LargeBinary
    is_admin = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        if isinstance(password, str):
            password = password.encode('utf-8')
        self.password_hash = bcrypt.hashpw(password, bcrypt.gensalt())

    def check_password(self, password):
        if isinstance(password, str):
            password = password.encode('utf-8')
        return bcrypt.checkpw(password, self.password_hash)