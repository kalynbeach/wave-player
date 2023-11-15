import type { Track } from "@/lib/definitions";

type TrackProgressBar = {
  track: Track;
};

export default function TrackProgressBar({ track }: TrackProgressBar) {
  return (
    <div className="track-progress-bar flex flex-row">
      <input
        type="range"
        className="w-full"
        // ref
      />
    </div>
  );
}