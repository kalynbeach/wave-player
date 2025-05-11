/// <reference lib="webworker" />
/// <reference types="@types/dom-webcodecs" />

import type {
  WavePlayerStatus,
  WavePlayerTrack,
  WavePlayerTrackHeaderInfo,
} from "../types/wave-player";
import type {
  ProviderCommand,
  WorkerMessage,
  InitializeCommand,
  LoadCommand,
} from "../types/worker-messages";
import { AudioFetcher } from "./audio-fetcher";
import { AudioDecoderWrapper } from "./audio-decoder";
import { RingBuffer, PLAYBACK_STATE_INDEX } from "./ring-buffer";

console.log("[WavePlayer Worker] Initializing worker...");

// === State ===
let isInitialized = false;
let ringBufferDataSab: SharedArrayBuffer | null = null;
let stateBufferSab: SharedArrayBuffer | null = null;
let stateBufferView: Int32Array | null = null;
let ringBuffer: RingBuffer | null = null;
let currentTrack: WavePlayerTrack | null = null;
let currentTrackId: string | null = null;
let audioFetcher: AudioFetcher | null = null;
let audioDecoder: AudioDecoderWrapper | null = null;
let abortController: AbortController | null = null;
let currentStatus: WavePlayerStatus = "initializing";
let totalDecodedDuration = 0;
let reportedTrackReady = false;
let expectedChannels = 0;
let expectedSampleRate = 0;
let currentWavHeaderInfo: WavePlayerTrackHeaderInfo | null = null;

// === Command Handlers ===

/**
 * Handles the INITIALIZE command.
 * Stores necessary shared buffers and confirms initialization.
 * @param command The initialize command containing the ring buffer and state buffer.
 */
function handleInitialize(command: InitializeCommand): void {
  if (isInitialized) {
    console.warn("[WavePlayer Worker] Worker already initialized.");
    return;
  }
  console.log("[WavePlayer Worker] Initializing with SABs...");

  if (!command.ringBufferSab || command.ringBufferSab.byteLength === 0) {
    console.error("[WavePlayer Worker] Invalid RingBuffer Data SAB received.");
    postWorkerMessage({
      type: "ERROR",
      message: "Initialization failed: Invalid audio data buffer.",
    });
    return;
  }
  if (!command.stateBufferSab || command.stateBufferSab.byteLength === 0) {
    console.error("[WavePlayer Worker] Invalid State SAB received.");
    postWorkerMessage({
      type: "ERROR",
      message: "Initialization failed: Invalid state buffer.",
    });
    return;
  }

  ringBufferDataSab = command.ringBufferSab;
  stateBufferSab = command.stateBufferSab;

  isInitialized = true;
  if (stateBufferSab) {
    stateBufferView = new Int32Array(stateBufferSab);
    Atomics.store(stateBufferView, PLAYBACK_STATE_INDEX, 0);
  } else {
    console.error(
      "[WavePlayer Worker] State SAB is null after assignment in handleInitialize!"
    );
    postWorkerMessage({
      type: "ERROR",
      message: "Initialization failed: Internal state buffer error.",
    });
    return;
  }

  updateStatus("idle");
  console.log("[WavePlayer Worker] Initialization complete, SABs stored.");
  postWorkerMessage({ type: "INITIALIZED" });
}

/**
 * Placeholder function to guess decoder config based on URL/MIME type.
 * This is a VERY basic implementation for Phase 2.
 * Needs significant improvement (e.g., using a library like `file-type`
 * or parsing container data if possible).
 */
function guessDecoderConfig(url: string): AudioDecoderConfig | null {
  // Extremely naive check based on file extension
  if (url.endsWith(".mp3")) {
    return {
      codec: "mp3",
      // These are common defaults, but might be wrong!
      sampleRate: 44100, // Will be updated by first AudioData
      numberOfChannels: 2, // Will be updated by first AudioData
      // description: undefined, // Optional: for more complex codecs like Opus
    };
  } else if (url.endsWith(".ogg") || url.endsWith(".opus")) {
    // Opus requires description, often obtained from container metadata (Vorbis comments)
    // which we don't have yet. Assume a basic Opus config.
    // Might fail if it's actually Vorbis audio in Ogg.
    console.warn(
      "[WavePlayer Worker] Guessing Opus config for Ogg - might need description."
    );
    return {
      codec: "opus", // Could also be 'vorbis'
      sampleRate: 48000,
      numberOfChannels: 2,
    };
  } else if (url.endsWith(".aac")) {
    return {
      codec: "aac",
      sampleRate: 44100,
      numberOfChannels: 2,
    };
  } else if (url.endsWith(".flac")) {
    // FLAC can be in native FLAC or Ogg container. WebCodecs often uses 'flac' codec string.
    return {
      codec: "flac",
      sampleRate: 44100,
      numberOfChannels: 2,
    };
  } else if (url.endsWith(".wav") || url.endsWith(".wave")) {
    // WebCodecs typically handles PCM directly, might need different handling
    // Or use a specific codec string like 'pcm-f32le' if supported
    console.warn(
      "[WavePlayer Worker] WAV/PCM support via WebCodecs might be limited or require specific codec strings."
    );
    // Placeholder - This might fail, WAV often doesn't need a decoder in the same way
    return {
      codec: "pcm-float", // This isn't typically used for decoder config but kept for placeholder consistency
      sampleRate: 48000, // Will be overwritten by header parse for WAV
      numberOfChannels: 2, // Will be overwritten by header parse for WAV
    };
  }

  console.error(
    `[WavePlayer Worker] Could not guess decoder config for URL: ${url}`
  );
  return null;
}

/**
 * Handles the LOAD command.
 * Determines if the track is WAV or other format and delegates accordingly.
 */
async function handleLoad(command: LoadCommand): Promise<void> {
  if (!isInitialized) {
    postWorkerMessage({
      type: "ERROR",
      message: "Worker not initialized. Cannot load track.",
    });
    return;
  }

  // Check if the track is WAV
  if (command.track.src.toLowerCase().endsWith(".wav")) {
    console.log(
      "[WavePlayer Worker] Handling LOAD for WAV format track:",
      command.track.src
    );
    // Call the dedicated WAV handler (which now includes fetching/parsing/ringbuffer init/fetch start)
    await handleLoadWav(command); // Await potentially async operations inside
  } else {
    console.log(
      `[WavePlayer Worker] Handling LOAD command for non-WAV format: ${command.track.title}`
    );
    cleanupCurrentTrack(); // Cleanup previous track resources
    updateStatus("stopped");

    currentTrack = command.track;
    currentTrackId = command.track.id;
    updateStatus("loading");

    abortController = new AbortController();

    // Guess decoder config for non-WAV formats
    const guessedConfig = guessDecoderConfig(currentTrack.src);
    if (!guessedConfig) {
      postWorkerMessage({
        type: "ERROR",
        message: `Could not determine decoder configuration for ${currentTrack.src}`,
        trackId: currentTrackId,
      });
      updateStatus("error");
      cleanupCurrentTrack(); // Cleanup needed here too
      return;
    }

    // Initialize and configure the AudioDecoderWrapper
    try {
      audioDecoder = new AudioDecoderWrapper({
        onDecoded: handleDecodedChunk, // Use the original handler for decoded AudioData
        onError: handleDecodeError, // Use the original handler for decoder errors
      });
      await audioDecoder.configure(guessedConfig);

      // Initialize the AudioFetcher for encoded chunks
      audioFetcher = new AudioFetcher({
        onChunk: handleFetchedChunk, // Use the original handler for encoded chunks
        onComplete: handleFetchComplete, // Use the original handler for fetch complete
        onError: handleFetchError, // Use the original handler for fetch errors
        onProgress: handleFetchProgress,
      });
      // Fetch the whole file for the decoder path
      audioFetcher.fetchAudio(currentTrack.src);
    } catch (configError) {
      console.error(
        "[WavePlayer Worker] Failed to configure decoder during LOAD:",
        configError
      );
      postWorkerMessage({
        type: "ERROR",
        message: `Audio decoder setup failed: ${configError instanceof Error ? configError.message : String(configError)}`,
        trackId: currentTrackId,
        error:
          configError instanceof Error
            ? configError
            : new Error(String(configError)),
      });
      updateStatus("error");
      cleanupCurrentTrack();
    }
  }
}

// === Helper Functions ===

/**
 * Posts a message back to the main thread (WavePlayerProvider).
 * @param message The message object to send.
 */
function postWorkerMessage(message: WorkerMessage): void {
  // console.log("[WavePlayer Worker] Posting message:", message.type, message); // Verbose logging
  self.postMessage(message);
}

/**
 * Updates the internal status and posts a STATUS_UPDATE message.
 * @param status The new status.
 */
function updateStatus(status: WavePlayerStatus): void {
  if (status === currentStatus) return; // Avoid redundant updates
  console.log(
    `[WavePlayer Worker] Status changing: ${currentStatus} -> ${status}`
  );
  currentStatus = status;
  postWorkerMessage({
    type: "STATUS_UPDATE",
    status: currentStatus,
    trackId: currentTrackId ?? undefined,
  });
}

/**
 * Cleans up resources associated with the current fetch/decode cycle.
 * @returns void
 */
function cleanupCurrentTrack(): void {
  console.log("[WavePlayer Worker] Cleaning up current track resources...");
  if (abortController) {
    abortController.abort(); // Abort any ongoing fetch
    abortController = null;
  }
  if (audioDecoder) {
    audioDecoder.close(); // Close the decoder
    audioDecoder = null;
  }
  if (audioFetcher) {
    // Also abort the WAV fetcher if it exists
    audioFetcher.abort();
    audioFetcher = null;
  }
  currentTrack = null;
  currentTrackId = null;
  totalDecodedDuration = 0;
  reportedTrackReady = false;
  expectedChannels = 0;
  expectedSampleRate = 0;
  currentWavHeaderInfo = null; // Reset WAV header info too

  if (ringBuffer) {
    ringBuffer.clear();
    ringBuffer = null;
    console.log("[WavePlayer Worker] RingBuffer cleared and reset.");
  }
}

/** Helper to read ASCII strings from DataView */
function getString(view: DataView, offset: number, length: number): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += String.fromCharCode(view.getUint8(offset + i));
  }
  return result;
}

/**
 * Fetches the initial part of a WAV file and parses its header.
 * Supports 16, 24, and 32-bit (integer/float) stereo PCM WAV files.
 * @param url The URL of the WAV file.
 * @returns A promise resolving to the parsed header info or null on error.
 */
async function fetchAndParseHeader(
  url: string
): Promise<WavePlayerTrackHeaderInfo | null> {
  console.log("[WavePlayer Worker] Fetching track header for:", url);
  abortController = new AbortController();

  try {
    const response = await fetch(url, {
      signal: abortController.signal,
      headers: { Range: "bytes=0-99" },
    });

    if (!response.ok) {
      throw new Error(
        `HTTP error fetching header: ${response.status} ${response.statusText}`
      );
    }
    if (!response.body) {
      throw new Error("Response body is null.");
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength < 44) {
      throw new Error("Downloaded header data is too small.");
    }

    const view = new DataView(buffer);

    if (getString(view, 0, 4) !== "RIFF")
      throw new Error("Invalid WAV file: Missing 'RIFF' marker.");
    if (getString(view, 8, 4) !== "WAVE")
      throw new Error("Invalid WAV file: Missing 'WAVE' marker.");

    let offset = 12;
    let fmtChunkFound = false;
    let dataChunkFound = false;
    const headerInfo: Partial<WavePlayerTrackHeaderInfo> = {};

    while (offset < view.byteLength - 8) {
      const chunkId = getString(view, offset, 4);
      const chunkSize = view.getUint32(offset + 4, true);

      if (chunkId === "fmt ") {
        console.log(
          `[WavePlayer Worker] Found 'fmt ' chunk at offset ${offset}, size ${chunkSize}`
        );
        if (chunkSize < 16) throw new Error("'fmt ' chunk size is too small.");

        headerInfo.format = view.getUint16(offset + 8, true);
        headerInfo.numChannels = view.getUint16(offset + 10, true);
        headerInfo.sampleRate = view.getUint32(offset + 12, true);
        headerInfo.byteRate = view.getUint32(offset + 16, true);
        headerInfo.blockAlign = view.getUint16(offset + 20, true);
        headerInfo.bitsPerSample = view.getUint16(offset + 22, true);
        fmtChunkFound = true;

        // --- Validation ---
        if (headerInfo.format !== 1 && headerInfo.format !== 3) {
          // Allow PCM (1) and IEEE Float (3)
          throw new Error(
            `Unsupported WAV format code: Expected PCM (1) or IEEE Float (3), got ${headerInfo.format}`
          );
        }
        if (headerInfo.numChannels !== 2) {
          // Keep stereo check for now - Multi-channel support requires RingBuffer/Worklet changes
          throw new Error(
            `Unsupported channel count: Expected Stereo (2), got ${headerInfo.numChannels}`
          );
        }
        if (![16, 24, 32].includes(headerInfo.bitsPerSample)) {
          // Allow 16, 24, 32
          throw new Error(
            `Unsupported bit depth: Expected 16, 24, or 32-bit, got ${headerInfo.bitsPerSample}`
          );
        }
        if (headerInfo.format === 3 && headerInfo.bitsPerSample !== 32) {
          throw new Error(
            `Invalid format combination: IEEE Float (3) requires 32-bit depth, got ${headerInfo.bitsPerSample}`
          );
        }
        console.log(
          "[WavePlayer Worker] Parsed 'fmt ' chunk (validation passed):",
          headerInfo
        );
      } else if (chunkId === "data") {
        console.log(
          `[WavePlayer Worker] Found 'data' chunk at offset ${offset}, size ${chunkSize}`
        );
        headerInfo.dataOffset = offset + 8;
        headerInfo.dataSize = chunkSize;
        dataChunkFound = true;
        console.log("[WavePlayer Worker] Parsed 'data' chunk info:", {
          dataOffset: headerInfo.dataOffset,
          dataSize: headerInfo.dataSize,
        });
      } else {
        console.log(
          `[WavePlayer Worker] Skipping chunk '${chunkId}' at offset ${offset}`
        );
      }

      if (fmtChunkFound && dataChunkFound) break;

      offset += 8 + chunkSize;
      if (chunkSize % 2 !== 0) offset++;
    }

    if (!fmtChunkFound)
      throw new Error("Could not find 'fmt ' chunk in header.");
    if (!dataChunkFound)
      throw new Error("Could not find 'data' chunk in header.");

    if (
      headerInfo.format === undefined ||
      headerInfo.numChannels === undefined ||
      headerInfo.sampleRate === undefined ||
      headerInfo.byteRate === undefined ||
      headerInfo.blockAlign === undefined ||
      headerInfo.bitsPerSample === undefined ||
      headerInfo.dataOffset === undefined ||
      headerInfo.dataSize === undefined
    ) {
      throw new Error("Failed to parse all required WAV header fields.");
    }

    console.log(
      "[WavePlayer Worker] Successfully parsed WAV header:",
      headerInfo
    );
    return headerInfo as WavePlayerTrackHeaderInfo;
  } catch (error) {
    console.error(
      "[WavePlayer Worker] Error fetching or parsing WAV header:",
      error
    );
    const errorMessage = error instanceof Error ? error.message : String(error);
    postWorkerMessage({
      type: "ERROR",
      message: `Failed to load WAV header: ${errorMessage}`,
      trackId: currentTrackId ?? undefined,
      error: error instanceof Error ? error : new Error(errorMessage),
    });
    updateStatus("error");
    cleanupCurrentTrack();
    return null;
  }
}

/**
 * Handles the loading of a WAV track.
 * @param command The load command containing the track to load.
 */
async function handleLoadWav(command: LoadCommand) {
  cleanupCurrentTrack();

  currentTrack = command.track;
  currentTrackId = command.track.id;
  updateStatus("loading");

  abortController = new AbortController();

  currentWavHeaderInfo = null;
  const parsedHeader = await fetchAndParseHeader(currentTrack.src);

  if (!parsedHeader) {
    console.error(
      "[WavePlayer Worker] Failed to parse WAV header for:",
      currentTrack.src
    );
    return;
  }

  currentWavHeaderInfo = parsedHeader;
  expectedChannels = currentWavHeaderInfo.numChannels;
  expectedSampleRate = currentWavHeaderInfo.sampleRate;

  console.log(
    `[WavePlayer Worker] WAV header processed. Expecting ${expectedChannels} channels @ ${expectedSampleRate}Hz.`
  );

  // Step 3: Initialize RingBuffer for WAV
  if (!stateBufferSab || !ringBufferDataSab) {
    console.error(
      "[WavePlayer Worker] Cannot initialize RingBuffer: SharedArrayBuffers not available."
    );
    postWorkerMessage({
      type: "ERROR",
      message: "Internal error: Audio buffers unavailable for WAV processing.",
      trackId: currentTrackId,
    });
    updateStatus("error");
    cleanupCurrentTrack(); // Clean up as we cannot proceed
    return;
  }

  try {
    console.log("[WavePlayer Worker] Initializing RingBuffer for WAV...");
    ringBuffer = new RingBuffer(
      stateBufferSab,
      ringBufferDataSab,
      expectedChannels
    );
    ringBuffer.clear();
    console.log("[WavePlayer Worker] RingBuffer initialized and cleared.");

    // Calculate duration
    let duration = 0;
    if (currentWavHeaderInfo.byteRate > 0) {
      duration = currentWavHeaderInfo.dataSize / currentWavHeaderInfo.byteRate;
    } else {
      console.warn(
        "[WavePlayer Worker] Cannot calculate duration: byteRate is zero in WAV header."
      );
    }
    console.log(`[WavePlayer Worker] Calculated WAV duration: ${duration}s`);

    // Notify provider that track is ready
    postWorkerMessage({
      type: "TRACK_READY",
      trackId: currentTrackId,
      duration: duration,
      sampleRate: expectedSampleRate,
      numberOfChannels: expectedChannels,
    });
    reportedTrackReady = true;
    updateStatus("ready"); // Update status to ready
  } catch (error) {
    console.error(
      "[WavePlayer Worker] Failed to initialize RingBuffer for WAV:",
      error
    );
    const message = error instanceof Error ? error.message : String(error);
    postWorkerMessage({
      type: "ERROR",
      message: `Failed to prepare audio buffer for WAV: ${message}`,
      trackId: currentTrackId,
      error: error,
    });
    updateStatus("error");
    cleanupCurrentTrack();
    return; // Stop WAV loading process
  }

  // TODO: Step 4: Stream & Process WAV Data (Phase 1, Step 4)
  // Instantiate the AudioFetcher for the WAV data chunk
  audioFetcher = new AudioFetcher({
    onChunk: handleFetchedWavChunk,
    onComplete: handleWavFetchComplete,
    onError: handleWavFetchError,
    onProgress: handleFetchProgress, // Reuse existing progress handler
  });

  // Start fetching the audio data chunk using the Range header
  const dataEnd =
    currentWavHeaderInfo.dataOffset + currentWavHeaderInfo.dataSize - 1;
  const fetchOptions: RequestInit = {
    headers: { Range: `bytes=${currentWavHeaderInfo.dataOffset}-${dataEnd}` },
  };
  console.log(
    `[WavePlayer Worker] Starting fetch for WAV data chunk: bytes=${currentWavHeaderInfo.dataOffset}-${dataEnd}`
  );
  audioFetcher.fetchAudio(currentTrack.src, fetchOptions);
}

// === Fetch & Decode Callbacks ===

// --- NEW WAV CALLBACKS (Phase 1, Step 4) ---

/**
 * Handles a chunk of raw PCM data fetched for a WAV file.
 * Converts 16-bit interleaved stereo data to f32-planar and writes to the RingBuffer.
 * @param chunkBuffer The ArrayBuffer containing the raw PCM data.
 */
function handleFetchedWavChunk(chunkBuffer: ArrayBuffer): void {
  if (!ringBuffer || !currentTrackId) {
    console.warn(
      "[WavePlayer Worker] Skipping fetched WAV chunk: RingBuffer not ready or track changed."
    );
    return;
  }
  if (!currentWavHeaderInfo) {
    console.error(
      "[WavePlayer Worker] Skipping fetched WAV chunk: Missing header info."
    );
    return;
  }

  // Now use the stored header info for format details
  const { bitsPerSample, numChannels, format } = currentWavHeaderInfo;
  const bytesPerSample = bitsPerSample / 8;
  const bytesPerFrame = bytesPerSample * numChannels;
  // Ensure we only process whole frames
  const numFrames = Math.floor(chunkBuffer.byteLength / bytesPerFrame);

  if (numFrames <= 0 || chunkBuffer.byteLength === 0) {
    // console.log("[WavePlayer Worker] Received empty or invalid size WAV chunk.");
    return;
  }

  // Ensure planarData is correctly typed
  const planarData: Float32Array[] = [];
  for (let i = 0; i < numChannels; ++i) {
    planarData.push(new Float32Array(numFrames));
  }

  const view = new DataView(chunkBuffer);

  try {
    // De-interleave and convert based on bit depth and format
    switch (bitsPerSample) {
      case 16:
        // Existing 16-bit logic
        for (let i = 0; i < numFrames; ++i) {
          for (let ch = 0; ch < numChannels; ++ch) {
            const sampleOffset = (i * numChannels + ch) * bytesPerSample;
            // Read Int16, normalize to Float32
            planarData[ch][i] = view.getInt16(sampleOffset, true) / 32768.0;
          }
        }
        break;

      case 24:
        // 24-bit Integer PCM handling
        for (let i = 0; i < numFrames; ++i) {
          for (let ch = 0; ch < numChannels; ++ch) {
            const sampleOffset = (i * numChannels + ch) * bytesPerSample;
            // Read 3 bytes (little-endian)
            const byte1 = view.getUint8(sampleOffset);
            const byte2 = view.getUint8(sampleOffset + 1);
            const byte3 = view.getUint8(sampleOffset + 2);

            // Combine into a 32-bit signed integer (manual sign extension)
            let intValue = byte1 | (byte2 << 8) | (byte3 << 16);
            if (intValue & 0x800000) {
              // Check if the 24th bit (sign bit) is set
              intValue |= 0xff000000; // Extend the sign to 32 bits
            }

            // Normalize Int24 [-8388608, 8388607] to Float32 [-1.0, 1.0]
            // Use 8388608.0 (2^23) for normalization divisor
            planarData[ch][i] = intValue / 8388608.0;
          }
        }
        break;

      case 32:
        if (format === 1) {
          // 32-bit Integer PCM
          for (let i = 0; i < numFrames; ++i) {
            for (let ch = 0; ch < numChannels; ++ch) {
              const sampleOffset = (i * numChannels + ch) * bytesPerSample;
              // Read Int32, normalize to Float32
              // Use 2147483648.0 (2^31) for normalization divisor
              planarData[ch][i] =
                view.getInt32(sampleOffset, true) / 2147483648.0;
            }
          }
        } else if (format === 3) {
          // 32-bit Float (IEEE Float)
          for (let i = 0; i < numFrames; ++i) {
            for (let ch = 0; ch < numChannels; ++ch) {
              const sampleOffset = (i * numChannels + ch) * bytesPerSample;
              // Read Float32 directly - no normalization needed
              planarData[ch][i] = view.getFloat32(sampleOffset, true);
            }
          }
        } else {
          // Should not happen if header parsing validation is correct
          throw new Error(
            `Unsupported format code ${format} for 32-bit depth.`
          );
        }
        break;

      default:
        // Should not happen if header parsing validation is correct
        throw new Error(`Unsupported bit depth: ${bitsPerSample}`);
    }

    // --- VALIDATION START ---
    let hasInvalidData = false;
    for (let ch = 0; ch < numChannels; ++ch) {
      for (let i = 0; i < numFrames; ++i) {
        const sample = planarData[ch][i];
        if (isNaN(sample) || !isFinite(sample)) {
          console.error(
            `[WavePlayer Worker] Invalid float detected in WAV chunk! Channel: ${ch}, Frame: ${i}, Value: ${sample}, BitDepth: ${bitsPerSample}, Format: ${format}`
          );
          hasInvalidData = true;
          // Optional: Break outer loop too if desired
          break;
        }
      }
      if (hasInvalidData) break;
    }
    // --- VALIDATION END ---

    // Only write if data is valid
    if (!hasInvalidData) {
      if (!ringBuffer?.write(planarData)) {
        console.warn(
          `[WavePlayer Worker] RingBuffer full while writing WAV data. Dropping ${numFrames} frames.`
        );
      }
    } else {
      console.warn(
        `[WavePlayer Worker] Skipping write of WAV chunk due to invalid data.`
      );
      // Decide if you want to treat this as a fatal error or just skip the chunk
      // postWorkerMessage({ type: "ERROR", ... });
      // updateStatus("error");
      // cleanupCurrentTrack();
    }
  } catch (error) {
    console.error("[WavePlayer Worker] Error processing WAV chunk:", error);
    postWorkerMessage({
      type: "ERROR",
      message: `Error processing WAV audio data: ${error instanceof Error ? error.message : String(error)}`,
      trackId: currentTrackId,
      error: error,
    });
    updateStatus("error");
    cleanupCurrentTrack(); // Stop processing on error
  }
}

/**
 * Handles the completion of WAV data fetching.
 * @returns void
 */
function handleWavFetchComplete(): void {
  console.log("[WavePlayer Worker] WAV data fetch complete.");
  // Status should already be 'ready' or potentially 'playing'/'paused'
  // If it was 'loading', something went wrong earlier.
  if (currentStatus === "loading") {
    console.warn(
      "[WavePlayer Worker] WAV fetch complete, but status was still 'loading'. Setting to 'ready'."
    );
    updateStatus("ready");
  }
  // TODO: Implement proper TRACK_ENDED logic based on buffer state and playback position later.
  // We don't necessarily transition state here, the worklet consuming data handles playback end.
}

/**
 * Handles errors during WAV data fetching.
 * @param error The error that occurred during the fetch.
 */
function handleWavFetchError(error: Error): void {
  console.error("[WavePlayer Worker] WAV data fetch failed:", error);
  // Ignore AbortError as it's expected during cleanup or track change
  if (error.name === "AbortError") {
    console.log("[WavePlayer Worker] WAV data fetch aborted.");
    return;
  }
  postWorkerMessage({
    type: "ERROR",
    message: `WAV data fetch failed: ${error.message}`,
    trackId: currentTrackId ?? undefined,
    error: error,
  });
  updateStatus("error");
  cleanupCurrentTrack();
}

/**
 * Handles progress updates during audio data fetching.
 * @param downloadedBytes The number of bytes downloaded so far.
 * @param totalBytes The total number of bytes to download, or null if unknown.
 */
function handleFetchProgress(
  downloadedBytes: number,
  totalBytes: number | null
): void {
  if (!currentTrackId) return;
  const progress = totalBytes ? downloadedBytes / totalBytes : 0;
  postWorkerMessage({
    type: "LOADING_PROGRESS",
    trackId: currentTrackId,
    progress: Math.max(0, Math.min(1, progress)),
    downloadedBytes,
    totalBytes,
  });
}

/**
 * Handles a chunk of encoded audio data fetched from the provider.
 * @param chunkBuffer The ArrayBuffer containing the encoded audio data.
 */
function handleFetchedChunk(chunkBuffer: ArrayBuffer): void {
  if (!audioDecoder || !currentTrackId) return;

  try {
    const encodedChunk = new EncodedAudioChunk({
      type: "key",
      timestamp: 0,
      duration: undefined,
      data: chunkBuffer,
    });

    audioDecoder.decodeChunk(encodedChunk);
  } catch (error) {
    console.error(
      "[WavePlayer Worker] Error creating/decoding fetched chunk:",
      error
    );
    postWorkerMessage({
      type: "ERROR",
      message: "Failed to process audio chunk",
      trackId: currentTrackId,
      error: error instanceof Error ? error : new Error(String(error)),
    });
    updateStatus("error");
    cleanupCurrentTrack();
  }
}

/**
 * Handles the completion of audio data fetching.
 * @returns void
 */
async function handleFetchComplete(): Promise<void> {
  console.log("[WavePlayer Worker] Fetch complete.");

  if (audioDecoder) {
    try {
      await audioDecoder.flush();

      console.log("[WavePlayer Worker] Decoder flushed after fetch complete.");
      console.log("[WavePlayer Worker] currentStatus: ", currentStatus);
      console.log("[WavePlayer Worker] currentTrackId: ", currentTrackId);
      console.log(
        "[WavePlayer Worker] totalDecodedDuration: ",
        totalDecodedDuration
      );
      console.log("[WavePlayer Worker] expectedChannels: ", expectedChannels);
      console.log(
        "[WavePlayer Worker] expectedSampleRate: ",
        expectedSampleRate
      );

      if (
        !reportedTrackReady &&
        currentTrackId &&
        totalDecodedDuration > 0 &&
        expectedChannels > 0 &&
        expectedSampleRate > 0
      ) {
        postWorkerMessage({
          type: "TRACK_READY",
          trackId: currentTrackId,
          duration: totalDecodedDuration / 1_000_000,
          sampleRate: expectedSampleRate,
          numberOfChannels: expectedChannels,
        });
        reportedTrackReady = true;
        if (currentStatus === "loading") {
          updateStatus("ready");
        }
      } else if (!reportedTrackReady && currentTrackId) {
        console.warn(
          "[WavePlayer Worker] Fetch complete but no audio data was decoded/reported."
        );
        postWorkerMessage({
          type: "ERROR",
          message: "Audio file appears to contain no valid audio data.",
          trackId: currentTrackId,
        });
        updateStatus("error");
        cleanupCurrentTrack();
      } else if (
        reportedTrackReady &&
        currentTrackId &&
        totalDecodedDuration > 0
      ) {
        console.log(
          `[WavePlayer Worker] Final decoded duration: ${totalDecodedDuration / 1_000_000}s`
        );
        if (currentStatus === "loading" || currentStatus === "buffering") {
          updateStatus("ready");
        }
      }
    } catch (flushError) {
      console.error("[WavePlayer Worker] Error flushing decoder:", flushError);
      postWorkerMessage({
        type: "ERROR",
        message: "Failed to finalize audio decoding",
        trackId: currentTrackId ?? undefined,
        error:
          flushError instanceof Error
            ? flushError
            : new Error(String(flushError)),
      });
      updateStatus("error");
      cleanupCurrentTrack();
    }
  } else if (currentStatus === "loading") {
    console.warn(
      "[WavePlayer Worker] Fetch complete, but decoder was not initialized."
    );
  }
}

/**
 * Handles errors during audio data fetching.
 * @param error The error that occurred during the fetch.
 */
function handleFetchError(error: Error): void {
  console.error("[WavePlayer Worker] Fetch failed:", error);
  postWorkerMessage({
    type: "ERROR",
    message: `Audio fetch failed: ${error.message}`,
    trackId: currentTrackId ?? undefined,
    error: error,
  });
  updateStatus("error");
  cleanupCurrentTrack();
}

/**
 * Handles a chunk of decoded audio data.
 * @param decodedData The decoded audio data.
 */
function handleDecodedChunk(decodedData: AudioData): void {
  if (
    !currentTrackId ||
    !audioDecoder ||
    !ringBufferDataSab ||
    !stateBufferSab
  ) {
    console.warn(
      "[WavePlayer Worker] Skipping decoded chunk: Worker not fully ready or missing SABs."
    );
    decodedData.close();
    return;
  }

  const { numberOfChannels, numberOfFrames, sampleRate, format, duration } =
    decodedData;

  if (!ringBuffer) {
    try {
      if (numberOfChannels !== 2) {
        throw new Error(
          `Unsupported channel count: ${numberOfChannels}. Only stereo (2 channels) is supported.`
        );
      }

      console.log(
        `[WavePlayer Worker] First chunk decoded. Initializing RingBuffer with ${numberOfChannels} channels.`
      );
      if (format !== "f32-planar") {
        throw new Error(
          `Unsupported AudioData format: ${format}. Expected 'f32-planar'.`
        );
      }
      ringBuffer = new RingBuffer(
        stateBufferSab,
        ringBufferDataSab,
        numberOfChannels
      );
      expectedChannels = numberOfChannels;
      expectedSampleRate = sampleRate;
      ringBuffer.clear();
    } catch (error) {
      console.error(
        "[WavePlayer Worker] Failed to initialize RingBuffer:",
        error
      );
      postWorkerMessage({
        type: "ERROR",
        message: `Failed to initialize audio buffer: ${error instanceof Error ? error.message : String(error)}`,
        trackId: currentTrackId,
        error: error,
      });
      updateStatus("error");
      cleanupCurrentTrack();
      decodedData.close();
      return;
    }
  }

  if (
    numberOfChannels !== expectedChannels ||
    sampleRate !== expectedSampleRate
  ) {
    console.error(
      `[WavePlayer Worker] Audio format changed mid-stream! Expected ${expectedChannels}ch @ ${expectedSampleRate}Hz, got ${numberOfChannels}ch @ ${sampleRate}Hz. Stopping.`
    );
    postWorkerMessage({
      type: "ERROR",
      message: "Inconsistent audio format detected mid-stream.",
      trackId: currentTrackId,
    });
    updateStatus("error");
    cleanupCurrentTrack();
    decodedData.close();
    return;
  }

  if (!reportedTrackReady) {
    console.log("[WavePlayer Worker] First audio data processed:", {
      sampleRate,
      numberOfChannels,
      format,
      duration,
    });
    postWorkerMessage({
      type: "TRACK_READY",
      trackId: currentTrackId,
      duration: 0,
      sampleRate: sampleRate,
      numberOfChannels: numberOfChannels,
    });
    reportedTrackReady = true;
    if (currentStatus === "loading") {
      updateStatus("ready");
    }
  }

  totalDecodedDuration += duration;

  if (numberOfFrames > 0) {
    const channelData: Float32Array[] = [];
    for (let i = 0; i < numberOfChannels; ++i) {
      channelData.push(new Float32Array(numberOfFrames));
    }

    try {
      for (let i = 0; i < numberOfChannels; ++i) {
        decodedData.copyTo(channelData[i], {
          planeIndex: i,
          frameOffset: 0,
          frameCount: numberOfFrames,
        });
      }

      if (!ringBuffer.write(channelData)) {
        console.warn(
          `[WavePlayer Worker] RingBuffer full. Dropping ${numberOfFrames} samples.`
        );
      }
    } catch (error) {
      console.error(
        "[WavePlayer Worker] Error copying or writing decoded data:",
        error
      );
      postWorkerMessage({
        type: "ERROR",
        message: `Error processing decoded audio data: ${error instanceof Error ? error.message : String(error)}`,
        trackId: currentTrackId,
        error: error,
      });
      updateStatus("error");
      cleanupCurrentTrack();
    }
  }

  decodedData.close();
}

/**
 * Handles errors during audio data decoding.
 * @param error The error that occurred during the decode.
 */
function handleDecodeError(error: Error): void {
  console.error("[WavePlayer Worker] Decode failed:", error);
  postWorkerMessage({
    type: "ERROR",
    message: `Audio decode failed: ${error.message}`,
    trackId: currentTrackId ?? undefined,
    error: error,
  });
  updateStatus("error");
  cleanupCurrentTrack();
}

// === Main Message Handler ===
self.onmessage = (event: MessageEvent<ProviderCommand>) => {
  const command = event.data;
  console.log("[WavePlayer Worker] Received command:", command.type);

  switch (command.type) {
    case "INITIALIZE":
      handleInitialize(command);
      break;

    case "LOAD":
      // Add catch block to handle potential promise rejection from handleLoad/handleLoadWav
      handleLoad(command).catch((err: Error) => {
        console.error("[WavePlayer Worker] Unhandled error during LOAD:", err);
        postWorkerMessage({
          type: "ERROR",
          message: "Internal error during track load",
          trackId: command.track.id,
          error: err instanceof Error ? err : new Error(String(err)),
        });
        updateStatus("error");
        cleanupCurrentTrack();
      });
      break;

    case "PLAY":
      if (
        stateBufferView &&
        (currentStatus === "ready" || currentStatus === "paused")
      ) {
        console.log("[WavePlayer Worker] Handling PLAY command.");
        Atomics.store(stateBufferView, PLAYBACK_STATE_INDEX, 1); // 1 = playing
        updateStatus("playing");
      } else if (!stateBufferView) {
        console.error(
          "[WavePlayer Worker] Cannot PLAY: State buffer view not available."
        );
        postWorkerMessage({
          type: "ERROR",
          message: "Internal error: Playback state cannot be controlled.",
          trackId: currentTrackId ?? undefined,
        });
      } else {
        console.warn(
          `[WavePlayer Worker] Cannot PLAY in current status: ${currentStatus}`
        );
      }
      break;

    case "PAUSE":
      if (stateBufferView && currentStatus === "playing") {
        console.log("[WavePlayer Worker] Handling PAUSE command.");
        Atomics.store(stateBufferView, PLAYBACK_STATE_INDEX, 0); // 0 = paused
        updateStatus("paused");
      } else if (!stateBufferView) {
        console.error(
          "[WavePlayer Worker] Cannot PAUSE: State buffer view not available."
        );
        postWorkerMessage({
          type: "ERROR",
          message: "Internal error: Playback state cannot be controlled.",
          trackId: currentTrackId ?? undefined,
        });
      } else {
        console.warn(
          `[WavePlayer Worker] Cannot PAUSE in current status: ${currentStatus}`
        );
      }
      break;

    case "SEEK":
      console.warn(
        `[WavePlayer Worker] Received ${command.type}, but handler not implemented yet.`
      );
      // TODO: Implement SEEK handler (Phase 7)
      break;

    case "SET_VOLUME":
      console.warn(
        `[WavePlayer Worker] Received ${command.type}, but handler not implemented yet.`
      );
      // TODO: Implement SET_VOLUME handler (Phase 8)
      break;

    case "SET_LOOP":
      console.warn(
        `[WavePlayer Worker] Received ${command.type}, but handler not implemented yet.`
      );
      // TODO: Implement SET_LOOP handler (Phase 8)
      break;

    case "PRELOAD":
      console.warn(
        `[WavePlayer Worker] Received ${command.type}, but handler not implemented yet.`
      );
      // TODO: Implement PRELOAD handler (Phase 8)
      break;

    case "TERMINATE":
      console.log("[WavePlayer Worker] Terminating worker...");
      cleanupCurrentTrack();
      isInitialized = false;
      self.close();
      break;

    default:
      // Ensure command has a type property before logging it
      // const commandType = typeof command === 'object' && command !== null && 'type' in command ? command.type : 'unknown';
      // console.error("[WavePlayer Worker] Received unknown command type:", commandType, command);

      // Handle 'never' type while still logging potential runtime errors
      const receivedCommand: unknown = command; // Cast to unknown for safer handling
      let commandType = "unknown";
      if (
        typeof receivedCommand === "object" &&
        receivedCommand !== null &&
        "type" in receivedCommand &&
        typeof receivedCommand.type === "string"
      ) {
        commandType = receivedCommand.type; // Log type if possible
      }
      console.error(
        "[WavePlayer Worker] Received unknown command type:",
        commandType,
        receivedCommand
      );
      postWorkerMessage({ type: "ERROR", message: "Unknown command received" });
      break;
  }
};

// === Worker Scope Error Handler ===
self.onerror = (eventOrMessage: Event | string) => {
  let message = "Uncaught worker error";
  let error: unknown = undefined;

  if (eventOrMessage instanceof ErrorEvent) {
    console.error(
      "[WavePlayer Worker] Uncaught error:",
      eventOrMessage.error,
      eventOrMessage.message
    );
    message = eventOrMessage.message || message;
    error = eventOrMessage.error;
  } else {
    console.error("[WavePlayer Worker] Uncaught error/event:", eventOrMessage);
    if (typeof eventOrMessage === "string") {
      message = eventOrMessage;
    }
  }

  if (isInitialized || currentStatus !== "stopped") {
    postWorkerMessage({
      type: "ERROR",
      message: message,
      error: error,
      trackId: currentTrackId ?? undefined,
    });
    updateStatus("error");
    cleanupCurrentTrack();
  }
};

// === Message Error Handler ===
self.onmessageerror = (event: MessageEvent) => {
  console.error("[WavePlayer Worker] Message error:", event);
  if (isInitialized || currentStatus !== "stopped") {
    postWorkerMessage({
      type: "ERROR",
      message: "Error deserializing message",
    });
    updateStatus("error");
  }
};

console.log("[WavePlayer Worker] Worker script loaded and running.");
