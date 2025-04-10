"use client";

import { useState, useEffect } from "react";
import type { WavePlayerTrack } from "@/lib/wave-player/types/wave-player";
import { useWavePlayer } from "@/hooks/use-wave-player";
import { Card } from "@/components/ui/card";
import { WavePlayerTrackInfo } from "@/components/wave-player-track-info";
import { WavePlayerTrackVisual } from "@/components/wave-player-track-visual";
import { WavePlayerTrackControls } from "@/components/wave-player-track-controls";

// TODO: figure out optimal WavePlayerProps
// TODO: figure out optimal track loading

type WavePlayerProps = {
  tracks: WavePlayerTrack[];
  initialTrackIndex?: number;
};

export function WavePlayer({ tracks, initialTrackIndex = 0 }: WavePlayerProps) {
  const { state, load } = useWavePlayer();
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(initialTrackIndex);

  useEffect(() => {
    if (tracks.length > 0) {
      const validIndex = Math.max(0, Math.min(currentTrackIndex, tracks.length - 1));
      if (validIndex !== currentTrackIndex) {
        setCurrentTrackIndex(validIndex);
      } else {
        const isProviderInitialized = state.status !== "initializing";
        const isDifferentTrack = state.currentTrack?.id !== tracks[validIndex].id;
        // const needsLoad = isProviderInitialized && (isDifferentTrack || state.status === "idle" || state.status === "ended" || state.status === "error");
        const needsLoad = isProviderInitialized && (isDifferentTrack || state.status === "idle" || state.status === "ended");
        console.log("[WavePlayer] isProviderInitialized:", isProviderInitialized);
        console.log("[WavePlayer] isDifferentTrack:", isDifferentTrack);
        console.log("[WavePlayer] needsLoad:", needsLoad);

        if (needsLoad) {
          console.log(`[WavePlayer] Loading track index: ${validIndex} (Provider Status: ${state.status})`);
          load(tracks[validIndex]);
        } else if (!isProviderInitialized) {
          console.log(`[WavePlayer] Skipping load for index ${validIndex}: Provider is still initializing.`);
        } else {
          // Optional debug log for other skipped cases
          // console.log(`[WavePlayer] Skipping load for index ${validIndex}. Status: ${state.status}, Track ID Match: ${state.currentTrack?.id === tracks[validIndex].id}`);
        }
      }
    }
  }, [tracks, currentTrackIndex, load, state.status, state.currentTrack?.id]);

  const handleNextTrack = () => {
    setCurrentTrackIndex((prevIndex) => (prevIndex + 1) % tracks.length);
  };

  const handlePreviousTrack = () => {
    setCurrentTrackIndex((prevIndex) => (prevIndex - 1 + tracks.length) % tracks.length);
  };

  // const currentTrack = state.currentTrack;

  return (
    <Card className="wave-player bg-background aspect-[5/7] w-[380px] gap-1 rounded-sm border p-1">
      <WavePlayerTrackInfo />
      <WavePlayerTrackVisual />
      <WavePlayerTrackControls
        onNextTrack={handleNextTrack}
        onPreviousTrack={handlePreviousTrack}
        isNextDisabled={currentTrackIndex === tracks.length - 1}
        isPreviousDisabled={currentTrackIndex === 0}
      />
    </Card>
  );
}
