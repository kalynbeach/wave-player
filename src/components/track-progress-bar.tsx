import type { Track } from "@/lib/definitions";

type TrackProgressBar = {
  track: Track;
  trackDuration: number;
  currentTime: number;
};

export default function TrackProgressBar({ track, trackDuration, currentTime }: TrackProgressBar) {

  function formattedTime(time: number): string {
    if (time === 0) return `00:00`;
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const formattedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
    const formattedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;
    return `${formattedMinutes}:${formattedSeconds}`;
  }

  return (
    <div className="track-progress-bar w-full flex flex-row items-center justify-between">
      {/* Current Time */}
      <div className="w-[56px] p-2 flex flex-row items-center justify-start">
        <span className="text-xs">{formattedTime(currentTime)}</span>
      </div>

      {/* Progress Bar */}
      <div className="flex flex-row items-center justify-center">
        <input
          type="range"
          className="accent-green-600 dark:accent-green-400"
          // ref
        />
      </div>

      {/* Track Duration */}
      <div className="w-[56px] p-2 flex flex-row items-center justify-end">
        <span className="text-xs">{formattedTime(trackDuration)}</span>
      </div>
    </div>
  );
}