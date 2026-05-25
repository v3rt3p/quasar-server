import { getTraceData, Span, startInactiveSpan } from '@sentry/node'
import { PROCESSOR_METADATA_SERVER_TYPE_KEY, ProcessorClientWebSocketMessage, ProcessorMetadataServerType, processorServerWebSocketMessage } from '@v3rt3p/types/processor'
import { EventEmitter } from 'node:stream'
import { Event, WebSocket } from 'ws'

import { ProcessorBackend, ProcessorRequest, ProcessorSession, ProcessorSessionEvents } from '../backend'

export class BasicProcessorBackend implements ProcessorBackend {
  constructor (private readonly url: string) {}

  async openSession (parentSpan?: Span): Promise<ProcessorSession> {
    let span: Span | undefined
    if (parentSpan) {
      span = startInactiveSpan({
        name: 'Basic processor processing',
        op: 'basic-processor',
        parentSpan
      })
    }
    const webSocket = new WebSocket(this.url.replace('http://', 'ws://').replace('https://', 'wss://'), span
      ? {
          headers: {
            ...getTraceData({
              span: startInactiveSpan({
                name: 'Basic processor processing connection',
                op: 'basic-processor-connection',
                parentSpan: span
              })
            })
          }
        }
      : {})
    let openResolve = (_session: ProcessorSession) => {}
    // eslint-disable-next-line unicorn/consistent-function-scoping
    let openReject = (_error: Error) => {}
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
      openResolve(new BasicProcessorSession(webSocket, parentSpan))
    })

    return promise
  }
}

// eslint-disable-next-line unicorn/prefer-event-target
export class BasicProcessorSession extends EventEmitter<ProcessorSessionEvents> implements ProcessorSession {
  constructor (private readonly webSocket: WebSocket, span?: Span) {
    super()

    this.webSocket.addEventListener('close', () => {
      this.emit('close')
      span?.end()
    })
    this.webSocket.addEventListener('message', message => {
      const data = processorServerWebSocketMessage.parse(JSON.parse(message.data.toString()))
      if (data.type === 'partialResponse') {
        this.emit('partialResponse', data.data)
      }
    })
  }

  close (): void {
    this.webSocket.close()
  }

  prepare (): Promise<void> {
    return this.send({
      data: {},
      type: 'prepare'
    })
  }

  process (request: ProcessorRequest): Promise<void> {
    return this.send({
      data: {
        ...request,
        metadata: {
          ...request.metadata,
          [PROCESSOR_METADATA_SERVER_TYPE_KEY]: ProcessorMetadataServerType.QUASAR
        }
      },
      type: 'process'
    })
  }

  private send (message: ProcessorClientWebSocketMessage): Promise<void> {
    return new Promise((resolve, reject) => {
      this.webSocket.send(JSON.stringify(message), error => {
        if (error) {
          reject(error)
        } else {
          resolve()
        }
      })
    })
  }
}
