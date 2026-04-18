# Project Roadmap: extension-translate-sub

Dự án phát triển Browser Extension dịch phụ đề video đa ngôn ngữ sang tiếng Việt.

## Lộ trình 10 bước

1. **Setup Foundation**: Khởi tạo cấu trúc dự án (Frontend, Backend), cấu trúc Manifest V3 và tài liệu kỹ thuật.
2. **Offscreen & Audio Capture**: Xây dựng cơ chế Tab Capture để lấy dữ liệu âm thanh từ trình duyệt thông qua Offscreen Document.
3. **Backend Stream Setup**: Thiết lập FastAPI server với Socket.io để nhận luồng âm thanh realtime từ Extension.
4. **Speech-to-Text Integration**: Tích hợp dịch vụ nhận dạng giọng nói (Whisper hoặc Google Speech-to-Text) trên Backend.
5. **Translation Service**: Tích hợp API dịch thuật (Google Translate, DeepL hoặc LLM) để chuyển đổi sang tiếng Việt.
6. **Socket.io Realtime Sync**: Hoàn thiện luồng dữ liệu hai chiều: Extension -> Backend (Audio) -> Frontend Overlay (Vietnamese Subtitles).
7. **UI Overlay Development**: Phát triển giao diện Overlay hiển thị phụ đề trên trình phát video, hỗ trợ tùy chỉnh vị trí/kích thước.
8. **Storage & Preferences**: Lưu trữ cài đặt người dùng (ngôn ngữ nguồn, kiểu hiển thị) bằng chrome.storage API.
9. **Optimization & Debugging**: Tối ưu hóa độ trễ (latency), xử lý lỗi mất kết nối Socket và cải thiện độ chính xác của phụ đề.
10. **Deployment & Packaging**: Đóng gói Extension (.zip) để cài đặt thủ công và chuẩn bị tài liệu hướng dẫn sử dụng.
