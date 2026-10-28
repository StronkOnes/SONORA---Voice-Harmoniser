/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChordSegment, HarmonyVoice, NoteEvent } from '../../types/harmony';
import { getIntervalName, midiToNoteName } from '../../utils/musicTheory';
import { globalAudioEngine } from '../../audio/AudioEngine';
import { Volume2, VolumeX, Eye, EyeOff, ZoomIn, ZoomOut, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

interface PitchEditorProps {
  voices: HarmonyVoice[];
  chords: ChordSegment[];
  currentTime: number;
  totalDuration: number;
  onSeek: (seconds: number) => void;
  onUpdateVoices: (voices: HarmonyVoice[]) => void;
  selectedVoiceId?: string;
  onSelectVoice?: (voiceId: string) => void;
}

export const PitchEditor: React.FC<PitchEditorProps> = ({
  voices,
  chords,
  currentTime,
  totalDuration,
  onSeek,
  onUpdateVoices,
  selectedVoiceId,
  onSelectVoice,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pixelsPerSecond, setPixelsPerSecond] = useState(130);
  const [rowHeight, setRowHeight] = useState(18);
  const [minMidi, setMinMidi] = useState(48); // C3
  const [maxMidi, setMaxMidi] = useState(84); // C6

  // Selected note state
  const [selectedNote, setSelectedNote] = useState<{ voiceId: string; noteId: string } | null>(null);

  // Dragging state
  const [dragState, setDragState] = useState<{
    voiceId: string;
    noteId: string;
    dragType: 'move' | 'resize-left' | 'resize-right';
    initialStartX: number;
    initialStartY: number;
    initialPitch: number;
    initialTime: number;
    initialDuration: number;
  } | null>(null);

  // Compute adaptive pitch bounds based on current notes
  useEffect(() => {
    let low = 999;
    let high = 0;
    for (const v of voices) {
      for (const n of v.noteEvents) {
        if (n.pitchMidi < low) low = n.pitchMidi;
        if (n.pitchMidi > high) high = n.pitchMidi;
      }
    }
    if (low !== 999 && high !== 0) {
      setMinMidi(Math.max(36, low - 3));
      setMaxMidi(Math.min(96, high + 4));
    }
  }, [voices]);

  const numMidiRows = maxMidi - minMidi + 1;
  const editorWidth = Math.max(900, Math.ceil((totalDuration + 2) * pixelsPerSecond));
  const editorHeight = numMidiRows * rowHeight;

  // Time to pixel conversion
  const timeToPx = (sec: number) => sec * pixelsPerSecond;
  const pxToTime = (px: number) => Math.max(0, px / pixelsPerSecond);

  // MIDI to Y position (top = maxMidi, bottom = minMidi)
  const midiToY = (midi: number) => (maxMidi - midi) * rowHeight;
  const yToMidi = (y: number) => maxMidi - Math.floor(y / rowHeight);

  // Piano keys list
  const pianoKeys = [];
  for (let m = maxMidi; m >= minMidi; m--) {
    const isBlack = [1, 3, 6, 8, 10].includes(m % 12);
    const noteName = midiToNoteName(m);
    pianoKeys.push({ midi: m, isBlack, name: noteName });
  }

  // Handle note selection and sound audition
  const handleNoteClick = (voiceId: string, note: NoteEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNote({ voiceId, noteId: note.id });
    if (onSelectVoice) onSelectVoice(voiceId);
    globalAudioEngine.previewNote(note.pitchMidi, 0.4);
  };

  // Keyboard note preview
  const handlePianoKeyClick = (midi: number) => {
    globalAudioEngine.previewNote(midi, 0.5);
  };

  // Timeline click for playhead seek
  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const time = pxToTime(clickX);
    onSeek(time);
  };

  // Start dragging a note
  const handleMouseDownNote = (
    voiceId: string,
    note: NoteEvent,
    type: 'move' | 'resize-left' | 'resize-right',
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedNote({ voiceId, noteId: note.id });
    if (onSelectVoice) onSelectVoice(voiceId);

    setDragState({
      voiceId,
      noteId: note.id,
      dragType: type,
      initialStartX: e.clientX,
      initialStartY: e.clientY,
      initialPitch: note.pitchMidi,
      initialTime: note.startTimeSeconds,
      initialDuration: note.durationSeconds,
    });
  };

  // Global mouse move and up for drag interaction
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState) return;

      const deltaX = e.clientX - dragState.initialStartX;
      const deltaY = e.clientY - dragState.initialStartY;

      const deltaTime = deltaX / pixelsPerSecond;
      const deltaPitch = -Math.round(deltaY / rowHeight);

      const updatedVoices = voices.map((v) => {
        if (v.id !== dragState.voiceId) return v;

        const updatedNotes = v.noteEvents.map((note) => {
          if (note.id !== dragState.noteId) return note;

          if (dragState.dragType === 'move') {
            const newPitch = Math.max(36, Math.min(96, dragState.initialPitch + deltaPitch));
            const newStart = Math.max(0, Math.round((dragState.initialTime + deltaTime) * 50) / 50);
            return {
              ...note,
              pitchMidi: newPitch,
              startTimeSeconds: newStart,
              editedByUser: true,
            };
          } else if (dragState.dragType === 'resize-right') {
            const newDuration = Math.max(0.1, Math.round((dragState.initialDuration + deltaTime) * 50) / 50);
            return { ...note, durationSeconds: newDuration, editedByUser: true };
          } else if (dragState.dragType === 'resize-left') {
            const newStart = Math.max(0, Math.round((dragState.initialTime + deltaTime) * 50) / 50);
            const durationDiff = dragState.initialTime - newStart;
            const newDuration = Math.max(0.1, Math.round((dragState.initialDuration + durationDiff) * 50) / 50);
            return { ...note, startTimeSeconds: newStart, durationSeconds: newDuration, editedByUser: true };
          }
          return note;
        });

        return { ...v, noteEvents: updatedNotes };
      });

      onUpdateVoices(updatedVoices);
    };

    const handleMouseUp = () => {
      if (dragState) {
        // Find current pitch and audition it
        const currentVoice = voices.find((v) => v.id === dragState.voiceId);
        const currentNote = currentVoice?.noteEvents.find((n) => n.id === dragState.noteId);
        if (currentNote) {
          globalAudioEngine.previewNote(currentNote.pitchMidi, 0.35);
        }
        setDragState(null);
      }
    };

    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, voices, pixelsPerSecond, rowHeight, onUpdateVoices]);

  // Transpose selected note
  const transposeSelected = (semitones: number) => {
    if (!selectedNote) return;
    const updated = voices.map((v) => {
      if (v.id !== selectedNote.voiceId) return v;
      return {
        ...v,
        noteEvents: v.noteEvents.map((n) => {
          if (n.id !== selectedNote.noteId) return n;
          const newPitch = Math.max(36, Math.min(96, n.pitchMidi + semitones));
          globalAudioEngine.previewNote(newPitch, 0.4);
          return { ...n, pitchMidi: newPitch, editedByUser: true };
        }),
      };
    });
    onUpdateVoices(updated);
  };

  // Delete selected note
  const deleteSelected = () => {
    if (!selectedNote) return;
    const updated = voices.map((v) => {
      if (v.id !== selectedNote.voiceId) return v;
      return {
        ...v,
        noteEvents: v.noteEvents.filter((n) => n.id !== selectedNote.noteId),
      };
    });
    onUpdateVoices(updated);
    setSelectedNote(null);
  };

  // Toggle Solo / Mute for a voice lane
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

  // Double click in grid to add a note
  const handleGridDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const targetVoiceId = selectedVoiceId || voices[0]?.id;
    if (!targetVoiceId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const time = Math.round(pxToTime(x) * 4) / 4;
    const midi = yToMidi(y);

    const newNote: NoteEvent = {
      id: 'user-' + Math.random().toString(36).substring(2, 9),
      pitchMidi: midi,
      startTimeSeconds: time,
      durationSeconds: 0.6,
      velocity: 90,
      confidence: 1.0,
      source: 'user-edited',
      editedByUser: true,
    };

    const updated = voices.map((v) =>
      v.id === targetVoiceId ? { ...v, noteEvents: [...v.noteEvents, newNote] } : v
    );

    onUpdateVoices(updated);
    setSelectedNote({ voiceId: targetVoiceId, noteId: newNote.id });
    globalAudioEngine.previewNote(midi, 0.4);
  };

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 bg-neutral-950 text-neutral-200 select-none overflow-hidden">
      {/* Visual Editor Toolbar */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-neutral-800/80 bg-neutral-900/60 shrink-0 text-xs">
        {/* Left: Lane legend with solo/mute */}
        <div className="flex items-center gap-2 overflow-x-auto py-0.5">
          <span className="text-neutral-500 font-medium mr-1 text-[11px]">Voices:</span>
          {voices.map((v) => {
            const isSelected = selectedVoiceId === v.id;
            return (
              <div
                key={v.id}
                onClick={() => onSelectVoice && onSelectVoice(v.id)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-neutral-800 border-neutral-600 text-white shadow-sm'
                    : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: v.color }} />
                <span className="font-medium whitespace-nowrap">{v.name.split(' ')[0]}</span>

                {/* Solo / Mute micro toggles */}
                <div className="flex items-center gap-0.5 ml-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSolo(v.id);
                    }}
                    className={`px-1 py-0.2 rounded text-[10px] font-bold ${
                      v.solo ? 'bg-amber-400 text-neutral-950' : 'text-neutral-600 hover:text-neutral-300'
                    }`}
                    title="Solo this voice"
                  >
                    S
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMute(v.id);
                    }}
                    className={`px-1 py-0.2 rounded text-[10px] font-bold ${
                      v.muted ? 'bg-rose-500 text-white' : 'text-neutral-600 hover:text-neutral-300'
                    }`}
                    title="Mute this voice"
                  >
                    M
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Selected Note actions & Zoom controls */}
        <div className="flex items-center gap-2 shrink-0">
          {selectedNote && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-neutral-800/80 rounded-md border border-neutral-700/60 text-[11px]">
              <span className="text-neutral-400 mr-1">Note:</span>
              <button
                onClick={() => transposeSelected(1)}
                className="p-1 hover:bg-neutral-700 rounded text-neutral-200"
                title="Transpose Up 1 Semitone"
              >
                <ArrowUp className="w-3 h-3" />
              </button>
              <button
                onClick={() => transposeSelected(-1)}
                className="p-1 hover:bg-neutral-700 rounded text-neutral-200"
                title="Transpose Down 1 Semitone"
              >
                <ArrowDown className="w-3 h-3" />
              </button>
              <button
                onClick={deleteSelected}
                className="p-1 hover:bg-rose-950/80 text-rose-400 rounded ml-1"
                title="Delete Selected Note (Del)"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Zoom In / Out */}
          <div className="flex items-center gap-1 border-l border-neutral-800 pl-2">
            <button
              onClick={() => setPixelsPerSecond((p) => Math.max(70, p - 20))}
              className="p-1 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded"
              title="Zoom Out (Horizontal)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setPixelsPerSecond((p) => Math.min(260, p + 20))}
              className="p-1 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded"
              title="Zoom In (Horizontal)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Pitch Roll & Piano Container */}
      <div className="flex flex-1 min-h-0 overflow-auto relative" ref={containerRef}>
        {/* Left: Piano Keys Column */}
        <div className="sticky left-0 z-30 w-16 bg-neutral-900 border-r border-neutral-800 shadow-md shrink-0">
          {/* Header spacer for chord & ruler bar */}
          <div className="h-14 border-b border-neutral-800 bg-neutral-950 flex items-center justify-center text-[10px] text-neutral-500 font-mono">
            Pitch
          </div>

          <div style={{ height: editorHeight }} className="relative">
            {pianoKeys.map((k) => (
              <div
                key={k.midi}
                onClick={() => handlePianoKeyClick(k.midi)}
                style={{ height: rowHeight, top: midiToY(k.midi) }}
                className={`absolute w-full px-1.5 flex items-center justify-end text-[10px] font-mono cursor-pointer border-b transition-colors ${
                  k.isBlack
                    ? 'bg-neutral-950 hover:bg-neutral-800 text-neutral-500 border-neutral-900'
                    : 'bg-neutral-900 hover:bg-neutral-700 text-neutral-300 border-neutral-800/60'
                }`}
                title={`Play ${k.name}`}
              >
                {k.name.startsWith('C') || k.midi % 12 === 0 ? (
                  <span className="font-semibold text-amber-400/90">{k.name}</span>
                ) : (
                  <span>{k.name}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Grid, Chords Bar, Ruler, and Note Blocks */}
        <div className="flex flex-col relative" style={{ width: editorWidth }}>
          {/* Top Row: Chords & Timeline Ruler */}
          <div className="sticky top-0 z-20 h-14 bg-neutral-950 border-b border-neutral-800 shrink-0">
            {/* Chord Progression Segment Bar */}
            <div className="h-7 border-b border-neutral-800/60 relative flex items-center">
              {chords.map((chord) => {
                const left = timeToPx(chord.startTimeSeconds);
                const width = timeToPx(chord.durationSeconds);
                return (
                  <div
                    key={chord.id}
                    style={{ left, width }}
                    className="absolute h-full px-2 flex items-center border-r border-neutral-800/80 bg-neutral-900/40 text-amber-300 font-bold text-xs"
                  >
                    <span>{chord.symbol}</span>
                  </div>
                );
              })}
            </div>

            {/* Time Ruler (Seconds & Beat Bars) */}
            <div
              className="h-7 relative cursor-pointer hover:bg-neutral-900/40 transition-colors"
              onClick={handleRulerClick}
            >
              {Array.from({ length: Math.ceil(totalDuration) + 3 }).map((_, sec) => {
                const x = timeToPx(sec);
                return (
                  <div
                    key={sec}
                    style={{ left: x }}
                    className="absolute h-full border-l border-neutral-800/60 flex items-end pb-1 pl-1 text-[10px] font-mono text-neutral-500"
                  >
                    <span>{sec}s</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Note Grid Canvas */}
          <div
            style={{ height: editorHeight, width: editorWidth }}
            className="relative bg-neutral-950 cursor-crosshair"
            onDoubleClick={handleGridDoubleClick}
          >
            {/* Horizontal pitch row guides */}
            {pianoKeys.map((k) => (
              <div
                key={k.midi}
                style={{ top: midiToY(k.midi), height: rowHeight }}
                className={`absolute w-full border-b ${
                  k.isBlack ? 'bg-neutral-950/70 border-neutral-900/40' : 'bg-neutral-900/20 border-neutral-800/30'
                }`}
              />
            ))}

            {/* Vertical time grid lines (every 1 second & quarter beats) */}
            {Array.from({ length: Math.ceil(totalDuration) + 3 }).map((_, sec) => {
              const x = timeToPx(sec);
              return (
                <div
                  key={sec}
                  style={{ left: x }}
                  className="absolute top-0 bottom-0 border-l border-neutral-800/30 pointer-events-none"
                />
              );
            })}

            {/* Render Note Blocks for each voice */}
            {voices.map((voice) => {
              if (voice.muted) return null;

              return voice.noteEvents.map((note) => {
                const left = timeToPx(note.startTimeSeconds);
                const width = Math.max(16, timeToPx(note.durationSeconds));
                const top = midiToY(note.pitchMidi);
                const isSelected = selectedNote?.voiceId === voice.id && selectedNote?.noteId === note.id;

                const intervalLabel =
                  note.intervalFromLead !== undefined && !voice.isLead
                    ? getIntervalName(note.intervalFromLead)
                    : null;

                return (
                  <div
                    key={note.id}
                    onClick={(e) => handleNoteClick(voice.id, note, e)}
                    onMouseDown={(e) => handleMouseDownNote(voice.id, note, 'move', e)}
                    style={{
                      left,
                      top: top + 1,
                      width,
                      height: rowHeight - 2,
                      backgroundColor: voice.color,
                    }}
                    className={`absolute rounded-sm px-1.5 flex items-center justify-between text-[10px] font-medium text-neutral-950 cursor-move shadow-sm select-none transition-shadow group ${
                      isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-neutral-950 z-20' : 'z-10'
                    } ${voice.isLead ? 'font-bold' : ''}`}
                    title={`${voice.name}: ${midiToNoteName(note.pitchMidi)} (${note.startTimeSeconds.toFixed(2)}s - ${(
                      note.startTimeSeconds + note.durationSeconds
                    ).toFixed(2)}s) ${intervalLabel ? `· Interval: ${intervalLabel}` : ''}`}
                  >
                    {/* Left resize handle */}
                    <div
                      onMouseDown={(e) => handleMouseDownNote(voice.id, note, 'resize-left', e)}
                      className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-black/20"
                    />

                    {/* Pitch name and interval label */}
                    <span className="truncate leading-none">
                      {midiToNoteName(note.pitchMidi)}
                      {intervalLabel && <span className="opacity-75 ml-1 text-[9px]">({intervalLabel})</span>}
                    </span>

                    {/* Right resize handle */}
                    <div
                      onMouseDown={(e) => handleMouseDownNote(voice.id, note, 'resize-right', e)}
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-black/20"
                    />
                  </div>
                );
              });
            })}

            {/* Synchronized Playhead Line */}
            <div
              style={{ left: timeToPx(currentTime) }}
              className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-30 pointer-events-none shadow-sm shadow-amber-400/50"
            >
              <div className="w-2.5 h-2.5 -ml-1 bg-amber-400 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
