import { Span, startInactiveSpan } from '@sentry/node'
import { ProcessorProcessWebSocketMessage } from '@v3rt3p/types/processor'

import { ProcessorBackend, ProcessorPartialResponse, ProcessorSession } from '../../backend/backend'
import { getLogger } from '../../logger'
import { Notifier } from '../../notifier'
import proto from '../../protos/protos'
import { textToDirectiveMap } from '../alice/base-provider'
import { DirectiveFunctionProvider, mmSemanticFrame, ttsPlayPlaceholderDirective, WrappedDirective } from '../alice/directives'
import { continueSessionStage1SemanticFrame } from '../alice/typed-payloads'

export interface AlarmMetadata {
  currentlyPlaying: boolean
  days: (number | {
    day?: number
    month?: number
    year?: number
  })[],
  id: string
  time: {
    hours?: number
    minutes?: number
    seconds?: number
  },
}

export interface Input {
  metadata: InputMetadata
}

export interface InputHandlerProperties {
  directiveFunctionProvider: DirectiveFunctionProvider
  processor: ProcessorBackend
}

export type InputMetadata = {
  internal: Partial<{
    age: string
    alarms: AlarmMetadata[]
    audioMetadata: object
    deviceId: string
    deviceState: proto.NAlice.NAliceApi.ITDeviceState
    environmentState: proto.NAlice.NAliceApi.ITEnvironmentState
    gender: string
    timers: TimerMetadata[]
  }>,
  readyToUse: Partial<{
    alarms: InputMetadataEntry
    assistantName: InputMetadataEntry
    deviceName: InputMetadataEntry
    inputPersonAge: InputMetadataEntry
    inputPersonGender: InputMetadataEntry
    inputPersonVoiceLabel: InputMetadataEntry
    timers: InputMetadataEntry
  }>
}

export interface InputMetadataEntry {
  description: string
  value: string
}

export interface InputResult {
  dialogFinished: boolean
  directives: WrappedDirective[]
  shouldListen: boolean
  text: null | string
}

export type TextInput = Input & {
  data: TextInputData
}

export type TextInputData = {
  isPayloadRaw: boolean
  kind: 'syncTimezoneLocation',
  location: boolean
  timezone: boolean,
} | {
  kind: 'continue'
} | {
  kind: 'dummy'
} | {
  kind: 'musicFetchNextTrack'
} | {
  kind: 'musicRecoverCommit'
  recoverCommitToken: string
} | {
  kind: 'playButtonPressPlay'
} | {
  kind: 'text'
  text: string
} | {
  kind: 'tts'
  text: string
}

export interface TimerMetadata {
  currentlyPlaying: boolean
  duration: number
  id: string
  remaining: number
}

export type VoiceInput = Input & {
  text: string
}

const MAX_WAIT = 5000

export class InputHandler {
  private readonly logger = getLogger()
  private notifier: Notifier = new Notifier()
  private partialResponses: ProcessorPartialResponse[] = []
  private requestSent: boolean = false
  private session: null | ProcessorSession = null
  private span: Span | undefined

  constructor (private readonly properties: InputHandlerProperties) {}

  closeSession (closePartially?: boolean): void {
    if (this.session) {
      if (!closePartially) {
        this.partialResponses = []
      }
      this.session.close()
      this.session = null
      this.requestSent = false
      this.logger.debug('Session closed')
      this.span?.end()
      this.span = undefined
    } else {
      this.logger.debug('Session already closed')
    }
  }

  async getPartialResponse (): Promise<null | ProcessorPartialResponse> {
    if (this.partialResponses.length > 0) {
      const response = this.partialResponses[0]
      this.partialResponses = this.partialResponses.slice(1)
      return response ?? null
    }

    if (!this.session || !this.requestSent) {
      return null
    }

    await this.notifier.wait(MAX_WAIT)

    if (this.partialResponses.length > 0) {
      const response = this.partialResponses[0]
      this.partialResponses = this.partialResponses.slice(1)
      return response ?? null
    }

    return null
  }

  async openSession (parentSpan?: Span): Promise<void> {
    if (this.session) {
      this.logger.debug('Session already opened')
    } else {
      if (parentSpan) {
        this.span = startInactiveSpan({
          name: 'InputHandler session processing',
          op: 'input-handler-session',
          parentSpan
        })
      }
      this.logger.debug('Opening new session')
      this.partialResponses = []
      this.session = await this.properties.processor.openSession(parentSpan)
      this.session.addListener('close', () => {
        this.closeSession(true)
      })
      this.session.addListener('partialResponse', data => {
        this.logger.debug(`Received partial response: ${JSON.stringify(data)}`)
        this.partialResponses.push(data)
        this.notifier.notifyAll()
      })
      this.session.addListener('partialResponse', () => {})
      await this.session.prepare(
        Object.fromEntries(Object.entries(this.properties.directiveFunctionProvider.getSupportedFunctions())
          .map(entry => ([entry[0], {
            arguments: entry[1].arguments.toJSONSchema(),
            description: entry[1].description
          }])))
      )
      this.logger.debug('Session opened')
    }
  }

  async processTextInput (input: TextInput, parentSpan?: Span, _dialogSpan?: Span): Promise<InputResult> {
    this.logger.debug(`Received TextInput with kind: ${input.data.kind}`)
    switch (input.data.kind) {
      case 'continue': {
        return await this.getPartialResponseResult(parentSpan)
      }
      case 'dummy': {
        return {
          dialogFinished: true,
          directives: [],
          shouldListen: false,
          text: null
        }
      }
      case 'musicFetchNextTrack': {
        return {
          dialogFinished: true,
          directives: [{
            internalDirective: {
              type: 'music_recover_next_track'
            }
          }],
          shouldListen: false,
          text: null
        }
      }
      case 'musicRecoverCommit': {
        return {
          dialogFinished: true,
          directives: [{
            internalDirective: {
              recoverCommitToken: input.data.recoverCommitToken,
              type: 'music_recover_commit'
            }
          }],
          shouldListen: false,
          text: null
        }
      }
      case 'playButtonPressPlay': {
        return {
          dialogFinished: true,
          directives: [{
            internalDirective: {
              type: 'music_play'
            }
          }],
          shouldListen: false,
          text: null
        }
      }
      case 'syncTimezoneLocation': {
        const directives: WrappedDirective[] = []

        if (input.data.timezone) {
          directives.push({
            internalDirective: {
              isPayloadRaw: input.data.isPayloadRaw,
              type: 'set_timezone'
            }
          })
        }
        if (input.data.location) {
          directives.push({
            internalDirective: {
              isPayloadRaw: input.data.isPayloadRaw,
              type: 'set_location'
            }
          })
        }

        return {
          dialogFinished: true,
          directives,
          shouldListen: false,
          text: null
        }
      }
      case 'text': {
        const directive = textToDirectiveMap[input.data.text]
        if (!directive) {
          this.logger.warn(`Received text TextInput with unknown text: '${input.data.text}'`)
          return {
            dialogFinished: true,
            directives: [],
            shouldListen: false,
            text: null
          }
        }

        return {
          dialogFinished: true,
          directives: [directive],
          shouldListen: false,
          text: null
        }
      }
      case 'tts': {
        return {
          dialogFinished: true,
          directives: [
            ttsPlayPlaceholderDirective()
          ],
          shouldListen: false,
          text: input.data.text
        }
      }
    }
  }

  async processVoiceInput (input: VoiceInput, parentSpan?: Span): Promise<InputResult> {
    this.logger.debug(`Received VoiceInput: ${input.text}`)
    if (!this.session) {
      this.logger.warn('No session opened')
      return {
        dialogFinished: true,
        directives: [
        ],
        shouldListen: false,
        text: null
      }
    }

    await this.session.process({
      metadata: {
        ...input.metadata,
        _raw: undefined
      } as unknown as ProcessorProcessWebSocketMessage['data']['metadata'],
      text: input.text
    })
    this.requestSent = true
    return await this.getPartialResponseResult(parentSpan)
  }

  private async getPartialResponseResult (parentSpan?: Span): Promise<InputResult> {
    if ((!this.session || !this.requestSent) && this.partialResponses.length === 0) {
      return {
        dialogFinished: true,
        directives: [],
        shouldListen: false,
        text: null
      }
    }

    let span: Span | undefined
    if (this.span && parentSpan) {
      span = startInactiveSpan({
        links: [{
          context: this.span?.spanContext()
        }],
        name: 'InputHandler waiting for partial response',
        op: 'input-handler-get-partial-response',
        parentSpan
      })
    }
    const partialResponse = await this.getPartialResponse()

    if (partialResponse === null) {
      span?.setAttribute('endReason', 'no-partial-response')
      span?.end()
      this.logger.debug('No partial response, sending continue')
      return {
        dialogFinished: false,
        directives: [
          mmSemanticFrame(false, continueSessionStage1SemanticFrame)
        ],
        shouldListen: false,
        text: null
      }
    }

    if (partialResponse.finished) {
      span?.setAttribute('endReason', 'partial-response-finished')
      span?.setAttribute('text', partialResponse.text)
      span?.setAttribute('should-listen', partialResponse.shouldListen)
      span?.setAttribute('directives', JSON.stringify(partialResponse.directives, undefined, 2))
      span?.end()
      this.logger.debug('Partial response is finished')
      if (partialResponse.finished && !partialResponse.shouldListen) {
        this.logger.debug('Partial response is finished, and no more input is required - closing')
        this.closeSession()
      }
      return {
        dialogFinished: !partialResponse.shouldListen,
        directives: [
          ...(partialResponse.directives.map(directive =>
            this.properties.directiveFunctionProvider
              .convertToWrappedDirective(directive)).filter(Boolean) as WrappedDirective[]),
          ttsPlayPlaceholderDirective()
        ],
        shouldListen: partialResponse.shouldListen,
        text: partialResponse.text
      }
    }

    this.logger.debug('Partial response is not finished, sending continue')
    span?.setAttribute('endReason', 'partial-response-not-finished')
    span?.setAttribute('text', partialResponse.text)
    span?.setAttribute('directives', JSON.stringify(partialResponse.directives, undefined, 2))
    span?.end()
    return {
      dialogFinished: false,
      directives: [
        ...(partialResponse.directives.map(directive =>
          this.properties.directiveFunctionProvider.convertToWrappedDirective(directive))
          .filter(Boolean) as WrappedDirective[]),
        ttsPlayPlaceholderDirective({
          TypedCallbackRequest: continueSessionStage1SemanticFrame
        })
      ],
      shouldListen: false,
      text: partialResponse.text
    }
  }
}
