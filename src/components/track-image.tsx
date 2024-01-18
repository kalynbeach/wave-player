import Image from "next/image";
import type { TrackImage } from "@/lib/definitions";

type TrackImageProps = {
  image?: TrackImage;
};

export default function TrackImage({ image }: TrackImageProps) {
  return (
    <div className="track-image w-64 h-64 md:w-40 md:h-40 flex items-center justify-center bg-neutral-900/30 border border-neutral-900 rounded-sm">
      { image ? (
        <Image
          src={image.src}
          alt={image.alt}
          width={256}
          height={256}
          priority
        />
      ) : (
        <>🌐</>
        // <div className="w-64 h-64 md:w-40 md:h-40 flex items-center justify-center bg-neutral-300 border rounded-sm">
        //   <span>🎵</span>
        // </div>
      ) }
    </div>
  );
}