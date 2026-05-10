import { EventEmitter } from 'node:stream'
import { Event, WebSocket } from 'ws'

import { ProcessorBackend, ProcessorRequest, ProcessorSession, ProcessorSessionEvents } from '../backend'

export class BasicProcessorBackend implements ProcessorBackend {
  constructor (private readonly url: string) {}

  async openSession (): Promise<ProcessorSession> {
    const webSocket = new WebSocket(this.url.replace('http://', 'ws://').replace('https://', 'wss://'))
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
      openResolve(new BasicProcessorSession(webSocket))
    })

    return promise
  }
}

// eslint-disable-next-line unicorn/prefer-event-target
export class BasicProcessorSession extends EventEmitter<ProcessorSessionEvents> implements ProcessorSession {
  constructor (private readonly webSocket: WebSocket) {
    super()
    this.webSocket.addEventListener('close', () => {
      this.emit('close')
    })
    this.webSocket.addEventListener('message', message => {
      const data = JSON.parse(message.data.toString())
      if (data.type === 'partialResponse') {
        this.emit('partialResponse', data.data)
      }
    })
  }

  close (): void {
    this.webSocket.close()
  }

  prepare (): Promise<void> {
    return new Promise((resolve, reject) => {
      this.webSocket.send(JSON.stringify({
        data: {},
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

  process (request: ProcessorRequest): Promise<void> {
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
}
