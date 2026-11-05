import os
from dotenv import load_dotenv


# Load environment variables from .env file
load_dotenv()
Gemini_API_KEY = os.getenv('GEMINI_API_KEY')
Gemini_Model_Name = os.getenv('GEMINI_MODEL_NAME', 'gemini-2.0-flash')

if not Gemini_API_KEY:
    raise ValueError(" GEMINI_API_KEY not found in environment variables")