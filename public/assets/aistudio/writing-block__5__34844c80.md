# SONORA HarmonyForge — Product Specification & Implementation Plan

## 1. Product vision

Build a singer-first harmony composition and practice application.

A user uploads or records a melody by singing or humming. The application analyses the melody, suggests multiple harmonisations, displays every voice in a clear visual arrangement, and lets the user audition, edit, learn, record and export the resulting parts.

The product must combine three experiences:

1. **Discover:** Find beautiful and musically coherent harmonies without requiring formal music theory.
2. **Understand:** See the notes, intervals, chord relationships and movement of each voice.
3. **Perform:** Practise and record the parts, layer real vocal takes, and export the finished arrangement.

This is a SONORA music product, not simply a pitch-shifting effect.

## 2. Target users

- Singers who want to learn to sing harmony.
- Songwriters who hear harmonies but cannot easily work them out.
- Gospel, worship, soul, R&B, pop and Afro-soul vocal groups.
- Independent music producers creating backing vocals.
- Choir leaders and vocal arrangers.
- Producers experimenting with unconventional vocal stacks.

The application must remain approachable for users who cannot read sheet music.

## 3. Product principles

- The singer's original melody remains unchanged unless the user explicitly edits it.
- Every generated harmony must contain actual musical note events, not decorative visualisations.
- Users can audition individual voices and the complete arrangement.
- The user can change the number of voices without restarting the project.
- Generated parts must be editable.
- Musical uncertainty must be visible and correctable.
- Audio processing must not be faked.
- Projects should work locally wherever practical.
- The architecture must support a future C++/JUCE implementation.
- The application must not require a paid AI API to provide its core harmony-generation functionality.

## 4. Core workflow

### Stage A: Create a project

Offer three entry points:

1. Upload an audio recording.
2. Record a melody using a microphone.
3. Enter or import notes manually, including MIDI.

Supported audio formats should include WAV and MP3 where browser decoding is supported, with FLAC or other formats added only after verification.

The recording workflow should offer:
- Microphone selection where supported.
- Recording timer.
- Input-level meter.
- Playback and retake.
- Optional count-in.
- Clear microphone permission errors.

### Stage B: Analyse the melody

Extract a monophonic melody from the recording.

The analysis engine should estimate:
- Fundamental frequency over time.
- Note-onset and note-offset positions.
- Pitch confidence.
- Voiced and unvoiced sections.
- Note durations.
- Optional tempo and beat alignment.
- Candidate key and scale.

Support both singing and humming. Humming can contain weaker upper harmonics and less obvious consonant boundaries, so it must be included in test data.

Provide an editable melody lane before harmony generation. Allow the user to correct wrong notes, split or merge notes, adjust note boundaries and remove false detections.

If the melody contains overlapping singers or substantial instrumental accompaniment, explain that the extraction may be less reliable and offer a manual correction workflow.

Do not report a key or note as certain when the analysis is ambiguous.

### Stage C: Configure the harmony

Provide a simple setup panel with these controls.

#### Number of voices

Quick selections:
- 2 voices.
- 4 voices.
- 6 voices.
- 8 voices.

Advanced selection: 3, 5 and 7 voices.

The count includes the original lead. Thus, an eight-voice arrangement contains the lead plus seven generated parts.

#### Harmony styles

Include:
- Natural / Simple.
- Pop.
- Gospel / Soul.
- R&B.
- Choir.
- Contemporary Worship.
- Amapiano / Afro-soul.
- Experimental.

These should be musically distinct presets, not just renamed copies of the same interval stack.

Each style should define documented parameters for chord movement, interval preferences, voice independence, rhythmic density, dissonance tolerance and voicing.

Treat genre labels as starting points rather than rigid definitions.

#### Harmony density

- Sparse: long notes, space and fewer changes.
- Balanced: moderate movement.
- Rich: fuller chord tones and extensions.
- Experimental: controlled use of unexpected notes and independent melodic movement.

#### Harmony behaviour

- Stay close to the lead.
- Spread the voices.
- Prefer chord tones.
- Allow independent counter-melodies.
- Sustain notes through lead ornaments where musically appropriate.
- Prefer smooth movement.
- Allow expressive leaps.

#### Key and scale

Offer automatic detection, manual selection and a transpose control. The user must be able to override the detected key.

#### Vocal range

Allow each part to have a low and high comfortable limit.

Offer an optional guided vocal-range calibration. Do not infer a singer's complete range from one short melody.

Range labels should be adjustable and should not assume that all singers of a particular gender have the same vocal range.

### Stage D: Generate harmonies

Generate at least three distinct candidates when enough musical information is available:

1. **Safe:** Simple, singable harmonies.
2. **Rich:** Fuller chord-aware harmony.
3. **Creative:** More independent voice movement and extensions.

Candidates must be genuinely different arrangements.

The harmony engine should:
- Preserve the lead.
- Use scale membership as a guide, not the only rule.
- Prefer notes belonging to the active chord at important musical moments.
- Consider chord progression and harmonic rhythm.
- Minimise awkward leaps where possible.
- Avoid unnecessary voice crossings.
- Maintain appropriate voice spacing.
- Support contrary, oblique and parallel motion when musically appropriate.
- Avoid blindly stacking identical intervals.
- Consider the phrase ending and cadence.
- Avoid excessive duplication of chord tones unless stylistically intentional.
- Keep every part within its configured range where feasible.
- Report when constraints cannot all be satisfied.

For advanced users, display chord symbols and the interval between the lead and each harmony.

The generator must be deterministic for the same project and settings unless the user explicitly requests a new variation. Provide a Generate Variation action.

### Stage E: Visual harmony workspace

This is a defining feature.

Build a horizontally aligned, time-based pitch editor. The horizontal axis represents musical time; the vertical axis represents pitch.

Display:
- Lead melody.
- One separate lane per generated voice.
- Coloured note blocks or pitch curves.
- Shared playhead.
- Optional piano keyboard and pitch labels.
- Optional waveform underneath the musical lanes.
- Phrase boundaries and optional bar lines.
- Chord labels.
- Current key and scale.
- Selected note details.

Use a consistent colour for each voice. The lead should remain visually distinct.

Interaction:
- Click a note to select it.
- Drag a note vertically to change pitch.
- Drag note edges to change duration.
- Move a note horizontally to adjust timing.
- Add and delete notes.
- Undo and redo.
- Solo and mute a lane.
- Select several notes and transpose them.
- Zoom and scroll.
- Reset a generated voice to its original version.
- Compare harmony candidates without losing edits.

Use MUI for the application shell and controls. Use a suitable custom SVG or canvas-based editor for the time/pitch workspace. Keep the editor's musical data independent of its visual representation.

Provide a simpler learning view for singers who do not want to work with a piano roll.

### Stage F: Harmony audition

The application must let the user hear:
- Lead only.
- Each harmony voice separately.
- Any combination of voices.
- Full stack.
- Original recording against the proposed arrangement.
- A/B comparison between candidates.

For the first release, provide reliable synthetic guide voices and/or suitable guide instruments.

Investigate natural-sounding pitch-shifted vocal previews as an additional option. Do not claim the preview is a realistic independently sung performance if it is merely a pitch-shifted copy.

Use a clear mixer with volume, mute, solo and optional pan per voice.

Provide master volume and prevent playback clipping.

### Stage G: Learn and record

Add a dedicated Practice Mode.

The singer should be able to:
- Select a harmony part.
- Hear the part before singing it.
- Loop a phrase.
- Slow playback without changing pitch where supported by the chosen processing method.
- Hear the lead quietly or mute it.
- Record a take against the arrangement.
- Listen to the take.
- Retake one part without losing the others.
- Align takes to a shared timeline.
- Build a stack of their own recorded vocal layers.

Record each take as a separate audio asset. Keep its timeline position and association with its harmony part.

Do not promise automatic vocal tuning or timing correction unless those functions have been implemented and tested.

### Stage H: Export

Support:
- Full arrangement audio mix.
- Individual vocal-guide or recorded-vocal stems.
- MIDI file with a separate track for each voice.
- Project save and reopen.
- Exportable harmony note data.

WAV should be the primary audio export. Add other formats when practical.

Clearly distinguish between:
- Synthesised guide audio.
- Pitch-shifted preview audio.
- Actual recorded singer performances.

Never label a synthetic guide as a real vocal stem.

MIDI export must contain valid note events and preserve each voice's timing, pitch, duration and velocity where applicable. Include tempo and time-signature metadata when known.

## 5. Architecture

Use:
- React.
- TypeScript.
- Vite.
- MUI.
- Web Audio API for playback and supported audio operations.
- Web Workers for computationally expensive analysis where appropriate.
- AudioWorklet for suitable real-time audio processing.
- IndexedDB or another suitable local persistence layer for projects and recordings.

Suggested modules:

src/
  app/
  components/
  features/
    projects/
    audio-import/
    recording/
    melody-analysis/
    melody-editor/
    harmony-settings/
    harmony-generation/
    harmony-visualizer/
    audition/
    practice/
    vocal-takes/
    mixer/
    export/
  audio/
    AudioEngine.ts
    AudioDecoder.ts
    AudioPlaybackEngine.ts
    AudioRecorder.ts
    GuideVoiceEngine.ts
    VocalPreviewEngine.ts
  analysis/
    PitchTracker.ts
    NoteSegmenter.ts
    KeyDetector.ts
    ChordEstimator.ts
    AnalysisConfidence.ts
  harmony/
    HarmonyGenerator.ts
    CandidateGenerator.ts
    ChordProgressionModel.ts
    VoiceLeading.ts
    VocalRangeConstraints.ts
    StyleProfiles.ts
  export/
    MidiExporter.ts
    AudioExporter.ts
    StemExporter.ts
    ProjectSerializer.ts
  workers/
  types/
  utils/

This structure is illustrative. Inspect the actual repository and existing conventions before creating or reorganising files.

## 6. Core data model

Represent a project using a versioned, serialisable model.

Project:
- id
- schemaVersion
- title
- createdAt
- updatedAt
- audioAssetReferences
- leadNotes
- detectedKey
- selectedKey
- tempo
- timeSignature
- harmonySettings
- harmonyCandidates
- selectedCandidateId
- recordedTakes
- mixerSettings
- exportSettings

NoteEvent:
- id
- pitchMidi
- startTimeSeconds
- durationSeconds
- velocity
- confidence
- source
- editedByUser

HarmonyVoice:
- id
- name
- role
- colourToken
- rangeMinimumMidi
- rangeMaximumMidi
- noteEvents
- gain
- pan
- muted
- solo
- isLead

Use stable identifiers. Keep note data independent from audio rendering and UI state.

## 7. Harmony-generation implementation

Build a rule-based, testable engine first.

Suggested pipeline:

1. Validate and segment the lead melody.
2. Estimate or accept the chord progression.
3. Generate candidate chord voicings for each harmonic moment.
4. Allocate notes to the requested voice count.
5. Apply range and spacing constraints.
6. Evaluate transitions between successive voicings.
7. Prefer smooth and musically coherent voice-leading.
8. Add style-specific movement and density.
9. Refine phrase endings and sustained notes.
10. Score and rank candidates.
11. Return editable note events with explanations of the selected voicings.

Use a documented scoring function with configurable weights for:
- Chord compatibility.
- Smoothness of voice-leading.
- Vocal range.
- Voice spacing.
- Independence of parts.
- Melodic contour.
- Style profile.
- Dissonance.
- Repetition and variation.

These weights should be configurable and testable, not scattered across UI components.

For ambiguous melodies, generate alternative chord progressions where feasible and let the user choose. Do not invent certainty.

## 8. Audio-analysis strategy

Evaluate at least one dedicated monophonic vocal pitch tracker against real samples before committing to a dependency.

Test:
- Humming.
- Soft singing.
- Strong singing.
- Vibrato.
- Breathy notes.
- Fast note changes.
- Long sustained notes.
- Pitch slides.
- Room noise.
- Accompaniment underneath the vocal.
- Recordings at different sample rates.

Spotify Basic Pitch TypeScript may be evaluated as an alternative transcription engine, but benchmark it against a dedicated vocal pitch tracker for this use case. Check current package compatibility, model size, browser performance and licensing obligations.

All imported audio should be decoded and resampled appropriately by the chosen engine. Avoid blocking the UI during analysis.

Provide confidence estimates and a manual correction workflow. Never silently replace a questionable detected pitch with an apparently certain answer.

## 9. Future C++/JUCE portability

Keep the following concepts independent from React:
- Note representation.
- Chord and scale logic.
- Harmony generation.
- Voice-leading evaluation.
- Vocal-range constraints.
- Style profiles.
- Project serialization.

Document algorithms and units. Keep browser-specific audio APIs behind interfaces.

The future native implementation may replace the browser pitch tracker and preview engine with C++ components, but it should reuse the same musical rules and data model where practical.

Do not put the entire harmony algorithm inside React components. Do not assume browser audio libraries can be reused directly in a native VST3.

## 10. Testing and acceptance criteria

### Analysis
- Analyse clean hummed and sung single-note melodies.
- Report note and pitch confidence.
- Handle silent and unvoiced sections.
- Allow manual corrections.
- Do not crash on unsupported or corrupt audio files.

### Harmony
- Generate the requested total voice count.
- Preserve the original lead unless edited.
- Respect configured voice ranges when feasible.
- Produce different candidates when alternatives are musically available.
- Avoid systematic parallel copies of the lead.
- Keep each part editable and independently playable.
- Handle ambiguous keys and chords transparently.

### Playback and recording
- Solo and mute work correctly.
- Full-stack playback stays within safe output levels.
- Recorded takes remain aligned after reopening the project.
- Re-recording one part does not delete other takes.

### Export
- MIDI contains all selected voice tracks.
- Audio exports contain the intended tracks.
- Individual stems match the arrangement timeline.
- Reimporting a saved project restores notes, settings and takes.

### Interface
- All controls are functional.
- The visual editor updates from the underlying musical data.
- Undo and redo restore previous note states.
- Loading, errors and analysis progress are visible.
- Keyboard and pointer interaction remain responsive during analysis.

## 11. Delivery phases

Phase 0 — Repository audit and technical proof:
Evaluate pitch trackers, browser performance, audio decoding and a minimal harmony-generation algorithm.

Phase 1 — Import and melody analysis:
Import or record a melody, detect notes, display confidence, and correct notes manually.

Phase 2 — Harmony engine:
Generate two-, four-, six- and eight-voice arrangements with range constraints, chord awareness and voice-leading.

Phase 3 — Visual harmony workspace:
Build aligned pitch lanes, selection, editing, playback controls, undo and redo.

Phase 4 — Audition and comparison:
Implement voice isolation, mixer, candidate switching and reliable guide playback.

Phase 5 — Practice and vocal recording:
Record and align independent takes, loop phrases and build the user's own vocal stack.

Phase 6 — Export and persistence:
Implement project saving, MIDI export, audio mixdown and individual stems.

Phase 7 — Polish and portability:
Improve performance, error handling, testing, documentation and C++/JUCE architecture boundaries.

## 12. First milestone

The first milestone is complete when a user can:

1. Upload a short humming or singing recording.
2. Obtain an editable representation of the detected melody.
3. Choose two, four, six or eight total voices.
4. Generate multiple musically distinct harmony arrangements.
5. See every part in a clear visual timeline.
6. Solo and audition each part and the full arrangement.
7. Edit a harmony note and hear the change.
8. Save and reopen the project.

Prioritise musical correctness and a delightful visual experience over advanced AI branding. Do not begin with video generation, social features, accounts or cloud infrastructure.

## 13. Licensing and commercial readiness

Before adopting any external model, package, source repository or audio-processing library, verify its current licence, dependencies, redistribution conditions and any restrictions on model weights.

Maintain a third-party software inventory. Do not copy GPL or AGPL code into a proprietary SONORA product without an explicit licensing decision. An open-source reference is not automatically safe to reuse commercially.

## Final product goal

HarmonyForge should make harmony feel discoverable: sing a line, see the possibilities, hear the difference, learn the part and turn it into a real vocal arrangement.