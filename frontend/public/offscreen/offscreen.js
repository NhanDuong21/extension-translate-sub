/**
 * Offscreen Script: Capture audio, downsample to 16kHz, and stream via Socket.io
 */


let socket;
let mediaRecorder;
let audioContext;
let audioStream; // Lưu trữ stream để stop sau này

// Kết nối tới Backend
function setupSocket() {
  socket = io('http://localhost:8000', {
    transports: ['websocket']
  });

  socket.on('connect', () => {
    console.log('Connected to backend via Socket.io');
  });

  socket.on('transcription', (data) => {
    // Relay dữ liệu từ socket sang Service Worker
    chrome.runtime.sendMessage({
      type: 'TRANSCRIPT',
      payload: data // { original_text, translated_text, language }
    });
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from backend');
  });
}

// Dừng capture và giải phóng tài nguyên
function stopCapture() {
  console.log('Stopping capture and cleaning up...');
  
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }

  if (audioStream) {
    audioStream.getTracks().forEach(track => {
      track.stop();
      console.log('Track stopped:', track.label);
    });
    audioStream = null;
  }

  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

// Xử lý stream audio
async function startCapture(streamId) {
  try {
    // 1. Lấy stream từ tab
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId
        }
      },
      video: false
    });
    audioStream = stream;

    // 2. Setup AudioContext để downsample về 16kHz
    audioContext = new AudioContext({ sampleRate: 16000 });
    const source = audioContext.createMediaStreamSource(stream);
    const destination = audioContext.createMediaStreamDestination();
    source.connect(destination);

    // 3. Sử dụng MediaRecorder để cắt chunk 1s
    // WebM Opus là format tốt cho streaming
    mediaRecorder = new MediaRecorder(destination.stream, {
      mimeType: 'audio/webm;codecs=opus'
    });

    mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0 && socket && socket.connected) {
        // Chuyển blob sang ArrayBuffer để gửi qua socket
        const arrayBuffer = await event.data.arrayBuffer();
        socket.emit('audio_chunk', arrayBuffer);
        console.log('Sent audio chunk to backend:', event.data.size, 'bytes');
      }
    };

    // Bắt đầu record với interval 1000ms (1s)
    mediaRecorder.start(1000);
    console.log('MediaRecorder started with 1s chunks at 16kHz');

  } catch (error) {
    console.error('Error in offscreen capture:', error);
  }
}

// Lắng nghe message từ Service Worker
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'START_CAPTURE') {
    console.log('Starting capture for streamId:', message.streamId);
    if (!socket) setupSocket();
    startCapture(message.streamId);
  }

  if (message.type === 'STOP_CAPTURE') {
    stopCapture();
  }
});

// Backup cleanup khi trang bị đóng
window.onunload = () => {
  stopCapture();
};
