/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GuideTimbre, HarmonyVoice, NoteEvent } from '../types/harmony';
import { midiToFrequency } from '../utils/musicTheory';

interface ActiveVoiceNodes {
  gainNode: GainNode;
  pannerNode: StereoPannerNode;
  voiceId: string;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  private voiceNodes: Map<string, ActiveVoiceNodes> = new Map();

  private isPlaying = false;
  private playbackStartTime = 0;
  private playbackOffset = 0;
  private scheduledSources: { stop: (time: number) => void }[] = [];
  private playheadRafId: number | null = null;

  private currentVoices: HarmonyVoice[] = [];
  private currentTimbre: GuideTimbre = 'vocal-synth';
  private playbackSpeed = 1.0;
  private isLooping = false;
  private loopStart = 0;
  private loopEnd = 10;
  private totalDuration = 0;

  // Microphone recording
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private micAnalyser: AnalyserNode | null = null;
  private micRafId: number | null = null;

  // Callbacks
  public onPlayhead?: (currentSeconds: number) => void;
  public onPlaybackEnd?: () => void;
  public onMicLevel?: (level: number) => void;

  public init(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master Limiter / Compressor to avoid any clipping
      this.limiter = this.ctx.createDynamicsCompressor();
      this.limiter.threshold.setValueAtTime(-1.0, this.ctx.currentTime);
      this.limiter.knee.setValueAtTime(6.0, this.ctx.currentTime);
      this.limiter.ratio.setValueAtTime(12.0, this.ctx.currentTime);
      this.limiter.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.limiter.release.setValueAtTime(0.15, this.ctx.currentTime);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);

      this.masterGain.connect(this.limiter);
      this.limiter.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setMasterVolume(volume: number): void {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(Math.max(0, Math.min(1.2, volume)), this.ctx.currentTime, 0.05);
    }
  }

  public setTimbre(timbre: GuideTimbre): void {
    this.currentTimbre = timbre;
  }

  public setPlaybackSpeed(speed: number): void {
    this.playbackSpeed = speed;
  }

  public setLoop(enabled: boolean, start: number, end: number): void {
    this.isLooping = enabled;
    this.loopStart = start;
    this.loopEnd = end;
  }

  /**
   * Preview a single note on demand (e.g. clicking piano key or pitch roll block)
   */
  public previewNote(pitchMidi: number, durationSeconds = 0.5, timbre = this.currentTimbre): void {
    const ctx = this.init();
    const now = ctx.currentTime;
    const freq = midiToFrequency(pitchMidi);

    this.playTone(ctx, this.masterGain!, freq, now, durationSeconds, 0.8, timbre, 0);
  }

  /**
   * Start playback of current voices from a given offset in seconds
   */
  public play(voices: HarmonyVoice[], startOffsetSeconds = 0): void {
    const ctx = this.init();
    this.stop(); // Stop existing

    this.currentVoices = voices;
    this.playbackOffset = startOffsetSeconds;
    this.playbackStartTime = ctx.currentTime;
    this.isPlaying = true;

    // Calculate total duration
    this.totalDuration = 0;
    for (const v of voices) {
      for (const n of v.noteEvents) {
        this.totalDuration = Math.max(this.totalDuration, n.startTimeSeconds + n.durationSeconds);
      }
    }

    // Connect voice mixer channels
    this.updateVoiceMixerNodes(voices);

    // Schedule note events for all voices
    const anySolo = voices.some((v) => v.solo);

    for (const voice of voices) {
      if (voice.muted) continue;
      if (anySolo && !voice.solo) continue;

      const nodes = this.voiceNodes.get(voice.id);
      if (!nodes) continue;

      for (const note of voice.noteEvents) {
        const noteStartOffset = note.startTimeSeconds / this.playbackSpeed;
        const noteDuration = note.durationSeconds / this.playbackSpeed;

        if (noteStartOffset + noteDuration < startOffsetSeconds) {
          continue; // Note already played
        }

        const scheduledTime = ctx.currentTime + Math.max(0, noteStartOffset - startOffsetSeconds);
        const freq = midiToFrequency(note.pitchMidi);
        const velocityGain = (note.velocity / 127) * 0.9;

        const sourceStopper = this.playTone(
          ctx,
          nodes.gainNode,
          freq,
          scheduledTime,
          noteDuration,
          velocityGain,
          this.currentTimbre,
          voice.pan
        );

        if (sourceStopper) {
          this.scheduledSources.push(sourceStopper);
        }
      }
    }

    this.startPlayheadTracker();
  }

  public pause(): number {
    const current = this.getCurrentPlaybackTime();
    this.stop();
    this.playbackOffset = current;
    return current;
  }

  public stop(): void {
    this.isPlaying = false;
    for (const s of this.scheduledSources) {
      try {
        s.stop(0);
      } catch (_e) {}
    }
    this.scheduledSources = [];

    if (this.playheadRafId) {
      cancelAnimationFrame(this.playheadRafId);
      this.playheadRafId = null;
    }
  }

  public getCurrentPlaybackTime(): number {
    if (!this.isPlaying || !this.ctx) {
      return this.playbackOffset;
    }
    const elapsed = (this.ctx.currentTime - this.playbackStartTime) * this.playbackSpeed;
    const current = this.playbackOffset + elapsed;

    if (this.isLooping && current >= this.loopEnd) {
      return this.loopStart;
    }
    return current;
  }

  public updateVoiceMixer(voices: HarmonyVoice[]): void {
    this.currentVoices = voices;
    if (!this.ctx) return;

    const anySolo = voices.some((v) => v.solo);

    for (const voice of voices) {
      const nodes = this.voiceNodes.get(voice.id);
      if (nodes) {
        const effectiveGain = voice.muted || (anySolo && !voice.solo) ? 0 : voice.gain;
        nodes.gainNode.gain.setTargetAtTime(effectiveGain, this.ctx.currentTime, 0.05);
        nodes.pannerNode.pan.setTargetAtTime(voice.pan, this.ctx.currentTime, 0.05);
      }
    }
  }

  private updateVoiceMixerNodes(voices: HarmonyVoice[]): void {
    if (!this.ctx || !this.masterGain) return;

    for (const voice of voices) {
      let nodes = this.voiceNodes.get(voice.id);
      if (!nodes) {
        const gainNode = this.ctx.createGain();
        const pannerNode = this.ctx.createStereoPanner();

        gainNode.connect(pannerNode);
        pannerNode.connect(this.masterGain);

        nodes = { gainNode, pannerNode, voiceId: voice.id };
        this.voiceNodes.set(voice.id, nodes);
      }

      nodes.gainNode.gain.setValueAtTime(voice.gain, this.ctx.currentTime);
      nodes.pannerNode.pan.setValueAtTime(voice.pan, this.ctx.currentTime);
    }
  }

  private startPlayheadTracker(): void {
    const tick = () => {
      if (!this.isPlaying || !this.ctx) return;

      const currentTime = this.getCurrentPlaybackTime();

      if (this.onPlayhead) {
        this.onPlayhead(currentTime);
      }

      // Check loop or end
      if (this.isLooping && currentTime >= this.loopEnd) {
        this.play(this.currentVoices, this.loopStart);
        return;
      }

      if (!this.isLooping && currentTime >= this.totalDuration + 0.3) {
        this.stop();
        if (this.onPlaybackEnd) {
          this.onPlaybackEnd();
        }
        return;
      }

      this.playheadRafId = requestAnimationFrame(tick);
    };

    this.playheadRafId = requestAnimationFrame(tick);
  }

  /**
   * Sound synthesis generator with multiple vocal and guide timbres
   */
  private playTone(
    ctx: AudioContext,
    destination: AudioNode,
    freq: number,
    startTime: number,
    duration: number,
    volume: number,
    timbre: GuideTimbre,
    _pan: number
  ): { stop: (time: number) => void } | null {
    if (freq <= 20 || freq >= 15000) return null;

    const noteGain = ctx.createGain();
    noteGain.connect(destination);

    // Envelope
    const attackTime = timbre === 'choir-ooh' ? 0.08 : timbre === 'rhodes' ? 0.015 : 0.04;
    const releaseTime = timbre === 'choir-ooh' ? 0.12 : 0.06;

    noteGain.gain.setValueAtTime(0.0001, startTime);
    noteGain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), startTime + attackTime);
    noteGain.gain.setValueAtTime(Math.max(0.001, volume), startTime + Math.max(attackTime, duration - releaseTime));
    noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    if (timbre === 'vocal-synth') {
      // Formant synthesis vocal "Aah" / "Ooh"
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, startTime);

      // Gentle vibrato LFO
      const vibrato = ctx.createOscillator();
      const vibratoGain = ctx.createGain();
      vibrato.frequency.setValueAtTime(5.2, startTime); // 5.2 Hz human vocal vibrato
      vibratoGain.gain.setValueAtTime(freq * 0.015, startTime); // gentle vibrato depth
      vibrato.connect(vibratoGain);
      vibratoGain.connect(osc.frequency);

      // Formant Bandpass Filters (F1 ~700Hz, F2 ~1200Hz for vocal vowel resonance)
      const formant1 = ctx.createBiquadFilter();
      formant1.type = 'bandpass';
      formant1.frequency.setValueAtTime(700, startTime);
      formant1.Q.setValueAtTime(4.0, startTime);

      const formant2 = ctx.createBiquadFilter();
      formant2.type = 'bandpass';
      formant2.frequency.setValueAtTime(1220, startTime);
      formant2.Q.setValueAtTime(4.5, startTime);

      const fMix = ctx.createGain();
      fMix.gain.setValueAtTime(1.8, startTime);

      osc.connect(formant1);
      osc.connect(formant2);
      formant1.connect(fMix);
      formant2.connect(fMix);
      fMix.connect(noteGain);

      osc.start(startTime);
      vibrato.start(startTime);
      osc.stop(startTime + duration + 0.1);
      vibrato.stop(startTime + duration + 0.1);

      return {
        stop: (t) => {
          try {
            osc.stop(t);
            vibrato.stop(t);
          } catch (_e) {}
        },
      };
    } else if (timbre === 'choir-ooh') {
      // Dual detuned choir voices
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = 'triangle';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(freq, startTime);
      osc2.frequency.setValueAtTime(freq * 1.003, startTime); // slight chorale detune

      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(1400, startTime);

      osc1.connect(lowpass);
      osc2.connect(lowpass);
      lowpass.connect(noteGain);

      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + duration + 0.15);
      osc2.stop(startTime + duration + 0.15);

      return {
        stop: (t) => {
          try {
            osc1.stop(t);
            osc2.stop(t);
          } catch (_e) {}
        },
      };
    } else if (timbre === 'rhodes') {
      // Electric piano tine sound
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      const overtone = ctx.createOscillator();
      overtone.type = 'sine';
      overtone.frequency.setValueAtTime(freq * 3, startTime);
      const overtoneGain = ctx.createGain();
      overtoneGain.gain.setValueAtTime(volume * 0.25, startTime);
      overtoneGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);

      overtone.connect(overtoneGain);
      overtoneGain.connect(noteGain);
      osc.connect(noteGain);

      osc.start(startTime);
      overtone.start(startTime);
      osc.stop(startTime + duration + 0.05);
      overtone.stop(startTime + duration + 0.05);

      return {
        stop: (t) => {
          try {
            osc.stop(t);
            overtone.stop(t);
          } catch (_e) {}
        },
      };
    } else {
      // Acoustic guide clean tone
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2200, startTime);

      osc.connect(filter);
      filter.connect(noteGain);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.05);

      return {
        stop: (t) => {
          try {
            osc.stop(t);
          } catch (_e) {}
        },
      };
    }
  }

  // --- Microphone Live Recording ---
  public async startMicrophoneRecording(deviceId?: string): Promise<void> {
    const constraints: MediaStreamConstraints = {
      audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      video: false,
    };

    this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    this.recordedChunks = [];

    const audioCtx = this.init();
    const micSource = audioCtx.createMediaStreamSource(this.mediaStream);
    this.micAnalyser = audioCtx.createAnalyser();
    this.micAnalyser.fftSize = 256;
    micSource.connect(this.micAnalyser);

    // Audio level meter loop
    const levelBuffer = new Uint8Array(this.micAnalyser.frequencyBinCount);
    const updateMicLevel = () => {
      if (!this.micAnalyser) return;
      this.micAnalyser.getByteFrequencyData(levelBuffer);
      let sum = 0;
      for (let i = 0; i < levelBuffer.length; i++) {
        sum += levelBuffer[i];
      }
      const avg = sum / levelBuffer.length / 255;
      if (this.onMicLevel) {
        this.onMicLevel(avg);
      }
      this.micRafId = requestAnimationFrame(updateMicLevel);
    };
    this.micRafId = requestAnimationFrame(updateMicLevel);

    // MediaRecorder
    this.mediaRecorder = new MediaRecorder(this.mediaStream);
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.recordedChunks.push(e.data);
      }
    };
    this.mediaRecorder.start(100);
  }

  public async stopMicrophoneRecording(): Promise<{ blob: Blob; url: string; duration: number }> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        resolve({ blob: new Blob(), url: '', duration: 0 });
        return;
      }

      if (this.micRafId) {
        cancelAnimationFrame(this.micRafId);
        this.micRafId = null;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);

        if (this.mediaStream) {
          this.mediaStream.getTracks().forEach((t) => t.stop());
          this.mediaStream = null;
        }

        resolve({ blob, url, duration: 0 });
      };

      this.mediaRecorder.stop();
    });
  }
}

export const globalAudioEngine = new AudioEngine();
