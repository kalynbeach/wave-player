/// <reference types="@types/audioworklet" />

import { RingBuffer, PLAYBACK_STATE_INDEX } from "../worker/ring-buffer";

// Define processor options structure
interface WavePlayerProcessorOptions extends AudioWorkletNodeOptions {
  processorOptions?: {
    ringBufferDataSab: SharedArrayBuffer;
    stateBufferSab: SharedArrayBuffer;
    numChannels: number;
  };
}

/**
 * WavePlayerProcessor
 *
 * This AudioWorkletProcessor is responsible for:
 * 1. Reading audio samples from a shared RingBuffer populated by the main worker thread.
 * 2. Handling playback state changes (play/pause) signaled via Atomics or messages.
 * 3. Filling the output buffers with the appropriate audio data (or silence).
 */
class WavePlayerProcessor extends AudioWorkletProcessor {
  private ringBuffer: RingBuffer | null = null;
  private numChannels = 0; // Default value to satisfy TS
  private stateBufferView: Int32Array | null = null; // View for atomic state reads

  // Temporary buffer to hold data read from ring buffer before copying to output
  // Helps manage reading fewer samples than the output buffer size
  private tempReadBuffer: Float32Array[] = [];

  constructor(options?: WavePlayerProcessorOptions) {
    super();
    console.log("[WavePlayer Processor] Processor creating...", options);

    const processorOptions = options?.processorOptions;
    if (
      !processorOptions ||
      !processorOptions.ringBufferDataSab ||
      !processorOptions.stateBufferSab ||
      !processorOptions.numChannels
    ) {
      console.error(
        "[WavePlayer Processor] Missing required options (SABs, numChannels). Cannot initialize RingBuffer."
      );
      // No way to recover here, processor will likely output silence.
      // We could throw, but worklet environment might handle errors differently.
      this.port.postMessage({
        type: "ERROR",
        message: "Processor initialization failed: Missing SABs or channels.",
      });
      return; // Exit constructor
    }

    // Store state buffer view
    this.stateBufferView = new Int32Array(processorOptions.stateBufferSab);

    try {
      this.numChannels = processorOptions.numChannels;
      this.ringBuffer = new RingBuffer(
        processorOptions.stateBufferSab,
        processorOptions.ringBufferDataSab,
        this.numChannels
      );
      console.log(
        `[WavePlayer Processor] RingBuffer initialized with ${this.numChannels} channels.`
      );

      // Initialize temporary read buffers
      for (let i = 0; i < this.numChannels; ++i) {
        // AudioWorklet process typically uses 128 frames
        this.tempReadBuffer.push(new Float32Array(128));
      }
    } catch (error) {
      console.error(
        "[WavePlayer Processor] Error initializing RingBuffer:",
        error
      );
      this.ringBuffer = null; // Ensure it's null on error
      this.port.postMessage({
        type: "ERROR",
        message: `Processor RingBuffer init failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }

    // TODO (Phase 4): Add message listener for play/pause state from worker?
    this.port.onmessage = (event) => {
      console.log("[WavePlayer Processor] Received message:", event.data);
      // Handle control messages if needed in the future (e.g., force clear)
    };

    this.port.postMessage({ type: "PROCESSOR_READY" });
    console.log("[WavePlayer Processor] Processor construction complete.");
  }

  /**
   * Called by the audio rendering thread to process audio blocks.
   * @param _inputs - Input audio buffers (not used in this source node).
   * @param outputs - Output audio buffers to be filled.
   * @param _parameters - Audio parameters (not used initially).
   * @returns boolean - Return true to keep the processor alive.
   */
  process(
    _inputs: Float32Array[][],
    outputs: Float32Array[][],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _parameters: Record<string, Float32Array>
  ): boolean {
    try {
      if (!this.ringBuffer) {
        // console.trace("[WavePlayer Processor] RingBuffer not available, outputting silence.");
        this.outputSilence(outputs);
        return true; // Keep processor alive
      }

      // Check playback state using Atomics
      if (!this.stateBufferView) {
        console.warn(
          "[WavePlayer Processor] State buffer view not available, outputting silence."
        );
        this.outputSilence(outputs); // Output silence if state cannot be read
        return true;
      }

      const isPlaying =
        Atomics.load(this.stateBufferView, PLAYBACK_STATE_INDEX) === 1;
      
      // Only proceed if playing 
      if (!isPlaying) {
        // console.trace("[WavePlayer Processor] Paused, outputting silence.");
        this.outputSilence(outputs);
        return true; // Keep processor alive while paused
      }

      const output = outputs[0]; // Primary output node
      const numOutputChannels = output.length;
      const bufferSize = output[0]?.length ?? 0; // Typically 128 frames

      // Validate output structure
      if (numOutputChannels === 0 || bufferSize === 0) {
        console.warn("[WavePlayer Processor] Invalid output buffer structure.");
        return true; // Keep alive
      }
      if (numOutputChannels !== this.numChannels) {
        console.warn(
          `[WavePlayer Processor] Mismatch between RingBuffer channels (${this.numChannels}) and output channels (${numOutputChannels}). Outputting silence.`
        );
        this.outputSilence(outputs);
        return true;
      }

      // Resize temp buffer if needed (shouldn't happen with standard 128 block size)
      if (this.tempReadBuffer[0].length !== bufferSize) {
        console.warn(
          `[WavePlayer Processor] Output buffer size changed to ${bufferSize}. Resizing temp buffer.`
        );
        for (let i = 0; i < this.numChannels; ++i) {
          this.tempReadBuffer[i] = new Float32Array(bufferSize);
        }
      }

      // Attempt to read from the RingBuffer into the temporary buffer
      if (this.ringBuffer.read(this.tempReadBuffer)) {
        // Read successful, copy data from temp buffer to the actual output buffers
        for (let channel = 0; channel < this.numChannels; ++channel) {
          const outputChannel = output[channel];
          const tempChannel = this.tempReadBuffer[channel];
          if (outputChannel && tempChannel) {
            outputChannel.set(tempChannel);
          } else {
            console.error(
              `[WavePlayer Processor] Error accessing channel ${channel} during copy.`
            );
            // Fallback to silence for this block if something is wrong
            this.outputSilence(outputs);
            return true;
          }
        }
      } else {
        // Not enough data available in the RingBuffer, output silence
        console.warn(
          `[WavePlayer Processor] RingBuffer starved. Available: ${this.ringBuffer.availableRead}. Outputting silence.`
        ); // Enhanced log
        this.outputSilence(outputs);
        // console.trace(`[WavePlayer Processor] RingBuffer starved (Available: ${this.ringBuffer.availableRead}). Outputting silence.`);
      }

      // TODO (Phase 4): Check playback state (via Atomics/message) - if paused, output silence regardless of buffer content
    } catch (error) {
      console.error(
        "[WavePlayer Processor] Error during process method:",
        error
      );
      this.outputSilence(outputs); // Output silence on error
      this.port.postMessage({
        type: "ERROR",
        message: `Processor error: ${error instanceof Error ? error.message : String(error)}`,
      });
      // Decide whether to return false (kill worklet) or true (keep trying)
    }
    return true; // Keep processor alive
  }

  /** Helper function to fill output buffers with silence */
  private outputSilence(outputs: Float32Array[][]): void {
    const output = outputs[0];
    if (!output) return;

    output.forEach((channel) => {
      if (
        channel instanceof Float32Array &&
        typeof channel.fill === "function"
      ) {
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
  // If registration fails, the worklet is unusable.
  // Throwing might be appropriate to signal a critical failure.
  throw error;
}

// TODO: should export like this?
export { RingBuffer, PLAYBACK_STATE_INDEX, WavePlayerProcessor };
