/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Project, HarmonySettings, HarmonyVoice, NoteEvent, RecordedTake, GuideTimbre } from './types/harmony';
import { DEMO_MELODIES } from './data/demoProjects';
import { HarmonyEngine } from './harmony/HarmonyEngine';
import { KeyDetector, KeyResult } from './analysis/KeyDetector';
import { globalAudioEngine } from './audio/AudioEngine';

import { TopBar } from './components/header/TopBar';
import { TransportBar } from './components/workspace/TransportBar';
import { PitchEditor } from './components/workspace/PitchEditor';
import { VocalLanesView } from './components/workspace/VocalLanesView';
import { MixerPanel } from './components/mixer/MixerPanel';
import { PracticeMode } from './components/practice/PracticeMode';
import { HarmonySettingsPanel } from './components/settings/HarmonySettingsPanel';
import { ProjectSetupModal } from './components/project/ProjectSetupModal';
import { ExportModal } from './components/export/ExportModal';

export default function App() {
  const harmonyEngineRef = useRef(new HarmonyEngine());

  // Initialize with initial demo project
  const [project, setProject] = useState<Project>(() => {
    const demo = DEMO_MELODIES[0]; // Amazing Grace
    const keyDetector = new KeyDetector();
    const detectedKey = keyDetector.detectKey(demo.notes);

    const initialSettings: HarmonySettings = {
      voiceCount: 4,
      style: 'gospel',
      density: 'rich',
      spread: 'spread',
      motion: 'contrary',
      preferChordTones: true,
      allowCounterMelody: true,
      sustainOrnaments: true,
      key: demo.key,
      scale: demo.scale,
      autoKey: true,
      transposeSemitones: 0,
    };

    const engine = new HarmonyEngine();
    const candidates = engine.generateCandidates(demo.notes, initialSettings);

    return {
      id: 'proj-' + Date.now().toString(36),
      schemaVersion: 1,
      title: demo.title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tempo: demo.tempo,
      timeSignature: [4, 4],
      leadNotes: demo.notes,
      detectedKey,
      harmonySettings: initialSettings,
      candidates,
      selectedCandidateId: candidates[0]?.id || '',
      recordedTakes: [],
      masterVolume: 0.85,
      guideTimbre: 'vocal-synth',
      playbackSpeed: 1.0,
      loopEnabled: false,
      loopStartSeconds: 0,
      loopEndSeconds: 10,
    };
  });

  // Undo / Redo history
  const [undoStack, setUndoStack] = useState<Project[]>([]);
  const [redoStack, setRedoStack] = useState<Project[]>([]);

  // Workspace View
  const [currentView, setCurrentView] = useState<'piano-roll' | 'vocal-lanes' | 'practice' | 'mixer'>('piano-roll');

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Modals
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Selected vocal lane
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('lead');

  // Get active candidate voices
  const activeCandidate =
    project.candidates.find((c) => c.id === project.selectedCandidateId) || project.candidates[0];
  const activeVoices = activeCandidate?.voices || [];
  const activeChords = activeCandidate?.chords || [];

  // Calculate total duration
  const totalDuration = activeVoices.reduce(
    (max, v) => v.noteEvents.reduce((m, n) => Math.max(m, n.startTimeSeconds + n.durationSeconds), max),
    8.0
  );

  // Save current project state to undo stack before mutations
  const pushUndoState = useCallback(() => {
    setUndoStack((prev) => [...prev.slice(-20), JSON.parse(JSON.stringify(project))]);
    setRedoStack([]);
  }, [project]);

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack((prev) => [...prev, project]);
    setUndoStack((prev) => prev.slice(0, -1));
    setProject(previous);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((prev) => [...prev, project]);
    setRedoStack((prev) => prev.slice(0, -1));
    setProject(next);
  };

  // Synchronize audio engine callbacks
  useEffect(() => {
    globalAudioEngine.onPlayhead = (time) => {
      setCurrentTime(time);
    };
    globalAudioEngine.onPlaybackEnd = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    globalAudioEngine.setMasterVolume(project.masterVolume);
    globalAudioEngine.setTimbre(project.guideTimbre);
    globalAudioEngine.setPlaybackSpeed(project.playbackSpeed);
    globalAudioEngine.setLoop(project.loopEnabled, project.loopStartSeconds, project.loopEndSeconds);
  }, [project.masterVolume, project.guideTimbre, project.playbackSpeed, project.loopEnabled, project.loopStartSeconds, project.loopEndSeconds]);

  // Keyboard shortcut: Spacebar toggles Play/Pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        if (isPlaying) {
          handlePause();
        } else {
          handlePlay();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, activeVoices, currentTime]);

  // Playback handlers
  const handlePlay = () => {
    setIsPlaying(true);
    globalAudioEngine.play(activeVoices, currentTime);
  };

  const handlePause = () => {
    setIsPlaying(false);
    const stoppedAt = globalAudioEngine.pause();
    setCurrentTime(stoppedAt);
  };

  const handleStop = () => {
    setIsPlaying(false);
    globalAudioEngine.stop();
    setCurrentTime(0);
  };

  const handleSeek = (seconds: number) => {
    setCurrentTime(seconds);
    if (isPlaying) {
      globalAudioEngine.play(activeVoices, seconds);
    }
  };

  const handleToggleLoop = () => {
    const nextLoop = !project.loopEnabled;
    setProject((prev) => ({
      ...prev,
      loopEnabled: nextLoop,
      loopStartSeconds: 0,
      loopEndSeconds: totalDuration,
    }));
    globalAudioEngine.setLoop(nextLoop, 0, totalDuration);
  };

  // Update voices on user edits
  const handleUpdateVoices = (updatedVoices: HarmonyVoice[]) => {
    pushUndoState();
    setProject((prev) => {
      const updatedCandidates = prev.candidates.map((cand) =>
        cand.id === prev.selectedCandidateId ? { ...cand, voices: updatedVoices } : cand
      );
      return { ...prev, candidates: updatedCandidates };
    });
  };

  // Re-generate candidates from current lead notes and settings
  const handleRegenerateCandidates = () => {
    pushUndoState();
    const newCandidates = harmonyEngineRef.current.generateCandidates(project.leadNotes, project.harmonySettings);
    setProject((prev) => ({
      ...prev,
      candidates: newCandidates,
      selectedCandidateId: newCandidates[0]?.id || '',
    }));
  };

  // Candidate selection
  const handleSelectCandidate = (candidateId: string) => {
    setProject((prev) => ({ ...prev, selectedCandidateId: candidateId }));
    if (isPlaying) {
      const selected = project.candidates.find((c) => c.id === candidateId);
      if (selected) {
        globalAudioEngine.play(selected.voices, currentTime);
      }
    }
  };

  // Load new melody from modal
  const handleMelodyReady = (
    title: string,
    notes: NoteEvent[],
    detectedKey: KeyResult,
    audioUrl?: string
  ) => {
    pushUndoState();
    const updatedSettings: HarmonySettings = {
      ...project.harmonySettings,
      key: detectedKey.key,
      scale: detectedKey.scale,
    };

    const newCandidates = harmonyEngineRef.current.generateCandidates(notes, updatedSettings);

    setProject({
      ...project,
      title,
      leadNotes: notes,
      detectedKey,
      harmonySettings: updatedSettings,
      candidates: newCandidates,
      selectedCandidateId: newCandidates[0]?.id || '',
      originalAudioUrl: audioUrl,
    });
    handleStop();
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-neutral-950 text-neutral-100 font-sans overflow-hidden">
      {/* 1. Header with Top Bar Contract */}
      <TopBar
        currentView={currentView}
        onViewChange={setCurrentView}
        onOpenNewProject={() => setShowNewProjectModal(true)}
        onOpenExport={() => setShowExportModal(true)}
        onOpenSettings={() => setShowSettingsModal(true)}
        projectTitle={project.title}
      />

      {/* 2. Global DAW Transport & Audition Bar */}
      <TransportBar
        isPlaying={isPlaying}
        currentTime={currentTime}
        totalDuration={totalDuration}
        onPlay={handlePlay}
        onPause={handlePause}
        onStop={handleStop}
        onSeek={handleSeek}
        isLooping={project.loopEnabled}
        onToggleLoop={handleToggleLoop}
        playbackSpeed={project.playbackSpeed}
        onSpeedChange={(speed) => setProject((prev) => ({ ...prev, playbackSpeed: speed }))}
        guideTimbre={project.guideTimbre}
        onTimbreChange={(timbre) => setProject((prev) => ({ ...prev, guideTimbre: timbre }))}
        masterVolume={project.masterVolume}
        onVolumeChange={(vol) => setProject((prev) => ({ ...prev, masterVolume: vol }))}
        candidates={project.candidates}
        selectedCandidateId={project.selectedCandidateId}
        onSelectCandidate={handleSelectCandidate}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

      {/* 3. Main Workspace Viewport */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {currentView === 'piano-roll' && (
          <PitchEditor
            voices={activeVoices}
            chords={activeChords}
            currentTime={currentTime}
            totalDuration={totalDuration}
            onSeek={handleSeek}
            onUpdateVoices={handleUpdateVoices}
            selectedVoiceId={selectedVoiceId}
            onSelectVoice={setSelectedVoiceId}
          />
        )}

        {currentView === 'vocal-lanes' && (
          <VocalLanesView
            voices={activeVoices}
            currentTime={currentTime}
            onUpdateVoices={handleUpdateVoices}
            onSelectPracticePart={(vId) => {
              setSelectedVoiceId(vId);
              setCurrentView('practice');
            }}
          />
        )}

        {currentView === 'practice' && (
          <PracticeMode
            voices={activeVoices}
            recordedTakes={project.recordedTakes}
            onUpdateTakes={(takes) => setProject((prev) => ({ ...prev, recordedTakes: takes }))}
            playbackSpeed={project.playbackSpeed}
            onSpeedChange={(speed) => setProject((prev) => ({ ...prev, playbackSpeed: speed }))}
            currentTime={currentTime}
            onSeek={handleSeek}
            totalDuration={totalDuration}
          />
        )}

        {currentView === 'mixer' && (
          <MixerPanel
            voices={activeVoices}
            masterVolume={project.masterVolume}
            onUpdateVoices={handleUpdateVoices}
            onUpdateMasterVolume={(vol) => setProject((prev) => ({ ...prev, masterVolume: vol }))}
            isPlaying={isPlaying}
          />
        )}
      </main>

      {/* 4. Modals */}
      {showSettingsModal && (
        <HarmonySettingsPanel
          settings={project.harmonySettings}
          onUpdateSettings={(s) => setProject((prev) => ({ ...prev, harmonySettings: s }))}
          onRegenerate={handleRegenerateCandidates}
          onClose={() => setShowSettingsModal(false)}
          detectedKey={project.detectedKey}
        />
      )}

      {showNewProjectModal && (
        <ProjectSetupModal
          onClose={() => setShowNewProjectModal(false)}
          onMelodyReady={handleMelodyReady}
        />
      )}

      {showExportModal && (
        <ExportModal
          project={project}
          activeVoices={activeVoices}
          onClose={() => setShowExportModal(false)}
          onImportProject={(imported) => {
            pushUndoState();
            setProject(imported);
          }}
        />
      )}
    </div>
  );
}
