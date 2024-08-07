import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import axios from 'axios';

const EmotionBackground = ({ emotions }) => {
    const [colors, setColors] = useState(['#E6E6FA', '#B0E0E6', '#F0E68C', '#FFB6C1']);
    const mountRef = useRef(null);
    const rendererRef = useRef(null);
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const planeRef = useRef(null);
    const geometryRef = useRef(null);
    const materialRef = useRef(null);
    const animationFrameId = useRef(null);

    useEffect(() => {
        const generateColors = async () => {
            try {
                const emotionString = Object.entries(emotions)
                    .map(([emotion, value]) => `${emotion}: ${value}`)
                    .join(', ');

                const response = await axios.post(
                    'https://api.openai.com/v1/chat/completions',
                    {
                        model: "gpt-3.5-turbo",
                        messages: [{
                            role: "system",
                            content: "You are a color expert that generates harmonious color schemes based on emotions."
                        }, {
                            role: "user",
                            content: `Generate 4 harmonious hexadecimal color codes that represent the following emotions: ${emotionString}. The colors should be suitable for a subtle background and avoid extreme or unpleasant combinations. Provide only the color codes separated by commas.`
                        }],
                        max_tokens: 60,
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

                const colorCodes = response.data.choices[0].message.content.split(',').map(code => code.trim());
                setColors(colorCodes);
            } catch (error) {
                console.error('Error generating colors:', error);
                setColors(['#E6E6FA', '#B0E0E6', '#F0E68C', '#FFB6C1']); // Fallback colors
            }
        };

        generateColors();
    }, [emotions]);

    useEffect(() => {
        if (colors.length === 0) return;

        let width = window.innerWidth;
        let height = window.innerHeight;

        const scene = new THREE.Scene();
        sceneRef.current = scene;

        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        mountRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        const geometry = new THREE.PlaneGeometry(2, 2);
        geometryRef.current = geometry;

        const material = new THREE.ShaderMaterial({
            uniforms: {
                color1: { value: new THREE.Color(colors[0]) },
                color2: { value: new THREE.Color(colors[1]) },
                color3: { value: new THREE.Color(colors[2]) },
                color4: { value: new THREE.Color(colors[3]) },
                time: { value: 0 },
                resolution: { value: new THREE.Vector2(width, height) }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 color1;
                uniform vec3 color2;
                uniform vec3 color3;
                uniform vec3 color4;
                uniform float time;
                uniform vec2 resolution;
                varying vec2 vUv;

                // Simplex 2D noise
                vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

                float snoise(vec2 v){
                    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                        -0.577350269189626, 0.024390243902439);
                    vec2 i  = floor(v + dot(v, C.yy) );
                    vec2 x0 = v -   i + dot(i, C.xx);
                    vec2 i1;
                    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
                    vec4 x12 = x0.xyxy + C.xxzz;
                    x12.xy -= i1;
                    i = mod(i, 289.0);
                    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
                        + i.x + vec3(0.0, i1.x, 1.0 ));
                    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
                        dot(x12.zw,x12.zw)), 0.0);
                    m = m*m ;
                    m = m*m ;
                    vec3 x = 2.0 * fract(p * C.www) - 1.0;
                    vec3 h = abs(x) - 0.5;
                    vec3 ox = floor(x + 0.5);
                    vec3 a0 = x - ox;
                    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
                    vec3 g;
                    g.x  = a0.x  * x0.x  + h.x  * x0.y;
                    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
                    return 130.0 * dot(m, g);
                }

                void main() {
                    vec2 st = gl_FragCoord.xy / resolution.xy;
                    float t = time * 0.00005; // Significantly slowed down the overall animation

                    // Create noise pattern with larger color areas
                    float noise1 = snoise(st * 1.5 + t);
                    float noise2 = snoise(st * 1.2 - t * 0.8);
                    float noise3 = snoise(st * 1.0 + t * 0.6);

                    // Mix colors based on noise
                    vec3 color = mix(
                        mix(color1, color2, smoothstep(-1.0, 1.0, noise1)),
                        mix(color3, color4, smoothstep(-1.0, 1.0, noise2)),
                        smoothstep(-1.0, 1.0, noise3)
                    );

                    // Subtle variation
                    color += 0.03 * vec3(noise1, noise2, noise3);

                    gl_FragColor = vec4(color, 1.0);
                }
            `
        });
        materialRef.current = material;

        const plane = new THREE.Mesh(geometry, material);
        scene.add(plane);
        planeRef.current = plane;

        const animate = (time) => {
            animationFrameId.current = requestAnimationFrame(animate);
            material.uniforms.time.value = time;
            renderer.render(scene, camera);
        };

        animate(0);

        const handleResize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            renderer.setSize(width, height);
            material.uniforms.resolution.value.set(width, height);
        };

        window.addEventListener('resize', handleResize);

        return () => {
            cancelAnimationFrame(animationFrameId.current);
            window.removeEventListener('resize', handleResize);
            if (sceneRef.current && planeRef.current) {
                sceneRef.current.remove(planeRef.current);
            }
            if (geometryRef.current) {
                geometryRef.current.dispose();
            }
            if (materialRef.current) {
                materialRef.current.dispose();
            }
            if (rendererRef.current) {
                rendererRef.current.dispose();
            }
            if (mountRef.current && rendererRef.current) {
                mountRef.current.removeChild(rendererRef.current.domElement);
            }
        };
    }, [colors, emotions]);

    return <div ref={mountRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1 }} />;
};

export default EmotionBackground;
