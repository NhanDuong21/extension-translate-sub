/**
 * Service Worker: Quản lý Offscreen Document và Tab Capture
 */

const OFFSCREEN_DOCUMENT_PATH = 'offscreen/offscreen.html';

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

// Lắng nghe khi người dùng click vào icon extension
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // 1. Đảm bảo offscreen document đã sẵn sàng
    await ensureOffscreenDocument();

    // 2. Lấy streamId từ tab hiện tại
    // Chú ý: Cần User Gesture để gọi tabCapture
    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: tab.id
    });

    // 3. Gửi streamId sang Offscreen Document
    chrome.runtime.sendMessage({
      type: 'START_CAPTURE',
      streamId: streamId,
      tabTitle: tab.title
    });

    console.log(`Sent streamId to offscreen for tab: ${tab.title}`);
  } catch (error) {
    console.error('Failed to start capture:', error);
  }
});
