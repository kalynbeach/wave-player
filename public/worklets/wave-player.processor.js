/// <reference types="@types/audioworklet" />
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

// lib/wave-player/worklet/wave-player.processor.ts
class WavePlayerProcessor extends AudioWorkletProcessor {
  ringBuffer = null;
  numChannels = 0;
  stateBufferView = null;
  tempReadBuffer = [];
  constructor(options) {
    super();
    console.log("[WavePlayer Processor] Processor creating...", options);
    const processorOptions = options?.processorOptions;
    if (!processorOptions || !processorOptions.ringBufferDataSab || !processorOptions.stateBufferSab || !processorOptions.numChannels) {
      console.error("[WavePlayer Processor] Missing required options (SABs, numChannels). Cannot initialize RingBuffer.");
      this.port.postMessage({
        type: "ERROR",
        message: "Processor initialization failed: Missing SABs or channels."
      });
      return;
    }
    this.stateBufferView = new Int32Array(processorOptions.stateBufferSab);
    try {
      this.numChannels = processorOptions.numChannels;
      this.ringBuffer = new RingBuffer(processorOptions.stateBufferSab, processorOptions.ringBufferDataSab, this.numChannels);
      console.log(`[WavePlayer Processor] RingBuffer initialized with ${this.numChannels} channels.`);
      for (let i = 0;i < this.numChannels; ++i) {
        this.tempReadBuffer.push(new Float32Array(128));
      }
    } catch (error) {
      console.error("[WavePlayer Processor] Error initializing RingBuffer:", error);
      this.ringBuffer = null;
      this.port.postMessage({
        type: "ERROR",
        message: `Processor RingBuffer init failed: ${error instanceof Error ? error.message : String(error)}`
      });
    }
    this.port.onmessage = (event) => {
      console.log("[WavePlayer Processor] Received message:", event.data);
    };
    this.port.postMessage({ type: "PROCESSOR_READY" });
    console.log("[WavePlayer Processor] Processor construction complete.");
  }
  process(_inputs, outputs, _parameters) {
    try {
      if (!this.ringBuffer) {
        this.outputSilence(outputs);
        return true;
      }
      if (!this.stateBufferView) {
        console.warn("[WavePlayer Processor] State buffer view not available, outputting silence.");
        this.outputSilence(outputs);
        return true;
      }
      const isPlaying = Atomics.load(this.stateBufferView, PLAYBACK_STATE_INDEX) === 1;
      if (!isPlaying) {
        this.outputSilence(outputs);
        return true;
      }
      const output = outputs[0];
      const numOutputChannels = output.length;
      const bufferSize = output[0]?.length ?? 0;
      if (numOutputChannels === 0 || bufferSize === 0) {
        console.warn("[WavePlayer Processor] Invalid output buffer structure.");
        return true;
      }
      if (numOutputChannels !== this.numChannels) {
        console.warn(`[WavePlayer Processor] Mismatch between RingBuffer channels (${this.numChannels}) and output channels (${numOutputChannels}). Outputting silence.`);
        this.outputSilence(outputs);
        return true;
      }
      if (this.tempReadBuffer[0].length !== bufferSize) {
        console.warn(`[WavePlayer Processor] Output buffer size changed to ${bufferSize}. Resizing temp buffer.`);
        for (let i = 0;i < this.numChannels; ++i) {
          this.tempReadBuffer[i] = new Float32Array(bufferSize);
        }
      }
      if (this.ringBuffer.read(this.tempReadBuffer)) {
        for (let channel = 0;channel < this.numChannels; ++channel) {
          const outputChannel = output[channel];
          const tempChannel = this.tempReadBuffer[channel];
          if (outputChannel && tempChannel) {
            outputChannel.set(tempChannel);
          } else {
            console.error(`[WavePlayer Processor] Error accessing channel ${channel} during copy.`);
            this.outputSilence(outputs);
            return true;
          }
        }
      } else {
        console.warn(`[WavePlayer Processor] RingBuffer starved. Available: ${this.ringBuffer.availableRead}. Outputting silence.`);
        this.outputSilence(outputs);
      }
    } catch (error) {
      console.error("[WavePlayer Processor] Error during process method:", error);
      this.outputSilence(outputs);
      this.port.postMessage({
        type: "ERROR",
        message: `Processor error: ${error instanceof Error ? error.message : String(error)}`
      });
    }
    return true;
  }
  outputSilence(outputs) {
    const output = outputs[0];
    if (!output)
      return;
    output.forEach((channel) => {
      if (channel instanceof Float32Array && typeof channel.fill === "function") {
        channel.fill(0);
      }
    });
  }
}
try {
  registerProcessor("wave-player-processor", WavePlayerProcessor);
  console.log("[WavePlayer Processor] Registered WavePlayerProcessor.");
} catch (error) {
  console.error("[WavePlayer Processor] Error registering processor:", error);
  throw error;
}
export {
  WavePlayerProcessor,
  RingBuffer,
  PLAYBACK_STATE_INDEX
};
