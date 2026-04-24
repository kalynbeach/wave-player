# WavePlayer current-state deep-dive review

Date: 2026-04-24

## Scope

Reviewed the current repo state with three parallel exploration passes plus local verification. Focus areas:

- Web audio architecture and runtime boundaries
- Worker, AudioWorklet, SharedArrayBuffer, and ring-buffer implementation
- React/provider integration and user-facing transport behavior
- Build, test, deployment, and docs health

## Executive summary

WavePlayer has a serious and interesting architecture: React owns orchestration, a Worker owns fetch/decode/PCM conversion, an AudioWorklet owns realtime rendering, and SharedArrayBuffer avoids copying audio frames across the realtime boundary.

The current implementation is not yet a reliable player. It is closer to an advanced prototype with several strong pieces in place and several incomplete or unsafe transport paths. The largest issues are lifecycle churn on track load, incomplete seek/time/end semantics, ring-buffer overflow/drop behavior, and WAV streaming correctness. The architecture is salvageable, but the next work should narrow scope to one robust format path first, most likely WAV/PCM, before expanding codec support.

## Current architecture

### Main thread

`contexts/wave-player-context.tsx` creates and owns:

- `AudioContext`
- `GainNode`
- `Worker`
- `AudioWorkletNode`
- audio data `SharedArrayBuffer`
- state/control `SharedArrayBuffer`
- React reducer state and public controls

It posts commands to the worker (`INITIALIZE`, `LOAD`, `PLAY`, `PAUSE`, `SEEK`, `SET_LOOP`, etc.) and expects status/progress messages back.

### Worker

`lib/wave-player/worker/wave-player.worker.ts` owns:

- track loading state
- WAV header parsing
- WAV PCM conversion to planar `Float32Array`
- basic WebCodecs wrapper path for non-WAV formats
- ring-buffer writes
- atomic play/pause state writes

For WAV, it fetches a byte range for the header, calculates duration, marks the track ready, then streams the data chunk into the ring buffer.

For non-WAV, it guesses a WebCodecs config from extension and pushes fetched bytes into `EncodedAudioChunk`.

### AudioWorklet

`lib/wave-player/worklet/wave-player.processor.ts` owns realtime output. It:

- constructs a `RingBuffer` over the same SABs
- polls `PLAYBACK_STATE_INDEX`
- reads 128-frame blocks
- copies planar float samples to output
- outputs silence when paused, starved, or uninitialized

### Shared memory contract

`lib/wave-player/worker/ring-buffer.ts` stores:

- read pointer
- write pointer
- playback state
- planar channel buffers in one shared data SAB

This is a good base for a low-copy player. The missing piece is a stronger producer/consumer policy: the worker currently pushes as fast as fetch/decode allows, and full writes drop data.

## What is strong

- The separation between orchestration, loading/decoding, and realtime rendering is directionally right.
- The realtime thread does very little work: atomic state read, ring-buffer read, output copy.
- The code has explicit types for the command/message protocol.
- The WAV path handles 16-bit, 24-bit, 32-bit integer PCM, and 32-bit float PCM.
- COOP/COEP headers are configured in `next.config.ts`, which is required for SharedArrayBuffer.
- `bun run build` passes on the reviewed state.

## Critical findings

### P1: track load can recreate the whole audio runtime

`handleWorkerMessage` depends on `state.currentTrack?.id`, and the initialization effect depends on `handleWorkerMessage`. Calling `load()` dispatches `SET_TRACK`, which changes the current track id, which can rerun the effect and tear down/recreate the Worker, Worklet, and AudioContext while the load is in flight.

Evidence:

- `contexts/wave-player-context.tsx:190`
- `contexts/wave-player-context.tsx:239`
- `contexts/wave-player-context.tsx:243`
- `contexts/wave-player-context.tsx:484`

Impact: loading or switching tracks can race itself, abort work, reset audio state, and make playback unreliable.

Recommended fix: make the audio runtime effect mount-only. Keep current track id in a ref for message validation instead of closing over it in the worker message callback.

### P1: seek strands the UI

The provider sets status to `seeking` before posting `SEEK`. The worker logs `SEEK` as unimplemented and sends no recovery status. Controls treat `seeking` as loading, so the UI can disable itself indefinitely after slider commit.

Evidence:

- `contexts/wave-player-context.tsx:534`
- `components/wave-player-track-controls.tsx:36`
- `lib/wave-player/worker/wave-player.worker.ts:1162`

Recommended fix: either disable seek until implemented, or implement seek as a first-class command that clears/repositions the ring buffer and returns `ready`/`playing`/`paused`.

### P1: no playback clock or end signal

The provider handles `TIME_UPDATE` and `TRACK_ENDED`, but the worker/worklet never emit them. The WAV path explicitly leaves end detection as TODO.

Evidence:

- `contexts/wave-player-context.tsx:217`
- `contexts/wave-player-context.tsx:220`
- `lib/wave-player/worker/wave-player.worker.ts:745`

Impact: progress will not reflect actual playback, natural track completion is not represented, and loop/next behavior cannot be correct.

Recommended fix: add a playback position counter tied to frames consumed by the worklet, then report time/end through a throttled side channel.

### P1: fetch chunks may include wrong bytes

`AudioFetcher` passes `value.buffer` to callbacks. `ReadableStream` chunks are `Uint8Array` views; their backing `ArrayBuffer` can be larger than the valid byte window.

Evidence:

- `lib/wave-player/worker/audio-fetcher.ts:80`

Impact: WAV conversion or WebCodecs input can receive extra bytes, corrupting parsing or decoding.

Recommended fix: pass `value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength)` or change callbacks to accept `Uint8Array`.

### P1: WAV streaming loses frame alignment

Each fetched WAV chunk is independently interpreted as whole PCM frames using `Math.floor(chunkBuffer.byteLength / bytesPerFrame)`. Stream boundaries are arbitrary; leftover bytes are discarded instead of carried into the next chunk.

Evidence:

- `lib/wave-player/worker/wave-player.worker.ts:602`
- `lib/wave-player/worker/wave-player.worker.ts:607`

Impact: if any chunk ends mid-frame, all following data can become sample/channel misaligned.

Recommended fix: keep a small carry buffer for trailing bytes and prepend it to the next chunk before conversion.

### P1: ring-buffer overflow drops audio

The worker fetches/decodes as fast as possible. If the ring buffer is full, writes fail and whole chunks are dropped. The WAV path marks the track ready before data is streamed, and paused playback does not drain the ring.

Evidence:

- `lib/wave-player/worker/ring-buffer.ts:121`
- `lib/wave-player/worker/wave-player.worker.ts:712`
- `lib/wave-player/worker/wave-player.worker.ts:714`

Impact: longer tracks or fast networks can truncate audio before playback starts. A 30MB stereo f32 buffer is roughly 82 seconds at 48kHz.

Recommended fix: implement backpressure or windowed range loading. For a first robust version, fetch only enough PCM to maintain a target buffer horizon, and resume fetching as the worklet drains.

### P1: sample-rate mismatch

The main thread creates an `AudioContext` with `sampleRate: 48000`, but WAV tracks can declare any sample rate. The worklet copies samples directly without resampling.

Evidence:

- `contexts/wave-player-context.tsx:34`
- `lib/wave-player/worker/wave-player.worker.ts:522`
- `lib/wave-player/worklet/wave-player.processor.ts:162`

Impact: non-48kHz sources can play at the wrong speed/pitch.

Recommended fix: either only accept files matching the context sample rate, create the context at the track sample rate where feasible, or add resampling.

## Important findings

### P2: WAV header parser is too narrow

The header fetch requests bytes `0-99` and requires both `fmt ` and `data` chunks in that window. Valid WAV files often include `LIST`, `JUNK`, `bext`, or extended metadata before `data`.

Evidence:

- `lib/wave-player/worker/wave-player.worker.ts:322`
- `lib/wave-player/worker/wave-player.worker.ts:422`

Recommended fix: parse chunks incrementally until `fmt ` and `data` are found, with a sane maximum header scan size.

### P2: non-WAV decode path is aspirational

The worker guesses codec config by file extension, then wraps arbitrary fetched container bytes as `EncodedAudioChunk` with timestamp `0`. Normal MP3/Ogg/AAC handling needs demuxing, codec-specific config, frame boundaries, and timestamps.

Evidence:

- `lib/wave-player/worker/wave-player.worker.ts:99`
- `lib/wave-player/worker/wave-player.worker.ts:804`

Recommendation: remove non-WAV claims for now, or introduce a demuxer/decoder strategy explicitly.

### P2: worklet messages are ignored

The processor posts `PROCESSOR_READY` and `ERROR`, but the provider never listens to `workletNode.port.onmessage`.

Evidence:

- `lib/wave-player/worklet/wave-player.processor.ts:79`
- `lib/wave-player/worklet/wave-player.processor.ts:91`
- `contexts/wave-player-context.tsx:333`

Impact: render-thread errors do not reach React state.

### P2: worker/worklet URL construction is risky

Build scripts output to `public/workers` and `public/worklets`, but runtime constructs `new URL("../public/...", import.meta.url)`. Next serves public assets from root paths.

Evidence:

- `scripts/build-worker.ts:3`
- `scripts/build-worklet.ts:3`
- `contexts/wave-player-context.tsx:284`
- `contexts/wave-player-context.tsx:304`

Recommendation: use stable public URLs (`/workers/wave-player.worker.js`, `/worklets/wave-player.processor.js`) unless Next-specific bundling is intentionally desired and verified.

### P2: deployment assumptions are not guarded

COOP/COEP headers exist, but the app does not check `crossOriginIsolated`, `SharedArrayBuffer`, `AudioWorklet`, or WebCodecs support before initializing.

Evidence:

- `next.config.ts:7`
- `contexts/wave-player-context.tsx:250`

Recommendation: add capability checks with clear error states. Also document S3 CORS, Range, and COEP/CORP requirements for remote audio.

### P2: generated audio support and docs overstate current behavior

Some docs describe MP3 support, smooth controls, track/playlist management, and realtime visualization. Current code has a placeholder visual component, no working seek/time/end contract, and unreliable non-WAV decoding.

Evidence:

- `docs/wave-player.md:7`
- `components/wave-player-track-visual.tsx:5`
- `lib/wave-player/worker/wave-player.worker.ts:99`

Recommendation: treat older docs as historical notes until updated.

## Project health

- `bun run build` passes.
- `bun run build:wave-player` passes.
- `bun run test` fails because no test files exist.
- `bun run lint` was reported by a subagent as passing, with a `next lint` deprecation warning.
- `audio-cache.ts` and `audio-analyzer.ts` are empty files.
- Vitest is configured, but there are no tests for the most risk-heavy code: ring buffer, WAV parsing, fetch chunk handling, worker protocol, or playback state transitions.

## Recommended recovery plan

1. Stabilize runtime lifecycle.
   - Make provider initialization mount-only.
   - Move current track validation into refs.
   - Listen for worklet port messages.
   - Add capability checks.

2. Choose one supported playback target.
   - Recommend: stereo WAV/PCM only for the next milestone.
   - Remove or clearly gate non-WAV decode until demuxing exists.

3. Make WAV streaming correct.
   - Fix `AudioFetcher` byte slicing.
   - Add frame-boundary carry handling.
   - Parse WAV headers beyond 100 bytes.
   - Validate sample rate strategy.

4. Add buffer policy.
   - Avoid fetching the full audio stream into a fixed ring.
   - Implement backpressure or range-window refill.
   - Reset playback atomic on load/cleanup.

5. Implement transport semantics.
   - Playback clock.
   - End detection.
   - Seek.
   - Loop.
   - Track change behavior.

6. Add targeted tests.
   - `RingBuffer` wraparound, full/empty, clear.
   - `AudioFetcher` byte-window behavior.
   - WAV header parser with metadata chunks.
   - WAV frame carry handling.
   - Worker state-machine command tests where practical.

## Suggested next milestone

Make "play one local or remote stereo WAV correctly" the milestone:

- supported sample rate documented or resampled
- no runtime reinitialization on load
- no chunk corruption
- no frame misalignment
- no buffer overflow drops during normal playback
- play/pause/time/end work
- seek disabled until implemented or fully working
- browser support errors are visible

That milestone would turn the current prototype into a dependable foundation. After that, add seek/loop and only then revisit non-WAV codec support.
