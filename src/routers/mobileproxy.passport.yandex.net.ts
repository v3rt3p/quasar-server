import bodyParser from 'body-parser'
import { Application, Router } from 'express'
import { createHash } from 'node:crypto'

import { getLogger } from '../logger'

const logger = getLogger()

export function registerMobileproxyPassportYandexNetRouter (app: Application): void {
  const router = Router()

  router.use(bodyParser.urlencoded({
    limit: '10mb'
  }))

  router.post('/1/token', (request, response) => {
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

  router.get('/1/bundle/account/short_info', (_request, response) => {
    response.status(200).json({
      avatar_url: 'https://avatars.mds.yandex.net/get-yapic/53031/0s-5/islands-300',
      birthday: '1984-01-01',
      display_login: 'YandexStationOwnerNo146',
      display_name: 'YandexStationOwnerNo146',
      filter_params: {
        subtype: ['portal']
      },
      firstname: 'Owner',
      gender: 'm',
      has_cards: true,
      has_family: true,
      has_password: true,
      has_plus: true,
      has_telemost: true,
      have_webauthn_credential: true,
      is_browser_account: true,
      is_rfc_2fa_enabled: true,
      lastname: 'No146',
      location_id: 0,
      machine_readable_login: 'YandexStationOwnerNo146',
      master_members: [{
        avatar_url: 'https://avatars.mds.yandex.net/get-yapic/53031/0s-5/islands-300',
        display_login: 'YandexStationOwnerNo146',
        has_cards: true,
        has_family: true,
        has_plus: true,
        has_telemost: true,
        is_browser_account: true,
        plus_card: true,
        primary_alias_type: 1,
        public_name: 'Owner No146',
        secure_phone_number: '+78005553535',
        uid: 10_146_228
      }],
      master_uid: 1_234_567_228,
      native_default_email: 'yandexowner@yandex.ru',
      normalized_display_login: 'YandexStationOwnerNo146',
      partitions: ['default'],
      plus_card: true,
      primary_alias_type: 1,
      public_id: 'oj4bx3cwbowdyz4eb5lt1v0z7v',
      public_name: 'Owner No146',
      secure_phone_number: '+78005553535',
      status: 'ok',
      uid: 10_146_228,
      x_token_client_id: 'ef0e663c4b4d38debd41f76ed511e73f',
      x_token_issued_at: Math.round(Date.now() / 1000),
      xtoken_has_muid: true
    })
  })

  app.use('/mobileproxy.passport.yandex.net', router)
}
