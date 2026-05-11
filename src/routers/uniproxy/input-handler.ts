import { Span, startInactiveSpan } from '@sentry/node'

import { ProcessorBackend, ProcessorPartialResponse, ProcessorSession } from '../../backend/backend'
import { getLogger } from '../../logger'
import { Notifier } from '../../notifier'
import { AliceDirective } from '../alice/directives'
import { continueSessionStage1SemanticFrame } from '../alice/typed-payloads'

export interface Input {
  metadata: object
}

export interface InputHandlerProperties {
  processor: ProcessorBackend
}

export interface InputResult {
  dialogFinished: boolean
  directives: AliceDirective[]
  shouldListen: boolean
  text: null | string
}

export type TextInput = Input & {
  data: TextInputData
}

export type TextInputData = {
  eventText: string
  kind: 'event'
} | {
  kind: 'continue'
} | {
  kind: 'playButtonPress'
} | {
  kind: 'tts'
  text: string
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

  closeSession (): void {
    if (this.session) {
      this.partialResponses = []
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
      this.session = await this.properties.processor.openSession(parentSpan)
      this.session.addListener('close', () => {
        this.closeSession()
      })
      this.session.addListener('partialResponse', data => {
        this.logger.debug(`Received partial response: ${JSON.stringify(data)}`)
        this.partialResponses.push(data)
        this.notifier.notifyAll()
      })
      this.session.addListener('partialResponse', () => {})
      await this.session.prepare()
      this.logger.debug('Session opened')
    }
  }

  async processTextInput (input: TextInput, parentSpan?: Span): Promise<InputResult> {
    this.logger.debug(`Received TextInput with kind: ${input.data.kind}`)
    switch (input.data.kind) {
      case 'continue': {
        return await this.getPartialResponseResult(parentSpan)
      }
      case 'event': {
        if (!this.session) {
          await this.openSession(parentSpan)
        }
        await this.session!.process({
          isExternalEvent: true,
          metadata: input.metadata,
          text: input.data.eventText
        })
        this.requestSent = true
        return await this.getPartialResponseResult(parentSpan)
      }
      case 'playButtonPress': {
        if (!this.session) {
          await this.openSession(parentSpan)
        }
        await this.session!.process({
          isExternalEvent: true,
          metadata: input.metadata,
          text: 'play button pressed on speaker'
        })
        this.requestSent = true
        return await this.getPartialResponseResult(parentSpan)
      }
      case 'tts': {
        return {
          dialogFinished: true,
          directives: [
            {
              type: 'ttsPlayPlaceholder'
            }
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
      metadata: input.metadata,
      text: input.text
    })
    this.requestSent = true
    return await this.getPartialResponseResult(parentSpan)
  }

  private async getPartialResponseResult (parentSpan?: Span): Promise<InputResult> {
    if (!this.session || !this.requestSent) {
      return {
        dialogFinished: true,
        directives: [
        ],
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
          {
            payload: continueSessionStage1SemanticFrame,
            type: 'mmSemanticFrame'
          }
        ],
        shouldListen: false,
        text: null
      }
    }

    if (partialResponse.finished) {
      span?.setAttribute('endReason', 'partial-response-finished')
      span?.setAttribute('text', partialResponse.text)
      span?.setAttribute('require-more-input', partialResponse.requireMoreInput)
      span?.setAttribute('directives', JSON.stringify(partialResponse.directives, undefined, 2))
      span?.end()
      this.logger.debug('Partial response is finished')
      if (partialResponse.finished && !partialResponse.requireMoreInput) {
        this.logger.debug('Partial response is finished, and no more input is required - closing')
        this.closeSession()
      }
      return {
        dialogFinished: !partialResponse.requireMoreInput,
        directives: [
          ...partialResponse.directives,
          {
            type: 'ttsPlayPlaceholder'
          }
        ],
        shouldListen: partialResponse.requireMoreInput,
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
        ...partialResponse.directives,
        {
          onFinish: {
            TypedCallbackRequest: continueSessionStage1SemanticFrame
          },
          type: 'ttsPlayPlaceholder'
        }
      ],
      shouldListen: false,
      text: partialResponse.text
    }
  }
}
