import { Application, Router } from 'express'
import path from 'node:path'
import sharp from 'sharp'

import { getLogger } from '../logger'

const logger = getLogger()

export function registerQuasarV3rt3pRouter (app: Application): void {
  const router = Router()

  router.get('/logo.png', (_, response) => {
    response.sendFile(path.join(process.cwd(), 'brand-kit/images/logo.png'))
  })

  router.get('/blur/:imageUrl', async (request, response) => {
    try {
      const imageUrl = Buffer.from(
        request.params.imageUrl,
        'base64url'
      ).toString('utf8')

      const url = new URL(imageUrl)

      if (!['http:', 'https:'].includes(url.protocol)) {
        return response.status(400).send('Invalid image URL')
      }

      const upstream = await fetch(url, {
        signal: AbortSignal.timeout(10_000),
      })

      if (!upstream.ok) {
        return response.status(502).send('Failed to fetch image')
      }

      if (!upstream.headers.get('content-type')?.startsWith('image/')) {
        return response.status(415).send('Unsupported content type')
      }

      const image = Buffer.from(await upstream.arrayBuffer())

      const processed = await sharp(image)
        .blur(80)
        .modulate({ brightness: 0.5 })
        .png()
        .toBuffer()

      response.set('Content-Type', 'image/png')
      return response.send(processed)
    } catch (error) {
      logger.error('Image processing failed:', error)
      return response.status(500).send('Image processing failed')
    }
  })

  router.use((_, response) => {
    response.status(404).end()
  })

  app.use('/quasar.v3rt3p', router)
}
