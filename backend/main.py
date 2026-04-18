from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio
import anyio
import logging
from contextlib import asynccontextmanager

from audio_utils import decode_audio_chunk
from stt_engine import STTEngine
from session_manager import SessionManager

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Khởi tạo Session Manager
session_manager = SessionManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Khởi tạo STT Engine (load model) khi startup
    logger.info("Initializing STT Engine...")
    STTEngine.get_instance()
    yield
    # Cleanup nếu cần khi shutdown
    logger.info("Shutting down STT Engine...")

app = FastAPI(title="extension-translate-sub Backend", lifespan=lifespan)

# Setup Socket.io
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
socket_app = socketio.ASGIApp(sio, app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")
    session_manager.remove_session(sid)

@sio.event
async def audio_chunk(sid, data):
    """
    Xử lý chunk âm thanh từ extension.
    Sử dụng anyio.to_thread để xử lý STT mà không chặn event loop.
    """
    try:
        # 1. Giải mã WebM sang Numpy (FFmpeg)
        # Chạy trong luồng riêng để tránh block event loop
        audio_data = await anyio.to_thread.run_sync(decode_audio_chunk, data)
        
        if audio_data.size == 0:
            return

        # 2. Thêm vào session buffer
        session = session_manager.get_or_create_session(sid)
        session.add_chunk(audio_data)

        # 3. Kiểm tra xem có nên thực hiện STT không (Sliding Window)
        if session.should_transcribe():
            audio_window = session.get_window()
            
            # 4. Nhận dạng giọng nói (Whisper)
            # Chạy trong luồng riêng vì Whisper tiêu tốn nhiều CPU/GPU
            text = await anyio.to_thread.run_sync(
                STTEngine.get_instance().transcribe, 
                audio_window
            )
            
            if text:
                logger.info(f"Transcribed [{sid}]: {text}")
                # Gửi kết quả về client (Extension)
                await sio.emit('transcription', {'text': text}, to=sid)

    except Exception as e:
        logger.error(f"Error processing audio_chunk: {e}")

@app.get("/")
def read_root():
    return {"status": "online", "model": "faster-whisper-base"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(socket_app, host="0.0.0.0", port=8000)
