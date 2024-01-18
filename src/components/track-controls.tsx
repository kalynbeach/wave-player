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
  isLooping: boolean;
  isMuted: boolean;
  play: () => void;
  pause: () => void;
  previous: () => void;
  next: () => void;
  mute: () => void;
  audioRef: React.RefObject<HTMLAudioElement>;
  progressBarRef: React.RefObject<HTMLInputElement>;
};

export default function TrackControls({
  track,
  trackDuration,
  currentTime,
  isPlaying,
  isLooping,
  isMuted,
  play,
  pause,
  previous,
  next,
  mute,
  audioRef,
  progressBarRef,
}: TrackControlsProps) {
  return (
    <div className="track-controls w-full flex flex-col md:flex-row gap-2 items-center justify-between">
  
      <div className="w-full flex flex-row items-center justify-between md:justify-start md:gap-2">
        <div className="flex">
          {/* Loop */}
          <Button variant="ghost" size="icon" className="w-10 h-10 rounded-sm">
            <LoopIcon className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex flex-row gap-2">
          {/* Previous */}
          <Button variant="ghost" size="icon" className="w-10 h-10 rounded-sm" onClick={previous}>
            <TrackPreviousIcon className="w-5 h-5" />
          </Button>
          {/* Play/Pause */}
          <Button variant="ghost" size="icon" className="w-10 h-10 rounded-sm" onClick={isPlaying ? pause : play}>
            { isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" /> }
          </Button>
          {/* Next */}
          <Button variant="ghost" size="icon" className="w-10 h-10 rounded-sm" onClick={next}>
            <TrackNextIcon className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="flex">
          {/* Volume */}
          <Button variant="ghost" size="icon" className="w-10 h-10 rounded-sm" onClick={mute}>
            { isMuted ? <SpeakerOffIcon className="w-5 h-5" /> : <SpeakerLoudIcon className="w-5 h-5" />}
          </Button>
        </div>
      </div>
  
      <TrackProgressBar
        trackDuration={trackDuration}
        currentTime={currentTime}
        audioRef={audioRef}
        progressBarRef={progressBarRef}
      />
    </div>
  );
}