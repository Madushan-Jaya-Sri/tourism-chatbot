# backend/app/routes/chat.py

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.chat import Chat, Message
from app.models.user import User
from app.services.chat_service import ChatService
from app import db

chat_bp = Blueprint('chat', __name__)
chat_service = ChatService()

@chat_bp.route('/chat', methods=['POST'])
@jwt_required()
def create_chat():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        chat = Chat(
            user_id=user_id,
            title=data.get('title', 'New Chat')
        )
        db.session.add(chat)
        db.session.commit()
        
        return jsonify({
            'message': 'Chat created successfully',
            'chat': {
                'id': chat.id,
                'title': chat.title,
                'created_at': chat.created_at.isoformat()
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@chat_bp.route('/chat/<int:chat_id>/messages', methods=['POST'])
@jwt_required()
def send_message(chat_id):
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # Verify chat belongs to user
        chat = Chat.query.filter_by(id=chat_id, user_id=user_id).first()
        if not chat:
            return jsonify({'error': 'Chat not found'}), 404
        
        # Get chat history
        messages = Message.query.filter_by(chat_id=chat_id).order_by(Message.created_at).all()
        formatted_messages = chat_service.format_history(messages)
        
        # Create user message
        user_message = Message(
            chat_id=chat_id,
            content=data['message'],
            role='user'
        )
        db.session.add(user_message)
        
        # Generate assistant response
        response = chat_service.create_chat_response(formatted_messages, data['message'])
        
        # Create assistant message
        assistant_message = Message(
            chat_id=chat_id,
            content=response,
            role='assistant'
        )
        db.session.add(assistant_message)
        
        # Update chat title if it's the first message
        if len(messages) == 0:
            chat.title = data['message'][:50] + '...' if len(data['message']) > 50 else data['message']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Message sent successfully',
            'response': {
                'id': assistant_message.id,
                'content': assistant_message.content,
                'created_at': assistant_message.created_at.isoformat()
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@chat_bp.route('/chats', methods=['GET'])
@jwt_required()
def get_chats():
    try:
        user_id = get_jwt_identity()
        chats = Chat.query.filter_by(user_id=user_id).order_by(Chat.updated_at.desc()).all()
        
        return jsonify({
            'chats': [{
                'id': chat.id,
                'title': chat.title,
                'created_at': chat.created_at.isoformat(),
                'updated_at': chat.updated_at.isoformat()
            } for chat in chats]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@chat_bp.route('/chat/<int:chat_id>', methods=['GET'])
@jwt_required()
def get_chat(chat_id):
    try:
        user_id = get_jwt_identity()
        chat = Chat.query.filter_by(id=chat_id, user_id=user_id).first()
        
        if not chat:
            return jsonify({'error': 'Chat not found'}), 404
        
        messages = Message.query.filter_by(chat_id=chat_id).order_by(Message.created_at).all()
        
        return jsonify({
            'chat': {
                'id': chat.id,
                'title': chat.title,
                'created_at': chat.created_at.isoformat(),
                'messages': [{
                    'id': msg.id,
                    'content': msg.content,
                    'role': msg.role,
                    'created_at': msg.created_at.isoformat()
                } for msg in messages]
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@chat_bp.route('/chat/<int:chat_id>', methods=['DELETE'])
@jwt_required()
def delete_chat(chat_id):
    try:
        user_id = get_jwt_identity()
        chat = Chat.query.filter_by(id=chat_id, user_id=user_id).first()
        
        if not chat:
            return jsonify({'error': 'Chat not found'}), 404
        
        db.session.delete(chat)
        db.session.commit()
        
        return jsonify({'message': 'Chat deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500