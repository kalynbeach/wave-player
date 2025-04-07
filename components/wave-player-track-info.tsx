import {
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type WavePlayerTrackInfoProps = {
  title: string;
  record: string;
  artist: string;
};

export function WavePlayerTrackInfo({ title, record, artist }: WavePlayerTrackInfoProps) {
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
