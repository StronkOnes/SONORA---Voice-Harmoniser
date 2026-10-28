/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { HarmonyVoice, NoteEvent, RecordedTake } from '../../types/harmony';
import { globalAudioEngine } from '../../audio/AudioEngine';
import { midiToNoteName } from '../../utils/musicTheory';
import {
  Mic,
  Square,
  Play,
  Pause,
  Repeat,
  Volume2,
  Trash2,
  CheckCircle2,
  Layers,
  Sparkles,
  Headphones,
} from 'lucide-react';

interface PracticeModeProps {
  voices: HarmonyVoice[];
  recordedTakes: RecordedTake[];
  onUpdateTakes: (takes: RecordedTake[]) => void;
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
  currentTime: number;
  onSeek: (seconds: number) => void;
  totalDuration: number;
}

export const PracticeMode: React.FC<PracticeModeProps> = ({
  voices,
  recordedTakes,
  onUpdateTakes,
  playbackSpeed,
  onSpeedChange,
  currentTime,
  onSeek,
  totalDuration,
}) => {
  // Currently selected voice part to practice
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(
    voices.find((v) => !v.isLead)?.id || voices[0]?.id || ''
  );

  // Practice audio balance: 'isolated' (only part), 'boosted' (part loud, lead quiet), 'full-mix'
  const [balanceMode, setBalanceMode] = useState<'isolated' | 'boosted' | 'full-mix'>('boosted');

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [countDown, setCountDown] = useState<number | null>(null);
  const [micLevel, setMicLevel] = useState(0);
  const [isPlayingBack, setIsPlayingBack] = useState(false);

  // Active playing take preview
  const [activeTakeAudio, setActiveTakeAudio] = useState<HTMLAudioElement | null>(null);

  const activeVoice = voices.find((v) => v.id === selectedVoiceId) || voices[0];

  // Configure guide voice levels based on balance mode
  useEffect(() => {
    if (!activeVoice) return;

    const modifiedVoices = voices.map((v) => {
      if (v.id === activeVoice.id) {
        return { ...v, gain: 1.0, solo: balanceMode === 'isolated', muted: false };
      }
      if (v.isLead) {
        return {
          ...v,
          gain: balanceMode === 'isolated' ? 0 : 0.45,
          solo: false,
          muted: balanceMode === 'isolated',
        };
      }
      // Other harmony parts
      return {
        ...v,
        gain: balanceMode === 'full-mix' ? 0.6 : 0,
        solo: false,
        muted: balanceMode !== 'full-mix',
      };
    });

    globalAudioEngine.updateVoiceMixer(modifiedVoices);
  }, [balanceMode, activeVoice, voices]);

  // Mic level listener
  useEffect(() => {
    globalAudioEngine.onMicLevel = (lvl) => {
      setMicLevel(lvl);
    };
    return () => {
      globalAudioEngine.onMicLevel = undefined;
    };
  }, []);

  const handleStartCountIn = async () => {
    try {
      setCountDown(3);
      const timer = setInterval(() => {
        setCountDown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            startLiveRecording();
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const startLiveRecording = async () => {
    try {
      setIsRecording(true);
      await globalAudioEngine.startMicrophoneRecording();

      // Start backing arrangement playback synchronized from 0
      globalAudioEngine.play(voices, 0);
      setIsPlayingBack(true);
    } catch (err) {
      setIsRecording(false);
      alert('Microphone access is required to record your vocal take.');
    }
  };

  const handleStopRecording = async () => {
    setIsRecording(false);
    setIsPlayingBack(false);
    globalAudioEngine.stop();

    const { blob, url } = await globalAudioEngine.stopMicrophoneRecording();

    if (blob.size > 0 && activeVoice) {
      const newTake: RecordedTake = {
        id: 'take-' + Date.now().toString(36),
        voiceId: activeVoice.id,
        voiceName: activeVoice.name,
        audioBlob: blob,
        audioBlobUrl: url,
        durationSeconds: totalDuration,
        recordedAt: Date.now(),
        muted: false,
        gain: 1.0,
      };

      onUpdateTakes([newTake, ...recordedTakes]);
    }
  };

  const playRecordedTake = (take: RecordedTake) => {
    if (activeTakeAudio) {
      activeTakeAudio.pause();
    }
    const audio = new Audio(take.audioBlobUrl);
    setActiveTakeAudio(audio);
    audio.play();
  };

  const deleteTake = (takeId: string) => {
    onUpdateTakes(recordedTakes.filter((t) => t.id !== takeId));
  };

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 bg-neutral-950 p-6 overflow-y-auto">
      <div className="max-w-5xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Headphones className="w-5 h-5 text-amber-400" />
              <span>Singer Practice & Take Studio</span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Rehearse individual vocal lines, loop challenging phrases, and record real vocal takes over the arrangement.
            </p>
          </div>

          {/* Rehearsal Speed */}
          <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-lg text-xs">
            <span className="text-neutral-400">Rehearsal Speed:</span>
            {[0.75, 0.85, 1.0].map((spd) => (
              <button
                key={spd}
                onClick={() => onSpeedChange(spd)}
                className={`px-2 py-0.5 rounded font-mono ${
                  playbackSpeed === spd
                    ? 'bg-amber-400 text-neutral-950 font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        {/* Part Selection & Practice Balance Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Box 1: Select Part to Learn */}
          <div className="p-4 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-3">
            <label className="text-xs font-semibold text-neutral-300 block">
              1. Select Harmony Voice to Rehearse:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {voices.map((v) => {
                const isSelected = v.id === selectedVoiceId;
                return (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVoiceId(v.id)}
                    className={`p-2.5 rounded-lg border text-left transition-all flex items-center gap-2.5 ${
                      isSelected
                        ? 'bg-neutral-800 border-amber-400 text-white shadow-sm ring-1 ring-amber-400/30'
                        : 'bg-neutral-950/70 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: v.color }} />
                    <div className="truncate">
                      <div className="text-xs font-bold leading-tight truncate">{v.name.split(' ')[0]}</div>
                      <div className="text-[10px] text-neutral-500 uppercase">{v.role}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Box 2: Rehearsal Guide Mix */}
          <div className="p-4 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-3">
            <label className="text-xs font-semibold text-neutral-300 block">
              2. Guide Audio Monitor Balance:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setBalanceMode('boosted')}
                className={`p-2.5 rounded-lg border text-center transition-all ${
                  balanceMode === 'boosted'
                    ? 'bg-amber-400 text-neutral-950 font-bold border-amber-300'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                <div className="text-xs">Guide Boost</div>
                <div className="text-[10px] opacity-80 mt-0.5">Part +6dB, soft lead</div>
              </button>

              <button
                onClick={() => setBalanceMode('isolated')}
                className={`p-2.5 rounded-lg border text-center transition-all ${
                  balanceMode === 'isolated'
                    ? 'bg-amber-400 text-neutral-950 font-bold border-amber-300'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                <div className="text-xs">Solo Part</div>
                <div className="text-[10px] opacity-80 mt-0.5">100% isolated voice</div>
              </button>

              <button
                onClick={() => setBalanceMode('full-mix')}
                className={`p-2.5 rounded-lg border text-center transition-all ${
                  balanceMode === 'full-mix'
                    ? 'bg-amber-400 text-neutral-950 font-bold border-amber-300'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                <div className="text-xs">Full Stack</div>
                <div className="text-[10px] opacity-80 mt-0.5">All voices active</div>
              </button>
            </div>

            <p className="text-[11px] text-neutral-400">
              Listen to the synthetic guide tone while warming up, then record your natural vocal performance.
            </p>
          </div>
        </div>

        {/* Live Vocal Recording Control Box */}
        <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800/80 shadow-md flex flex-col items-center justify-center space-y-4 text-center">
          {countDown !== null ? (
            <div className="py-6">
              <div className="text-5xl font-black text-amber-400 animate-pulse font-mono">
                {countDown}
              </div>
              <p className="text-xs text-neutral-400 mt-2">Get ready to sing...</p>
            </div>
          ) : isRecording ? (
            <div className="py-4 space-y-4 w-full max-w-sm">
              <div className="flex items-center justify-center gap-2 text-rose-500 font-bold text-sm tracking-wide">
                <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                <span>RECORDING VOCAL TAKE — {activeVoice?.name}</span>
              </div>

              {/* Mic Input Level Meter */}
              <div className="w-full bg-neutral-950 rounded-full h-3 p-0.5 border border-neutral-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 rounded-full transition-all duration-75"
                  style={{ width: `${Math.min(100, micLevel * 250)}%` }}
                />
              </div>

              <button
                onClick={handleStopRecording}
                className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>Stop & Save Vocal Take</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={handleStartCountIn}
                className="py-3 px-8 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-neutral-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2.5 mx-auto"
              >
                <Mic className="w-4 h-4" />
                <span>Record New Take for {activeVoice?.name.split(' ')[0]}</span>
              </button>
              <p className="text-xs text-neutral-500">
                Includes 3-second count-in. Your microphone will record in sync with the backing arrangement.
              </p>
            </div>
          )}
        </div>

        {/* Recorded Vocal Takes Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>Layered Vocal Takes ({recordedTakes.length})</span>
            </h3>
            <span className="text-xs text-neutral-500">
              Real recorded vocal stems saved locally in your project
            </span>
          </div>

          {recordedTakes.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-neutral-900/40 border border-neutral-800/60 text-xs text-neutral-500">
              No vocal takes recorded yet. Click "Record New Take" above to record your first sung layer.
            </div>
          ) : (
            <div className="space-y-2">
              {recordedTakes.map((take) => (
                <div
                  key={take.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-900/80 border border-neutral-800 hover:border-neutral-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-amber-400">
                      <Mic className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>{take.voiceName} Take</span>
                        <span className="text-[10px] text-emerald-400 font-mono">Recorded Audio</span>
                      </div>
                      <div className="text-[11px] text-neutral-500 font-mono">
                        {new Date(take.recordedAt).toLocaleTimeString()} · {totalDuration.toFixed(1)}s
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => playRecordedTake(take)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-neutral-200 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
                      title="Listen to this recorded take"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Audition Take</span>
                    </button>
                    <button
                      onClick={() => deleteTake(take.id)}
                      className="p-1.5 text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 rounded-lg transition-colors"
                      title="Delete take"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
