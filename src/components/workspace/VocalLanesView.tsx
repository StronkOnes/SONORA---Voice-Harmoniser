/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { HarmonyVoice, NoteEvent } from '../../types/harmony';
import { getIntervalName, midiToNoteName } from '../../utils/musicTheory';
import { globalAudioEngine } from '../../audio/AudioEngine';
import { Mic, Volume2, VolumeX, Play } from 'lucide-react';

interface VocalLanesViewProps {
  voices: HarmonyVoice[];
  currentTime: number;
  onUpdateVoices: (voices: HarmonyVoice[]) => void;
  onSelectPracticePart?: (voiceId: string) => void;
}

export const VocalLanesView: React.FC<VocalLanesViewProps> = ({
  voices,
  currentTime,
  onUpdateVoices,
  onSelectPracticePart,
}) => {
  const toggleSolo = (voiceId: string) => {
    const updated = voices.map((v) => (v.id === voiceId ? { ...v, solo: !v.solo } : v));
    onUpdateVoices(updated);
    globalAudioEngine.updateVoiceMixer(updated);
  };

  const toggleMute = (voiceId: string) => {
    const updated = voices.map((v) => (v.id === voiceId ? { ...v, muted: !v.muted } : v));
    onUpdateVoices(updated);
    globalAudioEngine.updateVoiceMixer(updated);
  };

  const previewSingleNote = (pitchMidi: number) => {
    globalAudioEngine.previewNote(pitchMidi, 0.5);
  };

  const auditionPartSolo = (voice: HarmonyVoice) => {
    // Solo this voice and start playback from beginning
    const soloed = voices.map((v) => ({ ...v, solo: v.id === voice.id }));
    onUpdateVoices(soloed);
    globalAudioEngine.play(soloed, 0);
  };

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 bg-neutral-950 p-6 overflow-y-auto">
      <div className="max-w-6xl mx-auto w-full space-y-6">
        {/* Intro Banner for Singers */}
        <div className="flex items-center justify-between border-b border-neutral-800/80 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Singers' Vocal Lane View</h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Designed for singers and choir members. Follow note names, intervals, and contours without needing to read sheet music.
            </p>
          </div>
          <div className="text-xs text-neutral-400 font-mono">
            {voices.length} active vocal parts
          </div>
        </div>

        {/* Vocal Lane Cards */}
        <div className="space-y-4">
          {voices.map((voice) => {
            const isSoloed = voice.solo;
            const isMuted = voice.muted;

            return (
              <div
                key={voice.id}
                className={`p-4 rounded-xl border transition-all ${
                  voice.isLead
                    ? 'bg-neutral-900/90 border-amber-500/40 shadow-sm shadow-amber-500/5'
                    : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700/80'
                }`}
              >
                {/* Lane Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-2.5 border-b border-neutral-800/60">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-3.5 h-3.5 rounded-full shadow-sm"
                      style={{ backgroundColor: voice.color }}
                    />
                    <div>
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <span>{voice.name}</span>
                        {voice.isLead && (
                          <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 bg-amber-400/20 text-amber-300 rounded">
                            Original Lead
                          </span>
                        )}
                      </h3>
                      <p className="text-[11px] text-neutral-400">
                        Role: {voice.role.toUpperCase()} · Range: {midiToNoteName(voice.rangeMinimumMidi)} to {midiToNoteName(voice.rangeMaximumMidi)}
                      </p>
                    </div>
                  </div>

                  {/* Lane Action Buttons */}
                  <div className="flex items-center gap-2">
                    {/* Audition Part Solo */}
                    <button
                      onClick={() => auditionPartSolo(voice)}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-neutral-200 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
                      title="Audition this voice part isolated"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Solo Audition</span>
                    </button>

                    {/* Solo Toggle */}
                    <button
                      onClick={() => toggleSolo(voice.id)}
                      className={`px-2 py-1 text-xs font-bold rounded-lg transition-colors ${
                        isSoloed
                          ? 'bg-amber-400 text-neutral-950 shadow-sm'
                          : 'bg-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                      title="Solo this track"
                    >
                      S
                    </button>

                    {/* Mute Toggle */}
                    <button
                      onClick={() => toggleMute(voice.id)}
                      className={`px-2 py-1 text-xs font-bold rounded-lg transition-colors ${
                        isMuted
                          ? 'bg-rose-500 text-white shadow-sm'
                          : 'bg-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                      title="Mute this track"
                    >
                      M
                    </button>

                    {/* Jump to Practice Mode */}
                    {onSelectPracticePart && !voice.isLead && (
                      <button
                        onClick={() => onSelectPracticePart(voice.id)}
                        className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-colors ml-1"
                        title="Open Singer Practice Mode for this voice"
                      >
                        <Mic className="w-3 h-3" />
                        <span>Practice Part</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Horizontal Sequence of Note Event Cards */}
                <div className="flex items-center gap-2 overflow-x-auto py-1.5 pb-2">
                  {voice.noteEvents.map((note, index) => {
                    const isNoteActive =
                      currentTime >= note.startTimeSeconds &&
                      currentTime < note.startTimeSeconds + note.durationSeconds;

                    const noteName = midiToNoteName(note.pitchMidi);
                    const intervalText =
                      note.intervalFromLead !== undefined && !voice.isLead
                        ? getIntervalName(note.intervalFromLead)
                        : null;

                    return (
                      <div
                        key={note.id || index}
                        onClick={() => previewSingleNote(note.pitchMidi)}
                        className={`flex flex-col justify-between p-2.5 rounded-lg border text-left cursor-pointer transition-all shrink-0 min-w-[82px] ${
                          isNoteActive
                            ? 'bg-amber-400 text-neutral-950 border-amber-300 shadow-md scale-105 z-10'
                            : 'bg-neutral-950/70 border-neutral-800 hover:border-neutral-700 text-neutral-200'
                        }`}
                        title={`Click to preview: ${noteName} (${note.durationSeconds.toFixed(1)}s)`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className={`text-xs font-bold ${isNoteActive ? 'text-neutral-950' : 'text-white'}`}>
                            {noteName}
                          </span>
                          <span
                            className={`text-[9px] font-mono ${
                              isNoteActive ? 'text-neutral-800' : 'text-neutral-500'
                            }`}
                          >
                            {note.durationSeconds.toFixed(1)}s
                          </span>
                        </div>

                        <div className="mt-1 flex items-center justify-between">
                          <span
                            className={`text-[10px] font-semibold ${
                              isNoteActive
                                ? 'text-neutral-900'
                                : intervalText?.startsWith('+')
                                ? 'text-emerald-400'
                                : intervalText?.startsWith('-')
                                ? 'text-cyan-400'
                                : 'text-neutral-400'
                            }`}
                          >
                            {intervalText || (voice.isLead ? 'Lead' : 'Tone')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
