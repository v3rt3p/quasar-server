import { Application, Router } from 'express'

export function registerClckYandexNetRouter (app: Application): void {
  const router = Router()

  router.post('/quasar_metrics/write/batch', (_, response) => {
    response.status(200).end(Buffer.from([0x0A, 0x02, 0x4F, 0x4B]))
  })

  router.post('/quasar_metrics/write/json/batch', (_, response) => {
    response.status(500).end()
  })

  router.post('/smart_display_errors/write/json/batch', (request, response) => {
    const body = request.body
    if (Array.isArray(body)) {
      response.status(200).json(Array.from({ length: body.length }).map(() => ({ ResponseStatus: 'OK' })))
      return
    }
    response.status(500).end()
  })

  router.post('/quasar/write/json/batch', (request, response) => {
    const body = request.body
    if (Array.isArray(body)) {
      response.status(200).json(Array.from({ length: body.length }).map(() => ({ ResponseStatus: 'OK' })))
      return
    }
    response.status(500).end()
  })

  app.use('/clck.yandex.net', router)
}
