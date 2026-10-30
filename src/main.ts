import openapi from '@elysia/openapi'
import node from '@elysiajs/node'
import Sentry from '@sentry/node'
import { functions, functionStateServerCallFunctionRequest, functionStateServerCallFunctionResponse, functionStateServerGetDependantFunctionsRequest, functionStateServerGetDependantStateRequest, functionStateServerStateResponse } from '@v3rt3p/types/function-state-server'
import bodyParser from 'body-parser'
import Elysia, { t } from 'elysia'
import express from 'express'
import { OpenAI } from 'openai'
import z from 'zod'

import { BufferedAudioMetadataBackend } from './backend/audio-metadata/buffered'
import { BasicMusicBackend } from './backend/music/basic'
import { StubMusicBackend } from './backend/music/stub'
import { BasicProcessorBackend } from './backend/processors/basic'
import { GigaAMSTTBackend } from './backend/stt/gigaam'
import { OpenAITTSBackend } from './backend/tts/openai'
import { getEnvironment } from './environment'
import { getLogger } from './logger'
import { MusicManager } from './music/manager'
import proto from './protos/protos'
import { DirectiveFunctions, pushUpdateConfigDirective, setTimezoneDirective, WrappedDirective } from './routers/alice/directives'
import { registerClckYandexNetRouter } from './routers/clck.yandex.net'
import { registerMobileproxyPassportYandexNetRouter } from './routers/mobileproxy.passport.yandex.net'
import { registerOAuthYandexRuRouter } from './routers/oauth.yandex.ru'
import { registerQuasarYandexNetRouter } from './routers/quasar.yandex.net'
import { registerReportAppMetricaYandexNetRouter } from './routers/report.appmetrica.yandex.net'
import { registerRpcAliceYandexNetRouter } from './routers/rpc.alice.yandex.net'
import { registerScbhYandexNetRouter } from './routers/scbh.yandex.net'
import { registerStartupMobileYandexNetRouter } from './routers/startup.mobile.yandex.net'
import { registerUniproxyAliceYandexNetRouter } from './routers/uniproxy.alice.yandex.net'
import { InputMetadataEntry } from './routers/uniproxy/input-handler'
import { UniProxyConnection } from './routers/uniproxy/uniproxy-connection'
import { quasarConfigPatch } from './storage/config-patch'
import { TypeORMDatabaseStationInfoStorage } from './storage/database'
import { quasarConfig } from './storage/types'
import { loadUpdatesConfig } from './updates'

const logger = getLogger()
const environment = getEnvironment()

const updatesConfig = environment.ALLOW_UPDATES && environment.UPDATES_CONFIG_PATH
  ? loadUpdatesConfig(environment.UPDATES_CONFIG_PATH)
  : { updates: {} }

Sentry.init({
  defaultIntegrations: false,
  dsn: environment.SENTRY_DSN,
  sampleRate: 1,
  tracesSampleRate: 1
})

const storage = new TypeORMDatabaseStationInfoStorage('POSTGRES_URL' in environment
  ? {
      type: 'postgres',
      url: environment.POSTGRES_URL
    }
  : {
      path: environment.SQLITE_PATH,
      type: 'sqlite'
    })

// eslint-disable-next-line unicorn/prefer-top-level-await
storage.initialize().catch(error => logger.fatal(error))

const app = express()

// fuck Yandex
app.use('/quasar.yandex.net/glagol/check_token', (request, _response, next) => {
  request.headers['content-type'] = 'text/yandex-token'
  next()
})
app.use('/quasar.yandex.net/glagol/v2.0/check_token', (request, _response, next) => {
  request.headers['content-type'] = 'text/yandex-token'
  next()
})
// unfuck Yandex

app.use(bodyParser.json())
app.use(bodyParser.raw({
  inflate: true,
  type: 'text/yandex-token'
}))

registerClckYandexNetRouter(app)
registerReportAppMetricaYandexNetRouter(app)
registerQuasarYandexNetRouter(app, {
  glagolJwtKey: environment.GLAGOL_JWT_KEY,
  infoProvider: storage,
  updatesConfig
})
registerOAuthYandexRuRouter(app)
registerMobileproxyPassportYandexNetRouter(app)
registerStartupMobileYandexNetRouter(app)
registerScbhYandexNetRouter(app)
registerRpcAliceYandexNetRouter(app)

const server = app.listen(environment.PORT, error => {
  if (error) {
    logger.error(`Quasar failed to start on :${environment.PORT}: ${error}`)
    return
  }
  logger.info(`Started quasar on :${environment.PORT}`)
})

const uniProxyRouter = registerUniproxyAliceYandexNetRouter({
  audioMetadata: new BufferedAudioMetadataBackend(environment.AUDIO_METADATA_URLS),
  musicManager: new MusicManager(environment.MUSIC_SERVICE_BASIC_URL
    ? new BasicMusicBackend(environment.MUSIC_SERVICE_BASIC_URL)
    : new StubMusicBackend()),
  processor: new BasicProcessorBackend(environment.PROCESSOR_BASIC_URL),
  storage,
  stt: new GigaAMSTTBackend(environment.STT_GIGAAM_URL),
  tts: new OpenAITTSBackend(new OpenAI({
    apiKey: environment.TTS_OPENAI_API_KEY,
    baseURL: environment.TTS_OPENAI_BASE_URL
  }), {
    model: environment.TTS_OPENAI_MODEL,
    speed: environment.TTS_OPENAI_SPEED,
    voice: environment.TTS_OPENAI_VOICE
  })
}, server)

app.use((request, response) => {
  logger.debug(`Got unknown request: ${request.method} ${request.url}`)
  response.status(500).end()
})

const apiErrorType = z.object({
  code: z.union([z.literal('DEVICE_NOT_CONNECTED')]).describe('Error code'),
  text: z.string().optional().describe('Optional error text')
})

const internalErrorType = z.object({
  code: z.literal('INTERNAL_SERVER_ERROR'),
  text: z.string().optional().describe('Optional error text')
})

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
  .guard({
    response: {
      500: internalErrorType
    }
  })
  .onError(async ({ error, status }) => {
    status(500, {
      code: 'INTERNAL_SERVER_ERROR',
      text: String(error)
    })
  })

async function runForConnections (duidOrAll: string,
  action: (connection: UniProxyConnection) => Promise<void>): Promise<void> {
  await Promise.all([...uniProxyRouter.connections.entries()
    .filter(connections => connections[0] === duidOrAll || duidOrAll === 'all')
    .map(connections => [...connections[1].values()])]
    .flat().map(connection => action(connection)))
}

apiServer.get('/devices', async () => {
  const infos = await storage.getStationInfos()
  return infos.map(info => ({
    connected: (uniProxyRouter.connections.get(info.duid)?.size ?? 0) > 0,
    duid: info.duid,
    name: info.name,
    quasarConfig: info.quasarConfig
  }))
}, {
  detail: {
    summary: 'Get list of devices',
    tags: ['device']
  },
  response: {
    200: z.array(z.object({
      connected: z.boolean().describe('Is device connected'),
      duid: z.string().describe('DUID'),
      name: z.string().describe('Name'),
      quasarConfig: quasarConfig.describe('Quasar\'s maind config')
    }))
  }
})

apiServer.post('/devices/:duid/push/text', async ({ body, params: { duid } }) => {
  await runForConnections(duid, async connection => {
    await connection.pushTts(body.eventText)
  })

  return {}
}, {
  body: t.Object({
    eventText: t.String({
      description: 'Text to be pushed to TTS'
    })
  }),
  detail: {
    summary: 'Push text to be TTSed',
    tags: ['device']
  },
  params: t.Object({
    duid: t.String({
      description: "DUID or 'all' for all devices"
    })
  }),
  response: {
    200: t.Object({})
  }
})

apiServer.post('/devices/:duid/push/raw', async ({ body, params: { duid } }) => {
  await runForConnections(duid, async connection => {
    await connection.pushRawDirectives(proto.NAlice.NAliceApi.TDirective.fromObject(body as { [k: string]: unknown }))
  })

  return {}
}, {
  body: t.Unknown({
    description: 'Raw Quasar directive'
  }),
  detail: {
    summary: 'Push raw directive to the device',
    tags: ['device']
  },
  params: t.Object({
    duid: t.String({
      description: "DUID or 'all' for all devices"
    })
  }),
  response: {
    200: t.Object({})
  }
})

apiServer.patch('/devices/:duid', async ({ body, params: { duid } }) => {
  const info = await storage.updateNameAndQuasarConfig(duid, body.name, body.quasarConfig)

  await runForConnections(duid, async connection => {
    await connection.pushDirectives(
      pushUpdateConfigDirective,
      setTimezoneDirective(info.quasarConfig.timezone.name, info.quasarConfig.timezone.offsetSeconds, true)
    )
  })

  return {
    duid: info.duid,
    name: info.name,
    quasarConfig: info.quasarConfig
  }
}, {
  body: z.object({
    name: z.string().optional().describe('Name'),
    quasarConfig: quasarConfigPatch.optional().describe('Sparse update to Quasar\'s maind config')
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
  response: {
    200: z.object({
      duid: z.string().describe('DUID'),
      name: z.string().describe('Name'),
      quasarConfig: quasarConfig.describe('Quasar\'s maind config')
    })
  }
})

apiServer.get('/devices/:duid/directives', async ({ params: { duid }, status }) => {
  const connections = uniProxyRouter.connections.get(duid)
  if (!connections) {
    return status(404, {
      code: 'DEVICE_NOT_CONNECTED'
    })
  }

  const connection = connections.values().next().value
  if (!connection) {
    return status(404, {
      code: 'DEVICE_NOT_CONNECTED'
    })
  }

  const provider = connection.getDirectiveFunctionProvider()
  return provider.getSupportedFunctions()
}, {
  detail: {
    summary: 'Get supported device directives',
    tags: ['device']
  },
  params: t.Object({
    duid: t.String({
      description: 'DUID'
    })
  }),
  response: {
    200: z.record(z.string().describe('Directive name'), z.object({
      arguments: z.unknown().describe('Arguments JSON schema'),
      description: z.string().describe('Description')
    })),
    404: apiErrorType
  }
})

apiServer.post('/devices/:duid/push', async ({ body, params: { duid }, status }) => {
  const connections = uniProxyRouter.connections.get(duid)
  if (!connections) {
    return status(404, {
      code: 'DEVICE_NOT_CONNECTED'
    })
  }

  const connection = connections.values().next().value
  if (!connection) {
    return status(404, {
      code: 'DEVICE_NOT_CONNECTED'
    })
  }

  const directives: WrappedDirective[] = []

  for (const directive of body) {
    const wrappedDirective = connection.getDirectiveFunctionProvider().convertToWrappedDirective(directive)
    if (wrappedDirective) {
      directives.push(wrappedDirective)
    }
  }

  await connection.pushDirectives(...directives)

  return {}
}, {
  body: t.Array(t.Object({
    arguments: t.Unknown({
      description: 'Arguments'
    }),
    name: t.String({
      description: 'Directive name'
    })
  }), {
    description: 'Array of directives'
  }),
  detail: {
    summary: 'Push directives to the device',
    tags: ['device']
  },
  params: t.Object({
    duid: t.String({
      description: 'DUID'
    }),
  }),
  response: {
    200: z.object({}),
    404: apiErrorType
  }
})

const stateResponse = z.record(z.string().describe('Name'), z.unknown().describe('Value')).describe('state')

apiServer.get('/devices/:duid/state', async ({ params: { duid }, status }) => {
  const connections = uniProxyRouter.connections.get(duid)
  if (!connections) {
    return status(404, {
      code: 'DEVICE_NOT_CONNECTED'
    })
  }

  const connection = connections.values().next().value
  if (!connection) {
    return status(404, {
      code: 'DEVICE_NOT_CONNECTED'
    })
  }

  const state = await connection.fetchState()

  return state.internal
}, {
  detail: {
    summary: 'Get device state',
    tags: ['device']
  },
  params: t.Object({
    duid: t.String({
      description: 'DUID'
    }),
  }),
  response: {
    200: stateResponse,
    404: apiErrorType
  }
})

const functionStateServer = new Elysia({
  adapter: node()
}).use(openapi({
  documentation: {
    info: {
      title: 'Quasar function-state-server API',
      version: '1.4.6'
    }
  },
  mapJsonSchema: {
    zod: z.toJSONSchema
  }
}))
  .guard({
    response: {
      500: internalErrorType
    }
  })
  .onError(async ({ error, status }) => {
    status(500, {
      code: 'INTERNAL_SERVER_ERROR',
      text: String(error)
    })
  })

functionStateServer.get('/state', async () => {
  return {}
}, {
  detail: {
    summary: 'Get independent state',
    tags: ['state']
  },
  response: {
    200: functionStateServerStateResponse
  }
})

functionStateServer.put('/state', async ({ body }) => {
  const totalState: Record<string, InputMetadataEntry> = {}

  const calledDeviceId = body.metadata['deviceId'] ? String(body.metadata['deviceId']) : undefined
  for (const [deviceId, connections] of uniProxyRouter.connections) {
    if (deviceId === calledDeviceId) {
      continue
    }

    const connection = connections.values().next().value

    if (!connection) {
      continue
    }

    const state = await connection.fetchState()

    for (const [key, info] of Object.entries(state.readyToUse)) {
      totalState[`other_speaker_${deviceId}_${key}`] = {
        description: `'${info.description}' for speaker with ID ${deviceId}`,
        value: info.value
      }
    }
  }

  return totalState
}, {
  body: functionStateServerGetDependantStateRequest,
  detail: {
    summary: 'Get dependent state',
    tags: ['state']
  },
  response: {
    200: functionStateServerStateResponse
  }
})

functionStateServer.get('/functions', async () => {
  return {}
}, {
  detail: {
    summary: 'Get independent functions',
    tags: ['functions']
  },
  response: {
    200: functions
  }
})

functionStateServer.put('/functions', async ({ body }) => {
  const totalFunctions: DirectiveFunctions = {}

  const calledDeviceId = body.metadata['deviceId'] ? String(body.metadata['deviceId']) : undefined

  const allFunctions: Map<string, {
    arguments: z.ZodType<unknown>,
    description: string,
    supportedDevices: Set<string>
  }> = new Map()

  const allDevics = new Set<string>()

  for (const [deviceId, connections] of uniProxyRouter.connections) {
    if (deviceId === calledDeviceId) {
      continue
    }

    allDevics.add(deviceId)

    const connection = connections.values().next().value

    if (!connection) {
      continue
    }

    const functions = connection.getDirectiveFunctionProvider().getSupportedFunctions()

    for (const [name, info] of Object.entries(functions)) {
      const existingEntry = allFunctions.get(name)
      if (existingEntry) {
        existingEntry.supportedDevices.add(deviceId)
      } else {
        allFunctions.set(name, {
          arguments: info.arguments,
          description: info.description,
          supportedDevices: new Set([deviceId])
        })
      }
    }
  }

  for (const [name, info] of allFunctions.entries()) {
    const isSupportedOnAllDevices = allDevics.size === info.supportedDevices.size

    totalFunctions[`other_${name}`] = {
      arguments: z.object({
        args: info.arguments.describe('separate args object for this call'),
        deviceId: z.string().describe('device ID to execute on or "all" if on all')
      }),
      description: `Execute '${info.description}' on other speaker (supported ${
        isSupportedOnAllDevices ? 'on all speakers' : `only on ${[...info.supportedDevices].join(', ')} speakers`})`
    }
  }

  totalFunctions['other_smart_speaker_tts'] = {
    arguments: z.object({
      deviceId: z.string().describe('device ID to execute on or "all" if on all'),
      text: z.string().describe('text to speak')
    }),
    description: 'Say some text on other speaker (supported on all speakers)'
  }

  return Object.fromEntries(Object.entries(totalFunctions)
    .map(entry => ([entry[0], {
      arguments: entry[1].arguments.toJSONSchema(),
      description: entry[1].description,
      hasResponse: false
    }])))
}, {
  body: functionStateServerGetDependantFunctionsRequest,
  detail: {
    summary: 'Get dependent functions',
    tags: ['functions']
  },
  response: {
    200: functions
  }
})

functionStateServer.post('/functions', async ({ body }) => {
  const fromDeviceId = body.metadata['deviceId'] ? String(body.metadata['deviceId']) : undefined

  const calledDeviceId = String(body.arguments['deviceId'])

  logger.info(`Received function call to '${calledDeviceId}' from '${fromDeviceId}': ${body.name}`)

  if (!calledDeviceId || calledDeviceId === fromDeviceId) {
    return {}
  }

  await runForConnections(calledDeviceId, async connection => {
    if (connection.getDeviceId() === fromDeviceId && calledDeviceId === 'all') {
      return
    }

    if (body.name === 'other_smart_speaker_tts') {
      await connection.pushTts(String(body.arguments.text))
      return
    }

    const directive = connection.getDirectiveFunctionProvider()
      .convertToWrappedDirective({
        arguments: body.arguments['args'],
        name: body.name.replace(/^other_/, '')
      })
    if (!directive) {
      return
    }
    await connection.pushDirectives(directive)
  })

  return {}
}, {
  body: functionStateServerCallFunctionRequest,
  detail: {
    summary: 'Call function',
    tags: ['functions']
  },
  response: {
    200: functionStateServerCallFunctionResponse
  }
})

try {
  functionStateServer.listen(environment.FUNCTION_STATE_SERVER_PORT, () => {
    logger.info(`Started function-state-server on :${environment.FUNCTION_STATE_SERVER_PORT}`)
  })
} catch (error) {
  logger.error(`function-state-server failed to start on :${environment.FUNCTION_STATE_SERVER_PORT}: ${error}`)
}

try {
  apiServer.listen(environment.API_PORT, () => {
    logger.info(`Started API on :${environment.API_PORT}`)
  })
} catch (error) {
  logger.error(`API failed to start on :${environment.API_PORT}: ${error}`)
}

process.removeAllListeners('SIGINT')

process.on('SIGINT', () => {
  logger.info('Stopping...')
  server.close()
  if (functionStateServer.server) {
    functionStateServer.stop()
  }
  if (apiServer.server) {
    apiServer.stop()
  }
  logger.info('Stopped')
})
