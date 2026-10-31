import { format } from 'date-fns'
import { Application, Router } from 'express'

export function registerPlayGoogleapisComRouter (app: Application): void {
  const router = Router()

  router.get('/generate_204', (_, response) => {
    response.status(204).header({
      'Cross-Origin-Resource-Policy': 'cross-origin',
      Date: format(new Date(), "EEE, dd MMM yyyy HH:mm:ss 'GMT'")
    }).end()
  })

  router.use((_, response) => {
    response.status(404).end()
  })

  app.use('/play.googleapis.com', router)
}
