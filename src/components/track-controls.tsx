import type { Track } from "@/lib/definitions";
import TrackProgressBar from "./track-progress-bar";
import { Button } from "@/components/ui/button";
import {
  PlayIcon,
  PauseIcon,
  TrackPreviousIcon,
  TrackNextIcon,
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
      <div className="flex flex-row">
        {/* Previous */}
        <Button variant="ghost" size="icon">
          <TrackPreviousIcon />
        </Button>
        {/* Play/Pause */}
        <Button variant="ghost" size="icon">
          { isPlaying ? <PauseIcon /> : <PlayIcon /> }
        </Button>
        {/* Next */}
        <Button variant="ghost" size="icon">
          <TrackNextIcon />
        </Button>
        {/* Volume */}
        <Button variant="ghost" size="icon">
          { isMuted ? <SpeakerOffIcon /> : <SpeakerLoudIcon />}
        </Button>
      </div>
      <TrackProgressBar track={track} />
    </div>
  );
}