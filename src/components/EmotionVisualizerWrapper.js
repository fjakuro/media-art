import React, { useState, useRef, useEffect } from 'react';
import EmotionVisualizer from './EmotionVisualizer';
import '../styles/EmotionVisualizerWrapper.css';

function EmotionVisualizerWrapper({ words, emotions }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const visualizerRef = useRef(null);

  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && isFullscreen) {
        closeVisualizer();
      }
    };

    document.addEventListener('keydown', handleEscKey);

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isFullscreen]);

  const openVisualizer = () => {
    setIsFullscreen(true);
    document.body.style.overflow = 'hidden'; // スクロールを無効化
  };

  const closeVisualizer = () => {
    setIsFullscreen(false);
    document.body.style.overflow = ''; // スクロールを再有効化
  };

  return (
    <div className="visualizer-wrapper">
      <div
        ref={visualizerRef}
        className={`visualizer-container ${isFullscreen ? 'fullscreen' : ''}`}
      >
        <button 
          onClick={isFullscreen ? closeVisualizer : openVisualizer} 
          className={`visualizer-button ${isFullscreen ? 'close-button' : ''}`}
        >
          {isFullscreen ? '閉じる' : '全画面表示'}
        </button>
        <EmotionVisualizer words={words} emotions={emotions} isFullscreen={isFullscreen} />
      </div>
      {isFullscreen && (
        <div className="fullscreen-overlay" onClick={closeVisualizer}>
          <div className="fullscreen-content" onClick={(e) => e.stopPropagation()}>
            <EmotionVisualizer words={words} emotions={emotions} isFullscreen={isFullscreen} />
          </div>
        </div>
      )}
    </div>
  );
}

export default EmotionVisualizerWrapper;
