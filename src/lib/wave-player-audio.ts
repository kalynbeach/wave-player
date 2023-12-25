import type { Track } from "@/lib/definitions";

export class WavePlayerAudioProcessor {
  playlist: Track[];
  context: AudioContext;
  sourceNode: AudioBufferSourceNode;
  gainNode: GainNode;

  constructor(playlist: Track[]) {
    this.playlist = playlist;
    this.context = new AudioContext();
    this.sourceNode = this.context.createBufferSource();
    this.gainNode = this.context.createGain();
    this.sourceNode.connect(this.gainNode);
    this.sourceNode.connect(this.context.destination);
  }

  async loadTrack(track: Track) {
    const fetchConfig: RequestInit = { method: 'GET', mode: 'cors' };
    try {
      // TODO: add error handling
      // TODO: try to load from cache first
      const res = await fetch(track.src, fetchConfig);
      const audioBuffer = await res.arrayBuffer();
      const decodedAudioBuffer = await this.context.decodeAudioData(audioBuffer);
      this.sourceNode.buffer = decodedAudioBuffer;
      // this.sourceNode.connect(this.context.destination);
    } catch (error) {
      console.error(`[WavePlayerAudioProcessor loadTrack] Error: ${error}`);   
    }
  }

  play() {
    this.sourceNode.start();
  }

  pause() {
    this.sourceNode.stop();
  }

  previous() {
    this.sourceNode.stop();
  }

  next() {
    this.sourceNode.stop();
  }

  toggleMute() {
    this.gainNode.gain.value = this.gainNode.gain.value ? 0 : 1;
  }
}