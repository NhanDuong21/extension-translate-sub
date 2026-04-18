/**
 * PCMProcessor: AudioWorkletProcessor to extract raw PCM samples
 */
class PCMProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input && input.length > 0) {
      const channelData = input[0]; // Lấy channel 0 (Mono)
      if (channelData) {
        // Gửi dữ liệu về main thread
        // Lưu ý: Gửi bản copy để tránh vấn đề buffer bị shared/clear
        this.port.postMessage(new Float32Array(channelData));
      }
    }
    return true; // Tiếp tục xử lý
  }
}

registerProcessor('pcm-processor', PCMProcessor);
