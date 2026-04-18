import ffmpeg
import numpy as np
import io

def decode_audio_chunk(blob: bytes) -> np.ndarray:
    """
    Decode audio chunk (WebM/Opus) sang Numpy array (Float32, 16kHz, Mono)
    Sử dụng FFmpeg pipe để xử lý trực tiếp từ memory.
    """
    try:
        # Sử dụng FFmpeg để chuyển đổi từ WebM sang PCM Float32 le, 16000Hz, Mono
        out, _ = (
            ffmpeg
            .input('pipe:0')
            .output('pipe:1', format='f32le', acodec='pcm_f32le', ac=1, ar='16000')
            .run(input=blob, capture_stdout=True, capture_stderr=True, quiet=True)
        )
        
        # Chuyển đổi output bytes sang numpy array
        audio_data = np.frombuffer(out, np.float32)
        return audio_data
        
    except Exception as e:
        print(f"Error decoding audio with FFmpeg: {e}")
        return np.array([], dtype=np.float32)

def array_to_bytes(audio_data: np.ndarray) -> bytes:
    """Helper chuyển numpy sang bytes nếu cần."""
    return audio_data.tobytes()
