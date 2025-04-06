// NOTE: These types and interfaces are NOT final and are subject to change

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
export interface IWavePlayerAudioEngine {
  decoder: AudioDecoder;
  fetchAudioChunk: (src: string) => Promise<EncodedAudioChunk>;
  decodeAudioChunk: (chunk: EncodedAudioChunk) => Promise<AudioData>;
}

export interface WavePlayerBufferPool {
  data: Map<string, AudioData>;
}

export interface WavePlayerBufferManagerOptions {
  chunkSize: number;
  poolSize: number;
}

/**
 * WavePlayerBufferManager
 */
export interface IWavePlayerBufferManager {
  options: WavePlayerBufferManagerOptions;
  pool: WavePlayerBufferPool;
  controller: AbortController | null;
}