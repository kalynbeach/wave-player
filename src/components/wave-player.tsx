"use client";

import { useState, useEffect, useRef } from "react";
import type { Track } from "@/lib/definitions";
import TrackImage from "@/components/track-image";
import TrackInfo from "@/components/track-info";
import TrackControls from "@/components/track-controls";

type WavePlayerProps = {
  id: string;
  tracks: Track[];
};

export default function WavePlayer({ id, tracks }: WavePlayerProps) {
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [audioSourceNode, setAudioSourceNode] = useState<AudioBufferSourceNode | null>(null);
  const [currentTrack, setCurrentTrack] = useState<Track>(tracks[0]);
  const [trackDuration, setTrackDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [startOffset, setStartOffset] = useState<number>(0);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const rangeInputRef = useRef<HTMLInputElement>(null);

  // Create audio context (Web Audio API AudioContext)
  useEffect(() => {
    if (!audioContext) {
      console.log(`[WavePlayer] Creating AudioContext...`);
      setAudioContext(new AudioContext());
    }
  }, [audioContext]);

  // Initialize audio (AudioContext, AudioSourceNode, etc.)
  useEffect(() => {
    async function initializeAudio() {
      if (!audioContext) return;
      try {
        const fetchInit: RequestInit = { method: 'GET', mode: 'cors' };
        const res = await fetch(currentTrack.src, fetchInit);
        const resBlob = await res.blob();
        const audioBuffer = await resBlob.arrayBuffer();
        const decodedAudioBuffer = await audioContext.decodeAudioData(audioBuffer);
        const sourceNode = audioContext.createBufferSource();
        sourceNode.buffer = decodedAudioBuffer;
        sourceNode.loop = isLooping;
        sourceNode.connect(audioContext.destination);
        setTrackDuration(sourceNode.buffer.duration);
        setAudioSourceNode(sourceNode);
        setIsInitialized(true);
        console.log(`[WavePlayer] audioSourceNode.buffer: `, sourceNode.buffer);
      } catch (error) {
        throw new Error(`[WavePlayer] Error initializing audio: ${error}`);
      }
    }
    if (!isInitialized) {
      console.log(`[WavePlayer] Initializing audio...`);
      initializeAudio();
    }
  }, [audioContext, currentTrack, isInitialized, isLooping]);

  // Track control functions (play/pause, prev/next, mute, etc.)

  function playTrack() {
    if (!audioContext || !audioSourceNode || !audioSourceNode.buffer || !isInitialized) return;
    setStartTime(audioContext.currentTime);
    audioSourceNode.start(
      audioContext.currentTime,
      startOffset % audioSourceNode.buffer.duration
    );
    setIsPlaying(true);
    console.log(`[WavePlayer] playTrack called.`);
  }

  function pauseTrack() {
    if (!audioContext || !audioSourceNode || !audioSourceNode.buffer || !isInitialized) return;
    audioSourceNode.stop();
    setIsPlaying(false);
    setStartOffset(startOffset + audioContext.currentTime - startTime);
    setCurrentTime(audioContext.currentTime - startTime);
    console.log(`[WavePlayer] pauseTrack called.`);
  }

  function previousTrack() {
    if (!audioContext || !audioSourceNode || !audioSourceNode.buffer || !isInitialized) return;
    if (isPlaying) {
      audioSourceNode.stop();
    }
    setIsPlaying(false);
    setStartOffset(0);
    setCurrentTime(0);
    setCurrentTrack(tracks[tracks.indexOf(currentTrack) - 1]);
    setIsInitialized(false);
    console.log(`[WavePlayer] previousTrack called.`);
  }

  function nextTrack() {
    if (!audioContext || !audioSourceNode || !audioSourceNode.buffer || !isInitialized) return;
    if (isPlaying) {
      audioSourceNode.stop();
    }
    setIsPlaying(false);
    setStartOffset(0);
    setCurrentTime(0);
    setCurrentTrack(tracks[tracks.indexOf(currentTrack) + 1]);
    setIsInitialized(false);
    console.log(`[WavePlayer] nextTrack called.`);
  }

  function toggleMute() {
    if (!audioContext || !audioSourceNode || !audioSourceNode.buffer || !isInitialized) return;
    // TODO: Implement mute/unmute via GainNode
    setIsMuted(!isMuted);
    console.log(`[WavePlayer] toggleMute called.`);
  }

  return (
    <div className="wave-player w-fit md:w-full md:max-w-3xl p-2 flex flex-col gap-2 md:flex-row border rounded-sm">
      <div className="flex">
        <TrackImage />
      </div>
      <div className="w-full flex flex-col gap-2 justify-between">
        <TrackInfo track={currentTrack} />
        <TrackControls
          track={currentTrack}
          trackDuration={trackDuration}
          currentTime={currentTime}
          isPlaying={isPlaying}
          play={playTrack}
          pause={pauseTrack}
          previous={previousTrack}
          next={nextTrack}
          mute={toggleMute}
          rangeInputRef={rangeInputRef}
        />
      </div>
    </div>
  );
}