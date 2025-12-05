export enum ParticleShape {
  HEART = 'Heart',
  FLOWER = 'Flower',
  SATURN = 'Saturn',
  SPHERE = 'Sphere'
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface HandGestures {
  isOpen: boolean; // True if hand is open, false if closed (fist)
  separation: number; // Normalized distance between hands (0 to 1)
  detected: boolean; // If any hands are detected
}
