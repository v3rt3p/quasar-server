import { loadProto } from '../../proto'

const TProcessIncomingCallDirective = loadProto(
  'alice/protos/endpoint/capabilities/phone_calls/capability.proto')
  .lookupType('NAlice.TPhoneCallsCapability.TProcessIncomingCallDirective')

export type AliceDirective = ProcessIncomingCallDirective | RawDirective | SoundLouderDirective | SoundQuieterDirective | 
  SoundSetLevelDirective | TtsPlayPlaceholderDirective

export interface ProcessIncomingCallDirective {
  callId: string;
  type: 'processIncomingCall'
}

export interface RawDirective {
  data: unknown
  type: 'raw',
}

export interface SoundLouderDirective {
  type: 'soundLouder';
}

export interface SoundQuieterDirective {
  type: 'soundQuieter';
}

export interface SoundSetLevelDirective {
  newLevel: number;
  type: 'soundSetLevel';
}

export interface TtsPlayPlaceholderDirective {
  type: 'ttsPlayPlaceholder'
  onFinish?: unknown
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

export const soundSetLevelDirective = (level: number) => ({
  AnalyticsType: 'sound_set_level',
  IsLedSilent: true,
  Name: 'sound_set_level',
  Payload: {
    fields: {
      new_level: {
        numberValue: level
      },
      new_percent_level: {
        numberValue: level * 10
      }
    }
  },
  Type: 'client_action'
})

export const processIncomingCallDirective = (callId: string) => ({
  IsLedSilent: true,
  Name: 'phone_calls_process_incoming_call',
  PayloadRaw: Buffer.from(TProcessIncomingCallDirective.encode({
    CallId: callId
  }).finish()).toString('base64'),
  Type: 'client_action'
})

export const pushUpdateConfigDirective = {
  Name: 'push_update_config',
  Type: 'client_action'
}

export const ttsPlayPlaceholderDirective = (onFinish?: unknown) => ({
  AnalyticsType: 'tts_play_placeholder',
  IsLedSilent: true,
  Name: 'tts_play_placeholder',
  Payload: {
    fields: {
      channel: {
        stringValue: 'Dialog'
      }
    }
  },
  Type: 'client_action',
  ...(onFinish
    ? {}
    : {
      OnFinish: onFinish
    })
})

export function convertToAliceResponseDirective(directive: AliceDirective): any {
  switch (directive.type) {
    case 'processIncomingCall': {
      return processIncomingCallDirective(directive.callId)
    }
    case 'raw': {
      return directive.data
    }
    case 'soundLouder': {
      return soundLouderDirective
    }
    case 'soundQuieter': {
      return soundQuieterDirective
    }
    case 'soundSetLevel': {
      return soundSetLevelDirective(directive.newLevel)
    }
    case 'ttsPlayPlaceholder': {
      return ttsPlayPlaceholderDirective(directive.onFinish)
    }
  }
}
