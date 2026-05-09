import { randomUUID } from 'node:crypto'

import { ProcessorBackend } from '../../backend/backend'
import { getLogger } from '../../logger'
import { AliceDirective } from '../alice/directives'

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
  sessionId: string
} | {
  kind: 'continueRequest'
  sessionId: string
} | {
  kind: 'playButtonPress'
} | {
  kind: 'rawSpeak'
  text: string
}

export type VoiceInput = Input & {
  text: string
}

export class InputHandler {
  private readonly logger = getLogger()
  private sessionId: null | string = null

  constructor (private readonly properties: InputHandlerProperties) {}

  closeSession (): void {
    this.logger.debug(`Closing session ${this.sessionId}`)
    this.sessionId = null
  }

  async openSession (): Promise<void> {
    if (!this.sessionId) {
      this.sessionId = randomUUID()
    }
    this.logger.debug(`Opening session ${this.sessionId}`)
  }

  async processTextInput (input: TextInput): Promise<InputResult> {
    throw new Error('???')
  }

  async processVoiceInput (input: VoiceInput): Promise<InputResult> {
    this.logger.debug('Processing voice input')
    return {
      directives: [
        // {
        //   type: 'ttsPlayPlaceholder'
        // }
      ],
      shouldListen: false,
      text: null
    }
  }
}
