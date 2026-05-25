import { Directive } from '@v3rt3p/types/directives'

import { encodeProtobufStruct } from '../../protobuf'
import proto from '../../protos/protos'

type TDirective = proto.NAlice.NAliceApi.ITDirective

const TProcessIncomingCallDirectiveClass = proto.NAlice.TPhoneCallsCapability.TProcessIncomingCallDirective

export type InternalQuasarDirective = {
  data: MMSemanticFrameData | ProcessIncomingCallData | PushUpdateConfigData | TtsPlayPlaceholderData
  type: 'internalQuasar',
}

export interface ProcessIncomingCallData {
  callId: string;
  type: 'processIncomingCall'
}

export interface PushUpdateConfigData {
  type: 'pushUpdateConfig'
}

export type QuasarDirective = Directive | InternalQuasarDirective

export interface TtsPlayPlaceholderData {
  onFinish?: proto.NAlice.NAliceApi.TDirective.ITOnFinishEvent
  type: 'ttsPlayPlaceholder'
}

export const soundLouderDirective = {
  AnalyticsType: 'sound_louder',
  IsLedSilent: true,
  Name: 'sound_louder',
  Payload: {},
  Type: 'client_action'
}

export const soundQuieterDirective = {
  AnalyticsType: 'sound_quiter',
  IsLedSilent: true,
  Name: 'sound_quiter',
  Payload: {},
  Type: 'client_action'
}

export const bluetoothEnableDirective = {
  Name: 'start_bluetooth',
  Payload: {},
  Type: 'client_action'
}

export const bluetoothDisableDirective = {
  Name: 'stop_bluetooth',
  Payload: {},
  Type: 'client_action'
}

export const soundSetLevelDirective = (level: number) => ({
  AnalyticsType: 'sound_set_level',
  IsLedSilent: true,
  Name: 'sound_set_level',
  Payload: encodeProtobufStruct({
    new_level: level,
    new_percent_level: level * 10
  }),
  Type: 'client_action'
})

export const processIncomingCallDirective = (callId: string) => ({
  IsLedSilent: true,
  Name: 'phone_calls_process_incoming_call',
  PayloadRaw: TProcessIncomingCallDirectiveClass.encode({
    CallId: callId
  }).finish(),
  Type: 'client_action'
})

export const pushUpdateConfigDirective = {
  Name: 'push_update_config',
  Type: 'client_action'
}

export const ttsPlayPlaceholderDirective = (onFinish?: proto.NAlice.NAliceApi.TDirective.ITOnFinishEvent) => ({
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
})

export interface MMSemanticFrameData {
  payload?: proto.google.protobuf.IStruct,
  payloadRaw?: Buffer
  type: 'mmSemanticFrame',
}

export const mmSemanticFrame = (payload?: proto.google.protobuf.IStruct, payloadRaw?: Buffer) => ({
  Name: '@@mm_semantic_frame',
  Payload: payload,
  PayloadRaw: payloadRaw,
  Type: 'server_action'
})

export function convertToAliceResponseDirective (directive: QuasarDirective): TDirective {
  switch (directive.type) {
    case 'bluetoothDisable': {
      return bluetoothDisableDirective
    }
    case 'bluetoothEnable': {
      return bluetoothEnableDirective
    }
    case 'customQuasar': {
      return directive.data as TDirective
    }
    case 'internalQuasar': {
      switch (directive.data.type) {
        case 'mmSemanticFrame': {
          return mmSemanticFrame(directive.data.payload, directive.data.payloadRaw)
        }
        case 'processIncomingCall': {
          return processIncomingCallDirective(directive.data.callId)
        }
        case 'pushUpdateConfig': {
          return pushUpdateConfigDirective
        }
        case 'ttsPlayPlaceholder': {
          return ttsPlayPlaceholderDirective(directive.data.onFinish)
        }
      }
      // @ts-expect-error Wut? ALALALALA
      break
    }
    case 'soundLouder': {
      return soundLouderDirective
    }
    case 'soundQuieter': {
      return soundQuieterDirective
    }
    case 'soundSetLevel': {
      return soundSetLevelDirective(directive.level)
    }
    case 'customMarusya': {
      throw new Error('custom Marusya directives are not supported on this platform')
    }
  }
}
