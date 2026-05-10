import openapi from '@elysia/openapi'
import node from '@elysiajs/node'
import bodyParser from 'body-parser'
import dotenv from 'dotenv'
import Elysia, { t } from 'elysia'
import express from 'express'
import { OpenAI } from 'openai'
import z from 'zod'

import { BufferedAudioMetadataBackend } from './backend/audio-metadata/buffered'
import { BasicProcessorBackend } from './backend/processors/basic'
import { GigaAMSTTBackend } from './backend/stt/gigaam'
import { OpenAITTSBackend } from './backend/tts/openai'
import { getLogger } from './logger'
import { pushUpdateConfigDirective } from './routers/alice/directives'
import { registerQuasarYandexNetRouter } from './routers/quasar.yandex.net'
import { registerUniproxyAliceYandexNetRouter } from './routers/uniproxy.alice.yandex.net'
import { UniProxyConnection } from './routers/uniproxy/uniproxy-connection'
import { PostgresDatabaseStationInfoStorage } from './storage/database'
import { quasarConfig } from './storage/types'

dotenv.config({
  path: '.env.local'
})

dotenv.config()

const logger = getLogger()

const PORT = Number.parseInt(process.env.PORT ?? '31115')
const API_PORT = Number.parseInt(process.env.API_PORT ?? '31116')

const STT_GIGAAM_URL = process.env.STT_GIGAAM_URL ?? 'ws://10.0.3.137:8080'

const PROCESSOR_BASIC_URL = process.env.PROCESSOR_BASIC_URL ?? 'http://localhost:8080'

const TTS_OPENAI_BASE_URL = process.env.TTS_OPENAI_BASE_URL ?? 'http://10.0.3.137:8000'
const TTS_OPENAI_API_KEY = process.env.TTS_OPENAI_API_KEY ?? ''
const TTS_OPENAI_MODEL = process.env.TTS_OPENAI_MODEL ?? ''
const TTS_OPENAI_VOICE = process.env.TTS_OPENAI_VOICE ?? 'IVONA 2 Tatyana OEM'
const TTS_OPENAI_SPEED = Number.parseFloat(process.env.TTS_OPENAI_SPEED ?? '1')

const AUDIO_METADATA_URLS = (process.env.AUDIO_METADATA_URLS ?? '').split(',')
  .filter(Boolean)

const POSTGRES_URL = process.env.POSTGRES_URL ?? 'postgres://quasar:quasar@localhost/quasar'

const storage = new PostgresDatabaseStationInfoStorage(POSTGRES_URL)

// eslint-disable-next-line unicorn/prefer-top-level-await
storage.initialize().catch(error => logger.fatal(error))

const app = express()

app.use(bodyParser.json())

const server = app.listen(PORT, error => {
  if (error) {
    logger.error(`Quasar failed to start on :${PORT}: ${error}`)
    return
  }
  logger.info(`Started quasar on :${PORT}`)
})

registerQuasarYandexNetRouter(app, {
  infoProvider: storage
})
const uniProxyRouter = registerUniproxyAliceYandexNetRouter({
  audioMetadata: new BufferedAudioMetadataBackend(AUDIO_METADATA_URLS),
  processor: new BasicProcessorBackend(PROCESSOR_BASIC_URL),
  stt: new GigaAMSTTBackend(STT_GIGAAM_URL),
  tts: new OpenAITTSBackend(new OpenAI({
    apiKey: TTS_OPENAI_API_KEY,
    baseURL: TTS_OPENAI_BASE_URL
  }), {
    model: TTS_OPENAI_MODEL,
    speed: TTS_OPENAI_SPEED,
    voice: TTS_OPENAI_VOICE
  })
}, server)

const apiServer = new Elysia({
  adapter: node()
}).use(openapi({
  documentation: {
    info: {
      title: 'Quasar API',
      version: '1.4.6'
    }
  },
  mapJsonSchema: {
    zod: z.toJSONSchema
  }
}))

function runForConnections (duidOrAll: string, action: (connection: UniProxyConnection) => void) {
  for (const [duid, connections] of uniProxyRouter.connections) {
    if (duidOrAll === 'all' || duidOrAll === duid) {
      for (const connection of connections) {
        action(connection)
      }
    }
  }
}

apiServer.get('/devices', async () => {
  const infos = await storage.getStationInfos()
  return infos.map(info => ({
    duid: info.duid,
    name: info.name,
    quasarConfig: info.quasarConfig
  }))
}, {
  detail: {
    summary: 'Get list of devices',
    tags: ['device']
  },
  response: z.array(z.object({
    duid: z.string().describe('DUID'),
    name: z.string().describe('Name'),
    quasarConfig: quasarConfig.describe('Quasar\'s maind config')
  }))
})

apiServer.post('/devices/:duid/push', async ({ body, params: { duid } }) => {
  runForConnections(duid, connection => {
    connection.pushEvent(body.eventText).catch(error => logger.warn(`Failed to push event to UniProxy connection: ${error}`))
  })

  return {}
}, {
  body: t.Object({
    eventText: t.String({
      description: 'Event text to be pushed to LLM'
    })
  }),
  detail: {
    summary: 'Push event to LLM to be processed',
    tags: ['device']
  },
  params: t.Object({
    duid: t.String({
      description: "DUID or 'all' for all devices"
    })
  }),
  response: t.Object({})
})

apiServer.post('/devices/:duid/push-raw', async ({ body, params: { duid } }) => {
  runForConnections(duid, connection => {
    connection.pushTts(body.eventText).catch(error => logger.warn(`Failed to push raw event to UniProxy connection: ${error}`))
  })

  return {}
}, {
  body: t.Object({
    eventText: t.String({
      description: 'Event text to be pushed to TTS'
    })
  }),
  detail: {
    summary: 'Push event text to be TTSed',
    tags: ['device']
  },
  params: t.Object({
    duid: t.String({
      description: "DUID or 'all' for all devices"
    })
  }),
  response: t.Object({})
})

apiServer.post('/devices/:duid/push-directive', async ({ body, params: { duid } }) => {
  runForConnections(duid, connection => {
    connection.pushRawDirective(body).catch(error => logger.warn(`Failed to push raw directive to UniProxy connection: ${error}`))
  })

  return {}
}, {
  body: t.Unknown({
    description: 'Raw Quasar directive'
  }),
  detail: {
    summary: 'Push directive to the device',
    tags: ['device']
  },
  params: t.Object({
    duid: t.String({
      description: "DUID or 'all' for all devices"
    })
  }),
  response: t.Object({})
})

apiServer.patch('/devices/:duid', async ({ body, params: { duid } }) => {
  const info = await storage.updateNameAndQuasarConfig(duid, body.name, body.quasarConfig)

  runForConnections(duid, connection => {
    connection.pushRawDirective(pushUpdateConfigDirective).catch(error =>
      logger.warn(`Failed to push config update directive to UniProxy connection: ${error}`))
  })

  return {
    duid: info.duid,
    name: info.name,
    quasarConfig: info.quasarConfig
  }
}, {
  body: z.object({
    name: z.string().optional().describe('Name'),
    quasarConfig: quasarConfig.optional().describe('Quasar\'s maind config')
  }),
  detail: {
    summary: 'Update device config',
    tags: ['device']
  },
  params: t.Object({
    duid: t.String({
      description: 'DUID'
    })
  }),
  response: z.object({
    duid: z.string().describe('DUID'),
    name: z.string().describe('Name'),
    quasarConfig: quasarConfig.describe('Quasar\'s maind config')
  })
})

try {
  apiServer.listen(API_PORT, () => {
    logger.info(`Started API on :${API_PORT}`)
  })
} catch (error) {
  logger.error(`API failed to start on :${API_PORT}: ${error}`)
}

app.use((request, response) => {
  logger.debug(`Got unknown request: ${request.method} ${request.url}`)
  response.status(500).end()
})
