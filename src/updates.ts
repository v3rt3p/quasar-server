import yaml from 'js-yaml'
import { readFileSync } from 'node:fs'
import z from 'zod'

const updatesConfigType = z.object({
  updates: z.record(z.string(), z.object({
    crc32: z.number(),
    downloadUrl: z.string(),
    fallbackUrl: z.string().optional(),
    md5Hash: z.string().optional(),
    size: z.number().optional(),
    tvVersion: z.string().optional(),
    updateId: z.string(),
    version: z.string()
  }))
})

export type UpdatesConfig = z.infer<typeof updatesConfigType>

export function loadUpdatesConfig (path: string): UpdatesConfig {
  return updatesConfigType.parse(yaml.load(readFileSync(path).toString('utf8')))
}
