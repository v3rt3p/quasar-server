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
  private session: null | ProcessorSession = null

  constructor (private readonly properties: InputHandlerProperties) {}

  closeSession (): void {
    if (this.session) {
      this.session.close()
      this.session = null
      this.logger.debug('Session closed')
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

  async openSession (): Promise<void> {
    if (this.session) {
      this.logger.debug('Session already opened')
    } else {
      this.logger.debug('Opening new session')
      this.session = await this.properties.processor.openSession()
      this.session.addListener('close', () => {
        this.closeSession()
      })
      this.session.addListener('partialResponse', data => {
        this.partialResponses.push(data)
        this.notifier.notifyAll()
      })
      this.session.addListener('partialResponse', () => {})
      await this.session.prepare()
      this.logger.debug('Session opened')
    }
  }

  async processTextInput (input: TextInput): Promise<InputResult> {
    switch (input.data.kind) {
      case 'continue': {
        return await this.getPartialResponseResult()
      }
      case 'event': {
        if (!this.session) {
          this.logger.warn('No session opened')
          return {
            directives: [
            ],
            shouldListen: false,
            text: null
          }
        }
        await this.session.process({
          isExternalEvent: true,
          metadata: input.metadata,
          text: input.data.eventText
        })
        return await this.getPartialResponseResult()
      }
      case 'playButtonPress': {
        if (!this.session) {
          this.logger.warn('No session opened')
          return {
            directives: [
            ],
            shouldListen: false,
            text: null
          }
        }
        await this.session.process({
          isExternalEvent: true,
          metadata: input.metadata,
          text: 'play button pressed on speaker'
        })
        return await this.getPartialResponseResult()
      }
      case 'tts': {
        return {
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

  async processVoiceInput (input: VoiceInput): Promise<InputResult> {
    if (!this.session) {
      this.logger.warn('No session opened')
      return {
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

    return await this.getPartialResponseResult()
  }

  private async getPartialResponseResult (): Promise<InputResult> {
    if (!this.session) {
      return {
        directives: [
        ],
        shouldListen: false,
        text: null
      }
    }

    const partialResponse = await this.getPartialResponse()

    if (partialResponse === null) {
      return {
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
      return {
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

    return {
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
