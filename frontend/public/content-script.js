/**
 * Content Script: Render Subtitle Overlay using Shadow DOM (closed mode)
 */

(function () {
  'use strict';

  // Tránh inject duplicate
  if (document.getElementById('ext-translate-root')) return;

  // 1. Shadow DOM Container
  const host = document.createElement('div');
  host.id = 'ext-translate-root';
  host.style.cssText = `
    all: initial;
    position: fixed;
    z-index: 2147483647;
    pointer-events: none;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
  `;
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: 'closed' });

  // 2. CSS — Night Mode Tối Giản
  const style = document.createElement('style');
  style.textContent = `
    :host { all: initial; }

    #subtitle-wrapper {
      pointer-events: auto;
      user-select: none;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 10px 20px 12px;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
      max-width: 85vw;
      min-width: 200px;
      cursor: grab;
      transition: opacity 0.3s ease, transform 0.1s ease;
    }

    #subtitle-wrapper:active { cursor: grabbing; }
    #subtitle-wrapper.hidden { opacity: 0; pointer-events: none; }

    #text-original {
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      color: rgba(248, 250, 252, 0.6);
      text-align: center;
      line-height: 1.4;
    }

    #text-translated {
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 20px;
      font-weight: 600;
      color: #FFFFFF;
      text-align: center;
      line-height: 1.5;
      text-shadow: 0 2px 4px rgba(0,0,0,0.5);
    }

    #indicator {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #4ade80;
      margin-top: 5px;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.7); }
      70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(74, 222, 128, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(74, 222, 128, 0); }
    }
  `;
  shadow.appendChild(style);

  // 3. DOM Structure
  const wrapper = document.createElement('div');
  wrapper.id = 'subtitle-wrapper';
  wrapper.innerHTML = `
    <div id="text-original">Waiting for audio...</div>
    <div id="text-translated">Dịch video đa ngôn ngữ</div>
    <div id="indicator"></div>
  `;
  shadow.appendChild(wrapper);

  const elOriginal = shadow.getElementById('text-original');
  const elTranslated = shadow.getElementById('text-translated');

  // 4. Update & Auto-hide
  let hideTimer = null;
  function showSubtitle({ original_text, translated_text }) {
    elOriginal.textContent = original_text || '';
    elTranslated.textContent = translated_text || '';
    wrapper.classList.remove('hidden');

    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      wrapper.classList.add('hidden');
    }, 5000);
  }

  // 5. Draggable Logic
  let isDragging = false;
  let offsetX, offsetY;

  const savedPos = JSON.parse(localStorage.getItem('ext-sub-pos') || 'null');
  if (savedPos) {
    host.style.left = savedPos.left;
    host.style.bottom = savedPos.bottom;
    host.style.transform = 'none';
  }

  wrapper.addEventListener('mousedown', (e) => {
    isDragging = true;
    const rect = host.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    host.style.transform = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const x = e.clientX - offsetX;
    const y = e.clientY - offsetY;
    const bottom = window.innerHeight - y - host.offsetHeight;

    host.style.left = `${x}px`;
    host.style.bottom = `${bottom}px`;
  });

  document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    localStorage.setItem('ext-sub-pos', JSON.stringify({
      left: host.style.left,
      bottom: host.style.bottom
    }));
  });

  // 6. Fullscreen & Fullscreen Fallback
  function handleFullscreen() {
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    if (fsEl) fsEl.appendChild(host);
    else document.documentElement.appendChild(host);
  }
  document.addEventListener('fullscreenchange', handleFullscreen);
  document.addEventListener('webkitfullscreenchange', handleFullscreen);

  const observer = new MutationObserver(() => {
    handleFullscreen();
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  // 7. Message Listener
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'TRANSCRIPT') {
      showSubtitle(message.payload);
    }
  });

})();
