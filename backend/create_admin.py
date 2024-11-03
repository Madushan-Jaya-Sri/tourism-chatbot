# backend/reset_admin.py

from app import create_app, db
from app.models.user import User
import bcrypt

def reset_database_and_create_admin():
    app = create_app()
    
    with app.app_context():
        print("Dropping all tables...")
        db.drop_all()
        
        print("Creating all tables...")
        db.create_all()
        
        # Create admin user
        admin_email = "madushan.jayasri@enfection.com"
        admin_password = "admin1234"
        
        # Create new admin user
        admin = User(
            username="madushan jaya sri",
            email=admin_email,
            is_admin=True
        )
        
        # Hash password properly
        password = admin_password.encode('utf-8')
        salt = bcrypt.gensalt()
        password_hash = bcrypt.hashpw(password, salt)
        admin.password_hash = password_hash
        
        try:
            db.session.add(admin)
            db.session.commit()
            print("\nAdmin user created successfully!")
            print("Admin credentials:")
            print(f"Email: {admin_email}")
            print(f"Password: {admin_password}")
            
            # Verify password works
            admin_check = User.query.filter_by(email=admin_email).first()
            if admin_check and bcrypt.checkpw(admin_password.encode('utf-8'), admin_check.password_hash):
                print("Password verification successful!")
            else:
                print("Password verification failed!")
                
        except Exception as e:
            db.session.rollback()
            print(f"Error creating admin: {e}")

if __name__ == "__main__":
    reset_database_and_create_admin()