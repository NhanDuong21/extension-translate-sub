/**
 * Offscreen Script: Capture audio, downsample to 16kHz, and stream via Socket.io
 */


let socket;
let mediaRecorder;
let audioContext;
let audioStream; // Lưu trữ stream để stop sau này

// Kết nối tới Backend
function setupSocket() {
  socket = io('http://localhost:8888', {
    transports: ['websocket']
  });

  socket.on('connect', () => {
    console.log('Connected to backend via Socket.io');
  });

  socket.on('transcript', (data) => {
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
    
    // Nối nguồn âm thanh tới destination của AudioContext (mặc định là loa)
    source.connect(audioContext.destination);
    console.log('Audio routed back to speakers for monitoring.');

    // 3. Load và sử dụng AudioWorklet để lấy dữ liệu Raw PCM
    await audioContext.audioWorklet.addModule('processor.js');
    const workletNode = new AudioWorkletNode(audioContext, 'pcm-processor');
    
    source.connect(workletNode);
    workletNode.connect(audioContext.destination); // Cần connect để node hoạt động

    let audioBuffer = [];
    const CHUNK_SIZE = 48000; // 3 giây dữ liệu ở 16kHz
    const STEP_SIZE = 24000;  // 1.5 giây độ trễ (gửi đè lên nhau)

    workletNode.port.onmessage = (event) => {
      if (!socket || !socket.connected) return;

      const inputData = event.data; // Float32Array từ processor.js
      
      // Copy dữ liệu vào buffer tạm
      for (let i = 0; i < inputData.length; i++) {
        audioBuffer.push(inputData[i]);
      }

      // Kỹ thuật Overlapping: Gửi chunk 3s mỗi 1.5s
      if (audioBuffer.length >= CHUNK_SIZE) {
        const chunk = new Float32Array(audioBuffer.slice(0, CHUNK_SIZE));
        socket.emit('audio_chunk', chunk.buffer); // Gửi ArrayBuffer của Float32 thô
        console.log('Sent 3s Raw PCM chunk (Overlapping 1.5s) to backend');
        
        // Trượt cửa sổ đi STEP_SIZE thay vì xóa sạch
        audioBuffer = audioBuffer.slice(STEP_SIZE);
      }
    };

    console.log('AudioWorklet Capture: 3s chunks, 1.5s step (Overlapping) started');

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
