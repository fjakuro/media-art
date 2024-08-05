import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import { StereoEffect } from 'three/examples/jsm/effects/StereoEffect.js';

const EmotionVisualizer = ({ words, emotions }) => {
    const mountRef = useRef(null);
    const [font, setFont] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isStereo, setIsStereo] = useState(false);
    const rendererRef = useRef(null);
    const effectRef = useRef(null);

    useEffect(() => {
        const loader = new FontLoader();
        loader.load('/fonts/M_PLUS_1_Thin_Regular.json',
            (loadedFont) => {
                setFont(loadedFont);
            },
            (xhr) => {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            (error) => {
                console.error('An error happened', error);
            }
        );
    }, []);

    useEffect(() => {
        if (!font || words.length === 0) return;

        let width = window.innerWidth;
        let height = window.innerHeight;
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        rendererRef.current = renderer;

        // デバイスのピクセル比を考慮
        const pixelRatio = window.devicePixelRatio;
        renderer.setPixelRatio(pixelRatio);
        renderer.setSize(width, height);
        mountRef.current.appendChild(renderer.domElement);

        const effect = new StereoEffect(renderer);
        effectRef.current = effect;
        effect.setSize(width, height);

        camera.position.z = 15;

        const backgroundColor = getBackgroundColor(emotions);
        scene.background = new THREE.Color(backgroundColor);

        const textMeshes = [];

        words.forEach((word) => {
            const geometry = new TextGeometry(word, {
                font: font,
                size: 0.5,
                height: 0.1,
                curveSegments: 12,
                bevelEnabled: true,
                bevelThickness: 0.03,
                bevelSize: 0.02,
                bevelSegments: 5
            });
            const material = new THREE.MeshPhongMaterial({ 
                color: 0xffffff,
                shininess: 100,
                specular: 0x111111
            });
            const mesh = new THREE.Mesh(geometry, material);

            mesh.position.set(
                Math.random() * 20 - 10,
                Math.random() * 20 - 10,
                Math.random() * 10 - 5
            );

            mesh.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.02,
                (Math.random() - 0.5) * 0.02,
                (Math.random() - 0.5) * 0.02
            );

            scene.add(mesh);
            textMeshes.push(mesh);
        });

        const light = new THREE.PointLight(0xffffff, 1, 100);
        light.position.set(0, 0, 10);
        scene.add(light);

        // 環境光を追加
        const ambientLight = new THREE.AmbientLight(0x404040);
        scene.add(ambientLight);

        const animate = () => {
            requestAnimationFrame(animate);

            textMeshes.forEach(mesh => {
                mesh.position.add(mesh.velocity);

                if (Math.abs(mesh.position.x) > 10) mesh.position.x *= -0.9;
                if (Math.abs(mesh.position.y) > 10) mesh.position.y *= -0.9;
                if (Math.abs(mesh.position.z) > 5) mesh.position.z *= -0.9;

                mesh.lookAt(camera.position);
            });

            if (isStereo) {
                effect.render(scene, camera);
            } else {
                renderer.render(scene, camera);
            }
        };

        animate();

        const handleResize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
            effect.setSize(width, height);
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            mountRef.current.removeChild(renderer.domElement);
            renderer.dispose();
        };
    }, [words, emotions, font, isStereo]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            if (mountRef.current.requestFullscreen) {
                mountRef.current.requestFullscreen();
            } else if (mountRef.current.webkitRequestFullscreen) { // Safari
                mountRef.current.webkitRequestFullscreen();
            } else if (mountRef.current.msRequestFullscreen) { // IE11
                mountRef.current.msRequestFullscreen();
            }
            setIsFullscreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) { // Safari
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) { // IE11
                document.msExitFullscreen();
            }
            setIsFullscreen(false);
        }
    };

    const toggleStereo = () => {
        setIsStereo(!isStereo);
    };

    return (
        <div style={{ position: 'relative' }}>
            <div ref={mountRef} style={{ width: '100%', height: '100vh' }} />
            <button 
                onClick={toggleFullscreen}
                style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    zIndex: 1000,
                    padding: '10px',
                    background: 'rgba(255, 255, 255, 0.7)',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                }}
            >
                {isFullscreen ? '全画面解除' : '全画面表示'}
            </button>
            <button 
                onClick={toggleStereo}
                style={{
                    position: 'absolute',
                    top: '10px',
                    right: '150px',
                    zIndex: 1000,
                    padding: '10px',
                    background: 'rgba(255, 255, 255, 0.7)',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                }}
            >
                {isStereo ? '通常表示' : '立体視表示'}
            </button>
        </div>
    );
};

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
