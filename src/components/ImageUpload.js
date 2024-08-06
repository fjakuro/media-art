import React, { useState, useEffect, useRef } from 'react';
import * as faceapi from 'face-api.js';
import axios from 'axios';
import '../styles/ImageUpload.css';
import EmotionVisualizer from './EmotionVisualizer';

function ImageUpload() {
    const [selectedImage, setSelectedImage] = useState(null);
    const [emotions, setEmotions] = useState(null);
    const [associatedWords, setAssociatedWords] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isCameraMode, setIsCameraMode] = useState(false);
    const videoRef = useRef();
    const canvasRef = useRef();
    const [cameras, setCameras] = useState([]);
    const [selectedCamera, setSelectedCamera] = useState('');

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

    const getCameraDevices = async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            setCameras(videoDevices);
            if (videoDevices.length > 0) {
                setSelectedCamera(videoDevices[0].deviceId);
            }
        } catch (error) {
            console.error('カメラデバイスの取得に失敗しました:', error);
            setError('カメラデバイスの取得に失敗しました。');
        }
    };

    useEffect(() => {
        getCameraDevices();
    }, []);

    const startCamera = async () => {
        setIsCameraMode(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: selectedCamera ? { exact: selectedCamera } : undefined }
            });
            videoRef.current.srcObject = stream;
            videoRef.current.play();
        } catch (error) {
            setError('カメラの起動に失敗しました。カメラへのアクセス権限を確認してください。');
            setIsCameraMode(false);
        }
    };

    const handleCameraChange = (event) => {
        setSelectedCamera(event.target.value);
        if (isCameraMode) {
            stopCamera();
            startCamera();
        }
    };

    const stopCamera = () => {
        const stream = videoRef.current.srcObject;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        setIsCameraMode(false);
    };

    const detectEmotions = async (input) => {
        try {
            let detections;
            if (input instanceof HTMLVideoElement) {
                detections = await faceapi.detectSingleFace(input, new faceapi.TinyFaceDetectorOptions()).withFaceExpressions();
            } else {
                const img = await faceapi.fetchImage(input);
                detections = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions()).withFaceExpressions();
            }
            
            if (detections) {
                setEmotions(detections.expressions);
                await generateAssociatedWords(detections.expressions);
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
                    model: "gpt-3.5-turbo",
                    messages: [{
                        role: "system",
                        content: "あなたは感情データに基づいて連想される言葉を日本語で生成するアシスタントです。"
                    }, {
                        role: "user",
                        content: `${emotionsString}\n以上の感情とその強度に基づいて、連想される感情を表現する言葉を日本語で200個程度生成してください。それぞれの言葉は文章ではなく簡潔な1語にしましょう。感情を表現する言葉を1単語で表現してください。\n可能な限り重複は避けてください。\n出力では数字や箇条書きは使用せずcsvの形式を用いてください。`
                    }],
                    max_tokens: 2000,
                    n: 1,
                    temperature: 0.8,
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

    useEffect(() => {
        if (isCameraMode) {
            const interval = setInterval(async () => {
                if (videoRef.current) {
                    await detectEmotions(videoRef.current);
                }
            }, 3000);  // 3秒ごとに感情分析を実行

            return () => clearInterval(interval);
        }
    }, [isCameraMode]);

    return (
        <div className="image-upload-container">
            {!isCameraMode && (
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="image-input"
                    disabled={isLoading}
                />
            )}
            <button onClick={isCameraMode ? stopCamera : startCamera}>
                {isCameraMode ? 'カメラを停止' : 'カメラを開始'}
            </button>
            <select value={selectedCamera} onChange={handleCameraChange}>
                {cameras.map((camera) => (
                    <option key={camera.deviceId} value={camera.deviceId}>
                        {camera.label || `カメラ ${cameras.indexOf(camera) + 1}`}
                    </option>
                ))}
            </select>
            {isLoading && <div className="loading">処理中...</div>}
            {error && <div className="error">{error}</div>}
            {selectedImage && !isCameraMode && (
                <div className="image-preview">
                    <img src={selectedImage} alt="プレビュー" />
                </div>
            )}
            {isCameraMode && (
                <div className="video-container">
                    <video ref={videoRef} width="640" height="480" />
                    <canvas ref={canvasRef} width="640" height="480" />
                </div>
            )}
            {emotions && (
                <div className="emotions-container">
                    <h2>検出された感情:</h2>
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
                    <h2>連想される言葉/フレーズ:</h2>
                    <ul>
                        {associatedWords.map((word, index) => (
                            <li key={index}>{word}</li>
                        ))}
                    </ul>
                </div>
            )}
            {associatedWords.length > 0 && emotions && (
                <EmotionVisualizer words={associatedWords} emotions={emotions} />
            )}
        </div>
    );
}

export default ImageUpload;
