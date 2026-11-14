export function getBlurredUrl (url: string | undefined): string | undefined {
  if (!url) {
    return undefined
  }
  return `https://quasar.v3rt3p/blur/${Buffer.from(url).toString('base64url')}`
}

export function toStringOrUndefined (value: unknown): string | undefined {
  return value === undefined || value === null ? undefined : String(value)
}
