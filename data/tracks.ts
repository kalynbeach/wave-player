import type { WavePlayerTrack } from "@/lib/wave-player/types/wave-player";

// NOTE: Placeholder tracks for initial development
export const PLACEHOLDER_TRACKS: WavePlayerTrack[] = [
  {
    id: "1",
    title: "0_initializer",
    artist: "Kalyn Beach",
    record: "loops",
    src: "https://kkb-sounds.s3.us-west-1.amazonaws.com/loops/0_initializer.wav",
    image: {
      src: "/icon.svg",
      alt: "0_initializer"
    },
    isLoop: true
  },
  {
    id: "2",
    title: "1_workflows",
    artist: "Kalyn Beach",
    record: "loops",
    src: "https://kkb-sounds.s3.us-west-1.amazonaws.com/loops/1_workflows.wav",
    image: {
      src: "/globe.svg",
      alt: "1_workflows"
    },
    isLoop: true
  }
];