# backend/check_my_api.py
from google import genai
import os
from dotenv import load_dotenv

# Tìm file .env ở thư mục gốc
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("Error: GEMINI_API_KEY not found in .env")
else:
    client = genai.Client(api_key=api_key)

    print("--- DANH SÁCH MODEL BẠN ĐƯỢC QUYỀN DÙNG ---")
    try:
        for m in client.models.list():
            # In ra tất cả model name để chắc chắn
            print(f"ID chuẩn: {m.name}")
    except Exception as e:
        print(f"Lỗi khi list models: {e}")
