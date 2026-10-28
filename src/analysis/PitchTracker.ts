/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NoteEvent } from '../types/harmony';
import { frequencyToMidi } from '../utils/musicTheory';

interface PitchFrame {
  time: number;
  freq: number;
  midi: number;
  confidence: number;
  rms: number;
  isVoiced: boolean;
}

/**
 * High-accuracy Normalized Square Difference Function (NSDF) / Autocorrelation
 * pitch detection for singing and humming monophonic vocals.
 */
export class PitchTracker {
  private minFreq = 65;   // ~C2 (low male vocal)
  private maxFreq = 1050; // ~C6 (high soprano)

  /**
   * Analyze an AudioBuffer and extract pitch contour + segmented musical notes
   */
  public analyzeAudioBuffer(
    audioBuffer: AudioBuffer,
    onProgress?: (percent: number) => void
  ): { notes: NoteEvent[]; frames: PitchFrame[] } {
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const windowSize = 2048;
    const hopSize = 512; // ~11ms at 44.1kHz
    const totalFrames = Math.floor((channelData.length - windowSize) / hopSize);

    const minPeriod = Math.floor(sampleRate / this.maxFreq);
    const maxPeriod = Math.floor(sampleRate / this.minFreq);

    const frames: PitchFrame[] = [];

    // Calculate background RMS to determine noise floor
    let sumRms = 0;
    const frameBuffer = new Float32Array(windowSize);

    for (let f = 0; f < totalFrames; f++) {
      if (f % 50 === 0 && onProgress) {
        onProgress(Math.round((f / totalFrames) * 70));
      }

      const offset = f * hopSize;
      let frameSumSquares = 0;
      for (let i = 0; i < windowSize; i++) {
        const val = channelData[offset + i] || 0;
        frameBuffer[i] = val;
        frameSumSquares += val * val;
      }

      const rms = Math.sqrt(frameSumSquares / windowSize);
      sumRms += rms;

      const time = offset / sampleRate;

      // Voicing threshold
      if (rms < 0.012) {
        frames.push({
          time,
          freq: 0,
          midi: 0,
          confidence: 0,
          rms,
          isVoiced: false,
        });
        continue;
      }

      // Autocorrelation / NSDF
      const pitchResult = this.estimatePitchNSDF(frameBuffer, sampleRate, minPeriod, maxPeriod);

      if (pitchResult.confidence >= 0.45 && pitchResult.freq >= this.minFreq && pitchResult.freq <= this.maxFreq) {
        const midi = frequencyToMidi(pitchResult.freq);
        frames.push({
          time,
          freq: pitchResult.freq,
          midi,
          confidence: pitchResult.confidence,
          rms,
          isVoiced: true,
        });
      } else {
        frames.push({
          time,
          freq: 0,
          midi: 0,
          confidence: pitchResult.confidence,
          rms,
          isVoiced: false,
        });
      }
    }

    if (onProgress) onProgress(80);

    // Median filter to remove octave leaps and transient spikes
    this.medianFilterFrames(frames, 3);

    if (onProgress) onProgress(90);

    // Segment pitch frames into discrete NoteEvents
    const notes = this.segmentFramesToNotes(frames, sampleRate);

    if (onProgress) onProgress(100);

    return { notes, frames };
  }

  /**
   * Normalized Square Difference Function for fundamental frequency estimation
   */
  private estimatePitchNSDF(
    buffer: Float32Array,
    sampleRate: number,
    minPeriod: number,
    maxPeriod: number
  ): { freq: number; confidence: number } {
    const size = buffer.length;
    const nsdf = new Float32Array(maxPeriod + 1);

    for (let tau = minPeriod; tau <= maxPeriod; tau++) {
      let acf = 0;
      let m = 0;
      for (let i = 0; i < size - tau; i++) {
        acf += buffer[i] * buffer[i + tau];
        m += buffer[i] * buffer[i] + buffer[i + tau] * buffer[i + tau];
      }
      nsdf[tau] = m > 0 ? (2 * acf) / m : 0;
    }

    // Find first significant peak
    let maxVal = -1;
    let maxTau = -1;
    const threshold = 0.5;

    for (let tau = minPeriod + 1; tau < maxPeriod - 1; tau++) {
      if (nsdf[tau] > nsdf[tau - 1] && nsdf[tau] >= nsdf[tau + 1] && nsdf[tau] > threshold) {
        if (nsdf[tau] > maxVal) {
          maxVal = nsdf[tau];
          maxTau = tau;
        }
      }
    }

    if (maxTau === -1 || maxVal <= 0.3) {
      return { freq: 0, confidence: 0 };
    }

    // Parabolic interpolation for sub-sample accuracy
    const alpha = nsdf[maxTau - 1];
    const beta = nsdf[maxTau];
    const gamma = nsdf[maxTau + 1];
    const denom = 2 * (alpha - 2 * beta + gamma);
    const delta = denom !== 0 ? (alpha - gamma) / denom : 0;
    const refinedPeriod = maxTau + delta;

    const freq = sampleRate / refinedPeriod;
    const confidence = Math.min(1, Math.max(0, maxVal));

    return { freq, confidence };
  }

  /**
   * Running median filter on pitch values
   */
  private medianFilterFrames(frames: PitchFrame[], windowRadius: number): void {
    const len = frames.length;
    for (let i = windowRadius; i < len - windowRadius; i++) {
      if (!frames[i].isVoiced) continue;

      const windowMidi: number[] = [];
      for (let w = -windowRadius; w <= windowRadius; w++) {
        if (frames[i + w].isVoiced) {
          windowMidi.push(frames[i + w].midi);
        }
      }

      if (windowMidi.length >= 3) {
        windowMidi.sort((a, b) => a - b);
        const median = windowMidi[Math.floor(windowMidi.length / 2)];
        // If current frame deviates strongly from median (octave jump), smooth to median
        if (Math.abs(frames[i].midi - median) > 2.0) {
          frames[i].midi = median;
        }
      }
    }
  }

  /**
   * Segment contiguous voiced frames with stable pitch into discrete musical notes
   */
  private segmentFramesToNotes(frames: PitchFrame[], _sampleRate: number): NoteEvent[] {
    const notes: NoteEvent[] = [];
    const minNoteDurationSeconds = 0.08; // Ignore noise clicks under 80ms
    const maxPitchVariance = 1.25; // semitones within same note

    let currentStart = -1;
    let currentMidis: number[] = [];
    let currentConfidences: number[] = [];
    let currentRms: number[] = [];

    const flushCurrentNote = (endTime: number) => {
      if (currentStart >= 0 && currentMidis.length > 0) {
        const duration = endTime - currentStart;
        if (duration >= minNoteDurationSeconds) {
          // Weighted average pitch
          let totalWeight = 0;
          let weightedSum = 0;
          let totalRms = 0;
          for (let k = 0; k < currentMidis.length; k++) {
            const weight = currentConfidences[k];
            weightedSum += currentMidis[k] * weight;
            totalWeight += weight;
            totalRms += currentRms[k];
          }

          const avgMidi = totalWeight > 0 ? weightedSum / totalWeight : currentMidis[0];
          const avgConfidence = currentConfidences.reduce((a, b) => a + b, 0) / currentConfidences.length;
          const avgRms = totalRms / currentRms.length;

          // Velocity derived from RMS
          const velocity = Math.min(127, Math.max(40, Math.round(avgRms * 400 + 45)));

          notes.push({
            id: 'lead-' + Math.random().toString(36).substring(2, 9),
            pitchMidi: Math.round(avgMidi),
            startTimeSeconds: Math.round(currentStart * 100) / 100,
            durationSeconds: Math.round(duration * 100) / 100,
            velocity,
            confidence: Math.round(avgConfidence * 100) / 100,
            source: 'detected',
            editedByUser: false,
          });
        }
      }

      currentStart = -1;
      currentMidis = [];
      currentConfidences = [];
      currentRms = [];
    };

    for (let i = 0; i < frames.length; i++) {
      const f = frames[i];

      if (!f.isVoiced) {
        if (currentStart >= 0) {
          flushCurrentNote(f.time);
        }
        continue;
      }

      if (currentStart < 0) {
        // Start a new note
        currentStart = f.time;
        currentMidis.push(f.midi);
        currentConfidences.push(f.confidence);
        currentRms.push(f.rms);
      } else {
        // Check if pitch changed significantly (new note onset)
        const recentAvg = currentMidis.slice(-4).reduce((a, b) => a + b, 0) / Math.min(4, currentMidis.length);
        if (Math.abs(f.midi - recentAvg) > maxPitchVariance) {
          // Pitch changed to a new note
          flushCurrentNote(f.time);
          currentStart = f.time;
        }
        currentMidis.push(f.midi);
        currentConfidences.push(f.confidence);
        currentRms.push(f.rms);
      }
    }

    if (currentStart >= 0 && frames.length > 0) {
      flushCurrentNote(frames[frames.length - 1].time + 0.1);
    }

    // Merge notes with tiny gaps (< 0.06s) and identical pitch
    const mergedNotes: NoteEvent[] = [];
    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];
      if (mergedNotes.length > 0) {
        const prev = mergedNotes[mergedNotes.length - 1];
        const gap = note.startTimeSeconds - (prev.startTimeSeconds + prev.durationSeconds);
        if (gap >= 0 && gap < 0.07 && Math.abs(prev.pitchMidi - note.pitchMidi) <= 0) {
          // Merge
          prev.durationSeconds = Math.round((prev.durationSeconds + gap + note.durationSeconds) * 100) / 100;
          continue;
        }
      }
      mergedNotes.push(note);
    }

    return mergedNotes;
  }
}
