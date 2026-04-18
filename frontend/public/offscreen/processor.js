class PCMProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0]; // Lấy dữ liệu từ channel 1
    if (input && input.length > 0) {
      // Gửi dữ liệu Float32 thô về offscreen.js
      this.port.postMessage(input[0]);
    }
    return true;
  }
}
registerProcessor('pcm-processor', PCMProcessor);
