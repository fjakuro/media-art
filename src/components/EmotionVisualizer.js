import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import { StereoEffect } from 'three/examples/jsm/effects/StereoEffect.js';
import EmotionBackground from './EmotionBackground';

const EmotionVisualizer = ({ words, emotions }) => {
    const [font, setFont] = useState(null);
    const [isWebGLAvailable, setIsWebGLAvailable] = useState(true);
    const [performanceLevel, setPerformanceLevel] = useState('high');

    const mountRef = useRef(null);
    const rendererRef = useRef(null);
    const effectRef = useRef(null);
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const textMeshesRef = useRef([]);
    const animationFrameId = useRef(null);
    const geometryRef = useRef(null);
    const materialRef = useRef(null);
    const objectPoolRef = useRef([]);

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
        loader.load('/fonts/yuzunoki-font_kaisho.json',
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
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        rendererRef.current = renderer;

        const pixelRatio = performanceLevel === 'low' ? 1 : window.devicePixelRatio;
        renderer.setPixelRatio(pixelRatio);
        renderer.setSize(width, height);
        mountRef.current.appendChild(renderer.domElement);

        const effect = new StereoEffect(renderer);
        effectRef.current = effect;
        effect.setSize(width, height);

        camera.position.z = 30; // カメラを少し後ろに下げる

        const light = new THREE.PointLight(0xffffff, 1, 100);
        light.position.set(0, 0, 30);
        scene.add(light);

        const ambientLight = new THREE.AmbientLight(0x404040);
        scene.add(ambientLight);

        const createTextMesh = (word, isVertical = false) => {
            let geometry;
            if (isVertical) {
                const verticalWord = word.split('').join('\n');
                geometry = new TextGeometry(verticalWord, {
                    font: font,
                    size: 1.5, // サイズを大きく
                    height: 0.2,
                    curveSegments: 12,
                    bevelEnabled: true,
                    bevelThickness: 0.03,
                    bevelSize: 0.02,
                    bevelSegments: 5
                });
            } else {
                geometry = new TextGeometry(word, {
                    font: font,
                    size: 1.5, // サイズを大きく
                    height: 0.2,
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
                Math.random() * 60 - 30, // 配置範囲を広げる
                Math.random() * 60 - 30,
                Math.random() * 40 - 20
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
            let mesh = objectPoolRef.current.pop();
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
            objectPoolRef.current.push(mesh);
        };

        const maxObjects = performanceLevel === 'high' ? 200 : performanceLevel === 'medium' ? 100 : 50; // オブジェクト数を増やす

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

                if (Math.abs(mesh.position.x) > 30) mesh.velocity.x *= -1;
                if (Math.abs(mesh.position.y) > 30) mesh.velocity.y *= -1;
                if (Math.abs(mesh.position.z) > 20) mesh.velocity.z *= -1;

                if (!mesh.isVertical) {
                    mesh.lookAt(camera.position);
                }
            });

            effect.render(scene, camera);
        };

        animate();

        const handleResize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            if (rendererRef.current) {
                rendererRef.current.setSize(width, height);
            }
            if (effectRef.current) {
                effectRef.current.setSize(width, height);
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId.current);
            textMeshesRef.current.forEach(mesh => {
                if (mesh.geometry) mesh.geometry.dispose();
                if (mesh.material) mesh.material.dispose();
            });
            if (sceneRef.current) {
                sceneRef.current.remove(...sceneRef.current.children);
            }
            if (rendererRef.current) {
                rendererRef.current.dispose();
                if (mountRef.current && rendererRef.current.domElement) {
                    mountRef.current.removeChild(rendererRef.current.domElement);
                }
            }
            if (geometryRef.current) geometryRef.current.dispose();
            if (materialRef.current) materialRef.current.dispose();
        };
    }, [words, emotions, font, isWebGLAvailable, performanceLevel]);

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
        <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
            <EmotionBackground emotions={emotions} />
            <div ref={mountRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
        </div>
    );
};

export default EmotionVisualizer;
