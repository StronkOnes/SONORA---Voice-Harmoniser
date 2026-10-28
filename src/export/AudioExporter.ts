/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GuideTimbre, HarmonyVoice } from '../types/harmony';
import { midiToFrequency } from '../utils/musicTheory';

export class AudioExporter {
  /**
   * Render all active voices into a high-fidelity 44.1kHz Stereo WAV Blob
   */
  public static async exportMixdownWav(
    voices: HarmonyVoice[],
    timbre: GuideTimbre = 'vocal-synth'
  ): Promise<Blob> {
    let totalDuration = 2.0;
    for (const v of voices) {
      for (const n of v.noteEvents) {
        totalDuration = Math.max(totalDuration, n.startTimeSeconds + n.durationSeconds);
      }
    }
    totalDuration += 0.5; // tail

    const sampleRate = 44100;
    const offlineCtx = new OfflineAudioContext(2, Math.ceil(totalDuration * sampleRate), sampleRate);

    const masterGain = offlineCtx.createGain();
    masterGain.gain.setValueAtTime(0.85, 0);

    const limiter = offlineCtx.createDynamicsCompressor();
    masterGain.connect(limiter);
    limiter.connect(offlineCtx.destination);

    const anySolo = voices.some((v) => v.solo);

    for (const voice of voices) {
      if (voice.muted) continue;
      if (anySolo && !voice.solo) continue;

      const voiceGain = offlineCtx.createGain();
      const panner = offlineCtx.createStereoPanner();
      voiceGain.gain.setValueAtTime(voice.gain, 0);
      panner.pan.setValueAtTime(voice.pan, 0);

      voiceGain.connect(panner);
      panner.connect(masterGain);

      for (const note of voice.noteEvents) {
        this.scheduleOfflineTone(
          offlineCtx,
          voiceGain,
          midiToFrequency(note.pitchMidi),
          note.startTimeSeconds,
          note.durationSeconds,
          (note.velocity / 127) * 0.9,
          timbre
        );
      }
    }

    const renderedBuffer = await offlineCtx.startRendering();
    return this.audioBufferToWavBlob(renderedBuffer);
  }

  /**
   * Render a single voice stem into a standalone WAV file matching arrangement timeline
   */
  public static async exportStemWav(
    voice: HarmonyVoice,
    timbre: GuideTimbre = 'vocal-synth',
    totalDuration: number
  ): Promise<Blob> {
    const renderDuration = Math.max(totalDuration + 0.5, 2.0);
    const sampleRate = 44100;
    const offlineCtx = new OfflineAudioContext(2, Math.ceil(renderDuration * sampleRate), sampleRate);

    const voiceGain = offlineCtx.createGain();
    voiceGain.gain.setValueAtTime(0.9, 0);
    voiceGain.connect(offlineCtx.destination);

    for (const note of voice.noteEvents) {
      this.scheduleOfflineTone(
        offlineCtx,
        voiceGain,
        midiToFrequency(note.pitchMidi),
        note.startTimeSeconds,
        note.durationSeconds,
        (note.velocity / 127) * 0.9,
        timbre
      );
    }

    const renderedBuffer = await offlineCtx.startRendering();
    return this.audioBufferToWavBlob(renderedBuffer);
  }

  private static scheduleOfflineTone(
    ctx: OfflineAudioContext,
    dest: AudioNode,
    freq: number,
    start: number,
    duration: number,
    vol: number,
    timbre: GuideTimbre
  ): void {
    if (freq <= 20 || freq > 15000) return;

    const gain = ctx.createGain();
    gain.connect(dest);

    const attack = timbre === 'choir-ooh' ? 0.08 : 0.03;
    const release = 0.06;

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, vol), start + attack);
    gain.gain.setValueAtTime(Math.max(0.001, vol), start + Math.max(attack, duration - release));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    const osc = ctx.createOscillator();
    osc.type = timbre === 'choir-ooh' ? 'triangle' : 'sawtooth';
    osc.frequency.setValueAtTime(freq, start);

    if (timbre === 'vocal-synth') {
      const f1 = ctx.createBiquadFilter();
      f1.type = 'bandpass';
      f1.frequency.setValueAtTime(700, start);
      f1.Q.setValueAtTime(4.0, start);

      const f2 = ctx.createBiquadFilter();
      f2.type = 'bandpass';
      f2.frequency.setValueAtTime(1220, start);
      f2.Q.setValueAtTime(4.5, start);

      const fMix = ctx.createGain();
      fMix.gain.setValueAtTime(1.8, start);

      osc.connect(f1);
      osc.connect(f2);
      f1.connect(fMix);
      f2.connect(fMix);
      fMix.connect(gain);
    } else {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1600, start);
      osc.connect(filter);
      filter.connect(gain);
    }

    osc.start(start);
    osc.stop(start + duration + 0.1);
  }

  /**
   * Convert AudioBuffer to 16-bit PCM Stereo WAV Blob
   */
  public static audioBufferToWavBlob(buffer: AudioBuffer): Blob {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    const numSamples = buffer.length;
    const dataSize = numSamples * blockAlign;
    const headerSize = 44;
    const totalSize = headerSize + dataSize;

    const arrayBuffer = new ArrayBuffer(totalSize);
    const view = new DataView(arrayBuffer);

    // Write RIFF chunk descriptor
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');

    // Write 'fmt ' chunk
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true); // ByteRate
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);

    // Write 'data' chunk
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    // Write interleaved samples
    const left = buffer.getChannelData(0);
    const right = numChannels > 1 ? buffer.getChannelData(1) : left;

    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
      // Left channel
      let s = Math.max(-1, Math.min(1, left[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;

      // Right channel
      if (numChannels > 1) {
        s = Math.max(-1, Math.min(1, right[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  public static downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
