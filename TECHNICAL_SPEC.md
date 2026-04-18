# Technical Specification: extension-translate-sub

## Tech Stack
- **Frontend**: React 19 (JavaScript), Tailwind CSS, Vite.
- **Backend**: FastAPI (Python), Socket.io (python-socketio).
- **Communication**: WebSockets (Socket.io) cho luồng dữ liệu thời gian thực.
- **Extension API**: Manifest V3, `chrome.tabCapture`, `chrome.offscreen`, `chrome.storage`, `chrome.scripting`.

## Luồng dữ liệu (Data Flow)
1. **Dữ liệu âm thanh (Audio Stream)**:
   - **Tab**: extension yêu cầu capture âm thanh từ tab hiện tại.
   - **Offscreen**: Dữ liệu âm thanh được chuyển hướng vào một file HTML ẩn (Offscreen Document).
   - **Backend**: Offscreen Document thiết lập kết nối Socket.io và stream dữ liệu âm thanh nhị phân (PCM/WAV) đến Backend FastAPI.
2. **Xử lý (Processing)**:
   - Backend nhận âm thanh, chuyển qua dịch vụ Speech-to-Text để lấy văn bản.
   - Văn bản được dịch sang Tiếng Việt.
3. **Hiển thị (Overlay)**:
   - Backend gửi kết quả dịch (text) về Extension qua Socket.io.
   - **Overlay**: Content Script của Extension nhận text và render lên trang web (phía trên video player) dưới dạng phụ đề.

## Kiến trúc thư mục (Proposed Schema)
```text
/
├── frontend/             # React App (Popup, Options, Overlay, Offscreen)
│   ├── src/
│   ├── public/
│   │   └── manifest.json
│   └── index.html
├── backend/              # FastAPI Server
│   ├── main.py
│   └── requirements.txt
├── PLAN.md
└── TECHNICAL_SPEC.md
```
