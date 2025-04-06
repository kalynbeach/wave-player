/// <reference types="@types/audioworklet" />

/**
 * WavePlayerProcessor
 *
 * This AudioWorkletProcessor is responsible for:
 * 1. Reading audio samples from a shared RingBuffer populated by the main worker thread.
 * 2. Handling playback state changes (play/pause) signaled via Atomics or messages.
 * 3. Filling the output buffers with the appropriate audio data (or silence).
 */
class WavePlayerProcessor extends AudioWorkletProcessor {
  // TODO (Phase 3/4): Add state for ring buffer access, playback state (via Atomics), etc.

  constructor(options?: AudioWorkletNodeOptions) {
    super();
    console.log("[WavePlayer Processor] Processor created.", options);

    // TODO (Phase 3/4): Initialize ring buffer access, listen for messages from worker
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
    // For Phase 1, we just output silence.
    // In Phase 3, this will read from the RingBuffer.
    const outputChannel = outputs[0]; // Assuming mono or taking the first channel set

    // Check if outputChannel and its channels exist and have the expected structure
    if (!outputChannel || outputChannel.length === 0) {
      // console.warn('[WavePlayer Processor] No output channels available.');
      return true; // Keep processor alive even if output is weird
    }

    // Output silence
    outputChannel.forEach((channel) => {
      // Verify channel is a Float32Array and has a fill method
      if (channel instanceof Float32Array && typeof channel.fill === 'function') {
        channel.fill(0);
      } else {
        // Fallback for unexpected channel types, though ideally this shouldn't happen
        for (let i = 0; i < channel.length; i++) {
          channel[i] = 0;
        }
      }
    });

    // TODO (Phase 4): Check playback state (via Atomics/message)
    // TODO (Phase 3): Read from RingBuffer if playing

    // Return true to keep the processor alive.
    // Returning false will terminate the node and processor.
    return true;
  }
}

try {
  registerProcessor("wave-player-processor", WavePlayerProcessor);
  console.log("[WavePlayer Processor] Registered WavePlayerProcessor.");
} catch (error) {
  console.error(
    '[WavePlayer Processor] Error registering processor:',
    error
  );
  // Rethrow or handle as appropriate, perhaps signal main thread?
  throw error;
}
