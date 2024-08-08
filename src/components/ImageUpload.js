import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as faceapi from 'face-api.js';
import '../styles/ImageUpload.css';
import EmotionVisualizer from './EmotionVisualizer';
import EmotionVisualizerWrapper from './EmotionVisualizerWrapper';

function ImageUpload() {
    const [selectedImage, setSelectedImage] = useState(null);
    const [emotions, setEmotions] = useState(null);
    const [associatedWords, setAssociatedWords] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showPreview, setShowPreview] = useState(true);

    useEffect(() => {
        loadModels();
    }, []);

    const loadModels = async () => {
        setIsLoading(true);
        try {
            const MODEL_URL = process.env.PUBLIC_URL + '/models';
            await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
            await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
        } catch (error) {
            setError('顔検出モデルの読み込みに失敗しました。ページを更新してもう一度お試しください。');
        }
        setIsLoading(false);
    };

    const handleImageChange = async (event) => {
        const file = event.target.files[0];
        if (file) {
            setIsLoading(true);
            setError(null);
            setShowPreview(true);
            const reader = new FileReader();
            reader.onload = async (e) => {
                setSelectedImage(e.target.result);
                await detectEmotions(e.target.result);
            };
            reader.onerror = () => {
                setError('画像ファイルの読み込みに失敗しました。もう一度お試しください。');
                setIsLoading(false);
            };
            reader.readAsDataURL(file);
        }
    };

    const detectEmotions = async (input) => {
        try {
            const img = await faceapi.fetchImage(input);
            const detections = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions()).withFaceExpressions();
            
            if (detections) {
                setEmotions(detections.expressions);
                await generateAssociatedWords(detections.expressions);
                setShowPreview(false);
            } else {
                setError('画像から顔を検出できませんでした。別の画像をお試しください。');
                setEmotions(null);
                setAssociatedWords([]);
            }
        } catch (error) {
            setError('感情分析に失敗しました。もう一度お試しください。');
        }
        setIsLoading(false);
    };

    const generateAssociatedWords = async (emotions) => {
        const emotionsString = Object.entries(emotions)
            .map(([emotion, probability]) => `${emotion}: ${(probability * 100).toFixed(2)}%`)
            .join(', ');

        try {
            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: "gpt-4o-mini",
                    messages: [{
                        role: "system",
                        content: "あなたは感情データに基づいて連想される言葉や短いフレーズを日本語で生成する助手です。"
                    }, {
                        role: "user",
                        content: `${emotionsString}\n以上の感情とその強度に基づいて、連想される感情を表現する言葉や短いフレーズを日本語で50個程度生成してください。それぞれの言葉やフレーズは文章ではなく簡潔な1語程度にしましょう。\n出力では数字や箇条書きは使用せずcsvの形式を用いてください。`
                    }],
                    max_tokens: 200,
                    n: 1,
                    temperature: 0.7,
                },
                {
                    headers: {
                        'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            const generatedText = response.data.choices[0].message.content.trim();
            const wordList = generatedText.split(/[,、\n]/).map(word => word.trim()).filter(word => word !== '');
            setAssociatedWords(wordList);
        } catch (error) {
            console.error('連想語の生成中にエラーが発生しました:', error);
            if (error.response) {
                console.error('レスポンスデータ:', error.response.data);
                console.error('レスポンスステータス:', error.response.status);
            }
            setError('連想語の生成に失敗しました。もう一度お試しください。');
            setAssociatedWords([]);
        }
    };

    return (
        <div className="image-upload-container">
            <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="image-input"
                disabled={isLoading}
            />
            {isLoading && <div className="loading">処理中...</div>}
            {error && <div className="error">{error}</div>}
            {selectedImage && showPreview && (
                <div className="image-preview">
                    <img src={selectedImage} alt="プレビュー" />
                </div>
            )}
            {associatedWords.length > 0 && emotions && (
                <EmotionVisualizer words={associatedWords} emotions={emotions} />
            )}
            {associatedWords.length > 0 && emotions && (
                <EmotionVisualizerWrapper words={associatedWords} emotions={emotions} />
            )}
        </div>
    );
}

export default ImageUpload;
