import { Application, Router } from 'express'

export function registerReportAppMetricaYandexNetRouter (app: Application): void {
  const router = Router()

  router.post('/report', (_, response) => {
    response.status(500).end()
  })

  app.use('/report.appmetrica.yandex.net', router)
}
