/**
 * Offscreen Script: Capture audio, downsample to 16kHz, and stream via Socket.io
 */

import { io } from 'https://cdn.socket.io/4.7.2/socket.io.msgpack.min.js';

let socket;
let mediaRecorder;
let audioContext;

// Kết nối tới Backend
function setupSocket() {
  socket = io('http://localhost:8000', {
    transports: ['websocket']
  });

  socket.on('connect', () => {
    console.log('Connected to backend via Socket.io');
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from backend');
  });
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
});
