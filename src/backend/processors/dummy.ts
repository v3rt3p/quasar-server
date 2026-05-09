import {ProcessorBackend, ProcessorPrepareRequest, ProcessorPrepareResponse, ProcessorRequest, ProcessorResponse, ProcessorSession} from "../backend";
import {sleep} from "../../utils";
import {randomUUID} from "node:crypto";

export class DummyProcessorBackend implements ProcessorBackend {
    async prepare(request: ProcessorPrepareRequest): Promise<ProcessorPrepareResponse> {
        return request;
    }

    async openSession(): Promise<ProcessorSession> {
        return {
            async prepare() {},
            async process() {},
            close() {},
            async waitForPartialResponse() {
                return {
                    text: "я хуй знает",
                    requireMoreInput: false,
                    finished: true,
                    sessionId: randomUUID(),
                    directives: []
                }
            }
        }
    }

    async process(request: ProcessorRequest): Promise<ProcessorResponse> {
        await sleep(1000);
        return {
            text: "я хуй знает",
            requireMoreInput: false,
            sessionId: request.sessionId ?? randomUUID(),
            directives: []
        };
    }
}