import { Application, Router } from 'express'

export function registerScbhYandexNetRouter (app: Application): void {
  const router = Router()

  router.get('/generate_204', (_, response) => {
    response.status(204).header({
      'X-Start-Time': Math.round(Date.now() * 1000).toFixed(0)
    }).end()
  })

  router.use((_, response) => {
    response.status(404).end()
  })

  app.use('/scbh.yandex.net', router)
}
