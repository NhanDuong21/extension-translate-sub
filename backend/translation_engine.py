from google import genai
from functools import lru_cache
from config import Config
import logging

logger = logging.getLogger(__name__)

class TranslationEngine:
    _instance = None

    def __init__(self):
        if TranslationEngine._instance is not None:
            raise Exception("This class is a singleton!")
        
        # Cấu hình Gemini SDK mới nhất (google-genai)
        self.client = genai.Client(
            api_key=Config.GEMINI_API_KEY
        )
        self.model_id = 'gemini-2.0-flash'
        
        # System Prompt cực ngắn để giảm latency
        self.system_prompt = "Dịch sang tiếng Việt, phong cách phụ đề, chỉ trả về bản dịch:"
        
        TranslationEngine._instance = self

    @staticmethod
    def get_instance():
        if TranslationEngine._instance is None:
            TranslationEngine()
        return TranslationEngine._instance

    @lru_cache(maxsize=500)
    def _translate_with_cache(self, text: str) -> str:
        """Thực hiện dịch thuật với cache LRU để tối ưu hóa."""
        if not text or len(text.strip()) == 0:
            return ""
        
        # Lọc nhiễu đơn giản (Noise Filter)
        if text.lower().strip() in ["mu", "um", "ah", "oh", "..."]:
            return text
            
        try:
            # Logic gọi SDK mới (luôn dùng bản stable)
            response = self.client.models.generate_content(
                model='gemini-flash-latest',
                contents=f"{self.system_prompt}\n\nVăn bản: {text}"
            )
            return response.text.strip()
        except Exception as e:
            logger.error(f"Gemini Translation Error (Quota or 404): {e}")
            # Trả về text gốc nếu lỗi để không làm gián đoạn UI như yêu cầu
            return text

    def translate(self, text: str) -> str:
        """Wrapper cho hàm dịch có cache."""
        return self._translate_with_cache(text)
