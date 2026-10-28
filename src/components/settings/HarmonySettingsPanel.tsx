/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { HarmonySettings, HarmonyStyle } from '../../types/harmony';
import { STYLE_PROFILES } from '../../harmony/StyleProfiles';
import { NOTE_NAMES } from '../../utils/musicTheory';
import { X, Sliders, RefreshCw, Check, Sparkles } from 'lucide-react';

interface HarmonySettingsPanelProps {
  settings: HarmonySettings;
  onUpdateSettings: (settings: HarmonySettings) => void;
  onRegenerate: () => void;
  onClose: () => void;
  detectedKey?: { key: string; scale: 'major' | 'minor'; confidence: number };
}

export const HarmonySettingsPanel: React.FC<HarmonySettingsPanelProps> = ({
  settings,
  onUpdateSettings,
  onRegenerate,
  onClose,
  detectedKey,
}) => {
  const voiceOptions = [2, 3, 4, 5, 6, 7, 8];

  const handleStyleChange = (style: HarmonyStyle) => {
    onUpdateSettings({ ...settings, style });
  };

  const handleVoiceCountChange = (count: number) => {
    onUpdateSettings({ ...settings, voiceCount: count });
  };

  const handleKeyChange = (key: string) => {
    onUpdateSettings({ ...settings, key, autoKey: false });
  };

  const handleScaleChange = (scale: 'major' | 'minor') => {
    onUpdateSettings({ ...settings, scale, autoKey: false });
  };

  const handleTranspose = (semitones: number) => {
    onUpdateSettings({ ...settings, transposeSemitones: settings.transposeSemitones + semitones });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Harmony Configuration</h2>
              <p className="text-xs text-neutral-400">
                Customise vocal layering rules, voice count, genre styles, and harmonic behavior.
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-neutral-300">
          {/* Section 1: Number of Voices */}
          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <label className="font-semibold text-white">Total Voice Count (Including Lead):</label>
              <span className="text-amber-400 font-mono font-bold">{settings.voiceCount} Voices</span>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {voiceOptions.map((v) => {
                const isSelected = settings.voiceCount === v;
                const isPrimary = [2, 4, 6, 8].includes(v);
                return (
                  <button
                    key={v}
                    onClick={() => handleVoiceCountChange(v)}
                    className={`py-2 px-1 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'bg-amber-400 text-neutral-950 font-bold border-amber-300 shadow-sm'
                        : isPrimary
                        ? 'bg-neutral-800/80 border-neutral-700 text-neutral-200 hover:border-neutral-500'
                        : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <div className="text-sm font-mono">{v}</div>
                    <div className="text-[9px] opacity-75">{v === 2 ? 'Duet' : v === 4 ? 'Quartet' : `${v}v`}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Harmony Styles (8 Musically Distinct Presets) */}
          <div className="space-y-2.5">
            <label className="font-semibold text-white">Harmony Style Preset:</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.values(STYLE_PROFILES).map((style) => {
                const isSelected = settings.style === style.style;
                return (
                  <button
                    key={style.style}
                    onClick={() => handleStyleChange(style.style)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-neutral-800 border-amber-400 text-white shadow-sm ring-1 ring-amber-400/30'
                        : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-white">{style.label.split('/')[0]}</span>
                      {isSelected && <Check className="w-3 h-3 text-amber-400" />}
                    </div>
                    <p className="text-[10px] text-neutral-400 line-clamp-2 leading-relaxed">
                      {style.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Key, Scale & Transpose */}
          <div className="p-4 rounded-xl bg-neutral-950/80 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">Musical Key & Scale</span>
              {detectedKey && (
                <span className="text-[11px] text-neutral-400">
                  Detected: <strong className="text-amber-400">{detectedKey.key} {detectedKey.scale}</strong> ({Math.round(detectedKey.confidence * 100)}% confidence)
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Key Root */}
              <div>
                <label className="text-[10px] text-neutral-500 block mb-1">Key Root</label>
                <select
                  value={settings.key}
                  onChange={(e) => handleKeyChange(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2 text-white font-mono cursor-pointer"
                >
                  {NOTE_NAMES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>

              {/* Scale Type */}
              <div>
                <label className="text-[10px] text-neutral-500 block mb-1">Scale</label>
                <select
                  value={settings.scale}
                  onChange={(e) => handleScaleChange(e.target.value as 'major' | 'minor')}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2 text-white cursor-pointer"
                >
                  <option value="major">Major (Ionian)</option>
                  <option value="minor">Minor (Aeolian)</option>
                </select>
              </div>

              {/* Transpose Controls */}
              <div>
                <label className="text-[10px] text-neutral-500 block mb-1">Transpose</label>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleTranspose(-1)}
                    className="flex-1 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-lg text-xs font-mono font-bold"
                  >
                    -1st
                  </button>
                  <span className="px-2 font-mono text-amber-400 font-bold">
                    {settings.transposeSemitones >= 0 ? `+${settings.transposeSemitones}` : settings.transposeSemitones}
                  </span>
                  <button
                    onClick={() => handleTranspose(1)}
                    className="flex-1 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-lg text-xs font-mono font-bold"
                  >
                    +1st
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Harmonic Behavior & Density */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="font-semibold text-white">Voice Spacing:</label>
              <div className="grid grid-cols-3 gap-2">
                {(['close', 'balanced', 'spread'] as const).map((spr) => (
                  <button
                    key={spr}
                    onClick={() => onUpdateSettings({ ...settings, spread: spr })}
                    className={`py-2 rounded-lg border text-center capitalize transition-colors ${
                      settings.spread === spr
                        ? 'bg-amber-400 text-neutral-950 font-bold border-amber-300'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {spr}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="font-semibold text-white">Voice Motion:</label>
              <div className="grid grid-cols-3 gap-2">
                {(['smooth', 'expressive', 'contrary'] as const).map((mot) => (
                  <button
                    key={mot}
                    onClick={() => onUpdateSettings({ ...settings, motion: mot })}
                    className={`py-2 rounded-lg border text-center capitalize transition-colors ${
                      settings.motion === mot
                        ? 'bg-amber-400 text-neutral-950 font-bold border-amber-300'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {mot}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-800 bg-neutral-950/70">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onRegenerate();
              onClose();
            }}
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-neutral-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl shadow-md transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Generate Harmony Candidates</span>
          </button>
        </div>
      </div>
    </div>
  );
};
