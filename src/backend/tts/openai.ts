import { Span, startInactiveSpan } from '@sentry/node'
import { OpenAI } from 'openai'

import { TTSBackend, TTSRequest, TTSResponse } from '../backend'

interface OpenAITSBackendParameters {
  model: string;
  speed: number;
  voice: string;
}

export class OpenAITTSBackend implements TTSBackend {
  constructor (private readonly openAI: OpenAI, private readonly parameters: OpenAITSBackendParameters) {}

  async synthesize (request: TTSRequest): Promise<TTSResponse> {
    let span: Span | undefined
    if (request.parentSpan) {
      span = startInactiveSpan({
        name: 'openai-tts',
        parentSpan: request.parentSpan
      })
    }
    try {
      const result = await this.openAI.audio.speech.create({
        input: request.text,
        model: this.parameters.model,
        response_format: 'opus',
        speed: this.parameters.speed,
        voice: this.parameters.voice,
      })
      return {
        format: 'audio/opus',
        voiceOutput: Buffer.from(await result.arrayBuffer()),
      }
    } finally {
      span?.end()
    }
  }
}
