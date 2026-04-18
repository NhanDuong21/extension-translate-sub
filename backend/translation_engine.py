import google.generativeai as genai
from functools import lru_cache
from config import Config
import logging

logger = logging.getLogger(__name__)

class TranslationEngine:
    _instance = None

    def __init__(self):
        if TranslationEngine._instance is not None:
            raise Exception("This class is a singleton!")
        
        # Cấu hình Gemini
        genai.configure(api_key=Config.GEMINI_API_KEY)
        self.model = genai.GenerativeModel('gemini-1.5-flash')
        
        # System Prompt cho dịch thuật phụ đề
        self.system_prompt = (
            "Bạn là một chuyên gia dịch thuật phụ đề phim và video đa ngôn ngữ sang Tiếng Việt. "
            "Nhiệm vụ của bạn là dịch văn bản được cung cấp sang Tiếng Việt một cách tự nhiên, "
            "phù hợp với ngữ cảnh video, ngắn gọn và dễ đọc. "
            "Nếu văn bản là tiếng kêu, tiếng ồn (e.g. [Music], [Laughing]), hãy giữ nguyên hoặc dịch sát nghĩa. "
            "CHỈ TRẢ VỀ BẢN DỊCH, KHÔNG GIẢI THÍCH GÌ THÊM."
        )
        
        TranslationEngine._instance = self

    @staticmethod
    def get_instance():
        if TranslationEngine._instance is None:
            TranslationEngine()
        return TranslationEngine._instance

    @lru_cache(max_depth=500)
    def _translate_with_cache(self, text: str) -> str:
        """Thực hiện dịch thuật với cache LRU để tối ưu hóa."""
        if not text or len(text.strip()) == 0:
            return ""
        
        # Lọc nhiễu đơn giản (Noise Filter)
        if text.lower().strip() in ["mu", "um", "ah", "oh", "..."]:
            return text
            
        try:
            response = self.model.generate_content(
                f"{self.system_prompt}\n\nVăn bản: {text}"
            )
            return response.text.strip()
        except Exception as e:
            logger.error(f"Gemini Translation Error: {e}")
            return f"[Error: {text}]"

    def translate(self, text: str) -> str:
        """Wrapper cho hàm dịch có cache."""
        return self._translate_with_cache(text)
