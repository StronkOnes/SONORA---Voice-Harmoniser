/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { DEMO_MELODIES, DemoMelody } from '../../data/demoProjects';
import { NoteEvent } from '../../types/harmony';
import { PitchTracker } from '../../analysis/PitchTracker';
import { KeyDetector, KeyResult } from '../../analysis/KeyDetector';
import { globalAudioEngine } from '../../audio/AudioEngine';
import {
  Mic,
  Upload,
  Music,
  X,
  Play,
  Square,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  FileAudio,
} from 'lucide-react';

interface ProjectSetupModalProps {
  onClose: () => void;
  onMelodyReady: (
    title: string,
    notes: NoteEvent[],
    detectedKey: KeyResult,
    originalAudioUrl?: string
  ) => void;
}

export const ProjectSetupModal: React.FC<ProjectSetupModalProps> = ({ onClose, onMelodyReady }) => {
  const [activeTab, setActiveTab] = useState<'demos' | 'record' | 'upload'>('demos');

  // Demo selection
  const [selectedDemo, setSelectedDemo] = useState<DemoMelody>(DEMO_MELODIES[0]);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [micCountDown, setMicCountDown] = useState<number | null>(null);
  const [micLevel, setMicLevel] = useState(0);
  const [recordedAudio, setRecordedAudio] = useState<{ blob: Blob; url: string } | null>(null);
  const [isPlayingRecorded, setIsPlayingRecorded] = useState(false);

  // File upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Live recording start
  const handleStartRecord = async () => {
    try {
      setAnalysisError(null);
      setMicCountDown(3);
      const timer = setInterval(() => {
        setMicCountDown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            startMicCapture();
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (e: any) {
      setAnalysisError(e.message || 'Microphone error');
    }
  };

  const startMicCapture = async () => {
    try {
      setIsRecording(true);
      globalAudioEngine.onMicLevel = (lvl) => setMicLevel(lvl);
      await globalAudioEngine.startMicrophoneRecording();
    } catch (err: any) {
      setIsRecording(false);
      setAnalysisError('Microphone permission denied. Please allow microphone access in your browser.');
    }
  };

  const handleStopRecord = async () => {
    setIsRecording(false);
    globalAudioEngine.onMicLevel = undefined;
    const res = await globalAudioEngine.stopMicrophoneRecording();
    if (res.blob.size > 0) {
      setRecordedAudio({ blob: res.blob, url: res.url });
    }
  };

  const handleTogglePlayRecorded = () => {
    if (!recordedAudio) return;
    const audio = new Audio(recordedAudio.url);
    setIsPlayingRecorded(true);
    audio.play();
    audio.onended = () => setIsPlayingRecorded(false);
  };

  // Analyze recorded or uploaded audio
  const handleAnalyzeAudio = async (blob: Blob, title: string, audioUrl?: string) => {
    try {
      setIsAnalyzing(true);
      setAnalysisProgress(10);
      setAnalysisError(null);

      const arrayBuffer = await blob.arrayBuffer();
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const tempCtx = new AudioCtx();
      setAnalysisProgress(25);

      const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer);
      setAnalysisProgress(40);

      // Run Pitch Tracker
      const tracker = new PitchTracker();
      const { notes } = tracker.analyzeAudioBuffer(audioBuffer, (p) => {
        setAnalysisProgress(40 + Math.round(p * 0.45));
      });

      if (notes.length === 0) {
        setAnalysisError(
          'No clear vocal pitch was detected. Try singing closer to the microphone or with stronger tone, then try again.'
        );
        setIsAnalyzing(false);
        return;
      }

      setAnalysisProgress(90);

      // Run Key Detector
      const keyDetector = new KeyDetector();
      const keyResult = keyDetector.detectKey(notes);

      setAnalysisProgress(100);
      setIsAnalyzing(false);

      onMelodyReady(title, notes, keyResult, audioUrl);
      onClose();
    } catch (err: any) {
      console.error(err);
      setAnalysisError('Audio decoding failed. Please ensure the file is an uncorrupted WAV or MP3 recording.');
      setIsAnalyzing(false);
    }
  };

  // File upload handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      const url = URL.createObjectURL(file);
      handleAnalyzeAudio(file, file.name.replace(/\.[^/.]+$/, ''), url);
    }
  };

  // Select demo handler
  const handleLoadDemo = () => {
    const keyDetector = new KeyDetector();
    const keyResult = keyDetector.detectKey(selectedDemo.notes);
    onMelodyReady(selectedDemo.title, selectedDemo.notes, keyResult);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Choose Your Melody Entry Point</h2>
              <p className="text-xs text-neutral-400">
                Upload singing, record live humming via microphone, or choose a curated vocal hook.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-neutral-800 bg-neutral-950/40 px-6 pt-2 gap-2 text-xs font-medium">
          <button
            onClick={() => setActiveTab('demos')}
            className={`flex items-center gap-2 pb-3 px-3 border-b-2 transition-colors ${
              activeTab === 'demos'
                ? 'border-amber-400 text-amber-300 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Curated Vocal Hooks (Instant)</span>
          </button>

          <button
            onClick={() => setActiveTab('record')}
            className={`flex items-center gap-2 pb-3 px-3 border-b-2 transition-colors ${
              activeTab === 'record'
                ? 'border-amber-400 text-amber-300 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Record Singing / Humming</span>
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 pb-3 px-3 border-b-2 transition-colors ${
              activeTab === 'upload'
                ? 'border-amber-400 text-amber-300 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Audio File</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {analysisError && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/60 text-xs text-rose-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{analysisError}</span>
            </div>
          )}

          {isAnalyzing && (
            <div className="p-8 text-center space-y-3 bg-neutral-950/70 border border-neutral-800 rounded-xl">
              <div className="text-sm font-bold text-amber-400">Analysing Monophonic Vocal Melody...</div>
              <p className="text-xs text-neutral-400">
                Running fundamental pitch tracking (F0 autocorrelation), note onset segmentation, and key detection.
              </p>
              <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden max-w-md mx-auto">
                <div
                  className="bg-amber-400 h-full rounded-full transition-all duration-150"
                  style={{ width: `${analysisProgress}%` }}
                />
              </div>
              <div className="text-[11px] font-mono text-neutral-500">{analysisProgress}% complete</div>
            </div>
          )}

          {/* TAB 1: Curated Demo Hooks */}
          {activeTab === 'demos' && !isAnalyzing && (
            <div className="space-y-3">
              <p className="text-xs text-neutral-400">
                Select an authentic melody to audition 2, 4, 6 or 8-part harmonies across genres immediately:
              </p>

              <div className="grid grid-cols-1 gap-2.5">
                {DEMO_MELODIES.map((demo) => {
                  const isSelected = selectedDemo.id === demo.id;
                  return (
                    <div
                      key={demo.id}
                      onClick={() => setSelectedDemo(demo)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-neutral-800 border-amber-400 text-white shadow-sm ring-1 ring-amber-400/30'
                          : 'bg-neutral-900/60 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">{demo.title}</span>
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-neutral-800 text-amber-400">
                            {demo.genre}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400">{demo.description}</p>
                        <div className="flex items-center gap-3 text-[11px] text-neutral-500 font-mono">
                          <span>Key: {demo.key} {demo.scale}</span>
                          <span>·</span>
                          <span>Tempo: {demo.tempo} BPM</span>
                          <span>·</span>
                          <span>{demo.notes.length} notes</span>
                        </div>
                      </div>

                      {isSelected ? (
                        <div className="w-6 h-6 rounded-full bg-amber-400 text-neutral-950 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-4 h-4 fill-current" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border border-neutral-700 shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: Live Recording */}
          {activeTab === 'record' && !isAnalyzing && (
            <div className="space-y-4 text-center py-4">
              {micCountDown !== null ? (
                <div className="py-6">
                  <div className="text-6xl font-black text-amber-400 animate-pulse font-mono">{micCountDown}</div>
                  <p className="text-xs text-neutral-400 mt-2">Get ready to hum or sing your melody...</p>
                </div>
              ) : isRecording ? (
                <div className="space-y-4 max-w-sm mx-auto">
                  <div className="flex items-center justify-center gap-2 text-rose-500 font-bold text-sm">
                    <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                    <span>RECORDING VOCAL MELODY...</span>
                  </div>

                  {/* Level Meter */}
                  <div className="w-full bg-neutral-950 rounded-full h-3 p-0.5 border border-neutral-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 rounded-full transition-all duration-75"
                      style={{ width: `${Math.min(100, micLevel * 250)}%` }}
                    />
                  </div>

                  <button
                    onClick={handleStopRecord}
                    className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <Square className="w-4 h-4 fill-current" />
                    <span>Stop Recording</span>
                  </button>
                </div>
              ) : recordedAudio ? (
                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-4 max-w-md mx-auto">
                  <div className="flex items-center justify-between text-xs text-neutral-300">
                    <span className="flex items-center gap-2">
                      <FileAudio className="w-4 h-4 text-amber-400" />
                      <span>Recorded Melody Captured</span>
                    </span>
                    <button
                      onClick={handleTogglePlayRecorded}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>{isPlayingRecorded ? 'Playing...' : 'Play Take'}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleStartRecord}
                      className="flex-1 py-2 text-xs font-medium text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 rounded-xl"
                    >
                      Retake
                    </button>
                    <button
                      onClick={() => handleAnalyzeAudio(recordedAudio.blob, 'My Sung Melody', recordedAudio.url)}
                      className="flex-1 py-2 text-xs font-bold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-md"
                    >
                      Analyse & Harmonise
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <button
                    onClick={handleStartRecord}
                    className="py-3 px-8 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-neutral-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2.5 mx-auto"
                  >
                    <Mic className="w-4 h-4" />
                    <span>Start Microphone Recording</span>
                  </button>
                  <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                    Sing or hum a single clean line. The analysis engine will extract note pitches, durations, and key.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: File Upload */}
          {activeTab === 'upload' && !isAnalyzing && (
            <div className="space-y-4 text-center py-6">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/wav,audio/mp3,audio/mpeg,audio/ogg"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-neutral-700 hover:border-amber-400/80 rounded-2xl p-8 cursor-pointer transition-colors space-y-3 bg-neutral-950/40"
              >
                <div className="w-12 h-12 rounded-xl bg-neutral-800 flex items-center justify-center mx-auto text-amber-400">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-sm font-bold text-white block">Click to upload singing or humming audio</span>
                  <span className="text-xs text-neutral-500 block mt-1">Supports WAV or MP3 files (monophonic vocal)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {activeTab === 'demos' && !isAnalyzing && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-800 bg-neutral-950/70">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleLoadDemo}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-neutral-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl shadow-md transition-all"
            >
              <span>Load Melody & Harmonise</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
