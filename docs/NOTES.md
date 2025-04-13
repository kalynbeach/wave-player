# WavePlayer Notes

## WavePlayer Worker Workflow for PCM WAV Data

1. Fetch chunks (`ArrayBuffer`)
2. Parse WAV header (first chunk; potentially first few chunks) to gather crucial info:
  - Sample Rate (`sampleRate`)
  - Number of Channels (`numberOfChannels`)
  - Bits Per Sample (e.g., 8, 16, 24, 32) (`bitDepth`)
  - Audio Format Code (confirming it's LPCM, usually code 1)
  - The offset where the actual audio data (data chunk) begins
3. Identify and process WAV data (subsequent `ArrayBuffer` chunks) into `AudioData` objects:
  - Read the raw PCM samples according to `bitDepth`
  - Convert samples to the desired format (often Float32 planar)
  - Create `AudioData` objects using the constructor, providing the converted data and format details.
4. Transfer the `AudioData` objects efficiently to the Audio Worklet (e.g., via `postMessage` with transfer or a ring buffer).