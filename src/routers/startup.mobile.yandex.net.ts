import { Application, Router } from 'express'
import { randomBytes } from 'node:crypto'

export function registerStartupMobileYandexNetRouter (app: Application): void {
  const router = Router()

  router.get('/analytics/startup', (_, response) => {
    response.status(200).json({
      device_id: {
        hash: Math.random().toFixed(10).split('.')[1]
      },
      query_hosts: {
        list: {
          apple_tracking: {
            urls: [
              'https://tracking.appmetrica.yandex.net'
            ]
          },
          check_updates: {
            urls: [
              'https://analytics.mobile.yandex.net'
            ]
          },
          diagnostic: {
            urls: [
              'https://report.appmetrica.yandex.net'
            ]
          },
          location: {
            urls: [
              'https://rosenberg.appmetrica.yandex.net'
            ]
          },
          mediascope: {
            urls: [
              'https://zen.report.appmetrica.yandex.net'
            ]
          },
          redirect: {
            urls: [
              'https://redirect.appmetrica.yandex.com'
            ]
          },
          report: {
            urls: [
              'https://report.appmetrica.yandex.net'
            ]
          },
          ssl_pinning: {
            urls: [
              'https://certificate.mobile.yandex.net'
            ]
          },
          startup: {
            urls: [
              'https://startup.mobile.yandex.net'
            ]
          }
        }
      },
      uuid: {
        value: randomBytes(16).toString('hex')
      }
    })
  })

  app.use('/startup.mobile.yandex.net', router)
}
