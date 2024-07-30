import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';

const EmotionVisualizer = ({ words, emotions }) => {
    const mountRef = useRef(null);
    const [font, setFont] = useState(null);

    useEffect(() => {
        // フォントを一度だけ読み込む
        const loader = new FontLoader();
        loader.load('fonts/M_PLUS_1_Thin_Regular.json', (loadedFont) => {
            setFont(loadedFont);
        });
    }, []);

    useEffect(() => {
        if (!font || words.length === 0) return;

        // Three.js のセットアップ
        const width = window.innerWidth;
        const height = window.innerHeight;
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer();

        renderer.setSize(width, height);
        mountRef.current.appendChild(renderer.domElement);

        // カメラを固定位置に配置
        camera.position.z = 15;

        // 感情に基づく背景色の設定
        const backgroundColor = getBackgroundColor(emotions);
        scene.background = new THREE.Color(backgroundColor);

        // 文字オブジェクトを格納する配列
        const textMeshes = [];

        // 各単語に対してテキストメッシュを作成
        words.forEach((word, index) => {
            const geometry = new TextGeometry(word, {
                font: font,
                size: 0.5,
                height: 0.1,
            });
            const material = new THREE.MeshPhongMaterial({ color: 0xffffff });
            const mesh = new THREE.Mesh(geometry, material);

            // ランダムな初期位置に配置
            mesh.position.set(
                Math.random() * 20 - 10,
                Math.random() * 20 - 10,
                Math.random() * 10 - 5
            );

            // 各メッシュに移動方向を設定
            mesh.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.02,
                (Math.random() - 0.5) * 0.02,
                (Math.random() - 0.5) * 0.02
            );

            scene.add(mesh);
            textMeshes.push(mesh);
        });

        // ライトの追加
        const light = new THREE.PointLight(0xffffff, 1, 100);
        light.position.set(0, 0, 10);
        scene.add(light);

        // アニメーションループ
        const animate = () => {
            requestAnimationFrame(animate);

            // 各テキストメッシュを移動
            textMeshes.forEach(mesh => {
                mesh.position.add(mesh.velocity);

                // 画面端に到達したら反対側に移動
                if (Math.abs(mesh.position.x) > 10) mesh.position.x *= -0.9;
                if (Math.abs(mesh.position.y) > 10) mesh.position.y *= -0.9;
                if (Math.abs(mesh.position.z) > 5) mesh.position.z *= -0.9;

                // テキストが常にカメラの方を向くようにする
                mesh.lookAt(camera.position);
            });

            renderer.render(scene, camera);
        };
        animate();

        // クリーンアップ関数
        return () => {
            mountRef.current.removeChild(renderer.domElement);
        };
    }, [words, emotions, font]);

    return <div ref={mountRef} />;
};

// 感情に基づいて背景色を決定する関数
const getBackgroundColor = (emotions) => {
    if (!emotions) return '#000000';

    const maxEmotion = Object.entries(emotions).reduce((a, b) => a[1] > b[1] ? a : b);

    switch (maxEmotion[0]) {
        case 'happy': return '#FFD700';
        case 'sad': return '#4169E1';
        case 'angry': return '#FF4500';
        case 'fearful': return '#800080';
        case 'disgusted': return '#006400';
        case 'surprised': return '#FF69B4';
        default: return '#808080';
    }
};

export default EmotionVisualizer;
