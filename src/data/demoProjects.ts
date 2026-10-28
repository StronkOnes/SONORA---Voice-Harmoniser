/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HarmonySettings, NoteEvent } from '../types/harmony';

export interface DemoMelody {
  id: string;
  title: string;
  genre: string;
  tempo: number;
  key: string;
  scale: 'major' | 'minor';
  description: string;
  notes: NoteEvent[];
  defaultSettings: Partial<HarmonySettings>;
}

export const DEMO_MELODIES: DemoMelody[] = [
  {
    id: 'amazing-grace',
    title: 'Amazing Grace (Soulful Cadence)',
    genre: 'Gospel / Soul',
    tempo: 76,
    key: 'G',
    scale: 'major',
    description: 'Classic expressive pentatonic melody with soulful phrasing, ideal for rich 4-8 part stacks.',
    defaultSettings: {
      voiceCount: 4,
      style: 'gospel',
      density: 'rich',
      spread: 'spread',
      motion: 'contrary',
      key: 'G',
      scale: 'major',
    },
    notes: [
      { id: 'ag-1', pitchMidi: 62, startTimeSeconds: 0.0, durationSeconds: 0.6, velocity: 88, confidence: 0.98, source: 'detected' }, // D4
      { id: 'ag-2', pitchMidi: 67, startTimeSeconds: 0.7, durationSeconds: 1.1, velocity: 94, confidence: 0.99, source: 'detected' }, // G4
      { id: 'ag-3', pitchMidi: 71, startTimeSeconds: 1.9, durationSeconds: 0.5, velocity: 90, confidence: 0.97, source: 'detected' }, // B4
      { id: 'ag-4', pitchMidi: 67, startTimeSeconds: 2.5, durationSeconds: 0.5, velocity: 85, confidence: 0.95, source: 'detected' }, // G4
      { id: 'ag-5', pitchMidi: 71, startTimeSeconds: 3.1, durationSeconds: 1.2, velocity: 96, confidence: 0.99, source: 'detected' }, // B4
      { id: 'ag-6', pitchMidi: 69, startTimeSeconds: 4.4, durationSeconds: 1.4, velocity: 92, confidence: 0.96, source: 'detected' }, // A4
      { id: 'ag-7', pitchMidi: 67, startTimeSeconds: 5.9, durationSeconds: 1.6, velocity: 95, confidence: 0.98, source: 'detected' }, // G4
      { id: 'ag-8', pitchMidi: 64, startTimeSeconds: 7.6, durationSeconds: 1.2, velocity: 89, confidence: 0.95, source: 'detected' }, // E4
      { id: 'ag-9', pitchMidi: 62, startTimeSeconds: 8.9, durationSeconds: 1.8, velocity: 85, confidence: 0.97, source: 'detected' }, // D4
    ],
  },
  {
    id: 'golden-hour',
    title: 'Golden Hour (Pop Vocal Hook)',
    genre: 'Pop / Modern',
    tempo: 104,
    key: 'C',
    scale: 'major',
    description: 'Catchy step-wise pop melody tailored for punchy block vocal harmonies and parallel stacks.',
    defaultSettings: {
      voiceCount: 4,
      style: 'pop',
      density: 'balanced',
      spread: 'close',
      motion: 'smooth',
      key: 'C',
      scale: 'major',
    },
    notes: [
      { id: 'gh-1', pitchMidi: 64, startTimeSeconds: 0.0, durationSeconds: 0.45, velocity: 92, confidence: 0.96, source: 'detected' }, // E4
      { id: 'gh-2', pitchMidi: 65, startTimeSeconds: 0.5, durationSeconds: 0.45, velocity: 94, confidence: 0.97, source: 'detected' }, // F4
      { id: 'gh-3', pitchMidi: 67, startTimeSeconds: 1.0, durationSeconds: 0.9, velocity: 98, confidence: 0.99, source: 'detected' },  // G4
      { id: 'gh-4', pitchMidi: 69, startTimeSeconds: 2.0, durationSeconds: 0.5, velocity: 95, confidence: 0.98, source: 'detected' },  // A4
      { id: 'gh-5', pitchMidi: 67, startTimeSeconds: 2.6, durationSeconds: 0.5, velocity: 90, confidence: 0.95, source: 'detected' },  // G4
      { id: 'gh-6', pitchMidi: 65, startTimeSeconds: 3.2, durationSeconds: 0.7, velocity: 88, confidence: 0.94, source: 'detected' },  // F4
      { id: 'gh-7', pitchMidi: 64, startTimeSeconds: 4.0, durationSeconds: 1.4, velocity: 92, confidence: 0.97, source: 'detected' },  // E4
      { id: 'gh-8', pitchMidi: 62, startTimeSeconds: 5.5, durationSeconds: 0.8, velocity: 86, confidence: 0.93, source: 'detected' },  // D4
      { id: 'gh-9', pitchMidi: 60, startTimeSeconds: 6.4, durationSeconds: 1.6, velocity: 94, confidence: 0.98, source: 'detected' },  // C4
    ],
  },
  {
    id: 'soweto-nights',
    title: 'Nights in Soweto (Amapiano Vocal)',
    genre: 'Amapiano / Afro-soul',
    tempo: 112,
    key: 'E',
    scale: 'minor',
    description: 'Soulful syncopated Afro-soul phrase that builds hypnotic parallel minor pentatonic layers.',
    defaultSettings: {
      voiceCount: 6,
      style: 'amapiano',
      density: 'rich',
      spread: 'close',
      motion: 'expressive',
      key: 'E',
      scale: 'minor',
    },
    notes: [
      { id: 'sn-1', pitchMidi: 64, startTimeSeconds: 0.0, durationSeconds: 0.35, velocity: 85, confidence: 0.96, source: 'detected' }, // E4
      { id: 'sn-2', pitchMidi: 67, startTimeSeconds: 0.4, durationSeconds: 0.5, velocity: 90, confidence: 0.98, source: 'detected' },  // G4
      { id: 'sn-3', pitchMidi: 69, startTimeSeconds: 1.0, durationSeconds: 0.75, velocity: 95, confidence: 0.99, source: 'detected' }, // A4
      { id: 'sn-4', pitchMidi: 71, startTimeSeconds: 1.85, durationSeconds: 0.4, velocity: 92, confidence: 0.95, source: 'detected' }, // B4
      { id: 'sn-5', pitchMidi: 69, startTimeSeconds: 2.3, durationSeconds: 0.8, velocity: 88, confidence: 0.94, source: 'detected' },  // A4
      { id: 'sn-6', pitchMidi: 67, startTimeSeconds: 3.2, durationSeconds: 0.6, velocity: 86, confidence: 0.93, source: 'detected' },  // G4
      { id: 'sn-7', pitchMidi: 64, startTimeSeconds: 3.9, durationSeconds: 1.5, velocity: 92, confidence: 0.97, source: 'detected' },  // E4
      { id: 'sn-8', pitchMidi: 59, startTimeSeconds: 5.5, durationSeconds: 1.8, velocity: 88, confidence: 0.96, source: 'detected' },  // B3
    ],
  },
  {
    id: 'higher-love',
    title: 'Higher Love (Worship Anthem)',
    genre: 'Contemporary Worship',
    tempo: 72,
    key: 'D',
    scale: 'major',
    description: 'Long expressive tones opening up into majestic vocal pads with open fifths and suspended resolutions.',
    defaultSettings: {
      voiceCount: 4,
      style: 'worship',
      density: 'sparse',
      spread: 'spread',
      motion: 'smooth',
      key: 'D',
      scale: 'major',
    },
    notes: [
      { id: 'hl-1', pitchMidi: 62, startTimeSeconds: 0.0, durationSeconds: 1.2, velocity: 88, confidence: 0.99, source: 'detected' }, // D4
      { id: 'hl-2', pitchMidi: 66, startTimeSeconds: 1.3, durationSeconds: 1.4, velocity: 94, confidence: 0.98, source: 'detected' }, // F#4
      { id: 'hl-3', pitchMidi: 69, startTimeSeconds: 2.8, durationSeconds: 1.8, velocity: 96, confidence: 0.99, source: 'detected' }, // A4
      { id: 'hl-4', pitchMidi: 67, startTimeSeconds: 4.7, durationSeconds: 1.2, velocity: 90, confidence: 0.95, source: 'detected' }, // G4
      { id: 'hl-5', pitchMidi: 66, startTimeSeconds: 6.0, durationSeconds: 2.2, velocity: 92, confidence: 0.97, source: 'detected' }, // F#4
    ],
  },
  {
    id: 'midnight-rnb',
    title: 'Midnight Air (Silky R&B Run)',
    genre: 'Contemporary R&B',
    tempo: 84,
    key: 'F',
    scale: 'major',
    description: 'Fluid vocal runs with minor pentatonic grace notes, harmonised with 9th and 11th chord extensions.',
    defaultSettings: {
      voiceCount: 6,
      style: 'rnb',
      density: 'rich',
      spread: 'close',
      motion: 'expressive',
      key: 'F',
      scale: 'major',
    },
    notes: [
      { id: 'mr-1', pitchMidi: 65, startTimeSeconds: 0.0, durationSeconds: 0.4, velocity: 86, confidence: 0.95, source: 'detected' }, // F4
      { id: 'mr-2', pitchMidi: 69, startTimeSeconds: 0.45, durationSeconds: 0.4, velocity: 90, confidence: 0.97, source: 'detected' }, // A4
      { id: 'mr-3', pitchMidi: 72, startTimeSeconds: 0.9, durationSeconds: 0.8, velocity: 95, confidence: 0.99, source: 'detected' },  // C5
      { id: 'mr-4', pitchMidi: 70, startTimeSeconds: 1.8, durationSeconds: 0.4, velocity: 92, confidence: 0.96, source: 'detected' },  // Bb4
      { id: 'mr-5', pitchMidi: 69, startTimeSeconds: 2.25, durationSeconds: 0.5, velocity: 89, confidence: 0.94, source: 'detected' }, // A4
      { id: 'mr-6', pitchMidi: 67, startTimeSeconds: 2.8, durationSeconds: 0.6, velocity: 88, confidence: 0.95, source: 'detected' },  // G4
      { id: 'mr-7', pitchMidi: 65, startTimeSeconds: 3.5, durationSeconds: 1.5, velocity: 94, confidence: 0.98, source: 'detected' },  // F4
    ],
  },
];
