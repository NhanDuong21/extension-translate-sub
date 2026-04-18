import numpy as np
import io

def decode_audio_chunk(blob: bytes) -> np.ndarray:
    """
    Giải mã audio chunk. Hiện tại đã chuyển sang nhận Raw PCM (Float32, 16kHz, Mono)
    trực tiếp từ Extension nên không cần qua FFmpeg.
    """
    try:
        # Chuyển đổi trực tiếp từ bytes sang numpy array (Float32)
        audio_data = np.frombuffer(blob, np.float32)
        return audio_data
        
    except Exception as e:
        print(f"Error processing PCM data: {e}")
        return np.array([], dtype=np.float32)

def array_to_bytes(audio_data: np.ndarray) -> bytes:
    """Helper chuyển numpy sang bytes nếu cần."""
    return audio_data.tobytes()
