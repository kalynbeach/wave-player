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
      <div className="track-control-buttons w-full md:w-fit flex flex-row items-center justify-between md:gap-2">
        <div className="flex">
          {/* Loop */}
          <ControlButton label={"loop"} onClick={() => { console.log(`loopin'`); }}>
            <LoopIcon className="w-5 h-5" />
          </ControlButton>
        </div>
        <div className="flex flex-row gap-2">
          {/* Previous */}
          <ControlButton label={"previous"} onClick={previous}>
            <TrackPreviousIcon className="w-5 h-5" />
          </ControlButton>
          {/* Play/Pause */}
          <ControlButton label={isPlaying ? "pause" : "play"} onClick={isPlaying ? pause : play}>
            { isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" /> }
          </ControlButton>
          {/* Next */}
          <ControlButton label={"next"} onClick={next}>
            <TrackNextIcon className="w-5 h-5" />
          </ControlButton>
        </div>
        <div className="flex">
          {/* Volume */}
          <ControlButton label={"mute"} onClick={mute}>
           { isMuted ? <SpeakerOffIcon className="w-5 h-5" /> : <SpeakerLoudIcon className="w-5 h-5" />}
          </ControlButton>
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

type ControlButtonProps = {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
};

function ControlButton({
  children,
  onClick,
  label
}: ControlButtonProps) {
  return (
    <Button
      onClick={onClick}
      className="w-10 h-10 border border-neutral-900 rounded-sm transition dark:hover:bg-neutral-900/30 dark:hover:border-neutral-900/70 dark:hover:text-green-500"
      variant="ghost"
      size="icon"
      data-label={label}
    >
      {children}
    </Button>
  );
}