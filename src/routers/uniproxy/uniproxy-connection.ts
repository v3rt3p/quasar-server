import { Span, startInactiveSpan } from '@sentry/node'
import { Sema } from 'async-sema'
import { randomUUID } from 'node:crypto'
import { RawData, WebSocket } from 'ws'

import { AudioMetadataBackend, ProcessorBackend, STTBackend, TTSBackend } from '../../backend/backend'
import { getLogger } from '../../logger'
import { decodeProtobufStruct, getValue } from '../../protobuf'
import proto from '../../protos/protos'
import { AliceDirective, convertToAliceResponseDirective as convertToAliceDirective } from '../alice/directives'
import { continueSessionStage2SemanticFrame, externalEventSemanticFrame, ttsSemanticFrame } from '../alice/typed-payloads'
import { InputHandler, InputResult, TextInput } from './input-handler'
import { VoiceInputHandler } from './voice-input-handler'

type TServerMessage = proto.NAlice.NAliceApi.ITServerMessage
const TServerMessageClass = proto.NAlice.NAliceApi.TServerMessage

type TClientMessage = proto.NAlice.NAliceApi.ITClientMessage
const TClientMessageClass = proto.NAlice.NAliceApi.TClientMessage

const TSemanticFrameRequestDataClass = proto.NAlice.NAliceApi.TSemanticFrameRequestData

enum CloseDialogReason {
  CLIENT_CANCEL = 'clientCancel',
  INTERRUPTION = 'interruption',
  SERVER_CANCEL = 'serverCancel',
  SERVER_FINISHED = 'serverFinished',
  WEBSOCKET_CLOSE = 'webSocketClose'
}

export interface UniProxyConnectionParameters {
  audioMetadata: AudioMetadataBackend
  processor: ProcessorBackend
  stt: STTBackend
  tts: TTSBackend
}

export class UniProxyConnection {
  private dialogId: null | string = null
  private dialogSpan: null | Span = null

  private inputHandler: InputHandler

  private inputHandlerOpenSessionPromise: null | Promise<void> = null
  private lastOutputAudioStreamId: number = 1024
  private readonly logger = getLogger<UniProxyConnection>()
  private readonly sendLock = new Sema(1)
  private voiceInputHandler: VoiceInputHandler

  private voiceInputReferenceMessageId: string = ''

  private voiceInputReferenceRequestId: string = ''

  private voiceInputReferenceSequenceNumber: number = -1
  private voiceInputStreamId: Long | number = -1

  constructor (private readonly webSocket: WebSocket, private readonly parameters: UniProxyConnectionParameters) {
    this.voiceInputHandler = new VoiceInputHandler(parameters)
    this.inputHandler = new InputHandler(parameters)

    this.setupWebSocketHandlers()
    this.setupVoiceInputHandlers()
  }

  async pushDirective (...directives: AliceDirective[]): Promise<void> {
    await this.sendPush(directives)
  }

  async pushEvent (text: string): Promise<void> {
    await this.sendPush([
      {
        payload: externalEventSemanticFrame(text),
        type: 'mmSemanticFrame'
      }
    ])
  }

  async pushRawDirective (directive: proto.NAlice.NAliceApi.ITDirective): Promise<void> {
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

  private closeDialog (reason: CloseDialogReason): void {
    if (this.dialogSpan === null || this.dialogId === null) {
      return
    }
    this.dialogSpan.setAttribute('endReason', reason)
    this.dialogSpan.end()
    this.logger.info(`Dialog ${this.dialogId} ended: ${reason}`)
    this.dialogSpan = null
    this.dialogId = null
  }

  private getTimings (): proto.NAlice.NAliceApi.TServerMessage.ITTimings {
    return {
      SendingTime: {
        seconds: Math.floor(Date.now() / 1000)
      }
    }
  }

  private async handleAudioMessage (streamId: number, audioData: Buffer): Promise<void> {
    if (longEquals(streamId, this.voiceInputStreamId)) {
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
      const clientMessage = TClientMessageClass.decode(rawClientMessage)
      await this.handleClientMessage(clientMessage)
    } else {
      const streamId = new DataView(message.buffer, message.byteOffset, message.length).getUint32(0, false)
      const audioData = message.subarray(4)
      await this.handleAudioMessage(streamId, audioData)
    }
  }

  private handleClientCancel (): void {
    this.inputHandler.closeSession()
    this.closeDialog(CloseDialogReason.CLIENT_CANCEL)
    this.voiceInputHandler.handleVoiceInputCancelEvent({})
  }

  private async handleClientMessage (clientMessage: TClientMessage): Promise<void> {
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
    this.closeDialog(CloseDialogReason.WEBSOCKET_CLOSE)
    this.voiceInputHandler.close()
  }

  private async handleLogSpotterEvent (clientMessage: TClientMessage): Promise<void> {
    await this.sendServerMessage({
      Event: {
        Header: {
          MessageId: randomUUID(),
          RefMessageId: clientMessage.Event!.Header!.MessageId
        },
        LogAck: {}
      },
      Timings: this.getTimings()
    })
  }

  private async handleMatchedUserEvent (clientMessage: TClientMessage): Promise<void> {
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
        age: ageClassNames[biometryInfo.find(item => item.Tag === 'children')!.ClassName!] ?? 'unknown',
        gender: genderClassNames[biometryInfo.find(item => item.Tag === 'gender')!.ClassName!] ?? 'unknown',
      }
    })
  }

  private async handleMessage (message: RawData, isBinary: boolean): Promise<void> {
    const simplifiedMessage = Array.isArray(message) ? Buffer.concat(message) : Buffer.from(message as ArrayBuffer)
    await (isBinary ? this.handleBinaryMessage(simplifiedMessage) : this.handleTextMessage(simplifiedMessage.toString('utf8')))
  }

  private handleServerCancel (): void {
    this.inputHandler.closeSession()
    this.closeDialog(CloseDialogReason.SERVER_CANCEL)
    this.voiceInputHandler.handleVoiceInputCancelEvent({})
    this.sendAsrResult('', true).catch(error => {
      this.logger.warn('Failed to send AsrResult in handleServerCancel: ', error)
      this.closeConnection()
    })
  }

  private async handleStreamControl (clientMessage: TClientMessage): Promise<void> {
    const streamId = clientMessage.StreamControl!.StreamId!
    if (!longEquals(streamId, this.voiceInputStreamId)) {
      return
    }

    const closeReason = clientMessage.StreamControl!.Close?.Reason
    if (!closeReason) {
      return
    }

    switch (closeReason) {
      case proto.NAlice.NAliceApi.TStreamControl.TActionClose.EReason.CANCEL: {
        this.handleClientCancel()
        break
      }
      default: {
        this.voiceInputHandler.handleVoiceInputFinishEvent({})
        break
      }
    }
  }

  private async handleTextInputEvent (clientMessage: TClientMessage): Promise<void> {
    let textInput: null | TextInput = null

    let dialogId = clientMessage.Event?.TextInput?.Header?.DialogId

    const event = clientMessage.Event!.TextInput!.Request!.Event!

    if (event.Type === proto.NAlice.EEventType.server_action && event.Payload) {
      const payload = decodeProtobufStruct(event.Payload)
      if (getValue(payload, 'any', 'typed_semantic_frame', 'music_play_semantic_frame')) {
        textInput = {
          data: {
            kind: 'playButtonPress'
          },
          metadata: {}
        }
      } else if (getValue(payload, 'string', 'typed_semantic_frame', 'external_event_semantic_frame', 'event')) {
        textInput = {
          data: {
            eventText: getValue(payload, 'string', 'typed_semantic_frame', 'external_event_semantic_frame', 'event')!,
            kind: 'event'
          },
          metadata: {}
        }
      } else if (getValue(payload, 'string', 'typed_semantic_frame', 'tts_semantic_frame', 'text')) {
        textInput = {
          data: {
            kind: 'tts',
            text: getValue(payload, 'string', 'typed_semantic_frame', 'tts_semantic_frame', 'text')!
          },
          metadata: {}
        }
      } else if (getValue(payload, 'any', 'typed_semantic_frame', 'continue_session_stage1_semantic_frame')) {
        await this.sendPush([{
          payload: continueSessionStage2SemanticFrame(this.dialogId),
          type: 'mmSemanticFrame'
        }], [])
      } else if (getValue(payload, 'any', 'typed_semantic_frame', 'continue_session_stage2_semantic_frame')) {
        dialogId = getValue(payload, 'string', 'typed_semantic_frame', 'continue_session_stage2_semantic_frame', 'dialog_id')
        textInput = {
          data: {
            kind: 'continue'
          },
          metadata: {}
        }
      } else {
        this.logger.info(`Received unknown TextInput server_action: ${JSON.stringify(payload)} ${JSON.stringify(event)}`)
      }
    } else if (event.Type === proto.NAlice.EEventType.server_action && event.Name === '@@mm_semantic_frame' && event.PayloadRaw) {
      const rawPayload = Buffer.from(event.PayloadRaw)
      const decoded = TSemanticFrameRequestDataClass.decode(rawPayload)
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

    if (!dialogId || dialogId !== this.dialogId) {
      this.closeDialog(CloseDialogReason.INTERRUPTION)
      this.openDialog()
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
      await this.sendInputResult(inputResult, clientMessage.Event!.TextInput!.Header!.RequestId!,
        clientMessage.Event!.Header!.MessageId!, clientMessage.Event!.TextInput!.Header!.SequenceNumber!)
    } catch (error) {
      this.logger.warn('Failed to send input result: ', error)
      this.closeConnection()
    }
  }

  private async handleTextMessage (_message: string): Promise<void> {
    // ignore for now
  }

  private async handleVoiceInputEvent (clientMessage: TClientMessage): Promise<void> {
    const voiceInputHeader = clientMessage.Event!.VoiceInput!.Header!
    const eventHeader = clientMessage.Event!.Header!
    if (!voiceInputHeader.DialogId || voiceInputHeader.DialogId !== this.dialogId) {
      this.inputHandler.closeSession()
      this.closeDialog(CloseDialogReason.INTERRUPTION)
      this.openDialog()
    }
    this.openSession()
    this.voiceInputStreamId = eventHeader.StreamId!
    this.voiceInputReferenceMessageId = eventHeader.MessageId!
    this.voiceInputReferenceRequestId = voiceInputHeader.RequestId!
    this.voiceInputReferenceSequenceNumber = voiceInputHeader.SequenceNumber!
    this.voiceInputHandler.handleVoiceInputEvent({})
  }

  private openDialog (): void {
    if (this.dialogId) {
      this.closeDialog(CloseDialogReason.INTERRUPTION)
    }
    this.dialogId = randomUUID()
    this.dialogSpan = startInactiveSpan({
      name: 'dialog',
      parentSpan: null,
    })

    this.logger.info(`Dialog ${this.dialogId} started`)
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
          ForceServerRequest: false,
          Header: {
            DialogId: this.dialogId,
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
            IsStreaming: false,
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
        if (result.text !== '') {
          const ttsResult = await this.parameters.tts.synthesize({
            text: result.text
          })
          audioData = ttsResult.voiceOutput
        }
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

  private async sendPush (directives: AliceDirective[],
    rawDirectives?: proto.NAlice.NAliceApi.ITDirective[]): Promise<void> {
    await this.sendServerMessage({
      Event: {
        Header: {
          Ack: Date.now(),
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

  private async sendServerMessage (serverMessage: TServerMessage): Promise<void> {
    const encoded = TServerMessageClass.encode(serverMessage).finish()
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

      if (inputResult.dialogFinished) {
        this.closeDialog(CloseDialogReason.SERVER_FINISHED)
        this.inputHandler.closeSession()
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

function longEquals (a: Long | number, b: Long | number): boolean {
  if (typeof a === 'number' && typeof b === 'number') {
    return a === b
  }
  if (typeof a === 'number' && typeof b !== 'number') {
    return b.equals(a)
  }
  if (typeof a !== 'number' && typeof b !== 'number') {
    return b.equals(a)
  }
  if (typeof a !== 'number' && typeof b === 'number') {
    return a.equals(b)
  }
  throw new Error('what do you want')
}
