import { Server } from 'node:http'
import { Server as WSServer } from 'ws'

import { getLogger } from '../logger'
import { UniProxyConnection, UniProxyConnectionParameters } from './uniproxy/uniproxy-connection'

const logger = getLogger()

interface UniProxyRouter {
  connections: Map<string, Set<UniProxyConnection>>
}

export function registerUniproxyAliceYandexNetRouter (parameters: UniProxyConnectionParameters,
  server: Server): UniProxyRouter {
  const wsServer = new WSServer({ noServer: true })

  server.on('upgrade', (request, socket, head) => {
    if (request.url === '/uniproxy.alice.yandex.net/uni.ws') {
      wsServer.handleUpgrade(request, socket, head, client => {
        wsServer.emit('connection', client, request)
      })
    }
  })

  const router: UniProxyRouter = {
    connections: new Map()
  }

  wsServer.on('connection', (websocket, request) => {
    logger.debug('Got WebSocket connection')

    const deviceId = String(request.headers['x-uprx-device-id']) ?? 'unknown'
    if (!router.connections.has(deviceId)) {
      router.connections.set(deviceId, new Set())
    }

    const set = router.connections.get(deviceId)
    if (!set) {
      throw new Error('wut?')
    }

    const connection = new UniProxyConnection(websocket, parameters)
    websocket.on('close', () => {
      set.delete(connection)
      logger.warn('UniProxy WebSocket closed')
    })
    websocket.on('error', error => {
      set.delete(connection)
      logger.warn(`UniProxy WebSocket error: ${error}`)
    })
    set.add(connection)
  })

  return router
}
