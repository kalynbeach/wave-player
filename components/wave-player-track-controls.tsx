"use client";

import { useWavePlayer } from "@/hooks/use-wave-player";
import { formatTime } from "@/lib/utils";
import { CardFooter } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  // Volume2,
  // Repeat,
} from "lucide-react";

// Define props
type WavePlayerTrackControlsProps = {
  onNextTrack: () => void;
  onPreviousTrack: () => void;
  isNextDisabled: boolean;
  isPreviousDisabled: boolean;
};

export function WavePlayerTrackControls({
  onNextTrack,
  onPreviousTrack,
  isNextDisabled,
  isPreviousDisabled,
}: WavePlayerTrackControlsProps) {
  const { state, play, pause, seek } = useWavePlayer();

  const { status, currentTime, duration } = state;

  const isPlaying = status === "playing";
  const isLoading = status === "loading" || status === "initializing" || status === "seeking" || status === "buffering";
  const canPlayPause = status === "ready" || status === "paused" || status === "playing" || status === "ended";
  const canSeek = status !== "initializing" && status !== "loading" && duration > 0;

  const handleSeek = (value: number[]) => {
    if (canSeek) {
      seek(value[0]);
    }
  };

  return (
    <CardFooter className="wave-player-track-controls bg-accent/70 flex h-32 w-full flex-col items-center justify-center gap-2 rounded-b-sm border p-2">
      {/* Progress Display */}
      <div className="flex w-full justify-between text-xs font-mono">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
      {/* Progress Slider */}
      <Slider
        value={[currentTime]}
        max={duration}
        step={1}
        className="w-full"
        disabled={!canSeek || isLoading}
        onValueCommit={handleSeek}
      />
      {/* Track Control Buttons */}
      <div className="flex flex-row items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={onPreviousTrack}
          disabled={isPreviousDisabled || isLoading || !canPlayPause}
        >
          <SkipBack />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={isPlaying ? pause : play}
          disabled={!canPlayPause || isLoading}
        >
          {isPlaying ? <Pause /> : <Play />}
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={onNextTrack}
          disabled={isNextDisabled || isLoading || !canPlayPause}
        >
          <SkipForward />
        </Button>
      </div>
    </CardFooter>
  );
}
