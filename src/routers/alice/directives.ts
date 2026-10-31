import { MusicTrack } from '@v3rt3p/types/music'
import { randomUUID } from 'node:crypto'
import z from 'zod'

import { getLogger } from '../../logger'
import { encodeProtobufStruct } from '../../protobuf'
import proto from '../../protos/protos'
import { InputMetadata } from '../uniproxy/input-handler'

export interface DirectiveCallData {
  arguments: unknown,
  name: string,
}

export type DirectiveFunctionHandler<T> = (argument: T, metadata: InputMetadata) => WrappedDirective

export interface DirectiveFunctionProvider {
  convertToWrappedDirective(call: DirectiveCallData, metadata: InputMetadata): null | WrappedDirective
  getSupportedFunctions(): DirectiveFunctions
}

export type DirectiveFunctions = Record<string, {
  arguments: z.ZodType<unknown>,
  description: string
}>

export type InternalDirective = MusicDirective<'next_track'> | MusicDirective<'play'> | MusicDirective<'previous_track'> |
  MusicDirective<'recover_next_track'> | MusicDirective<'stop'> | MusicRecoverCommitDirective |
  SimplePayloadRawInternalDirective<'set_location'> | SimplePayloadRawInternalDirective<'set_timezone'>

export type MusicDirective<T extends string> = SimpleInternalDirective<`music_${T}`>

export interface MusicRecoverCommitDirective extends MusicDirective<'recover_commit'> {
  recoverCommitToken: string
}

export type RawDirective = proto.NAlice.NAliceApi.ITDirective

export interface SimpleInternalDirective<T extends string> {
  type: T
}

export interface SimplePayloadRawInternalDirective<T extends string> extends SimpleInternalDirective<T> {
  isPayloadRaw: boolean
}

export interface WrappedDirective {
  internalDirective?: InternalDirective
  quasarDirective?: RawDirective
}

export class AbstractDirectiveFunctionProvider implements DirectiveFunctionProvider {
  private readonly functionHandlerMap: Map<string, {
    description: string
    handler: DirectiveFunctionHandler<unknown>
    schema: z.ZodType<unknown>
  }> = new Map()

  private readonly logger = getLogger<AbstractDirectiveFunctionProvider>()

  convertToWrappedDirective (call: DirectiveCallData, metadata: InputMetadata): null | WrappedDirective {
    this.logger.info(`Converting directive '${call.name}' from '${JSON.stringify(call.arguments)}'`)
    const name = call.name.replace(/^smart_speaker_/, '')

    const handler = this.functionHandlerMap.get(name)
    if (!handler) {
      this.logger.warn(`directive function '${name}' not found`)
      return null
    }

    try {
      return handler.handler(handler.schema.parse(call.arguments), metadata)
    } catch (error) {
      this.logger.warn('failed to convert to directive', error)
    }

    return null
  }

  getSupportedFunctions (): DirectiveFunctions {
    return Object.fromEntries([...this.functionHandlerMap.entries()].map(
      (item) => [`smart_speaker_${item[0]}`, {
        arguments: item[1].schema,
        description: item[1].description
      }]))
  }

  protected addFunction<T>(name: string, description: string,
    schema: z.ZodType<T>, handler: DirectiveFunctionHandler<T>): void {
    if (this.functionHandlerMap.has(name)) {
      throw new Error(`directive function handler with name '${name}' already registered`)
    }
    this.functionHandlerMap.set(name, {
      description,
      handler: handler as DirectiveFunctionHandler<unknown>,
      schema
    })
  }
}

export const pushUpdateConfigDirective = {
  quasarDirective: {
    Name: 'push_update_config',
    Type: 'client_action'
  }
}

export const ttsPlayPlaceholderDirective = (onFinish?: proto.NAlice.NAliceApi.TDirective.ITOnFinishEvent) => ({
  quasarDirective: {
    AnalyticsType: 'tts_play_placeholder',
    IsLedSilent: true,
    Name: 'tts_play_placeholder',
    Payload: encodeProtobufStruct({
      channel: 'Dialog'
    }),
    Type: 'client_action',
    ...(onFinish
      ? {
          OnFinish: onFinish
        }
      : {})
  }
})

export const mmSemanticFrame = (isLedSilent: boolean,
  payload?: proto.google.protobuf.IStruct, payloadRaw?: Buffer) => ({
  quasarDirective: {
    IsLedSilent: isLedSilent,
    Name: '@@mm_semantic_frame',
    Payload: payload,
    PayloadRaw: payloadRaw,
    Type: 'server_action'
  }
})

export const audioPlayDirective = (track: MusicTrack, offsetMs?: number, recoverCommitToken?: string) => ({
  quasarDirective: {
    Name: 'audio_play',
    Payload: encodeProtobufStruct({
      background_mode: 'Ducking',
      callbacks: recoverCommitToken
        ? {
            on_started: {
              payload: {
                music: {
                  recoverCommitToken,
                  type: 'recoverCommit'
                }
              }
            }
          }
        : {},
      screen_type: 'Music',
      stream: {
        format: track.format,
        ...(offsetMs ? { offset_ms: offsetMs } : {}),
        id: randomUUID(),
        type: 'Track',
        url: track.url
      },
    }),
    Type: 'client_action'
  }
})

export const stackRecoverNextTrackDirective = {
  quasarDirective: {
    Name: '@@mm_stack_engine_get_next',
    Payload: encodeProtobufStruct({
      music: {
        type: 'fetchNextTrack'
      }
    }),
    Type: 'server_action'
  }
}

export const setTimezoneDirective = (name: string, offsetSeconds: number, isPayloadRaw: boolean) => ({
  quasarDirective: {
    Name: 'set_timezone',
    ...(isPayloadRaw
      ? {
          PayloadRaw: proto.NAlice.TGeoSyncCapability.TSetTimezoneDirective.encode({
            Name: 'set_device_timezone_directive',
            Timezone: {
              OffsetSeconds: offsetSeconds,
              TimezoneName: name
            }
          }).finish()
        }
      : {
          Payload: encodeProtobufStruct({
            next_timezone: null,
            timezone: {
              offset_seconds: offsetSeconds,
              timezone_name: name
            }
          }),
        }),
    Type: 'client_action'
  }
})

export const setLocationDirective = (longitude: number, latitude: number, isPayloadRaw: boolean) => ({
  quasarDirective: {
    Name: 'set_location',
    ...(isPayloadRaw
      ? {
          PayloadRaw: proto.NAlice.TGeoSyncCapability.TSetLocationDirective.encode({
            Location: {
              Latitude: latitude,
              Longitude: longitude
            },
            Name: 'set_device_location_directive'
          }).finish()
        }
      : {
          Payload: encodeProtobufStruct({
            laas_real_location: null,
            location: {
              latitude,
              longitude
            }
          }),
        }),
    Type: 'client_action'
  }
})
