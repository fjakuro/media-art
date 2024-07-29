import React, { useState, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import axios from 'axios';
import '../styles/ImageUpload.css';

function ImageUpload() {
    const [selectedImage, setSelectedImage] = useState(null);
    const [emotions, setEmotions] = useState(null);
    const [associatedWords, setAssociatedWords] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

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
            setError('Failed to load face detection models. Please refresh and try again.');
        }
        setIsLoading(false);
    };

    const handleImageChange = async (event) => {
        const file = event.target.files[0];
        if (file) {
            setIsLoading(true);
            setError(null);
            const reader = new FileReader();
            reader.onload = async (e) => {
                setSelectedImage(e.target.result);
                await detectEmotions(e.target.result);
            };
            reader.onerror = () => {
                setError('Failed to read the image file. Please try again.');
                setIsLoading(false);
            };
            reader.readAsDataURL(file);
        }
    };

    const detectEmotions = async (imageUrl) => {
        try {
            const img = await faceapi.fetchImage(imageUrl);
            const detections = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions()).withFaceExpressions();
            
            if (detections) {
                setEmotions(detections.expressions);
                await generateAssociatedWords(detections.expressions);
            } else {
                setError('No face detected in the image. Please try another image.');
                setEmotions(null);
                setAssociatedWords([]);
            }
        } catch (error) {
            setError('Failed to analyze emotions. Please try again.');
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
                    model: "gpt-3.5-turbo",
                    messages: [{
                        role: "system",
                        content: "あなたは感情データに基づいて連想される言葉や短いフレーズを日本語で生成する助手です。"
                    }, {
                        role: "user",
                        content: `${emotionsString}\n以下の感情とその強度に基づいて、連想される感情を表現する言葉や短いフレーズを日本語で50個程度生成してください。それぞれの言葉やフレーズは文章ではなく簡潔な1語程度にしましょう。\n出力はcsvの形式にしてください。`
                    }],
                    max_tokens: 150,
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
            const wordList = generatedText.split(/,|\n/).map(word => word.trim()).filter(word => word !== '');
            setAssociatedWords(wordList);
        } catch (error) {
            console.error('Error generating associated words:', error);
            if (error.response) {
                console.error('Response data:', error.response.data);
                console.error('Response status:', error.response.status);
            }
            setError('Failed to generate associated words. Please try again.');
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
            {isLoading && <div className="loading">Processing...</div>}
            {error && <div className="error">{error}</div>}
            {selectedImage && (
                <div className="image-preview">
                    <img src={selectedImage} alt="Preview" />
                </div>
            )}
            {emotions && (
                <div className="emotions-container">
                    <h2>Detected Emotions:</h2>
                    <ul>
                        {Object.entries(emotions).map(([emotion, probability]) => (
                            <li key={emotion}>
                                {emotion}: {(probability * 100).toFixed(2)}%
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {associatedWords.length > 0 && (
                <div className="associated-words-container">
                    <h2>Associated Words/Phrases:</h2>
                    <ul>
                        {associatedWords.map((word, index) => (
                            <li key={index}>{word}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

export default ImageUpload;
