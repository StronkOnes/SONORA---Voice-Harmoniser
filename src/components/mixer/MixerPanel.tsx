/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { HarmonyVoice } from '../../types/harmony';
import { globalAudioEngine } from '../../audio/AudioEngine';
import { RotateCcw, Volume2, ShieldCheck } from 'lucide-react';

interface MixerPanelProps {
  voices: HarmonyVoice[];
  masterVolume: number;
  onUpdateVoices: (voices: HarmonyVoice[]) => void;
  onUpdateMasterVolume: (vol: number) => void;
  isPlaying: boolean;
}

export const MixerPanel: React.FC<MixerPanelProps> = ({
  voices,
  masterVolume,
  onUpdateVoices,
  onUpdateMasterVolume,
  isPlaying,
}) => {
  const handleVolumeChange = (voiceId: string, gain: number) => {
    const updated = voices.map((v) => (v.id === voiceId ? { ...v, gain } : v));
    onUpdateVoices(updated);
    globalAudioEngine.updateVoiceMixer(updated);
  };

  const handlePanChange = (voiceId: string, pan: number) => {
    const updated = voices.map((v) => (v.id === voiceId ? { ...v, pan } : v));
    onUpdateVoices(updated);
    globalAudioEngine.updateVoiceMixer(updated);
  };

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

  const resetMix = () => {
    const updated = voices.map((v) => ({
      ...v,
      gain: v.isLead ? 0.9 : 0.75,
      pan: 0,
      muted: false,
      solo: false,
    }));
    onUpdateVoices(updated);
    globalAudioEngine.updateVoiceMixer(updated);
    onUpdateMasterVolume(0.85);
  };

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 bg-neutral-950 p-6 overflow-y-auto">
      <div className="max-w-6xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-amber-400" />
              <span>Multi-Track Vocal Mixer</span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Balance individual vocal levels, stereo panning, solo/mute isolation, and master ceiling.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1 rounded-lg">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Safe Limiter Active</span>
            </div>
            <button
              onClick={resetMix}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Mix</span>
            </button>
          </div>
        </div>

        {/* Mixer Channel Strips Console */}
        <div className="flex items-stretch gap-3 overflow-x-auto pb-4 pt-2">
          {voices.map((voice) => {
            const isSoloed = voice.solo;
            const isMuted = voice.muted;
            const panDisplay =
              voice.pan === 0
                ? 'C'
                : voice.pan < 0
                ? `L${Math.round(Math.abs(voice.pan) * 100)}`
                : `R${Math.round(voice.pan * 100)}`;

            return (
              <div
                key={voice.id}
                className="w-32 flex flex-col justify-between bg-neutral-900/80 border border-neutral-800 rounded-xl p-3 shrink-0 shadow-sm"
              >
                {/* Channel Header */}
                <div className="space-y-1 text-center">
                  <div
                    className="w-full h-1.5 rounded-full mb-1.5"
                    style={{ backgroundColor: voice.color }}
                  />
                  <div className="text-xs font-bold text-white truncate" title={voice.name}>
                    {voice.name.split(' ')[0]}
                  </div>
                  <div className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider">
                    {voice.isLead ? 'Lead' : voice.role}
                  </div>
                </div>

                {/* Solo & Mute Buttons */}
                <div className="grid grid-cols-2 gap-1.5 my-3">
                  <button
                    onClick={() => toggleSolo(voice.id)}
                    className={`py-1 text-xs font-bold rounded transition-colors ${
                      isSoloed
                        ? 'bg-amber-400 text-neutral-950 shadow-sm'
                        : 'bg-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    S
                  </button>
                  <button
                    onClick={() => toggleMute(voice.id)}
                    className={`py-1 text-xs font-bold rounded transition-colors ${
                      isMuted
                        ? 'bg-rose-500 text-white shadow-sm'
                        : 'bg-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    M
                  </button>
                </div>

                {/* Stereo Pan Control */}
                <div className="space-y-1 mb-4 text-center">
                  <div className="flex justify-between items-center text-[10px] font-mono text-neutral-400">
                    <span>PAN</span>
                    <span className="text-amber-400 font-semibold">{panDisplay}</span>
                  </div>
                  <input
                    type="range"
                    min={-1}
                    max={1}
                    step={0.05}
                    value={voice.pan}
                    onChange={(e) => handlePanChange(voice.id, parseFloat(e.target.value))}
                    className="w-full accent-amber-400 h-1 bg-neutral-800 rounded cursor-pointer"
                  />
                </div>

                {/* Vertical Volume Fader and VU Level */}
                <div className="flex items-center justify-center gap-3 h-44 my-2">
                  {/* Animated Simulated VU Meter */}
                  <div className="w-2.5 h-full bg-neutral-950 rounded-full overflow-hidden flex flex-col justify-end p-0.5 border border-neutral-800">
                    <div
                      className={`w-full rounded-full transition-all duration-75 ${
                        isMuted
                          ? 'h-0'
                          : isPlaying
                          ? 'bg-gradient-to-t from-emerald-500 via-amber-400 to-rose-500'
                          : 'h-0'
                      }`}
                      style={{
                        height: isPlaying && !isMuted ? `${Math.min(100, voice.gain * 85)}%` : '0%',
                      }}
                    />
                  </div>

                  {/* Volume Slider */}
                  <div className="flex flex-col items-center h-full justify-between">
                    <input
                      type="range"
                      min={0}
                      max={1.0}
                      step={0.01}
                      value={voice.gain}
                      onChange={(e) => handleVolumeChange(voice.id, parseFloat(e.target.value))}
                      style={{ transform: 'rotate(-90deg)', width: '130px', margin: '60px -50px' }}
                      className="accent-amber-400 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Gain Readout */}
                <div className="text-center pt-2 border-t border-neutral-800 font-mono text-[11px] text-neutral-400 tabular-nums">
                  {Math.round(voice.gain * 100)}%
                </div>
              </div>
            );
          })}

          {/* Master Bus Channel Strip */}
          <div className="w-36 flex flex-col justify-between bg-neutral-900 border-2 border-amber-500/30 rounded-xl p-3 shrink-0 shadow-lg ml-2">
            <div className="space-y-1 text-center">
              <div className="w-full h-1.5 rounded-full bg-amber-400 mb-1.5" />
              <div className="text-xs font-bold text-amber-300">MASTER BUS</div>
              <div className="text-[10px] text-neutral-400 font-mono">Stereo Mix</div>
            </div>

            <div className="h-44 flex items-center justify-center gap-3 my-6">
              {/* Dual Master VU Meters */}
              <div className="flex gap-1 h-full">
                <div className="w-2 h-full bg-neutral-950 rounded-full overflow-hidden flex flex-col justify-end p-0.5 border border-neutral-800">
                  <div
                    className="w-full rounded-full transition-all duration-75 bg-gradient-to-t from-emerald-500 via-amber-400 to-rose-500"
                    style={{
                      height: isPlaying ? `${Math.min(95, masterVolume * 80)}%` : '0%',
                    }}
                  />
                </div>
                <div className="w-2 h-full bg-neutral-950 rounded-full overflow-hidden flex flex-col justify-end p-0.5 border border-neutral-800">
                  <div
                    className="w-full rounded-full transition-all duration-75 bg-gradient-to-t from-emerald-500 via-amber-400 to-rose-500"
                    style={{
                      height: isPlaying ? `${Math.min(92, masterVolume * 78)}%` : '0%',
                    }}
                  />
                </div>
              </div>

              {/* Master Volume Slider */}
              <div className="flex flex-col items-center h-full justify-between">
                <input
                  type="range"
                  min={0}
                  max={1.2}
                  step={0.02}
                  value={masterVolume}
                  onChange={(e) => onUpdateMasterVolume(parseFloat(e.target.value))}
                  style={{ transform: 'rotate(-90deg)', width: '130px', margin: '60px -50px' }}
                  className="accent-amber-400 cursor-pointer"
                />
              </div>
            </div>

            <div className="text-center pt-2 border-t border-neutral-800 font-mono text-[11px] text-amber-400 font-semibold tabular-nums">
              {Math.round(masterVolume * 100)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
