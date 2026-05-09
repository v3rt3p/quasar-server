import { randomUUID } from 'node:crypto'
import { Event, MessageEvent, WebSocket } from 'ws'

import { getLogger } from '../../logger'
import { CancelCallback, ProcessorBackend, ProcessorPartialResponse, ProcessorPrepareRequest, ProcessorPrepareResponse, ProcessorRequest, ProcessorResponse, ProcessorSession } from '../backend'

export class BasicProcessorBackend implements ProcessorBackend {
  private readonly logger = getLogger<BasicProcessorBackend>()

  constructor(private readonly url: string) { }

  async openSession(): Promise<ProcessorSession> {
    const webSocket = new WebSocket(this.url.replace('http://', 'ws://').replace('https://', 'wss://'))
    let openResolve = (_session: ProcessorSession) => { }
    let openReject = (_error: Error) => { }
    const promise = new Promise<ProcessorSession>((resolve, reject) => {
      openResolve = resolve
      openReject = reject
    })

    const errorListener = (error: Event) => {
      openReject(new Error(error.type))
    }

    webSocket.addEventListener('error', errorListener)
    webSocket.addEventListener('close', errorListener)
    webSocket.addEventListener('open', () => {
      webSocket.removeEventListener('error', errorListener)
      webSocket.removeEventListener('close', errorListener)
      openResolve(new BasicProcessorSession(webSocket))
    })

    return promise
  }

  async prepare(request: ProcessorPrepareRequest): Promise<ProcessorPrepareResponse> {
    this.logger.info('Preparing processor')
    const response = await (await fetch(this.url, {
      body: JSON.stringify(request),
      method: 'PATCH'
    })).json()
    this.logger.info(`Processor prepared: ${JSON.stringify(response, undefined, 4)}`)
    if (!response.success) {
      return {}
    }
    return response
  }

  async process(request: ProcessorRequest): Promise<ProcessorResponse> {
    this.logger.info(`Processor request: ${JSON.stringify(request, undefined, 4)}`)
    const response = await (await fetch(this.url, {
      body: JSON.stringify(request),
      headers: {
        'content-type': 'application/json'
      },
      method: 'POST'
    })).json()
    this.logger.info(`Processor response: ${JSON.stringify(response, undefined, 4)}`)
    if (!response.success) {
      return {
        directives: [],
        requireMoreInput: false,
        sessionId: randomUUID(),
        text: 'Failed to process your request'
      }
    }
    return response
  }
}

export class BasicProcessorSession implements ProcessorSession {
  constructor(private readonly webSocket: WebSocket) { }

  close(): void {
    this.webSocket.close()
  }

  prepare(request: ProcessorPrepareRequest): Promise<void> {
    return new Promise((resolve, reject) => {
      this.webSocket.send(JSON.stringify({
        data: request,
        type: 'prepare'
      }), error => {
        if (error) {
          reject(error)
        } else {
          resolve()
        }
      })
    })
  }

  process(request: ProcessorRequest): Promise<void> {
    return new Promise((resolve, reject) => {
      this.webSocket.send(JSON.stringify({
        data: request,
        type: 'process'
      }), error => {
        if (error) {
          reject(error)
        } else {
          resolve()
        }
      })
    })
  }

  waitForPartialResponse(): [Promise<ProcessorPartialResponse>, CancelCallback] {
    let waitResolve = (_session: ProcessorPartialResponse) => { }
    let waitReject = (_error: Error) => { }
    const promise = new Promise<ProcessorPartialResponse>((resolve, reject) => {
      waitResolve = resolve
      waitReject = reject
    })

    const errorListener = (error: Event) => {
      waitReject(new Error(error.type))
    }

    this.webSocket.addEventListener('error', errorListener)
    this.webSocket.addEventListener('close', errorListener)
    const handler = (message: MessageEvent) => {
      this.webSocket.removeEventListener('error', errorListener)
      this.webSocket.removeEventListener('close', errorListener)
      const messageData = JSON.parse(message.data.toString())
      if (messageData.type === 'partialResponse') {
        waitResolve(messageData.data)
      }
    }
    this.webSocket.addEventListener('message', handler)

    const webSocket = this.webSocket

    return [promise, () => {
      webSocket.removeEventListener('message', handler)
      webSocket.removeEventListener('error', errorListener)
      webSocket.removeEventListener('close', errorListener)
    }]
  }
}
