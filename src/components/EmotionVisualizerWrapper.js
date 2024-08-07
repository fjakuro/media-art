import React, { useState, useEffect, useRef } from 'react';
import EmotionVisualizer from './EmotionVisualizer';
import '../styles/EmotionVisualizerWrapper.css';

function EmotionVisualizerWrapper({ words, emotions }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const visualizerRef = useRef(null);

  const openVisualizer = () => {
    setIsFullscreen(true);
    if (visualizerRef.current) {
      if (visualizerRef.current.requestFullscreen) {
        visualizerRef.current.requestFullscreen();
      } else if (visualizerRef.current.webkitRequestFullscreen) {
        visualizerRef.current.webkitRequestFullscreen();
      }
    }
    lockOrientation();
  };

  const closeVisualizer = () => {
    setIsFullscreen(false);
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
    unlockOrientation();
  };

  const lockOrientation = () => {
    if (window.screen && window.screen.orientation && window.screen.orientation.lock) {
      window.screen.orientation.lock('landscape').catch((error) => {
        console.error('画面の向きをロックできませんでした:', error);
      });
    }
  };

  const unlockOrientation = () => {
    if (window.screen && window.screen.orientation && window.screen.orientation.unlock) {
      window.screen.orientation.unlock();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        setIsFullscreen(false);
        unlockOrientation();
      }
    };
  
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
  
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  return (
    <div className="visualizer-wrapper">
      <button onClick={openVisualizer} className="visualizer-button">
        感情ビジュアライゼーションを表示
      </button>
      <div
        ref={visualizerRef}
        className={`visualizer-container ${isFullscreen ? 'fullscreen' : ''}`}
      >
        {isFullscreen && (
          <>
            <EmotionVisualizer words={words} emotions={emotions} />
            <button onClick={closeVisualizer} className="close-button">
              閉じる
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default EmotionVisualizerWrapper;
