declare module 'whisper.rn' {
  type WhisperContext = {
    transcribe: (audioUri: string, options?: Record<string, unknown>) => {
      promise: Promise<unknown>;
    };
    transcribeRealtime: (options?: Record<string, unknown>) => Promise<{
      stop: () => Promise<void>;
      subscribe: (callback: (event: { isCapturing?: boolean; data?: unknown; error?: string }) => void) => void;
    }>;
  };

  export function initWhisper(options: {
    filePath: string;
    useGpu?: boolean;
    useFlashAttn?: boolean;
  }): Promise<WhisperContext>;
  export function toggleNativeLog(enabled: boolean): Promise<void>;
  export function addNativeLogListener(listener: (level: string, text: string) => void): void;
}
