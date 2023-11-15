import Image from "next/image";
import type { Track } from "@/lib/definitions";

type TrackInfoProps = {
  track: Track;
};

export default function TrackInfo({ track }: TrackInfoProps) {
  return (
    <div className="track-info h-full flex flex-col justify-between">
      <span className="text-xl font-bold">{track.title}</span>
      <span className="text-lg font-medium">{track.artist}</span>
      <span className="">{track.record}</span>
    </div>
  );
}