import React, { useState, useRef } from 'react';
import EmotionVisualizer from './EmotionVisualizer';
import '../styles/EmotionVisualizerWrapper.css';

function EmotionVisualizerWrapper({ words, emotions }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const visualizerRef = useRef(null);

  const openVisualizer = () => {
    setIsFullscreen(true);
    if (visualizerRef.current.requestFullscreen) {
      visualizerRef.current.requestFullscreen();
    } else if (visualizerRef.current.webkitRequestFullscreen) {
      visualizerRef.current.webkitRequestFullscreen();
    }
  };

  const closeVisualizer = () => {
    setIsFullscreen(false);
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
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
        <EmotionVisualizer words={words} emotions={emotions} />

      </div>
    </div>
  );
}

export default EmotionVisualizerWrapper;
