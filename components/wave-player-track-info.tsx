import { useWavePlayer } from "@/hooks/use-wave-player";
import {
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function WavePlayerTrackInfo() {
  const { state } = useWavePlayer();
  const { currentTrack } = state;

  const title = currentTrack?.title ?? "--";
  const record = currentTrack?.record ?? "--";
  const artist = currentTrack?.artist ?? "--";

  return (
    <CardHeader className="wave-player-track-info font-mono bg-accent/50 border rounded-t-sm p-2 gap-1">
      <CardTitle>
        <p className="font-bold">{title}</p>
      </CardTitle>
      <CardDescription className="text-primary">
        <p className="text-sm">{record}</p>
        <p className="text-xs">{artist}</p>
      </CardDescription>
    </CardHeader>
  );
}
