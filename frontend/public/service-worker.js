/**
 * Service Worker: Quản lý Offscreen Document và Tab Capture
 */

const OFFSCREEN_DOCUMENT_PATH = 'offscreen/offscreen.html';
let activeTabId = null; // Lưu trữ tab đang capture

// Hàm đảm bảo chỉ có duy nhất một Offscreen Document
async function ensureOffscreenDocument() {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });

  if (existingContexts.length > 0) {
    return;
  }

  // Tạo offscreen document mới
  try {
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_DOCUMENT_PATH,
      reasons: ['USER_MEDIA'],
      justification: 'Capturing tab audio to translate speech to text.'
    });
    console.log('Offscreen document created.');
  } catch (error) {
    console.error('Error creating offscreen document:', error);
  }
}

// Hàm dừng Capture và đóng Offscreen
async function stopCapture() {
  try {
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT']
    });

    if (existingContexts.length > 0) {
      // Gửi lệnh stop cho offscreen trước khi đóng để nó chủ động dọn dẹp
      await chrome.runtime.sendMessage({ type: 'STOP_CAPTURE' }).catch(() => {});
      await chrome.offscreen.closeDocument();
      console.log('Offscreen document closed.');
    }
  } catch (error) {
    console.error('Error closing offscreen document:', error);
  } finally {
    activeTabId = null;
  }
}

// Hàm khởi tạo Capture (được gọi từ Popup)
async function startCapture(tabId, tabTitle) {
  try {
    // Nếu đang có một session khác, hãy dừng nó trước để tránh lỗi "active stream"
    if (activeTabId !== null) {
      console.log('Existing session found. Resetting...');
      await stopCapture();
    }

    activeTabId = tabId;
    
    // 1. Đảm bảo offscreen document đã sẵn sàng
    await ensureOffscreenDocument();

    // 2. Lấy streamId từ tab
    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: tabId
    });

    // 3. Gửi streamId sang Offscreen Document
    chrome.runtime.sendMessage({
      type: 'START_CAPTURE',
      streamId: streamId,
      tabTitle: tabTitle
    });

    console.log(`Sent streamId to offscreen for tab: ${tabTitle} (ID: ${tabId})`);
  } catch (error) {
    console.error('Failed to start capture:', error);
    activeTabId = null;
  }
}

// 1. Lắng nghe lệnh từ Popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_SESSION') {
    // Lấy thông tin tab hiện tại đang active
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        startCapture(tabs[0].id, tabs[0].title);
      }
    });
  }

  if (message.type === 'STOP_SESSION') {
    stopCapture();
  }

  // 2. Relay message từ Offscreen sang Content Script
  if (message.type === 'TRANSCRIPT' && activeTabId !== null) {
    console.log('Relaying transcript to tab:', activeTabId);
    chrome.tabs.sendMessage(activeTabId, {
      type: 'TRANSCRIPT',
      payload: message.payload
    }).catch(() => {
      console.log('Target tab not ready for transcription relay.');
    });
  }
});

// Vẫn giữ onClicked để hỗ trợ kích hoạt nhanh nếu cần (tùy chọn)
chrome.action.onClicked.addListener((tab) => {
  startCapture(tab.id, tab.title);
});
