export function toStringOrUndefined (value: unknown): string | undefined {
  return value === undefined || value === null ? undefined : String(value)
}
