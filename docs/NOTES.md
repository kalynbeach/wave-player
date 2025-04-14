# WavePlayer Notes

## WavePlayer Worker Workflow for PCM WAV Data

SEE: **`docs/wave-player-audio-review.md`**

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

## Implementation: WavePlayer WAV Streaming

SEE: **Phase 1: Worker Refactoring for WAV Handling** in **`docs/wave-player-audio-review.md`**

> Gemini 2.5 Pro Preview 03-25 via Cursor, 04-13-2025

Here's a summary of the Phase 1 work we completed for WAV handling in the `wave-player.worker.ts`:

1.  **WAV Detection & Routing:** The main `handleLoad` command handler now checks if the track source URL ends with `.wav`. If so, it delegates the loading process to the specialized `handleLoadWav` function; otherwise, it proceeds with the existing `AudioDecoderWrapper` logic for other formats.
2.  **WAV Header Parsing:**
    - We implemented the `fetchAndParseHeader` function, which fetches the beginning of the WAV file.
    - It uses `DataView` to parse the RIFF structure, locate the `fmt ` and `data` chunks, and extract crucial information like format code, channel count, sample rate, bit depth, data offset, and data size.
    - Crucially, validation was added to ensure the WAV file is stereo and uses a supported bit depth (16, 24, or 32-bit integer/float PCM). Unsupported formats will now result in an error message.
3.  **RingBuffer Initialization (for WAV):**
    - After successfully parsing the header in `handleLoadWav`, the code now initializes the `RingBuffer` using the channel count obtained from the header.
    - It calculates the track duration based on `dataSize` and `byteRate` from the header.
    - It then posts a `TRACK_READY` message to the provider, including the calculated duration, sample rate, and channel count, and updates the worker status to `ready`.
4.  **WAV Data Streaming & Processing:**
    - The `AudioFetcher` was updated to allow passing `RequestInit` options, enabling range requests.
    - `handleLoadWav` now configures and starts an `AudioFetcher` instance specifically to download _only_ the audio data chunk, using the `dataOffset` and `dataSize` from the header in a `Range` request header.
    - The new `handleFetchedWavChunk` callback processes the incoming raw `ArrayBuffer` chunks:
      - It correctly determines the number of _complete_ frames within each chunk using `Math.floor`.
      - It uses a `switch` statement based on the `bitsPerSample` (16, 24, or 32) and `format` (for 32-bit) stored from the header.
      - It reads the interleaved samples using `DataView` methods appropriate for the bit depth (handling 24-bit data reading and sign extension manually).
      - It converts the integer or float samples into the `Float32` range [-1.0, 1.0] (except for 32-bit float, which is used directly).
      - It de-interleaves the samples into separate `Float32Array`s for each channel (planar format).
      - Finally, it writes this planar data to the `RingBuffer`.
    - Specific completion (`handleWavFetchComplete`) and error (`handleWavFetchError`) callbacks were added for the WAV data fetch process.

In essence, we have successfully refactored the worker to bypass the `AudioDecoder` for WAV files and implement a dedicated pipeline that fetches, parses, processes (including 16/24/32-bit conversion), and writes WAV audio data directly to the shared `RingBuffer` for the `AudioWorkletProcessor` to consume.
