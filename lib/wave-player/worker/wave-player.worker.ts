/// <reference lib="webworker" />

import type {
  ProviderCommand,
  WorkerMessage,
  InitializeCommand,
} from "../types/worker-messages";

console.log("[WavePlayer Worker] Initializing worker...");

// State within the worker (will be expanded in later phases)
let isInitialized = false;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let ringBufferSab: SharedArrayBuffer | null = null;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let stateBufferSab: SharedArrayBuffer | null = null;

/**
 * Handles the INITIALIZE command.
 * Stores necessary shared buffers and confirms initialization.
 * @param command The initialize command data.
 */
function handleInitialize(command: InitializeCommand): void {
  if (isInitialized) {
    console.warn("[WavePlayer Worker] Worker already initialized.");
    return;
  }
  console.log("[WavePlayer Worker] Initializing with SABs...");
  ringBufferSab = command.ringBufferSab;
  stateBufferSab = command.stateBufferSab;

  // TODO: Perform any other necessary one-time setup using provided options

  isInitialized = true;
  console.log("[WavePlayer Worker] Initialization complete.");
  postWorkerMessage({ type: "INITIALIZED" });
}

/**
 * Posts a message back to the main thread (WavePlayerProvider).
 * @param message The message object to send.
 */
function postWorkerMessage(message: WorkerMessage): void {
  self.postMessage(message);
}

/**
 * Handles incoming commands from the main thread (WavePlayerProvider).
 */
self.onmessage = (event: MessageEvent<ProviderCommand>) => {
  const command = event.data;
  console.log("[WavePlayer Worker] Received command:", command.type, command);

  switch (command.type) {
    case "INITIALIZE":
      handleInitialize(command);
      break;

    case "LOAD":
      console.warn(`[WavePlayer Worker] Received ${command.type}, but handler not implemented yet.`);
      // TODO: Implement LOAD handler (Phase 2)
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
      isInitialized = false;
      // TODO: Add resource cleanup (Phase 9)
      self.close(); // Terminates the worker
      break;

    default:
      console.error("[WavePlayer Worker] Received unknown command:", command);
      postWorkerMessage({ type: "ERROR", message: "Unknown command received" });
      break;
  }
};

// Basic error handling for the worker scope itself
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
    // Handle older string-based errors or generic Events
    console.error("[WavePlayer Worker] Uncaught error/event:", eventOrMessage);
    if (typeof eventOrMessage === "string") {
      message = eventOrMessage;
    }
  }

  postWorkerMessage({
    type: "ERROR",
    message: message,
    error: error, // Attach the actual error object if available
  });
};

self.onmessageerror = (event: MessageEvent) => {
  console.error("[WavePlayer Worker] Message error:", event);
  postWorkerMessage({
    type: "ERROR",
    message: "Error deserializing message",
  });
};

console.log("[WavePlayer Worker] Worker script loaded and running.");
