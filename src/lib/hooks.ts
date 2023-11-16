import { useState, useEffect } from "react";
import type { Track } from "@/lib/definitions";


export function useAudioContext() {
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const ctx = new AudioContext();
      setAudioContext(ctx);
      // Clean up AudioContext on unmount
      return () => {
        ctx.close();
      }
    }
  }, []);

  return audioContext;
}


export function useAudioBufferSourceNode(audioContext: AudioContext | null, url: string) {
  const [
    audioBufferSourceNode,
    setAudioBufferSourceNode
  ] = useState<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    async function initAudioBufferSourceNode() {
      if (!audioContext) {
        return;
      }
      const fetchInit: RequestInit = { method: 'GET', mode: 'cors' };
      try {
        const response = await fetch(url, fetchInit);
        const arrayBuffer = await response.arrayBuffer();
        const decodedAudioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const audioBufferSourceNode = audioContext.createBufferSource();
        audioBufferSourceNode.buffer = decodedAudioBuffer;
        setAudioBufferSourceNode(audioBufferSourceNode);
        // Clean up AudioBufferSourceNode on unmount
        return () => {
          audioBufferSourceNode.disconnect();
        }
      } catch (error) {
        throw new Error(`[useAudioBufferSourceNode] Error creating AudioBuffer: ${error}`);
      }
    }
    initAudioBufferSourceNode();
  }, [audioContext, url]);

  return audioBufferSourceNode;
}


export function useAudio(track: Track) {
  const audioContext = useAudioContext();
  const audioBufferSourceNode = useAudioBufferSourceNode(audioContext, track.src);

  useEffect(() => {
    if (!audioBufferSourceNode) {
      return;
    }

    console.log(`[useAudio] audioBufferSourceNode: `, audioBufferSourceNode);

  }, [audioBufferSourceNode]);

  return audioBufferSourceNode;
}


export function useTrack() {}