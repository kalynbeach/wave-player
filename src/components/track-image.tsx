import Image from "next/image";
import type { TrackImage } from "@/lib/definitions";

type TrackImageProps = {
  image?: TrackImage;
};

export default function TrackImage({ image }: TrackImageProps) {
  return (
    <div className="flex">
      { image ? (
        <Image
          src={image.src}
          alt={image.alt}
          width={256}
          height={256}
        />
      ) : (
        <div className="w-64 h-64 flex items-center justify-center bg-neutral-100">
          <span>🎵</span>
        </div>
      ) }
    </div>
  );
}