import { AliceDirective } from '../routers/alice/directives'

export interface AudioMetadataBackend {
  startCapturing(): Promise<AudioMetadataBackendSession>;
}

export type CancelCallback = () => void

export interface ProcessorBackend {
  openSession(): Promise<ProcessorSession>;
  prepare(request: ProcessorPrepareRequest): Promise<ProcessorPrepareResponse>;
  process(request: ProcessorRequest): Promise<ProcessorResponse>;
}

export type ProcessorPartialResponse = {
  directives: AliceDirective[];
  finished: false;
  sessionId: string;
  text: string;
} | {
  directives: AliceDirective[];
  finished: true;
  requireMoreInput: boolean;
  sessionId: string;
  text: string;
}

export interface ProcessorPrepareRequest {
  sessionId?: string;
}

export interface ProcessorPrepareResponse {
  sessionId?: string;
}

export interface ProcessorRequest {
  isExternalEvent?: boolean;
  metadata: object;
  sessionId?: string;
  text: string;
}

export type ProcessorRequestSource = 'rawCommand' | 'textOrVoice'

export interface ProcessorResponse {
  directives: AliceDirective[];
  requireMoreInput: boolean;
  sessionId: string;
  text: string;
}

export interface ProcessorSession {
  close(): void;
  prepare(request: ProcessorPrepareRequest): Promise<void>;
  process(request: Omit<ProcessorRequest, 'sessionId'>): Promise<void>;
  waitForPartialResponse(): [Promise<ProcessorPartialResponse>, CancelCallback];
}

export interface STTBackend {
  startTranscribing(): Promise<STTBackendSession>;
}

export type STTChunkTranscribeCallback = (result: STTChunkTranscribeResult) => void

export interface STTChunkTranscribeResult {
  endOfUtt: boolean;
  text: string;
}

export interface TTSBackend {
  synthesize(request: TTSRequest): Promise<TTSResponse>;
}

export interface TTSRequest {
  text: string;
}

export interface TTSResponse {
  format: string; 
  voiceOutput: Buffer;
}

export abstract class AudioMetadataBackendSession {
  abstract finish(): Promise<object>

  abstract processChunk(chunk: Buffer): Promise<void>
}

export abstract class STTBackendSession {
  private callback: null | STTChunkTranscribeCallback = null

  abstract close(): void

  setCallback(callback: STTChunkTranscribeCallback): void {
    this.callback = callback
  }

  abstract transcribeChunk(chunk: Buffer): void

  protected chunkTranscribed(result: STTChunkTranscribeResult): void {
    if (this.callback) {
      this.callback(result)
    }
  }
}
