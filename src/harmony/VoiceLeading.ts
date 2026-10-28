/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HarmonyVoice, NoteEvent } from '../types/harmony';
import { VOCAL_RANGES } from '../utils/musicTheory';

export class VoiceLeading {
  /**
   * Clamp a candidate MIDI pitch into the voice's designated range.
   * If out of range, shifts by octaves (+12 or -12) to fit comfortably.
   */
  public static fitPitchToRange(pitchMidi: number, minMidi: number, maxMidi: number): number {
    let p = pitchMidi;
    while (p < minMidi) {
      p += 12;
    }
    while (p > maxMidi) {
      p -= 12;
    }
    return p;
  }

  /**
   * Assign standard default vocal ranges for voice roles
   */
  public static getDefaultRangeForRole(role: string): { min: number; max: number } {
    switch (role) {
      case 'soprano':
      case 'harmony-high':
        return { min: VOCAL_RANGES.soprano.min, max: VOCAL_RANGES.soprano.max };
      case 'alto':
      case 'harmony-mid':
        return { min: VOCAL_RANGES.alto.min, max: VOCAL_RANGES.alto.max };
      case 'tenor':
      case 'counter-melody':
        return { min: VOCAL_RANGES.tenor.min, max: VOCAL_RANGES.tenor.max };
      case 'bass':
      case 'pedal-tone':
        return { min: VOCAL_RANGES.bass.min, max: VOCAL_RANGES.bass.max };
      default:
        return { min: 45, max: 80 };
    }
  }

  /**
   * Evaluate voice leading smoothness score between successive notes (penalizes huge leaps > 7 semitones)
   */
  public static evaluateSmoothness(notes: NoteEvent[]): number {
    if (notes.length <= 1) return 100;
    let penalty = 0;
    for (let i = 1; i < notes.length; i++) {
      const leap = Math.abs(notes[i].pitchMidi - notes[i - 1].pitchMidi);
      if (leap > 12) {
        penalty += 25;
      } else if (leap > 7) {
        penalty += 10;
      } else if (leap > 4) {
        penalty += 3;
      }
    }
    return Math.max(10, Math.min(100, 100 - (penalty / notes.length) * 8));
  }

  /**
   * Assign intervals from lead note to each harmony note at matching time positions
   */
  public static computeIntervalsFromLead(leadNotes: NoteEvent[], harmonyVoices: HarmonyVoice[]): void {
    for (const voice of harmonyVoices) {
      if (voice.isLead) continue;

      for (const hNote of voice.noteEvents) {
        // Find overlapping lead note
        const leadOverlapping = leadNotes.find(
          (l) =>
            Math.max(l.startTimeSeconds, hNote.startTimeSeconds) <
            Math.min(l.startTimeSeconds + l.durationSeconds, hNote.startTimeSeconds + hNote.durationSeconds)
        );

        if (leadOverlapping) {
          hNote.intervalFromLead = hNote.pitchMidi - leadOverlapping.pitchMidi;
        } else {
          hNote.intervalFromLead = 0;
        }
      }
    }
  }
}
