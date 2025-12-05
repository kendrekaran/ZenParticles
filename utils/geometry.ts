import * as THREE from 'three';
import { ParticleShape } from '../types';

export const PARTICLE_COUNT = 5000;

const BASE_SCALE = 1.6; // Slightly reduce global scale so shapes aren't oversized

export const generateShapePositions = (shape: ParticleShape): Float32Array => {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const color = new THREE.Color();

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    let x = 0, y = 0, z = 0;
    const idx = i * 3;
    const t = (i / PARTICLE_COUNT) * Math.PI * 2;
    const u = Math.random() * Math.PI * 2;
    const v = Math.random() * Math.PI;

    switch (shape) {
      case ParticleShape.HEART: {
        // Parametric heart
        // x = 16sin^3(t)
        // y = 13cos(t) - 5cos(2t) - 2cos(3t) - cos(4t)
        // Extrude slightly in Z
        const phi = Math.random() * Math.PI * 2;
        const theta = Math.random() * Math.PI;
        // A 3D heart approximation
        x = 16 * Math.pow(Math.sin(phi), 3);
        y = 13 * Math.cos(phi) - 5 * Math.cos(2 * phi) - 2 * Math.cos(3 * phi) - Math.cos(4 * phi);
        z = (Math.random() - 0.5) * 5; 
        // Scale down
        x *= 0.1; y *= 0.1; z *= 0.1;
        break;
      }

      case ParticleShape.FLOWER: {
        // Polar rose k=4
        const k = 4;
        const r = Math.cos(k * u);
        const radius = 2;
        x = radius * r * Math.cos(u);
        y = radius * r * Math.sin(u);
        z = (Math.random() - 0.5) * 1;
        break;
      }

      case ParticleShape.SATURN: {
        // Planet + Ring
        if (i < PARTICLE_COUNT * 0.4) {
          // Planet
          const r = 1.2;
          x = r * Math.sin(v) * Math.cos(u);
          y = r * Math.sin(v) * Math.sin(u);
          z = r * Math.cos(v);
        } else {
          // Ring
          const r = 2 + Math.random();
          x = r * Math.cos(u);
          z = r * Math.sin(u);
          y = (Math.random() - 0.5) * 0.1;
          // Tilt
          const angle = Math.PI / 6;
          const _y = y * Math.cos(angle) - z * Math.sin(angle);
          const _z = y * Math.sin(angle) + z * Math.cos(angle);
          y = _y;
          z = _z;
        }
        break;
      }

      default: // SPHERE
        const r = 2;
        x = r * Math.sin(v) * Math.cos(u);
        y = r * Math.sin(v) * Math.sin(u);
        z = r * Math.cos(v);
        break;
    }

    positions[idx] = x * BASE_SCALE;
    positions[idx + 1] = y * BASE_SCALE;
    positions[idx + 2] = z * BASE_SCALE;
  }
  return positions;
};
