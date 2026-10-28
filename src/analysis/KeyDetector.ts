/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NoteEvent } from '../types/harmony';
import { NOTE_NAMES } from '../utils/musicTheory';

// Krumhansl-Kessler key profiles for major and minor keys
const KRUMHANSL_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const KRUMHANSL_MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

export interface KeyResult {
  key: string;
  scale: 'major' | 'minor';
  confidence: number;
  alternatives: { key: string; scale: 'major' | 'minor'; confidence: number }[];
}

export class KeyDetector {
  /**
   * Estimate musical key from note events using Krumhansl-Schmuckler algorithm
   */
  public detectKey(notes: NoteEvent[]): KeyResult {
    if (notes.length === 0) {
      return {
        key: 'C',
        scale: 'major',
        confidence: 0.5,
        alternatives: [
          { key: 'A', scale: 'minor', confidence: 0.4 },
          { key: 'G', scale: 'major', confidence: 0.35 },
          { key: 'F', scale: 'major', confidence: 0.3 },
        ],
      };
    }

    // 1. Build duration-weighted pitch class profile (chromagram)
    const chromagram = new Float32Array(12);
    let totalWeight = 0;

    for (const note of notes) {
      const pc = ((Math.round(note.pitchMidi) % 12) + 12) % 12;
      const weight = note.durationSeconds * (note.confidence || 0.8);
      chromagram[pc] += weight;
      totalWeight += weight;
    }

    if (totalWeight > 0) {
      for (let i = 0; i < 12; i++) {
        chromagram[i] /= totalWeight;
      }
    }

    // 2. Correlate with all 24 key profiles
    interface ScoredKey {
      key: string;
      scale: 'major' | 'minor';
      score: number;
    }

    const scoredKeys: ScoredKey[] = [];

    for (let root = 0; root < 12; root++) {
      const keyName = NOTE_NAMES[root];

      // Shifted major profile
      const shiftedMajor = new Float32Array(12);
      for (let i = 0; i < 12; i++) {
        shiftedMajor[i] = KRUMHANSL_MAJOR[(i - root + 12) % 12];
      }
      const majorCorrelation = this.pearsonCorrelation(chromagram, shiftedMajor);
      scoredKeys.push({ key: keyName, scale: 'major', score: majorCorrelation });

      // Shifted minor profile
      const shiftedMinor = new Float32Array(12);
      for (let i = 0; i < 12; i++) {
        shiftedMinor[i] = KRUMHANSL_MINOR[(i - root + 12) % 12];
      }
      const minorCorrelation = this.pearsonCorrelation(chromagram, shiftedMinor);
      scoredKeys.push({ key: keyName, scale: 'minor', score: minorCorrelation });
    }

    // Sort descending by correlation score
    scoredKeys.sort((a, b) => b.score - a.score);

    // Normalize confidence into 0..1 range
    const bestScore = scoredKeys[0].score;
    const minScore = scoredKeys[scoredKeys.length - 1].score;
    const range = Math.max(0.001, bestScore - minScore);

    const formatConfidence = (s: number) => {
      // Map correlation typically (0.2 to 0.9) to a percentage (40% to 98%)
      const normalized = (s - minScore) / range;
      return Math.round((0.45 + normalized * 0.5) * 100) / 100;
    };

    const best = scoredKeys[0];
    const topAlternatives = scoredKeys.slice(1, 4).map((k) => ({
      key: k.key,
      scale: k.scale,
      confidence: formatConfidence(k.score),
    }));

    return {
      key: best.key,
      scale: best.scale,
      confidence: formatConfidence(best.score),
      alternatives: topAlternatives,
    };
  }

  private pearsonCorrelation(x: Float32Array, y: Float32Array): number {
    const n = x.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;
    let sumY2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += x[i];
      sumY += y[i];
      sumXY += x[i] * y[i];
      sumX2 += x[i] * x[i];
      sumY2 += y[i] * y[i];
    }

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    if (denominator === 0) return 0;
    return numerator / denominator;
  }
}
