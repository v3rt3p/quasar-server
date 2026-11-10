import bodyParser from 'body-parser'
import { Application, RequestHandler, Router } from 'express'
import { randomUUID } from 'node:crypto'
import { Writer } from 'protobufjs'

import { toStringOrUndefined } from '../helpers'
import { getLogger } from '../logger'
import proto from '../protos/protos'
import { StationInfoProvider } from '../storage/types'

interface ProtoEncoderDecoder<T> {
  decode(data: Uint8Array): T
  encode(data: T): Writer
}

interface RpcAliceYandexNetRouterProperties {
  infoProvider: StationInfoProvider
}

export function registerRpcAliceYandexNetRouter (app: Application,
  properties: RpcAliceYandexNetRouterProperties): void {
  const router = Router()

  router.use(bodyParser.raw({
    type: 'application/x-protobuf'
  }))

  router.post('/gproxy/push_events_batch',
    wrapProto(proto.NAlice.TIoTEventsBatchRequest, proto.NAlice.TIoTEventsBatchResponse,
      async () => ({})
    )
  )

  router.post('/gproxy/get_tv_categories',
    wrapProto(proto.NAlice.NTv.TGetTvCategoriesRequest, proto.NAlice.NTv.TGetTvCategoriesResponse,
      async () => ({})
    )
  )

  router.post('/gproxy/get_tv_channels',
    wrapProto(proto.NAlice.NTv.TTvGetChannelsRequest, proto.NAlice.NTv.TTvGetChannelsResponse,
      async () => ({})
    )
  )

  const cardJson = {
    card: {
      log_id: 'v3rt3p_promoblock_' + randomUUID(),
      states: [{
        div: {
          alignment_horizontal: 'center',
          alignment_vertical: 'center',
          background: [{ color: '#000000', type: 'solid' }],
          height: { type: 'match_parent' },
          items: [{
            alignment_horizontal: 'center',
            alignment_vertical: 'center',
            height: { type: 'fixed', value: 1000 },
            image_url: 'https://quasar.v3rt3p/logo.png',
            scale: 'fit',
            type: 'image',
            width: { type: 'fixed', value: 250 }
          }],
          orientation: 'overlap',
          type: 'container',
          width: { type: 'match_parent' }
        },
        state_id: 0
      }]
    },
    templates: {}
  }

  router.post('/gproxy/get_gallery',
    wrapProto(proto.NAlice.NTv.TGetGalleryRequest, proto.NAlice.NTv.TTvCarouselResultData,
      async () => ({})
    )
  )

  router.post('/gproxy/get_galleries',
    wrapProto(proto.NAlice.NTv.TGetGalleriesRequest, proto.NAlice.NTv.TTvFeedResultData,
      async () => ({
        Carousels: [{
          DivCarousel: {
            DivCardJson: {
              StringBody: JSON.stringify(cardJson)
            },
            ElementsCount: 1,
            Id: 'promoblock',
            Title: 'v3rt3p'
          }
        }],
        TtlInfo: {
          HasTtl: true,
          TtlMillis: 5000
        }
      })
    )
  )

  router.post('/gproxy/get_tv_promo_phrases',
    wrapProto(proto.NAlice.NSmartTv.TGetTvPromoPhrasesRequest, proto.NAlice.NSmartTv.TGetTvPromoPhrasesResponse,
      async () => ({})
    )
  )

  router.post('/gproxy/search',
    wrapProto(proto.NAlice.TTvSearchRequest, proto.NAlice.TTvSearchResultData,
      async () => ({})
    )
  )

  router.post('/gproxy/get_search_suggests',
    wrapProto(proto.NAlice.NTv.TGetSearchSuggestsRequest, proto.NAlice.NTv.TGetSearchSuggestsResponse,
      async () => ({})
    )
  )

  router.post('/gproxy/get_app_store_promo',
    wrapProto(proto.NAlice.NTv.TAppStorePromoRequest, proto.NAlice.NTv.TAppStorePromoResponse,
      async () => ({})
    )
  )

  router.post('/gproxy/get_app_catalog',
    wrapProto(proto.NAlice.NTv.NSmartDeviceExternalApp.TGetAppCatalogRequest,
      proto.NAlice.NTv.NSmartDeviceExternalApp.TGetAppCatalogResponse,
      async () => ({})
    )
  )

  router.post('/gproxy/app_catalog_search',
    wrapProto(proto.NAlice.NTv.NSmartDeviceExternalApp.TAppCatalogSearchRequest,
      proto.NAlice.NTv.NSmartDeviceExternalApp.TAppCatalogSearchResponse,
      async () => ({})
    )
  )

  router.post('/gproxy/get_auth_suggests',
    wrapProto(proto.NAlice.TGetAuthSuggestsRequest, proto.NAlice.TGetAuthSuggestsResponse,
      async () => ({})
    )
  )

  router.post('/gproxy/get_screen_hints_v2',
    wrapProto(proto.NAlice.NTv.TGetScreenHintsV2Request, proto.NAlice.NTv.TGetScreenHintsV2Response,
      async () => ({})
    )
  )

  router.post('/gproxy/get_screensaver_themes',
    wrapProto(proto.NAlice.NTv.TGetScreensaverThemesRequest, proto.NAlice.NTv.TGetScreensaverThemesResponse,
      async (deviceId, platform) => {
        if (!deviceId || !platform) {
          return {}
        }

        const info = await properties.infoProvider.getInfo(deviceId, platform)

        return {
          CurrentTheme: info.quasarConfig.gproxyRpcConfig.screensaver,
          Themes: []
        }
      }
    )
  )

  router.post('/gproxy/save_screensaver_theme',
    wrapProto(proto.NAlice.NTv.TSaveScreensaverThemeRequest, proto.NAlice.NTv.TSaveScreensaverThemeResponse,
      async (deviceId, platform, request) => {
        if (!deviceId || !platform || !request.Id) {
          return {}
        }

        await properties.infoProvider.updateNameAndQuasarConfig(deviceId, undefined, {
          gproxyRpcConfig: {
            screensaver: request.Id
          }
        })

        return {
          Success: {}
        }
      }
    )
  )

  app.use('/rpc.alice.yandex.net', router)
}

const logger = getLogger()

function wrapProto<TRequest, TResponse> (
  requestProto: ProtoEncoderDecoder<TRequest>, responseProto: ProtoEncoderDecoder<TResponse>,
  handler: (deviceId: string | undefined, platform: string | undefined,
    request: TRequest) => Promise<TResponse>): RequestHandler {
  return (request, response) => {
    logger.debug(`Handling RPC request to ${request.path}`)

    const raw = request.body
    if (!raw) {
      response.status(400).end()
      return
    }

    const deviceId = toStringOrUndefined(request.headers['x-ya-device-id'])
    const platform = toStringOrUndefined(request.headers['x-ya-platform'])
    handler(deviceId, platform, requestProto.decode(raw))
      .then(responseBody => {
        response.status(200).header({
          'content-type': 'application/x-protobuf'
        }).send(responseProto.encode(responseBody).finish())
      })
      .catch(error => {
        logger.warn(`failed to handle gproxy: ${error}`)
        response.status(500).end()
      })
  }
}
