/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const NOTE_NAMES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
export const MINOR_SCALE_INTERVALS = [0, 2, 3, 5, 7, 8, 10];

export const VOCAL_RANGES = {
  soprano: { min: 60, max: 81, label: 'Soprano (C4 – A5)' },
  alto: { min: 53, max: 74, label: 'Alto / Mezzo (F3 – D5)' },
  tenor: { min: 48, max: 69, label: 'Tenor (C3 – A4)' },
  bass: { min: 40, max: 62, label: 'Bass / Baritone (E2 – D4)' },
  unconstrained: { min: 36, max: 88, label: 'Wide Range (C2 – E6)' },
};

export function midiToNoteName(midi: number, preferFlat = false): string {
  const rounded = Math.round(midi);
  const noteIndex = ((rounded % 12) + 12) % 12;
  const octave = Math.floor(rounded / 12) - 1;
  const name = preferFlat ? NOTE_NAMES_FLAT[noteIndex] : NOTE_NAMES[noteIndex];
  return `${name}${octave}`;
}

export function midiToPitchClass(midi: number, preferFlat = false): string {
  const noteIndex = ((Math.round(midi) % 12) + 12) % 12;
  return preferFlat ? NOTE_NAMES_FLAT[noteIndex] : NOTE_NAMES[noteIndex];
}

export function noteNameToMidi(nameWithOctave: string): number {
  const match = nameWithOctave.trim().match(/^([A-Ga-g][#b]?)(-?\d+)$/);
  if (!match) return 60;
  const note = match[1].toUpperCase();
  const octave = parseInt(match[2], 10);
  let noteIndex = NOTE_NAMES.indexOf(note);
  if (noteIndex === -1) {
    noteIndex = NOTE_NAMES_FLAT.indexOf(note);
  }
  if (noteIndex === -1) return 60;
  return (octave + 1) * 12 + noteIndex;
}

export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function frequencyToMidi(freq: number): number {
  if (freq <= 0) return 0;
  return 69 + 12 * Math.log2(freq / 440);
}

export function getIntervalName(semitones: number): string {
  const sign = semitones > 0 ? '+' : semitones < 0 ? '-' : '';
  const abs = Math.abs(semitones);
  const simple = abs % 12;
  const octave = Math.floor(abs / 12);

  const names: Record<number, string> = {
    0: octave > 0 ? `${octave * 8}ve` : 'Unison',
    1: 'm2',
    2: 'M2',
    3: 'm3',
    4: 'M3',
    5: 'P4',
    6: 'Tritone',
    7: 'P5',
    8: 'm6',
    9: 'M6',
    10: 'm7',
    11: 'M7',
  };

  const name = names[simple] || `${abs}st`;
  if (octave > 0 && simple !== 0) {
    return `${sign}${name}+${octave}8ve`;
  }
  return `${sign}${name}`;
}

export function getScalePitches(keyRoot: string, scaleType: 'major' | 'minor'): number[] {
  let rootIndex = NOTE_NAMES.indexOf(keyRoot.toUpperCase());
  if (rootIndex === -1) {
    rootIndex = NOTE_NAMES_FLAT.indexOf(keyRoot.toUpperCase());
  }
  if (rootIndex === -1) rootIndex = 0; // fallback C

  const intervals = scaleType === 'major' ? MAJOR_SCALE_INTERVALS : MINOR_SCALE_INTERVALS;
  return intervals.map((int) => (rootIndex + int) % 12);
}

export function isPitchInScale(midi: number, keyRoot: string, scaleType: 'major' | 'minor'): boolean {
  const pitchClass = ((Math.round(midi) % 12) + 12) % 12;
  const scalePitches = getScalePitches(keyRoot, scaleType);
  return scalePitches.includes(pitchClass);
}

export function getClosestScaleTone(midi: number, keyRoot: string, scaleType: 'major' | 'minor'): number {
  const scalePitches = getScalePitches(keyRoot, scaleType);
  const rounded = Math.round(midi);
  const pitchClass = ((rounded % 12) + 12) % 12;
  const octaveStart = Math.floor(rounded / 12) * 12;

  let bestMidi = rounded;
  let minDiff = 999;

  for (const pc of scalePitches) {
    for (const offset of [-12, 0, 12]) {
      const candidate = octaveStart + pc + offset;
      const diff = Math.abs(candidate - midi);
      if (diff < minDiff) {
        minDiff = diff;
        bestMidi = candidate;
      }
    }
  }

  return bestMidi;
}

export const VOICE_PALETTES = [
  { role: 'lead', color: '#F59E0B', label: 'Lead Melody' },         // Amber gold
  { role: 'soprano', color: '#10B981', label: 'High Harmony' },      // Emerald
  { role: 'alto', color: '#06B6D4', label: 'Upper Harmony' },        // Cyan
  { role: 'tenor', color: '#6366F1', label: 'Mid Harmony' },         // Indigo
  { role: 'bass', color: '#8B5CF6', label: 'Bass Foundation' },      // Violet
  { role: 'harmony-high', color: '#EC4899', label: 'Top Accent' },   // Pink
  { role: 'harmony-mid', color: '#3B82F6', label: 'Pad Fill' },      // Blue
  { role: 'counter-melody', color: '#F97316', label: 'Counter' },    // Orange
];
