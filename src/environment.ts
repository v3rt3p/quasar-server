import { config } from 'dotenv'
import { randomBytes } from 'node:crypto'
import { z } from 'zod'

config({
  path: '.env.local'
})

config()

const environmentType = z.object({
  API_PORT: z.string().default('31116').transform(value => Number.parseInt(value)),

  AUDIO_METADATA_URLS: z.string().default('').transform(urls => urls.split(',').filter(Boolean)),

  GLAGOL_JWT_KEY: z.string().default(randomBytes(16).toString('hex')),

  PORT: z.string().default('31115').transform(value => Number.parseInt(value)),

  POSTGRES_URL: z.url().default('postgres://quasar:quasar@localhost/quasar'),

  PROCESSOR_BASIC_URL: z.url().default('http://localhost:8080'),

  SENTRY_DSN: z.url().default('https://test@o0.ingest.sentry.io/0'),

  STT_GIGAAM_URL: z.url().default('ws://10.0.3.137:8080'),

  TTS_OPENAI_API_KEY: z.string().default(''),
  TTS_OPENAI_BASE_URL: z.url().default('http://10.0.3.137:8000'),
  TTS_OPENAI_MODEL: z.string().default(''),
  TTS_OPENAI_SPEED: z.string().default('1').transform(Number),
  TTS_OPENAI_VOICE: z.string().default('IVONA 2 Tatyana OEM')
})

export type Environment = z.infer<typeof environmentType>

export function getEnvironment (): Environment {
  return environmentType.parse(process.env)
}
