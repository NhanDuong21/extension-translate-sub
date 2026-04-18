from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio
import anyio
import logging
from contextlib import asynccontextmanager

from audio_utils import decode_audio_chunk
from stt_engine import STTEngine
from translation_engine import TranslationEngine
from session_manager import SessionManager
from config import Config

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Khởi tạo Session Manager
session_manager = SessionManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Khởi tạo STT Engine & Translation Engine khi startup
    logger.info("Initializing STT Engine...")
    STTEngine.get_instance()
    logger.info("Initializing Translation Engine...")
    TranslationEngine.get_instance()
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
    Luồng xử lý: Audio -> STT -> Translation -> Emit
    """
    try:
        # 1. Giải mã WebM (Non-blocking)
        audio_data = await anyio.to_thread.run_sync(decode_audio_chunk, data)
        if audio_data.size == 0:
            return

        session = session_manager.get_or_create_session(sid)
        session.add_chunk(audio_data)

        if session.should_transcribe():
            audio_window = session.get_window()
            
            # 2. Chạy STT và Dịch thuật nối tiếp nhau trong cùng một thread task
            # giúp giữ đúng thứ tự và không làm nghẽn event loop chính.
            result = await anyio.to_thread.run_sync(_run_stt_and_translate, audio_window)
            
            if result and result.get("translated_text"):
                logger.info(f"Final Result [{sid}]: {result['original_text']} -> {result['translated_text']}")
                await sio.emit('transcription', result, to=sid)

    except Exception as e:
        logger.error(f"Error processing audio_chunk: {e}")

def _run_stt_and_translate(audio_data):
    """
    Hàm helper chạy STT nối tiếp Translation trong luồng riêng.
    """
    try:
        # 1. STT
        stt_res = STTEngine.get_instance().transcribe(audio_data)
        original_text = stt_res["text"]
        
        if not original_text:
            return None
            
        # 2. Dịch thuật (Gemini)
        translated_text = TranslationEngine.get_instance().translate(original_text)
        
        return {
            "original_text": original_text,
            "translated_text": translated_text,
            "language": stt_res["language"]
        }
    except Exception as e:
        logger.error(f"Pipeline Error: {e}")
        return None

@app.get("/")
def read_root():
    return {"status": "online", "model": "faster-whisper-base"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(socket_app, host="0.0.0.0", port=8000)
