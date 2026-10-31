import { randomUUID } from 'node:crypto'
import z from 'zod'

import { encodeProtobufStruct } from '../../protobuf'
import protos from '../../protos/protos'
import { AbstractDirectiveFunctionProvider, WrappedDirective } from './directives'

const bluetoothEnableDirective = {
  quasarDirective: {
    Name: 'start_bluetooth',
    Payload: {},
    Type: 'client_action'
  }
}

const bluetoothDisableDirective = {
  quasarDirective: {
    Name: 'stop_bluetooth',
    Payload: {},
    Type: 'client_action'
  }
}

const soundSetLevelDirective = (level: number) => ({
  quasarDirective: {
    IsLedSilent: true,
    Name: 'sound_set_level',
    Payload: encodeProtobufStruct({
      new_level: level,
      new_percent_level: level * 10
    }),
    Type: 'client_action'
  }
})

const playIotSoundDirective = (isPowerOn: boolean) => ({
  quasarDirective: {
    IsLedSilent: true,
    Name: 'local_audio_file_play',
    Payload: encodeProtobufStruct({
      play_times: 1,
      sound_to_play: isPowerOn ? 'AliceIoTSoundsTurnOn' : 'AliceIoTSoundsTurnOff'
    }),
    Type: 'client_action'
  }
})

const soundLouderDirective = {
  quasarDirective: {
    IsLedSilent: true,
    Name: 'sound_louder',
    Payload: {},
    Type: 'client_action'
  }
}

const soundQuieterDirective = {
  quasarDirective: {
    IsLedSilent: true,
    Name: 'sound_quiter',
    Payload: {},
    Type: 'client_action'
  }
}

export const playerStopDirective: WrappedDirective = {
  internalDirective: {
    type: 'music_stop'
  },
  quasarDirective: {
    IsLedSilent: true,
    Name: 'clear_queue',
    Payload: {},
    Type: 'client_action'
  }
}

const playerStartDirectve: WrappedDirective = {
  internalDirective: {
    type: 'music_play'
  }
}

const playerNextTrackDirective: WrappedDirective = {
  internalDirective: {
    type: 'music_next_track'
  }
}

const playerPreviousTrackDirective: WrappedDirective = {
  internalDirective: {
    type: 'music_previous_track'
  }
}

const playerRewindDirective = (amountMs: number, type: 'Backward' | 'Forward') => ({
  quasarDirective: {
    IsLedSilent: true,
    Name: 'audio_player_rewind',
    Payload: encodeProtobufStruct({
      amount_ms: amountMs,
      type
    }),
    Type: 'client_action'
  }
})

const alarmAddProperties = z.object({
  days: z.array(z.union([z.number().int().min(1).max(7).describe('Week day: 1 - Monday, 7 - Sunday'), z.object({
    day: z.number().int().min(1).max(31),
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(1)
  })])).describe('Days or weekdays when alarm should run (each entry either specific weekday, or specific day)'),
  time: z.object({
    hours: z.number().int().min(0).max(23),
    minutes: z.number().int().min(0).max(59),
    seconds: z.number().int().min(0).max(59)
  })
})

type AlarmAddProperties = z.infer<typeof alarmAddProperties>

const alarmAddDirective = (properties: AlarmAddProperties,
  timezone: { name: string; offset: number, }): WrappedDirective => ({
  quasarDirective: {
    IsLedSilent: true,
    Name: 'alarm_add_directive',
    PayloadRaw: protos.NAlice.TAlarmCapability.TAlarmAddDirective.encode({
      Alarm: {
        ActivationDays: properties.days.map(day => typeof day === 'object'
          ? {
              Day: {
                Day: day.day,
                Month: day.month,
                Year: day.year
              }
            }
          : {
              Weekday: day
            }),
        AlarmId: randomUUID(),
        LocalTime: {
          Hours: properties.time.hours,
          Minutes: properties.time.minutes,
          Seconds: properties.time.seconds
        },
        Timezone: {
          OffsetSeconds: timezone.offset,
          TimezoneName: timezone.name
        }
      },
      Name: 'alarm_add_directive'
    }).finish(),
    Type: 'client_action'
  }
})

const alarmCancelDirective = (id: string): WrappedDirective => ({
  quasarDirective: {
    IsLedSilent: true,
    Name: 'alarm_cancel_directive',
    PayloadRaw: protos.NAlice.TAlarmCapability.TAlarmCancelDirective.encode({
      AlarmId: id,
      Name: 'alarm_cancel_directive'
    }).finish(),
    Type: 'client_action'
  }
})

const alarmStopDirective = {
  quasarDirective: {
    IsLedSilent: true,
    Name: 'alarm_stop_directive',
    PayloadRaw: protos.NAlice.TAlarmCapability.TAlarmStopDirective.encode({
      Name: 'alarm_stop_directive',
      StopMedia: true
    }).finish(),
    Type: 'client_action'
  }
}

const timerCancelDirective = (id: string): WrappedDirective => ({
  quasarDirective: {
    IsLedSilent: true,
    Name: 'timer_cancel_directive',
    PayloadRaw: protos.NAlice.TAlarmCapability.TTimerCancelDirective.encode({
      Name: 'timer_cancel_directive',
      TimerId: id
    }).finish(),
    Type: 'client_action'
  }
})

const timerStopDirective = (id: string): WrappedDirective => ({
  quasarDirective: {
    IsLedSilent: true,
    Name: 'timer_stop_directive',
    PayloadRaw: protos.NAlice.TAlarmCapability.TTimerStopDirective.encode({
      Name: 'timer_stop_directive',
      TimerId: id
    }).finish(),
    Type: 'client_action'
  }
})

const timerPauseDirective = (id: string): WrappedDirective => ({
  quasarDirective: {
    IsLedSilent: true,
    Name: 'timer_pause_directive',
    PayloadRaw: protos.NAlice.TAlarmCapability.TTimerPauseDirective.encode({
      Name: 'timer_pause_directive',
      TimerId: id
    }).finish(),
    Type: 'client_action'
  }
})

const timerResumeDirective = (id: string): WrappedDirective => ({
  quasarDirective: {
    IsLedSilent: true,
    Name: 'timer_resume_directive',
    PayloadRaw: protos.NAlice.TAlarmCapability.TTimerResumeDirective.encode({
      Name: 'timer_resume_directive',
      TimerId: id
    }).finish(),
    Type: 'client_action'
  }
})

const timerSetDirective = (seconds: number): WrappedDirective => ({
  quasarDirective: {
    Name: 'timer_set_directive',
    PayloadRaw: protos.NAlice.TAlarmCapability.TTimerSetDirective.encode({
      Name: 'timer_set_directive',
      Timer: {
        Duration: seconds,
        Remaining: seconds,
        StartTimestamp: Math.round(Date.now() / 1000),
        TimerId: randomUUID()
      }
    }).finish(),
    Type: 'client_action'
  }
})

export const textToDirectiveMap: Record<string, WrappedDirective> = {
  громче: soundLouderDirective,
  пауза: playerStopDirective,
  продолжи: playerStartDirectve,
  стоп: playerStopDirective,
  тише: soundQuieterDirective
}

export class BaseDirectiveFunctionProvider extends AbstractDirectiveFunctionProvider {
  constructor () {
    super()

    this.addFunction('alarm_add', 'Adds alarm to speaker', alarmAddProperties, (properties, metadata) => alarmAddDirective(properties, {
      name: metadata.internal.info?.quasarConfig?.timezone?.name ?? 'UTC',
      offset: metadata.internal.info?.quasarConfig?.timezone?.offsetSeconds ?? 0
    }))
    this.addFunction('alarm_cancel', 'Removes specific alarm from speaker', z.object({ id: z.string() }), (data) => alarmCancelDirective(data.id))
    this.addFunction('alarm_stop', 'Stops running active alarm on speaker', z.unknown(), () => alarmStopDirective)

    this.addFunction('timer_set', 'Adds timer to speaker', z.object({ durationSeconds: z.number().int() }), (data) => timerSetDirective(data.durationSeconds))
    this.addFunction('timer_stop', 'Stops specific timer on speaker', z.object({ id: z.string() }), (data) => timerStopDirective(data.id))
    this.addFunction('timer_cancel', 'Removes specific timer from speaker', z.object({ id: z.string() }), (data) => timerCancelDirective(data.id))
    this.addFunction('timer_pause', 'Pauses specific timer on speaker', z.object({ id: z.string() }), (data) => timerPauseDirective(data.id))
    this.addFunction('timer_resume', 'Resumes specific timer on speaker', z.object({ id: z.string() }), (data) => timerResumeDirective(data.id))

    this.addFunction('player_play', 'Starts music, or continues if was paused', z.unknown(), () => playerStartDirectve)
    this.addFunction('player_pause', 'Pause music if it is playing', z.unknown(), () => playerStopDirective)
    this.addFunction('player_next_track', 'Switch to next track', z.unknown(), () => playerNextTrackDirective)
    this.addFunction('player_previous_track', 'Switch to previous track', z.unknown(), () => playerPreviousTrackDirective)
    this.addFunction('player_rewind', 'Rewind music if it is playing', z.object({
      amountMs: z.number().int().positive().describe('Amount to rewind in ms (always positive)'),
      direction: z.union([z.literal('Forward'), z.literal('Backward')])
    }), (data) => playerRewindDirective(data.amountMs, data.direction))

    this.addFunction('bluetooth', 'Enable or disable Bluetooth on smart speaker', z.object({
      enable: z.boolean()
    }),
    (data) => data.enable ? bluetoothEnableDirective : bluetoothDisableDirective)
    this.addFunction('set_sound_volume_louder', 'Atomically make smart speaker volume louder', z.unknown(),
      () => soundLouderDirective)
    this.addFunction('set_sound_volume_quieter', 'Atomically make smart speaker volume quieter', z.unknown(),
      () => soundQuieterDirective)
    this.addFunction('set_sound_volume', 'Set volume on smart speaker', z.object({
      volume: z.number().int().min(1).max(10)
    }), (data) => soundSetLevelDirective(data.volume))
    this.addFunction('play_iot_sound', 'Play IoT power on/power off sound on smart speaker', z.object({
      isPowerOn: z.boolean()
    })
      .describe('true if "on" sound, false if "off" sound'), (data) => playIotSoundDirective(data.isPowerOn))
  }
}

export function getDirectiveFunctionProvider (_platform: string) {
  return new BaseDirectiveFunctionProvider()
}
