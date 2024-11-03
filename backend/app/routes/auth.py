# backend/app/routes/auth.py

from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required
from app.models.user import User
from app import db

auth_bp = Blueprint('auth', __name__)

# backend/app/routes/auth.py

@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        print("Registration data received:", data)  # Debug print
        
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Email already registered'}), 400
        
        if User.query.filter_by(username=data['username']).first():
            return jsonify({'error': 'Username already taken'}), 400
        
        # Create new user
        user = User(
            username=data['username'],
            email=data['email']
        )
        user.set_password(data['password'])
        
        # Make first user admin
        if User.query.count() == 0:
            user.is_admin = True
            print("Creating admin user")  # Debug print
        
        db.session.add(user)
        db.session.commit()
        
        # Create access token
        access_token = create_access_token(identity=user.id)
        
        return jsonify({
            'message': 'User registered successfully',
            'access_token': access_token,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'is_admin': user.is_admin
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Registration error: {str(e)}")  # Debug print
        return jsonify({'error': str(e)}), 400

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        print("Login attempt for email:", data.get('email'))  # Debug print
        
        user = User.query.filter_by(email=data['email']).first()
        if not user:
            print("User not found")  # Debug print
            return jsonify({'error': 'Invalid email or password'}), 401
        
        if not user.check_password(data['password']):
            print("Invalid password")  # Debug print
            return jsonify({'error': 'Invalid email or password'}), 401
        
        access_token = create_access_token(identity=user.id)
        print("Login successful for user:", user.username)  # Debug print
        
        return jsonify({
            'message': 'Login successful',
            'access_token': access_token,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'is_admin': user.is_admin
            }
        }), 200
        
    except Exception as e:
        print(f"Login error: {str(e)}")  # Debug print
        return jsonify({'error': str(e)}), 400

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'is_admin': user.is_admin
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 400