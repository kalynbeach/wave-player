import Image from "next/image";
import type { Track } from "@/lib/definitions";

type TrackInfoProps = {
  track: Track;
};

export default function TrackInfo({ track }: TrackInfoProps) {
  return (
    <div className="flex flex-col">
      <span className="">{track.title}</span>
      <span className="">{track.artist}</span>
      <span className="">{track.record}</span>
    </div>
  );
}