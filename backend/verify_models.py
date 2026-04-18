from google import genai
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv('GEMINI_API_KEY')

if not api_key:
    print('Error: GEMINI_API_KEY not found in .env')
else:
    client = genai.Client(api_key=api_key)
    print('--- CÁC MODEL BẠN CÓ QUYỀN DÙNG ---')
    try:
        for m in client.models.list():
            # In ra name và tất cả các method được hỗ trợ
            # Dùng vars(m) hoặc dir(m) để xem các thuộc tính thực tế
            print(f"Model: {m.name}")
            # Thử lấy các thuộc tính mà người dùng quan tâm một cách an toàn
            methods = getattr(m, 'supported_methods', [])
            if not methods:
                methods = getattr(m, 'supported_generation_methods', [])
            
            print(f"  Methods: {methods}")
    except Exception as e:
        print(f"Lỗi khi list models: {e}")
