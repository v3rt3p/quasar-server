import bodyParser from 'body-parser'
import { Application, Router } from 'express'
import { createHash } from 'node:crypto'

import { getLogger } from '../logger'

const logger = getLogger()

export function registerOAuthYandexRuRouter (app: Application): void {
  const router = Router()

  router.use(bodyParser.urlencoded({
    limit: '10mb'
  }))

  router.post('/token', (request, response) => {
    logger.debug(`OAuth /token: ${JSON.stringify(request.body)}`)

    const grantType = String(request.body.grant_type)
    if (grantType === 'authorization_code') {
      const code = String(request.body.code)
      const deviceId = String(request.body.device_id)
      response.status(200).json({
        access_token: `VAT.${createHash('sha256').update('access').update(code).update(deviceId).digest('hex')}`,
        expires_in: 365 * 10 * 24 * 60 * 60,
        refresh_token: `VRT.${createHash('sha256').update('refresh').update(code).update(deviceId).digest('hex')}`,
        token_type: 'bearer'
      })
      return
    }
    if (grantType === 'x-token') {
      const accessToken = String(request.body.access_token)
      response.status(200).json({
        access_token: accessToken,
        expires_in: 365 * 10 * 24 * 60 * 60,
        token_type: 'bearer',
        uid: 10_146_228
      })
      return
    }
    response.status(500).end()
  })

  app.use('/oauth.yandex.ru', router)
}
