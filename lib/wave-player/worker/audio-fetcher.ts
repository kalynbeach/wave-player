/**
 * Interface for the callbacks used by AudioFetcher.
 */
interface AudioFetcherCallbacks {
  /** Called when a new chunk of data is received. */
  onChunk: (chunk: ArrayBuffer) => void;
  /** Called when the fetch is complete. */
  onComplete: () => void;
  /** Called when an error occurs during fetching. */
  onError: (error: Error) => void;
  /** Called periodically with download progress. */
  onProgress?: (downloadedBytes: number, totalBytes: number | null) => void;
}

/**
 * Fetches audio data in chunks using the Fetch API and ReadableStream.
 */
export class AudioFetcher {
  private callbacks: AudioFetcherCallbacks;
  private abortController: AbortController;
  private totalBytes: number | null = null;
  private downloadedBytes = 0;

  constructor(callbacks: AudioFetcherCallbacks) {
    this.callbacks = callbacks;
    // Internal AbortController to allow cancelling the fetch from within or externally
    this.abortController = new AbortController();
  }

  /**
   * Initiates the audio fetch process.
   * @param url The URL of the audio file to fetch.
   * @param fetchOptions Optional Fetch API RequestInit options (e.g., for headers).
   */
  async fetchAudio(url: string, fetchOptions?: RequestInit): Promise<void> {
    this.downloadedBytes = 0;
    this.totalBytes = null;

    console.log(`[AudioFetcher] Starting fetch for: ${url}`);
    try {
      // Merge provided options with the internal signal
      const options: RequestInit = {
        ...fetchOptions, // Spread incoming options first
        signal: this.abortController.signal, // Ensure our signal takes precedence or is added
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
      console.log(`[AudioFetcher] Total bytes: ${this.totalBytes ?? 'Unknown'}`);

      // Report initial progress (0 bytes)
      this.reportProgress();

      const reader = response.body.getReader();

      while (true) {
        if (this.abortController.signal.aborted) {
           console.log("[AudioFetcher] Fetch aborted.");
           // Don't call onError here, let the caller handle abortion cleanup if needed.
           // A specific 'onAborted' callback could be added if necessary.
           return; // Stop processing
        }

        const { done, value } = await reader.read();

        if (done) {
          console.log("[AudioFetcher] Fetch completed successfully.");
          this.callbacks.onComplete();
          break;
        }

        if (value) {
          this.downloadedBytes += value.byteLength;
          // Assert that the buffer is ArrayBuffer, as fetch provides ArrayBuffers
          this.callbacks.onChunk(value.buffer as ArrayBuffer);
          this.reportProgress();
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log("[AudioFetcher] Fetch explicitly aborted.");
        // Don't call onError for explicit aborts by default
      } else {
        console.error("[AudioFetcher] Fetch error:", error);
        this.callbacks.onError(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }

  /**
   * Aborts the ongoing fetch request.
   */
  abort(): void {
    console.log("[AudioFetcher] Abort requested.");
    this.abortController.abort();
  }

  /**
   * Reports progress if the onProgress callback is provided.
   */
  private reportProgress(): void {
    if (this.callbacks.onProgress) {
      this.callbacks.onProgress(this.downloadedBytes, this.totalBytes);
    }
  }
}
