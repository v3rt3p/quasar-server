import { Event, WebSocket } from "ws";
import {getLogger} from "../../logger";
import {ProcessorBackend, ProcessorPartialResponse, ProcessorPrepareRequest, ProcessorPrepareResponse, ProcessorRequest, ProcessorResponse, ProcessorSession} from "../backend";
import {randomUUID} from "node:crypto";

export class BasicProcessorSession implements ProcessorSession {
    constructor(private readonly webSocket: WebSocket) {
    }

    prepare(request: ProcessorPrepareRequest): Promise<void> {
        return new Promise((resolve, reject) => {
            this.webSocket.send(JSON.stringify({
                type: 'prepare',
                data: request
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
                type: 'process',
                data: request
            }), error => {
                if (error) {
                    reject(error)
                } else {
                    resolve()
                }
            })
        })
    }
    
    waitForPartialResponse(): Promise<ProcessorPartialResponse> {
        let waitResolve = (_session: ProcessorPartialResponse) => {}
        let waitReject = (_error: Error) => {}
        const promise = new Promise<ProcessorPartialResponse>((resolve, reject) => {
            waitResolve = resolve
            waitReject = reject
        })

        const errorListener = (error: Event) => {
            waitReject(new Error(error.type))
        }

        this.webSocket.addEventListener('error', errorListener)
        this.webSocket.addEventListener('close', errorListener)
        this.webSocket.addEventListener('message', message => {
            this.webSocket.removeEventListener('error', errorListener)
            this.webSocket.removeEventListener('close', errorListener)
            const messageData = JSON.parse(message.data.toString())
            if (messageData.type === "partialResponse") {
                waitResolve(messageData.data)
            }
        })

        return promise
    }
    
    close(): void {
        this.webSocket.close();
    }
}

export class BasicProcessorBackend implements ProcessorBackend {
    private readonly logger = getLogger<BasicProcessorBackend>();

    constructor(private readonly url: string) {
    }

    async openSession(): Promise<ProcessorSession> {
        const webSocket = new WebSocket(this.url.replace('http://', 'ws://').replace('https://', 'wss://'))
        let openResolve = (_session: ProcessorSession) => {}
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

    async prepare(request: ProcessorPrepareRequest): Promise<ProcessorPrepareResponse> {
        this.logger.info(`Preparing processor`)
        const response = await (await fetch(this.url, {
            method: "PATCH",
            body: JSON.stringify(request)
        })).json()
        this.logger.info(`Processor prepared: ${JSON.stringify(response, undefined, 4)}`)
        if (!response.success) {
            return {
                sessionId: undefined
            };
        }
        return response;
    }

    async process(request: ProcessorRequest): Promise<ProcessorResponse> {
        this.logger.info(`Processor request: ${JSON.stringify(request, undefined, 4)}`);
        const response = await (await fetch(this.url, {
            method: "POST",
            body: JSON.stringify(request),
            headers: {
                "content-type": "application/json"
            }
        })).json();
        this.logger.info(`Processor response: ${JSON.stringify(response, undefined, 4)}`);
        if (!response.success) {
            return {
                text: "Failed to process your request",
                requireMoreInput: false,
                sessionId: randomUUID(),
                directives: []
            };
        }
        return response;
    }
}