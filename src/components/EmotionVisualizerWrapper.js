import React, { useState, useRef, useEffect } from 'react';
import EmotionVisualizer from './EmotionVisualizer';
import EmotionBackground from './EmotionBackground';
import '../styles/EmotionVisualizerWrapper.css';

function EmotionVisualizerWrapper({ words, emotions }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isStereo, setIsStereo] = useState(false);
  const visualizerRef = useRef(null);

  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && isFullscreen) {
        toggleFullscreen();
      }
    };

    document.addEventListener('keydown', handleEscKey);

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isFullscreen]);

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
    document.body.style.overflow = isFullscreen ? '' : 'hidden';
    setIsStereo(!isFullscreen); // フルスクリーンに入る際は立体視をオンに、出る際はオフに
  };

  const toggleStereo = () => {
    setIsStereo((prev) => !prev);
  };

  return (
    <div className="visualizer-wrapper">
      <div
        ref={visualizerRef}
        className={`visualizer-container ${isFullscreen ? 'fullscreen' : ''}`}
      >
        <div className="button-container">
          {isFullscreen && (
            <button 
              onClick={toggleStereo} 
              className="control-button stereo-toggle-button"
            >
              {isStereo ? '立体視オフ' : '立体視オン'}
            </button>
          )}
          <button 
            onClick={toggleFullscreen} 
            className="control-button fullscreen-button"
          >
            {isFullscreen ? '閉じる' : '全画面表示'}
          </button>
        </div>
        <EmotionBackground emotions={emotions} isFullscreen={isFullscreen} isStereo={isStereo} />
        <EmotionVisualizer words={words} emotions={emotions} isFullscreen={isFullscreen} isStereo={isStereo} />
      </div>
    </div>
  );
}

export default EmotionVisualizerWrapper;
