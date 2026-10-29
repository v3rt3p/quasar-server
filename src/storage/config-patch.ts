import z from 'zod'

import { QuasarConfig, quasarConfig } from './types'

export type QuasarConfigPatch = DeepPartial<QuasarConfig>

type DeepPartial<T> = T extends unknown[] ? T : T extends object ? {
  [K in keyof T]?: DeepPartial<T[K]>
} : T

function patchSchema (schema: z.ZodType, partialObjects = true): z.ZodType {
  const result = rebuildPatchSchema(schema, partialObjects)
  const meta = schema.meta()
  return meta ? result.meta(meta) : result
}

function rebuildPatchSchema (schema: z.ZodType, partialObjects: boolean): z.ZodType {
  if (schema instanceof z.ZodDefault) {
    return patchSchema(schema.unwrap() as z.ZodType, partialObjects)
  }

  if (schema instanceof z.ZodOptional) {
    return patchSchema(schema.unwrap() as z.ZodType, partialObjects).optional()
  }

  if (schema instanceof z.ZodNullable) {
    return patchSchema(schema.unwrap() as z.ZodType, partialObjects).nullable()
  }

  if (schema instanceof z.ZodObject) {
    return z.object(Object.fromEntries(Object.entries(schema.shape).map(([key, child]) => {
      const transformed = patchSchema(child as z.ZodType, partialObjects)
      return [key, partialObjects ? transformed.optional() : transformed]
    })))
  }

  if (schema instanceof z.ZodArray) {
    return z.array(patchSchema(schema.element as z.ZodType, false))
  }

  if (schema instanceof z.ZodRecord) {
    return z.record(schema.keyType, patchSchema(schema.valueType as z.ZodType, partialObjects))
  }

  if (schema instanceof z.ZodUnion) {
    const options = schema.options as z.ZodType[]
    if (partialObjects && options.every(option => option instanceof z.ZodObject)) {
      const fields = new Map<string, z.ZodType[]>()
      for (const option of options) {
        for (const [key, child] of Object.entries((option as z.ZodObject).shape)) {
          const variants = fields.get(key) ?? []
          variants.push(patchSchema(child as z.ZodType, partialObjects))
          fields.set(key, variants)
        }
      }
      return z.object(Object.fromEntries([...fields].map(([key, variants]) => [
        key, z.union(variants).optional()
      ])))
    }
    return z.union(options.map(option => patchSchema(option, partialObjects)))
  }

  return schema
}

export const quasarConfigPatch = patchSchema(quasarConfig) as z.ZodType<QuasarConfigPatch>

export function mergeQuasarConfig (existing: unknown, patch: QuasarConfigPatch): QuasarConfig {
  return quasarConfig.parse(mergeValues(quasarConfig.parse(existing), quasarConfigPatch.parse(patch)))
}

function isObject (value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function mergeValues (existing: unknown, patch: unknown): unknown {
  if (!isObject(patch)) {
    return patch
  }

  const base = isObject(existing) ? existing : {}
  return Object.fromEntries([
    ...Object.entries(base),
    ...Object.entries(patch)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, mergeValues(Object.hasOwn(base, key) ? base[key] : undefined, value)])
  ])
}
