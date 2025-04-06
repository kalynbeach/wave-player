/// <reference types="@types/dom-webcodecs" />

/**
 * Interface for the callbacks used by AudioDecoderWrapper.
 */
interface AudioDecoderCallbacks {
  /** Called when an AudioData frame is successfully decoded. */
  onDecoded: (chunk: AudioData) => void;
  /** Called when an error occurs during decoding. */
  onError: (error: Error) => void;
}

/**
 * Configuration options for the AudioDecoder.
 * These might be initially guessed or determined dynamically.
 */
export type AudioDecoderConfig = globalThis.AudioDecoderConfig;

/**
 * Wraps the WebCodecs AudioDecoder for easier management.
 */
export class AudioDecoderWrapper {
  private decoder: AudioDecoder | null = null;
  private callbacks: AudioDecoderCallbacks;
  private currentConfig: AudioDecoderConfig | null = null;

  constructor(callbacks: AudioDecoderCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Configures the underlying AudioDecoder.
   * Throws an error if configuration is not supported or fails.
   * @param config The decoder configuration.
   */
  async configure(config: AudioDecoderConfig): Promise<void> {
    console.log("[AudioDecoder] Configuring decoder with:", config);
    this.currentConfig = config;

    // Close existing decoder if any
    this.close();

    try {
      const support = await AudioDecoder.isConfigSupported(config);
      if (!support.supported) {
        throw new Error(`AudioDecoder config not supported: ${JSON.stringify(config)}`);
      }

      this.decoder = new AudioDecoder({
        output: this.handleDecodedChunk.bind(this),
        error: this.handleError.bind(this),
      });

      this.decoder.configure(config);
      console.log("[AudioDecoder] Decoder configured successfully.");
    } catch (error) {
      console.error("[AudioDecoder] Configuration failed:", error);
      this.decoder = null; // Ensure decoder is null on failure
      this.callbacks.onError(
        error instanceof Error ? error : new Error("Decoder configuration failed")
      );
      // Re-throw the error to signal configuration failure
      throw error;
    }
  }

  /**
   * Decodes an EncodedAudioChunk.
   * Make sure the decoder is configured before calling this.
   * @param chunk The chunk to decode.
   */
  decodeChunk(chunk: EncodedAudioChunk): void {
    if (!this.decoder || this.decoder.state !== "configured") {
      console.warn(
        "[AudioDecoder] Attempted to decode chunk before decoder is configured or while closed.",
        this.decoder?.state
      );
      // Optionally, queue the chunk or signal an error
      // this.callbacks.onError(new Error('Decoder not configured or closed'));
      return;
    }
    try {
      this.decoder.decode(chunk);
    } catch (error) {
      console.error("[AudioDecoder] Error scheduling decode:", error);
      this.callbacks.onError(
        error instanceof Error ? error : new Error("Error scheduling decode")
      );
    }
  }

  /**
   * Resets the decoder's internal state.
   */
  reset(): void {
    if (this.decoder && this.decoder.state !== "closed") {
      console.log("[AudioDecoder] Resetting decoder state.");
      this.decoder.reset();
      // Re-configure if needed after reset, as state might become 'unconfigured'
      if (this.currentConfig) {
        try {
            this.decoder.configure(this.currentConfig);
        } catch (error) {
            console.error("[AudioDecoder] Error re-configuring after reset:", error);
            this.callbacks.onError(
              error instanceof Error ? error : new Error("Error re-configuring after reset")
            );
        }
      }
    } else {
      console.warn("[AudioDecoder] Cannot reset, decoder not initialized or already closed.");
    }
  }

  /**
   * Flushes any pending frames from the decoder.
   * Call this after all chunks have been sent.
   */
  async flush(): Promise<void> {
      if (this.decoder && this.decoder.state === 'configured') {
          console.log("[AudioDecoder] Flushing decoder.");
          await this.decoder.flush();
          console.log("[AudioDecoder] Decoder flushed.");
      } else {
          console.warn("[AudioDecoder] Cannot flush, decoder not configured or closed.");
      }
  }

  /**
   * Closes the decoder, releasing resources.
   */
  close(): void {
    if (this.decoder && this.decoder.state !== "closed") {
      console.log("[AudioDecoder] Closing decoder.");
      this.decoder.close();
    }
    this.decoder = null;
    // currentConfig is kept in case we need to re-initialize
  }

  /**
   * Handles the 'output' event from the AudioDecoder.
   * @param chunk The decoded AudioData.
   */
  private handleDecodedChunk(chunk: AudioData): void {
    try {
      this.callbacks.onDecoded(chunk);
      // AudioData must be closed to free up resources
      chunk.close();
    } catch (error) {
        console.error("[AudioDecoder] Error handling decoded chunk callback:", error);
        // Also close the chunk if an error occurs in the callback to prevent memory leaks
        try {
            chunk.close();
        } catch (closeError) {
            console.error("[AudioDecoder] Error closing chunk after callback error:", closeError);
        }
    }
  }

  /**
   * Handles the 'error' event from the AudioDecoder.
   * @param error The error object.
   */
  private handleError(error: Error): void {
    console.error("[AudioDecoder] Decoding error:", error);
    this.callbacks.onError(error);
    // Consider resetting or closing the decoder depending on the error type
    // For now, just report it.
  }

  /**
   * Gets the current state of the decoder.
   */
  get state(): CodecState | null {
    return this.decoder?.state ?? null;
  }
}
