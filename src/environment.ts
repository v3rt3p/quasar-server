import { config } from 'dotenv'
import { randomBytes } from 'node:crypto'
import { z } from 'zod'

config({
  path: '.env.local'
})

config()

const environmentType = z.intersection(z.object({
  ALLOW_UPDATES: z.string().transform(value => value.toLowerCase().trim() === 'true'),

  API_PORT: z.string().default('31116').transform(value => Number.parseInt(value)),

  AUDIO_METADATA_URLS: z.string().default('').transform(urls => urls.split(',').filter(Boolean)),

  FUNCTION_STATE_SERVER_PORT: z.string().default('31114').transform(value => Number.parseInt(value)),

  GLAGOL_JWT_KEY: z.string().default(randomBytes(16).toString('hex')),

  MUSIC_SERVICE_BASIC_URL: z.url().optional(),

  PORT: z.string().default('31115').transform(value => Number.parseInt(value)),

  PROCESSOR_BASIC_URL: z.url().default('http://localhost:8080'),

  SENTRY_DSN: z.url().default('https://test@o0.ingest.sentry.io/0'),
  STT_GIGAAM_URL: z.url().default('ws://10.0.3.137:8080'),
  TTS_OPENAI_API_KEY: z.string().default(''),
  TTS_OPENAI_BASE_URL: z.url().default('http://10.0.3.137:8000'),
  TTS_OPENAI_MODEL: z.string().default(''),

  TTS_OPENAI_SPEED: z.string().default('1').transform(Number),

  TTS_OPENAI_VOICE: z.string().default('IVONA 2 Tatyana OEM'),

  UPDATES_CONFIG_PATH: z.string().optional()
}), z.union([z.object({
  POSTGRES_URL: z.url()
}), z.object({
  SQLITE_PATH: z.string()
})]))

export type Environment = z.infer<typeof environmentType>

export function getEnvironment (): Environment {
  return environmentType.parse(process.env)
}
