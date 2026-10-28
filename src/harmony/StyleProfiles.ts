/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HarmonyStyle } from '../types/harmony';

export interface StyleRule {
  style: HarmonyStyle;
  label: string;
  description: string;
  preferredIntervals: number[];       // preferred semitones [3, 4, 7, 8, 9, ...]
  forbiddenIntervals: number[];       // harsh clashes [1, 2, 6, 11] unless style permits
  chordComplexity: 'triad' | 'seventh' | 'extended' | 'modal';
  parallelMotionWeight: number;       // 0 = strict contrary/oblique, 1 = pop block parallel
  spreadPreference: 'close' | 'spread' | 'mixed';
  counterMelodyChance: number;        // probability of contrary or independent movement
  pedalBassChance: number;
}

export const STYLE_PROFILES: Record<HarmonyStyle, StyleRule> = {
  natural: {
    style: 'natural',
    label: 'Natural / Simple',
    description: 'Clean diatonic 3rds and 6ths, smooth conjunct motion, singable folk and acoustic blend.',
    preferredIntervals: [3, 4, 7, 8, 9],
    forbiddenIntervals: [1, 6],
    chordComplexity: 'triad',
    parallelMotionWeight: 0.5,
    spreadPreference: 'close',
    counterMelodyChance: 0.1,
    pedalBassChance: 0.2,
  },
  pop: {
    style: 'pop',
    label: 'Pop Vocal Stack',
    description: 'Tight block harmonies, high 3rds and 4ths, modern parallel tracking with energetic punch.',
    preferredIntervals: [3, 4, 5, 7, 8, 9, 12],
    forbiddenIntervals: [1, 11],
    chordComplexity: 'seventh',
    parallelMotionWeight: 0.85,
    spreadPreference: 'close',
    counterMelodyChance: 0.05,
    pedalBassChance: 0.1,
  },
  gospel: {
    style: 'gospel',
    label: 'Gospel / Soul',
    description: 'Powerful multi-voice stacks with secondary dominants, suspensions, 7ths, 9ths, and soaring top notes.',
    preferredIntervals: [3, 4, 7, 9, 10, 11, 14],
    forbiddenIntervals: [],
    chordComplexity: 'extended',
    parallelMotionWeight: 0.6,
    spreadPreference: 'spread',
    counterMelodyChance: 0.35,
    pedalBassChance: 0.5,
  },
  rnb: {
    style: 'rnb',
    label: 'Contemporary R&B',
    description: 'Silky 9th and 11th chord extensions, passing chromaticism, close micro-harmonies and lush pads.',
    preferredIntervals: [2, 3, 4, 7, 9, 11, 14],
    forbiddenIntervals: [1],
    chordComplexity: 'extended',
    parallelMotionWeight: 0.7,
    spreadPreference: 'close',
    counterMelodyChance: 0.25,
    pedalBassChance: 0.3,
  },
  choir: {
    style: 'choir',
    label: 'Choir / SATB',
    description: 'Classical choral voice-leading, open 4-part spacing, strict contrary motion, and strong bass roots.',
    preferredIntervals: [3, 4, 5, 7, 8, 9, 12],
    forbiddenIntervals: [1, 2, 6],
    chordComplexity: 'triad',
    parallelMotionWeight: 0.1,
    spreadPreference: 'spread',
    counterMelodyChance: 0.45,
    pedalBassChance: 0.6,
  },
  worship: {
    style: 'worship',
    label: 'Contemporary Worship',
    description: 'Anthemic open fifths, octaves, suspended 2nd and 4th vocal pads that build dynamic lift.',
    preferredIntervals: [5, 7, 12, 14, 16],
    forbiddenIntervals: [1, 6],
    chordComplexity: 'modal',
    parallelMotionWeight: 0.4,
    spreadPreference: 'spread',
    counterMelodyChance: 0.2,
    pedalBassChance: 0.7,
  },
  amapiano: {
    style: 'amapiano',
    label: 'Amapiano / Afro-soul',
    description: 'Warm minor pentatonic stacks, syncopated call-and-response vocal layers, and soulful parallel pads.',
    preferredIntervals: [3, 5, 7, 10, 12, 15],
    forbiddenIntervals: [1, 11],
    chordComplexity: 'seventh',
    parallelMotionWeight: 0.75,
    spreadPreference: 'close',
    counterMelodyChance: 0.4,
    pedalBassChance: 0.3,
  },
  experimental: {
    style: 'experimental',
    label: 'Experimental / Modern',
    description: 'Polychords, cluster voicings, unexpected modal substitutions, and dramatic counterpoint.',
    preferredIntervals: [1, 2, 6, 8, 11, 13],
    forbiddenIntervals: [],
    chordComplexity: 'extended',
    parallelMotionWeight: 0.3,
    spreadPreference: 'mixed',
    counterMelodyChance: 0.6,
    pedalBassChance: 0.4,
  },
};
