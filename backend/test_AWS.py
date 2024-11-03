# test_aws.py
import boto3
import os
from dotenv import load_dotenv

load_dotenv()

def test_aws_connection():
    try:
        s3 = boto3.client(
            's3',
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
            region_name=os.getenv('AWS_REGION')
        )
        
        # List buckets to test connection
        response = s3.list_buckets()
        print("AWS Connection Successful!")
        print("Available buckets:", [bucket['Name'] for bucket in response['Buckets']])
        
        # Test specific bucket access
        bucket_name = os.getenv('S3_BUCKET')
        s3.head_bucket(Bucket=bucket_name)
        print(f"Successfully accessed bucket: {bucket_name}")
        
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    test_aws_connection()