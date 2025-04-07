import type { WavePlayerTrack } from "@/lib/wave-player/types/wave-player";
// import { useWavePlayer } from "@/contexts/wave-player-context";
import { Card } from "@/components/ui/card";
import { WavePlayerTrackInfo } from "@/components/wave-player-track-info";
import { WavePlayerTrackVisual } from "@/components/wave-player-track-visual";
import { WavePlayerTrackControls } from "@/components/wave-player-track-controls";

// TODO: figure out optimal WavePlayerProps
// TODO: figure out optimal track loading

type WavePlayerProps = {
  tracks: WavePlayerTrack[];
};

export function WavePlayer({ tracks }: WavePlayerProps) {
  // TODO: integrate with WavePlayerContext (useWavePlayer hook)
  // const { state, load, play, pause, seek, setVolume, setLoop } = useWavePlayer();

  return (
    <Card className="wave-player bg-background aspect-[5/7] w-[380px] gap-1 rounded-sm border p-1">
      <WavePlayerTrackInfo
        title="title"
        record="record"
        artist="artist"
      />
      <WavePlayerTrackVisual />
      <WavePlayerTrackControls />
    </Card>
  );
}
