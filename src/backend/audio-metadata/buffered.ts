import { Span, startInactiveSpan } from '@sentry/node'

import { OpusProcessor } from '../../codecs/opus-processor'
import { getLogger } from '../../logger'
import { AudioMetadataBackend, AudioMetadataBackendSession } from '../backend'

class BufferedAudioMetadataBackendSession extends AudioMetadataBackendSession {
  private readonly buffers: Buffer[] = []

  private readonly logger = getLogger()
  private readonly opusProcessor: OpusProcessor
  private sampleRate: null | number = null

  constructor (private readonly backendUrls: string[], private readonly parentSpan?: Span) {
    super()
    this.opusProcessor = new OpusProcessor(async audioData => {
      this.buffers.push(audioData)
    }, async sampleRate => {
      if (this.sampleRate != null && this.sampleRate !== sampleRate) {
        throw new Error('Sample rate already defined')
      }
      this.sampleRate = sampleRate
    })
  }

  close (): void {}

  async finish (): Promise<object> {
    if (this.sampleRate == null) {
      return {}
    }
    const totalBuffer = Buffer.concat(this.buffers)
    const promises: Promise<object>[] = []
    for (const url of this.backendUrls) {
      promises.push((async () => {
        try {
          const realUrl = new URL(url)
          realUrl.searchParams.set('sample_rate', this.sampleRate?.toString() ?? '')
          let span: Span | undefined
          if (this.parentSpan) {
            span = startInactiveSpan({
              name: `Buffered AudioMetadata request to ${realUrl.hostname}`,
              op: `audio-metadata-buffered-${realUrl.hostname}`,
              parentSpan: this.parentSpan
            })
          }
          try {
            const result = await fetch(realUrl.toString(), {
              body: totalBuffer,
              headers: {
                'content-type': 'application/octet-stream'
              },
              method: 'POST'
            })
            const metadata = await result.json()

            span?.setAttribute('metadata', JSON.stringify(metadata, undefined, 2))
            return metadata
          } finally {
            span?.end()
          }
        } catch (error) {
          this.logger.warn(`Failed to get audio metadata from ${url}: ${error}`)
          return {}
        }
      })())
    }

    const results = await Promise.all(promises)
    let totalResult = {}
    for (const result of results) {
      totalResult = {
        ...totalResult,
        ...result
      }
    }
    return totalResult
  }

  async processChunk (chunk: Buffer): Promise<void> {
    await this.opusProcessor.handleAudioData(chunk)
  }
}

export class BufferedAudioMetadataBackend implements AudioMetadataBackend {
  constructor (private readonly backendUrls: string[]) {}

  async startCapturing (parentSpan?: Span): Promise<AudioMetadataBackendSession> {
    return new BufferedAudioMetadataBackendSession(this.backendUrls, parentSpan)
  }
}
