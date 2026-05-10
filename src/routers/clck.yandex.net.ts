import { Application, Router } from 'express'

export function registerClckYandexNetRouter (app: Application): void {
  const router = Router()

  router.post('/quasar_metrics/write/batch', (_, response) => {
    response.status(500).end()
  })

  app.use('/clck.yandex.net', router)
}
