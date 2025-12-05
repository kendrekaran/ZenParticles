import React from 'react';
import { ParticleShape } from '../types';
import { Heart, Flower, Globe, Circle, Waves } from 'lucide-react';

interface ControlPanelProps {
  currentShape: ParticleShape;
  onShapeChange: (shape: ParticleShape) => void;
  color: string;
  onColorChange: (color: string) => void;
  distortionStrength: number;
  onDistortionChange: (val: number) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  currentShape,
  onShapeChange,
  color,
  onColorChange,
  distortionStrength,
  onDistortionChange,
}) => {
  
  const templates = [
    { id: ParticleShape.HEART, icon: <Heart size={18} />, label: 'Heart' },
    { id: ParticleShape.FLOWER, icon: <Flower size={18} />, label: 'Flower' },
    { id: ParticleShape.SATURN, icon: <Globe size={18} />, label: 'Saturn' },
    { id: ParticleShape.SPHERE, icon: <Circle size={18} />, label: 'Sphere' },
  ];

  return (
    <div className="fixed top-24 left-6 z-40 flex flex-col gap-4 max-h-[calc(100vh-120px)] overflow-y-auto scrollbar-hide">
      <div className="bg-gray-900/80 backdrop-blur-md p-4 rounded-2xl border border-gray-700 shadow-xl w-64">
        <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Templates</h2>
        <div className="grid grid-cols-2 gap-2">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => onShapeChange(t.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                currentShape === t.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;