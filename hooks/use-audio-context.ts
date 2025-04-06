import { useEffect, useRef } from "react";

export function useAudioContext(contextOptions?: AudioContextOptions) {
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    audioContextRef.current = new AudioContext(contextOptions);
  }, [contextOptions]);

  return audioContextRef.current;
}
