import numpy as np
from collections import deque

class AudioSession:
    def __init__(self, window_size_sec=5, slide_size_sec=3, sample_rate=16000):
        """
        Quản lý buffer âm thanh cho một session (tab).
        window_size_sec: Độ dài đoạn âm thanh để STT (e.g. 5s)
        slide_size_sec: Bước nhảy để xử lý STT tiếp theo (e.g. 3s)
        """
        self.sample_rate = sample_rate
        self.window_size_samples = window_size_sec * sample_rate
        self.slide_size_samples = slide_size_sec * sample_rate
        
        # Buffer chứa các mẫu âm thanh
        self.buffer = np.array([], dtype=np.float32)
        
        # Để theo dõi lượng mẫu đã xử lý từ lần cuối
        self.samples_since_last_transcribe = 0

    def add_chunk(self, audio_data: np.ndarray):
        """Thêm dữ liệu âm thanh mới vào buffer."""
        if audio_data.size == 0:
            return
        
        self.buffer = np.append(self.buffer, audio_data)
        self.samples_since_last_transcribe += audio_data.size

    def should_transcribe(self) -> bool:
        """Kiểm tra xem đã đủ dữ liệu để thực hiện transcription chưa."""
        # Điều kiện: Buffer đủ window_size và đã trôi qua slide_size kể từ lần cuối
        return (len(self.buffer) >= self.window_size_samples and 
                self.samples_since_last_transcribe >= self.slide_size_samples)

    def get_window(self) -> np.ndarray:
        """Lấy window âm thanh hiện tại để xử lý."""
        # Lấy window_size cuối cùng để dịch
        window = self.buffer[-self.window_size_samples:]
        
        # Reset tracker
        self.samples_since_last_transcribe = 0
        
        # Tối ưu: Cắt bớt phía trước buffer để tránh memory leak nếu session quá dài
        # Giữ lại khoảng 2 window_size cho an toàn
        max_buffer_size = self.window_size_samples * 2
        if len(self.buffer) > max_buffer_size:
            self.buffer = self.buffer[-max_buffer_size:]
            
        return window

class SessionManager:
    def __init__(self):
        self.sessions = {} # sid -> AudioSession

    def get_or_create_session(self, sid) -> AudioSession:
        if sid not in self.sessions:
            self.sessions[sid] = AudioSession()
            print(f"Created new audio session for: {sid}")
        return self.sessions[sid]

    def remove_session(self, sid):
        if sid in self.sessions:
            del self.sessions[sid]
            print(f"Removed audio session: {sid}")
