/// <reference lib="webworker" />
/// <reference types="@types/dom-webcodecs" />

import type {
  ProviderCommand,
  WorkerMessage,
  InitializeCommand,
  LoadCommand,
  WavePlayerStatus,
} from "../types/worker-messages";
import type { WavePlayerTrack } from "../types/wave-player";
import { AudioFetcher } from "./audio-fetcher";
import { AudioDecoderWrapper, type AudioDecoderConfig } from "./audio-decoder";
import { RingBuffer } from "./ring-buffer";

console.log("[WavePlayer Worker] Initializing worker...");

// === State ===
let isInitialized = false;
let ringBufferDataSab: SharedArrayBuffer | null = null;
let stateBufferSab: SharedArrayBuffer | null = null;
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
  console.log(`[WavePlayer Worker] Status changing: ${currentStatus} -> ${status}`);
  currentStatus = status;
  postWorkerMessage({
    type: "STATUS_UPDATE",
    status: currentStatus,
    trackId: currentTrackId ?? undefined,
  });
}

/**
 * Cleans up resources associated with the current fetch/decode cycle.
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
  audioFetcher = null; // Fetcher is implicitly stopped by abort
  currentTrack = null;
  currentTrackId = null;
  totalDecodedDuration = 0;
  reportedTrackReady = false;
  expectedChannels = 0;
  expectedSampleRate = 0;

  if (ringBuffer) {
      ringBuffer.clear();
      ringBuffer = null;
      console.log("[WavePlayer Worker] RingBuffer cleared and reset.");
  }
}

// === Command Handlers ===

/**
 * Handles the INITIALIZE command.
 * Stores necessary shared buffers and confirms initialization.
 */
function handleInitialize(command: InitializeCommand): void {
  if (isInitialized) {
    console.warn("[WavePlayer Worker] Worker already initialized.");
    return;
  }
  console.log("[WavePlayer Worker] Initializing with SABs...");

  if (!command.ringBufferSab || command.ringBufferSab.byteLength === 0) {
      console.error("[WavePlayer Worker] Invalid RingBuffer Data SAB received.");
      postWorkerMessage({ type: "ERROR", message: "Initialization failed: Invalid audio data buffer." });
      return;
  }
   if (!command.stateBufferSab || command.stateBufferSab.byteLength === 0) {
     console.error("[WavePlayer Worker] Invalid State SAB received.");
     postWorkerMessage({ type: "ERROR", message: "Initialization failed: Invalid state buffer." });
     return;
  }

  ringBufferDataSab = command.ringBufferSab;
  stateBufferSab = command.stateBufferSab;

  isInitialized = true;
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
    console.warn("[WavePlayer Worker] Guessing Opus config for Ogg - might need description.");
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
     console.warn("[WavePlayer Worker] WAV/PCM support via WebCodecs might be limited or require specific codec strings.");
     // Placeholder - This might fail, WAV often doesn't need a decoder in the same way
     return {
        codec: "pcm-f32le", // Example, may vary based on actual WAV format
        sampleRate: 44100,
        numberOfChannels: 2,
     };
   }

  console.error(`[WavePlayer Worker] Could not guess decoder config for URL: ${url}`);
  return null;
}

/**
 * Handles the LOAD command.
 * Initiates fetching and decoding of the specified track.
 */
async function handleLoad(command: LoadCommand): Promise<void> {
  if (!isInitialized) {
    postWorkerMessage({
      type: "ERROR",
      message: "Worker not initialized. Cannot load track.",
    });
    return;
  }

  console.log(`[WavePlayer Worker] Handling LOAD command for: ${command.track.title}`);
  cleanupCurrentTrack();
  updateStatus("stopped");

  currentTrack = command.track;
  currentTrackId = command.track.id;
  updateStatus("loading");

  abortController = new AbortController();

  const guessedConfig = guessDecoderConfig(currentTrack.src);
  if (!guessedConfig) {
    postWorkerMessage({
      type: "ERROR",
      message: `Could not determine decoder configuration for ${currentTrack.src}`,
      trackId: currentTrackId,
    });
    updateStatus("error");
    return;
  }

  try {
    audioDecoder = new AudioDecoderWrapper({
      onDecoded: handleDecodedChunk,
      onError: handleDecodeError,
    });
    await audioDecoder.configure(guessedConfig);

    audioFetcher = new AudioFetcher({
      onChunk: handleFetchedChunk,
      onComplete: handleFetchComplete,
      onError: handleFetchError,
      onProgress: handleFetchProgress,
    });
    audioFetcher.fetchAudio(currentTrack.src);

  } catch (configError) {
    console.error("[WavePlayer Worker] Failed to configure decoder during LOAD:", configError);
    postWorkerMessage({
      type: "ERROR",
      message: `Audio fetch failed: ${configError instanceof Error ? configError.message : String(configError)}`,
      trackId: currentTrackId,
      error: configError instanceof Error ? configError : new Error(String(configError)),
    });
    updateStatus("error");
    cleanupCurrentTrack();
  }
}

// === Fetch & Decode Callbacks ===

function handleFetchProgress(downloadedBytes: number, totalBytes: number | null): void {
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
    console.error("[WavePlayer Worker] Error creating/decoding fetched chunk:", error);
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

async function handleFetchComplete(): Promise<void> {
    console.log("[WavePlayer Worker] Fetch complete.");
    if (audioDecoder) {
        try {
            await audioDecoder.flush();
            console.log("[WavePlayer Worker] Decoder flushed after fetch complete.");
            if (!reportedTrackReady && currentTrackId && totalDecodedDuration > 0 && expectedChannels > 0 && expectedSampleRate > 0) {
                postWorkerMessage({
                  type: "TRACK_READY",
                  trackId: currentTrackId,
                  duration: totalDecodedDuration / 1_000_000,
                  sampleRate: expectedSampleRate,
                  numberOfChannels: expectedChannels,
                });
                reportedTrackReady = true;
                if (currentStatus === 'loading') {
                  updateStatus("ready");
                }
            } else if (!reportedTrackReady && currentTrackId) {
                console.warn("[WavePlayer Worker] Fetch complete but no audio data was decoded/reported.");
                 postWorkerMessage({
                    type: "ERROR",
                    message: "Audio file appears to contain no valid audio data.",
                    trackId: currentTrackId,
                 });
                 updateStatus("error");
                 cleanupCurrentTrack();
            } else if (reportedTrackReady && currentTrackId && totalDecodedDuration > 0) {
                 console.log(`[WavePlayer Worker] Final decoded duration: ${totalDecodedDuration / 1_000_000}s`);
                 if (currentStatus === 'loading' || currentStatus === 'buffering') {
                     updateStatus('ready');
                 }
            }

        } catch(flushError) {
            console.error("[WavePlayer Worker] Error flushing decoder:", flushError);
            postWorkerMessage({
              type: "ERROR",
              message: "Failed to finalize audio decoding",
              trackId: currentTrackId ?? undefined,
              error: flushError instanceof Error ? flushError : new Error(String(flushError)),
            });
            updateStatus("error");
            cleanupCurrentTrack();
        }
    } else if (currentStatus === 'loading') {
        console.warn("[WavePlayer Worker] Fetch complete, but decoder was not initialized.");
    }
}

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

function handleDecodedChunk(decodedData: AudioData): void {
  if (!currentTrackId || !audioDecoder || !ringBufferDataSab || !stateBufferSab) {
      console.warn("[WavePlayer Worker] Skipping decoded chunk: Worker not fully ready or missing SABs.");
      decodedData.close();
      return;
  }

  const { numberOfChannels, numberOfFrames, sampleRate, format, duration } = decodedData;

  if (!ringBuffer) {
    try {
        // --- Stereo Check --- 
        if (numberOfChannels !== 2) {
            throw new Error(`Unsupported channel count: ${numberOfChannels}. Only stereo (2 channels) is supported.`);
        }

        console.log(`[WavePlayer Worker] First chunk decoded. Initializing RingBuffer with ${numberOfChannels} channels.`);
        // Check format compatibility (needs 'f32-planar')
        if (format !== "f32-planar") {
           throw new Error(`Unsupported AudioData format: ${format}. Expected 'f32-planar'.`);
        }
        ringBuffer = new RingBuffer(stateBufferSab, ringBufferDataSab, numberOfChannels);
        expectedChannels = numberOfChannels;
        expectedSampleRate = sampleRate;
        ringBuffer.clear();
    } catch (error) {
        console.error("[WavePlayer Worker] Failed to initialize RingBuffer:", error);
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

  if (numberOfChannels !== expectedChannels || sampleRate !== expectedSampleRate) {
     console.error(`[WavePlayer Worker] Audio format changed mid-stream! Expected ${expectedChannels}ch @ ${expectedSampleRate}Hz, got ${numberOfChannels}ch @ ${sampleRate}Hz. Stopping.`);
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
    console.log("[WavePlayer Worker] First audio data processed:", { sampleRate, numberOfChannels, format, duration });
    postWorkerMessage({
      type: "TRACK_READY",
      trackId: currentTrackId,
      duration: 0,
      sampleRate: sampleRate,
      numberOfChannels: numberOfChannels,
    });
    reportedTrackReady = true;
     if (currentStatus === 'loading') {
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
            decodedData.copyTo(channelData[i], { planeIndex: i, frameOffset: 0, frameCount: numberOfFrames });
        }

        if (!ringBuffer.write(channelData)) {
            console.warn(`[WavePlayer Worker] RingBuffer full. Dropping ${numberOfFrames} samples.`);
        }

    } catch (error) {
        console.error("[WavePlayer Worker] Error copying or writing decoded data:", error);
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
  // console.log("[WavePlayer Worker] Received command:", command.type); // Less verbose

  switch (command.type) {
    case "INITIALIZE":
      handleInitialize(command);
      break;

    case "LOAD":
      handleLoad(command).catch(err => {
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
      console.warn(`[WavePlayer Worker] Received ${command.type}, but handler not implemented yet.`);
      // TODO: Implement PLAY handler (Phase 4)
      break;

    case "PAUSE":
      console.warn(`[WavePlayer Worker] Received ${command.type}, but handler not implemented yet.`);
      // TODO: Implement PAUSE handler (Phase 4)
      break;

    case "SEEK":
      console.warn(`[WavePlayer Worker] Received ${command.type}, but handler not implemented yet.`);
      // TODO: Implement SEEK handler (Phase 7)
      break;

    case "SET_VOLUME":
      console.warn(`[WavePlayer Worker] Received ${command.type}, but handler not implemented yet.`);
      // TODO: Implement SET_VOLUME handler (Phase 8)
      break;

    case "SET_LOOP":
      console.warn(`[WavePlayer Worker] Received ${command.type}, but handler not implemented yet.`);
      // TODO: Implement SET_LOOP handler (Phase 8)
      break;

    case "PRELOAD":
      console.warn(`[WavePlayer Worker] Received ${command.type}, but handler not implemented yet.`);
      // TODO: Implement PRELOAD handler (Phase 8)
      break;

    case "TERMINATE":
      console.log("[WavePlayer Worker] Terminating worker...");
      cleanupCurrentTrack();
      isInitialized = false;
      self.close();
      break;

    default:
      console.error("[WavePlayer Worker] Received unknown command:", command);
      postWorkerMessage({ type: "ERROR", message: "Unknown command received" });
      break;
  }
};

// === Worker Scope Error Handling ===

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
      });
      updateStatus("error");
      cleanupCurrentTrack();
  }
};

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
