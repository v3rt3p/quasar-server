import { getTraceData, Span, startInactiveSpan } from '@sentry/node'
import { WebSocket } from 'ws'

import { OpusProcessor } from '../../codecs/opus-processor'
import { getLogger } from '../../logger'
import { STTBackend, STTBackendSession } from '../backend'

interface GigaAMMessage {
  end_of_utt: boolean;
  text: string;
}

class GigaAMSTTSession extends STTBackendSession {
  private readonly logger = getLogger<GigaAMSTTSession>()
  private opusProcessor: OpusProcessor

  constructor (private readonly webSocket: WebSocket, private readonly span?: Span) {
    super()
    this.opusProcessor = new OpusProcessor(data => new Promise((resolve, reject) => {
      if (this.webSocket.readyState !== this.webSocket.OPEN) {
        this.logger.warn('Trying to send data to closed socket (data)')
        resolve()
        return
      }
      this.webSocket.send(data, {
        binary: true
      }, error => {
        if (error) {
          reject(error)
        } else {
          resolve()
        }
      })
    }), sampleRate => new Promise((resolve, reject) => {
      if (this.webSocket.readyState !== this.webSocket.OPEN) {
        this.logger.warn('Trying to send data to closed socket (sampleRate)')
        resolve()
        return
      }
      this.webSocket.send(JSON.stringify({
        sample_rate: sampleRate
      }), {
        binary: false
      }, error => {
        if (error) {
          reject(error)
        } else {
          resolve()
        }
      })
    }))

    webSocket.on('message', (message) => {
      const simplifiedMessage = Array.isArray(message) ? Buffer.concat(message) : Buffer.from(message as ArrayBuffer)
      const response = JSON.parse(simplifiedMessage.toString('utf8')) as GigaAMMessage
      this.chunkTranscribed({
        endOfUtt: response.end_of_utt,
        text: response.text
      })
    })
  }

  close (): void {
    this.span?.end()
    this.webSocket.close()
  }

  async transcribeChunk (chunk: Buffer): Promise<void> {
    await this.opusProcessor.handleAudioData(chunk)
  }
}

export class GigaAMSTTBackend implements STTBackend {
  constructor (private readonly endpoint: string) {}

  startTranscribing (parentSpan?: Span): Promise<STTBackendSession> {
    let span: Span | undefined
    if (parentSpan) {
      span = startInactiveSpan({
        name: 'GigaAM STT transcribing',
        op: 'gigaam-stt',
        parentSpan
      })
    }
    console.info(span?.spanContext().spanId)
    const webSocket = new WebSocket(this.endpoint, {
      headers: {
        ...getTraceData({
          span
        })
      }
    })
    return new Promise((resolve, reject) => {
      webSocket.on('error', error => {
        reject(error)
      })
      webSocket.on('close', () => {
        reject(new Error('Unexpected close'))
      })
      webSocket.on('open', () => {
        resolve(new GigaAMSTTSession(webSocket, span))
      })
    })
  }
}
