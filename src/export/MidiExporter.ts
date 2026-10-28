/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HarmonyVoice } from '../types/harmony';

/**
 * Standard Type 1 Multi-Track MIDI File Exporter (Pure TypeScript, no dependencies)
 */
export class MidiExporter {
  public static exportToMidi(voices: HarmonyVoice[], tempo = 100): Blob {
    const ppq = 480; // Ticks per quarter note
    const secondsPerQuarter = 60 / tempo;

    // Helper to write variable-length quantity
    const writeVarLen = (value: number): number[] => {
      let buffer = value & 0x7f;
      const bytes: number[] = [];
      while ((value >>= 7)) {
        buffer <<= 8;
        buffer |= (value & 0x7f) | 0x80;
      }
      while (true) {
        bytes.push(buffer & 0xff);
        if (buffer & 0x80) buffer >>= 8;
        else break;
      }
      return bytes;
    };

    // Helper to write 32-bit int
    const write32 = (n: number): number[] => [
      (n >> 24) & 0xff,
      (n >> 16) & 0xff,
      (n >> 8) & 0xff,
      n & 0xff,
    ];

    // Helper to write 16-bit int
    const write16 = (n: number): number[] => [(n >> 8) & 0xff, n & 0xff];

    const tracksData: number[][] = [];

    // Track 0: Tempo and Time Signature
    const tempoTrackBytes: number[] = [];
    // Time signature: 4/4
    tempoTrackBytes.push(0x00, 0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08);
    // Set tempo: microseconds per beat
    const usPerBeat = Math.round(60000000 / tempo);
    tempoTrackBytes.push(
      0x00,
      0xff,
      0x51,
      0x03,
      (usPerBeat >> 16) & 0xff,
      (usPerBeat >> 8) & 0xff,
      usPerBeat & 0xff
    );
    // End of track
    tempoTrackBytes.push(0x00, 0xff, 0x2f, 0x00);
    tracksData.push(tempoTrackBytes);

    // Track 1..N: Each Voice as its own MIDI track
    voices.forEach((voice, vIndex) => {
      const channel = Math.min(15, vIndex);
      const trackBytes: number[] = [];

      // Track Name meta event
      const nameBytes = Array.from(new TextEncoder().encode(voice.name));
      trackBytes.push(0x00, 0xff, 0x03, ...writeVarLen(nameBytes.length), ...nameBytes);

      // Collect note on/off events
      interface MidiEvent {
        tick: number;
        type: 'on' | 'off';
        pitch: number;
        velocity: number;
      }

      const events: MidiEvent[] = [];

      for (const note of voice.noteEvents) {
        const startTick = Math.round((note.startTimeSeconds / secondsPerQuarter) * ppq);
        const durationTicks = Math.round((note.durationSeconds / secondsPerQuarter) * ppq);
        const endTick = startTick + Math.max(10, durationTicks);

        events.push({
          tick: startTick,
          type: 'on',
          pitch: Math.min(127, Math.max(0, note.pitchMidi)),
          velocity: Math.min(127, Math.max(1, note.velocity || 90)),
        });

        events.push({
          tick: endTick,
          type: 'off',
          pitch: Math.min(127, Math.max(0, note.pitchMidi)),
          velocity: 0,
        });
      }

      // Sort events by tick (note off before note on if same tick)
      events.sort((a, b) => {
        if (a.tick !== b.tick) return a.tick - b.tick;
        return a.type === 'off' ? -1 : 1;
      });

      let currentTick = 0;
      for (const ev of events) {
        const delta = Math.max(0, ev.tick - currentTick);
        currentTick = ev.tick;

        trackBytes.push(...writeVarLen(delta));
        if (ev.type === 'on') {
          trackBytes.push(0x90 | channel, ev.pitch, ev.velocity);
        } else {
          trackBytes.push(0x80 | channel, ev.pitch, 0x00);
        }
      }

      // End of track
      trackBytes.push(0x00, 0xff, 0x2f, 0x00);
      tracksData.push(trackBytes);
    });

    // Build complete MIDI binary
    const fileBytes: number[] = [];

    // Header Chunk 'MThd'
    fileBytes.push(0x4d, 0x54, 0x68, 0x64);
    fileBytes.push(...write32(6)); // Header length (6 bytes)
    fileBytes.push(...write16(1)); // Format 1 (multi-track)
    fileBytes.push(...write16(tracksData.length)); // Number of tracks
    fileBytes.push(...write16(ppq)); // Division (ticks per quarter)

    // Tracks chunks 'MTrk'
    for (const tBytes of tracksData) {
      fileBytes.push(0x4d, 0x54, 0x72, 0x6b); // 'MTrk'
      fileBytes.push(...write32(tBytes.length));
      fileBytes.push(...tBytes);
    }

    return new Blob([new Uint8Array(fileBytes)], { type: 'audio/midi' });
  }
}
