"use client";

import type { Track } from "@/lib/definitions";
import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress"

type TrackProgressBar = {
  trackDuration: number;
  currentTime: number;
  audioRef: React.RefObject<HTMLAudioElement>;
  progressBarRef: React.RefObject<HTMLInputElement>;
};

export default function TrackProgressBar({ trackDuration, currentTime, audioRef, progressBarRef }: TrackProgressBar) {
  // const [progress, setProgress] = useState<number>(0);

  function formatTime(time: number): string {
    if (time === 0) return `00:00`;
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const formattedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
    const formattedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;
    return `${formattedMinutes}:${formattedSeconds}`;
  }

  function onProgressBarChange(event: React.ChangeEvent<HTMLInputElement>) {
    console.log(`[TrackProgressBar] onProgressBarChange: `, parseInt(event.target.value));
    if (!audioRef.current) return;
    audioRef.current.currentTime = parseInt(event.target.value);
  }

  return (
    <div className="track-progress-bar w-full flex flex-row items-center justify-between">
      {/* Current Time */}
      <div className="w-[56px] p-2 flex flex-row items-center justify-start">
        <span className="text-xs">{formatTime(currentTime)}</span>
      </div>

      {/* Progress Bar */}
      <div className="w-full flex flex-row items-center justify-center">
        <input
          type="range"
          ref={progressBarRef}
          onChange={onProgressBarChange}
          value={currentTime}
          max={Math.round(trackDuration)}
          className="w-full accent-green-600 dark:accent-green-400"
        />
        {/* <Progress
          value={progress}
          max={Math.round(trackDuration)}
          className="accent-green-600 dark:accent-green-400"
        /> */}
      </div>

      {/* Track Duration */}
      <div className="w-[56px] p-2 flex flex-row items-center justify-end">
        <span className="text-xs">{formatTime(trackDuration)}</span>
      </div>
    </div>
  );
}