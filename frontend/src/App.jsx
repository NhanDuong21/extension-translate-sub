import { useState } from 'react';
import './App.css';

function App() {
  const [isTranslating, setIsTranslating] = useState(false);

  const handleStartTranslation = () => {
    setIsTranslating(true);
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ type: 'START_SESSION' });
    }
  };

  const handleStopTranslation = () => {
    setIsTranslating(false);
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ type: 'STOP_SESSION' });
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo">
          <span className="logo-icon">🌐</span>
          <h1>Translate Sub</h1>
        </div>
      </header>
      
      <main className="app-main">
        <div className="status-indicator">
          <div className={`dot ${isTranslating ? 'active' : ''}`}></div>
          <p>{isTranslating ? 'Đang hoạt động...' : 'Sẵn sàng'}</p>
        </div>

        <button 
          className={`translate-btn ${isTranslating ? 'stop' : ''}`}
          onClick={isTranslating ? handleStopTranslation : handleStartTranslation}
        >
          {isTranslating ? 'Dừng Dịch' : 'Bắt đầu Dịch'}
        </button>

        <p className="description">
          Dịch video đa ngôn ngữ sang Tiếng Việt bằng AI.
        </p>
      </main>

      <footer className="app-footer">
        <p>Powered by Faster-Whisper & Gemini</p>
      </footer>
    </div>
  );
}

export default App;
