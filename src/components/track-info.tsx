import Image from "next/image";
import type { Track } from "@/lib/definitions";

type TrackInfoProps = {
  track: Track;
};

export default function TrackInfo({ track }: TrackInfoProps) {
  return (
    <div className="track-info h-full py-2 flex flex-col justify-between gap-1 md:gap-0">
      {/* TODO: Handle long text overflow */}
      <span className="text-xl md:text-2xl font-mono font-black">{track.title}</span>
      <span className="md:text-lg font-medium">{track.artist}</span>
      <span className="text-sm md:text-base font-mono font-bold">{track.record}</span>
    </div>
  );
}