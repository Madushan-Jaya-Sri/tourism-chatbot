# backend/check_db.py

from app import create_app, db
from app.models.user import User
from sqlalchemy import inspect

def check_database():
    app = create_app()
    
    with app.app_context():
        # Create inspector
        inspector = inspect(db.engine)
        
        print("Checking database tables...")
        
        # Get all tables
        tables = inspector.get_table_names()
        print(f"\nExisting tables: {tables}")
        
        # Check User table structure
        if 'user' in tables:
            print("\nUser table columns:")
            for column in inspector.get_columns('user'):
                print(f"{column['name']}: {column['type']}")
        
            # List all users
            print("\nExisting users:")
            users = User.query.all()
            if users:
                for user in users:
                    print(f"Username: {user.username}")
                    print(f"Email: {user.email}")
                    print(f"Is Admin: {user.is_admin}")
                    print("---")
            else:
                print("No users found in the database")
        else:
            print("\nUser table not found!")
            
            # Create tables if they don't exist
            print("\nCreating database tables...")
            db.create_all()
            print("Tables created successfully!")
            
            # Create admin user
            print("\nCreating admin user...")
            admin = User(
                username="madushan jaya sri",
                email="madushan.enfection@gmail.com",
                is_admin=True
            )
            admin.set_password("admin1234")
            db.session.add(admin)
            
            try:
                db.session.commit()
                print("Admin user created successfully!")
            except Exception as e:
                db.session.rollback()
                print(f"Error creating admin user: {e}")

if __name__ == "__main__":
    check_database()