import z from "zod"

const rawQuasarConfig = z.object({
  aliceProSubscription: z.union([z.object({
    enabled: z.literal(true),
    ttl: z.number()
  }), z.object({
    enabled: z.literal(false)
  })]).default({
    enabled: true,
    ttl: 365 * 24 * 60 * 60
  }),
  accountConfig: z.object({
    aliceAdaptiveVolume: z.object({
      enabled: z.boolean().default(true),
    }),
    aliceProactivity: z.boolean().default(true),
    alwaysOnMicForShortcuts: z.boolean().default(false),
    audioPlayer: z.object({
      crossfadeEnabled: z.boolean().default(true)
    }),
    childContentAccess: z.union([
      z.literal('children'),
      z.literal('without'),
      z.literal('safe')
    ]).default('without'),
    contentAccess: z.union([
      z.literal('children'),
      z.literal('medium'),
      z.literal('without'),
      z.literal('safe')
    ]).default('without'),
    doNotUseUserLogs: z.boolean().default(false),
    enableChildVad: z.boolean().default(false),
    enabledCommandSpotters: z.object({
      call: z.object({
        answer: z.boolean().default(false)
      }),
      music: z.object({
        bluetooth: z.boolean().default(false),
        feedback: z.boolean().default(false),
        navigation: z.boolean().default(false),
        playAndPause: z.boolean().default(false),
        volume: z.boolean().default(false)
      }),
      smartHome: z.object({
        light: z.boolean().default(false),
        tv: z.boolean().default(false)
      }),
      tv: z.object({
        backToHome: z.boolean().default(false),
        navigation: z.boolean().default(false)
      })
    }),
    jingle: z.boolean().default(false).describe('Enabled "blimp" sound on activation and cancellation'),
    saveHistoryUsage: z.boolean().default(true),
    smartActivation: z.boolean().default(true),
    spotter: z.string().default("alisa").describe("Specifies spotter word, currently working are: alisa, yandex and yasmina"),
    useBiometryChildScoring: z.boolean().default(true),
    useRichModelForPro: z.boolean().default(true),
    userWifiConfig: z.object({
      wifiHash: z.string().default("39671801dd40273b54f83b5c3f7d9a0f0055e5a1b1687a6427241d9be9bf402e")
    })
  }),
  deviceConfig: z.object({
    beta: z.boolean().default(false),
    dndMode: z.object({
      enabled: z.boolean().default(false),
      features: z.object({
        allowIncomingCalls: z.boolean().default(false)
      })
    }),
    led: z.object({
      timeVisualization: z.object({
        format: z.union([z.literal('24h'), z.literal('12h')])
          .default('24h')
      }),
      brightness: z.object({
        auto: z.boolean().default(true),
        value: z.number().default(0.5)
      }),
      idleAnimation: z.boolean().default(false).describe('Enabled idle animation after 20 seconds if idling'),
      musicEqualizerVisualization: z.object({
        auto: z.boolean().default(false).describe('Enables automatic LED pattern switching while playing music'),
        style: z.string().default("lava_beat").describe('Set LED pattern while playing music: lava_beat, blink, polar_shining and none')
      })
    }),
    locale: z.string().default('ru-RU'),
    location: z.object({
      latitude: z.number(),
      longitude: z.number()
    }).optional(),
    standby: z.object({
      deepStandbyEnabled: z.boolean().default(true),
      deepStandbyTimeoutMinutes: z.number().default(240)
    }),
    stereoPair: z.object({
      channel: z.union([z.literal('left'), z.literal('right')]).describe('Specifies what speaker will this station be'),
      partnerDeviceId: z.string().describe('Partner speaker DUID'),
      role: z.union([z.literal('follower'), z.literal('leader')]).describe('Role for this speaker: follower only plays music, leader listens to user requests')
    }).optional().describe('Config for stereopair'),
    tvBeta: z.boolean().default(false)
  }),
  systemConfig: z.object({
    addAllEmbeddedEndpoints: z.boolean().default(false),
    audioInput: z.object({
      modelStorage: z.object({
        models: z.record(z.string(), z.record(z.string(), z.object({
          crc: z.number(),
          fallbackUrls: z.array(z.string()),
          format: z.union([z.literal('zip')]),
          url: z.string(),
          word: z.string().optional(),
          type: z.string().optional()
        }))).default({})
      })
    }),
    audioPlayerCapability: z.object({
      enableMusicSets: z.boolean().default(true),
      enableSmartCrossfade: z.boolean().default(true)
    }),
    audioclient: z.object({
      gogol: z.object({
        keepAlive: z.boolean().default(true)
      })
    }),
    bioCapability: z.object({
      engineConfig: z.object({
        contextScoring: z.object({
          enabled: z.boolean().default(true),
          guestThreshold: z.number().default(0.67),
          lambda: z.number().default(0.3),
          maxTimeDiffSeconds: z.number().default(1140),
          minEmbeddingCosine: z.number().default(0.7),
          useExpFormula: z.boolean().default(true)
        })
      }),
      useOnDeviceClassification: z.boolean().default(true)
    }),
    calld: z.object({
      audioProcessingConfig: z.object({
        preAmplifier: z.object({
          enabled: z.boolean().default(true),
          fixedGainFactor: z.number().default(72)
        })
      }),
      autoGainControl: z.boolean().default(true),
      txAgcDigitalCompressionGain: z.number().default(72)
    }),
    comYandexCapabilities: z.object({
      appLaunchCapabilityEnabled: z.boolean().default(true),
      detailsCapability: z.object({
        openPurchaseProcessDirectiveEnabled: z.boolean().default(true)
      }),
      detailsCapabilityEnabled: z.boolean().default(true),
      serialNavigatorCapability: z.object({
        openPurchaseDirectiveEnabled: z.boolean().default(true),
        showEpisodeDirectiveEnabled: z.boolean().default(true)
      }),
      serialNavigatorCapabilityEnabled: z.boolean().default(true)
    }),
    comYandexTvHome: z.object({
      detailsProtoHttpEnabled: z.boolean().default(true),
      serialNavigatorScreen: z.object({
        enumerationEnabled: z.boolean().default(true),
        newSerialNavigatorEnabledV3: z.boolean().default(true),
        voiceControlsEnabled: z.boolean().default(true)
      })
    }),
    comYandexTvServices: z.object({
      notifications: z.object({
        whitelist: z.array(z.string()).default([])
      })
    }),
    deviceControlPanel: z.object({
      checkAliceProSubscription: z.boolean().default(true)
    }),
    analyticsEnvironment: z.object({
      quasmodromGroup: z.string().default('production'),
      quasmodromSubgroup: z.string().default('production'),
      testBuckets: z.string().default('1556982,0,4;1561379,0,36;1547992,0,87;721150,0,79;1525886,0,41;1217762,0,78;945524,0,81;950035,0,41;1283447,0,48;1423171,0,62;956122,0,95;1549517,0,96;1550823,0,49;1288685,0,77;1560108,0,48;1287409,0,67;1479393,0,60;1559533,0,28'),
      testids: z.string().default('1058670_1058695_1058696_1058739_1058743_1058746_1074585_1098487_1118599_1155918_1294733_1367806_1395542_1420044_1431608_1432181_1450785_1454721_1457247_1457514_1458555_1460807_1479393_1511604_1525886_1559533_721150')
    }),
    experiments: z.array(z.string()).default([]),
    fluentBit: z.object({
      samplingRatio: z.number().default(0.5)
    }),
    forceWifiReconfigure: z.boolean().default(false),
    hybridRequestFactory: z.object({
      hybrid: z.object({
        scenarios: z.object({
          fastCommandScenario: z.object({
            supportedFrames: z.array(z.string()).default([
              "personal_assistant.scenarios.bluetooth_off",
              "personal_assistant.scenarios.bluetooth_on",
              "personal_assistant.scenarios.player.continue",
              "personal_assistant.scenarios.player.next_track",
              "personal_assistant.scenarios.player.pause",
              "personal_assistant.scenarios.player.previous_track",
              "personal_assistant.scenarios.sound.louder",
              "personal_assistant.scenarios.sound.quiter"
            ])
          })
        })
      }),
      hybridTextInputs: z.boolean().default(true),
      useProtobufAnalyticsInfo: z.boolean().default(true)
    }),
    iot: z.object({
      finishSystemDiscoveryAccumulateTimeout: z.number().default(120),
      maxFinishSystemDiscoveryAccumulateTimeout: z.number().default(180),
      providers: z.record(z.string(), z.boolean()).default({
        Matter: true,
        Zenoh: true
      }),
      syncApi: z.boolean().default(true),
      syncEndpoints: z.boolean().default(true),
      syncEndpointsRemoveEnable: z.boolean().default(true),
      systemDiscovery: z.boolean().default(true)
    }),
    maind: z.object({
      selfDestroyer: z.object({
        additionalMemoryLimitsKb: z.object({
          intonationInterruptionModel: z.number().default(3400)
        })
      })
    }),
    matter: z.object({
      enableOnOtaSystemDiscovery: z.boolean().default(true),
      enableSystemDiscovery: z.boolean().default(true)
    }),
    mediad: z.object({
      hlsFragmentDistance: z.number().default(6),
      hlsRandomizePlaylists: z.boolean().default(true)
    }),
    onlineSpotterEnabled: z.boolean().default(true),
    phoneCalls: z.object({
      blockUpdatesOnCall: z.boolean().default(true),
      enabled: z.boolean().default(true),
      webrtc: z.object({
        enabled: z.boolean().default(false)
      })
    }),
    qrPaymentConfig: z.object({
      cardDetails: z.object({
        playAfterLogin: z.boolean().default(true),
        playAfterPurchase: z.boolean().default(true),
        pollingApiEnabled: z.boolean().default(false),
        showQrAfterLogin: z.boolean().default(true)
      }),
      checkActiveUserIsOwnerEnabled: z.boolean().default(true),
      qrPaymentEnabled: z.boolean().default(true),
      redesignEnabledV3: z.boolean().default(true)
    }),
    sendVinsRequestProto: z.boolean().default(true),
    shouldCheckWifi: z.boolean().default(false),
    smartVolume: z.object({
      enabled: z.boolean().default(true)
    }),
    teleme3d: z.object({
      appmetrica: z.object({
        plusEvents: z.array(z.string()).default([
          "directiveHandled",
          "directiveStarted",
          "directiveCompleted"
        ])
      })
    }),
    telemetry: z.object({
      rateLimiter: z.object({
        groups: z.array(z.object({
          countLimit: z.number(),
          events: z.array(z.string()),
          intervalMs: z.number()
        })).default([])
      })
    }),
    unbound: z.object({
      checkHosts: z.array(z.string()).default([
        "quasar.yandex.net",
        "uniproxy.alice.yandex.net",
        "scbh.yandex.net"
      ]),
      enable: z.boolean().default(true),
      forwarders: z.array(z.string()).default([
        "77.88.8.1",
        "77.88.8.8",
        "77.88.8.88",
        "77.88.8.2",
        "1.1.1.1"
      ]),
      serverParams: z.array(z.string()).default([
        "msg-cache-size: 2m",
        "rrset-cache-size: 2m",
        "username: \"nobody\""
      ])
    }),
    useVinsRequestProto: z.boolean().default(true),
    voiceDialogSettings: z.object({
      backoffUseNew: z.boolean().default(true),
      blockUpdateSettingsWhileActiveRequest: z.boolean().default(true),
      commandSpotterSettings: z.object({
        spotterLoggingRareEventPercent: z.number().default(100)
      }),
      intonationInterruptionSpotterSettings: z.object({
        spotterLoggingRareEventPercent: z.number().default(100),
        spotterLoggingRareEventTailMillis: z.number().default(5000),
        spotterLoggingVeryRareEventTailMillis: z.number().default(5000)
      }),
      intonationSpotterSettings: z.object({
        spotterLoggingRareEventPercent: z.number().default(100),
        spotterLoggingRareEventTailMillis: z.number().default(5000),
        spotterLoggingVeryRareEventTailMillis: z.number().default(5000)
      }),
      protoAliceApi: z.object({
        clientEventsWhitelist: z.array(z.string()).default([
          "RequestStat"
        ]),
        serverEventsWhitelist: z.array(z.string()).default([
          "RequestStatAck"
        ])
      }),
      recognizer: z.object({
        packSoundBuffer: z.boolean().default(true)
      }),
      spotterLoggingRareEventPercent: z.number().default(1)
    }),
    voiceActivityDetector: z.object({
      eventsEnabled: z.boolean().default(true)
    }),
    wifiSettings: z.object({
      generate204: z.object({
        failPeriodMs: z.number().default(10000),
        maxFailAttempts: z.number().default(3),
        periodOnLastFailAttemptMs: z.number().default(30000),
        periodSec: z.number().default(30),
        timeoutMs: z.number().default(8000)
      })
    }),
    wifiCapability: z.object({
      enabledV2: z.boolean().default(true)
    }),
    zigbee: z.object({
      externalTemperatureMeasurement: z.object({
        enabled: z.boolean().default(true),
        reportingIntervalSec: z.number().default(60)
      })
    })
  })
})

const NO_DEFAULT = Symbol("NO_DEFAULT");
type NoDefault = typeof NO_DEFAULT;

function deepDefault<T extends z.ZodType>(schema: T): T {
  return transform(schema).schema as unknown as T;
}

function transform(schema: z.ZodType): {
  schema: z.ZodType;
  default: unknown | NoDefault;
} {
  const result = rebuild(schema);
  const meta = schema.meta?.();
  if (meta) result.schema = result.schema.meta(meta);
  return result;
}

function rebuild(schema: z.ZodType): {
  schema: z.ZodType;
  default: unknown | NoDefault;
} {
  if (schema instanceof z.ZodDefault) {
    const inner = transform(schema.unwrap() as z.ZodType);
    const raw = schema.def.defaultValue;
    const value = typeof raw === "function" ? (raw as () => unknown)() : raw;
    return { schema: inner.schema.default(value), default: value };
  }

  if (schema instanceof z.ZodOptional) {
    const inner = transform(schema.unwrap() as z.ZodType);
    return { schema: inner.schema.optional(), default: undefined };
  }

  if (schema instanceof z.ZodNullable) {
    const inner = transform(schema.unwrap() as z.ZodType);
    return { schema: inner.schema.nullable(), default: inner.default };
  }

  if (schema instanceof z.ZodObject) {
    const newShape: Record<string, z.ZodType> = {};
    const computed: Record<string, unknown> = {};
    let allDefaultable = true;

    for (const [k, v] of Object.entries(schema.shape)) {
      const child = transform(v as z.ZodType);
      newShape[k] = child.schema;
      if (child.default === NO_DEFAULT) {
        allDefaultable = false;
      } else if (child.default !== undefined) {
        computed[k] = child.default;
      }
    }

    const obj = z.object(newShape);
    return allDefaultable
      ? { schema: obj.default(computed), default: computed }
      : { schema: obj, default: NO_DEFAULT };
  }

  if (schema instanceof z.ZodArray) {
    const element = transform(schema.element as z.ZodType);
    return { schema: z.array(element.schema), default: NO_DEFAULT };
  }

  return { schema, default: NO_DEFAULT };
}

export const quasarConfig = deepDefault(rawQuasarConfig)

export type QuasarConfig = z.infer<typeof quasarConfig>

export const glagolSecurity = z.object({
  certificate: z.string(),
  privateKey: z.string()
})

export type GlagolSecurity = z.infer<typeof glagolSecurity>

export interface StationInfo {
  duid: string
  name: string
  platform: string
  quasarConfig: QuasarConfig
  glagolSecurity: GlagolSecurity
  networkInfo: unknown | null
}

export interface StationInfoProvider {
  getInfo(duid: string, platform: string): Promise<StationInfo>
  getStationInfos(): Promise<StationInfo[]>

  updateNetworkInfo(duid: string, platform: string, networkInfo: unknown): Promise<StationInfo>
}