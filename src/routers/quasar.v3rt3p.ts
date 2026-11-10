import { Application, Router } from 'express'
import path from 'node:path'

export function registerQuasarV3rt3pRouter (app: Application): void {
  const router = Router()

  router.get('/logo.png', (_, response) => {
    response.sendFile(path.join(process.cwd(), 'brand-kit/images/logo.png'))
  })

  router.use((_, response) => {
    response.status(404).end()
  })

  app.use('/quasar.v3rt3p', router)
}
