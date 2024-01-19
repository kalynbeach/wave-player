"use client";

import { useState, useEffect, useRef } from "react";
import TrackImage from "@/components/track-image";
import TrackInfo from "@/components/track-info";
import TrackControls from "@/components/track-controls";
import type { Track } from "@/lib/definitions";

type WavePlayerProps = {
  id: string;
  playlist: Track[];
};

export default function WavePlayer({ id, playlist }: WavePlayerProps) {
  const [track, setTrack] = useState<Track>(playlist[0]);
  const [trackDuration, setTrackDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLInputElement>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  // const audioSourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  // const audioGainNodeRef = useRef<GainNode | null>(null);

  useEffect(() => {
    if (!audioContextRef.current) {
      console.log(`[WavePlayer] Creating AudioContext...`);
      audioContextRef.current = new AudioContext();
    }
    if (!audioRef.current) return;
    setTrackDuration(audioRef.current.duration);
  }, []);

  function onLoadedMetadata() {
    console.log(`[WavePlayer] onLoadedMetadata called.`);
    if (!audioRef.current) return;
    setTrackDuration(audioRef.current.duration);
  }

  function onTimeUpdate() {
    console.log(`[WavePlayer] onTimeUpdate called.`);
    if (!audioRef.current || currentTime === audioRef.current.currentTime) return;
    setCurrentTime(audioRef.current.currentTime);
  }

  function playTrack() {
    console.log(`[WavePlayer] playTrack called.`);
    if (!audioRef.current) return;
    audioRef.current.play();
    setIsPlaying(true);
  }

  function pauseTrack() {
    console.log(`[WavePlayer] pauseTrack called.`);
    if (!audioRef.current) return;
    audioRef.current.pause();
    setIsPlaying(false);
  }

  function previousTrack() {
    console.log(`[WavePlayer] previousTrack called.`);
    if (playlist.indexOf(track) > 0) {
      setTrack(playlist[playlist.indexOf(track) - 1]);
    } else {
      setTrack(playlist[playlist.length - 1]);
    }
  }

  function nextTrack() {
    console.log(`[WavePlayer] nextTrack called.`);
    if (playlist.indexOf(track) < playlist.length - 1) {
      setTrack(playlist[playlist.indexOf(track) + 1]);
    } else {
      setTrack(playlist[0]);
    }
  }

  function toggleMute() {
    console.log(`[WavePlayer] toggleMute called.`);
    setIsMuted(!isMuted);
  }

  return (
    <div className="wave-player w-fit md:w-full md:max-w-3xl p-2 flex flex-col gap-2 md:flex-row border border-neutral-900 rounded-sm" data-testid="wave-player">
      <audio
        ref={audioRef}
        src={track.src}
        muted={isMuted}
        loop={isLooping}
        defaultValue={track.src}
        onLoadedMetadata={onLoadedMetadata}
        onTimeUpdate={onTimeUpdate}
        crossOrigin="anonymous"
        preload="metadata"
      ></audio>
      <div className="flex">
        <TrackImage
          // image={track.image}
          image={undefined}
        />
      </div>
      <div className="w-full flex flex-col gap-2 justify-between">
        <TrackInfo
          track={track}
        />
        <TrackControls
          track={track}
          trackDuration={trackDuration}
          currentTime={currentTime}
          isPlaying={isPlaying}
          isLooping={isLooping}
          isMuted={isMuted}
          play={playTrack}
          pause={pauseTrack}
          previous={previousTrack}
          next={nextTrack}
          mute={toggleMute}
          audioRef={audioRef}
          progressBarRef={progressBarRef}
        />
      </div>
    </div>
  );
}