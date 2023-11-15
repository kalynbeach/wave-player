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
};

export default function TrackControls({ track }: TrackControlsProps) {
  // TEMP
  const isPlaying = false;
  const isMuted = false;

  return (
    <div className="track-controls w-full flex flex-col md:flex-row items-center justify-between">
  
      <div className="w-full flex flex-row items-center justify-between">
        <div className="flex">
          {/* Loop */}
          <Button variant="ghost" size="icon" className="rounded-sm">
            <LoopIcon />
          </Button>
        </div>

        <div className="flex flex-row gap-1">
          {/* Previous */}
          <Button variant="ghost" size="icon" className="rounded-sm">
            <TrackPreviousIcon />
          </Button>
          {/* Play/Pause */}
          <Button variant="ghost" size="icon" className="rounded-sm">
            { isPlaying ? <PauseIcon /> : <PlayIcon /> }
          </Button>
          {/* Next */}
          <Button variant="ghost" size="icon" className="rounded-sm">
            <TrackNextIcon />
          </Button>
        </div>
        
        <div className="flex">
          {/* Volume */}
          <Button variant="ghost" size="icon" className="rounded-sm">
            { isMuted ? <SpeakerOffIcon /> : <SpeakerLoudIcon />}
          </Button>
        </div>
      </div>
  
      <TrackProgressBar track={track} />
    </div>
  );
}