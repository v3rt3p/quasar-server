import { Span, startInactiveSpan } from '@sentry/node'
import { Sema } from 'async-sema'
import EventEmitter from 'node:events'

import { AudioMetadataBackend, AudioMetadataBackendSession, STTBackend, STTBackendSession } from '../../backend/backend'
import { getLogger } from '../../logger'
import { InputMetadata } from './input-handler'

export interface VoiceInputAudioEvent {
  buffer: Buffer
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface VoiceInputCancelEvent {
}

export interface VoiceInputEvent {
  metadata: InputMetadata
  parentSpan?: Span
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface VoiceInputFinishEvent {
}

export interface VoiceInputHandlerErrorEvent {
  error: unknown
}

export interface VoiceInputHandlerEvents {
  error: [VoiceInputHandlerErrorEvent]
  finish: [VoiceInputHandlerFinishEvent]
  transcribed: [VoiceInputHandlerTranscribedEvent]
}

export interface VoiceInputHandlerFinishEvent {
  metadata: InputMetadata
  text: string
}

export interface VoiceInputHandlerProperties {
  audioMetadata: AudioMetadataBackend
  stt: STTBackend
}

export interface VoiceInputHandlerTranscribedEvent {
  text: string
}

export interface VoiceInputSpeakerMetadataEvent {
  metadata: InputMetadata
}

interface AudioMetadata {
  speakerVerification?: {
    label?: string
  }
}

// eslint-disable-next-line unicorn/prefer-event-target
export class VoiceInputHandler extends EventEmitter<VoiceInputHandlerEvents> {
  private audioDataQueue: Buffer[] = []
  private audioMetadataSession: AudioMetadataBackendSession | null = null
  private audioSendingLock = new Sema(1)
  private lastTranscribeResult: string = ''
  private readonly logger = getLogger<VoiceInputHandler>()
  private metadata: InputMetadata = { internal: {}, readyToUse: {} }
  private sttSession: null | STTBackendSession = null
  private voiceSpan: null | Span = null

  constructor (private readonly properties: VoiceInputHandlerProperties) {
    super()
  }

  close (): void {
    this.audioMetadataSession?.close()
    this.audioMetadataSession = null
    this.sttSession?.close()
    this.sttSession = null
    this.audioDataQueue = []
    this.lastTranscribeResult = ''
    this.metadata = { internal: {}, readyToUse: {} }

    this.voiceSpan?.setAttribute('endReason', 'close')
    this.voiceSpan?.end()
    this.voiceSpan = null
  }

  async handleVoiceInputAudioEvent (data: VoiceInputAudioEvent): Promise<void> {
    await this.audioSendingLock.acquire()
    try {
      if (this.audioMetadataSession && this.sttSession) {
        await Promise.all([this.audioMetadataSession.processChunk(data.buffer),
          this.sttSession.transcribeChunk(data.buffer)])
      } else {
        this.audioDataQueue.push(data.buffer)
      }
    } finally {
      this.audioSendingLock.release()
    }
  }

  async handleVoiceInputCancelEvent (_request: VoiceInputCancelEvent): Promise<void> {
    this.logger.debug('VoiceInputHandler received Cancel')
    this.close()
  }

  async handleVoiceInputEvent (request: VoiceInputEvent): Promise<void> {
    this.logger.debug('VoiceInputHandler received Input')
    this.close()

    if (request.parentSpan) {
      this.voiceSpan = startInactiveSpan({
        name: 'VoiceInputHandler processing',
        op: 'voice-input-handler',
        parentSpan: request.parentSpan
      })
    }

    this.metadata = {
      ...request.metadata
    }

    let audioMetadataSession: AudioMetadataBackendSession
    let sttSession: STTBackendSession

    try {
      [audioMetadataSession, sttSession] = await Promise.all([
        this.properties.audioMetadata.startCapturing(this.voiceSpan ?? undefined),
        this.properties.stt.startTranscribing(this.voiceSpan ?? undefined)
      ])
    } catch (error) {
      this.emit('error', {
        error
      })
      this.close()
      return
    }

    sttSession.setCallback(({ endOfUtt, text }) => {
      this.lastTranscribeResult = text
      this.emit('transcribed', {
        text
      })
      this.logger.debug(`VoiceInputHandler transcribed: ${text}`)
      if (endOfUtt) {
        this.stop().then(() => {
          this.transcribeFinished()
        }).catch(error => {
          this.emit('error', error)
          this.close()
        })
      }
    })

    this.logger.debug('VoiceInputHandler streams created')

    await this.audioSendingLock.acquire()
    try {
      while (this.audioDataQueue.length > 0) {
        const copy = [...this.audioDataQueue]

        for (const data of copy) {
          await Promise.all([audioMetadataSession.processChunk(data), sttSession.transcribeChunk(data)])
        }
        this.logger.debug(`Sent ${this.audioDataQueue.length} chunks`)
        this.audioDataQueue = this.audioDataQueue.slice(copy.length)
      }

      this.audioMetadataSession = audioMetadataSession
      this.sttSession = sttSession
    } finally {
      this.audioSendingLock.release()
    }

    this.logger.debug('VoiceInputHandler streaming started')
  }

  async handleVoiceInputFinishEvent (_request: VoiceInputFinishEvent): Promise<void> {
    this.logger.debug('VoiceInputHandler received Finish')
    await this.stop()
    this.transcribeFinished()
  }

  async handleVoiceInputSpeakerMetadataEvent (request: VoiceInputSpeakerMetadataEvent): Promise<void> {
    this.logger.debug('VoiceInputHandler received Metadata')
    this.metadata = {
      internal: {
        ...this.metadata.internal,
        ...request.metadata.internal
      },
      readyToUse: {
        ...this.metadata.readyToUse,
        ...request.metadata.readyToUse
      }
    }
  }

  private async stop (): Promise<void> {
    const audioMetadata = await this.audioMetadataSession?.finish() as AudioMetadata | undefined
    this.metadata = {
      internal: {
        ...this.metadata.internal,
        audioMetadata
      },
      readyToUse: {
        ...this.metadata.readyToUse,
        ...(audioMetadata?.speakerVerification?.label
          ? {
              inputPersonVoiceLabel: {
                description: 'input person voice label (e.g. name)',
                value: audioMetadata.speakerVerification.label
              }
            }
          : {})
      }
    }
    this.audioMetadataSession = null
    this.sttSession?.close()
    this.sttSession = null
    this.audioDataQueue = []
    this.voiceSpan?.setAttribute('endReason', 'finish')
    this.voiceSpan?.setAttribute('text', this.lastTranscribeResult)
    this.voiceSpan?.setAttribute('metadata', JSON.stringify(this.metadata, undefined, 2))
    this.voiceSpan?.end()
    this.voiceSpan = null
  }

  private transcribeFinished (): void {
    const metadata = this.metadata
    this.metadata = { internal: {}, readyToUse: {} }
    this.logger.debug(`VoiceInputHandler transcribe finished: ${this.lastTranscribeResult}`)
    this.emit('finish', {
      metadata: metadata!,
      text: this.lastTranscribeResult
    })
  }
}
