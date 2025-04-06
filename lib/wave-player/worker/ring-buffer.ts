/**
 * Constants for indices within the state SharedArrayBuffer.
 * We use Int32Array for Atomics compatibility.
 */
export const READ_POINTER_INDEX = 0;
export const WRITE_POINTER_INDEX = 1;
export const PLAYBACK_STATE_INDEX = 2; // 0 = paused/stopped, 1 = playing
export const STATE_ARRAY_LENGTH = 3; // Read pointer, write pointer, playback state

/**
 * A thread-safe, lock-free ring buffer implementation using SharedArrayBuffers
 * suitable for transferring audio data between a Worker and an AudioWorkletProcessor.
 *
 * Assumes non-interleaved Float32 audio data.
 */
export class RingBuffer {
  private readonly state: Int32Array; // Read/Write pointers, Playback state
  private readonly channels: Float32Array[]; // Audio data storage for each channel
  private readonly capacity: number; // Capacity per channel in samples
  private readonly numChannels: number;

  /**
   * Creates a new RingBuffer instance.
   *
   * @param stateSab SharedArrayBuffer for storing read/write pointers (Int32).
   *                 Must be large enough for STATE_ARRAY_LENGTH Int32 elements.
   * @param dataSab SharedArrayBuffer for storing audio sample data (Float32).
   *                Its size determines the capacity based on numChannels.
   * @param numChannels The number of audio channels.
   */
  constructor(
    stateSab: SharedArrayBuffer,
    dataSab: SharedArrayBuffer,
    numChannels: number
  ) {
    if (
      stateSab.byteLength <
      STATE_ARRAY_LENGTH * Int32Array.BYTES_PER_ELEMENT
    ) {
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
    // Total number of Float32 samples the data SAB can hold
    const totalSamples = Math.floor(dataSab.byteLength / Float32Array.BYTES_PER_ELEMENT);
    // Capacity per channel
    this.capacity = Math.floor(totalSamples / numChannels);

    if (this.capacity === 0) {
      throw new Error("Data SAB is too small for the given number of channels.");
    }

    console.log(`[RingBuffer] Initialized with capacity: ${this.capacity} samples per channel.`);

    this.channels = [];
    for (let i = 0; i < numChannels; ++i) {
      // Create views for each channel's data within the shared buffer
      const byteOffset = i * this.capacity * Float32Array.BYTES_PER_ELEMENT;
      this.channels.push(
        new Float32Array(dataSab, byteOffset, this.capacity)
      );
    }

    // Initialize pointers if they haven't been (e.g., on first creation)
    // Atomics.compareExchange ensures this happens only once across threads
    Atomics.compareExchange(this.state, READ_POINTER_INDEX, 0, 0);
    Atomics.compareExchange(this.state, WRITE_POINTER_INDEX, 0, 0);
  }

  /**
   * Calculates the number of samples currently available for reading.
   * Uses Atomics.load for thread-safe reads of pointers.
   * @returns The number of readable samples per channel.
   */
  get availableRead(): number {
    const readPos = Atomics.load(this.state, READ_POINTER_INDEX);
    const writePos = Atomics.load(this.state, WRITE_POINTER_INDEX);
    if (writePos >= readPos) {
      return writePos - readPos;
    } else {
      // Wrap around case
      return this.capacity - readPos + writePos;
    }
  }

  /**
   * Calculates the remaining space available for writing.
   * Uses Atomics.load for thread-safe reads of pointers.
   * @returns The number of writable samples per channel.
   */
  get availableWrite(): number {
    // Leave one space empty to distinguish full from empty
    return this.capacity - this.availableRead - 1;
  }

  /**
   * Writes audio samples to the ring buffer.
   *
   * @param inputBuffers An array of Float32Arrays, one for each channel,
   *                     containing the samples to write. All arrays must
   *                     have the same length.
   * @returns True if the write was successful, false if there was insufficient
   *          space in the buffer.
   */
  write(inputBuffers: Float32Array[]): boolean {
    if (inputBuffers.length !== this.numChannels) {
        console.error(`[RingBuffer] Write error: Expected ${this.numChannels} channels, got ${inputBuffers.length}`);
        return false;
    }
    const samplesToWrite = inputBuffers[0]?.length ?? 0;
    if (samplesToWrite === 0) {
      return true; // Nothing to write
    }
    if (samplesToWrite > this.availableWrite) {
      // console.warn(`[RingBuffer] Write failed: Not enough space. Need ${samplesToWrite}, have ${this.availableWrite}`);
      return false; // Not enough space
    }

    const writePos = Atomics.load(this.state, WRITE_POINTER_INDEX);

    for (let i = 0; i < this.numChannels; ++i) {
        const channelInput = inputBuffers[i];
        const channelBuffer = this.channels[i];
        if (!channelInput || channelInput.length !== samplesToWrite) {
            console.error(`[RingBuffer] Write error: Channel ${i} buffer mismatch or missing.`);
            // This indicates a programming error, should not happen in normal use.
            // We cannot safely proceed with the write.
            return false; // Or throw? For now, return false.
        }

        const spaceToEnd = this.capacity - writePos;
        if (samplesToWrite <= spaceToEnd) {
            // No wrap-around needed for this write
            channelBuffer.set(channelInput, writePos);
        } else {
            // Wrap-around: write in two parts
            const firstPart = channelInput.subarray(0, spaceToEnd);
            const secondPart = channelInput.subarray(spaceToEnd);
            channelBuffer.set(firstPart, writePos);
            channelBuffer.set(secondPart, 0);
        }
    }

    // Update the write pointer atomically AFTER writing all channels
    const nextWritePos = (writePos + samplesToWrite) % this.capacity;
    Atomics.store(this.state, WRITE_POINTER_INDEX, nextWritePos);

    return true;
  }

  /**
   * Reads audio samples from the ring buffer.
   *
   * @param outputBuffers An array of Float32Arrays, one for each channel,
   *                      where the read samples will be stored. All arrays
   *                      must have the same length.
   * @returns True if the read was successful (reading the requested number
   *          of samples), false if there were insufficient samples available.
   */
  read(outputBuffers: Float32Array[]): boolean {
    if (outputBuffers.length !== this.numChannels) {
      console.error(`[RingBuffer] Read error: Expected ${this.numChannels} channels, got ${outputBuffers.length}`);
      return false;
    }
    const samplesToRead = outputBuffers[0]?.length ?? 0;
    if (samplesToRead === 0) {
      return true; // Nothing to read
    }
    if (samplesToRead > this.availableRead) {
        // console.warn(`[RingBuffer] Read failed: Not enough samples. Need ${samplesToRead}, have ${this.availableRead}`);
        return false; // Not enough samples available
    }

    const readPos = Atomics.load(this.state, READ_POINTER_INDEX);

    for (let i = 0; i < this.numChannels; ++i) {
        const channelOutput = outputBuffers[i];
        const channelBuffer = this.channels[i];
         if (!channelOutput || channelOutput.length !== samplesToRead) {
            console.error(`[RingBuffer] Read error: Channel ${i} buffer mismatch or missing.`);
            return false;
        }

        const samplesToEnd = this.capacity - readPos;
        if (samplesToRead <= samplesToEnd) {
            // No wrap-around needed for this read
            channelOutput.set(channelBuffer.subarray(readPos, readPos + samplesToRead));
        } else {
            // Wrap-around: read in two parts
            const firstPart = channelBuffer.subarray(readPos, this.capacity);
            const secondPart = channelBuffer.subarray(0, samplesToRead - samplesToEnd);
            channelOutput.set(firstPart, 0);
            channelOutput.set(secondPart, firstPart.length);
        }
    }

    // Update the read pointer atomically AFTER reading all channels
    const nextReadPos = (readPos + samplesToRead) % this.capacity;
    Atomics.store(this.state, READ_POINTER_INDEX, nextReadPos);

    return true;
  }

  /**
   * Clears the buffer by resetting the read and write pointers.
   * Should only be called when it's certain no other thread is operating.
   * Primarily useful for initialization or explicit resets from a controlling thread.
   */
  clear() {
      // Use store directly, assuming this is called during a safe period (e.g., initialization or stop)
      Atomics.store(this.state, WRITE_POINTER_INDEX, 0);
      Atomics.store(this.state, READ_POINTER_INDEX, 0);
      console.log("[RingBuffer] Buffer cleared.");
  }
} 