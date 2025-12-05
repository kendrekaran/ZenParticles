import React, { useState } from 'react';
import HandControlSystem from './components/HandControlSystem';
import ControlPanel from './components/ControlPanel';
import { ParticleShape } from './types';

const App: React.FC = () => {
  const [currentShape, setCurrentShape] = useState<ParticleShape>(ParticleShape.HEART);
  const [particleColor, setParticleColor] = useState<string>('#6366f1'); // Indigo-500 default
  const [distortionStrength, setDistortionStrength] = useState<number>(1.0);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* 3D Visualization Layer */}
      <HandControlSystem 
        currentShape={currentShape} 
        particleColor={particleColor} 
        distortionStrength={distortionStrength}
        onAutoShapeChange={setCurrentShape}
      />


      {/* UI Controls */}
      <ControlPanel 
        currentShape={currentShape}
        onShapeChange={setCurrentShape}
        color={particleColor}
        onColorChange={setParticleColor}
        distortionStrength={distortionStrength}
        onDistortionChange={setDistortionStrength}
      />

    </div>
  );
};

export default App;