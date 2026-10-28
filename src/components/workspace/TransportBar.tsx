/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Play,
  Pause,
  Square,
  Repeat,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Gauge,
  Layers,
} from 'lucide-react';
import { GuideTimbre, HarmonyCandidate } from '../../types/harmony';

interface TransportBarProps {
  isPlaying: boolean;
  currentTime: number;
  totalDuration: number;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSeek: (timeSeconds: number) => void;
  isLooping: boolean;
  onToggleLoop: () => void;
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
  guideTimbre: GuideTimbre;
  onTimbreChange: (timbre: GuideTimbre) => void;
  masterVolume: number;
  onVolumeChange: (vol: number) => void;
  candidates: HarmonyCandidate[];
  selectedCandidateId: string;
  onSelectCandidate: (candidateId: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export const TransportBar: React.FC<TransportBarProps> = ({
  isPlaying,
  currentTime,
  totalDuration,
  onPlay,
  onPause,
  onStop,
  onSeek,
  isLooping,
  onToggleLoop,
  playbackSpeed,
  onSpeedChange,
  guideTimbre,
  onTimbreChange,
  masterVolume,
  onVolumeChange,
  candidates,
  selectedCandidateId,
  onSelectCandidate,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-2.5 bg-neutral-900 border-b border-neutral-800 text-xs select-none">
      {/* Group 1: Transport Controls & Time */}
      <div className="flex items-center gap-3">
        {/* Play / Pause button */}
        <button
          onClick={isPlaying ? onPause : onPlay}
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all shadow-sm ${
            isPlaying
              ? 'bg-amber-500 text-neutral-950 hover:bg-amber-400'
              : 'bg-neutral-800 hover:bg-neutral-700 text-white'
          }`}
          title={isPlaying ? 'Pause (Space)' : 'Play Arrangement (Space)'}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
        </button>

        {/* Stop button */}
        <button
          onClick={onStop}
          className="w-8 h-8 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center transition-colors"
          title="Stop & Return to Start"
        >
          <Square className="w-3.5 h-3.5 fill-current" />
        </button>

        {/* Loop toggle */}
        <button
          onClick={onToggleLoop}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors ${
            isLooping
              ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
              : 'bg-neutral-800/60 border-neutral-700/60 text-neutral-400 hover:text-neutral-200'
          }`}
          title="Toggle Phrase Looping"
        >
          <Repeat className="w-3.5 h-3.5" />
          <span className="font-medium">Loop</span>
        </button>

        {/* Time display */}
        <div className="flex items-center gap-1 px-3 py-1.5 bg-neutral-950 rounded-lg border border-neutral-800 font-mono text-neutral-200 tabular-nums">
          <span className="text-amber-400 font-semibold">{formatTime(currentTime)}</span>
          <span className="text-neutral-600">/</span>
          <span className="text-neutral-400">{formatTime(totalDuration)}</span>
        </div>

        {/* Scrubber slider */}
        <div className="w-32 hidden md:flex items-center">
          <input
            type="range"
            min={0}
            max={Math.max(1, totalDuration)}
            step={0.05}
            value={Math.min(totalDuration, currentTime)}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            className="w-full accent-amber-400 h-1 bg-neutral-800 rounded cursor-pointer"
          />
        </div>
      </div>

      {/* Group 2: Candidates A/B Comparison Switcher */}
      <div className="flex items-center gap-2">
        <span className="text-neutral-500 hidden lg:inline flex items-center gap-1">
          <Layers className="w-3 h-3" />
          <span>Arrangement:</span>
        </span>
        <div className="flex items-center gap-1 p-0.5 bg-neutral-950 rounded-lg border border-neutral-800">
          {candidates.map((cand) => {
            const isSelected = cand.id === selectedCandidateId;
            return (
              <button
                key={cand.id}
                onClick={() => onSelectCandidate(cand.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-amber-400/90 text-neutral-950 shadow-sm font-semibold'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
                }`}
                title={`${cand.title} — ${cand.description}`}
              >
                <span>{cand.title.split(' ')[0]}</span>
                <span className="opacity-70 ml-1 text-[10px] hidden sm:inline">({cand.voices.length}v)</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Group 3: Rehearsal Speed, Timbre, Master Volume, Undo/Redo */}
      <div className="flex items-center gap-3">
        {/* Rehearsal Speed (Slow down for singers) */}
        <div className="flex items-center gap-1">
          <Gauge className="w-3.5 h-3.5 text-neutral-500 hidden sm:inline" />
          <select
            value={playbackSpeed}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            className="bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1 text-xs text-neutral-300 focus:outline-none focus:border-amber-400 cursor-pointer"
            title="Rehearsal Speed Multiplier"
          >
            <option value={0.75}>0.75x (Slow)</option>
            <option value={0.85}>0.85x (Practice)</option>
            <option value={1.0}>1.0x (Normal)</option>
          </select>
        </div>

        {/* Synthesizer Timbre */}
        <select
          value={guideTimbre}
          onChange={(e) => onTimbreChange(e.target.value as GuideTimbre)}
          className="bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1 text-xs text-neutral-300 focus:outline-none focus:border-amber-400 cursor-pointer"
          title="Guide Voice Sound Generator"
        >
          <option value="vocal-synth">Vocal Formant (Aah)</option>
          <option value="choir-ooh">Warm Choir (Ooh)</option>
          <option value="rhodes">Electric Piano</option>
          <option value="acoustic-guide">Acoustic Guide Tone</option>
        </select>

        {/* Master Volume */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onVolumeChange(masterVolume > 0 ? 0 : 0.85)}
            className="text-neutral-400 hover:text-neutral-200"
            title="Mute / Unmute Master"
          >
            {masterVolume > 0 ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-rose-400" />}
          </button>
          <input
            type="range"
            min={0}
            max={1.2}
            step={0.02}
            value={masterVolume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-16 sm:w-20 accent-amber-400 h-1 bg-neutral-800 rounded cursor-pointer"
            title={`Master Volume: ${Math.round(masterVolume * 100)}%`}
          />
        </div>

        {/* Undo / Redo */}
        <div className="flex items-center gap-1 border-l border-neutral-800 pl-2">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-1.5 rounded hover:bg-neutral-800 transition-colors ${
              canUndo ? 'text-neutral-300' : 'text-neutral-600 cursor-not-allowed'
            }`}
            title="Undo (Ctrl+Z)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-1.5 rounded hover:bg-neutral-800 transition-colors ${
              canRedo ? 'text-neutral-300' : 'text-neutral-600 cursor-not-allowed'
            }`}
            title="Redo (Ctrl+Y)"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
