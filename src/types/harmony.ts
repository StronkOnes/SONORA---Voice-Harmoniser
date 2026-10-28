/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface NoteEvent {
  id: string;
  pitchMidi: number;          // MIDI pitch (e.g. 60 = C4)
  startTimeSeconds: number;   // Time offset from start of track in seconds
  durationSeconds: number;    // Note duration in seconds
  velocity: number;           // 0 to 127
  confidence: number;         // 0 to 1 (pitch tracking confidence)
  source?: 'detected' | 'generated' | 'user-edited' | 'manual';
  editedByUser?: boolean;
  intervalFromLead?: number;  // Semitones difference relative to lead note at same moment
}

export type VoiceRole =
  | 'lead'
  | 'soprano'
  | 'alto'
  | 'tenor'
  | 'bass'
  | 'harmony-high'
  | 'harmony-mid'
  | 'harmony-low'
  | 'counter-melody'
  | 'pedal-tone';

export interface HarmonyVoice {
  id: string;
  name: string;
  role: VoiceRole;
  color: string;
  rangeMinimumMidi: number;  // Low limit (e.g. 55 = G3)
  rangeMaximumMidi: number;  // High limit (e.g. 77 = F5)
  noteEvents: NoteEvent[];
  gain: number;              // 0 to 1
  pan: number;               // -1 to 1
  muted: boolean;
  solo: boolean;
  isLead: boolean;
}

export type HarmonyStyle =
  | 'natural'
  | 'pop'
  | 'gospel'
  | 'rnb'
  | 'choir'
  | 'worship'
  | 'amapiano'
  | 'experimental';

export type HarmonyDensity = 'sparse' | 'balanced' | 'rich' | 'experimental';

export type VoiceSpread = 'close' | 'spread' | 'balanced';

export type MotionPreference = 'smooth' | 'expressive' | 'contrary';

export interface HarmonySettings {
  voiceCount: number;         // 2, 3, 4, 5, 6, 7, 8 (total including lead)
  style: HarmonyStyle;
  density: HarmonyDensity;
  spread: VoiceSpread;
  motion: MotionPreference;
  preferChordTones: boolean;
  allowCounterMelody: boolean;
  sustainOrnaments: boolean;
  key: string;                // e.g. "C", "F#", "Bb"
  scale: 'major' | 'minor';
  autoKey: boolean;
  transposeSemitones: number;
}

export interface ChordSegment {
  id: string;
  startTimeSeconds: number;
  durationSeconds: number;
  root: string;               // "C", "G", "Am", "F"
  quality: 'maj' | 'min' | '7' | 'maj7' | 'min7' | 'dim' | 'sus4' | 'm7b5' | 'add9';
  symbol: string;             // "Cmaj7", "G7", "Am", etc.
  bass?: string;              // Inversion, e.g. "G/B"
}

export interface HarmonyCandidate {
  id: string;
  candidateType: 'safe' | 'rich' | 'creative';
  title: string;
  description: string;
  voices: HarmonyVoice[];
  chords: ChordSegment[];
  score: {
    singability: number;      // 0-100
    richness: number;         // 0-100
    voiceLeading: number;     // 0-100
  };
}

export interface RecordedTake {
  id: string;
  voiceId: string;
  voiceName: string;
  audioBlob?: Blob;
  audioBlobUrl: string;
  durationSeconds: number;
  recordedAt: number;
  muted: boolean;
  gain: number;
}

export type GuideTimbre = 'vocal-synth' | 'choir-ooh' | 'rhodes' | 'acoustic-guide';

export interface Project {
  id: string;
  schemaVersion: number;
  title: string;
  createdAt: number;
  updatedAt: number;
  tempo: number;
  timeSignature: [number, number]; // [4, 4]
  leadNotes: NoteEvent[];
  originalAudioUrl?: string;
  originalAudioDuration?: number;
  detectedKey: {
    key: string;
    scale: 'major' | 'minor';
    confidence: number;
    alternatives: { key: string; scale: 'major' | 'minor'; confidence: number }[];
  };
  harmonySettings: HarmonySettings;
  candidates: HarmonyCandidate[];
  selectedCandidateId: string;
  recordedTakes: RecordedTake[];
  masterVolume: number;
  guideTimbre: GuideTimbre;
  playbackSpeed: number; // 0.75, 0.85, 1.0
  loopEnabled: boolean;
  loopStartSeconds: number;
  loopEndSeconds: number;
}
