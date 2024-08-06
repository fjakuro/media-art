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
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const textMeshesRef = useRef([]);
    const animationFrameId = useRef(null);

    const [isWebGLAvailable, setIsWebGLAvailable] = useState(true);
    const [performanceLevel, setPerformanceLevel] = useState('high');

    useEffect(() => {
        const canvas = document.createElement('canvas');
        setIsWebGLAvailable(!!window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));

        const performanceNow = performance.now();
        let sum = 0;
        for (let i = 0; i < 1000000; i++) {
            sum += Math.random();
        }
        const elapsedTime = performance.now() - performanceNow;
        setPerformanceLevel(elapsedTime < 50 ? 'high' : elapsedTime < 100 ? 'medium' : 'low');

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
        if (!isWebGLAvailable || !font || words.length === 0) return;

        let width = window.innerWidth;
        let height = window.innerHeight;
        const scene = new THREE.Scene();
        sceneRef.current = scene;
        const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        cameraRef.current = camera;
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        rendererRef.current = renderer;

        const pixelRatio = performanceLevel === 'low' ? 1 : window.devicePixelRatio;
        renderer.setPixelRatio(pixelRatio);
        renderer.setSize(width, height);
        mountRef.current.appendChild(renderer.domElement);

        const effect = new StereoEffect(renderer);
        effectRef.current = effect;
        effect.setSize(width, height);

        camera.position.z = 20;

        const backgroundColor = getBackgroundColor(emotions);
        scene.background = new THREE.Color(backgroundColor);

        const light = new THREE.PointLight(0xffffff, 1, 100);
        light.position.set(0, 0, 20);
        scene.add(light);

        const ambientLight = new THREE.AmbientLight(0x404040);
        scene.add(ambientLight);

        const objectPool = [];

        const createTextMesh = (word, isVertical = false) => {
            let geometry;
            if (isVertical) {
                const verticalWord = word.split('').join('\n');
                geometry = new TextGeometry(verticalWord, {
                    font: font,
                    size: 0.5,
                    height: 0.1,
                    curveSegments: 12,
                    bevelEnabled: true,
                    bevelThickness: 0.03,
                    bevelSize: 0.02,
                    bevelSegments: 5
                });
            } else {
                geometry = new TextGeometry(word, {
                    font: font,
                    size: 0.5,
                    height: 0.1,
                    curveSegments: 12,
                    bevelEnabled: true,
                    bevelThickness: 0.03,
                    bevelSize: 0.02,
                    bevelSegments: 5
                });
            }

            const material = new THREE.MeshPhongMaterial({ 
                color: 0xffffff,
                shininess: 100,
                specular: 0x111111,
                transparent: true,
                opacity: 0
            });
            const mesh = new THREE.Mesh(geometry, material);

            mesh.position.set(
                Math.random() * 40 - 20,
                Math.random() * 40 - 20,
                Math.random() * 30 - 15
            );

            mesh.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.02,
                (Math.random() - 0.5) * 0.02,
                (Math.random() - 0.5) * 0.02
            );

            mesh.lifespan = Math.random() * 10 + 5;
            mesh.age = 0;
            mesh.isVertical = isVertical;

            return mesh;
        };

        const getOrCreateTextMesh = (word) => {
            let mesh = objectPool.pop();
            if (!mesh) {
                mesh = createTextMesh(word, Math.random() < 0.5);
            } else {
                // Update existing mesh
                if (mesh.material.map) {
                    mesh.material.map.dispose();
                }
                mesh.material.map = null;
                mesh.position.set(
                    Math.random() * 40 - 20,
                    Math.random() * 40 - 20,
                    Math.random() * 30 - 15
                );
                mesh.velocity.set(
                    (Math.random() - 0.5) * 0.02,
                    (Math.random() - 0.5) * 0.02,
                    (Math.random() - 0.5) * 0.02
                );
                mesh.lifespan = Math.random() * 10 + 5;
                mesh.age = 0;
            }
            return mesh;
        };

        const releaseTextMesh = (mesh) => {
            scene.remove(mesh);
            objectPool.push(mesh);
        };

        const maxObjects = performanceLevel === 'high' ? 100 : performanceLevel === 'medium' ? 50 : 25;

        words.forEach(word => {
            if (textMeshesRef.current.length < maxObjects) {
                const mesh = getOrCreateTextMesh(word);
                scene.add(mesh);
                textMeshesRef.current.push(mesh);
            }
        });

        const animate = () => {
            animationFrameId.current = requestAnimationFrame(animate);

            textMeshesRef.current.forEach((mesh, index) => {
                mesh.position.add(mesh.velocity);
                mesh.age += 0.016;

                if (mesh.age < 1) {
                    mesh.material.opacity = mesh.age;
                } else if (mesh.age > mesh.lifespan - 1) {
                    mesh.material.opacity = mesh.lifespan - mesh.age;
                }

                if (mesh.age >= mesh.lifespan) {
                    releaseTextMesh(mesh);
                    textMeshesRef.current.splice(index, 1);
                    if (words.length > 0) {
                        const newMesh = getOrCreateTextMesh(words[Math.floor(Math.random() * words.length)]);
                        scene.add(newMesh);
                        textMeshesRef.current.push(newMesh);
                    }
                }

                if (Math.abs(mesh.position.x) > 20) mesh.velocity.x *= -1;
                if (Math.abs(mesh.position.y) > 20) mesh.velocity.y *= -1;
                if (Math.abs(mesh.position.z) > 15) mesh.velocity.z *= -1;

                if (!mesh.isVertical) {
                    mesh.lookAt(camera.position);
                }
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
            cancelAnimationFrame(animationFrameId.current);
            textMeshesRef.current.forEach(mesh => {
                mesh.geometry.dispose();
                mesh.material.dispose();
            });
            scene.remove(...scene.children);
            renderer.dispose();
            mountRef.current.removeChild(renderer.domElement);
        };
    }, [words, emotions, font, isStereo, isWebGLAvailable, performanceLevel]);

    const toggleFullscreen = () => {
        const element = mountRef.current;
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            if (element.requestFullscreen) {
                element.requestFullscreen();
            } else if (element.webkitRequestFullscreen) {
                element.webkitRequestFullscreen();
            }
            setIsFullscreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
            setIsFullscreen(false);
        }
    };

    const toggleStereo = () => {
        setIsStereo(!isStereo);
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement || !!document.webkitFullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        };
    }, []);

    if (!isWebGLAvailable) {
        return (
            <div>
                <h2>3D表示はこのデバイスでサポートされていません</h2>
                <ul>
                    {words.map((word, index) => (
                        <li key={index}>{word}</li>
                    ))}
                </ul>
            </div>
        );
    }

    return (
        <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
            <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
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
