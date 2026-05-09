import { EventEmitter } from 'node:stream';
import { AliceDirective } from '../routers/alice/directives'

export interface AudioMetadataBackend {
  startCapturing(): Promise<AudioMetadataBackendSession>;
}

export interface ProcessorBackend {
  openSession(): Promise<ProcessorSession>;
}

export type ProcessorPartialResponse = {
  directives: AliceDirective[];
  finished: false;
  text: string;
} | {
  directives: AliceDirective[];
  finished: true;
  requireMoreInput: boolean;
  text: string;
}

export interface ProcessorRequest {
  isExternalEvent?: boolean;
  metadata: object;
  text: string;
}

export interface ProcessorSessionEvents {
  partialResponse: [ProcessorPartialResponse]
  close: []
}

export interface ProcessorSession extends EventEmitter<ProcessorSessionEvents> {
  close(): void;
  prepare(): Promise<void>;
  process(request: ProcessorRequest): Promise<void>;
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
  abstract close(): void

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
