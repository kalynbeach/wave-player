# WavePlayer - Core Audio Design - 04-05-2025

This document outlines the planned architectural design for the `WavePlayer` core audio engine, focusing on performance, fidelity, and leveraging modern Web APIs. It serves as a blueprint for the `WavePlayer` audio engine implementation.

## Core Principles

The design is guided by the following principles:

1. **Offload Processing:** Shift all intensive audio operations (network fetching, decoding, analysis, buffering) off the main browser thread using a Web Worker to prevent UI freezes and ensure responsiveness.
2. **True Streaming:** Implement chunk-based fetching and decoding (via WebCodecs) to enable playback start before the entire file is downloaded and minimize peak memory usage.
3. **Efficient Playback:** Utilize an AudioWorklet for the lowest latency and most stable audio sample delivery on the dedicated audio rendering thread.
4. **Robust Buffering/Caching:** Implement an intelligent caching strategy (initially LRU) within the worker to manage decoded audio data, handle preloading efficiently, and optimize seeking.
5. **Clear Communication:** Establish well-defined interfaces and message types for communication between the UI layer (React), the Web Worker, and the AudioWorklet.

## Proposed Architecture Overview

The redesigned engine comprises several distinct modules:

1. **UI Layer (React Components & `WavePlayerProvider`):**
    * **Location:** `components/wave-player/*`, `contexts/wave-player-context.tsx`, `hooks/wave-player/use-wave-player.ts`
    * **Responsibility:** Renders the player UI, handles user interactions, displays player state.
    * **`WavePlayerProvider`:**
        * Main thread hub.
        * Manages UI state based on updates from the `AudioWorker`.
        * Instantiates and communicates with the `AudioWorker` via `postMessage`.
        * Instantiates the `AudioWorkletNode` and connects it to the global `AudioContext`.
        * Provides `state` and `controls` via React context.
        * Translates user actions into commands for the `AudioWorker`.

2. **Audio Worker (`lib/wave-player/worker/wave-player.worker.ts`):**
    * **Location:** `lib/wave-player/worker/*`
    * **Responsibility:** The engine's off-thread "brain."
        * **Network Fetching:** Downloads audio chunks (`audio-fetcher.ts`).
        * **Decoding:** Uses WebCodecs `AudioDecoder` (`audio-decoder.ts`).
        * **Buffering/Caching:** Manages an audio data cache (`audio-cache.ts`, initially LRU).
        * **State Management:** Tracks internal engine state (loading, decoding, playback, etc.).
        * **Analysis:** Uses Meyda.js/Tonal.js for visualization features (`audio-analyzer.ts`).
        * **Communication:** Communicates with Provider (`postMessage`) and Worklet (SharedArrayBuffer/RingBuffer).

3. **Audio Worklet (`lib/wave-player/worklet/wave-player.processor.ts`):**
    * **Location:** `lib/wave-player/worklet/wave-player.processor.ts`
    * **Responsibility:** Runs on the high-priority audio rendering thread.
        * **Sample Delivery:** Reads decoded samples from the shared buffer populated by the `AudioWorker`.
        * **Playback:** Fills `AudioContext` output buffers in its `process` method for glitch-free output.
        * **Minimal Logic:** Kept simple to avoid blocking the audio thread.

4. **Communication Channels:**
    * **Provider <-> Worker:** Asynchronous `postMessage` with defined message types (`lib/wave-player/types/worker-messages.d.ts`).
    * **Worker <-> Worklet:** High-performance `SharedArrayBuffer` (likely via a Ring Buffer implementation - `lib/wave-player/worker/ring-buffer.ts`) for audio sample data transfer. Control messages via the worklet's port.

## Data Flow Example (Play Button Click)

1. User clicks Play in UI component.
2. Component calls `controls.play()`.
3. `WavePlayerProvider` sends `{ type: 'PLAY' }` command to `AudioWorker`.
4. `AudioWorker` receives command:
    * Checks/initiates fetch/decode/cache population.
    * Starts transferring samples to shared buffer for Worklet.
    * Sends state/data updates (`STATUS_UPDATE`, `VISUALIZATION_DATA`, `TIME_UPDATE`) back to `WavePlayerProvider`.
5. `AudioWorkletProcessor` reads from shared buffer and outputs audio via `process`.
6. `WavePlayerProvider` updates React state based on received messages.
7. UI re-renders with updated status, time, and visualizations.

## Proposed File Structure

```
wave-player/
├── components/
│   ├── ui/
│   │   └── ...
│   └── wave-player/
│       ├── wave-player.tsx
│       ├── wave-player-track-controls.tsx
│       ├── ... (other UI components)
├── contexts/
│   └── wave-player-context.tsx
├── hooks/
│   └── wave-player/
│       └── use-wave-player.ts
├── lib/
│   ├── wave-player/
│   │   ├── worker/
│   │   │   ├── wave-player.worker.ts   # Main worker logic
│   │   │   ├── audio-cache.ts          # Cache implementation (e.g., LRU)
│   │   │   ├── audio-decoder.ts        # WebCodecs decoding logic wrapper
│   │   │   ├── audio-fetcher.ts        # Chunked fetching logic
│   │   │   ├── audio-analyzer.ts       # Meyda.js/Tonal.js integration
│   │   │   └── ring-buffer.ts          # SharedArrayBuffer ring buffer implementation
│   │   ├── worklet/
│   │   │   └── wave-player.processor.ts # AudioWorkletProcessor implementation
│   │   └── types/
│   │       ├── wave-player.d.ts        # Existing core types (Track, Playlist, State)
│   │       └── worker-messages.d.ts    # Types for messages between Provider and Worker
│   ├── types/
│   │   └── ... (other global types)
│   └── utils.ts
├── public/
│   └── ...
├── app/
│   └── ...
└── ... (package.json, next.config.js, etc.)
```

## Key Decisions & Considerations

* **Complexity:** Acknowledged increase in complexity compared to `decodeAudioData` approach, accepted for performance benefits.
* **Browser Support:** Targeting modern, up-to-date browsers only.
* **Cache Strategy:** Initial implementation using LRU for decoded segments, designed for future swappability.
* **Visualization:** Plan to use Meyda.js and Tonal.js initially, with potential for Three.js integration later. Analysis performed in the worker.
* **Seeking:** Seeking to un-cached/un-decoded sections will involve a noticeable delay while the worker fetches/decodes. This is acceptable initially.

---

## Implementation Plan

This plan progresses from setting up the basic structure to implementing core functionality and finally adding advanced features and refinements.

### Phase 1: Foundational Scaffolding & Communication Setup [Completed]

1. **Define Message Interfaces:**
    * Create `lib/wave-player/types/worker-messages.d.ts`.
    * Define TypeScript interfaces for all commands sent from the Provider to the Worker (e.g., `InitializeCommand`, `LoadCommand`, `PlayCommand`, `PauseCommand`, `SeekCommand`, `SetVolumeCommand`, `SetLoopCommand`, `PreloadCommand`) and all messages sent from the Worker to the Provider (e.g., `InitializedMessage`, `LoadingProgressMessage`, `TrackReadyMessage`, `StatusUpdateMessage`, `TimeUpdateMessage`, `VisualizationDataMessage`, `ErrorMessage`, `TrackEndedMessage`).
2. **Basic Worker Setup:**
    * Create `lib/wave-player/worker/wave-player.worker.ts`.
    * Set up the main `onmessage` handler to receive commands from the Provider.
    * Implement basic handlers for an `INITIALIZE` command and respond with an `INITIALIZED` message.
3. **Basic Worklet Setup:**
    * Create `lib/wave-player/worklet/wave-player.processor.ts`.
    * Define the `WavePlayerProcessor` class extending `AudioWorkletProcessor`.
    * Implement the required `constructor` and `process` method structure (initially just outputting silence).
4. **Provider Integration:**
    * Modify `contexts/wave-player-context.tsx`:
        * Instantiate the `WavePlayerWorker` on initialization.
        * Add logic to add the audio worklet module (`audioContext.audioWorklet.addModule`) using the path to the processor.
        * Instantiate the `AudioWorkletNode` (`new AudioWorkletNode(audioContext, 'wave-player-processor')`).
        * Connect the `AudioWorkletNode` to `audioContext.destination` (consider inserting a `GainNode` here for later volume control).
        * Establish basic `postMessage` communication: send the `INITIALIZE` command to the worker on setup and handle the `INITIALIZED` response.
        * Update the reducer and state to handle basic status like `"initializing"`, `"idle"`.

### Phase 2: Core Audio Data Flow - Fetching & Decoding [Completed]

5. **Chunked Fetching:**
    * Implement `lib/wave-player/worker/audio-fetcher.ts`.
    * Use `fetch` with `ReadableStream` to download audio data in chunks.
    * Provide progress updates based on downloaded bytes vs. `Content-Length`.
6. **WebCodecs Decoding:**
    * Implement `lib/wave-player/worker/audio-decoder.ts`.
    * Wrap the `AudioDecoder` setup and configuration.
    * Handle the transformation of fetched `ArrayBuffer` chunks into `EncodedAudioChunk`s.
    * Manage the decoder's output callback to handle decoded `AudioData`. Define a temporary queue or buffer for this initial stage.
7. **Integrate Fetching/Decoding in Worker:**
    * In `wave-player.worker.ts`, implement the handler for the `LOAD` command.
    * Use the `AudioFetcher` to get the stream.
    * Pipe the stream/chunks to the `AudioDecoder`.
    * Send `LOADING_PROGRESS` messages back to the Provider.
    * Send a `TRACK_READY` message when enough data is decoded to potentially start playback (or upon full decode initially).

### Phase 3: Connecting Worker and Worklet - Data Transfer [Completed - Assumes Stereo]

**Note:** For initial implementation simplicity and performance, the connection currently assumes stereo (2-channel) audio. The worker will throw an error if a non-stereo track is loaded.

8. **Shared Ring Buffer:**
    * Implement `lib/wave-player/worker/ring-buffer.ts` (or use a reliable library). This should use `SharedArrayBuffer` and `Atomics` for thread-safe read/write operations between the worker and worklet. It needs methods for writing samples (likely non-interleaved Float32Array channels) and reading them. **[Done]**
9. **Worker Integration (Write):**
    * In `wave-player.worker.ts` (or `audio-decoder.ts`), modify the decoder output handler to extract raw sample data from `AudioData` objects (validating format 'f32-planar' and 2 channels) and write it into the shared ring buffer. Handle buffer full scenarios (e.g., pause decoding). **[Done]**
10. **Worklet Integration (Read):**
    * In `wave-player.processor.ts`, modify the `process` method:
        * Accept SABs and channel count (hardcoded to 2) via `processorOptions` in the constructor and initialize the `RingBuffer` instance.
        * Read available samples from the shared ring buffer for each channel.
        * Copy the read samples into the corresponding output channel buffers provided by the `process` method.
        * Handle buffer empty scenarios (output silence). **[Done]**

### Phase 4: Basic Playback Control

11. **Implement Play/Pause:**
    * Add state within the worker to track playback status (`idle`, `playing`, `paused`).
    * Implement handlers for `PLAY` and `PAUSE` commands.
    * Use `Atomics` or the worklet's message port to signal the `WavePlayerProcessor` whether it should be actively reading from the ring buffer and outputting audio (`playing`) or outputting silence (`paused`).
    * Send `STATUS_UPDATE` messages (`playing`, `paused`) back to the Provider.
12. **Update Provider:**
    * Update the context reducer and state to handle `playing` and `paused` statuses.
    * Connect UI controls to dispatch `PLAY`/`PAUSE` commands via `controls.play()`/`controls.pause()`.

### Phase 5: Time Synchronization and Track End

13. **Track Playback Time:**
    * Implement logic (likely starting in the worklet and refined in the worker) to accurately track the number of samples processed/played.
    * Calculate the current playback time based on the sample rate.
14. **Report Time Updates:**
    * In the worker, periodically send `TIME_UPDATE` messages containing the current playback time to the Provider.
15. **Handle Track End:**
    * Detect when the decoder has finished *and* the ring buffer has been fully consumed by the worklet.
    * Send a `TRACK_ENDED` message to the Provider.
    * Update the Provider state accordingly (e.g., set status to `ready` or `idle`, reset time).

### Phase 6: Buffering Strategy & Cache Implementation

16. **Implement Cache:**
    * Implement `lib/wave-player/worker/audio-cache.ts` using an LRU (Least Recently Used) strategy initially. It should store segments of decoded audio data (e.g., arrays of `Float32Array` channels) keyed by track ID and time offset/segment index. Enforce the `maxPoolSize`.
17. **Integrate Cache:**
    * Modify the worker's decoding output: store decoded segments in the cache.
    * Modify the worker's logic: fill the shared ring buffer primarily by reading from the cache based on the current playback position.
    * Implement logic to proactively decode and cache data ahead of the current playback position.

### Phase 7: Seeking Functionality

18. **Implement Seek Command:**
    * Handle the `SEEK` command in the worker.
    * Determine the target time. Check if the corresponding audio segment is in the cache.
19. **Cache Hit/Miss Logic:**
    * **Hit:** If cached, update the read position for filling the ring buffer, clear the worklet's internal buffer state (if any), and potentially signal the worklet to restart reading from a specific point.
    * **Miss:** If not cached, potentially clear the ring buffer and cache (or just parts after the seek point), initiate fetching/decoding from the required position, update playback time optimistically, and then refine once data is ready.
20. **Update Provider:**
    * Allow UI slider to dispatch `SEEK` command.
    * Update `currentTime` state immediately for visual feedback, potentially showing a loading state until the seek operation completes in the worker.

### Phase 8: Advanced Features

21. **Volume Control:**
    * Ensure a `GainNode` exists between the `AudioWorkletNode` and the destination.
    * Implement `SET_VOLUME` command handler in the worker.
    * Send messages back to the Provider instructing it to update the `GainNode`'s value.
22. **Preloading:**
    * Implement `PRELOAD` command handler in the worker. Trigger background fetching/decoding/caching for the specified track URL without disrupting the current track.
    * Modify `NEXT_TRACK`/`PREVIOUS_TRACK` handlers to check the cache for preloaded data before initiating a full `LOAD`.
23. **Looping:**
    * Implement `SET_LOOP` command handler in the worker. Store the looping state.
    * Modify the worker's logic for reading from the cache/feeding the ring buffer: when the end of the track is reached and looping is enabled, reset the read position to the beginning.
24. **Audio Analysis:**
    * Implement `lib/wave-player/worker/audio-analyzer.ts` using Meyda.js.
    * Integrate analysis into the worker's decoding/caching path: analyze `AudioData` segments as they become available.
    * Batch analysis results (waveform, frequencies, chroma, etc.).
    * Periodically send `VISUALIZATION_DATA` messages to the Provider.
    * Update Provider state and UI components to display visualizations.

### Phase 9: Refinement, Error Handling, and Cleanup

25. **Error Handling:**
    * Add robust `try...catch` blocks around fetching, decoding, worker/worklet communication, and processing.
    * Define specific error types/codes.
    * Send detailed `ERROR` messages to the Provider.
    * Implement `RETRY_LOAD` command logic in the worker and provider.
26. **Resource Cleanup:**
    * Implement a `CLEANUP` or `TERMINATE` command handler in the worker.
    * Ensure all ongoing fetches are aborted (`AbortController`).
    * Ensure the decoder is reset/closed.
    * Clear caches and buffers.
    * In the Provider, implement cleanup logic (e.g., in `useEffect` return function): terminate the worker (`worker.terminate()`), disconnect audio nodes, potentially close the `AudioContext` if no longer needed globally.

This detailed plan provides a roadmap for the implementation. Each step builds upon the previous ones, starting with the essential plumbing and progressively adding functionality.
