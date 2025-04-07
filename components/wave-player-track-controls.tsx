"use client";

// import { formatTime } from "@/lib/utils";
import { CardFooter } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  Play,
  // Pause,
  SkipBack,
  SkipForward,
  // Volume2,
  // Repeat,
} from "lucide-react";

// TODO: declare WavePlayerTrackControlsProps

export function WavePlayerTrackControls() {
  // TODO: integrate with WavePlayerContext (useWavePlayer hook) as needed

  return (
    <CardFooter className="wave-player-track-controls bg-accent/70 flex h-32 w-full flex-col items-center justify-center gap-2 rounded-b-sm border p-2">
      {/* Progress Slider */}
      <Slider value={[0]} max={100} step={1} className="w-full" />
      {/* Track Control Buttons */}
      <div className="flex flex-row items-center gap-2">
        <Button variant="outline" size="icon">
          <SkipBack />
        </Button>
        <Button variant="outline" size="icon">
          <Play />
        </Button>
        <Button variant="outline" size="icon">
          <SkipForward />
        </Button>
      </div>
    </CardFooter>
  );
}
