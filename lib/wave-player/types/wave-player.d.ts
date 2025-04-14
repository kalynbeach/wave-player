// NOTE: These types and interfaces are NOT final and are subject to change

/**
 * Consistent status reporting across Provider and Worker.
 */
export type WavePlayerStatus =
  | "initializing"
  | "idle"
  | "loading"
  | "buffering" // Added to distinguish between initial load and buffering during playback/seek
  | "ready" // Track loaded, ready to play (or resumed after buffering)
  | "playing"
  | "paused"
  | "seeking"
  | "ended" // Track finished playing naturally
  | "stopped" // Playback explicitly stopped (e.g., new track loaded)
  | "error";

export type WavePlayerImage = {
  src: string;
  alt: string;
};

export type WavePlayerTrack = {
  id: string;
  src: string;
  title: string;
  artist: string;
  record: string;
  image: WavePlayerImage;
  isLoop: boolean;
};

export interface WavePlayerTrackHeaderInfo {
  format: number; // e.g. 1 for PCM
  numChannels: number;
  sampleRate: number;
  byteRate: number;
  blockAlign: number;
  bitsPerSample: number;
  dataOffset: number; // Start byte of the 'data' chunk
  dataSize: number; // Size in bytes of the 'data' chunk
}

export type WavePlayerPlaylist = {
  id: string;
  title: string;
  description: string;
  tracks: WavePlayerTrack[];
  createdAt: Date;
  updatedAt: Date;
};

export interface WavePlayerControls {
  play: () => Promise<void>;
  pause: () => void;
  seek: (time: number) => void;
  nextTrack: () => void;
  previousTrack: () => void;
  setVolume: (volume: number) => void;
  setLoop: (loop: boolean) => void;
}
