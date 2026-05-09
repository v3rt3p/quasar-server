import { Sema } from 'async-sema'
import { randomUUID } from 'node:crypto'
import { RawData, WebSocket } from 'ws'

import { AudioMetadataBackend, ProcessorBackend, STTBackend, TTSBackend } from '../../backend/backend'
import { getLogger } from '../../logger'
import { loadProto } from '../../proto'
import { decodeProtobufStruct } from '../../protobuf'
import { AliceDirective, convertToAliceResponseDirective as convertToAliceDirective } from '../alice/directives'
import { continueSessionStage2SemanticFrame, externalEventSemanticFrame, ttsSemanticFrame } from '../alice/typed-payloads'
import { InputHandler, InputResult, TextInput } from './input-handler'
import { VoiceInputHandler } from './voice-input-handler'

const TClientMessageProto = loadProto(
  'alice/protos/api/alicekit/protocol/client/client_message.proto')
  .lookupType('NAlice.NAliceApi.TClientMessage')
const TServerMessageProto = loadProto(
  'alice/protos/api/alicekit/protocol/server/server_message.proto')
  .lookupType('NAlice.NAliceApi.TServerMessage')
const TSemanticFrameRequestData = loadProto(
  'alice/protos/api/alicekit/scenarios/frames/frame.proto')
  .lookupType('NAlice.NAliceApi.TSemanticFrameRequestData')

export interface UniProxyConnectionParameters {
  audioMetadata: AudioMetadataBackend
  processor: ProcessorBackend
  stt: STTBackend
  tts: TTSBackend
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyProtobufData = any

export class UniProxyConnection {
  private inputHandler: InputHandler
  private inputHandlerOpenSessionPromise: null | Promise<void> = null

  private lastOutputAudioStreamId: number = 1024

  private readonly logger = getLogger<UniProxyConnection>()
  private readonly sendLock = new Sema(1)
  private voiceInputHandler: VoiceInputHandler
  private voiceInputReferenceMessageId: string = ''
  private voiceInputReferenceRequestId: string = ''

  private voiceInputReferenceSequenceNumber: number = -1

  private voiceInputStreamId: number = -1

  constructor (private readonly webSocket: WebSocket, private readonly parameters: UniProxyConnectionParameters) {
    this.voiceInputHandler = new VoiceInputHandler(parameters)
    this.inputHandler = new InputHandler(parameters)

    this.setupWebSocketHandlers()
    this.setupVoiceInputHandlers()
  }

  async pushEvent (text: string): Promise<void> {
    await this.sendPush([
      {
        payload: externalEventSemanticFrame(text),
        type: 'mmSemanticFrame'
      }
    ])
  }

  async pushRawDirective (directive: unknown): Promise<void> {
    await this.sendPush([], [directive])
  }

  async pushTts (text: string): Promise<void> {
    await this.sendPush([
      {
        payload: ttsSemanticFrame(text),
        type: 'mmSemanticFrame'
      }
    ])
  }

  private closeConnection (): void {
    this.webSocket.close()
  }

  private getTimings () {
    return {
      SendingTime: {
        seconds: Math.floor(Date.now() / 1000)
      }
    }
  }

  private async handleAudioMessage (streamId: number, audioData: Buffer): Promise<void> {
    if (streamId === this.voiceInputStreamId) {
      await this.voiceInputHandler.handleVoiceInputAudioEvent({
        buffer: audioData
      })
    }
  }

  private async handleBinaryMessage (message: Buffer): Promise<void> {
    if (message.length < 4) {
      throw new Error(`Wrong message length? ${message.length}`)
    }
    if (message.subarray(0, 4).equals(new Uint8Array([0x41, 0x41, 0x50, 0x49]))) {
      const rawClientMessage = message.subarray(4)
      const clientMessage = TClientMessageProto.decode(rawClientMessage).toJSON()
      await this.handleClientMessage(clientMessage)
    } else {
      const streamId = new DataView(message.buffer, message.byteOffset, message.length).getUint32(0, false)
      const audioData = message.subarray(4)
      await this.handleAudioMessage(streamId, audioData)
    }
  }

  private handleClientCancel (): void {
    this.inputHandler.closeSession()
    this.voiceInputHandler.handleVoiceInputCancelEvent({})
  }

  private async handleClientMessage (clientMessage: AnyProtobufData): Promise<void> {
    if (clientMessage.StreamControl) {
      await this.handleStreamControl(clientMessage)
    }
    if (clientMessage.Event) {
      this.logger.debug(`Received event: ${JSON.stringify(Object.keys(clientMessage.Event))}`)
      if (clientMessage.Event.TextInput) {
        await this.handleTextInputEvent(clientMessage)
      }
      if (clientMessage.Event.VoiceInput) {
        await this.handleVoiceInputEvent(clientMessage)
      }
      if (clientMessage.Event.LogSpotter) {
        await this.handleLogSpotterEvent(clientMessage)
      }
      if (clientMessage.Event.MatchedUser) {
        await this.handleMatchedUserEvent(clientMessage)
      }
    }
  }

  private async handleClose (): Promise<void> {
    this.inputHandler.closeSession()
    this.voiceInputHandler.close()
  }

  private async handleLogSpotterEvent (clientMessage: AnyProtobufData): Promise<void> {
    await this.sendServerMessage({
      Event: {
        Header: {
          MessageId: randomUUID(),
          RefMessageId: clientMessage.Event.Header.MessageId
        },
        LogAck: {}
      },
      Timings: this.getTimings()
    })
  }

  private async handleMatchedUserEvent (clientMessage: AnyProtobufData): Promise<void> {
    if (!this.voiceInputHandler) {
      return
    }

    const biometryInfo = clientMessage?.Event?.MatchedUser?.Request?.Event?.BiometryClassification?.Simple
    if (!biometryInfo) {
      return
    }

    const ageClassNames: Record<string, string> = {
      adult: 'adult',
      child: 'child'
    }

    const genderClassNames: Record<string, string> = {
      female: 'female',
      male: 'male'
    }

    await this.voiceInputHandler.handleVoiceInputSpeakerMetadataEvent({
      metadata: {
        age: ageClassNames[biometryInfo.find((item: AnyProtobufData) => item.Tag === 'children')?.ClassName] ?? 'unknown',
        gender: genderClassNames[biometryInfo.find((item: AnyProtobufData) => item.Tag === 'gender')?.ClassName] ?? 'unknown',
      }
    })
  }

  private async handleMessage (message: RawData, isBinary: boolean): Promise<void> {
    const simplifiedMessage = Array.isArray(message) ? Buffer.concat(message) : Buffer.from(message as ArrayBuffer)
    await (isBinary ? this.handleBinaryMessage(simplifiedMessage) : this.handleTextMessage(simplifiedMessage.toString('utf8')))
  }

  private handleServerCancel (): void {
    this.inputHandler.closeSession()
    this.voiceInputHandler.handleVoiceInputCancelEvent({})
    this.sendAsrResult('', true).catch(error => {
      this.logger.warn('Failed to send AsrResult in handleServerCancel: ', error)
      this.closeConnection()
    })
  }

  private async handleStreamControl (clientMessage: AnyProtobufData): Promise<void> {
    const streamId = Number.parseInt(clientMessage.StreamControl.StreamId)
    if (this.voiceInputStreamId !== streamId) {
      return
    }

    const closeReason = clientMessage.StreamControl.Close?.Reason
    if (!closeReason) {
      return
    }

    switch (closeReason) {
      case 'CANCEL': {
        this.handleClientCancel()
        break
      }
      default: {
        this.voiceInputHandler.handleVoiceInputFinishEvent({})
        break
      }
    }
  }

  private async handleTextInputEvent (clientMessage: AnyProtobufData): Promise<void> {
    let textInput: null | TextInput = null

    const event = clientMessage.Event.TextInput.Request.Event

    if (event.Type === 'server_action' && event.Payload) {
      const payload = decodeProtobufStruct(event.Payload)
      if (payload?.typed_semantic_frame?.music_play_semantic_frame) {
        textInput = {
          data: {
            kind: 'playButtonPress'
          },
          metadata: {}
        }
      } else if (payload?.typed_semantic_frame?.external_event_semantic_frame) {
        textInput = {
          data: {
            eventText: payload.typed_semantic_frame.external_event_semantic_frame.event,
            kind: 'event'
          },
          metadata: {}
        }
      } else if (payload?.typed_semantic_frame?.tts_semantic_frame) {
        textInput = {
          data: {
            kind: 'tts',
            text: payload.typed_semantic_frame.tts_semantic_frame.text
          },
          metadata: {}
        }
      } else if (payload?.typed_semantic_frame?.continue_session_stage1_semantic_frame) {
        await this.sendPush([{
          payload: continueSessionStage2SemanticFrame,
          type: 'mmSemanticFrame'
        }], [])
      } else if (payload?.typed_semantic_frame?.continue_session_stage2_semantic_frame) {
        textInput = {
          data: {
            kind: 'continue'
          },
          metadata: {}
        }
      } else {
        this.logger.info(`Received unknown TextInput server_action: ${JSON.stringify(payload)} ${JSON.stringify(event)}`)
      }
    } else if (event.Type === 'server_action' && event.Name === '@@mm_semantic_frame' && event.PayloadRaw) {
      const rawPayload = Buffer.from(event.PayloadRaw, 'base64')
      const decoded = TSemanticFrameRequestData.decode(rawPayload).toJSON()
      if (decoded?.TypedSemanticFrame?.MusicPlaySemanticFrame) {
        textInput = {
          data: {
            kind: 'playButtonPress'
          },
          metadata: {}
        }
      } else {
        this.logger.info(`Received unknown TextInput semantic frame: ${JSON.stringify(decoded)} ${JSON.stringify(event)}`)
      }
    } else {
      this.logger.info(`Received unknown TextInput: ${JSON.stringify(event)}`)
    }

    if (textInput === null) {
      return
    }

    let inputResult: InputResult

    try {
      this.openSession()
      await this.inputHandlerOpenSessionPromise
      inputResult = await this.inputHandler.processTextInput(textInput)
    } catch (error) {
      this.logger.warn('Failed to processTextInput on InputHandler: ', error)
      this.handleServerCancel()
      return
    }

    try {
      await this.sendInputResult(inputResult, clientMessage.Event.TextInput.Header.RequestId,
        clientMessage.Event.Header.MessageId, clientMessage.Event.TextInput.Header.SequenceNumber)
    } catch (error) {
      this.logger.warn('Failed to send input result: ', error)
      this.closeConnection()
    }
  }

  private async handleTextMessage (message: string): Promise<void> {
    // ignore for now
  }

  private async handleVoiceInputEvent (clientMessage: AnyProtobufData): Promise<void> {
    if (!clientMessage.Event.VoiceInput.Header.DialogId) {
      this.inputHandler.closeSession()
    }
    this.openSession()
    this.voiceInputStreamId = Number.parseInt(clientMessage.Event.Header.StreamId)
    this.voiceInputReferenceMessageId = clientMessage.Event.Header.MessageId
    this.voiceInputReferenceRequestId = clientMessage.Event.VoiceInput.Header.RequestId
    this.voiceInputReferenceSequenceNumber = clientMessage.Event.VoiceInput.Header.SequenceNumber
    this.voiceInputHandler.handleVoiceInputEvent({})
  }

  private openSession (): void {
    this.inputHandlerOpenSessionPromise = this.inputHandler.openSession().catch(error => {
      this.logger.error('Failed to open InputHandler session: ', error)
      this.handleServerCancel()
    })
  }

  private async sendAliceResponse (text: null | string, directives: AliceDirective[],
    shouldListen: boolean, requestId: string,
    referenceMessageId: string, sequenceNumber: number) {
    await this.sendServerMessage({
      Event: {
        AliceResponse: {
          Header: {
            DialogId: randomUUID(),
            RequestId: requestId,
            ResponseId: randomUUID(),
            SequenceNumber: sequenceNumber
          },
          Response: {
            Alice2EffectiveSettings: {
              EffectiveSettings: {
                Mode: 2,
                Preset: 'test-preset',
              },
              TrialState: {
                LeftCount: 9999,
                Limit: 9999,
                TimeLimitSec: 9999
              }
            },
            Cards: [],
            Directives: [
              ...directives.map(directive =>
                convertToAliceDirective(directive)),
            ],
            Error: {},
            ForceServerRequest: false,
            IsStreaming: false,
            MegamindAnalyticsInfo: {
              AnalyticsInfo: [],
              ChosenUtterance: 'test',
              IoTUserInfo: {},
              WinnerScenario: {
                Name: 'test-name'
              }
            },
            Suggest: {
              Items: []
            }
          },
          VoiceResponse: {
            ...(text === null
              ? {}
              : {
                  OutputSpeech: {
                    Text: text
                  }
                }),
            HasVoiceResponse: text !== null,
            ShouldListen: shouldListen
          }
        },
        Header: {
          MessageId: randomUUID(),
          RefMessageId: referenceMessageId
        }
      },
      Timings: this.getTimings()
    })
  }

  private async sendAsrResult (text: string, endOfUtt: boolean): Promise<void> {
    await this.sendServerMessage({
      Event: {
        AsrResult: {
          EndOfUtt: endOfUtt,
          MessagesCount: 0,
          Recognition: text.length > 0
            ? [{
                Confidence: 0.999,
                Normalized: text,
                ParentModel: 'speechkit-emu',
                Words: text.split(' ').map(word => ({
                  Confidence: 0.999,
                  Value: word
                }))
              }]
            : [],
          ResponseCode: 0
        },
        Header: {
          MessageId: randomUUID(),
          RefMessageId: this.voiceInputReferenceMessageId
        }
      },
      Timings: this.getTimings()
    })
  }

  private async sendAudioDataMessage (streamId: number, audioData: Buffer): Promise<void> {
    const streamIdBuffer = new Uint8Array(4)
    const streamIdDataView = new DataView(streamIdBuffer.buffer, streamIdBuffer.byteOffset, streamIdBuffer.length)
    streamIdDataView.setUint32(0, streamId, false)
    const audioDataMessage = Buffer.concat([streamIdBuffer, audioData])
    await this.sendRawData(audioDataMessage, true)
  }

  private async sendInputResult (result: InputResult, requestId: string,
    referenceMessageId: string, sequenceNumber: number): Promise<void> {
    try {
      await this.sendAliceResponse(result.text, result.directives, result.shouldListen,
        requestId, referenceMessageId, sequenceNumber)
    } catch (error) {
      this.logger.error('Failed to send AliceResponse in sendInputResult: ', error)
      this.closeConnection()
      return
    }

    if (result.text !== null) {
      this.logger.info(`Synthesizing: ${result.text}`)

      let audioData: Buffer = Buffer.from([])
      try {
        const ttsResult = await this.parameters.tts.synthesize({
          text: result.text
        })
        audioData = ttsResult.voiceOutput
      } catch (error) {
        this.logger.error('Failed to synthesize TTS: ', error)
      }

      this.logger.info(`Synthesized: ${audioData.length}`)

      try {
        await this.sendTTS(audioData, referenceMessageId)
      } catch (error) {
        this.logger.error('Failed to send TtsSpeak in sendInputResult: ', error)
        this.closeConnection()
      }
    }
  }

  private async sendPush (directives: AliceDirective[], rawDirectives?: unknown[]): Promise<void> {
    await this.sendServerMessage({
      Event: {
        Header: {
          Ack: Date.now().toFixed(0),
          MessageId: randomUUID()
        },
        Push: {
          AnalyticsMetaInfo: {},
          DeduplicationPushId: randomUUID(),
          Directives: [
            ...directives.map(directive => convertToAliceDirective(directive)),
            ...(rawDirectives ?? [])
          ],
          PushIds: [
            randomUUID()
          ]
        }
      }
    })
  }

  private async sendRawData (data: Buffer, isBinary: boolean): Promise<void> {
    await this.sendLock.acquire()
    try {
      await new Promise<void>((resolve, reject) => {
        this.webSocket.send(data, {
          binary: isBinary
        }, error => {
          if (error) {
            reject(error)
            return
          }
          resolve()
        })
      })
    } finally {
      this.sendLock.release()
    }
  }

  private async sendServerMessage (serverMessage: AnyProtobufData): Promise<void> {
    const encoded = TServerMessageProto.encode(serverMessage).finish()
    await this.sendRawData(Buffer.concat([Buffer.from('AAPI', 'ascii'), encoded]), true)
  }

  private async sendTTS (audioData: Buffer, referenceMessageId: string): Promise<void> {
    this.lastOutputAudioStreamId++
    await this.sendServerMessage({
      Event: {
        Header: {
          MessageId: randomUUID(),
          RefMessageId: referenceMessageId,
          StreamId: this.lastOutputAudioStreamId
        },
        TtsSpeak: {
          Format: 'audio/opus',
          LazyTtsStreaming: false,
        }
      },
      Timings: this.getTimings()
    })
    await this.sendAudioDataMessage(this.lastOutputAudioStreamId, audioData)
    await this.sendServerMessage({
      StreamControl: {
        Close: {},
        MessageId: randomUUID(),
        StreamId: this.lastOutputAudioStreamId
      },
      Timings: this.getTimings()
    })
  }

  private setupVoiceInputHandlers (): void {
    this.voiceInputHandler.on('finish', async event => {
      this.voiceInputStreamId = -1

      try {
        await this.sendAsrResult(event.text, true)
      } catch (error) {
        this.logger.warn('Failed to send AsrResult on VoiceHandler finish: ', error)
        this.closeConnection()
        return
      }

      let inputResult: InputResult
      try {
        await this.inputHandlerOpenSessionPromise
        inputResult = await this.inputHandler.processVoiceInput({
          metadata: event.metadata,
          text: event.text
        })
      } catch (error) {
        this.logger.warn('Failed to processVoiceInput on InputHandler: ', error)
        this.handleServerCancel()
        return
      }

      try {
        await this.sendInputResult(inputResult, this.voiceInputReferenceRequestId,
          this.voiceInputReferenceMessageId, this.voiceInputReferenceSequenceNumber)
      } catch (error) {
        this.logger.warn('Failed to send input result: ', error)
        this.closeConnection()
      }
    })
    this.voiceInputHandler.on('transcribed', async event => {
      try {
        await this.sendAsrResult(event.text, false)
      } catch (error) {
        this.logger.warn('Failed to send AsrResult on VoiceHandler finish: ', error)
        this.closeConnection()
      }
    })
    this.voiceInputHandler.on('error', event => {
      this.logger.error('Error happened in VoiceInputHandler: ', event.error)
      this.handleServerCancel()
    })
  }

  private setupWebSocketHandlers (): void {
    this.webSocket.on('message', (message, isBinary) => {
      this.handleMessage(message, isBinary).catch(error => {
        this.logger.error('Failed to handle WebSocket message: ', error)
      })
    })
    this.webSocket.on('close', () => {
      this.handleClose().catch(error => {
        this.logger.error('Failed to handle WebSocket close: ', error)
      })
    })
  }
}
