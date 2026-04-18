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
    
    // --- PHÁT LẠI ÂM THANH RA LOA ---
    // Nối nguồn âm thanh tới destination của AudioContext (mặc định là loa)
    source.connect(audioContext.destination);
    console.log('Audio routed back to speakers for monitoring.');

    // 3. Sử dụng ScriptProcessorNode để lấy dữ liệu Raw PCM
    // bufferSize 4096 (khoảng 0.25s ở 16kHz)
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    source.connect(processor);
    processor.connect(audioContext.destination); // Cần connect để node hoạt động

    let audioBuffer = [];
    const CHUNK_SIZE = 16000; // 1 giây dữ liệu ở 16kHz

    processor.onaudioprocess = (event) => {
      if (!socket || !socket.connected) return;

      const inputData = event.inputBuffer.getChannelData(0); // Float32Array
      
      // Copy dữ liệu vào buffer tạm
      for (let i = 0; i < inputData.length; i++) {
        audioBuffer.push(inputData[i]);
      }

      // Khi đủ 1 giây (16000 samples), gửi đi
      if (audioBuffer.length >= CHUNK_SIZE) {
        const chunk = new Float32Array(audioBuffer.slice(0, CHUNK_SIZE));
        socket.emit('audio_chunk', chunk.buffer); // Gửi ArrayBuffer của Float32 thô
        console.log('Sent 1s Raw PCM chunk to backend');
        
        // Giữ lại phần dư nếu có
        audioBuffer = audioBuffer.slice(CHUNK_SIZE);
      }
    };

    console.log('PCM Capture started: 16kHz, Float32, 1s chunks');

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
