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

export type WavePlayerPlaylist = {
  id: string;
  title: string;
  description: string;
  tracks: WavePlayerTrack[];
  createdAt: Date;
  updatedAt: Date;
};

export type WavePlayerState =
  | { status: "idle" }
  | { status: "loading"; track: WavePlayerTrack; progress: number }
  | { status: "ready"; track: WavePlayerTrack; buffer: AudioBuffer }
  | {
      status: "playing";
      track: WavePlayerTrack;
      buffer: AudioBuffer;
      startTime: number;
    }
  | {
      status: "paused";
      track: WavePlayerTrack;
      buffer: AudioBuffer;
      position: number;
    }
  | { status: "error"; error: Error };

export interface WavePlayerControls {
  play: () => Promise<void>;
  pause: () => void;
  seek: (time: number) => void;
  nextTrack: () => void;
  previousTrack: () => void;
  setVolume: (volume: number) => void;
  setLoop: (loop: boolean) => void;
}

/**
 * WavePlayerAudioEngine
 */
export interface IWavePlayerAudioEngine {}

export interface WavePlayerBufferPool {}

export interface WavePlayerBufferManagerOptions {}

/**
 * WavePlayerBufferManager
 */
export interface IWavePlayerBufferManager {
  pool: WavePlayerBufferPool;
  controller: AbortController | null;
}