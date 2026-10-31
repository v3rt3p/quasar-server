import { Application, Router } from 'express'

export function registerReportAppMetricaYandexNetRouter (app: Application): void {
  const router = Router()

  router.post('/report', (request, response) => {
    console.info(request.body.toString('utf8'))
    response.status(200).json({
      status: 'accepted'
    })
  })

  app.use('/report.appmetrica.yandex.net', router)
}
