import type { Track } from "@/lib/definitions";

type TrackProgressBar = {
  track: Track;
  trackDuration: number;
  currentTime: number;
  rangeInputRef: React.RefObject<HTMLInputElement>;
};

export default function TrackProgressBar({ track, trackDuration, currentTime, rangeInputRef }: TrackProgressBar) {

  function formattedTime(time: number): string {
    if (time === 0) return `00:00`;
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const formattedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
    const formattedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;
    return `${formattedMinutes}:${formattedSeconds}`;
  }

  function onProgressBarChange(event: React.ChangeEvent<HTMLInputElement>) {
    console.log(`[TrackProgressBar] onProgressBarChange: `, event.target.value);
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
          ref={rangeInputRef}
          defaultValue={0}
          onChange={onProgressBarChange}
          className="accent-green-600 dark:accent-green-400"
        />
      </div>

      {/* Track Duration */}
      <div className="w-[56px] p-2 flex flex-row items-center justify-end">
        <span className="text-xs">{formattedTime(trackDuration)}</span>
      </div>
    </div>
  );
}