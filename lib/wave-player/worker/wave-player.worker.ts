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

console.log("[WavePlayer Worker] Initializing worker...");

// === State ===
let isInitialized = false;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let ringBufferSab: SharedArrayBuffer | null = null;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let stateBufferSab: SharedArrayBuffer | null = null;
let currentTrack: WavePlayerTrack | null = null;
let currentTrackId: string | null = null; // Easier access than currentTrack?.id
let audioFetcher: AudioFetcher | null = null;
let audioDecoder: AudioDecoderWrapper | null = null;
let abortController: AbortController | null = null;
let currentStatus: WavePlayerStatus = "initializing";
let decodeTimestampCounter = 0; // Simple timestamp for EncodedAudioChunk in Phase 2
let decodedAudioQueue: AudioData[] = []; // Temporary queue for decoded data (Phase 2)
let totalDecodedDuration = 0; // Track duration roughly
let reportedTrackReady = false;

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
  decodedAudioQueue = [];
  totalDecodedDuration = 0;
  decodeTimestampCounter = 0;
  reportedTrackReady = false;
  // Do not reset isInitialized, ringBufferSab, or stateBufferSab here
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
  ringBufferSab = command.ringBufferSab;
  stateBufferSab = command.stateBufferSab;

  isInitialized = true;
  updateStatus("idle"); // Now idle after initialization
  console.log("[WavePlayer Worker] Initialization complete.");
  postWorkerMessage({ type: "INITIALIZED" }); // Explicit initialized message
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
  // Stop and clean up any previous track
  cleanupCurrentTrack();
  updateStatus("stopped"); // Signal previous track stopped before loading new one

  currentTrack = command.track;
  currentTrackId = command.track.id;
  updateStatus("loading");

  abortController = new AbortController();

  // --- Guess Decoder Config (Phase 2 Placeholder) ---
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
  // --- End Placeholder ---

  try {
    // Instantiate Decoder (before fetch starts, to be ready)
    audioDecoder = new AudioDecoderWrapper({
      onDecoded: handleDecodedChunk,
      onError: handleDecodeError,
    });
    await audioDecoder.configure(guessedConfig);

    // Instantiate Fetcher and start fetching
    audioFetcher = new AudioFetcher({
      onChunk: handleFetchedChunk,
      onComplete: handleFetchComplete,
      onError: handleFetchError,
      onProgress: handleFetchProgress,
    });
    // Don't await fetchAudio, let it run in the background
    audioFetcher.fetchAudio(currentTrack.src);

  } catch (configError) {
    console.error("[WavePlayer Worker] Failed to configure decoder during LOAD:", configError);
    // Error message already sent by configure failure
    updateStatus("error");
    cleanupCurrentTrack(); // Clean up partially initialized state
  }
}

// === Fetch & Decode Callbacks ===

function handleFetchProgress(downloadedBytes: number, totalBytes: number | null): void {
  if (!currentTrackId) return;
  const progress = totalBytes ? downloadedBytes / totalBytes : 0; // Indeterminate if no total
  postWorkerMessage({
    type: "LOADING_PROGRESS",
    trackId: currentTrackId,
    progress: Math.max(0, Math.min(1, progress)), // Clamp progress
    downloadedBytes,
    totalBytes,
  });
}

function handleFetchedChunk(chunkBuffer: ArrayBuffer): void {
  if (!audioDecoder || !currentTrackId) return;

  try {
    // Create EncodedAudioChunk
    const encodedChunk = new EncodedAudioChunk({
      type: "key", // Assume all chunks are key for simplicity in Phase 2
      timestamp: decodeTimestampCounter++, // Basic timestamp for Phase 2
      duration: undefined, // Duration is often unknown for encoded chunks
      data: chunkBuffer,
    });

    // Pass to decoder
    audioDecoder.decodeChunk(encodedChunk);
  } catch (error) {
    console.error("[WavePlayer Worker] Error creating/decoding fetched chunk:", error);
    postWorkerMessage({
      type: "ERROR",
      message: "Failed to process audio chunk",
      trackId: currentTrackId,
      error: error instanceof Error ? error : new Error(String(error)),
    });
    // Consider stopping the process or attempting recovery
    updateStatus("error");
    cleanupCurrentTrack();
  }
}

async function handleFetchComplete(): Promise<void> {
    console.log("[WavePlayer Worker] Fetch complete.");
    if (audioDecoder) {
        try {
            // Signal the decoder that no more chunks are coming
            await audioDecoder.flush();
            console.log("[WavePlayer Worker] Decoder flushed after fetch complete.");
            // If TRACK_READY hasn't been sent yet (e.g., very short file where
            // onDecoded wasn't called before fetch completed), send it now.
            if (!reportedTrackReady && currentTrackId && totalDecodedDuration > 0 && audioDecoder.state === 'configured') {
                // Extract config from decoder if possible
                // This is a bit of a guess, real config might differ slightly
                // const config = audioDecoder. // Cannot directly access config state easily
                // Use placeholder values if we don't have them
                const sampleRate = decodedAudioQueue[0]?.sampleRate ?? 44100;
                const numberOfChannels = decodedAudioQueue[0]?.numberOfChannels ?? 2;

                postWorkerMessage({
                  type: "TRACK_READY",
                  trackId: currentTrackId,
                  duration: totalDecodedDuration / 1_000_000, // Convert microseconds to seconds
                  sampleRate: sampleRate,
                  numberOfChannels: numberOfChannels,
                });
                reportedTrackReady = true;
                // If status was loading, move to ready (unless an error occurred)
                if (currentStatus === 'loading') {
                  updateStatus("ready");
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
  cleanupCurrentTrack(); // Clean up on fetch error
}

function handleDecodedChunk(decodedData: AudioData): void {
  if (!currentTrackId || !audioDecoder) return;

  // --- Track Ready Logic (First Chunk) ---
  if (!reportedTrackReady) {
    console.log("[WavePlayer Worker] First audio data decoded:", {
      sampleRate: decodedData.sampleRate,
      numberOfChannels: decodedData.numberOfChannels,
      format: decodedData.format,
      duration: decodedData.duration,
    });

    // TODO: Reconfigure decoder if initial guess was wrong? (More advanced)

    // Send TRACK_READY message (duration will be updated as more chunks arrive)
    // We use 0 duration initially, handleFetchComplete or later chunks will update
    postWorkerMessage({
      type: "TRACK_READY",
      trackId: currentTrackId,
      duration: 0, // Placeholder duration, updated later
      sampleRate: decodedData.sampleRate,
      numberOfChannels: decodedData.numberOfChannels,
    });
    reportedTrackReady = true;
    // Update status from 'loading' to 'ready' or 'buffering' (depending on future logic)
    // For Phase 2, transition directly to 'ready'
     if (currentStatus === 'loading') {
        updateStatus("ready");
     }
  }

  // --- Update Duration ---
  // AudioData duration is in microseconds
  totalDecodedDuration += decodedData.duration;
  // TODO: Potentially send updated duration message periodically if needed

  // --- Queue Data (Phase 2 Placeholder) ---
  // In Phase 3, this data will be copied to the RingBuffer
  // For now, just store the reference (remember AudioData needs closing)
  // We don't close it here because the decoder wrapper does it after this callback returns
  decodedAudioQueue.push(decodedData.clone()); // Clone needed because original is closed by wrapper
  // console.log(`[WavePlayer Worker] Queued audio data. Queue size: ${decodedAudioQueue.length}`);
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
  cleanupCurrentTrack(); // Clean up on decode error
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
          // Catch potential unhandled promise rejections from async handleLoad
          console.error("[WavePlayer Worker] Unhandled error during LOAD:", err);
          postWorkerMessage({
              type: "ERROR",
              message: "Internal error during track load",
              trackId: command.track.id, // Use trackId from command if available
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
      cleanupCurrentTrack(); // Ensure resources are cleaned up
      isInitialized = false;
      self.close(); // Terminates the worker
      break;

    default:
      // Ensure exhaustive check with 'never' type if possible in future TS versions
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

  // Avoid sending error if worker is already terminating/closed
  if (isInitialized || currentStatus !== "stopped") { // Or more robust check
      postWorkerMessage({
        type: "ERROR",
        message: message,
        error: error,
      });
      updateStatus("error"); // Update status if an uncaught error occurs
      cleanupCurrentTrack(); // Attempt cleanup
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
