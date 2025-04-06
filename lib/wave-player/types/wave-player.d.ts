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

export interface WavePlayerControls {
  play: () => Promise<void>;
  pause: () => void;
  seek: (time: number) => void;
  nextTrack: () => void;
  previousTrack: () => void;
  setVolume: (volume: number) => void;
  setLoop: (loop: boolean) => void;
}
