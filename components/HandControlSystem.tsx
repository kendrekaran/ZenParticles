import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { ParticleShape } from '../types';
import { generateShapePositions, PARTICLE_COUNT } from '../utils/geometry';

interface HandControlSystemProps {
  currentShape: ParticleShape;
  particleColor: string;
  distortionStrength: number;
  onAutoShapeChange?: (shape: ParticleShape) => void;
}

const HandControlSystem: React.FC<HandControlSystemProps> = ({ currentShape, particleColor, distortionStrength, onAutoShapeChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [handStatus, setHandStatus] = useState("Initializing AI...");
  const [isReady, setIsReady] = useState(false);

  // Refs for animation loop logic to avoid re-initialization
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const requestRef = useRef<number>(0);
  const targetPositionsRef = useRef<Float32Array>(generateShapePositions(currentShape));
  const timeRef = useRef<number>(0);
  const distortionStrengthRef = useRef(distortionStrength);
  const lastAutoShapeChangeRef = useRef<number>(0);
  const prevBothClosedRef = useRef<boolean>(false);

  // Hand state
  const handStateRef = useRef({
    closing: 0.0, // 0 = open, 1 = closed
    detected: false,
    mode: 'none' as 'none' | 'one' | 'two',
    targetRotationZ: 0,
    targetRotationY: 0,
    bothClosed: false
  });

  // Update refs when props change
  useEffect(() => {
    targetPositionsRef.current = generateShapePositions(currentShape);
  }, [currentShape]);

  useEffect(() => {
    if (particlesRef.current) {
      (particlesRef.current.material as THREE.PointsMaterial).color.set(particleColor);
    }
  }, [particleColor]);

  useEffect(() => {
    distortionStrengthRef.current = distortionStrength;
  }, [distortionStrength]);

  // Main Initialization Effect
  useEffect(() => {
    if (!containerRef.current || !videoRef.current) return;

    // 1. SETUP THREE.JS
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    // preserveDrawingBuffer: true is required for the Snapshot feature to work correctly
    const renderer = new THREE.WebGLRenderer({ 
      alpha: true, 
      antialias: true,
      preserveDrawingBuffer: true 
    });
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      const width = clientWidth || window.innerWidth;
      const height = clientHeight || window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    } else {
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.inset = '0';
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 2. SETUP PARTICLES
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    // Initial random cloud
    for(let i=0; i<positions.length; i++) positions[i] = (Math.random() - 0.5) * 10;
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.PointsMaterial({
      size: 0.08,
      sizeAttenuation: true,
      color: new THREE.Color(particleColor),
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    particlesRef.current = particles;

    // 3. SETUP MEDIAPIPE
    const initMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );
        handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 2
        });
        
        // Start Camera
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ video: {
            width: { ideal: 640 },
            height: { ideal: 480 }
          } });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.addEventListener("loadeddata", () => {
              setIsReady(true);
              setHandStatus("Camera active. Show hands.");
            });
          }
        }
      } catch (err) {
        console.error("Error initializing MediaPipe:", err);
        setHandStatus("Error accessing camera or AI models.");
      }
    };
    initMediaPipe();

    // Helper to calculate fist/closed state
    const isHandClosed = (landmarks: any[]) => {
      const wrist = landmarks[0];
      const tips = [8, 12, 16, 20];
      let avgDist = 0;
      tips.forEach(idx => {
         const d = Math.sqrt(Math.pow(landmarks[idx].x - wrist.x, 2) + Math.pow(landmarks[idx].y - wrist.y, 2));
         avgDist += d;
      });
      avgDist /= 4;
      return avgDist < 0.2; // Threshold for "closed"
    };

    const autoCycleShape = () => {
      if (!onAutoShapeChange) return;
      const now = performance.now();
      if (now - lastAutoShapeChangeRef.current < 1200) return; // debounce
      const shapes: ParticleShape[] = [
        ParticleShape.HEART,
        ParticleShape.FLOWER,
        ParticleShape.SATURN,
        ParticleShape.SPHERE
      ];
      const idx = shapes.indexOf(currentShape);
      const next = shapes[(idx + 1) % shapes.length];
      lastAutoShapeChangeRef.current = now;
      onAutoShapeChange(next);
      setHandStatus("Single finger: switched shape");
    };

    // 4. ANIMATION LOOP
    const animate = () => {
      timeRef.current += 0.02; // Faster time progression for quicker distort/return
      
      // -- Hand Tracking Logic --
      if (handLandmarkerRef.current && videoRef.current && videoRef.current.readyState >= 2) {
        const startTimeMs = performance.now();
        const results = handLandmarkerRef.current.detectForVideo(videoRef.current, startTimeMs);
        
        if (results.landmarks && results.landmarks.length > 0) {
          handStateRef.current.detected = true;
          
          if (results.landmarks.length === 2) {
            // Two hands: Rotation & Burst
            handStateRef.current.mode = 'two';
            
            const landmarks1 = results.landmarks[0];
            const landmarks2 = results.landmarks[1];
            
            // Wrist positions for steering
            const h1 = landmarks1[0]; 
            const h2 = landmarks2[0]; 

            // Check if both hands are closed
            const closed1 = isHandClosed(landmarks1);
            const closed2 = isHandClosed(landmarks2);
            handStateRef.current.bothClosed = closed1 && closed2;
            const justClosed = handStateRef.current.bothClosed && !prevBothClosedRef.current;
            if (justClosed) {
              autoCycleShape();
            }
            prevBothClosedRef.current = handStateRef.current.bothClosed;

            // Sort by x to reliably determine left/right hand for steering logic
            const [left, right] = h1.x < h2.x ? [h1, h2] : [h2, h1];

            // Z Rotation: Steering Wheel logic (Angle between hands)
            const angle = Math.atan2(-(right.y - left.y), right.x - left.x);
            handStateRef.current.targetRotationZ = angle;

            // Y Rotation: Panning (Average X position)
            // INCREASED SENSITIVITY: Multiplier increased from 4 to 12
            const centerX = (left.x + right.x) / 2;
            handStateRef.current.targetRotationY = (centerX - 0.5) * 12;

            if (handStateRef.current.bothClosed) {
                setHandStatus("Dual Hand: Energy Burst!");
            } else {
                setHandStatus("Dual Hand: Rotate");
            }

          } else {
            // One hand: Closing/Fist
            handStateRef.current.mode = 'one';
            handStateRef.current.bothClosed = false;

            const landmarks = results.landmarks[0];
            const isClosed = isHandClosed(landmarks);
            
            const targetClosing = isClosed ? 1.0 : 0.0;
            handStateRef.current.closing += (targetClosing - handStateRef.current.closing) * 0.2;
            
            if (isClosed) {
              setHandStatus("Hand Closed: Stabilized");
            } else {
              setHandStatus("Hand Open: Distorting");
            }
          }
        } else {
          handStateRef.current.detected = false;
          handStateRef.current.mode = 'none';
          handStateRef.current.bothClosed = false;
          prevBothClosedRef.current = false;
          handStateRef.current.closing += (0.0 - handStateRef.current.closing) * 0.1;
          
          if (videoRef.current?.currentTime > 0) {
              setHandStatus("No hands detected");
          }
        }
      }

      // -- Particle Update Logic --
      const posAttribute = geometry.attributes.position as THREE.BufferAttribute;
      const posArray = posAttribute.array as Float32Array;
      const targetPos = targetPositionsRef.current;
      const currentDistortionStrength = distortionStrengthRef.current;
      
      const morphSpeed = 0.12; // Increase morph speed so particles snap back sooner
      const closing = handStateRef.current.closing;
      const isOneHandRelaxed = handStateRef.current.mode === 'one';
      
      const relaxationFactor = 1.0 - closing;
      const activeDistortion = isOneHandRelaxed ? relaxationFactor * currentDistortionStrength : 0;
      
      material.size = 0.05; 

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const idx = i * 3;
        let tx = targetPos[idx];
        let ty = targetPos[idx + 1];
        let tz = targetPos[idx + 2];
        
        // 1. One Hand: Relax Distortion (Wave/Noise)
        if (activeDistortion > 0.01) {
            tx += Math.sin(timeRef.current * 2.0 + ty * 2.0 + i) * activeDistortion;
            ty += Math.cos(timeRef.current * 1.5 + tx * 2.0 + i) * activeDistortion;
            tz += Math.sin(timeRef.current * 1.0 + i * 0.5) * activeDistortion;
        }

        // 2. Dual Hand: Energy Burst (Both Closed)
        if (handStateRef.current.bothClosed) {
            // Expand outward heavily
            tx *= 2.5;
            ty *= 2.5;
            tz *= 2.5;
            // Add intense jitter
            tx += (Math.random() - 0.5) * 0.5;
            ty += (Math.random() - 0.5) * 0.5;
            tz += (Math.random() - 0.5) * 0.5;
        }

        // Current positions
        let cx = posArray[idx];
        let cy = posArray[idx + 1];
        let cz = posArray[idx + 2];

        cx += (tx - cx) * morphSpeed;
        cy += (ty - cy) * morphSpeed;
        cz += (tz - cz) * morphSpeed;
        
        // Base Noise (Subtle breathing) - disable during burst for cleaner explosion
        if (!handStateRef.current.bothClosed) {
           cx += Math.sin(timeRef.current + i) * 0.002;
           cy += Math.cos(timeRef.current + i * 0.5) * 0.002;
        }

        posArray[idx] = cx;
        posArray[idx + 1] = cy;
        posArray[idx + 2] = cz;
      }
      
      posAttribute.needsUpdate = true;

      // -- Rotation Logic --
      if (handStateRef.current.mode === 'two') {
        // Controlled Rotation
        particles.rotation.z += (handStateRef.current.targetRotationZ - particles.rotation.z) * 0.1;
        particles.rotation.y += (handStateRef.current.targetRotationY - particles.rotation.y) * 0.1;
      } else {
        // Auto Rotation
        particles.rotation.y = (particles.rotation.y + 0.005) % (Math.PI * 2);
        particles.rotation.z += (0 - particles.rotation.z) * 0.05;
      }
      
      renderer.render(scene, camera);
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        const width = clientWidth || window.innerWidth;
        const height = clientHeight || window.innerHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      } else {
        renderer.setSize(window.innerWidth, window.innerHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (containerRef.current && rendererRef.current) {
         containerRef.current.removeChild(rendererRef.current.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []); 

  return (
    <>
      <div ref={containerRef} className="absolute inset-0 z-0" />
      <video 
        ref={videoRef} 
        className="absolute top-0 left-0 w-full h-full object-cover opacity-0 pointer-events-none -z-10"
        autoPlay 
        playsInline 
        muted 
      />
    </>
  );
};

export default HandControlSystem;