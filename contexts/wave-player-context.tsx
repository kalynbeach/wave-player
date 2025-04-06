"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useCallback,
  useMemo,
} from "react";
import type { WavePlayerTrack } from "@/lib/wave-player/types/wave-player";
import type {
  ProviderCommand,
  WorkerMessage,
  WavePlayerStatus,
} from "@/lib/wave-player/types/worker-messages";

// === Constants ===
// Arbitrary sizes for the SharedArrayBuffers. Adjust as needed.
const RING_BUFFER_SIZE_BYTES = 1024 * 1024; // 1 MB for audio samples
const STATE_BUFFER_SIZE_BYTES = 16; // Small buffer for atomic state flags (e.g., playing)

// === State ===

interface WavePlayerState {
  status: WavePlayerStatus;
  currentTrack: WavePlayerTrack | null;
  currentTime: number;
  duration: number;
  volume: number; // 0 to 1
  isLooping: boolean;
  loadingProgress: number; // 0 to 1
  error: string | null;
  // Add other relevant state fields as needed
}

const initialState: WavePlayerState = {
  status: "initializing",
  currentTrack: null,
  currentTime: 0,
  duration: 0,
  volume: 1,
  isLooping: false,
  loadingProgress: 0,
  error: null,
};

// === Actions ===
type WavePlayerAction =
  | { type: "SET_STATUS"; payload: WavePlayerStatus }
  | { type: "SET_TRACK"; payload: WavePlayerTrack | null }
  | { type: "SET_CURRENT_TIME"; payload: number }
  | { type: "SET_DURATION"; payload: number }
  | { type: "SET_VOLUME"; payload: number }
  | { type: "SET_LOOPING"; payload: boolean }
  | { type: "SET_LOADING_PROGRESS"; payload: number }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "WORKER_INITIALIZED" }
  | { type: "WORKER_TRACK_READY"; payload: { trackId: string; duration: number } }
  | { type: "WORKER_TRACK_ENDED"; payload: { trackId: string } }
  | {
      type: "WORKER_TIME_UPDATE";
      payload: { trackId: string; currentTime: number };
    };
// Add more actions corresponding to WorkerMessages

// === Reducer ===

function wavePlayerReducer(
  state: WavePlayerState,
  action: WavePlayerAction
): WavePlayerState {
  console.log("[WavePlayerContext] Reducer action:", action.type, action);
  switch (action.type) {
    case "SET_STATUS":
      return { ...state, status: action.payload, error: null }; // Clear error on status change
    case "SET_TRACK":
      return {
        ...state,
        currentTrack: action.payload,
        currentTime: 0,
        duration: 0,
        loadingProgress: 0,
        status: action.payload ? "loading" : "idle", // Set to loading if track provided
        error: null,
      };
    case "SET_CURRENT_TIME":
      return { ...state, currentTime: action.payload };
    case "SET_DURATION":
      return { ...state, duration: action.payload };
    case "SET_VOLUME":
      // Clamp volume between 0 and 1
      return { ...state, volume: Math.max(0, Math.min(1, action.payload)) };
    case "SET_LOOPING":
      return { ...state, isLooping: action.payload };
    case "SET_LOADING_PROGRESS":
      return { ...state, loadingProgress: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload, status: "error" };

    // Worker Message Handling
    case "WORKER_INITIALIZED":
      return { ...state, status: "idle" };
    case "WORKER_TRACK_READY":
      if (state.currentTrack?.id === action.payload.trackId) {
        return {
          ...state,
          status: "ready",
          duration: action.payload.duration,
          loadingProgress: 1,
        };
      }
      return state;
    case "WORKER_TRACK_ENDED":
      if (state.currentTrack?.id === action.payload.trackId) {
        return {
          ...state,
          status: "ended",
          currentTime: state.duration, // Set time to end for display
        };
      }
      return state;
    case "WORKER_TIME_UPDATE":
      if (
        state.currentTrack?.id === action.payload.trackId &&
        state.status === "playing"
      ) {
        return { ...state, currentTime: action.payload.currentTime };
      }
      return state;

    default:
      return state;
  }
}

// === Context ===

interface WavePlayerContextValue {
  state: WavePlayerState;
  // Define controls methods (placeholders for now)
  load: (track: WavePlayerTrack) => void;
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  setLoop: (loop: boolean) => void;
  // next/previous etc. can be added later
}

const WavePlayerContext = createContext<WavePlayerContextValue | undefined>(
  undefined
);

// === Provider ===

interface WavePlayerProviderProps {
  children: React.ReactNode;
}

export function WavePlayerProvider({ children }: WavePlayerProviderProps) {
  const [state, dispatch] = useReducer(wavePlayerReducer, initialState);

  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const ringBufferSabRef = useRef<SharedArrayBuffer | null>(null);
  const stateBufferSabRef = useRef<SharedArrayBuffer | null>(null);

  // Memoize worker message handler to prevent re-creation
  const handleWorkerMessage = useCallback(
    (event: MessageEvent<WorkerMessage>) => {
      const message = event.data;
      console.log(
        "[WavePlayerProvider] Received message from worker:",
        message.type,
        message
      );

      switch (message.type) {
        case "INITIALIZED":
          dispatch({ type: "WORKER_INITIALIZED" });
          break;
        case "STATUS_UPDATE":
          dispatch({ type: "SET_STATUS", payload: message.status });
          break;
        case "LOADING_PROGRESS":
          if (state.currentTrack?.id === message.trackId) {
            dispatch({
              type: "SET_LOADING_PROGRESS",
              payload: message.progress,
            });
          }
          break;
        case "TRACK_READY":
          dispatch({ type: "WORKER_TRACK_READY", payload: message });
          break;
        case "TIME_UPDATE":
          dispatch({ type: "WORKER_TIME_UPDATE", payload: message });
          break;
        case "TRACK_ENDED":
          dispatch({ type: "WORKER_TRACK_ENDED", payload: message });
          break;
        case "ERROR":
          dispatch({ type: "SET_ERROR", payload: message.message });
          console.error(
            "[WavePlayerProvider] Worker Error:",
            message.message,
            message.error
          );
          break;
        // Handle other message types as needed
        default:
          console.warn(
            "[WavePlayerProvider] Received unknown message type from worker:",
            message
          );
      }
    },
    [state.currentTrack?.id] // Dependency ensures handler updates if track changes
  );

  // Initialize AudioContext, Worker, Worklet, and SABs on mount
  useEffect(() => {
    let didCancel = false;

    async function initializeAudio() {
      console.log("[WavePlayerProvider] Initializing audio system...");
      try {
        // 1. Create SharedArrayBuffers
        ringBufferSabRef.current = new SharedArrayBuffer(RING_BUFFER_SIZE_BYTES);
        stateBufferSabRef.current = new SharedArrayBuffer(STATE_BUFFER_SIZE_BYTES);
        console.log("[WavePlayerProvider] Created SharedArrayBuffers.");

        // 2. Create AudioContext and GainNode
        const context = new AudioContext();
        audioContextRef.current = context;
        const gainNode = context.createGain();
        gainNode.gain.setValueAtTime(state.volume, context.currentTime);
        gainNode.connect(context.destination);
        gainNodeRef.current = gainNode;
        console.log("[WavePlayerProvider] AudioContext and GainNode created.");

        // 3. Create and setup Worker
        const workerUrl = new URL(
          "../lib/wave-player/worker/wave-player.worker.ts",
          import.meta.url
        );
        const worker = new Worker(workerUrl, { type: "module" });
        worker.onmessage = handleWorkerMessage;
        worker.onerror = (error) => {
          console.error("[WavePlayerProvider] Worker onerror:", error);
          dispatch({
            type: "SET_ERROR",
            payload: `Worker error: ${error.message}`,
          });
        };
        workerRef.current = worker;
        console.log("[WavePlayerProvider] Worker created.");

        // 4. Add AudioWorklet module
        const workletUrl = new URL(
          "../lib/wave-player/worklet/wave-player.processor.ts",
          import.meta.url
        );
        // Ensure we have unique URLs if HMR causes issues, though `new URL` often helps
        await context.audioWorklet.addModule(workletUrl.toString());
        console.log("[WavePlayerProvider] AudioWorklet module added.");

        // 5. Create AudioWorkletNode
        const workletNode = new AudioWorkletNode(
          context,
          "wave-player-processor",
          // We could pass SABs via processorOptions if needed, but worker init is preferred
          // processorOptions: {
          //   ringBufferSab: ringBufferSabRef.current,
          //   stateBufferSab: stateBufferSabRef.current
          // }
          {
              processorOptions: {
                  ringBufferDataSab: ringBufferSabRef.current, // Pass Data SAB
                  stateBufferSab: stateBufferSabRef.current,    // Pass State SAB
                  numChannels: 2 // Assume Stereo for initial setup
              }
          }
        );
        workletNode.connect(gainNode);
        workletNodeRef.current = workletNode;
        console.log(
          "[WavePlayerProvider] AudioWorkletNode created and connected."
        );

        // 6. Send Initialize command to Worker
        if (!ringBufferSabRef.current || !stateBufferSabRef.current) {
          throw new Error("SharedArrayBuffers not initialized before sending command");
        }
        const initializeCommand: ProviderCommand = {
          type: "INITIALIZE",
          // Pass the worklet URL for potential use inside the worker if needed
          // (e.g., if worker needs to create more worklets - unlikely here)
          audioWorkletProcessorUrl: workletUrl.toString(),
          ringBufferSab: ringBufferSabRef.current,
          stateBufferSab: stateBufferSabRef.current,
        };
        worker.postMessage(initializeCommand);
        console.log("[WavePlayerProvider] Sent INITIALIZE command to worker.");

        // State will transition to 'idle' when worker sends 'INITIALIZED' back
      } catch (error) {
        if (!didCancel) {
          console.error("[WavePlayerProvider] Initialization failed:", error);
          dispatch({
            type: "SET_ERROR",
            payload: `Initialization failed: ${
              error instanceof Error ? error.message : String(error)
            }`,
          });
        }
      }
    }

    initializeAudio();

    // Cleanup function
    return () => {
      didCancel = true;
      console.log("[WavePlayerProvider] Cleaning up audio system...");
      // Terminate Worker
      if (workerRef.current) {
        // Send terminate message before closing to allow worker cleanup
        const terminateCommand: ProviderCommand = { type: "TERMINATE" };
        workerRef.current.postMessage(terminateCommand);
        // Allow a brief moment for worker cleanup before terminating forcefully
        setTimeout(() => {
          workerRef.current?.terminate();
          workerRef.current = null;
          console.log("[WavePlayerProvider] Worker terminated.");
        }, 50); // Adjust timeout as needed
      }
      // Disconnect and clean up Audio Nodes
      if (workletNodeRef.current) {
        workletNodeRef.current.disconnect();
        workletNodeRef.current = null;
        console.log("[WavePlayerProvider] WorkletNode disconnected.");
      }
      if (gainNodeRef.current) {
        gainNodeRef.current.disconnect();
        gainNodeRef.current = null;
        console.log("[WavePlayerProvider] GainNode disconnected.");
      }
      // Close AudioContext
      if (
        audioContextRef.current &&
        audioContextRef.current.state !== "closed"
      ) {
        audioContextRef.current
          .close()
          .then(() => {
            console.log("[WavePlayerProvider] AudioContext closed.");
            audioContextRef.current = null;
          })
          .catch((err) => {
            console.error(
              "[WavePlayerProvider] Error closing AudioContext:",
              err
            );
            audioContextRef.current = null; // Still nullify ref
          });
      } else {
        audioContextRef.current = null;
      }
      // Nullify SAB refs
      ringBufferSabRef.current = null;
      stateBufferSabRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleWorkerMessage]); // Only re-run if message handler instance changes (shouldn't)

  // --- Control Functions ---

  const postCommandToWorker = useCallback(
    (command: ProviderCommand) => {
      if (!workerRef.current) {
        console.error(
          "[WavePlayerProvider] Cannot send command, worker not available."
        );
        dispatch({
          type: "SET_ERROR",
          payload: "Audio worker is not available.",
        });
        return;
      }
      if (state.status === "initializing") {
        console.warn(
          "[WavePlayerProvider] Cannot send command while initializing."
        );
        // Maybe queue commands later? For now, just block.
        return;
      }
      console.log("[WavePlayerProvider] Posting command:", command.type, command);
      workerRef.current.postMessage(command);
    },
    [state.status]
  );

  const load = useCallback(
    (track: WavePlayerTrack) => {
      // Reset state before loading new track
      dispatch({ type: "SET_TRACK", payload: track });
      postCommandToWorker({ type: "LOAD", track });
    },
    [postCommandToWorker]
  );

  const play = useCallback(() => {
    if (
      state.status === "ready" ||
      state.status === "paused" ||
      state.status === "ended"
    ) {
      if (audioContextRef.current?.state === "suspended") {
        audioContextRef.current
          .resume()
          .then(() => {
            console.log("[WavePlayerProvider] AudioContext resumed.");
            postCommandToWorker({ type: "PLAY" });
          })
          .catch((err) => {
            console.error(
              "[WavePlayerProvider] Failed to resume AudioContext:",
              err
            );
            dispatch({
              type: "SET_ERROR",
              payload: "Failed to resume audio context.",
            });
          });
      } else {
        postCommandToWorker({ type: "PLAY" });
      }
    } else {
      console.warn(`[WavePlayerProvider] Cannot play in status: ${state.status}`);
    }
  }, [state.status, postCommandToWorker]);

  const pause = useCallback(() => {
    if (state.status === "playing") {
      postCommandToWorker({ type: "PAUSE" });
    }
  }, [state.status, postCommandToWorker]);

  const seek = useCallback(
    (time: number) => {
      if (state.currentTrack && state.duration > 0) {
        const clampedTime = Math.max(0, Math.min(time, state.duration));
        // Optimistically update UI time, worker will send precise updates
        dispatch({ type: "SET_CURRENT_TIME", payload: clampedTime });
        dispatch({ type: "SET_STATUS", payload: "seeking" });
        postCommandToWorker({ type: "SEEK", time: clampedTime });
      }
    },
    [state.currentTrack, state.duration, postCommandToWorker]
  );

  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    dispatch({ type: "SET_VOLUME", payload: clampedVolume });
    if (gainNodeRef.current && audioContextRef.current) {
      // Use setTargetAtTime for smoother volume changes
      gainNodeRef.current.gain.setTargetAtTime(
        clampedVolume,
        audioContextRef.current.currentTime,
        0.01 // Time constant for the exponential change
      );
    }
    // Optional: Persist volume preference (e.g., localStorage)
    // Optional: Send volume to worker if it needs to know (e.g., for analysis)
    // postCommandToWorker({ type: "SET_VOLUME", volume: clampedVolume });
  }, []);

  const setLoop = useCallback(
    (loop: boolean) => {
      dispatch({ type: "SET_LOOPING", payload: loop });
      postCommandToWorker({ type: "SET_LOOP", loop });
    },
    [postCommandToWorker]
  );

  // Memoize context value
  const contextValue = useMemo(
    () => ({
      state,
      load,
      play,
      pause,
      seek,
      setVolume,
      setLoop,
    }),
    [state, load, play, pause, seek, setVolume, setLoop]
  );

  return (
    <WavePlayerContext.Provider value={contextValue}>
      {children}
    </WavePlayerContext.Provider>
  );
}

// === Hook ===

export function useWavePlayer() {
  const context = useContext(WavePlayerContext);
  if (context === undefined) {
    throw new Error("useWavePlayer must be used within a WavePlayerProvider");
  }
  return context;
}
