/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChordSegment, HarmonyCandidate, HarmonySettings, HarmonyVoice, NoteEvent, VoiceRole } from '../types/harmony';
import { NOTE_NAMES, VOICE_PALETTES, getClosestScaleTone } from '../utils/musicTheory';
import { STYLE_PROFILES } from './StyleProfiles';
import { VoiceLeading } from './VoiceLeading';

export class HarmonyEngine {
  /**
   * Generates Safe, Rich, and Creative harmony candidates from the lead notes
   */
  public generateCandidates(leadNotes: NoteEvent[], settings: HarmonySettings): HarmonyCandidate[] {
    if (leadNotes.length === 0) {
      return [];
    }

    // 1. Generate chord progression for the melody
    const chords = this.estimateChordProgression(leadNotes, settings);

    // 2. Generate Candidate 1: Safe (diatonic, close, singable)
    const safeCandidate = this.buildCandidate('safe', 'Safe & Singable', leadNotes, chords, settings);

    // 3. Generate Candidate 2: Rich (lush chord extensions, fuller voicings)
    const richCandidate = this.buildCandidate('rich', 'Rich & Expressive', leadNotes, chords, settings);

    // 4. Generate Candidate 3: Creative (counter-melodies, contrary motion, distinct pads)
    const creativeCandidate = this.buildCandidate('creative', 'Creative & Modern', leadNotes, chords, settings);

    return [safeCandidate, richCandidate, creativeCandidate];
  }

  /**
   * Estimate harmonic progression across the timeline
   */
  public estimateChordProgression(leadNotes: NoteEvent[], settings: HarmonySettings): ChordSegment[] {
    const totalDuration = leadNotes.reduce((max, n) => Math.max(max, n.startTimeSeconds + n.durationSeconds), 0);
    const chords: ChordSegment[] = [];

    // Group into 2-second or 4-second harmonic bars
    const barDuration = 2.0;
    const numBars = Math.max(1, Math.ceil(totalDuration / barDuration));

    const keyRoot = settings.key || 'C';
    const isMinor = settings.scale === 'minor';
    const rootIndex = Math.max(0, NOTE_NAMES.indexOf(keyRoot));

    for (let b = 0; b < numBars; b++) {
      const startTime = b * barDuration;
      const notesInBar = leadNotes.filter(
        (n) => n.startTimeSeconds >= startTime && n.startTimeSeconds < startTime + barDuration
      );

      // Pitch classes present in this bar
      const pcs = new Set(notesInBar.map((n) => ((Math.round(n.pitchMidi) % 12) + 12) % 12));

      let chordRoot = keyRoot;
      let quality: ChordSegment['quality'] = isMinor ? 'min' : 'maj';
      let symbol = `${keyRoot}${isMinor ? 'm' : ''}`;

      // Smart progression heuristics based on scale degrees and style
      if (settings.style === 'gospel' || settings.style === 'rnb') {
        const gospelDegrees = isMinor
          ? [
              { root: 0, quality: 'min7' as const, name: 'm7' },
              { root: 5, quality: 'min7' as const, name: 'm7' },
              { root: 7, quality: '7' as const, name: '7' },
              { root: 10, quality: 'maj7' as const, name: 'maj7' },
            ]
          : [
              { root: 0, quality: 'maj7' as const, name: 'maj7' },
              { root: 9, quality: 'min7' as const, name: 'm7' },
              { root: 2, quality: 'min7' as const, name: 'm7' },
              { root: 7, quality: '7' as const, name: '7' },
            ];
        const step = gospelDegrees[b % gospelDegrees.length];
        chordRoot = NOTE_NAMES[(rootIndex + step.root) % 12];
        quality = step.quality;
        symbol = `${chordRoot}${step.name}`;
      } else if (settings.style === 'worship') {
        // I - V - vi - IV suspended
        const worshipSteps = [
          { root: 0, quality: 'sus4' as const, name: 'sus4' },
          { root: 7, quality: 'maj' as const, name: '' },
          { root: 9, quality: 'min' as const, name: 'm' },
          { root: 5, quality: 'add9' as const, name: 'add9' },
        ];
        const step = worshipSteps[b % worshipSteps.length];
        chordRoot = NOTE_NAMES[(rootIndex + step.root) % 12];
        quality = step.quality;
        symbol = `${chordRoot}${step.name}`;
      } else {
        // Standard Diatonic I - IV - V - vi
        const diatonicSteps = isMinor
          ? [
              { root: 0, quality: 'min' as const, name: 'm' },
              { root: 3, quality: 'maj' as const, name: '' },
              { root: 5, quality: 'min' as const, name: 'm' },
              { root: 7, quality: 'min' as const, name: 'm' },
            ]
          : [
              { root: 0, quality: 'maj' as const, name: '' },
              { root: 7, quality: 'maj' as const, name: '' },
              { root: 9, quality: 'min' as const, name: 'm' },
              { root: 5, quality: 'maj' as const, name: '' },
            ];
        const step = diatonicSteps[b % diatonicSteps.length];
        chordRoot = NOTE_NAMES[(rootIndex + step.root) % 12];
        quality = step.quality;
        symbol = `${chordRoot}${step.name}`;
      }

      chords.push({
        id: `chord-${b}`,
        startTimeSeconds: startTime,
        durationSeconds: Math.min(barDuration, totalDuration - startTime),
        root: chordRoot,
        quality,
        symbol,
      });
    }

    return chords;
  }

  /**
   * Build a single candidate arrangement
   */
  private buildCandidate(
    type: 'safe' | 'rich' | 'creative',
    title: string,
    leadNotes: NoteEvent[],
    chords: ChordSegment[],
    settings: HarmonySettings
  ): HarmonyCandidate {
    const totalVoices = Math.max(2, Math.min(8, settings.voiceCount || 4));
    const styleProfile = STYLE_PROFILES[settings.style] || STYLE_PROFILES.natural;

    // Build the voices
    const voices: HarmonyVoice[] = [];

    // Voice 1: Lead Melody (always preserved verbatim)
    const leadVoice: HarmonyVoice = {
      id: 'lead',
      name: 'Lead Vocal',
      role: 'lead',
      color: VOICE_PALETTES[0].color,
      rangeMinimumMidi: 48,
      rangeMaximumMidi: 84,
      noteEvents: leadNotes.map((n) => ({ ...n })),
      gain: 0.9,
      pan: 0,
      muted: false,
      solo: false,
      isLead: true,
    };
    voices.push(leadVoice);

    // Roles sequence for harmony parts (up to 7 extra voices)
    const roleDefinitions: { role: VoiceRole; name: string; defaultPan: number }[] = [
      { role: 'soprano', name: 'High Harmony (Soprano)', defaultPan: 0.25 },
      { role: 'alto', name: 'Upper Harmony (Alto)', defaultPan: -0.25 },
      { role: 'tenor', name: 'Mid Harmony (Tenor)', defaultPan: 0.4 },
      { role: 'bass', name: 'Bass Harmony (Bass)', defaultPan: 0.0 },
      { role: 'harmony-high', name: 'Air / Top Stack', defaultPan: -0.45 },
      { role: 'harmony-mid', name: 'Warm Pad Fill', defaultPan: 0.55 },
      { role: 'counter-melody', name: 'Counter Melody', defaultPan: -0.55 },
    ];

    const harmonyVoicesNeeded = totalVoices - 1;

    for (let v = 0; v < harmonyVoicesNeeded; v++) {
      const def = roleDefinitions[v % roleDefinitions.length];
      const palette = VOICE_PALETTES[(v + 1) % VOICE_PALETTES.length];
      const range = VoiceLeading.getDefaultRangeForRole(def.role);

      const voiceId = `voice-${v + 1}`;
      const generatedNotes: NoteEvent[] = [];

      // Generate notes for this voice based on candidate type
      this.generateNotesForVoice(
        generatedNotes,
        leadNotes,
        chords,
        v,
        totalVoices,
        type,
        settings,
        styleProfile,
        range
      );

      voices.push({
        id: voiceId,
        name: def.name,
        role: def.role,
        color: palette.color,
        rangeMinimumMidi: range.min,
        rangeMaximumMidi: range.max,
        noteEvents: generatedNotes,
        gain: 0.75,
        pan: def.defaultPan,
        muted: false,
        solo: false,
        isLead: false,
      });
    }

    // Compute intervals from lead
    VoiceLeading.computeIntervalsFromLead(leadNotes, voices);

    // Compute scores
    const singability = type === 'safe' ? 95 : type === 'rich' ? 84 : 76;
    const richness = type === 'rich' ? 96 : type === 'creative' ? 90 : 72;
    const voiceLeadingScore = Math.round(
      voices.reduce((acc, v) => acc + VoiceLeading.evaluateSmoothness(v.noteEvents), 0) / voices.length
    );

    const description =
      type === 'safe'
        ? 'Diatonic close harmony emphasizing consonant 3rds and 6ths. Easy to sight-sing, natural vocal blend.'
        : type === 'rich'
        ? 'Lush harmonic voicings with full 7th/9th extensions, rich inner parts and wide stereo spacing.'
        : 'Counterpoint movement with contrary melodic lines, stylistic suspensions and dynamic voice independence.';

    return {
      id: `cand-${type}-${Date.now().toString(36)}`,
      candidateType: type,
      title,
      description,
      voices,
      chords,
      score: {
        singability,
        richness,
        voiceLeading: voiceLeadingScore,
      },
    };
  }

  /**
   * Generate notes for an individual harmony voice
   */
  private generateNotesForVoice(
    outNotes: NoteEvent[],
    leadNotes: NoteEvent[],
    chords: ChordSegment[],
    voiceIndex: number,
    totalVoices: number,
    candidateType: 'safe' | 'rich' | 'creative',
    settings: HarmonySettings,
    _styleProfile: any,
    range: { min: number; max: number }
  ): void {
    const key = settings.key || 'C';
    const scale = settings.scale || 'major';

    // Interval offsets based on voice slot and candidate type
    // Slot 0 (soprano / high): typically +3 or +4 semitones (diatonic third)
    // Slot 1 (alto): typically -3 or -4 or +7
    // Slot 2 (tenor): typically -5 or -7 (fifth below or fourth below)
    // Slot 3 (bass): root movement or -12 octave / -8 fifth
    const diatonicStepOffsets: Record<'safe' | 'rich' | 'creative', number[][]> = {
      safe: [
        [3, 4],   // Voice 1: 3rd above
        [-3, -4], // Voice 2: 3rd below / 6th inverted
        [-5, -7], // Voice 3: 5th below
        [-12],    // Voice 4: Octave bass
        [7],      // Voice 5: 5th above
        [-8, -9], // Voice 6: 6th below
        [9, 10],  // Voice 7: 6th above
      ],
      rich: [
        [4, 7],   // Voice 1: rich 3rd / 5th
        [-3, 2],  // Voice 2: 9th / 3rd below
        [-7, -5], // Voice 3: 5th below
        [-12, -10], // Voice 4: 7th root bass
        [11, 12], // Voice 5: 7th extension
        [2, 3],   // Voice 6: 9th extension
        [-9, -5], // Voice 7: warm pad
      ],
      creative: [
        [5, 7],   // Voice 1: 4th / 5th contrary
        [-4, -6], // Voice 2: contrary motion
        [9, 11],  // Voice 3: high counterpoint
        [-12, -7], // Voice 4: rhythmic bass
        [2, 4],   // Voice 5: step suspension
        [-5, 7],  // Voice 6: oblique drone
        [14, 16], // Voice 7: top ethereal counter
      ],
    };

    const targetOffsets = diatonicStepOffsets[candidateType][voiceIndex % 7] || [4];

    // For Creative or Gospel styles with high counter-melody, sustain through short notes
    const isSustainedPad =
      (candidateType === 'creative' || settings.style === 'worship') && (voiceIndex === 2 || voiceIndex === 3);

    if (isSustainedPad && leadNotes.length > 2) {
      // Create longer sustained notes anchored to chords
      for (const chord of chords) {
        const chordNotes = leadNotes.filter(
          (n) => n.startTimeSeconds >= chord.startTimeSeconds && n.startTimeSeconds < chord.startTimeSeconds + chord.durationSeconds
        );
        if (chordNotes.length === 0) continue;

        const basePitch = chordNotes[0].pitchMidi;
        const offset = targetOffsets[0];
        let candidatePitch = basePitch + offset;
        candidatePitch = getClosestScaleTone(candidatePitch, key, scale);
        candidatePitch = VoiceLeading.fitPitchToRange(candidatePitch, range.min, range.max);

        outNotes.push({
          id: `hnote-${voiceIndex}-${chord.id}`,
          pitchMidi: candidatePitch,
          startTimeSeconds: chord.startTimeSeconds,
          durationSeconds: chord.durationSeconds,
          velocity: 80,
          confidence: 0.95,
          source: 'generated',
        });
      }
      return;
    }

    // Standard synchronous or parallel/contrary note generation
    for (let i = 0; i < leadNotes.length; i++) {
      const lNote = leadNotes[i];
      let offset = targetOffsets[i % targetOffsets.length];

      // Contrary motion in Creative mode: when lead moves up, move down
      if (candidateType === 'creative' && i > 0) {
        const leadDelta = lNote.pitchMidi - leadNotes[i - 1].pitchMidi;
        if (leadDelta > 0) {
          offset = -Math.abs(offset);
        } else if (leadDelta < 0) {
          offset = Math.abs(offset);
        }
      }

      let pitch = lNote.pitchMidi + offset;

      // Fit to scale
      pitch = getClosestScaleTone(pitch, key, scale);

      // Fit to configured vocal range for this part
      pitch = VoiceLeading.fitPitchToRange(pitch, range.min, range.max);

      outNotes.push({
        id: `hnote-${voiceIndex}-${lNote.id}`,
        pitchMidi: pitch,
        startTimeSeconds: lNote.startTimeSeconds,
        durationSeconds: lNote.durationSeconds,
        velocity: Math.max(50, Math.round(lNote.velocity * 0.9)),
        confidence: lNote.confidence,
        source: 'generated',
      });
    }
  }
}
