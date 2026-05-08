import express from "express";
import dotenv from "dotenv";
import {getLogger} from "./logger";
import {registerQuasarYandexNetRouter} from "./routers/quasar.yandex.net";
import {registerUniproxyAliceYandexNetRouter, UniProxyConnection} from "./routers/uniproxy.alice.yandex.net";
import {OpenAI} from "openai";
import {GigaAMSTTBackend} from "./backend/stt/gigaam";
import {OpenAITTSBackend} from "./backend/tts/openai";
import {BasicProcessorBackend} from "./backend/processors/basic";
import {BufferedAudioMetadataBackend} from "./backend/audio-metadata/buffered";
import z from "zod";
import bodyParser from "body-parser";
import { PostgresDatabaseStationInfoStorage } from "./storage/database";
import Elysia, { t } from "elysia";
import node from "@elysiajs/node";
import openapi from "@elysia/openapi";

dotenv.config({
    path: ".env.local"
})

dotenv.config();

const logger = getLogger();

const PORT = parseInt(process.env.PORT ?? "31115");
const API_PORT = parseInt(process.env.API_PORT ?? "31116");

const STT_GIGAAM_URL = process.env.STT_GIGAAM_URL ?? "ws://10.0.3.137:8080";

const PROCESSOR_BASIC_URL = process.env.PROCESSOR_BASIC_URL ?? "http://localhost:8080";

const TTS_OPENAI_BASE_URL = process.env.TTS_OPENAI_BASE_URL ?? "http://10.0.3.137:8000";
const TTS_OPENAI_API_KEY = process.env.TTS_OPENAI_API_KEY ?? "";
const TTS_OPENAI_MODEL = process.env.TTS_OPENAI_MODEL ?? "";
const TTS_OPENAI_VOICE = process.env.TTS_OPENAI_VOICE ?? "IVONA 2 Tatyana OEM";
const TTS_OPENAI_SPEED = parseFloat(process.env.TTS_OPENAI_SPEED ?? "1");

const AUDIO_METADATA_URLS = (process.env.AUDIO_METADATA_URLS ?? "").split(",")
    .filter(url => url);

const POSTGRES_URL = process.env.POSTGRES_URL ?? "postgres://quasar:quasar@localhost/quasar"

const storage = new PostgresDatabaseStationInfoStorage(POSTGRES_URL)

const app = express();

app.use(bodyParser.json());

const server = app.listen(PORT, e => {
    if (e) {
        logger.error(`Quasar failed to start on :${PORT}: ${e}`);
        return;
    }
    logger.info(`Started quasar on :${PORT}`);
});

registerQuasarYandexNetRouter(app, {
    infoProvider: storage
});
const uniProxyRouter = registerUniproxyAliceYandexNetRouter({
    stt: new GigaAMSTTBackend(STT_GIGAAM_URL),
    processor: new BasicProcessorBackend(PROCESSOR_BASIC_URL),
    tts: new OpenAITTSBackend(new OpenAI({
        baseURL: TTS_OPENAI_BASE_URL,
        apiKey: TTS_OPENAI_API_KEY
    }), {
        model: TTS_OPENAI_MODEL,
        voice: TTS_OPENAI_VOICE,
        speed: TTS_OPENAI_SPEED
    }),
    audioMetadata: new BufferedAudioMetadataBackend(AUDIO_METADATA_URLS)
}, app, server);

const pushRequestType = z.object({
    eventText: z.string()
})

const apiServer = new Elysia({
    adapter: node()
}).use(openapi({
    documentation: {
        info: {
            title: 'Quasar API',
            version: '1.4.6'
        }
    }
}))

try {
    apiServer.listen(API_PORT, () => {
        logger.info(`Started API on :${API_PORT}`);
    })
} catch (error) {
    logger.error(`API failed to start on :${API_PORT}: ${error}`);
}

function runForConnections(duidOrAll: string, action: (connection: UniProxyConnection) => void) {
    for (const [duid, connections] of uniProxyRouter.connections) {
        if (duidOrAll === 'all' || duidOrAll === duid) {
            for (const connection of connections) {
                action(connection)
            }
        }
    }
}

apiServer.post('/device/:duid/push', async ({ body, params: { duid } }) => {
    runForConnections(duid, connection => {
        connection.push(body.eventText).catch(error => logger.warn(`Failed to push event to UniProxy connection: ${error}`))
    })
    
    return {}
}, {
    params: t.Object({
        duid: t.String({
            description: "DUID or 'all' for all devices"
        })
    }),
    body: t.Object({
        eventText: t.String({
            description: 'Event text to be pushed to LLM'
        })
    }),
    detail: {
        summary: 'Pushes event to LLM to be processed',
        tags: ['device']
    },
    response: t.Object({})
})

apiServer.post('/device/:duid/push/raw', async ({ body, params: { duid } }) => {
    runForConnections(duid, connection => {
        connection.pushRaw(body.eventText).catch(error => logger.warn(`Failed to push raw event to UniProxy connection: ${error}`))
    })

    return {}
}, {
    params: t.Object({
        duid: t.String({
            description: "DUID or 'all' for all devices"
        })
    }),
    body: t.Object({
        eventText: t.String({
            description: 'Event text to be pushed to TTS'
        })
    }),
    detail: {
        summary: 'Pushes event text to be TTSed',
        tags: ['device']
    },
    response: t.Object({})
})

apiServer.post('/device/:duid/directive/raw', async ({ body, params: { duid } }) => {
    runForConnections(duid, connection => {
        connection.pushRawDirective(body).catch(error => logger.warn(`Failed to push raw directive to UniProxy connection: ${error}`));
    })
    
    return {}
}, {
    params: t.Object({
        duid: t.String({
            description: "DUID or 'all' for all devices"
        })
    }),
    body: t.Unknown({
        description: 'Raw Quasar directive'
    }),
    detail: {
        summary: 'Pushes directive to the device',
        tags: ['device']
    },
    response: t.Object({})
})

app.use((req, res) => {
    logger.debug(`Got unknown request: ${req.method} ${req.url}`);
    res.status(500).end();
});
