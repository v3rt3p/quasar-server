import bodyParser from 'body-parser'
import { Application, RequestHandler, Router } from 'express'
import { Writer } from 'protobufjs'

import { getLogger } from '../logger'
import proto from '../protos/protos'

interface ProtoEncoderDecoder<T> {
  decode(data: Uint8Array): T
  encode(data: T): Writer
}

export function registerRpcAliceYandexNetRouter (app: Application): void {
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

  router.post('/gproxy/get_galleries',
    wrapProto(proto.NAlice.NTv.TGetGalleriesRequest, proto.NAlice.NTv.TTvFeedResultData,
      async () => ({
        Carousels: [
          {
            HomeCarousel: {
              Id: 'promoblock',
              Items: [],
              Title: 'v3rt3p'
            }
          }
        ]
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

  app.use('/rpc.alice.yandex.net', router)
}

const logger = getLogger()

function wrapProto<TRequest, TResponse> (
  requestProto: ProtoEncoderDecoder<TRequest>, responseProto: ProtoEncoderDecoder<TResponse>,
  handler: (deviceId: string, request: TRequest) => Promise<TResponse>): RequestHandler {
  return (request, response) => {
    const raw = request.body
    if (!raw) {
      response.status(400).end()
      return
    }

    const deviceId = String(request.headers['x-ya-device-id'] ?? 'unknown')
    handler(deviceId, requestProto.decode(raw))
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
