# Notes

## WavePlayer

### Props

- `id: string`
- `tracks: Track[]`

### State

- `audioContext: AudioContext`
- `audioSourceNode: AudioBufferSourceNode`
- `currentTrack: Track`
- `trackDuration: number`
- `currentTime: number`
- `startTime: number`
- `startOffset: number`
- `isInitialized: boolean`
- `isPlaying: boolean`
- `isLooping: boolean`
- `isMuted: boolean`

## Web Audio API

### Initialization

1. Create an `AudioContext` instance.
2. Use the `AudioContext.createBufferSource()` method to create an `AudioBufferSourceNode`.
3. Load your audio file into an `AudioBuffer`, and set this buffer as the source for your `AudioBufferSourceNode`.
4. Connect your `AudioBufferSourceNode` to the `AudioContext.destination` to route the audio data to the default audio output.

### Time

The Web Audio API does not provide a direct way to get the current time of the audio being played. However, you can calculate it by subtracting the time when the audio started playing from the current time.

For the duration, you can use the duration property of the `AudioBuffer` object.
