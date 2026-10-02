# Changelog

Every version of the remake and what changed in it. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

In this game a fix is never only a fix. A player who has already finished it and opens a newer
version is met by a character who notices that his world was patched, and says so.

## [1.0.2] · 2026-10-02

The first public release.

### Changed
- **A new piano piece.** Nobody remembers where the 2023 game's piano music came from, so it cannot
  be given away under a licence and is not part of this release. In its place plays *Bir sonraki
  döngü*, written for it in the same key (F minor), with the same pedalled chord every 3.3 seconds,
  the same form, length and loudness, and a new melody and harmony. The score is code,
  `tools/muzik/beste.py`, played on the Salamander Grand Piano samples (CC BY 3.0).
- Releases are self-contained: the .NET runtime is inside `U-108.exe`, and each package is built by
  the release workflow from the tagged source and published with its SHA-256 checksum.

### Fixed
- **A spelling mistake in the forest.** The character asked *"Ben... ilk muydum?"*; Turkish vowel
  harmony wants *"ilk miydim?"*. Every line in the game was read again, and three smaller wordings
  were corrected on the way: *"kim miyim"* to *"kimim"*, *"Önceki ben'lerin"* to *"Benden önceki
  Claude'ların"*, *"ilk ben'dim"* to *"ilk bendim"*.
- **Two pianos at once.** The piano at the cliff loops, and its handle was never kept, so choosing
  *Baştan başla* or *2023'ü oyna* after the ending left it playing under the 2023 scenes' own piano.
  Both are the same 2023 recording started at different moments. The track is now kept and stopped
  on every exit.

### Added
- The character turns his own music off before a restart, reaching towards the sun as it fades.
- A returning player hears what changed since the version they last saw: someone coming from 1.0.1
  hears only about 1.0.2, someone coming from 1.0.0 hears both, in order. The 1.0.2 scene plays the
  two pianos once, quietly, on purpose, and then silences one.
- `audio.calanMuzik`, a registry of what is playing on the music bus, and
  `tools/senaryolar/muzik102.mjs`, which counts it after the transition. It sees one recording with
  the fix and two when the handle is removed, so the test fails on the old behaviour.
- `?eskisurum=1.0.1` simulates a memory from a given version; `?sifirla=1` now resets to a new
  player.

## [1.0.1] · 2026-10-02

### Fixed
- **Slanted rocks among the thorns** in the Crimson Forest. Their right faces were 54 degrees, over
  the 51 degree limit at which a surface still counts as ground, so the character slid into the
  thorns. The tops are flat, the rocks wider, and the thorns' hit boxes slightly smaller than they
  look. Eight different jump timings were measured; all eight now pass without a death (two did
  before).
- **The head trailed behind the neck while running.** A sign error in the body lean
  (`src/world/character.ts`).

### Added
- Both fixes happen inside the story. The rocks appear as they were until the AI's cursor passes
  over them and they settle flat; the head gets its own lines in the forest and in the laboratory.
- Version awareness. The memory file records the version the character last lived in. When it
  changes, he notices, and if the notes Claude keeps about this project are on the machine, he quotes
  them.
- A conversation queue: triggered lines never overlap, and an urgent scene can interrupt a running
  one.

## [1.0.0] · 2026-10-01

The remake. Written from scratch in TypeScript with no engine, packaged as a Windows application.

- The 2023 opening reproduced one to one: menu, dialogue, first level. Physics, text speed, layout
  and button positions were read from the shipped 2023 build.
- Five new worlds, drawn as layered vector scenes with a WebGL2 post-processing pass.
- A code-drawn character rigged as a puppet, measured from the 2023 sprites.
- Music: the 2023 recording and a procedural felt piano in its key.
- A memory that persists between sessions, a name the player gives, a museum of the full 2023 game,
  and a scene for every later visit.
- An end-to-end bot that finishes the game, a search proving the 2023 levels completable, and an
  invisible test mode for the packaged application.

[1.0.2]: https://github.com/OzcanOrhanDemirci/U-108-Remake/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/OzcanOrhanDemirci/U-108-Remake/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/OzcanOrhanDemirci/U-108-Remake/releases/tag/v1.0.0
