import TrackProgressBar from "./track-progress-bar";
import type { Track } from "@/lib/definitions";

type TrackControlsProps = {
  track: Track;
};

export default function TrackControls({ track }: TrackControlsProps) {
  return (
    <div className="flex flex-col">
      {/* Previous */}
      {/* Play/Pause */}
      {/* Next */}
      {/* Progress Bar */}
      <TrackProgressBar track={track} />
      {/* Volume */}
    </div>
  );
}