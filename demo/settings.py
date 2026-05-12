import os


def load_settings():
    return {
        "bucket": os.environ["UPLOAD_BUCKET"],
        "region": os.environ.get("AWS_REGION", "us-east-1"),
        "token": os.getenv("SERVICE_TOKEN"),
    }

