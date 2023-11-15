import type { Track } from "@/lib/definitions";

type TrackProgressBar = {
  track: Track;
};

export default function TrackProgressBar({ track }: TrackProgressBar) {
  return (
    <div className="track-progress-bar w-full h-6 flex flex-row">
      <input
        type="range"
        className="w-full accent-green-600 dark:accent-green-400"
        // ref
      />
    </div>
  );
}