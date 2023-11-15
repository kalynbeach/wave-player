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
    <div className="wave-player w-fit md:w-full md:max-w-3xl p-2 flex flex-col gap-2 md:flex-row border rounded-sm">
      <div className="flex">
        <TrackImage />
      </div>
      <div className="w-full flex flex-col gap-2 justify-between">
        <TrackInfo track={currentTrack} />
        <TrackControls track={currentTrack} />
      </div>
      {/* Track Info */}
      {/* Track Controls */}
    </div>
  );
}