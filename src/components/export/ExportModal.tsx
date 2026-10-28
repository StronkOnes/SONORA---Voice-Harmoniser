/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GuideTimbre, HarmonyVoice, Project } from '../../types/harmony';
import { AudioExporter } from '../../export/AudioExporter';
import { MidiExporter } from '../../export/MidiExporter';
import {
  X,
  Download,
  FileMusic,
  FileAudio,
  Layers,
  Save,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface ExportModalProps {
  project: Project;
  activeVoices: HarmonyVoice[];
  onClose: () => void;
  onImportProject?: (project: Project) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  project,
  activeVoices,
  onClose,
  onImportProject,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  // 1. Export Full Arrangement Mixdown (WAV)
  const handleExportMixdown = async () => {
    try {
      setIsExporting(true);
      setExportMessage('Rendering 44.1kHz 16-bit PCM Stereo WAV mixdown...');

      const blob = await AudioExporter.exportMixdownWav(activeVoices, project.guideTimbre);
      const safeTitle = project.title.toLowerCase().replace(/[^a-z0-9]/g, '_');
      AudioExporter.downloadBlob(blob, `${safeTitle}_harmony_mixdown.wav`);

      setExportMessage('Full arrangement WAV downloaded successfully!');
      setIsExporting(false);
    } catch (err) {
      console.error(err);
      setExportMessage('Export failed. Please check audio context.');
      setIsExporting(false);
    }
  };

  // 2. Export Multi-track MIDI (.mid)
  const handleExportMidi = () => {
    try {
      setIsExporting(true);
      const blob = MidiExporter.exportToMidi(activeVoices, project.tempo);
      const safeTitle = project.title.toLowerCase().replace(/[^a-z0-9]/g, '_');
      AudioExporter.downloadBlob(blob, `${safeTitle}_harmony_arrangement.mid`);

      setExportMessage('Multi-track MIDI file downloaded successfully!');
      setIsExporting(false);
    } catch (err) {
      console.error(err);
      setExportMessage('MIDI export failed.');
      setIsExporting(false);
    }
  };

  // 3. Export Single Voice Stem (WAV)
  const handleExportStem = async (voice: HarmonyVoice) => {
    try {
      setIsExporting(true);
      setExportMessage(`Rendering stem for ${voice.name}...`);

      const totalDuration = activeVoices.reduce(
        (max, v) => v.noteEvents.reduce((m, n) => Math.max(m, n.startTimeSeconds + n.durationSeconds), max),
        0
      );

      const blob = await AudioExporter.exportStemWav(voice, project.guideTimbre, totalDuration);
      const safeVoice = voice.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      AudioExporter.downloadBlob(blob, `${safeVoice}_guide_stem.wav`);

      setExportMessage(`${voice.name} guide stem downloaded!`);
      setIsExporting(false);
    } catch (err) {
      console.error(err);
      setExportMessage('Stem export failed.');
      setIsExporting(false);
    }
  };

  // 4. Export Project JSON
  const handleExportProjectJson = () => {
    const jsonStr = JSON.stringify(project, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const safeTitle = project.title.toLowerCase().replace(/[^a-z0-9]/g, '_');
    AudioExporter.downloadBlob(blob, `${safeTitle}_harmonyforge_project.json`);
    setExportMessage('Project file saved!');
  };

  // Import Project JSON
  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImportProject) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (imported.schemaVersion && imported.leadNotes) {
          onImportProject(imported);
          onClose();
        } else {
          setExportMessage('Invalid HarmonyForge project file.');
        }
      } catch (err) {
        setExportMessage('Error parsing JSON project file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Export & Deliverables</h2>
              <p className="text-xs text-neutral-400">
                Download master audio, multi-track MIDI, individual guide stems, or save project file.
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

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-neutral-300">
          {exportMessage && (
            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-amber-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{exportMessage}</span>
            </div>
          )}

          {/* Classification Banner - mandatory by SONORA spec */}
          <div className="p-3 rounded-xl bg-neutral-950/80 border border-neutral-800 text-[11px] text-neutral-400 leading-relaxed">
            <strong className="text-white block mb-0.5">Stem Asset Distinction:</strong>
            Exported harmony stems in this section represent <em>Synthesised Guide Audio</em>. Any real vocal recordings you made in Practice Mode are kept separate as <em>Recorded Singer Takes</em>.
          </div>

          {/* Option 1: Master Audio Mixdown */}
          <div className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileAudio className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-white text-xs">Full Arrangement Master WAV</h3>
                  <p className="text-[11px] text-neutral-400">
                    44.1kHz 16-bit PCM Stereo Mixdown with all {activeVoices.length} voices balanced.
                  </p>
                </div>
              </div>
              <button
                onClick={handleExportMixdown}
                disabled={isExporting}
                className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold rounded-lg transition-colors shadow-sm"
              >
                Download WAV
              </button>
            </div>
          </div>

          {/* Option 2: Standard Multi-track MIDI */}
          <div className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileMusic className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-white text-xs">Multi-Track Standard MIDI (.mid)</h3>
                  <p className="text-[11px] text-neutral-400">
                    Type 1 format with separate track per voice, tempo markers, and accurate velocities.
                  </p>
                </div>
              </div>
              <button
                onClick={handleExportMidi}
                disabled={isExporting}
                className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white font-medium rounded-lg transition-colors border border-neutral-700"
              >
                Download MIDI
              </button>
            </div>
          </div>

          {/* Option 3: Individual Guide Stems */}
          <div className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-white text-xs">Individual Voice Stems (WAV)</h3>
            </div>
            <p className="text-[11px] text-neutral-400">
              Download isolated audio stems to import into Logic Pro, Pro Tools, Ableton Live, or FL Studio:
            </p>

            <div className="grid grid-cols-2 gap-2">
              {activeVoices.map((voice) => (
                <button
                  key={voice.id}
                  onClick={() => handleExportStem(voice)}
                  disabled={isExporting}
                  className="p-2.5 rounded-lg border border-neutral-800 hover:border-neutral-700 bg-neutral-900/60 flex items-center justify-between text-left transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: voice.color }} />
                    <span className="text-xs font-medium text-white truncate">{voice.name.split(' ')[0]}</span>
                  </div>
                  <Download className="w-3 h-3 text-neutral-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Option 4: Project Save & Reopen */}
          <div className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Save className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-white text-xs">Project JSON Save / Reopen</h3>
                  <p className="text-[11px] text-neutral-400">
                    Saves entire project structure including user edits and harmony candidates.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium rounded-lg transition-colors border border-neutral-700 cursor-pointer">
                  <span>Reopen</span>
                  <input type="file" accept=".json" onChange={handleImportJsonFile} className="hidden" />
                </label>
                <button
                  onClick={handleExportProjectJson}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white font-medium rounded-lg transition-colors border border-neutral-700"
                >
                  Save JSON
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-neutral-800 bg-neutral-950/70">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
