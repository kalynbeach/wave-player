import type { Track } from "@/lib/definitions";
import TrackImage from "./track-image";
import TrackInfo from "./track-info";
import TrackControls from "./track-controls";

type WavePlayerProps = {
  tracks: Track[];
};

export default function WavePlayer({ tracks }: WavePlayerProps) {
  
  const currentTrack: Track = tracks[0];

  return (
    <div className="wave-player flex flex-col md:flex-row p-4 border">
      <TrackImage />
      <TrackInfo track={currentTrack} />
      <TrackControls track={currentTrack} />
      {/* Track Info */}
      {/* Track Controls */}
    </div>
  );
}