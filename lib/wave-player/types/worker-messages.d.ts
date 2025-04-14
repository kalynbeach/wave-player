import type { WavePlayerStatus, WavePlayerTrack } from "./wave-player";

// === Commands: Provider -> Worker ===

export interface InitializeCommand {
  type: "INITIALIZE";
  // Potential options like preferred buffer sizes, etc. could go here
  audioWorkletProcessorUrl: string; // URL needed to load the worklet module
  ringBufferSab: SharedArrayBuffer; // SAB for audio samples
  stateBufferSab: SharedArrayBuffer; // SAB for atomic state sharing (play/pause etc.)
}

export interface LoadCommand {
  type: "LOAD";
  track: WavePlayerTrack;
}

export interface PlayCommand {
  type: "PLAY";
}

export interface PauseCommand {
  type: "PAUSE";
}

export interface SeekCommand {
  type: "SEEK";
  time: number; // Target time in seconds
}

export interface SetVolumeCommand {
  type: "SET_VOLUME";
  volume: number; // 0 to 1
}

export interface SetLoopCommand {
  type: "SET_LOOP";
  loop: boolean;
}

export interface PreloadCommand {
  type: "PRELOAD";
  trackUrl: string;
}

export interface TerminateCommand {
  type: "TERMINATE";
}

/**
 * Discriminated union of all commands sent from the Provider to the Worker.
 */
export type ProviderCommand =
  | InitializeCommand
  | LoadCommand
  | PlayCommand
  | PauseCommand
  | SeekCommand
  | SetVolumeCommand
  | SetLoopCommand
  | PreloadCommand
  | TerminateCommand;

// === Messages: Worker -> Provider ===

export interface InitializedMessage {
  type: "INITIALIZED";
}

export interface LoadingProgressMessage {
  type: "LOADING_PROGRESS";
  trackId: string;
  progress: number; // 0 to 1
  downloadedBytes: number;
  totalBytes: number | null; // Can be null if Content-Length is missing
}

export interface TrackReadyMessage {
  type: "TRACK_READY";
  trackId: string;
  duration: number; // Total duration in seconds
  sampleRate: number;
  numberOfChannels: number;
}

export interface StatusUpdateMessage {
  type: "STATUS_UPDATE";
  status: WavePlayerStatus;
  trackId?: string; // Include trackId when relevant to the status
}

export interface TimeUpdateMessage {
  type: "TIME_UPDATE";
  trackId: string;
  currentTime: number;
}

export interface VisualizationDataMessage {
  type: "VISUALIZATION_DATA";
  trackId: string;
  // Define specific visualization data structures later (e.g., waveform, frequency bins)
  data: unknown;
}

export interface ErrorMessage {
  type: "ERROR";
  message: string;
  trackId?: string; // Optional track context for the error
  error?: unknown; // Optional raw error object
}

export interface TrackEndedMessage {
  type: "TRACK_ENDED";
  trackId: string;
}

/**
 * Discriminated union of all messages sent from the Worker to the Provider.
 */
export type WorkerMessage =
  | InitializedMessage
  | LoadingProgressMessage
  | TrackReadyMessage
  | StatusUpdateMessage
  | TimeUpdateMessage
  | VisualizationDataMessage
  | ErrorMessage
  | TrackEndedMessage;
