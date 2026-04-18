from faster_whisper import WhisperModel
import os

class STTEngine:
    _instance = None

    def __init__(self, model_size="base", device="cpu", compute_type="int8"):
        """
        Khởi tạo Singleton cho Faster-Whisper.
        Dùng model 'base' để test tốc độ trước.
        """
        if STTEngine._instance is not None:
            raise Exception("This class is a singleton!")
        else:
            print(f"Loading Whisper model: {model_size} on {device}...")
            # Cấu hình model
            self.model = WhisperModel(model_size, device=device, compute_type=compute_type)
            STTEngine._instance = self

    @staticmethod
    def get_instance():
        if STTEngine._instance is None:
            STTEngine()
        return STTEngine._instance

    def transcribe(self, audio_data):
        """
        Thực hiện nhận dạng giọng nói từ numpy array.
        Trả về dict với đầy đủ thông tin.
        """
        segments, info = self.model.transcribe(
            audio_data, 
            beam_size=5,
            condition_on_previous_text=False
        )
        
        # Kết hợp các segment thành 1 chuỗi text
        text = " ".join([segment.text for segment in segments]).strip()
        
        return {
            "text": text,
            "language": info.language,
            "confidence": info.language_probability
        }
