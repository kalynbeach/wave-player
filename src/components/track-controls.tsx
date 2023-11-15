import type { Track } from "@/lib/definitions";
import TrackProgressBar from "./track-progress-bar";
import { Button } from "@/components/ui/button";
import {
  PlayIcon,
  PauseIcon,
  TrackPreviousIcon,
  TrackNextIcon,
  LoopIcon,
  SpeakerLoudIcon,
  SpeakerOffIcon,
} from "@radix-ui/react-icons";

type TrackControlsProps = {
  track: Track;
  trackDuration: number;
  currentTime: number;
  isPlaying: boolean;
  play: () => void;
  pause: () => void;
  previous: () => void;
  next: () => void;
  mute: () => void;
};

export default function TrackControls({
  track,
  trackDuration,
  currentTime,
  isPlaying,
  play,
  pause,
  previous,
  next,
  mute,
}: TrackControlsProps) {
  const isMuted = false;

  return (
    <div className="track-controls w-full flex flex-col md:flex-row items-center justify-between">
  
      <div className="w-full flex flex-row items-center justify-between md:justify-start md:gap-2">
        <div className="flex">
          {/* Loop */}
          <Button variant="ghost" size="icon" className="rounded-sm">
            <LoopIcon />
          </Button>
        </div>

        <div className="flex flex-row gap-2">
          {/* Previous */}
          <Button variant="ghost" size="icon" className="rounded-sm" onClick={play}>
            <TrackPreviousIcon />
          </Button>
          {/* Play/Pause */}
          <Button variant="ghost" size="icon" className="rounded-sm" onClick={isPlaying ? pause : play}>
            { isPlaying ? <PauseIcon /> : <PlayIcon /> }
          </Button>
          {/* Next */}
          <Button variant="ghost" size="icon" className="rounded-sm" onClick={next}>
            <TrackNextIcon />
          </Button>
        </div>
        
        <div className="flex">
          {/* Volume */}
          <Button variant="ghost" size="icon" className="rounded-sm" onClick={mute}>
            { isMuted ? <SpeakerOffIcon /> : <SpeakerLoudIcon />}
          </Button>
        </div>
      </div>
  
      <TrackProgressBar
        track={track}
        trackDuration={trackDuration}
        currentTime={currentTime}
      />
    </div>
  );
}