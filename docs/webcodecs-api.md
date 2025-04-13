# WebCodecs API for WAV Files

> Gemini 2.5 Pro Preview 03-25 via Google AI Studio, 04-12-2025

## kalynbeach

I'm trying to use the WebCodecs API in my TypeScript/React-based music player system for low-level audio chunk processing and streaming of music audio files (primarily WAV .wav format) via a web Worker and an audio Worklet, but I'm running into issues handling/decoding the fetched chunks (ArrayBuffer chunks) into audio that can be rendered (AudioData type is what I'm trying to produce, I think).

I'm confused about configuring and using the WebCodecs API's AudioDecoder for this. If I'm working primarily with WAV format audio data, how should I use the WebCodecs API and configure its AudioDecoder here? Should I even use the AudioDecoder for WAV format audio (isn't it basically PCM data)?

Can you help me understand all this a bit more and provide more insight here?

Think step-by-step about this, and stay focused on what I'm asking and inquiring about.

## Gemini 2.5 Pro Preview 03-25

Okay, let's break down using WebCodecs with WAV files in your React/TypeScript music player setup involving Workers and Worklets.

You've hit on a key point: **WAV files most commonly contain uncompressed Pulse-Code Modulation (PCM) audio data.**

Here's a step-by-step explanation:

1.  **What is WebCodecs `AudioDecoder` For?**

    - The `AudioDecoder` interface in the WebCodecs API is designed primarily to decode **compressed** audio formats. Think of formats like MP3, AAC, Opus, Vorbis, or potentially FLAC (which is lossless compression).
    - It takes encoded audio chunks (`EncodedAudioChunk`) as input and outputs raw, uncompressed audio samples packaged as `AudioData` objects.
    - The configuration requires specifying the codec (`codec` string like `'opus'`, `'mp3'`), `sampleRate`, `numberOfChannels`, and sometimes extra data (`description`) needed to initialize the decoder (like codec headers).

2.  **WAV Files and PCM Data:**

    - The WAV format is a _container_ format. While it _can_ technically contain compressed audio (like ADPCM or µ-law/A-law), the vast majority of `.wav` files you encounter, especially for music production or high-quality storage, contain raw, uncompressed LPCM (Linear PCM) data.
    - This LPCM data _is already_ the raw audio samples. It doesn't need _decoding_ in the sense of decompression.

3.  **Should You Use `AudioDecoder` for PCM WAV?**

    - **Generally, no.** If your WAV files contain standard LPCM data, using `AudioDecoder` is unnecessary and likely won't work as intended. There's no standard LPCM codec string (like `'pcm'`) that `AudioDecoder` accepts for this purpose across browsers. It's designed for formats that require a decompression algorithm.
    - Trying to configure `AudioDecoder` for PCM would be difficult because you wouldn't have a valid `codec` string, and the API isn't built for simply repackaging raw data.

4.  **How to Handle PCM WAV Data for `AudioData` (The Correct Approach):**
    Since the data is already uncompressed PCM, your task shifts from _decoding_ to _parsing and packaging_. Here's the workflow within your Worker:

    - **Fetch Chunks:** You're already fetching `ArrayBuffer` chunks. This is correct.
    - **Parse WAV Header:** The _first_ chunk (or potentially spanning the first few chunks) contains the WAV header. You need to parse this header manually or using a library within your Web Worker. The header tells you crucial information:
      - Sample Rate (`sampleRate`)
      - Number of Channels (`numberOfChannels`)
      - Bits Per Sample (e.g., 8, 16, 24, 32) - this determines the raw sample format.
      - Audio Format Code (confirming it's LPCM, usually code `1`).
      - The offset where the actual audio data (`data` chunk) begins.
    - **Identify Data Chunks:** Once you've parsed the header and found the start of the data chunk, subsequent `ArrayBuffer`s you receive contain the raw PCM samples.
    - **Convert Raw PCM to `AudioData` Format:** This is the core step replacing the `AudioDecoder`. You need to take the raw PCM bytes from your `ArrayBuffer` chunks and package them into `AudioData` objects.

      - **Determine Sample Format:** Based on the 'Bits Per Sample' from the header:
        - 8-bit WAV is typically unsigned integers (Uint8).
        - 16-bit WAV is typically signed integers (Int16).
        - 24-bit WAV needs careful handling (often read as 3 bytes per sample).
        - 32-bit WAV can be signed integers (Int32) or floating-point (Float32).
      - **Target Format:** `AudioData` often works best with planar Float32 data (`'f32-planar'`), where each channel has its own `Float32Array`, and values range from -1.0 to 1.0.
      - **Conversion:** You'll need to write code (or use a library) in the Worker to:
        - Read the samples from the `ArrayBuffer` using the correct `DataView` methods (e.g., `getInt16`, `getUint8`, `getFloat32`) respecting endianness (WAV is typically little-endian).
        - Convert integer samples to Float32: Divide Int16 by 32768, Uint8 by 128 then subtract 1.0, etc.
        - De-interleave the samples if necessary: WAV stores samples interleaved (LRLRLR...), but the 'planar' `AudioData` formats require separate arrays for each channel (LLLL..., RRRR...).
      - **Create `AudioData` Object:** Use the `AudioData` constructor:

        ```typescript
        // Example assuming 16-bit stereo PCM converted to f32-planar
        // (Simplified - actual parsing/conversion logic is more complex)

        const numFrames = /* Number of samples frames in this chunk */;
        const sampleRate = /* From WAV header */;
        const timestamp = /* Calculated timestamp for this chunk (crucial for sync) */;

        // Assuming you have Float32Arrays: leftChannelData, rightChannelData
        // Option 1: Copy data into a new buffer for AudioData
        const bytesPerSample = 4; // Float32
        const planeSize = numFrames * bytesPerSample;
        const dataBuffer = new ArrayBuffer(planeSize * 2); // 2 channels
        const leftView = new Float32Array(dataBuffer, 0, numFrames);
        const rightView = new Float32Array(dataBuffer, planeSize, numFrames);
        leftView.set(leftChannelData);
        rightView.set(rightChannelData);

        const audioData = new AudioData({
          format: 'f32-planar',
          sampleRate: sampleRate,
          numberOfFrames: numFrames,
          numberOfChannels: 2,
          timestamp: timestamp,
          data: dataBuffer // Transfer this buffer
        });

        // --- OR ---

        // Option 2 (If AudioData supports passing typed arrays directly - check spec/impl)
        // This might be possible depending on the exact API version/browser
        // const audioData = new AudioData({
        //   format: 'f32-planar',
        //   sampleRate: sampleRate,
        //   numberOfFrames: numFrames,
        //   numberOfChannels: 2,
        //   timestamp: timestamp,
        //   data: [leftChannelData.buffer], // Pass ArrayBuffers of the typed arrays
        //   // You might need transfer list handling here depending on how you created the arrays
        // });


        // Send audioData to the main thread or Audio Worklet
        // self.postMessage({ type: 'audioData', payload: audioData }, [audioData.data]); // Transfer buffer ownership
        ```

5.  **Worker to Worklet Communication:**
    - The Worker parses the WAV, converts PCM chunks to `AudioData` objects.
    - These `AudioData` objects (which are transferable) are sent from the Worker to your main thread or directly to the Audio Worklet (using a `MessageChannel`). A common pattern involves using a ring buffer (like `SharedArrayBuffer` based implementations) for efficient communication between the Worker producing data and the Worklet consuming it.
    - The Audio Worklet's `process` method reads from this buffer/queue, takes the `AudioData` objects, copies the samples into its output buffers, rendering the audio.

**Summary & Recommendation:**

- **Do not use `AudioDecoder` for standard LPCM WAV files.** It's the wrong tool for uncompressed data.
- **Focus on Parsing and Packaging in the Worker:**
  1.  Fetch `ArrayBuffer` chunks.
  2.  Parse the WAV header in the first chunk(s) to get format details (`sampleRate`, `numberOfChannels`, `bitDepth`).
  3.  For subsequent data chunks:
      - Read the raw PCM samples according to `bitDepth`.
      - Convert samples to the desired format (often Float32 planar).
      - Create `AudioData` objects using the constructor, providing the converted data and format details.
  4.  Transfer these `AudioData` objects efficiently to the Audio Worklet (e.g., via `postMessage` with transfer or a ring buffer).
- **Consider Libraries:** Parsing WAV headers and converting sample formats can be tricky. Look for JavaScript/TypeScript libraries on npm (like `wav-decoder`, `wavefile`, or others) that might simplify the WAV parsing and sample conversion steps within your Worker.

This approach aligns correctly with the design of WebCodecs (using `AudioData` as the interchange format for raw audio) and the nature of WAV files, even though you bypass the `AudioDecoder` itself for LPCM data.
