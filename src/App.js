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
      <section className="instructions">
        {/* <h2>離散化する感情</h2> */}
        <ol>
          <li>自身の顔が映った思い出の写真を用意してください。<br/><span className="sub-instruction">（今、自撮りをしていただいても構いません。）</span></li>
          <li>下記の「ファイルを選択」から写真をアップロードしてください。</li>
          <li>全画面表示をしたうえで、スマートフォン用VRゴーグルにセットして覗き込みましょう。<br/><span className="sub-instruction">（VRゴーグルがない場合などは立体視をオフにしてお楽しみください。）</span></li>
          <li>表示される言葉や色彩を見ながら、撮影当時の感情について思いを馳せてみてください。</li>
        </ol>
        <p className="privacy-note">※写真は製作者のサーバーで処理されますが保存はされません。またOpenAIのAPIを利用していますが、写真そのものは送信されず分析された感情パラメータのみが送られます。</p>
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