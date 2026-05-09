import { Server } from 'node:http'
import { Server as WSServer } from 'ws'

import { getLogger } from '../logger'
import { UniProxyConnection, UniProxyConnectionParameters } from './uniproxy/uniproxy-connection'

const logger = getLogger()

// export interface Backends {
//   audioMetadata: AudioMetadataBackend;
//   processor: ProcessorBackend;
//   stt: STTBackend;
//   tts: TTSBackend;
// }

// const TClientMessageProto = loadProto(
//   'alice/protos/api/alicekit/protocol/client/client_message.proto')
//   .lookupType('NAlice.NAliceApi.TClientMessage')
// const TServerMessageProto = loadProto(
//   'alice/protos/api/alicekit/protocol/server/server_message.proto')
//   .lookupType('NAlice.NAliceApi.TServerMessage')
// const TSemanticFrameRequestData = loadProto(
//   'alice/protos/api/alicekit/scenarios/frames/frame.proto')
//   .lookupType('NAlice.NAliceApi.TSemanticFrameRequestData')
// const TStructSerialization = loadProto(
//   'alice/protos/api/typed_callbacks/typed_callback_request.proto')
//   .lookupType('NAlice.TTypedCallbackRequest.TStructSerialization')
// const TEnvironmentState = loadProto(
//   'alice/protos/api/alicekit/common/environment_state/environment_state.proto')
//   .lookupType('NAlice.NAliceApi.TEnvironmentState')
// const TPhoneCallsCapability = loadProto(
//   'alice/protos/endpoint/capabilities/phone_calls/capability.proto')
//   .lookupType('NAlice.TPhoneCallsCapability')

// interface ClientEventData {
//   messageId: string;
//   requestId: string;
//   sequenceNumber: any;
// }

// interface ClientProcessingSessionCallbacks {
//   onCancelled: () => void;
//   onFinished: () => void;
//   onFullyTranscribed: (text: string, willProcess: boolean) => void;
//   onPartiallyProcessed: (text: null | string, requireMoreInput: boolean, sessionId: string,
//     directives: AliceDirective[], isFinished: boolean) => void;
//   onStarted: () => void;
//   onSynthesized: (format: AudioFormat, voiceOutput: Buffer) => void;
//   onTranscribed: (text: string) => void;
// }

interface UniProxyRouter {
  connections: Map<string, Set<UniProxyConnection>>
}

// interface VoiceInputStartParameters {
//   format: AudioFormat;
// }

// class InputProcessingSession {
//   private audioDataBuffer: Buffer[] = []

//   private audioMetadataSession: AudioMetadataBackendSession | null = null
//   private cancelled: boolean = false
//   private finalTranscribedChunk: null | STTChunkTranscribeResult = null
//   private finished: boolean = false
//   private logger = getLogger<InputProcessingSession>()
//   private preparePromise: null | Promise<void> = null
//   private stationMetadata: object = {}
//   private sttSession: null | STTBackendSession = null

//   constructor (private readonly backends: Backends,
//     private readonly pooler: ProcessorSessionPooler,
//     private readonly callbacks: ClientProcessingSessionCallbacks,
//     private readonly processingBackendSessionId: string,
//     private readonly continueExistingSession: boolean) {}

//   cancel (): void {
//     if (this.cancelled || this.finished) {
//       return
//     }
//     this.cancelled = true
//     this.pooler.close(this.processingBackendSessionId)
//   }

//   finish (): void {
//     if (this.cancelled || this.finished) {
//       return
//     }
//     this.finished = true
//     this.callbacks.onFinished()
//   }

//   handleContinue (): void {
//     this.process(null, {}, false, [])
//   }

//   handleExternalEvent (text: string): void {
//     this.process(text, {}, true, [])
//   }

//   handleMatchedUserData (matchedUserData: object): void {
//     this.stationMetadata = {
//       ...this.stationMetadata,
//       ...matchedUserData
//     }
//   }

//   handleRawSpeak (text: string, externalDirectives: AliceDirective[]): void {
//     this.callbacks.onPartiallyProcessed(text, false,
//       this.processingBackendSessionId, externalDirectives, true)

//     this.backends.tts.synthesize({
//       text
//     })
//       .then(result => {
//         if (this.cancelled) {
//           return
//         }

//         this.callbacks.onSynthesized(result.format, result.voiceOutput)

//         this.finish()
//       })
//       .catch(error => {
//         this.logger.error(`Failed to synthesize: ${error}`)
//       })
//   }

//   handleVoiceInputAudioData (audioData: Buffer): void {
//     if (this.cancelled || this.finished) {
//       return
//     }

//     if (this.sttSession && this.audioMetadataSession) {
//       this.sttSession.transcribeChunk(audioData)
//       this.audioMetadataSession.processChunk(audioData)
//     } else {
//       this.audioDataBuffer.push(audioData)
//     }
//   }

//   handleVoiceInputEnd (): void {
//     if (this.cancelled || this.finished) {
//       return
//     }
//     let audioMetadataPromise: Promise<object> = Promise.resolve({})
//     if (this.sttSession && this.audioMetadataSession) {
//       this.sttSession.close()
//       this.sttSession = null
//       this.audioDataBuffer = []
//       audioMetadataPromise = this.audioMetadataSession.finish()
//     }
//     const requestText = this.finalTranscribedChunk?.text ?? ''
//     const willProcess = requestText.length > 0
//     this.callbacks.onFullyTranscribed(requestText, willProcess)
//     if (!willProcess) {
//       audioMetadataPromise.catch(error => this.logger.warn(`Failed to finish audio metadata session: ${error}`))
//       this.finish()
//       return
//     }
//     audioMetadataPromise
//       .then(audioMetadata => {
//         this.process(requestText, audioMetadata, false, [])
//       })
//       .catch(error => this.logger.error(`Failed to finish audio metadata session: ${error}`))
//   }

//   startVoiceInput (parameters: VoiceInputStartParameters): void {
//     (async () => {
//       this.preparePromise = (async () => {
//         if (!this.continueExistingSession) {
//           await this.pooler.prepare(this.processingBackendSessionId)
//         }
//       })()
//       const [sttSession, audioMetadataSession] = await Promise.all([
//         this.backends.stt.startTranscribing({
//           format: parameters.format
//         }),
//         this.backends.audioMetadata.startCapturing({
//           format: parameters.format
//         })
//       ])
//       sttSession.setCallback(result => {
//         this.onSttTranscribed(result)
//       })
//       for (const audioData of this.audioDataBuffer) {
//         sttSession.transcribeChunk(audioData)
//         audioMetadataSession.processChunk(audioData)
//       }
//       this.sttSession = sttSession
//       this.audioMetadataSession = audioMetadataSession
//       this.audioDataBuffer = []
//     })().catch(error => {
//       this.logger.error(`Failed to start transcribing/capturing: ${error}`)
//     })
//     this.callbacks.onStarted()
//   }

//   private onSttTranscribed (result: STTChunkTranscribeResult): void {
//     if (this.cancelled || this.finished) {
//       return
//     }
//     if (result.endOfUtt) {
//       this.finalTranscribedChunk = result
//     }
//     this.callbacks.onTranscribed(result.text)
//     if (result.endOfUtt) {
//       this.handleVoiceInputEnd()
//     }
//   }

//   private process (text: null | string, metadata: object, isExternalEvent: boolean, externalDirectives: AliceDirective[]): void {
//     const postProcess = async () => {
//       if (this.preparePromise) {
//         await this.preparePromise
//       } else if (!this.continueExistingSession) {
//         await this.pooler.prepare(this.processingBackendSessionId)
//       }

//       if (text !== null) {
//         await this.pooler.process(this.processingBackendSessionId, {
//           isExternalEvent,
//           metadata: {
//             ...this.stationMetadata,
//             ...metadata
//           },
//           text
//         })
//       }

//       const response = await this.pooler.waitForPartialResponse(this.processingBackendSessionId)
//       if (!response) {
//         this.callbacks.onPartiallyProcessed(null, false, this.processingBackendSessionId, externalDirectives, false)
//         this.finish()
//         return
//       }

//       logger.info(JSON.stringify(response))

//       this.callbacks.onPartiallyProcessed(response.text, response.finished ? response.requireMoreInput : false, this.processingBackendSessionId,
//         response.directives, response.finished)

//       const synthesized = await this.backends.tts.synthesize({
//         text: response.text
//       })

//       if (this.cancelled) {
//         return
//       }

//       this.callbacks.onSynthesized(synthesized.format, synthesized.voiceOutput)

//       this.finish()

//       if (response.finished) {
//         this.pooler.close(this.processingBackendSessionId)
//       }
//     }

//     postProcess().catch(error => {
//       this.logger.error(`Failed to process: ${error}`)
//       console.error(error)
//     })
//   }
// }

// class ProcessorSessionPooler {
//   private readonly logger = getLogger<ProcessorSessionPooler>()

//   private readonly pool: Map<string, ProcessorSession> = new Map()

//   constructor (private readonly processor: ProcessorBackend) {}

//   close (sessionId: string): void {
//     this.logger.info(`Closing session ${sessionId}`)
//     this.pool.get(sessionId)?.close()
//     this.pool.delete(sessionId)
//   }

//   async prepare (sessionId: string): Promise<void> {
//     this.logger.info(`Requesting session ${sessionId}`)
//     if (this.pool.has(sessionId)) {
//       return
//     }
//     this.logger.info(`Preparing session ${sessionId}`)
//     const webSocket = await this.processor.openSession()
//     await webSocket.prepare({
//       sessionId
//     })
//     this.pool.set(sessionId, webSocket)
//   }

//   async process (sessionId: string, request: ProcessorRequest): Promise<void> {
//     this.logger.info(`Processing to session ${sessionId}`)
//     const session = this.pool.get(sessionId)
//     if (!session) {
//       throw new Error('session not found')
//     }
//     await session.process(request)
//   }

//   async waitForPartialResponse (sessionId: string): Promise<null | ProcessorPartialResponse> {
//     this.logger.info(`Waiting for session ${sessionId}`)
//     const session = this.pool.get(sessionId)
//     if (!session) {
//       throw new Error('session not found')
//     }

//     const [waitForPartialResponsePromise, cancel] = session.waitForPartialResponse()

//     const result = await Promise.race([waitForPartialResponsePromise, new Promise(resolve => setTimeout(resolve, 5000, null))])
//     if (result === null) {
//       cancel()
//       return null
//     }
//     return result as ProcessorPartialResponse
//   }
// }




// export class UniProxyConnection {
//   private activeProcessingSessionId: null | string = null

//   private currentOutputAudioStreamId: number = 1024
//   private currentProcessingSession: InputProcessingSession | null = null

//   private currentProcessingSessionInputStreamId: null | number = null

//   private readonly logger = getLogger<UniProxyConnection>()

//   private readonly pooler: ProcessorSessionPooler

//   private readonly sendLock = new Sema(1)

//   constructor (private readonly webSocket: WebSocket, private readonly backends: Backends) {
//     this.pooler = new ProcessorSessionPooler(backends.processor)
//     this.webSocket.on('message', (message, isBinary) => {
//       this.handleMessage(message, isBinary).catch(error => {
//         this.logger.error(`Failed to handle message: ${error}`)
//       })
//     })
//   }

//   async push (eventText: string): Promise<void> {
//     await this.sendServerMessage({
//       Event: {
//         Header: {
//           Ack: Date.now().toFixed(0),
//           MessageId: randomUUID()
//         },
//         Push: {
//           AnalyticsMetaInfo: {},
//           DeduplicationPushId: randomUUID(),
//           Directives: [
//             {
//               Name: '@@mm_semantic_frame',
//               Payload: {
//                 fields: {
//                   typed_semantic_frame: {
//                     structValue: {
//                       fields: {
//                         external_event_semantic_frame: {
//                           structValue: {
//                             fields: {
//                               event: {
//                                 stringValue: eventText
//                               }
//                             }
//                           }
//                         }
//                       }
//                     }
//                   }
//                 }
//               },
//               Type: 'server_action'
//             }
//           ],
//           PushIds: [
//             randomUUID()
//           ]
//         }
//       }
//     })
//   }

//   async pushRaw (eventText: string): Promise<void> {
//     await this.sendServerMessage({
//       Event: {
//         Header: {
//           Ack: Date.now().toFixed(0),
//           MessageId: randomUUID()
//         },
//         Push: {
//           AnalyticsMetaInfo: {},
//           DeduplicationPushId: randomUUID(),
//           Directives: [
//             {
//               Name: '@@mm_semantic_frame',
//               Payload: {
//                 fields: {
//                   typed_semantic_frame: {
//                     structValue: {
//                       fields: {
//                         raw_external_event_semantic_frame: {
//                           structValue: {
//                             fields: {
//                               event: {
//                                 stringValue: eventText
//                               }
//                             }
//                           }
//                         }
//                       }
//                     }
//                   }
//                 }
//               },
//               Type: 'server_action'
//             }
//           ],
//           PushIds: [
//             randomUUID()
//           ]
//         }
//       }
//     })
//   }

//   async pushRawDirective (directive: unknown): Promise<void> {
//     await this.sendServerMessage({
//       Event: {
//         Header: {
//           Ack: Date.now().toFixed(0),
//           MessageId: randomUUID()
//         },
//         Push: {
//           AnalyticsMetaInfo: {},
//           DeduplicationPushId: randomUUID(),
//           Directives: [
//             directive
//           ],
//           PushIds: [
//             randomUUID()
//           ]
//         }
//       }
//     })
//   }

//   async rawDirectivePush (eventText: string): Promise<void> {
//     await this.sendServerMessage({
//       Event: {
//         Header: {
//           Ack: Date.now().toFixed(0),
//           MessageId: randomUUID()
//         },
//         Push: {
//           AnalyticsMetaInfo: {},
//           DeduplicationPushId: randomUUID(),
//           Directives: [
//             {
//               Name: '@@mm_semantic_frame',
//               Payload: {
//                 fields: {
//                   typed_semantic_frame: {
//                     structValue: {
//                       fields: {
//                         raw_external_event_semantic_frame: {
//                           structValue: {
//                             fields: {
//                               event: {
//                                 stringValue: eventText
//                               }
//                             }
//                           }
//                         }
//                       }
//                     }
//                   }
//                 }
//               },
//               Type: 'server_action'
//             }
//           ],
//           PushIds: [
//             randomUUID()
//           ]
//         }
//       }
//     })
//   }

//   private getTimings (): any {
//     return {
//       SendingTime: {
//         seconds: Math.floor(Date.now() / 1000)
//       }
//     }
//   }

//   private async handleAudioMessage (streamId: number, audioData: Buffer): Promise<void> {
//     if (!this.currentProcessingSession) {
//       return
//     }
//     if (streamId === this.currentProcessingSessionInputStreamId) {
//       this.currentProcessingSession.handleVoiceInputAudioData(audioData)
//     }
//   }

//   private async handleBinaryMessage (message: Buffer): Promise<void> {
//     if (message.length < 4) {
//       throw new Error(`Wrong message length? ${message.length}`)
//     }
//     if (message.subarray(0, 4).equals(new Uint8Array([0x41, 0x41, 0x50, 0x49]))) {
//       const rawClientMessage = message.subarray(4)
//       const clientMessage = TClientMessageProto.decode(rawClientMessage).toJSON()
//       await this.handleClientMessage(clientMessage)
//     } else {
//       const streamId = new DataView(message.buffer, message.byteOffset, message.length).getUint32(0, false)
//       const audioData = message.subarray(4)
//       await this.handleAudioMessage(streamId, audioData)
//     }
//   }

//   private async handleClientMessage (clientMessage: any): Promise<void> {
//     if (clientMessage.StreamControl) {
//       await this.handleStreamControl(clientMessage)
//     }
//     if (clientMessage.Event) {
//       this.logger.debug(`Received event: ${JSON.stringify(Object.keys(clientMessage.Event))}`)
//       if (clientMessage.Event.TextInput) {
//         await this.handleTextInputEvent(clientMessage)
//       }
//       if (clientMessage.Event.VoiceInput) {
//         await this.handleVoiceInputEvent(clientMessage)
//       }
//       if (clientMessage.Event.LogSpotter) {
//         await this.handleLogSpotterEvent(clientMessage)
//       }
//       if (clientMessage.Event.MatchedUser) {
//         await this.handleMatchedUserEvent(clientMessage)
//       }
//     }
//   }

//   private async handleLogSpotterEvent (clientMessage: any): Promise<void> {
//     await this.sendServerMessage({
//       Event: {
//         Header: {
//           MessageId: randomUUID(),
//           RefMessageId: clientMessage.Event.Header.MessageId
//         },
//         LogAck: {}
//       },
//       Timings: this.getTimings()
//     })
//   }

//   private async handleMatchedUserEvent (clientMessage: any): Promise<void> {
//     const session = this.currentProcessingSession
//     if (!session) {
//       return
//     }

//     const biometryInfo = clientMessage?.Event?.MatchedUser?.Request?.Event?.BiometryClassification?.Simple
//     if (!biometryInfo) {
//       return
//     }

//     const ageClassNames: Record<string, string> = {
//       adult: 'adult',
//       child: 'child'
//     }

//     const genderClassNames: Record<string, string> = {
//       female: 'female',
//       male: 'male'
//     }

//     session.handleMatchedUserData({
//       age: ageClassNames[biometryInfo.find((item: any) => item.Tag === 'children')?.ClassName] ?? 'unknown',
//       gender: genderClassNames[biometryInfo.find((item: any) => item.Tag === 'gender')?.ClassName] ?? 'unknown',
//     })
//   }

//   private async handleMessage (message: RawData, isBinary: boolean): Promise<void> {
//     const simplifiedMessage = Array.isArray(message) ? Buffer.concat(message) : Buffer.from(message as ArrayBuffer)
//     await (isBinary ? this.handleBinaryMessage(simplifiedMessage) : this.handleTextMessage(simplifiedMessage.toString('utf8')))
//   }

//   private async handleStreamControl (clientMessage: any): Promise<void> {
//     if (!this.currentProcessingSession) {
//       return
//     }
//     const streamId = Number.parseInt(clientMessage.StreamControl.StreamId)
//     if (this.currentProcessingSessionInputStreamId != streamId) {
//       return
//     }

//     const closeReason = clientMessage.StreamControl.Close?.Reason
//     if (!closeReason) {
//       return
//     }

//     switch (closeReason) {
//       case 'CANCEL': {
//         this.currentProcessingSession.cancel()
//         break
//       }
//       default: {
//         this.currentProcessingSession.handleVoiceInputEnd()
//         break
//       }
//     }
//   }

//   private async handleTextInputEvent (clientMessage: any): Promise<void> {
//     const event = clientMessage.Event.TextInput.Request.Event

//     if (event.Type === 'server_action' && event.Payload) {
//       const payload = decodeProtobufStruct(event.Payload)
//       if (payload?.typed_semantic_frame?.music_play_semantic_frame) {
//         this.recreateClientProcessingSession({
//           messageId: clientMessage.Event.Header.MessageId,
//           requestId: clientMessage.Event.TextInput.Header.RequestId,
//           sequenceNumber: clientMessage.Event.TextInput.Header.SequenceNumber
//         })
//         this.currentProcessingSession?.handleExternalEvent('play button was pressed on speaker')
//       } else if (payload?.typed_semantic_frame?.external_event_semantic_frame) {
//         this.recreateClientProcessingSession({
//           messageId: clientMessage.Event.Header.MessageId,
//           requestId: clientMessage.Event.TextInput.Header.RequestId,
//           sequenceNumber: clientMessage.Event.TextInput.Header.SequenceNumber
//         })
//         this.currentProcessingSession?.handleExternalEvent(payload.typed_semantic_frame.external_event_semantic_frame.event)
//       } else if (payload?.typed_semantic_frame?.raw_external_event_semantic_frame) {
//         this.recreateClientProcessingSession({
//           messageId: clientMessage.Event.Header.MessageId,
//           requestId: clientMessage.Event.TextInput.Header.RequestId,
//           sequenceNumber: clientMessage.Event.TextInput.Header.SequenceNumber
//         })
//         this.currentProcessingSession?.handleRawSpeak(payload.typed_semantic_frame.raw_external_event_semantic_frame.event, [])
//       } else if (payload?.typed_semantic_frame?.continue_session_stage1_event_semantic_frame) {
//         this.pushRawDirective({
//           Name: '@@mm_semantic_frame',
//           Payload: {
//             fields: {
//               typed_semantic_frame: {
//                 structValue: {
//                   fields: {
//                     continue_session_stage2_event_semantic_frame: {
//                       structValue: {
//                         fields: {
//                           session_id: {
//                             stringValue: payload.typed_semantic_frame.continue_session_stage1_event_semantic_frame.session_id
//                           }
//                         }
//                       }
//                     }
//                   }
//                 }
//               }
//             }
//           },
//           Type: 'server_action'
//         })
//       } else if (payload?.typed_semantic_frame?.continue_session_stage2_event_semantic_frame) {
//         this.recreateClientProcessingSession({
//           messageId: clientMessage.Event.Header.MessageId,
//           requestId: clientMessage.Event.TextInput.Header.RequestId,
//           sequenceNumber: clientMessage.Event.TextInput.Header.SequenceNumber
//         }, payload.typed_semantic_frame.continue_session_stage2_event_semantic_frame.session_id)
//         this.currentProcessingSession?.handleContinue()
//       } else {
//         if (payload?.typed_callback_serialized) {
//           try {
//             const innerStruct = TStructSerialization.decode(Buffer.from(payload.typed_callback_serialized, 'base64')).toJSON()
//             switch (innerStruct.TypedCallbackName) {
//               case 'type.googleapis.com/NAlice.NScenarios.NCalls.TIncomingCallReceivedTypedCallback': {
//                 // now let's read environment!
//                 const environmentState = TEnvironmentState.decode(Buffer.from(clientMessage.Event.TextInput.Request.EnvironmentStateRaw, 'base64')).toJSON()
//                 const phoneCapabilityRaw = environmentState.Endpoints[0].Capabilities.find((item: any) => 
//                     item.type_url === 'type.googleapis.com/NAlice.TPhoneCallsCapability')?.value
//                 if (phoneCapabilityRaw) {
//                   const phoneCapability = TPhoneCallsCapability.decode(Buffer.from(phoneCapabilityRaw, 'base64')).toJSON()
//                   this.recreateClientProcessingSession({
//                     messageId: clientMessage.Event.Header.MessageId,
//                     requestId: clientMessage.Event.TextInput.Header.RequestId,
//                     sequenceNumber: clientMessage.Event.TextInput.Header.SequenceNumber
//                   })
//                   this.currentProcessingSession?.handleRawSpeak('кто-то звонит!', [
//                     {
//                       callId: phoneCapability.State.IncomingCall.Id,
//                       type: 'processIncomingCall'
//                     }
//                   ])
//                 }
//                 break
//               }
//               default: {
//                 this.logger.info(`Received unknown TextInput server_action with serialized typed callback: ${JSON.stringify(innerStruct)} ${JSON.stringify(payload)} ${JSON.stringify(event)}`)
//                 this.currentProcessingSession?.finish()
//               }
//             }
//           } catch (error) {
//             this.logger.info(`Received invalid TextInput server_action with serialized typed callback: ${JSON.stringify(payload)} ${JSON.stringify(event)}: ${error}`)
//           }
//         } else {
//           this.logger.info(`Received unknown TextInput server_action: ${JSON.stringify(payload)} ${JSON.stringify(event)}`)
//           this.currentProcessingSession?.finish()
//         }
//       }
//     } else if (event.Type === 'server_action' && event.Name === '@@mm_semantic_frame' && event.PayloadRaw) {
//       const rawPayload = Buffer.from(event.PayloadRaw, 'base64')
//       const decoded = TSemanticFrameRequestData.decode(rawPayload).toJSON()
//       if (decoded?.TypedSemanticFrame?.MusicPlaySemanticFrame) {
//         this.recreateClientProcessingSession({
//           messageId: clientMessage.Event.Header.MessageId,
//           requestId: clientMessage.Event.TextInput.Header.RequestId,
//           sequenceNumber: clientMessage.Event.TextInput.Header.SequenceNumber
//         })
//         this.currentProcessingSession?.handleExternalEvent('play button was pressed on speaker')
//       } else {
//         this.logger.info(`Received unknown TextInput semantic frame: ${JSON.stringify(decoded)} ${JSON.stringify(event)}`)
//         this.currentProcessingSession?.finish()
//       }
//     } else {
//       this.logger.info(`Received unknown TextInput: ${JSON.stringify(event)}`)
//       this.currentProcessingSession?.finish()
//     }
//   }

//   private async handleTextMessage (message: string): Promise<void> {
//     // ignore for now
//   }

//   private async handleVoiceInputEvent (clientMessage: any): Promise<void> {
//     this.recreateClientProcessingSession({
//       messageId: clientMessage.Event.Header.MessageId,
//       requestId: clientMessage.Event.VoiceInput.Header.RequestId,
//       sequenceNumber: clientMessage.Event.VoiceInput.Header.SequenceNumber
//     })

//     this.currentProcessingSessionInputStreamId = Number.parseInt(clientMessage.Event.Header.StreamId)
//     this.currentProcessingSession?.startVoiceInput({
//       format: clientMessage.Event.VoiceInput.Format
//     })
//   }

//   private recreateClientProcessingSession (event: ClientEventData, sessionId?: string): void {
//     if (this.currentProcessingSession) {
//       this.currentProcessingSession.cancel()
//       this.currentProcessingSession = null
//     }

//     this.logger.info(`Recreating session for ${sessionId}`)

//     this.currentProcessingSession = new InputProcessingSession(this.backends, this.pooler, {
//       onCancelled: () => {
//         this.logger.info('Cancelled')
//         this.currentProcessingSession = null
//         this.currentProcessingSessionInputStreamId = null
//         this.activeProcessingSessionId = null
//       },
//       onFinished: () => {
//         this.logger.info('Finished')
//         this.currentProcessingSession = null
//       },
//       onFullyTranscribed: (text, willProcess) => {
//         this.logger.info(`Fully transcribed: '${text}', ${willProcess}`)

//         this.currentProcessingSessionInputStreamId = null
//         this.sendServerMessage({
//           Event: {
//             AsrResult: {
//               EndOfUtt: true,
//               MessagesCount: 0,
//               Recognition: willProcess
//                 ? [{
//                     Confidence: 0.999,
//                     Normalized: 'test',
//                     ParentModel: 'speechkit-emu',
//                     Words: [{
//                       Confidence: 0.999,
//                       Value: 'test'
//                     }]
//                   }]
//                 : [],
//               ResponseCode: 0
//             },
//             Header: {
//               MessageId: randomUUID(),
//               RefMessageId: event.messageId
//             }
//           },
//           Timings: this.getTimings()
//         })
//       },
//       onPartiallyProcessed: (text, requireMoreInput, sessionId, directives, isFinished) => {
//         this.logger.info(`Partially processed: '${text}', ${requireMoreInput}, ${sessionId}, ${isFinished}`)

//         this.activeProcessingSessionId = requireMoreInput ? sessionId : null

//         this.sendServerMessage({
//           Event: {
//             AliceResponse: {
//               Header: {
//                 DialogId: randomUUID(),
//                 RequestId: event.requestId,
//                 ResponseId: randomUUID(),
//                 SequenceNumber: event.sequenceNumber
//               },
//               Response: {
//                 Alice2EffectiveSettings: {
//                   EffectiveSettings: {
//                     Mode: 2,
//                     Preset: 'test-preset',
//                   },
//                   TrialState: {
//                     LeftCount: 9999,
//                     Limit: 9999,
//                     TimeLimitSec: 9999
//                   }
//                 },
//                 Cards: [],
//                 Directives: [
//                   ...directives.map(directive =>
//                     convertToAliceResponseDirective(directive)),
//                   ...(text === null
//                     ? []
//                     : [{
//                         AnalyticsType: 'tts_play_placeholder',
//                         IsLedSilent: true,
//                         Name: 'tts_play_placeholder',
//                         Payload: {
//                           fields: {
//                             channel: {
//                               stringValue: 'Dialog'
//                             }
//                           }
//                         },
//                         Type: 'client_action',
//                         ...(isFinished
//                           ? {}
//                           : {
//                               OnFinish: {
//                                 TypedCallbackRequest: {
//                                   fields: {
//                                     typed_semantic_frame: {
//                                       structValue: {
//                                         fields: {
//                                           continue_session_stage1_event_semantic_frame: {
//                                             structValue: {
//                                               fields: {
//                                                 session_id: {
//                                                   stringValue: sessionId
//                                                 }
//                                               }
//                                             }
//                                           }
//                                         }
//                                       }
//                                     }
//                                   }
//                                 }
//                               }
//                             })
//                       }]),
//                   ...(isFinished || (!isFinished && text !== null)
//                     ? []
//                     : [{
//                         Name: '@@mm_semantic_frame',
//                         Payload: {
//                           fields: {
//                             typed_semantic_frame: {
//                               structValue: {
//                                 fields: {
//                                   continue_session_stage1_event_semantic_frame: {
//                                     structValue: {
//                                       fields: {
//                                         session_id: {
//                                           stringValue: sessionId
//                                         }
//                                       }
//                                     }
//                                   }
//                                 }
//                               }
//                             }
//                           }
//                         },
//                         Type: 'server_action'
//                       }])
//                 ],
//                 Error: {},
//                 ForceServerRequest: false,
//                 IsStreaming: false,
//                 MegamindAnalyticsInfo: {
//                   AnalyticsInfo: [],
//                   ChosenUtterance: 'test',
//                   IoTUserInfo: {},
//                   WinnerScenario: {
//                     Name: 'test-name'
//                   }
//                 },
//                 Suggest: {
//                   Items: []
//                 }
//               },
//               VoiceResponse: {
//                 ...(text === null
//                   ? {}
//                   : {
//                       OutputSpeech: {
//                         Text: text
//                       }
//                     }),
//                 HasVoiceResponse: text !== null,
//                 ShouldListen: requireMoreInput
//               }
//             },
//             Header: {
//               MessageId: randomUUID(),
//               RefMessageId: event.messageId
//             }
//           },
//           Timings: this.getTimings()
//         })
//       },
//       onStarted: () => {
//         this.logger.info('Started')

//         this.sendServerMessage({
//           Event: {
//             Header: {
//               MessageId: randomUUID(),
//               RefMessageId: event.messageId
//             },
//             InputStartAck: {
//               RequestStartTime: Date.now() * 1000
//             }
//           },
//           Timings: this.getTimings()
//         })
//       },
//       onSynthesized: (format, voiceOutput) => {
//         this.logger.info(`Synthesized: ${format}, ${voiceOutput.length}`)

//         this.currentOutputAudioStreamId++
//         this.sendServerMessage({
//           Event: {
//             Header: {
//               MessageId: randomUUID(),
//               RefMessageId: event.messageId,
//               StreamId: this.currentOutputAudioStreamId
//             },
//             TtsSpeak: {
//               Format: format,
//               LazyTtsStreaming: false,
//             }
//           },
//           Timings: this.getTimings()
//         })
//         this.sendAudioDataMessage(this.currentOutputAudioStreamId, voiceOutput)
//         this.sendServerMessage({
//           StreamControl: {
//             Close: {},
//             MessageId: randomUUID(),
//             StreamId: this.currentOutputAudioStreamId
//           },
//           Timings: this.getTimings()
//         })
//       },
//       onTranscribed: text => {
//         this.logger.info(`Transcribed: '${text}'`)

//         this.sendServerMessage({
//           Event: {
//             AsrResult: {
//               EndOfUtt: false,
//               MessagesCount: 1,
//               Recognition: [{
//                 Confidence: 0.999,
//                 Normalized: text,
//                 ParentModel: 'speechkit-emu',
//                 Words: text.split(' ').map(word => ({
//                   Confidence: 0.999,
//                   Value: word
//                 }))
//               }],
//               ResponseCode: 0
//             },
//             Header: {
//               MessageId: randomUUID(),
//               RefMessageId: event.messageId
//             }
//           },
//           Timings: this.getTimings()
//         })
//       }
//     }, sessionId ?? this.activeProcessingSessionId ?? randomUUID(), !!sessionId)
//   }

//   private async sendAudioDataMessage (streamId: number, audioData: Buffer): Promise<void> {
//     const streamIdBuffer = new Uint8Array(4)
//     const streamIdDataView = new DataView(streamIdBuffer.buffer, streamIdBuffer.byteOffset, streamIdBuffer.length)
//     streamIdDataView.setUint32(0, streamId, false)
//     const audioDataMessage = Buffer.concat([streamIdBuffer, audioData])
//     await this.sendRawData(audioDataMessage, true)
//   }

//   private async sendRawData (data: Buffer, isBinary: boolean): Promise<void> {
//     await this.sendLock.acquire()
//     try {
//       await new Promise<void>((resolve, reject) => {
//         this.webSocket.send(data, {
//           binary: isBinary
//         }, error => {
//           if (error) {
//             reject(error)
//             return
//           }
//           resolve()
//         })
//       })
//     } finally {
//       this.sendLock.release()
//     }
//   }

//   private async sendServerMessage (serverMessage: any): Promise<void> {
//     // this.logger.debug(`Sending message: ${JSON.stringify(serverMessage, undefined, 4)}`)
//     const encoded = TServerMessageProto.encode(serverMessage).finish()
//     await this.sendRawData(Buffer.concat([Buffer.from('AAPI', 'ascii'), encoded]), true)
//   }
// }

export function registerUniproxyAliceYandexNetRouter (parameters: UniProxyConnectionParameters, server: Server): UniProxyRouter {
  const wsServer = new WSServer({ noServer: true })

  server.on('upgrade', (request, socket, head) => {
    if (request.url === '/uniproxy.alice.yandex.net/uni.ws') {
      wsServer.handleUpgrade(request, socket, head, client => {
        wsServer.emit('connection', client, request)
      })
    }
  })

  const router: UniProxyRouter = {
    connections: new Map()
  }

  wsServer.on('connection', (websocket, request) => {
    logger.debug('Got WebSocket connection')

    const deviceId = String(request.headers['x-uprx-device-id']) ?? 'unknown'

    const connection = new UniProxyConnection(websocket, parameters)
    websocket.on('close', () => {
      router.connections.get(deviceId)!.delete(connection)
      logger.warn('UniProxy WebSocket closed')
    })
    websocket.on('error', e => {
      router.connections.get(deviceId)!.delete(connection)
      logger.warn(`UniProxy WebSocket error: ${e}`)
    })
    if (!router.connections.has(deviceId)) {
      router.connections.set(deviceId, new Set())
    }
    router.connections.get(deviceId)!.add(connection)
  })

  return router
}
