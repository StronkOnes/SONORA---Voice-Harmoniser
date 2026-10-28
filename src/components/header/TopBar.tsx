/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Download, Mic, Music, Sliders, Sparkles, Volume2, Users } from 'lucide-react';

interface TopBarProps {
  currentView: 'piano-roll' | 'vocal-lanes' | 'practice' | 'mixer';
  onViewChange: (view: 'piano-roll' | 'vocal-lanes' | 'practice' | 'mixer') => void;
  onOpenNewProject: () => void;
  onOpenExport: () => void;
  onOpenSettings: () => void;
  projectTitle: string;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentView,
  onViewChange,
  onOpenNewProject,
  onOpenExport,
  onOpenSettings,
  projectTitle,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3 border-b border-neutral-800 bg-neutral-900/90 backdrop-blur-md shrink-0 select-none">
      {/* Zone 1: Brand title wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <a href="/" className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-white whitespace-nowrap">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-300 flex items-center justify-center text-neutral-950 shadow-sm shadow-amber-500/20">
            <Music className="w-4 h-4 stroke-[2.5]" />
          </div>
          <span>SONORA HarmonyForge</span>
        </a>
        <span className="hidden sm:inline-block text-xs font-mono text-neutral-500 max-w-[200px] truncate">
          / {projectTitle}
        </span>
      </div>

      {/* Zone 2: Navigation Links / Workspace View tabs */}
      <nav className="flex items-center gap-1.5 p-1 bg-neutral-950/80 rounded-xl border border-neutral-800/80 text-xs font-medium">
        <button
          onClick={() => onViewChange('piano-roll')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            currentView === 'piano-roll'
              ? 'bg-neutral-800 text-amber-300 shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
          title="DAW Pitch Grid & Interactive Note Editor"
        >
          <Music className="w-3.5 h-3.5" />
          <span>Piano Roll Studio</span>
        </button>

        <button
          onClick={() => onViewChange('vocal-lanes')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            currentView === 'vocal-lanes'
              ? 'bg-neutral-800 text-amber-300 shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
          title="Singers' Vocal Lane View (No Sheet Music Required)"
        >
          <Users className="w-3.5 h-3.5" />
          <span>Singers' Lanes</span>
        </button>

        <button
          onClick={() => onViewChange('practice')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            currentView === 'practice'
              ? 'bg-neutral-800 text-amber-300 shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
          title="Singer Practice Mode & Real Vocal Take Recorder"
        >
          <Mic className="w-3.5 h-3.5" />
          <span>Practice & Record</span>
        </button>

        <button
          onClick={() => onViewChange('mixer')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            currentView === 'mixer'
              ? 'bg-neutral-800 text-amber-300 shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
          title="Multi-channel Harmony Mixer & Stem Balancer"
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span>Vocal Mixer</span>
        </button>
      </nav>

      {/* Zone 3: Primary Action controls */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-800/80 hover:bg-neutral-700/80 border border-neutral-700/60 rounded-lg transition-colors whitespace-nowrap shrink-0"
          title="Configure Harmony Style, Voices, and Constraints"
        >
          <Sliders className="w-3.5 h-3.5 text-amber-400" />
          <span>Harmony Setup</span>
        </button>

        <button
          onClick={onOpenNewProject}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-200 bg-neutral-800/90 hover:bg-neutral-700 border border-neutral-700/60 rounded-lg transition-colors whitespace-nowrap shrink-0"
          title="Record, Upload or Select Melody"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>New Melody</span>
        </button>

        <button
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-neutral-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-lg shadow-sm shadow-amber-500/20 transition-all whitespace-nowrap shrink-0"
          title="Export WAV Mixdown, Stems, and Multi-track MIDI"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Stems / MIDI</span>
        </button>
      </div>
    </header>
  );
};
