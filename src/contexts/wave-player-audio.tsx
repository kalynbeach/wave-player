"use client";

import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WavePlayerAudioProcessor } from "@/lib/wave-player-audio";
import { tracks } from "@/lib/placeholder-data";
import type { Track } from "@/lib/definitions";

type WavePlayerAudioState = {
  context: AudioContext | null;
  element: HTMLAudioElement | null;
  playlist: Track[];
  track: Track;
  trackDuration: number;
  currentTime: number;
  startTime: number;
  startOffset: number;
  isInitialized: boolean;
  isLooping: boolean;
  isPlaying: boolean;
  isMuted: boolean;
};

const initialState: WavePlayerAudioState = {
  context: null,
  element: null,
  playlist: tracks,
  track: tracks[0],
  trackDuration: 0,
  currentTime: 0,
  startTime: 0,
  startOffset: 0,
  isInitialized: false,
  isLooping: false,
  isPlaying: false,
  isMuted: false,
};

const WavePlayerAudioContext = createContext<
  [WavePlayerAudioState, React.Dispatch<React.SetStateAction<WavePlayerAudioState>>] | undefined
>(undefined);

export function useWavePlayerAudio() {
  const context = useContext(WavePlayerAudioContext);
  if (!context) {
    throw new Error("useWavePlayerAudio must be used within a WavePlayerAudioProvider");
  }
  return context;
}

export function WavePlayerAudioProvider({ children }: { children: React.ReactNode }) {
  const [audio, setAudio] = useState<WavePlayerAudioState>(initialState);

  const audioContext = useMemo(() => new AudioContext(), []);

  useEffect(() => {
    async function initializeAudioContext() {
      console.log(`[WavePlayerAudioProvider initializeAudioContext] initializing AudioContext`);
      const context = new AudioContext();
      setAudio((prev) => ({ ...prev, context }));
    }

    if (!audio.context) {
      console.log(`[WavePlayerAudioProvider] initializing AudioContext`);
      setAudio((prev) => ({ ...prev, context: audioContext }));
      // initializeAudioContext();
    }

    return () => {
      console.log(`[WavePlayerAudioProvider initializeAudioContext] closing AudioContext`);
      audio.context?.close();
    };
  }, [audioContext]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    async function initializeAudioElement() {
      console.log(`[WavePlayerAudioProvider initializeAudioElement] initializing audio: `, audio.track.title);
      const element = new Audio(audio.track.src);
      setAudio((prev) => ({ ...prev, element }));
    }

    if (audio.context) {
      initializeAudioElement();
    }

    return () => {
      console.log(`[WavePlayerAudioProvider initializeAudioElement] closing audio: `, audio.track.title);
      audio.element?.pause();
      audio.element?.remove();
    };
  }, [audio.context, audio.track]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <WavePlayerAudioContext.Provider value={[audio, setAudio]}>
      {children}
    </WavePlayerAudioContext.Provider>
  );
}
