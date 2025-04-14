/// <reference lib="webworker" />
/// <reference types="@types/dom-webcodecs" />
// lib/wave-player/worker/audio-fetcher.ts
class AudioFetcher {
  callbacks;
  abortController;
  totalBytes = null;
  downloadedBytes = 0;
  constructor(callbacks) {
    this.callbacks = callbacks;
    this.abortController = new AbortController;
  }
  async fetchAudio(url, fetchOptions) {
    this.downloadedBytes = 0;
    this.totalBytes = null;
    console.log(`[AudioFetcher] Starting fetch for: ${url}`);
    try {
      const options = {
        ...fetchOptions,
        signal: this.abortController.signal
      };
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
      }
      if (!response.body) {
        throw new Error("Response body is null.");
      }
      const contentLength = response.headers.get("Content-Length");
      this.totalBytes = contentLength ? parseInt(contentLength, 10) : null;
      console.log(`[AudioFetcher] Total bytes: ${this.totalBytes ?? "Unknown"}`);
      this.reportProgress();
      const reader = response.body.getReader();
      while (true) {
        if (this.abortController.signal.aborted) {
          console.log("[AudioFetcher] Fetch aborted.");
          return;
        }
        const { done, value } = await reader.read();
        if (done) {
          console.log("[AudioFetcher] Fetch completed successfully.");
          this.callbacks.onComplete();
          break;
        }
        if (value) {
          this.downloadedBytes += value.byteLength;
          this.callbacks.onChunk(value.buffer);
          this.reportProgress();
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        console.log("[AudioFetcher] Fetch explicitly aborted.");
      } else {
        console.error("[AudioFetcher] Fetch error:", error);
        this.callbacks.onError(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }
  abort() {
    console.log("[AudioFetcher] Abort requested.");
    this.abortController.abort();
  }
  reportProgress() {
    if (this.callbacks.onProgress) {
      this.callbacks.onProgress(this.downloadedBytes, this.totalBytes);
    }
  }
}

// lib/wave-player/worker/audio-decoder.ts
class AudioDecoderWrapper {
  decoder = null;
  callbacks;
  currentConfig = null;
  constructor(callbacks) {
    this.callbacks = callbacks;
  }
  async configure(config) {
    console.log("[AudioDecoder] Configuring decoder with:", config);
    this.currentConfig = config;
    this.close();
    try {
      const support = await AudioDecoder.isConfigSupported(config);
      if (!support.supported) {
        throw new Error(`AudioDecoder config not supported: ${JSON.stringify(config)}`);
      }
      this.decoder = new AudioDecoder({
        output: this.handleDecodedChunk.bind(this),
        error: this.handleError.bind(this)
      });
      this.decoder.configure(config);
      console.log("[AudioDecoder] Decoder configured successfully.");
    } catch (error) {
      console.error("[AudioDecoder] Configuration failed:", error);
      this.decoder = null;
      this.callbacks.onError(error instanceof Error ? error : new Error("Decoder configuration failed"));
      throw error;
    }
  }
  decodeChunk(chunk) {
    if (!this.decoder || this.decoder.state !== "configured") {
      console.warn("[AudioDecoder] Attempted to decode chunk before decoder is configured or while closed.", this.decoder?.state);
      return;
    }
    try {
      this.decoder.decode(chunk);
    } catch (error) {
      console.error("[AudioDecoder] Error scheduling decode:", error);
      this.callbacks.onError(error instanceof Error ? error : new Error("Error scheduling decode"));
    }
  }
  reset() {
    if (this.decoder && this.decoder.state !== "closed") {
      console.log("[AudioDecoder] Resetting decoder state.");
      this.decoder.reset();
      if (this.currentConfig) {
        try {
          this.decoder.configure(this.currentConfig);
        } catch (error) {
          console.error("[AudioDecoder] Error re-configuring after reset:", error);
          this.callbacks.onError(error instanceof Error ? error : new Error("Error re-configuring after reset"));
        }
      }
    } else {
      console.warn("[AudioDecoder] Cannot reset, decoder not initialized or already closed.");
    }
  }
  async flush() {
    if (this.decoder && this.decoder.state === "configured") {
      console.log("[AudioDecoder] Flushing decoder.");
      await this.decoder.flush();
      console.log("[AudioDecoder] Decoder flushed.");
    } else {
      console.warn("[AudioDecoder] Cannot flush, decoder not configured or closed.");
    }
  }
  close() {
    if (this.decoder && this.decoder.state !== "closed") {
      console.log("[AudioDecoder] Closing decoder.");
      this.decoder.close();
    }
    this.decoder = null;
  }
  handleDecodedChunk(chunk) {
    try {
      this.callbacks.onDecoded(chunk);
      chunk.close();
    } catch (error) {
      console.error("[AudioDecoder] Error handling decoded chunk callback:", error);
      try {
        chunk.close();
      } catch (closeError) {
        console.error("[AudioDecoder] Error closing chunk after callback error:", closeError);
      }
    }
  }
  handleError(error) {
    console.error("[AudioDecoder] Decoding error:", error);
    this.callbacks.onError(error);
  }
  get state() {
    return this.decoder?.state ?? null;
  }
}

// lib/wave-player/worker/ring-buffer.ts
var READ_POINTER_INDEX = 0;
var WRITE_POINTER_INDEX = 1;
var PLAYBACK_STATE_INDEX = 2;
var STATE_ARRAY_LENGTH = 3;

class RingBuffer {
  state;
  channels;
  capacity;
  numChannels;
  constructor(stateSab, dataSab, numChannels) {
    if (stateSab.byteLength < STATE_ARRAY_LENGTH * Int32Array.BYTES_PER_ELEMENT) {
      throw new Error("State SAB is too small.");
    }
    if (numChannels <= 0) {
      throw new Error("Number of channels must be positive.");
    }
    if (dataSab.byteLength % (numChannels * Float32Array.BYTES_PER_ELEMENT) !== 0) {
      console.warn("[RingBuffer] Data SAB size is not perfectly divisible by numChannels * Float32.BYTES_PER_ELEMENT. Capacity will be floor().");
    }
    this.state = new Int32Array(stateSab);
    this.numChannels = numChannels;
    const totalSamples = Math.floor(dataSab.byteLength / Float32Array.BYTES_PER_ELEMENT);
    this.capacity = Math.floor(totalSamples / numChannels);
    if (this.capacity === 0) {
      throw new Error("Data SAB is too small for the given number of channels.");
    }
    console.log(`[RingBuffer] Initialized with capacity: ${this.capacity} samples per channel.`);
    this.channels = [];
    for (let i = 0;i < numChannels; ++i) {
      const byteOffset = i * this.capacity * Float32Array.BYTES_PER_ELEMENT;
      this.channels.push(new Float32Array(dataSab, byteOffset, this.capacity));
    }
    Atomics.compareExchange(this.state, READ_POINTER_INDEX, 0, 0);
    Atomics.compareExchange(this.state, WRITE_POINTER_INDEX, 0, 0);
  }
  get availableRead() {
    const readPos = Atomics.load(this.state, READ_POINTER_INDEX);
    const writePos = Atomics.load(this.state, WRITE_POINTER_INDEX);
    if (writePos >= readPos) {
      return writePos - readPos;
    } else {
      return this.capacity - readPos + writePos;
    }
  }
  get availableWrite() {
    return this.capacity - this.availableRead - 1;
  }
  write(inputBuffers) {
    if (inputBuffers.length !== this.numChannels) {
      console.error(`[RingBuffer] Write error: Expected ${this.numChannels} channels, got ${inputBuffers.length}`);
      return false;
    }
    const samplesToWrite = inputBuffers[0]?.length ?? 0;
    if (samplesToWrite === 0) {
      return true;
    }
    if (samplesToWrite > this.availableWrite) {
      return false;
    }
    const writePos = Atomics.load(this.state, WRITE_POINTER_INDEX);
    for (let i = 0;i < this.numChannels; ++i) {
      const channelInput = inputBuffers[i];
      const channelBuffer = this.channels[i];
      if (!channelInput || channelInput.length !== samplesToWrite) {
        console.error(`[RingBuffer] Write error: Channel ${i} buffer mismatch or missing.`);
        return false;
      }
      const spaceToEnd = this.capacity - writePos;
      if (samplesToWrite <= spaceToEnd) {
        channelBuffer.set(channelInput, writePos);
      } else {
        const firstPart = channelInput.subarray(0, spaceToEnd);
        const secondPart = channelInput.subarray(spaceToEnd);
        channelBuffer.set(firstPart, writePos);
        channelBuffer.set(secondPart, 0);
      }
    }
    const nextWritePos = (writePos + samplesToWrite) % this.capacity;
    Atomics.store(this.state, WRITE_POINTER_INDEX, nextWritePos);
    return true;
  }
  read(outputBuffers) {
    if (outputBuffers.length !== this.numChannels) {
      console.error(`[RingBuffer] Read error: Expected ${this.numChannels} channels, got ${outputBuffers.length}`);
      return false;
    }
    const samplesToRead = outputBuffers[0]?.length ?? 0;
    if (samplesToRead === 0) {
      return true;
    }
    if (samplesToRead > this.availableRead) {
      return false;
    }
    const readPos = Atomics.load(this.state, READ_POINTER_INDEX);
    for (let i = 0;i < this.numChannels; ++i) {
      const channelOutput = outputBuffers[i];
      const channelBuffer = this.channels[i];
      if (!channelOutput || channelOutput.length !== samplesToRead) {
        console.error(`[RingBuffer] Read error: Channel ${i} buffer mismatch or missing.`);
        return false;
      }
      const samplesToEnd = this.capacity - readPos;
      if (samplesToRead <= samplesToEnd) {
        channelOutput.set(channelBuffer.subarray(readPos, readPos + samplesToRead));
      } else {
        const firstPart = channelBuffer.subarray(readPos, this.capacity);
        const secondPart = channelBuffer.subarray(0, samplesToRead - samplesToEnd);
        channelOutput.set(firstPart, 0);
        channelOutput.set(secondPart, firstPart.length);
      }
    }
    const nextReadPos = (readPos + samplesToRead) % this.capacity;
    Atomics.store(this.state, READ_POINTER_INDEX, nextReadPos);
    return true;
  }
  clear() {
    Atomics.store(this.state, WRITE_POINTER_INDEX, 0);
    Atomics.store(this.state, READ_POINTER_INDEX, 0);
    console.log("[RingBuffer] Buffer cleared.");
  }
}

// lib/wave-player/worker/wave-player.worker.ts
console.log("[WavePlayer Worker] Initializing worker...");
var isInitialized = false;
var ringBufferDataSab = null;
var stateBufferSab = null;
var stateBufferView = null;
var ringBuffer = null;
var currentTrack = null;
var currentTrackId = null;
var audioFetcher = null;
var audioDecoder = null;
var abortController = null;
var currentStatus = "initializing";
var totalDecodedDuration = 0;
var reportedTrackReady = false;
var expectedChannels = 0;
var expectedSampleRate = 0;
var currentWavHeaderInfo = null;
function handleInitialize(command) {
  if (isInitialized) {
    console.warn("[WavePlayer Worker] Worker already initialized.");
    return;
  }
  console.log("[WavePlayer Worker] Initializing with SABs...");
  if (!command.ringBufferSab || command.ringBufferSab.byteLength === 0) {
    console.error("[WavePlayer Worker] Invalid RingBuffer Data SAB received.");
    postWorkerMessage({ type: "ERROR", message: "Initialization failed: Invalid audio data buffer." });
    return;
  }
  if (!command.stateBufferSab || command.stateBufferSab.byteLength === 0) {
    console.error("[WavePlayer Worker] Invalid State SAB received.");
    postWorkerMessage({ type: "ERROR", message: "Initialization failed: Invalid state buffer." });
    return;
  }
  ringBufferDataSab = command.ringBufferSab;
  stateBufferSab = command.stateBufferSab;
  isInitialized = true;
  if (stateBufferSab) {
    stateBufferView = new Int32Array(stateBufferSab);
    Atomics.store(stateBufferView, PLAYBACK_STATE_INDEX, 0);
  } else {
    console.error("[WavePlayer Worker] State SAB is null after assignment in handleInitialize!");
    postWorkerMessage({ type: "ERROR", message: "Initialization failed: Internal state buffer error." });
    return;
  }
  updateStatus("idle");
  console.log("[WavePlayer Worker] Initialization complete, SABs stored.");
  postWorkerMessage({ type: "INITIALIZED" });
}
function guessDecoderConfig(url) {
  if (url.endsWith(".mp3")) {
    return {
      codec: "mp3",
      sampleRate: 44100,
      numberOfChannels: 2
    };
  } else if (url.endsWith(".ogg") || url.endsWith(".opus")) {
    console.warn("[WavePlayer Worker] Guessing Opus config for Ogg - might need description.");
    return {
      codec: "opus",
      sampleRate: 48000,
      numberOfChannels: 2
    };
  } else if (url.endsWith(".aac")) {
    return {
      codec: "aac",
      sampleRate: 44100,
      numberOfChannels: 2
    };
  } else if (url.endsWith(".flac")) {
    return {
      codec: "flac",
      sampleRate: 44100,
      numberOfChannels: 2
    };
  } else if (url.endsWith(".wav") || url.endsWith(".wave")) {
    console.warn("[WavePlayer Worker] WAV/PCM support via WebCodecs might be limited or require specific codec strings.");
    return {
      codec: "pcm-float",
      sampleRate: 48000,
      numberOfChannels: 2
    };
  }
  console.error(`[WavePlayer Worker] Could not guess decoder config for URL: ${url}`);
  return null;
}
async function handleLoad(command) {
  if (!isInitialized) {
    postWorkerMessage({
      type: "ERROR",
      message: "Worker not initialized. Cannot load track."
    });
    return;
  }
  if (command.track.src.toLowerCase().endsWith(".wav")) {
    console.log("[WavePlayer Worker] Handling LOAD for WAV format track:", command.track.src);
    await handleLoadWav(command);
  } else {
    console.log(`[WavePlayer Worker] Handling LOAD command for non-WAV format: ${command.track.title}`);
    cleanupCurrentTrack();
    updateStatus("stopped");
    currentTrack = command.track;
    currentTrackId = command.track.id;
    updateStatus("loading");
    abortController = new AbortController;
    const guessedConfig = guessDecoderConfig(currentTrack.src);
    if (!guessedConfig) {
      postWorkerMessage({
        type: "ERROR",
        message: `Could not determine decoder configuration for ${currentTrack.src}`,
        trackId: currentTrackId
      });
      updateStatus("error");
      cleanupCurrentTrack();
      return;
    }
    try {
      audioDecoder = new AudioDecoderWrapper({
        onDecoded: handleDecodedChunk,
        onError: handleDecodeError
      });
      await audioDecoder.configure(guessedConfig);
      audioFetcher = new AudioFetcher({
        onChunk: handleFetchedChunk,
        onComplete: handleFetchComplete,
        onError: handleFetchError,
        onProgress: handleFetchProgress
      });
      audioFetcher.fetchAudio(currentTrack.src);
    } catch (configError) {
      console.error("[WavePlayer Worker] Failed to configure decoder during LOAD:", configError);
      postWorkerMessage({
        type: "ERROR",
        message: `Audio decoder setup failed: ${configError instanceof Error ? configError.message : String(configError)}`,
        trackId: currentTrackId,
        error: configError instanceof Error ? configError : new Error(String(configError))
      });
      updateStatus("error");
      cleanupCurrentTrack();
    }
  }
}
function postWorkerMessage(message) {
  self.postMessage(message);
}
function updateStatus(status) {
  if (status === currentStatus)
    return;
  console.log(`[WavePlayer Worker] Status changing: ${currentStatus} -> ${status}`);
  currentStatus = status;
  postWorkerMessage({
    type: "STATUS_UPDATE",
    status: currentStatus,
    trackId: currentTrackId ?? undefined
  });
}
function cleanupCurrentTrack() {
  console.log("[WavePlayer Worker] Cleaning up current track resources...");
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
  if (audioDecoder) {
    audioDecoder.close();
    audioDecoder = null;
  }
  if (audioFetcher) {
    audioFetcher.abort();
    audioFetcher = null;
  }
  currentTrack = null;
  currentTrackId = null;
  totalDecodedDuration = 0;
  reportedTrackReady = false;
  expectedChannels = 0;
  expectedSampleRate = 0;
  currentWavHeaderInfo = null;
  if (ringBuffer) {
    ringBuffer.clear();
    ringBuffer = null;
    console.log("[WavePlayer Worker] RingBuffer cleared and reset.");
  }
}
function getString(view, offset, length) {
  let result = "";
  for (let i = 0;i < length; i++) {
    result += String.fromCharCode(view.getUint8(offset + i));
  }
  return result;
}
async function fetchAndParseHeader(url) {
  console.log("[WavePlayer Worker] Fetching track header for:", url);
  abortController = new AbortController;
  try {
    const response = await fetch(url, {
      signal: abortController.signal,
      headers: { Range: "bytes=0-99" }
    });
    if (!response.ok) {
      throw new Error(`HTTP error fetching header: ${response.status} ${response.statusText}`);
    }
    if (!response.body) {
      throw new Error("Response body is null.");
    }
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength < 44) {
      throw new Error("Downloaded header data is too small.");
    }
    const view = new DataView(buffer);
    if (getString(view, 0, 4) !== "RIFF")
      throw new Error("Invalid WAV file: Missing 'RIFF' marker.");
    if (getString(view, 8, 4) !== "WAVE")
      throw new Error("Invalid WAV file: Missing 'WAVE' marker.");
    let offset = 12;
    let fmtChunkFound = false;
    let dataChunkFound = false;
    const headerInfo = {};
    while (offset < view.byteLength - 8) {
      const chunkId = getString(view, offset, 4);
      const chunkSize = view.getUint32(offset + 4, true);
      if (chunkId === "fmt ") {
        console.log(`[WavePlayer Worker] Found 'fmt ' chunk at offset ${offset}, size ${chunkSize}`);
        if (chunkSize < 16)
          throw new Error("'fmt ' chunk size is too small.");
        headerInfo.format = view.getUint16(offset + 8, true);
        headerInfo.numChannels = view.getUint16(offset + 10, true);
        headerInfo.sampleRate = view.getUint32(offset + 12, true);
        headerInfo.byteRate = view.getUint32(offset + 16, true);
        headerInfo.blockAlign = view.getUint16(offset + 20, true);
        headerInfo.bitsPerSample = view.getUint16(offset + 22, true);
        fmtChunkFound = true;
        if (headerInfo.format !== 1 && headerInfo.format !== 3) {
          throw new Error(`Unsupported WAV format code: Expected PCM (1) or IEEE Float (3), got ${headerInfo.format}`);
        }
        if (headerInfo.numChannels !== 2) {
          throw new Error(`Unsupported channel count: Expected Stereo (2), got ${headerInfo.numChannels}`);
        }
        if (![16, 24, 32].includes(headerInfo.bitsPerSample)) {
          throw new Error(`Unsupported bit depth: Expected 16, 24, or 32-bit, got ${headerInfo.bitsPerSample}`);
        }
        if (headerInfo.format === 3 && headerInfo.bitsPerSample !== 32) {
          throw new Error(`Invalid format combination: IEEE Float (3) requires 32-bit depth, got ${headerInfo.bitsPerSample}`);
        }
        console.log("[WavePlayer Worker] Parsed 'fmt ' chunk (validation passed):", headerInfo);
      } else if (chunkId === "data") {
        console.log(`[WavePlayer Worker] Found 'data' chunk at offset ${offset}, size ${chunkSize}`);
        headerInfo.dataOffset = offset + 8;
        headerInfo.dataSize = chunkSize;
        dataChunkFound = true;
        console.log("[WavePlayer Worker] Parsed 'data' chunk info:", { dataOffset: headerInfo.dataOffset, dataSize: headerInfo.dataSize });
      } else {
        console.log(`[WavePlayer Worker] Skipping chunk '${chunkId}' at offset ${offset}`);
      }
      if (fmtChunkFound && dataChunkFound)
        break;
      offset += 8 + chunkSize;
      if (chunkSize % 2 !== 0)
        offset++;
    }
    if (!fmtChunkFound)
      throw new Error("Could not find 'fmt ' chunk in header.");
    if (!dataChunkFound)
      throw new Error("Could not find 'data' chunk in header.");
    if (headerInfo.format === undefined || headerInfo.numChannels === undefined || headerInfo.sampleRate === undefined || headerInfo.byteRate === undefined || headerInfo.blockAlign === undefined || headerInfo.bitsPerSample === undefined || headerInfo.dataOffset === undefined || headerInfo.dataSize === undefined) {
      throw new Error("Failed to parse all required WAV header fields.");
    }
    console.log("[WavePlayer Worker] Successfully parsed WAV header:", headerInfo);
    return headerInfo;
  } catch (error) {
    console.error("[WavePlayer Worker] Error fetching or parsing WAV header:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    postWorkerMessage({
      type: "ERROR",
      message: `Failed to load WAV header: ${errorMessage}`,
      trackId: currentTrackId ?? undefined,
      error: error instanceof Error ? error : new Error(errorMessage)
    });
    updateStatus("error");
    cleanupCurrentTrack();
    return null;
  }
}
async function handleLoadWav(command) {
  cleanupCurrentTrack();
  currentTrack = command.track;
  currentTrackId = command.track.id;
  updateStatus("loading");
  abortController = new AbortController;
  currentWavHeaderInfo = null;
  const parsedHeader = await fetchAndParseHeader(currentTrack.src);
  if (!parsedHeader) {
    console.error("[WavePlayer Worker] Failed to parse WAV header for:", currentTrack.src);
    return;
  }
  currentWavHeaderInfo = parsedHeader;
  expectedChannels = currentWavHeaderInfo.numChannels;
  expectedSampleRate = currentWavHeaderInfo.sampleRate;
  console.log(`[WavePlayer Worker] WAV header processed. Expecting ${expectedChannels} channels @ ${expectedSampleRate}Hz.`);
  if (!stateBufferSab || !ringBufferDataSab) {
    console.error("[WavePlayer Worker] Cannot initialize RingBuffer: SharedArrayBuffers not available.");
    postWorkerMessage({
      type: "ERROR",
      message: "Internal error: Audio buffers unavailable for WAV processing.",
      trackId: currentTrackId
    });
    updateStatus("error");
    cleanupCurrentTrack();
    return;
  }
  try {
    console.log("[WavePlayer Worker] Initializing RingBuffer for WAV...");
    ringBuffer = new RingBuffer(stateBufferSab, ringBufferDataSab, expectedChannels);
    ringBuffer.clear();
    console.log("[WavePlayer Worker] RingBuffer initialized and cleared.");
    let duration = 0;
    if (currentWavHeaderInfo.byteRate > 0) {
      duration = currentWavHeaderInfo.dataSize / currentWavHeaderInfo.byteRate;
    } else {
      console.warn("[WavePlayer Worker] Cannot calculate duration: byteRate is zero in WAV header.");
    }
    console.log(`[WavePlayer Worker] Calculated WAV duration: ${duration}s`);
    postWorkerMessage({
      type: "TRACK_READY",
      trackId: currentTrackId,
      duration,
      sampleRate: expectedSampleRate,
      numberOfChannels: expectedChannels
    });
    reportedTrackReady = true;
    updateStatus("ready");
  } catch (error) {
    console.error("[WavePlayer Worker] Failed to initialize RingBuffer for WAV:", error);
    const message = error instanceof Error ? error.message : String(error);
    postWorkerMessage({
      type: "ERROR",
      message: `Failed to prepare audio buffer for WAV: ${message}`,
      trackId: currentTrackId,
      error
    });
    updateStatus("error");
    cleanupCurrentTrack();
    return;
  }
  audioFetcher = new AudioFetcher({
    onChunk: handleFetchedWavChunk,
    onComplete: handleWavFetchComplete,
    onError: handleWavFetchError,
    onProgress: handleFetchProgress
  });
  const dataEnd = currentWavHeaderInfo.dataOffset + currentWavHeaderInfo.dataSize - 1;
  const fetchOptions = {
    headers: { Range: `bytes=${currentWavHeaderInfo.dataOffset}-${dataEnd}` }
  };
  console.log(`[WavePlayer Worker] Starting fetch for WAV data chunk: bytes=${currentWavHeaderInfo.dataOffset}-${dataEnd}`);
  audioFetcher.fetchAudio(currentTrack.src, fetchOptions);
}
function handleFetchedWavChunk(chunkBuffer) {
  if (!ringBuffer || !currentTrackId) {
    console.warn("[WavePlayer Worker] Skipping fetched WAV chunk: RingBuffer not ready or track changed.");
    return;
  }
  if (!currentWavHeaderInfo) {
    console.error("[WavePlayer Worker] Skipping fetched WAV chunk: Missing header info.");
    return;
  }
  const { bitsPerSample, numChannels, format } = currentWavHeaderInfo;
  const bytesPerSample = bitsPerSample / 8;
  const bytesPerFrame = bytesPerSample * numChannels;
  const numFrames = Math.floor(chunkBuffer.byteLength / bytesPerFrame);
  if (numFrames <= 0 || chunkBuffer.byteLength === 0) {
    return;
  }
  const planarData = [];
  for (let i = 0;i < numChannels; ++i) {
    planarData.push(new Float32Array(numFrames));
  }
  const view = new DataView(chunkBuffer);
  try {
    switch (bitsPerSample) {
      case 16:
        for (let i = 0;i < numFrames; ++i) {
          for (let ch = 0;ch < numChannels; ++ch) {
            const sampleOffset = (i * numChannels + ch) * bytesPerSample;
            planarData[ch][i] = view.getInt16(sampleOffset, true) / 32768;
          }
        }
        break;
      case 24:
        for (let i = 0;i < numFrames; ++i) {
          for (let ch = 0;ch < numChannels; ++ch) {
            const sampleOffset = (i * numChannels + ch) * bytesPerSample;
            const byte1 = view.getUint8(sampleOffset);
            const byte2 = view.getUint8(sampleOffset + 1);
            const byte3 = view.getUint8(sampleOffset + 2);
            let intValue = byte1 | byte2 << 8 | byte3 << 16;
            if (intValue & 8388608) {
              intValue |= 4278190080;
            }
            planarData[ch][i] = intValue / 8388608;
          }
        }
        break;
      case 32:
        if (format === 1) {
          for (let i = 0;i < numFrames; ++i) {
            for (let ch = 0;ch < numChannels; ++ch) {
              const sampleOffset = (i * numChannels + ch) * bytesPerSample;
              planarData[ch][i] = view.getInt32(sampleOffset, true) / 2147483648;
            }
          }
        } else if (format === 3) {
          for (let i = 0;i < numFrames; ++i) {
            for (let ch = 0;ch < numChannels; ++ch) {
              const sampleOffset = (i * numChannels + ch) * bytesPerSample;
              planarData[ch][i] = view.getFloat32(sampleOffset, true);
            }
          }
        } else {
          throw new Error(`Unsupported format code ${format} for 32-bit depth.`);
        }
        break;
      default:
        throw new Error(`Unsupported bit depth: ${bitsPerSample}`);
    }
    if (!ringBuffer?.write(planarData)) {
      console.warn(`[WavePlayer Worker] RingBuffer full while writing WAV data. Dropping ${numFrames} frames.`);
    }
  } catch (error) {
    console.error("[WavePlayer Worker] Error processing WAV chunk:", error);
    postWorkerMessage({
      type: "ERROR",
      message: `Error processing WAV audio data: ${error instanceof Error ? error.message : String(error)}`,
      trackId: currentTrackId,
      error
    });
    updateStatus("error");
    cleanupCurrentTrack();
  }
}
function handleWavFetchComplete() {
  console.log("[WavePlayer Worker] WAV data fetch complete.");
  if (currentStatus === "loading") {
    console.warn("[WavePlayer Worker] WAV fetch complete, but status was still 'loading'. Setting to 'ready'.");
    updateStatus("ready");
  }
}
function handleWavFetchError(error) {
  console.error("[WavePlayer Worker] WAV data fetch failed:", error);
  if (error.name === "AbortError") {
    console.log("[WavePlayer Worker] WAV data fetch aborted.");
    return;
  }
  postWorkerMessage({
    type: "ERROR",
    message: `WAV data fetch failed: ${error.message}`,
    trackId: currentTrackId ?? undefined,
    error
  });
  updateStatus("error");
  cleanupCurrentTrack();
}
function handleFetchProgress(downloadedBytes, totalBytes) {
  if (!currentTrackId)
    return;
  const progress = totalBytes ? downloadedBytes / totalBytes : 0;
  postWorkerMessage({
    type: "LOADING_PROGRESS",
    trackId: currentTrackId,
    progress: Math.max(0, Math.min(1, progress)),
    downloadedBytes,
    totalBytes
  });
}
function handleFetchedChunk(chunkBuffer) {
  if (!audioDecoder || !currentTrackId)
    return;
  try {
    const encodedChunk = new EncodedAudioChunk({
      type: "key",
      timestamp: 0,
      duration: undefined,
      data: chunkBuffer
    });
    audioDecoder.decodeChunk(encodedChunk);
  } catch (error) {
    console.error("[WavePlayer Worker] Error creating/decoding fetched chunk:", error);
    postWorkerMessage({
      type: "ERROR",
      message: "Failed to process audio chunk",
      trackId: currentTrackId,
      error: error instanceof Error ? error : new Error(String(error))
    });
    updateStatus("error");
    cleanupCurrentTrack();
  }
}
async function handleFetchComplete() {
  console.log("[WavePlayer Worker] Fetch complete.");
  if (audioDecoder) {
    try {
      await audioDecoder.flush();
      console.log("[WavePlayer Worker] Decoder flushed after fetch complete.");
      console.log("[WavePlayer Worker] currentStatus: ", currentStatus);
      console.log("[WavePlayer Worker] currentTrackId: ", currentTrackId);
      console.log("[WavePlayer Worker] totalDecodedDuration: ", totalDecodedDuration);
      console.log("[WavePlayer Worker] expectedChannels: ", expectedChannels);
      console.log("[WavePlayer Worker] expectedSampleRate: ", expectedSampleRate);
      if (!reportedTrackReady && currentTrackId && totalDecodedDuration > 0 && expectedChannels > 0 && expectedSampleRate > 0) {
        postWorkerMessage({
          type: "TRACK_READY",
          trackId: currentTrackId,
          duration: totalDecodedDuration / 1e6,
          sampleRate: expectedSampleRate,
          numberOfChannels: expectedChannels
        });
        reportedTrackReady = true;
        if (currentStatus === "loading") {
          updateStatus("ready");
        }
      } else if (!reportedTrackReady && currentTrackId) {
        console.warn("[WavePlayer Worker] Fetch complete but no audio data was decoded/reported.");
        postWorkerMessage({
          type: "ERROR",
          message: "Audio file appears to contain no valid audio data.",
          trackId: currentTrackId
        });
        updateStatus("error");
        cleanupCurrentTrack();
      } else if (reportedTrackReady && currentTrackId && totalDecodedDuration > 0) {
        console.log(`[WavePlayer Worker] Final decoded duration: ${totalDecodedDuration / 1e6}s`);
        if (currentStatus === "loading" || currentStatus === "buffering") {
          updateStatus("ready");
        }
      }
    } catch (flushError) {
      console.error("[WavePlayer Worker] Error flushing decoder:", flushError);
      postWorkerMessage({
        type: "ERROR",
        message: "Failed to finalize audio decoding",
        trackId: currentTrackId ?? undefined,
        error: flushError instanceof Error ? flushError : new Error(String(flushError))
      });
      updateStatus("error");
      cleanupCurrentTrack();
    }
  } else if (currentStatus === "loading") {
    console.warn("[WavePlayer Worker] Fetch complete, but decoder was not initialized.");
  }
}
function handleFetchError(error) {
  console.error("[WavePlayer Worker] Fetch failed:", error);
  postWorkerMessage({
    type: "ERROR",
    message: `Audio fetch failed: ${error.message}`,
    trackId: currentTrackId ?? undefined,
    error
  });
  updateStatus("error");
  cleanupCurrentTrack();
}
function handleDecodedChunk(decodedData) {
  if (!currentTrackId || !audioDecoder || !ringBufferDataSab || !stateBufferSab) {
    console.warn("[WavePlayer Worker] Skipping decoded chunk: Worker not fully ready or missing SABs.");
    decodedData.close();
    return;
  }
  const { numberOfChannels, numberOfFrames, sampleRate, format, duration } = decodedData;
  if (!ringBuffer) {
    try {
      if (numberOfChannels !== 2) {
        throw new Error(`Unsupported channel count: ${numberOfChannels}. Only stereo (2 channels) is supported.`);
      }
      console.log(`[WavePlayer Worker] First chunk decoded. Initializing RingBuffer with ${numberOfChannels} channels.`);
      if (format !== "f32-planar") {
        throw new Error(`Unsupported AudioData format: ${format}. Expected 'f32-planar'.`);
      }
      ringBuffer = new RingBuffer(stateBufferSab, ringBufferDataSab, numberOfChannels);
      expectedChannels = numberOfChannels;
      expectedSampleRate = sampleRate;
      ringBuffer.clear();
    } catch (error) {
      console.error("[WavePlayer Worker] Failed to initialize RingBuffer:", error);
      postWorkerMessage({
        type: "ERROR",
        message: `Failed to initialize audio buffer: ${error instanceof Error ? error.message : String(error)}`,
        trackId: currentTrackId,
        error
      });
      updateStatus("error");
      cleanupCurrentTrack();
      decodedData.close();
      return;
    }
  }
  if (numberOfChannels !== expectedChannels || sampleRate !== expectedSampleRate) {
    console.error(`[WavePlayer Worker] Audio format changed mid-stream! Expected ${expectedChannels}ch @ ${expectedSampleRate}Hz, got ${numberOfChannels}ch @ ${sampleRate}Hz. Stopping.`);
    postWorkerMessage({
      type: "ERROR",
      message: "Inconsistent audio format detected mid-stream.",
      trackId: currentTrackId
    });
    updateStatus("error");
    cleanupCurrentTrack();
    decodedData.close();
    return;
  }
  if (!reportedTrackReady) {
    console.log("[WavePlayer Worker] First audio data processed:", { sampleRate, numberOfChannels, format, duration });
    postWorkerMessage({
      type: "TRACK_READY",
      trackId: currentTrackId,
      duration: 0,
      sampleRate,
      numberOfChannels
    });
    reportedTrackReady = true;
    if (currentStatus === "loading") {
      updateStatus("ready");
    }
  }
  totalDecodedDuration += duration;
  if (numberOfFrames > 0) {
    const channelData = [];
    for (let i = 0;i < numberOfChannels; ++i) {
      channelData.push(new Float32Array(numberOfFrames));
    }
    try {
      for (let i = 0;i < numberOfChannels; ++i) {
        decodedData.copyTo(channelData[i], { planeIndex: i, frameOffset: 0, frameCount: numberOfFrames });
      }
      if (!ringBuffer.write(channelData)) {
        console.warn(`[WavePlayer Worker] RingBuffer full. Dropping ${numberOfFrames} samples.`);
      }
    } catch (error) {
      console.error("[WavePlayer Worker] Error copying or writing decoded data:", error);
      postWorkerMessage({
        type: "ERROR",
        message: `Error processing decoded audio data: ${error instanceof Error ? error.message : String(error)}`,
        trackId: currentTrackId,
        error
      });
      updateStatus("error");
      cleanupCurrentTrack();
    }
  }
  decodedData.close();
}
function handleDecodeError(error) {
  console.error("[WavePlayer Worker] Decode failed:", error);
  postWorkerMessage({
    type: "ERROR",
    message: `Audio decode failed: ${error.message}`,
    trackId: currentTrackId ?? undefined,
    error
  });
  updateStatus("error");
  cleanupCurrentTrack();
}
self.onmessage = (event) => {
  const command = event.data;
  switch (command.type) {
    case "INITIALIZE":
      handleInitialize(command);
      break;
    case "LOAD":
      handleLoad(command).catch((err) => {
        console.error("[WavePlayer Worker] Unhandled error during LOAD:", err);
        postWorkerMessage({
          type: "ERROR",
          message: "Internal error during track load",
          trackId: command.track.id,
          error: err instanceof Error ? err : new Error(String(err))
        });
        updateStatus("error");
        cleanupCurrentTrack();
      });
      break;
    case "PLAY":
      if (stateBufferView && (currentStatus === "ready" || currentStatus === "paused")) {
        console.log("[WavePlayer Worker] Handling PLAY command.");
        Atomics.store(stateBufferView, PLAYBACK_STATE_INDEX, 1);
        updateStatus("playing");
      } else if (!stateBufferView) {
        console.error("[WavePlayer Worker] Cannot PLAY: State buffer view not available.");
        postWorkerMessage({ type: "ERROR", message: "Internal error: Playback state cannot be controlled.", trackId: currentTrackId ?? undefined });
      } else {
        console.warn(`[WavePlayer Worker] Cannot PLAY in current status: ${currentStatus}`);
      }
      break;
    case "PAUSE":
      if (stateBufferView && currentStatus === "playing") {
        console.log("[WavePlayer Worker] Handling PAUSE command.");
        Atomics.store(stateBufferView, PLAYBACK_STATE_INDEX, 0);
        updateStatus("paused");
      } else if (!stateBufferView) {
        console.error("[WavePlayer Worker] Cannot PAUSE: State buffer view not available.");
        postWorkerMessage({ type: "ERROR", message: "Internal error: Playback state cannot be controlled.", trackId: currentTrackId ?? undefined });
      } else {
        console.warn(`[WavePlayer Worker] Cannot PAUSE in current status: ${currentStatus}`);
      }
      break;
    case "SEEK":
      console.warn(`[WavePlayer Worker] Received ${command.type}, but handler not implemented yet.`);
      break;
    case "SET_VOLUME":
      console.warn(`[WavePlayer Worker] Received ${command.type}, but handler not implemented yet.`);
      break;
    case "SET_LOOP":
      console.warn(`[WavePlayer Worker] Received ${command.type}, but handler not implemented yet.`);
      break;
    case "PRELOAD":
      console.warn(`[WavePlayer Worker] Received ${command.type}, but handler not implemented yet.`);
      break;
    case "TERMINATE":
      console.log("[WavePlayer Worker] Terminating worker...");
      cleanupCurrentTrack();
      isInitialized = false;
      self.close();
      break;
    default:
      const receivedCommand = command;
      let commandType = "unknown";
      if (typeof receivedCommand === "object" && receivedCommand !== null && "type" in receivedCommand && typeof receivedCommand.type === "string") {
        commandType = receivedCommand.type;
      }
      console.error("[WavePlayer Worker] Received unknown command type:", commandType, receivedCommand);
      postWorkerMessage({ type: "ERROR", message: "Unknown command received" });
      break;
  }
};
self.onerror = (eventOrMessage) => {
  let message = "Uncaught worker error";
  let error = undefined;
  if (eventOrMessage instanceof ErrorEvent) {
    console.error("[WavePlayer Worker] Uncaught error:", eventOrMessage.error, eventOrMessage.message);
    message = eventOrMessage.message || message;
    error = eventOrMessage.error;
  } else {
    console.error("[WavePlayer Worker] Uncaught error/event:", eventOrMessage);
    if (typeof eventOrMessage === "string") {
      message = eventOrMessage;
    }
  }
  if (isInitialized || currentStatus !== "stopped") {
    postWorkerMessage({
      type: "ERROR",
      message,
      error,
      trackId: currentTrackId ?? undefined
    });
    updateStatus("error");
    cleanupCurrentTrack();
  }
};
self.onmessageerror = (event) => {
  console.error("[WavePlayer Worker] Message error:", event);
  if (isInitialized || currentStatus !== "stopped") {
    postWorkerMessage({
      type: "ERROR",
      message: "Error deserializing message"
    });
    updateStatus("error");
  }
};
console.log("[WavePlayer Worker] Worker script loaded and running.");
