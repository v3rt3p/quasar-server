import z from 'zod'

const NO_DEFAULT = Symbol('NO_DEFAULT')
type NoDefault = typeof NO_DEFAULT

const rawQuasarConfig = z.object({
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
        answer: z.boolean().default(true)
      }),
      music: z.object({
        bluetooth: z.boolean().default(true),
        feedback: z.boolean().default(true),
        navigation: z.boolean().default(true),
        playAndPause: z.boolean().default(true),
        volume: z.boolean().default(true)
      }),
      smartHome: z.object({
        light: z.boolean().default(true),
        tv: z.boolean().default(true)
      }),
      tv: z.object({
        backToHome: z.boolean().default(true),
        navigation: z.boolean().default(true)
      })
    }),
    intonationSpotting: z.object().default({}),
    jingle: z.boolean().default(false).describe('Enables "blimp" sound on activation and cancellation'),
    saveHistoryUsage: z.boolean().default(true),
    smartActivation: z.boolean().default(true),
    spotter: z.string().default('alisa').describe('Specifies spotter word, currently working are: alisa, yandex and yasmina'),
    useBiometryChildScoring: z.boolean().default(true),
    useRichModelForPro: z.boolean().default(true),
    userWifiConfig: z.object({
      wifiHash: z.string().default('39671801dd40273b54f83b5c3f7d9a0f0055e5a1b1687a6427241d9be9bf402e')
    })
  }),
  aliceProSubscription: z.union([z.object({
    enabled: z.literal(true),
    ttl: z.number()
  }), z.object({
    enabled: z.literal(false)
  })]).default({
    enabled: true,
    ttl: 365 * 24 * 60 * 60
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
      brightness: z.object({
        auto: z.boolean().default(true),
        value: z.number().default(0.7)
      }),
      idleAnimation: z.boolean().default(false).describe('Enables idle animation after 20 seconds of idling'),
      musicEqualizerVisualization: z.object({
        auto: z.boolean().default(false).describe('Enables automatic LED pattern switching while playing music'),
        style: z.string().default('lava_beat').describe('Specify LED pattern (auto: false) while playing music: lava_beat, blink, polar_shining and none')
      }),
      timeVisualization: z.object({
        format: z.union([z.literal('24h'), z.literal('12h')])
          .default('24h')
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
    adbd: z.object({
      network: z.boolean().default(true),
      remoteActivation: z.boolean().default(true)
    }),
    addAllEmbeddedEndpoints: z.boolean().default(true),
    analyticsEnvironment: z.object({
      quasmodromGroup: z.string().default('production'),
      quasmodromSubgroup: z.string().default('production'),
      testBuckets: z.string().default('1556982,0,4;1561379,0,36;1547992,0,87;721150,0,79;1525886,0,41;1217762,0,78;945524,0,81;950035,0,41;1283447,0,48;1423171,0,62;956122,0,95;1549517,0,96;1550823,0,49;1288685,0,77;1560108,0,48;1287409,0,67;1479393,0,60;1559533,0,28'),
      testids: z.string().default('1058670_1058695_1058696_1058739_1058743_1058746_1074585_1098487_1118599_1155918_1294733_1367806_1395542_1420044_1431608_1432181_1450785_1454721_1457247_1457514_1458555_1460807_1479393_1511604_1525886_1559533_721150')
    }),
    audioclient: z.object({
      gogol: z.object({
        keepAlive: z.boolean().default(true)
      })
    }),
    audioInput: z.object({
      audioDevice: z.object({
        addInRateRawChannels: z.boolean().default(true)
      }),
      modelStorage: z.object({
        models: z.record(z.string(), z.record(z.string(), z.object({
          crc: z.number(),
          fallbackUrls: z.array(z.string()),
          format: z.union([z.literal('zip')]),
          type: z.string().optional(),
          url: z.string(),
          word: z.string().optional()
        }))).default({})
      })
    }),
    audioPlayerCapability: z.object({
      enableMusicSets: z.boolean().default(true),
      enableSmartCrossfade: z.boolean().default(true)
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
        whitelist: z.array(z.string()).default(['purchasedSuccessfulNotification'])
      })
    }),
    deviceControlPanel: z.object({
      checkAliceProSubscription: z.boolean().default(true)
    }),
    enableUpdateTtsDirectives261: z.boolean().default(true),
    experiments: z.array(z.string()).default([
      'bg_enable_say_with_emotion',
      'enrollment_x_token_enabled',
      'hw_enable_audio_speed_scenario',
      'hw_enable_intonation_stop_word',
      'hw_enable_say_with_emotion',
      'hw_music_enable_smart_crossfade',
      'hw_music_fm_radio_add_safe_timeline_cgi_to_stream_url',
      'hw_voiceprint_enable_enrollment_sharing'
    ]),
    fluentBit: z.object({
      samplingRatio: z.number().default(0.5)
    }),
    forceWifiReconfigure: z.boolean().default(false),
    geoSyncSchedulerSettings: z.object({
      enabled: z.boolean().default(true)
    }),
    glagold: z.object({
      useFamilyDeviceList: z.boolean().default(false)
    }),
    hybridRequestFactory: z.object({
      hybrid: z.object({
        scenarios: z.object({
          fastCommandScenario: z.object({
            enableLocalTtsStop: z.boolean().default(true),
            supportedFrames: z.array(z.string()).default([
              'personal_assistant.scenarios.bluetooth_off',
              'personal_assistant.scenarios.bluetooth_on',
              'personal_assistant.scenarios.player.continue',
              'personal_assistant.scenarios.player.next_track',
              'personal_assistant.scenarios.player.pause',
              'personal_assistant.scenarios.player.previous_track',
              'personal_assistant.scenarios.sound.louder',
              'personal_assistant.scenarios.sound.quiter'
            ])
          })
        })
      }),
      hybridTextInputs: z.boolean().default(true),
      hybridVoiceInputs: z.boolean().default(true),
      localVoiceInputsWhenDisconnected: z.boolean().default(false),
      useProtobufAnalyticsInfo: z.boolean().default(true),
      useUniproxyEouHint: z.boolean().default(true),
      waitClientApproval: z.boolean().default(true),
      waitSpotterValidationWhileDisconnected: z.boolean().default(false)
    }),
    intonationSpotting: z.object({
      defaultEnabled: z.boolean().default(false),
      disableOnNoSpeechAfterSpotter: z.boolean().default(true),
      disableOnNoSpeechContexts: z.array(z.string()).default([]),
      disableOnNoSpeechDetected: z.boolean().default(true),
      doNotIncludeTTS: z.boolean().default(true),
      enableOnActivationTranscripts: z.array(z.string()).default(['алиса', 'яндекс', '<intonation>']),
      enableTimeMs: z.number().default(20_000),
      ledVisualization: z.boolean().default(true)
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
      capability: z.object({
        pumpkin: z.object({
          useColorAnimationCapability: z.boolean().default(true)
        })
      }),
      diagnosticsServiceEnabled: z.boolean().default(true),
      enableOnOtaSystemDiscovery: z.boolean().default(true),
      enableSystemDiscovery: z.boolean().default(true),
      nodeWifiNetworkDiagnosticsCapability: z.object({
        enabled: z.boolean().default(true)
      })
    }),
    mediad: z.object({
      hlsFragmentDistance: z.number().default(6),
      hlsRandomizePlaylists: z.boolean().default(true)
    }),
    noiseDetector: z.object({
      enabled: z.boolean().default(true),
      spotterLogging: z.boolean().default(true),
      throttles: z.object({
        alarm: z.number().default(300_000),
        breakGlass: z.number().default(20_000),
        childCry: z.number().default(20_000),
        clap: z.number().default(1000),
        dogBark: z.number().default(20_000),
        meow: z.number().default(20_000),
        snap: z.number().default(1000),
        waterSound: z.number().default(300_000)
      })
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
    spectrogramAnimation: z.object({
      presets: z.record(z.string(), z.object({
        alwaysOnLeds: z.number(),
        angleSpeed: z.number(),
        bandCount: z.number(),
        blockMove: z.boolean(),
        blockOnShifting: z.boolean(),
        c0: z.object({
          h: z.number(),
          s: z.number(),
          v: z.number()
        }),
        c1: z.object({
          h: z.number(),
          s: z.number(),
          v: z.number()
        }),
        c2: z.object({
          h: z.number(),
          s: z.number(),
          v: z.number()
        }),
        c3: z.object({
          h: z.number(),
          s: z.number(),
          v: z.number()
        }),
        center: z.number(),
        colors: z.object({
          baseColor: z.object({
            b: z.number(),
            g: z.number(),
            r: z.number()
          }),
          defaultColor: z.object({
            b: z.number(),
            g: z.number(),
            r: z.number()
          }),
          gradientCenterColor: z.object({
            h: z.number(),
            s: z.number(),
            v: z.number()
          }),
          gradientMiddleColor: z.object({
            h: z.number(),
            s: z.number(),
            v: z.number()
          }),
          gradientSideColor: z.object({
            h: z.number(),
            s: z.number(),
            v: z.number()
          }).default({ h: 159, s: 0.968, v: 0.867 })
        }),
        derivation: z.number(),
        distanceBetweenPoints: z.number(),
        enableMiddleColor: z.boolean(),
        filters: z.object({
          twitchFilter: z.object({
            decreasingDelta: z.number(),
            enabled: z.boolean(),
            increasingDelta: z.number(),
            maxValue: z.number(),
            minDecreasingDelta: z.number(),
            minDecreasingStateChange: z.number(),
            minDecreasingSwitchDistance: z.number(),
            minIncreasingDelta: z.number(),
            minIncreasingStateChange: z.number(),
            minIncreasingSwitchDistance: z.number(),
            minState: z.number(),
            returnToZero: z.boolean().default(true)
          })
        }),
        gradientColors: z.array(z.object({
          h: z.number(),
          s: z.number(),
          v: z.number()
        })).default([
          { h: 250, s: 0.94, v: 1 },
          { h: 250, s: 0.94, v: 1 },
          { h: 195, s: 0.78, v: 0.91 },
          { h: 150, s: 1, v: 1 }
        ]),
        gradientDistribution: z.array(z.number()),
        gradientShifts: z.array(z.number()),
        l0: z.number(),
        l1: z.number(),
        l2: z.number(),
        l3: z.number(),
        ledLength: z.number(),
        lengthWhenMoving: z.number(),
        maxBand: z.number(),
        maxFrequency: z.number(),
        maxShift: z.number(),
        minBrightness: z.array(z.number()),
        minFrequency: z.number(),
        minHeight: z.number(),
        pointsToCheckCount: z.number(),
        shiftFromMean: z.number(),
        updateLedFrequency: z.number(),
        useAllSides: z.boolean(),
        useNewProAnimation: z.boolean(),
        usePureColors: z.boolean().default(false)
      })).default({
        voice: {
          alwaysOnLeds: 1,
          angleSpeed: 120,
          bandCount: 1,
          blockMove: true,
          blockOnShifting: true,
          c0: {
            h: 250,
            s: 0.94,
            v: 1
          },
          c1: {
            h: 250,
            s: 0.94,
            v: 1
          },
          c2: {
            h: 195,
            s: 0.78,
            v: 0.91
          },
          c3: {
            h: 150,
            s: 1,
            v: 1
          },
          center: 0,
          colors: {
            baseColor: {
              b: 255,
              g: 15,
              r: 55
            },
            defaultColor: {
              b: 0,
              g: 0,
              r: 0
            },
            gradientCenterColor: {
              h: 250,
              s: 0.94,
              v: 1
            },
            gradientMiddleColor: {
              h: 195,
              s: 0.784,
              v: 0.91
            },
            gradientSideColor: {
              h: 159,
              s: 0.968,
              v: 0.867
            }
          },
          derivation: 0.4,
          distanceBetweenPoints: 0.3,
          enableMiddleColor: true,
          filters: {
            twitchFilter: {
              decreasingDelta: 20,
              enabled: true,
              increasingDelta: 30,
              maxValue: 400,
              minDecreasingDelta: 4,
              minDecreasingStateChange: 0,
              minDecreasingSwitchDistance: 130,
              minIncreasingDelta: 4,
              minIncreasingStateChange: 0,
              minIncreasingSwitchDistance: 80,
              minState: 30,
              returnToZero: true
            }
          },
          gradientColors: [
            {
              h: 250,
              s: 0.94,
              v: 1
            },
            {
              h: 250,
              s: 0.94,
              v: 1
            },
            {
              h: 195,
              s: 0.78,
              v: 0.91
            },
            {
              h: 150,
              s: 1,
              v: 1
            }
          ],
          gradientDistribution: [
            1,
            0.8,
            0.6,
            0.6,
            0.5,
            0
          ],
          gradientShifts: [
            0.1,
            0.2,
            0.35,
            0.5
          ],
          l0: 0.1,
          l1: 0.2,
          l2: 0.35,
          l3: 0.5,
          ledLength: 400,
          lengthWhenMoving: 1.5,
          maxBand: 0.001,
          maxFrequency: 400,
          maxShift: 6,
          minBrightness: [
            0,
            0,
            0,
            0,
            256,
            256,
            256,
            256,
            256,
            256
          ],
          minFrequency: 200,
          minHeight: 400,
          pointsToCheckCount: 50,
          shiftFromMean: 0,
          updateLedFrequency: 20,
          useAllSides: true,
          useNewProAnimation: true,
          usePureColors: false
        }
      }),
      voicePreset: z.string().default('voice')
    }),
    spotterRecognizer: z.object({
      maxRecognitionTime: z.number().default(3000)
    }),
    streamingAnimations: z.object({
      ignoreRepeatedAnimationsWhenPlaying: z.boolean().default(true),
      repeatedAnimationsWhitelist: z.array(z.string()).default(['neutral'])
    }),
    syncd: z.object({
      pollPeriodSec: z.number().default(1800)
    }),
    teleme3d: z.object({
      appmetrica: z.object({
        persistentBatcher: z.object({
          enabled: z.boolean().default(true),
          lookForNetworkConnection: z.boolean().default(true),
          maxBatchCollectingWhenNoInternetTimeSec: z.number().default(360),
          maxStorageSizeMb: z.number().default(1),
          // eslint-disable-next-line no-template-curly-in-string
          storagePath: z.string().default('${DATA}/appmetrica/persistedBatch'),
          syncPeriodSec: z.number().default(360)
        }),
        plusEvents: z.array(z.string()).default([
          'directiveHandled',
          'directiveStarted',
          'directiveCompleted',
          'NetInterfaceGotAddress',
          'NetInterfaceUp',
          'associationFailed',
          'connectionStats',
          'emptyIp',
          'emptyIpFixed',
          'emptyNetworks',
          'emptyNetworksFixed',
          'emptyScan',
          'emptyScanFixed',
          'internetRecovery',
          'internetRecoveryFail',
          'internetRecoveryStart',
          'internetRecoverySuccess',
          'phraseSpottedWithoutInternet',
          'processStart',
          'setupConfigurationError',
          'wifiConnect',
          'wifiDisconnect',
          'wifiReport',
          'wifiReset',
          'wrongIp',
          'wrongIpFixed',
          'ysk_error_network',
          'ysk_error_timeout'
        ])
      }),
      persistentAppmetrica: z.object({
        plusEvents: z.array(z.string()).default([
          'wifiReset',
          'phraseSpottedWithoutInternet',
          'setupConfigurationError',
          'internetRecovery',
          'internetRecoveryStart',
          'internetRecoverySuccess',
          'internetRecoveryFail',
          'associationFailed',
          'emptyScan',
          'emptyScanFixed',
          'emptyIp',
          'emptyIpFixed',
          'wrongIp',
          'wrongIpFixed',
          'emptyNetworks',
          'emptyNetworksFixed',
          'wifiConnect',
          'wifiDisconnect',
          'NetInterfaceUp',
          'NetInterfaceGotAddress',
          'wifiReport',
          'connectionStats',
          'processStart',
          'ysk_error_network',
          'ysk_error_timeout'
        ])
      })
    }),
    telemetry: z.object({
      rateLimiter: z.object({
        groups: z.array(z.object({
          countLimit: z.number(),
          events: z.array(z.string()),
          intervalMs: z.number()
        })).default([{
          countLimit: 1,
          events: ['ysk_spotter_queue_overflow'],
          intervalMs: 120_000
        }])
      })
    }),
    ultrasound: z.object({
      detector: z.object({
        meta: z.object({
          bandWidth: z.number().default(600),
          channelAggregation: z.string().default('pick_in_sorted_desc'),
          cooldownPeriod: z.number().default(5000),
          frameWidth: z.number().default(16_384),
          freq: z.number().default(35_000),
          groupingWindowWidth: z.number().default(3000),
          hopLength: z.number().default(8192),
          numChannels: z.number().default(4),
          numTriggers: z.number().default(5),
          pickChannelIdx: z.number().default(3),
          postclassifier: z.object({
            channelAggregation: z.string().default('pick_in_original'),
            cooldownPeriod: z.number().default(0),
            groupingWindowWidth: z.number().default(2700),
            numTriggers: z.number().default(2),
            pickChannelIdx: z.number().default(0),
            slidingAvgWidth: z.number().default(0),
            threshold: z.number().default(0.7)
          }),
          sampleRate: z.number().default(96_000),
          slidingAvgWidth: z.number().default(0),
          thresholdDb: z.number().default(55.28)
        }),
        type: z.string().default('pcagmm_doppler')
      }),
      enabled: z.boolean().default(true),
      generator: z.object({
        amplitude: z.number().default(0.025),
        blockSize: z.number().default(65_536),
        fadeLength: z.number().default(200),
        nChannels: z.number().default(4),
        sampleRate: z.number().default(96_000),
        waveFreqHz: z.number().default(35_000),
        zeroChannels: z.array(z.number()).default([0, 1])
      }),
      sendMetricaEvents: z.boolean().default(true)
    }),
    unbound: z.object({
      checkHosts: z.array(z.string()).default([
        'quasar.yandex.net',
        'uniproxy.alice.yandex.net',
        'scbh.yandex.net'
      ]),
      enable: z.boolean().default(true),
      forwarders: z.array(z.string()).default([
        '77.88.8.1',
        '77.88.8.8',
        '77.88.8.88',
        '77.88.8.2',
        '1.1.1.1'
      ]),
      serverParams: z.array(z.string()).default([
        'msg-cache-size: 2m',
        'rrset-cache-size: 2m',
        'username: "nobody"'
      ])
    }),
    useVinsRequestProto: z.boolean().default(true),
    voiceActivityDetector: z.object({
      eventsEnabled: z.boolean().default(true)
    }),
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
          'RequestStat'
        ]),
        serverEventsWhitelist: z.array(z.string()).default([
          'RequestStatAck'
        ])
      }),
      recognizer: z.object({
        encodingApplication: z.string().default('audio'),
        encodingBitrate: z.number().default(24_000),
        encodingComplexity: z.number().default(0),
        packSoundBuffer: z.boolean().default(true),
        spotterSubscribePointShiftMs: z.number().default(-80)
      }),
      spotterLoggingHeadMillis: z.number().default(0),
      spotterLoggingRareEventPercent: z.number().default(0),
      spotterLoggingTailMillis: z.number().default(0),
      spotterLoggingVeryRareEventPercent: z.number().default(1),
      spotterLoggingVeryRareStreamingLengthMillis: z.number().default(5000)
    }),
    wifiCapability: z.object({
      enabledV2: z.boolean().default(true),
      reassociateWhenNoInternet: z.boolean().default(false)
    }),
    wifiReseter: z.object({}).default({}),
    wifiSettings: z.object({
      disableWlan0Monitor: z.boolean().default(true),
      enableInternetRecovery: z.boolean().default(true),
      generate204: z.object({
        failPeriodMs: z.number().default(10_000),
        maxFailAttempts: z.number().default(3),
        periodOnLastFailAttemptMs: z.number().default(30_000),
        periodSec: z.number().default(300),
        timeoutMs: z.number().default(8000)
      }),
      wifiReportWindowSec: z.number().default(0)
    }),
    zigbee: z.object({
      externalTemperatureMeasurement: z.object({
        enabled: z.boolean().default(true),
        reportingIntervalSec: z.number().default(60)
      })
    })
  }),
  tags: z.array(z.string()).default([])
})

function deepDefault<T extends z.ZodType> (schema: T): T {
  return transform(schema).schema as unknown as T
}

function rebuild (schema: z.ZodType): {
  default: NoDefault | unknown;
  schema: z.ZodType;
} {
  if (schema instanceof z.ZodDefault) {
    const inner = transform(schema.unwrap() as z.ZodType)
    const raw = schema.def.defaultValue
    const value = typeof raw === 'function' ? (raw as () => unknown)() : raw
    return { default: value, schema: inner.schema.default(value) }
  }

  if (schema instanceof z.ZodOptional) {
    const inner = transform(schema.unwrap() as z.ZodType)
    return { default: undefined, schema: inner.schema.optional() }
  }

  if (schema instanceof z.ZodNullable) {
    const inner = transform(schema.unwrap() as z.ZodType)
    return { default: inner.default, schema: inner.schema.nullable() }
  }

  if (schema instanceof z.ZodObject) {
    const newShape: Record<string, z.ZodType> = {}
    const computed: Record<string, unknown> = {}
    let allDefaultable = true

    for (const [k, v] of Object.entries(schema.shape)) {
      const child = transform(v as z.ZodType)
      newShape[k] = child.schema
      if (child.default === NO_DEFAULT) {
        allDefaultable = false
      } else if (child.default !== undefined) {
        computed[k] = child.default
      }
    }

    const object = z.object(newShape)
    return allDefaultable
      ? { default: computed, schema: object.default(computed) }
      : { default: NO_DEFAULT, schema: object }
  }

  if (schema instanceof z.ZodArray) {
    const element = transform(schema.element as z.ZodType)
    return { default: NO_DEFAULT, schema: z.array(element.schema) }
  }

  if (schema instanceof z.ZodRecord) {
    const value = transform(schema.valueType as z.ZodType)
    return { default: NO_DEFAULT, schema: z.record(schema.keyType, value.schema) }
  }

  return { default: NO_DEFAULT, schema }
}

function transform (schema: z.ZodType): {
  default: NoDefault | unknown;
  schema: z.ZodType;
} {
  const result = rebuild(schema)
  const meta = schema.meta?.()
  if (meta) result.schema = result.schema.meta(meta)
  return result
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
  glagolSecurity: GlagolSecurity
  name: string
  networkInfo: null | unknown
  platform: string
  quasarConfig: QuasarConfig
}

export interface StationInfoProvider {
  getInfo(duid: string, platform: string): Promise<StationInfo>
  getStationInfos(): Promise<StationInfo[]>

  updateNetworkInfo(duid: string, platform: string, networkInfo: unknown): Promise<StationInfo>
}
