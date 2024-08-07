import React, { useState } from 'react';
import ImageUpload from './components/ImageUpload';
import EmotionVisualizer from './components/EmotionVisualizer';
import './styles/App.css';

function App() {
  const [emotions, setEmotions] = useState(null);
  const [words, setWords] = useState([]);

  const handleEmotionsGenerated = (newEmotions, newWords) => {
    setEmotions(newEmotions);
    setWords(newWords);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>離散化する感情</h1>
      </header>
      
      <section className="overview">
        <p>
          本作品は、あなたの表情から感情を読み取り、AIが言葉に変換します。
          そして、その言葉があなたの内なる感情をどのように表現し、
          また表現しきれないかを、インタラクティブな3D空間で体験していただきます。
        </p>
      </section>

      <section className="image-upload">
        <ImageUpload onEmotionsGenerated={handleEmotionsGenerated} />
      </section>

      {emotions && words.length > 0 && (
        <section className="visualization">
          <EmotionVisualizer emotions={emotions} words={words} />
        </section>
      )}
    </div>
  );
}

export default App;
