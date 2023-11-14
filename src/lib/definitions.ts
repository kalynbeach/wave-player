export type Track = {
  id: string;
  src: string;
  title: string;
  artist: string;
  record?: string;
  image: TrackImage;
  loop: boolean;
};

export type TrackImage = {
  src: string;
  alt: string;
};