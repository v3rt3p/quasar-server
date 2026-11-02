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
    alarmd: z.object({
      disableTimerAfterFire: z.boolean().default(true),
      separatedDefaultSound: z.boolean().default(true),
      timerSoundFilename: z.string().default('newTimer')
    }),
    aliced: z.object({
      aliceStreamingV2: z.object({
        provideAliceState: z.boolean().default(true)
      })
    }),
    analyticsEnvironment: z.object({
      quasmodromGroup: z.string().default('production'),
      quasmodromSubgroup: z.string().default('production'),
      testBuckets: z.string().default('1556982,0,4;1561379,0,36;1547992,0,87;721150,0,79;1525886,0,41;1217762,0,78;945524,0,81;950035,0,41;1283447,0,48;1423171,0,62;956122,0,95;1549517,0,96;1550823,0,49;1288685,0,77;1560108,0,48;1287409,0,67;1479393,0,60;1559533,0,28'),
      testids: z.string().default('1058670_1058695_1058696_1058739_1058743_1058746_1074585_1098487_1118599_1155918_1294733_1367806_1395542_1420044_1431608_1432181_1450785_1454721_1457247_1457514_1458555_1460807_1479393_1511604_1525886_1559533_721150')
    }),
    androidApp: z.object({
      logging: z.object({
        level: z.string().default('info')
      })
    }),
    androidSettingsConfig: z.object({
      enabled: z.boolean().default(true),
      globalSettingsMap: z.record(z.string(), z.object({
        value: z.string(),
        valueType: z.string()
      })).default({
        is_status_bar_enabled: {
          value: '0',
          valueType: 'Int'
        },
        is_status_bar_enabledV1: {
          value: '0',
          valueType: 'Int'
        }
      })
    }),
    audioclient: z.object({
      extraPlaybackParams: z.object({
        apiUrl: z.string().default('wss://ws.api.music.yandex.net/quasar/websocket')
      }),
      gogol: z.object({
        keepAlive: z.boolean().default(true)
      }),
      playbackParams: z.object({
        common: z.object({
          gstProperties: z.object({
            spectrum: z.string().default('spectrum interval=40000000 bands=513 threshold=-80')
          })
        })
      }),
      volume: z.object({
        audio: z.number().default(100),
        stream: z.number().default(100),
        voice: z.number().default(100)
      })
    }),
    audioInput: z.object({
      audioDevice: z.object({
        addInRateRawChannels: z.boolean().default(true),
        dspMetricsEnabled: z.boolean().default(true),
        vqe: z.object({
          preset: z.object({
            omniChannelGainCoefficient: z.array(z.number()).default([
              30
            ])
          }),
          type: z.string().default('yandex')
        }),
        vqeHardwareConfigV2: z.object({
          enableVqeOnDsp: z.boolean().default(true)
        }),
        vqeMetricsEnabled: z.boolean().default(true),
        vqeMetricsTimeoutMin: z.number().default(10),
        vqeTelemetryMetricsEnabled: z.boolean().default(false),
        vqeTelemetryMetricsEnabledV1: z.boolean().default(false)
      }),
      modelStorage: z.object({
        models: z.record(z.string(), z.record(z.string(), z.object({
          crc: z.number(),
          fallbackUrls: z.array(z.string()),
          format: z.union([z.literal('zip')]),
          type: z.string().optional(),
          url: z.string(),
          word: z.string().optional()
        }))).default({}),
        useFallback: z.boolean().default(true)
      })
    }),
    audioPlayerCapability: z.object({
      enableMusicSets: z.boolean().default(true),
      enableSmartCrossfade: z.boolean().default(true),
      pausePlayerOnStop: z.boolean().default(true),
      qualityChangeReaction: z.string().default('runtime')
    }),
    bioCapability: z.object({
      enabled: z.boolean().default(true),
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
      logStorage: z.boolean().default(true),
      modelStorage: z.object({
        models: z.record(z.string(), z.record(z.string(), z.object({
          checksum: z.string(),
          fallbackUrls: z.array(z.string()),
          format: z.string(),
          url: z.string()
        }))).default({})
      }),
      spotterSoundDurationMs: z.number().default(500),
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
    capabilityStateSender: z.object({
      capabilityIdsWhitelist: z.array(z.string()).default([
        'AccessibilityVoiceControlCapability'
      ])
    }),
    centaur: z.object({
      '298NpsOnboarding': z.object({
        critical: z.boolean().default(true),
        enabled: z.boolean().default(true)
      }),
      accessibleVoice: z.object({
        accessibleVoiceConfig: z.object({
          accessibleVoicePackagesFilterConfig: z.object({
            filterMode: z.string().default('BLOCK_LIST')
          }),
          enableReceivingOpenedAppEvents: z.boolean().default(true),
          useDialogsBackend: z.boolean().default(false)
        })
      }),
      aliceStreamingSettings: z.object({
        markdownEnabled: z.boolean().default(true),
        printingDelay: z.number().default(200),
        streamingEnabled: z.boolean().default(true)
      }),
      animateLayers: z.boolean().default(true),
      appStoreConfig: z.object({
        enabled: z.boolean().default(true),
        enabledAppsAndServicesTitle: z.boolean().default(true),
        redesignEnabled: z.boolean().default(true),
        yaosStoreNameEnabled: z.boolean().default(true)
      }),
      appsVersions: z.object({
        debounceMs: z.number().default(30_000),
        isEnabled: z.boolean().default(true),
        maxPackagesCount: z.number().default(25),
        usageStatsPeriodDays: z.number().default(30)
      }),
      audioConfig: z.object({
        vqeMetricsEnabled: z.boolean().default(true),
        vqeMetricsTimeoutMin: z.number().default(10)
      }),
      autoRotateEnabled: z.boolean().default(true),
      bluetoothPlayerSettings: z.object({
        aliceToastsOnOffEventsEnable: z.boolean().default(true),
        bluetoothOnOffEventsEnable: z.boolean().default(false)
      }),
      brightnessSettings: z.object({
        appmetricaSendingEnabled: z.boolean().default(true),
        appmetricaSendingIntervalSeconds: z.number().default(60),
        autobrightnessManualChange: z.boolean().default(false),
        emaRange: z.number().default(1),
        forceNightModeBrightness: z.boolean().default(true),
        loggingEnabled: z.boolean().default(false),
        maxForNightMode: z.number().default(1),
        minForOffNightMode: z.number().default(5),
        nightModeBreakoutTimeoutMilliseconds: z.number().default(60_000),
        nightModeBrightness: z.number().default(0),
        nightModeShortBreakoutTimeoutMilliseconds: z.number().default(10_000),
        readThreshold: z.number().default(100),
        readWindowSize: z.number().default(30)
      }),
      browserLiteSettings: z.object({
        clearDataOnAccountChanged: z.boolean().default(true),
        launchFromStartActivityV2: z.boolean().default(true)
      }),
      cameraMarksDetection: z.object({
        colorsThreshold: z.number().default(20),
        enabled: z.boolean().default(true),
        maxColorsDistance: z.number().default(5)
      }),
      carouselChromeEnabled: z.boolean().default(true),
      carouselServerUpdates: z.boolean().default(true),
      centaurWebview: z.object({
        analytics: z.object({
          allowedToReportUrls: z.array(z.string()).default([
            'youtube.com',
            'yandex.ru/iot'
          ]),
          enabled: z.boolean().default(true)
        }),
        initialScalePerUrl: z.record(z.string(), z.number()).default({
          'https://m.youtube.com/shorts/': 205
        }),
        permissions: z.array(z.object({
          name: z.string(),
          whiteList: z.array(z.string())
        })).default([
          {
            name: 'android.webkit.resource.AUDIO_CAPTURE',
            whiteList: [
              'm.youtube'
            ]
          }
        ])
      }),
      channelListConfig: z.object({
        tariffOptionsSupportedV2: z.boolean().default(true)
      }),
      clickDaemonSettings: z.object({
        crashLogConfig: z.object({
          maxDropboxTextEntryBytes: z.number().default(153_600),
          whiteList: z.array(z.string()).default([
            'ru.yandex.',
            'com.yandex.',
            'com.herocraft.game.cut.arcade.catchthecandy',
            'com.kvestiks.quiz',
            'com.partystation.app',
            'com.vk.vkvideo',
            'live.vkplay.app',
            'ru.imult.mult',
            'ru.ivi.client',
            'ru.more.play',
            'ru.mts.mtstv',
            'ru.rt.video.app.mobile',
            'ru.rutube.app'
          ])
        })
      }),
      commonPlayersSettings: z.object({
        isBluetoothPlayerEnabled: z.boolean().default(true),
        isHlsVideoPlayEnabled: z.boolean().default(true),
        isMusicPlayerEnabledV1: z.boolean().default(true),
        isTvPlayerEnabledV1: z.boolean().default(true),
        isVideoPlayerEnabled: z.boolean().default(true),
        isWebPlayerEnabledV2: z.boolean().default(true),
        isWebRtcVideoPlayEnabled: z.boolean().default(true)
      }),
      cv: z.object({
        autoCrop: z.object({
          animation: z.object({
            fps: z.number().default(60),
            minHorizontalOffset: z.number().default(0.4),
            minSizeRatio: z.number().default(1.4),
            minVerticalOffset: z.number().default(0.2),
            noFacesTimeoutMs: z.number().default(2000),
            pollRateMs: z.number().default(50),
            speed: z.number().default(0.02),
            switchOffDurationMs: z.number().default(500)
          }),
          detection: z.object({
            maxFaceHeightRatio: z.number().default(0.8),
            minFaceCountForMaxFaceHeightRatio: z.number().default(2),
            minFaceScore: z.number().default(0.98),
            newFaceDelayMs: z.number().default(2000),
            removeFaceDelayMs: z.number().default(2000),
            sameFaceDistanceRatio: z.number().default(2),
            sameFaceMaxSizeRatio: z.number().default(2)
          }),
          marginBottomRatio: z.number().default(1.2),
          marginLeftRatio: z.number().default(1),
          marginRightRatio: z.number().default(1),
          marginTopRatio: z.number().default(0.8),
          maxZoom: z.number().default(2)
        }),
        autoCropPortrait: z.object({
          animation: z.object({
            fps: z.number().default(60),
            minHorizontalOffset: z.number().default(0.25),
            minSizeRatio: z.number().default(1.1),
            minVerticalOffset: z.number().default(0.2),
            noFacesTimeoutMs: z.number().default(2000),
            pollRateMs: z.number().default(50),
            speed: z.number().default(0.02),
            switchOffDurationMs: z.number().default(500)
          }),
          detection: z.object({
            maxFaceHeightRatio: z.number().default(0.8),
            minFaceCountForMaxFaceHeightRatio: z.number().default(2),
            minFaceScore: z.number().default(0.98),
            newFaceDelayMs: z.number().default(2000),
            removeFaceDelayMs: z.number().default(2000),
            sameFaceDistanceRatio: z.number().default(2),
            sameFaceMaxSizeRatio: z.number().default(2)
          }),
          marginBottomRatio: z.number().default(1),
          marginLeftRatio: z.number().default(1),
          marginRightRatio: z.number().default(1),
          marginTopRatio: z.number().default(0.4),
          maxZoom: z.number().default(3.5)
        }),
        features: z.array(z.string()).default([
          'gestures',
          'auto_crop'
        ]),
        gestureRecognizer: z.object({
          allowChain: z.boolean().default(false),
          cvCamera: z.object({
            cameraBlockProducer: z.boolean().default(false),
            cameraHeight: z.number().default(480),
            cameraQueueDepth: z.number().default(6),
            cameraWidth: z.number().default(640)
          }),
          disallowedCardNames: z.array(z.string()).default([
            'youtube',
            'telegram_video_call',
            'calls_vertical',
            'video_player',
            'browser'
          ]),
          forceEnabledCardNames: z.array(z.string()).default([
            'alarm'
          ]),
          gestureTimeoutMs: z.number().default(300),
          holdingMaxSpeed: z.number().default(0.06),
          maxAngle: z.number().default(50),
          maxHandsCount: z.number().default(4),
          maxXAngle: z.number().default(40),
          maxYAngle: z.number().default(40),
          maxZAngle: z.number().default(40),
          minAngle: z.number().default(-1),
          minHandDetectionConfidence: z.number().default(0.4),
          minHandPresenceConfidence: z.number().default(0.4),
          minHoldingDurationMs: z.number().default(200),
          minScore: z.number().default(0.5),
          minTrackingConfidence: z.number().default(0.4),
          minTriggerPeriodMs: z.number().default(300),
          minXAngle: z.number().default(-1),
          minYAngle: z.number().default(-1),
          minZAngle: z.number().default(-1),
          onPalmSendClearQueue: z.boolean().default(true),
          onPalmSendTextCommand: z.boolean().default(true),
          onPalmStopMedia: z.boolean().default(false),
          triggerDelayMs: z.number().default(200)
        }),
        gestures: z.object({
          cardNamesReactions: z.record(z.string(), z.string()).default({
            alarm: 'stop'
          }),
          detectionTimeoutMs: z.number().default(750),
          disallowedActivityNames: z.array(z.string()).default([
            'ComponentInfo{ru.yandex.quasar.centaur_app/ru.yandex.quasar.centaur_app.calls.presentation.CallsActivity}',
            'ComponentInfo{com.yandex.browser.centaur/com.yandex.browser.tv.tvactivity.TvActivity}'
          ]),
          disallowedCardNames: z.array(z.string()).default([
            'telegram_video_call',
            'calls_vertical',
            'browser'
          ]),
          forceEnabledCardNames: z.array(z.string()).default([
            'alarm'
          ]),
          forceOnlyStopReaction: z.boolean().default(false),
          ignoreDeviceConfigSetting: z.boolean().default(false),
          intentsGestures: z.record(z.string(), z.array(z.string())).default({
            stop_or_resume: [
              'open_palm'
            ]
          }),
          minGesturesScores: z.record(z.string(), z.number()).default({
            open_palm: 0.85
          }),
          minHandHeightRatio: z.number().default(0.01),
          minRepeatedIou: z.number().default(0.3),
          reactionsTextCommands: z.record(z.string(), z.string()).default({
            resume: 'продолжи',
            stop: 'хватит'
          }),
          resumablePauseDurationMs: z.number().default(1_800_000),
          resumeReactionAllowedActivities: z.array(z.string()).default([
            'ComponentInfo{com.yandex.devices.player/com.yandex.devices.player.activity.MusicPlayerActivity}',
            'ComponentInfo{com.yandex.devices.player/com.yandex.devices.player.activity.VideoPlayerActivity}',
            'ComponentInfo{ru.yandex.quasar.centaur_app/ru.yandex.quasar.centaur_app.youtube_player.YoutubeActivity}'
          ]),
          resumeReactionAllowedCards: z.array(z.object({
            name: z.string()
          })).default([
            {
              name: 'music_native'
            },
            {
              name: 'music'
            },
            {
              name: 'video_player'
            },
            {
              name: 'ComponentInfo{ru.yandex.quasar.video_ui_app/ru.yandex.quasar.video_ui_app.MainActivity}'
            },
            {
              name: 'ComponentInfo{com.yandex.devices.player/com.yandex.devices.player.HostActivity}'
            },
            {
              name: 'video_player_native'
            },
            {
              name: 'bluetooth_music_native'
            }
          ]),
          sendSettingTcb: z.boolean().default(true),
          skipFirstActivation: z.boolean().default(true),
          systemCamera: z.object({
            restTimeMs: z.number().default(-1),
            skipFramesCount: z.number().default(4)
          })
        }),
        gesturesPortrait: z.object({
          allowedGestures: z.array(z.string()).default([
            'open_palm'
          ]),
          cardNamesReactions: z.record(z.string(), z.string()).default({
            alarm: 'stop'
          }),
          detectionTimeoutMs: z.number().default(750),
          disallowedActivityNames: z.array(z.string()).default([
            'ComponentInfo{ru.yandex.quasar.centaur_app/ru.yandex.quasar.centaur_app.calls.presentation.CallsActivity}',
            'ComponentInfo{com.yandex.browser.centaur/com.yandex.browser.tv.tvactivity.TvActivity}'
          ]),
          disallowedCardNames: z.array(z.string()).default([
            'telegram_video_call',
            'calls_vertical',
            'browser'
          ]),
          forceEnabledCardNames: z.array(z.string()).default([
            'alarm'
          ]),
          forceOnlyStopReaction: z.boolean().default(false),
          ignoreDeviceConfigSetting: z.boolean().default(false),
          intentsGestures: z.record(z.string(), z.array(z.string())).default({
            stop_or_resume: [
              'open_palm'
            ]
          }),
          minGesturesScores: z.record(z.string(), z.number()).default({
            open_palm: 0.85
          }),
          minHandHeightRatio: z.number().default(0.01),
          minRepeatedIou: z.number().default(0.3),
          reactionsTextCommands: z.record(z.string(), z.string()).default({
            resume: 'продолжи',
            stop: 'хватит'
          }),
          resumablePauseDurationMs: z.number().default(1_800_000),
          resumeReactionAllowedActivities: z.array(z.string()).default([
            'ComponentInfo{com.yandex.devices.player/com.yandex.devices.player.activity.MusicPlayerActivity}',
            'ComponentInfo{com.yandex.devices.player/com.yandex.devices.player.activity.VideoPlayerActivity}',
            'ComponentInfo{ru.yandex.quasar.centaur_app/ru.yandex.quasar.centaur_app.youtube_player.YoutubeActivity}'
          ]),
          resumeReactionAllowedCards: z.array(z.object({
            name: z.string()
          })).default([
            {
              name: 'music_native'
            },
            {
              name: 'music'
            },
            {
              name: 'video_player'
            },
            {
              name: 'ComponentInfo{ru.yandex.quasar.video_ui_app/ru.yandex.quasar.video_ui_app.MainActivity}'
            },
            {
              name: 'ComponentInfo{com.yandex.devices.player/com.yandex.devices.player.HostActivity}'
            },
            {
              name: 'video_player_native'
            },
            {
              name: 'bluetooth_music_native'
            }
          ]),
          sendSettingTcb: z.boolean().default(true),
          skipFirstActivation: z.boolean().default(true),
          systemCamera: z.object({
            restTimeMs: z.number().default(-1),
            skipFramesCount: z.number().default(4)
          })
        }),
        serviceEnabled: z.boolean().default(true),
        visualSpotter: z.object({
          ignoreDeviceConfigSetting: z.boolean().default(false),
          softEnableCount: z.number().default(0)
        }),
        yandexFaceProcessor: z.object({
          modelsConfig: z.object({
            modelsMapping: z.record(z.string(), z.array(z.string())).default({
              HAND_GESTURES: [
                'YANDEX_FACE_HAND_DETECTOR_V2',
                'YANDEX_FACE_GESTURE_CLASSIFIER'
              ]
            })
          })
        })
      }),
      debug: z.object({
        adbEnabled: z.boolean().default(true)
      }),
      div: z.object({
        disableAssertions: z.boolean().default(true),
        disableBlackBackground: z.boolean().default(true),
        parseOnBackgroundThread: z.boolean().default(true),
        scrollAngle: z.number().default(45),
        viewPool: z.object({
          enabled: z.boolean().default(true)
        })
      }),
      enabledPlatformCapabilitiesIds: z.array(z.string()).default([
        'AnimationCapability',
        'GestureRecognitionCapability'
      ]),
      enableMusicInformerNextTrackButton: z.boolean().default(true),
      enableMusicInformerSkeleton: z.boolean().default(true),
      enableNightModeCapability: z.boolean().default(true),
      enableVerticalSkeleton: z.boolean().default(true),
      enableWebPlayerCapability: z.boolean().default(true),
      familialSettings: z.object({
        browserText: z.string().default('Если вы авторизовались в Яндекс Браузере на этом\n устройстве и не хотите, чтобы другие пользователи\nСтанции Дуо Макс увидели открытые вкладки, историю\nпоиска и другие данные, связанные с вашим Яндекс ID,\nне забудьте выйти из аккаунта.\nПри смене профиля на устройстве все сохранённые\nв браузере cookie-файлы удалятся.'),
        showWarnings: z.boolean().default(true),
        telegramText: z.string().default('Нажмите «Продолжить», если вы согласны авторизоваться\nв Telegram на этом устройстве.\nВажно: другие пользователи Станции Дуо Макс могут увидеть\nвходящие звонки и историю вызовов. Чтобы этого не\nслучилось, не забудьте выйти из аккаунта.'),
        youtubeText: z.string().default('Если вы авторизованы в YouTube на этом устройстве,\nто другие пользователи Станции Дуо Макс могут увидеть ваш\nпрофиль и рекомендуемые видео. Чтобы этого не случилось,\nне забудьте выйти из аккаунта.')
      }),
      fragmentsController: z.object({
        type: z.string().default('adding')
      }),
      framedropsStatsV3: z.object({
        isEnabled: z.boolean().default(true),
        statsCollectionPeriodMs: z.number().default(180_000),
        statsWindowMs: z.number().default(720_000)
      }),
      generate204Settings: z.object({
        failPeriodMs: z.number().default(10_000),
        periodMs: z.number().default(20_000),
        timeoutMs: z.number().default(8000)
      }),
      imageCacheSettings: z.object({
        bitmapCacheSizeMb: z.number().default(50),
        compressedCacheSizeMb: z.number().default(50),
        memoryTrimEvictLevel: z.string().default('compressed_lru'),
        useCompressedCache: z.boolean().default(true)
      }),
      informersAppearance289: z.string().default('LIGHT'),
      informersEnabled: z.boolean().default(true),
      iocom: z.object({
        enableColdCapabilities: z.boolean().default(true),
        useActiveConnectionForAllDirectives: z.boolean().default(false)
      }),
      iosdkReporterSettings: z.object({
        eventsWhiteList: z.array(z.string()).default([
          'framedrop_stats',
          'lmk_kill_process'
        ])
      }),
      iotDevices: z.object({
        availableIotDevicesTypes: z.array(z.string()).default([
          'ILLUMINATION',
          'LIGHT_TORCHERE',
          'LIGHT_BRA',
          'LIGHT_LUSTER',
          'LIGHT_LAMP',
          'LIGHT_GARLAND',
          'LIGHT_STRIP',
          'SOCKET',
          'HUMIDIFIER',
          'KETTLE',
          'VACUUM_CLEANER'
        ]),
        offlineDeviceStatusMetricsEnabled: z.boolean().default(true),
        useNewIotDevicesInteractor: z.boolean().default(true)
      }),
      isIoClientFeaturesEnabledV1: z.boolean().default(true),
      jsInject: z.object({
        browserUrl: z.string().default('https://dialogs.s3.yandex.net/smart_displays/ariadne/stable/11.0/browser.js'),
        smartHomeUrl: z.string().default('https://dialogs.s3.yandex.net/smart_displays/ariadne/stable/11.0/smarthome.js'),
        youtubeUrl: z.string().default('https://dialogs.s3.yandex.net/smart_displays/ariadne/stable/12.0/youtube.js')
      }),
      keyboardScreenResizeSettings: z.string().default('everywhere'),
      launcherConfig: z.object({
        youtubeEnabled: z.boolean().default(false)
      }),
      lavaLevel: z.string().default('waves'),
      leds: z.object({
        bluetoothMusicEnabled: z.boolean().default(true),
        bluetoothPlayAnimationEnabled: z.boolean().default(false),
        enabled: z.boolean().default(true),
        health: z.object({
          checkPeriodMs: z.number().default(10_000),
          enabled: z.boolean().default(true),
          maxDurationPlayingMs: z.number().default(3_600_000),
          timeoutMs: z.number().default(300_000)
        }),
        newLedInClock: z.boolean().default(true)
      }),
      mainScreen: z.object({
        design: z.string().default('tabs_with_icons'),
        timeoutSeconds: z.number().default(120),
        useTimeout: z.boolean().default(true)
      }),
      mainScreenServerUpdates: z.boolean().default(true),
      mediaSessionServiceSettings: z.object({
        enabled: z.boolean().default(true),
        videoSupportedMediaSessionApplications: z.array(z.string()).default([
          'com.yandex.devices.player'
        ])
      }),
      memoryAnalytics: z.object({
        enabled: z.boolean().default(true),
        memoryReportPeriodMs: z.number().default(600_000)
      }),
      meson: z.object({
        nightIntervalEnd: z.number().default(6),
        nightIntervalStart: z.number().default(2),
        quarkIntegrationVersion: z.number().default(8),
        switchStrategy: z.string().default('UPDATER_LIKE_REBOOT')
      }),
      multiAccount: z.object({
        enableAccountsSuggestV2: z.boolean().default(true),
        enabled: z.boolean().default(true),
        enabledMultiAccountCapability: z.boolean().default(true),
        needUpdateSettings: z.boolean().default(true),
        needUpdateTeasers: z.boolean().default(true)
      }),
      multiapp: z.object({
        enabledAliceUi252: z.boolean().default(true),
        finishTaskOnHide: z.boolean().default(true),
        keepAliveTasksWhitelist: z.array(z.string()).default([
          'com.yandex.devices.player'
        ]),
        registry: z.object({
          iosdkCapabilities: z.record(z.string(), z.object({
            enableStrategy: z.string(),
            hosts: z.array(z.string()),
            switchStrategy: z.string()
          })).default({
            AccessibilityVoiceControlCapability: {
              enableStrategy: 'hosts_only',
              hosts: [
                'ru.yandex.quasar.alice_ui_app'
              ],
              switchStrategy: 'instant'
            },
            ClockAppCapability: {
              enableStrategy: 'hosts_only',
              hosts: [
                'com.yandex.devices.clock'
              ],
              switchStrategy: 'instant'
            },
            PayCapability: {
              enableStrategy: 'hosts_only',
              hosts: [
                'com.yandex.devices.payment'
              ],
              switchStrategy: 'instant'
            }
          })
        })
      }),
      musicPlayerConfig: z.object({
        debounceForLyricsToggle: z.number().default(0),
        delayForLyricsView: z.number().default(0),
        disclaimerConfig: z.object({
          enabled: z.boolean().default(true),
          timeoutToHideDisclaimer: z.number().default(60_000)
        }),
        enableBluetoothPlayerV1: z.boolean().default(true),
        karaokeModeEnabledV1: z.boolean().default(true),
        lyricsModeEnabledV1: z.boolean().default(true),
        playlistConfig: z.object({
          enabled: z.boolean().default(true),
          enableListenedToCheckmarks: z.boolean().default(true),
          enableModalDialog: z.boolean().default(false)
        }),
        redesignEnabled: z.boolean().default(true)
      }),
      musicPlayerSettings: z.object({
        defaultCoverImage297Enabled: z.boolean().default(true),
        hideTimeoutInSeconds: z.number().default(180),
        isTimeoutEnabled: z.boolean().default(true)
      }),
      musicSearch: z.object({
        horizontalScrollEnabled: z.boolean().default(false),
        indexesLoadExtra: z.number().default(5),
        initialLoadSize: z.number().default(20),
        maxItemCount: z.number().default(100),
        pageSize: z.number().default(20),
        prefetchDistance: z.number().default(11)
      }),
      nativeMusicVerticalV2: z.object({
        enableMusicSearch: z.boolean().default(true),
        enableNativeMusicVertical: z.boolean().default(true),
        enableSearchHistory: z.boolean().default(false),
        isArpcEnabled: z.boolean().default(true),
        playCardAsMyWave: z.boolean().default(false),
        showPlaybackInfoInCard: z.boolean().default(true)
      }),
      nativeTv: z.object({
        enableNativeTvChannelsList: z.boolean().default(true),
        isCommonGridEnabled: z.boolean().default(true),
        nativeTvSkeletonEnabled: z.boolean().default(true),
        tariffOptionsSupported: z.boolean().default(true)
      }),
      nativeVideoPlayer: z.object({
        enableNativeVideoPlayer: z.boolean().default(true)
      }),
      newHomeScreen: z.object({
        enabled: z.boolean().default(true),
        enableTeasersChangeBySwipe: z.boolean().default(true),
        lockscreenReturnDelayS: z.number().default(60),
        whitelistedPackagePrefixesInGrid: z.array(z.string()).default([
          'com.yandex.centaur.webcam',
          'com.yandex.devices.webcam',
          'com.yandex.devices.whatsnew'
        ])
      }),
      newVideoplayerSkinEnabled: z.boolean().default(true),
      newVideoSkeleton: z.boolean().default(true),
      nightModeConfig: z.object({
        awakeDeviceOnAliceSpotter: z.boolean().default(true),
        enableCustomFonts: z.boolean().default(true),
        enableRedClockMode: z.boolean().default(true),
        enableShowClockSwitch: z.boolean().default(true),
        isNewNightModeEnabledV2: z.boolean().default(true),
        isNewNightModeEnabledV4: z.boolean().default(true)
      }),
      offlineModeSettings: z.object({
        enabled: z.boolean().default(false),
        glassEnabled: z.boolean().default(false),
        internetNotReachableToastEnabled: z.boolean().default(false),
        localTeaserEnabled: z.boolean().default(false)
      }),
      offlineModeSettingsV2: z.object({
        localTeaserEnabledV2: z.boolean().default(true)
      }),
      parentalControlConfig: z.object({
        ageRestrictionPolicyEnabledV2: z.boolean().default(true),
        allowedPinEnterAttempts: z.number().default(10),
        appWhitelistSupportedV3: z.boolean().default(true),
        canBlockVideoSearch: z.boolean().default(true),
        searchVideoRestrictionsNotificationDurationMs: z.number().default(1500),
        supported: z.boolean().default(true)
      }),
      realtimeMetricaConfig: z.object({
        whitelist: z.array(z.string()).default([
          'app_error',
          'app_crash'
        ])
      }),
      realtimeMetricaSettings: z.object({
        enableSendCrashError: z.boolean().default(true),
        enableSendLogError: z.boolean().default(true)
      }),
      recentsInformerConfigV2: z.object({
        backgroundUpdateEnabled: z.boolean().default(true),
        enabled: z.boolean().default(true),
        internalApps: z.array(z.string()).default([
          'com.android.permissioncontroller',
          'com.android.settings',
          'com.android.tv.settings',
          'com.android.providers.settings',
          'com.yandex.devices.smarthome',
          'com.yandex.centaur.webcam',
          'com.yandex.devices.webcam',
          'com.yandex.centaur.applications.settings',
          'com.yandex.devices.clock',
          'com.yandex.devices.payment'
        ]),
        isOrganicContentEnabled: z.boolean().default(true),
        maxItemsCount: z.number().default(2),
        updatePeriodJitter: z.number().default(0.25),
        updatePeriodS: z.number().default(14_400)
      }),
      reporting: z.object({
        cmaAllocFailedReportDebounceMs: z.number().default(60_000)
      }),
      screenNavigationSettings: z.object({
        shouldCloseCardWithKeyboardOnGoBack: z.boolean().default(true),
        swipesEnabled: z.boolean().default(true),
        swipesTimeout: z.number().default(4000),
        voiceNavigationEnabled: z.boolean().default(true)
      }),
      shouldFilter1080pQuality: z.boolean().default(false),
      skipVideoFragmentDirectiveEnabled: z.boolean().default(true),
      smartHomeSettings: z.object({
        enableV2App: z.boolean().default(true),
        isActiveInBackground: z.boolean().default(true),
        useApp: z.boolean().default(true)
      }),
      speakerCallsEnabled: z.boolean().default(true),
      speakerCallsOnTop: z.boolean().default(true),
      statusBarConfigV2: z.object({
        enabled: z.boolean().default(true),
        enabledOnDivScreens: z.boolean().default(true)
      }),
      systemDialogs: z.object({
        systemDialogsInteraction: z.boolean().default(true)
      }),
      taskStack: z.object({
        enabled: z.boolean().default(true),
        offsetThreshold: z.number().default(12),
        velocityThreshold: z.number().default(17)
      }),
      teasersFeatureConfig: z.object({
        teasersSettingsMetricsEnabled: z.boolean().default(true),
        teasersSettingsMetricsSendPeriodMinutes: z.number().default(1440)
      }),
      teasersSettings: z.object({
        advancedBitmapCacheSizeMb: z.number().default(150),
        chunkSize: z.number().default(5),
        liveBackgroundRemoveStrategy: z.string().default('view_lock'),
        nativeTeasersEnabled: z.boolean().default(true),
        preheatTeasersCount: z.number().default(1),
        teasersAutoChangePeriodSeconds: z.number().default(180),
        teasersDebounceConfig: z.object({
          fromMin: z.number().default(0),
          toMin: z.number().default(30)
        }),
        teasersRequestPeriodMin: z.number().default(240),
        teasersRequestRandomPeriod: z.object({
          fromMin: z.number().default(0),
          toMin: z.number().default(90)
        }),
        useAdvancedImageCache: z.boolean().default(true),
        videoBackgroundsConfig: z.object({
          backgroundsDirectoryMaxSizeMb: z.number().default(200),
          isExternalDownloadingEnabled: z.boolean().default(true),
          updatePeriodHours: z.number().default(12),
          videoBackgroundsRelevancyTimeDays: z.number().default(14)
        })
      }),
      timersSettings: z.object({
        autoHideCardOnDayDelayMinutes: z.number().default(20),
        autoHideCardOnNightDelayMinutes: z.number().default(5)
      }),
      topSheetSettings: z.object({
        advancedTopSheetEnabled: z.boolean().default(true),
        musicPlayerEnabled: z.boolean().default(true)
      }),
      tvPlayerConfig: z.object({
        allowRemoteConfiguration: z.boolean().default(true)
      }),
      tvSettings: z.object({
        enabled: z.boolean().default(true),
        enabledChannels: z.boolean().default(true)
      }),
      useBackendInactivityTimeout: z.boolean().default(true),
      useBackendSettings: z.boolean().default(true),
      useLocalDirectivePipe: z.array(z.string()).default([
        'divui_show_view'
      ]),
      useMasterClearIntentForReset: z.boolean().default(true),
      useServersideActivityKinds: z.boolean().default(true),
      useStackedLayerManager: z.boolean().default(true),
      useYabroView: z.boolean().default(false),
      videoAppConfig: z.object({
        enabled: z.boolean().default(true)
      }),
      videoCalls: z.object({
        bufferTimeMinForDeleteAndAddedContacts: z.number().default(1),
        shouldFreeEglOnDestroy: z.boolean().default(false),
        telegramCallsEnabled: z.boolean().default(true)
      }),
      videoConfig: z.object({
        enableExternalCinemasV2: z.boolean().default(true),
        enableHorizontalLoader: z.boolean().default(true),
        isEditModeSupported: z.boolean().default(true),
        isOrganicContentEnabled: z.boolean().default(true),
        isVideoPurchaseEnabled: z.boolean().default(true),
        nativeMovieDetailsSearchButtonEnabled: z.boolean().default(true),
        nativeMovieDetailsSkeletonEnabled: z.boolean().default(true),
        nativeSeasonsAndEpisodesSkeletonEnabled: z.boolean().default(true),
        nativeVideoMainScreenEnabled: z.boolean().default(true),
        scrollAngle: z.number().default(65),
        videoVerticalIndexesLoadExtra: z.number().default(10)
      }),
      videoPlayerConfig: z.object({
        allowRemoteConfiguration: z.boolean().default(true),
        ignoreVideometaError: z.boolean().default(true),
        useArpcForVideoMetadata: z.boolean().default(true)
      }),
      videoPlayerControl: z.object({
        enabled: z.boolean().default(true)
      }),
      videoSearchConfig: z.object({
        enableBrowserButton: z.boolean().default(false),
        enableNativeSearch: z.boolean().default(true)
      }),
      webPlayerConfig: z.object({
        doc2DocEnabledV3: z.boolean().default(true),
        supportedPlayers: z.record(z.string(), z.object({
          additionalVideoUrlParams: z.object({
            partnerName: z.string().optional()
          }).default({}),
          ignoreWebViewErrors: z.boolean().optional(),
          sandboxName: z.string().optional(),
          sandboxVersion: z.string().optional(),
          useJsControlsScript: z.boolean().optional(),
          userAgent: z.string().optional()
        })).default({
          __raw_opengraph_embed_url__: {
            additionalVideoUrlParams: {},
            sandboxName: 'iframe-default',
            useJsControlsScript: true
          },
          default: {
            additionalVideoUrlParams: {},
            sandboxName: 'iframe-default',
            sandboxVersion: '0x1c08506a220'
          },
          ebalka: {
            additionalVideoUrlParams: {},
            sandboxName: 'iframe-default',
            useJsControlsScript: true
          },
          izlesene: {
            additionalVideoUrlParams: {},
            sandboxName: 'izlesene'
          },
          mailru_new: {
            additionalVideoUrlParams: {},
            sandboxName: 'mailru',
            sandboxVersion: '0x1c08506a220',
            userAgent: 'Mozilla/5.0 (Linux; Android 7.0; SM-G570M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.102 Mobile Safari/537.36'
          },
          ok: {
            additionalVideoUrlParams: {},
            sandboxName: 'ok'
          },
          pornhub: {
            additionalVideoUrlParams: {},
            sandboxName: 'iframe-default',
            useJsControlsScript: true
          },
          rutube: {
            additionalVideoUrlParams: {},
            ignoreWebViewErrors: true,
            sandboxName: 'rutube',
            sandboxVersion: '0x1c08506a220'
          },
          vimeo: {
            additionalVideoUrlParams: {},
            sandboxName: 'vimeo'
          },
          vk: {
            additionalVideoUrlParams: {
              partnerName: 'yaos'
            },
            ignoreWebViewErrors: true,
            sandboxName: 'vk'
          },
          yandex: {
            additionalVideoUrlParams: {},
            sandboxName: 'yandex'
          },
          zen: {
            additionalVideoUrlParams: {},
            useJsControlsScript: true
          }
        }),
        useBrowserMediaSession: z.boolean().default(true),
        voiceControlsEnabledV3: z.boolean().default(true)
      }),
      webPlayerSettings: z.object({
        supportedPlayers: z.record(z.string(), z.object({
          sandboxName: z.string(),
          sandboxVersion: z.string().optional(),
          useCustomJsScript: z.boolean().optional()
        })).default({
          izlesene: {
            sandboxName: 'izlesene'
          },
          mailru_new: {
            sandboxName: 'mailru',
            sandboxVersion: '0xe7891f6f377'
          },
          ok: {
            sandboxName: 'ok'
          },
          pornhub: {
            sandboxName: 'iframe-default',
            useCustomJsScript: true
          },
          rutube: {
            sandboxName: 'rutube',
            sandboxVersion: '0x6301cd27658'
          },
          vimeo: {
            sandboxName: 'vimeo'
          },
          vk: {
            sandboxName: 'vk'
          },
          yandex: {
            sandboxName: 'yandex'
          },
          zen: {
            sandboxName: 'dzen'
          }
        })
      }),
      widgetsV2: z.object({
        enable: z.boolean().default(true),
        smartHome: z.object({
          enabled: z.boolean().default(true),
          openDeviceEnabled: z.boolean().default(true)
        })
      }),
      youtubeInject: z.object({
        enableVoiceNavigation: z.boolean().default(true),
        enableYoutubeClient: z.boolean().default(true),
        playerCodecs: z.object({
          allowed: z.array(z.string()).default([]),
          disallowed: z.array(z.string()).default([
            'vp09',
            'vp9'
          ]),
          enabled: z.boolean().default(true)
        }),
        shortsAutoplay: z.boolean().default(true),
        voiceItemSelection: z.boolean().default(true)
      }),
      youtubePlayer: z.object({
        enabled: z.boolean().default(true)
      }),
      youtubeUrlsWhitelist: z.array(z.string()).default([
        'https://accounts.google',
        'https://myaccount.google',
        'https://gds.google',
        'https://support.google',
        'https://play.google',
        'https://m.youtube',
        'https://youtube',
        'https://fonts.googleapis',
        'https://ssl.gstatic',
        'https://accounts.youtube',
        'https://policies.google'
      ])
    }),
    commandSpottersMode: z.string().default('textInput'),
    commandSpottersSoundDurations: z.record(z.string(), z.number()).default({
      'включи телевизор': 1000
    }),
    comYandexCapabilities: z.object({
      accessibleVoiceCapabilityEnabled: z.boolean().default(true),
      appFunctionCapabilityEnabled: z.boolean().default(true),
      appLaunchCapabilityEnabled: z.boolean().default(true),
      brightnessCapabilityEnabled: z.boolean().default(true),
      catalogCapability: z.object({
        openCatalogDirectiveEnabled: z.boolean().default(true)
      }),
      catalogCapabilityEnabled: z.boolean().default(true),
      deeplinkCapabilityEnabled: z.boolean().default(true),
      detailsCapability: z.object({
        openPurchaseProcessDirectiveEnabled: z.boolean().default(true),
        showExternalCinemasDirectiveEnabled: z.boolean().default(true)
      }),
      detailsCapabilityEnabled: z.boolean().default(true),
      deviceControlPanelCapabilityV1: z.object({
        childModeUnblockDirectiveEnabled: z.boolean().default(true),
        deviceControlPanelAppUsageUpdatePeriodMs: z.number().default(5000),
        enabled: z.boolean().default(true)
      }),
      divUiCapabilityBackgroundDirectives: z.array(z.string()).default([
        'add_to_watch_list_directive',
        'clear_queue',
        'draw_animation_directive',
        'go_backward',
        'go_down',
        'go_forward',
        'go_left',
        'go_up',
        'load_screensavers',
        'player_pause',
        'remove_from_watch_list_directive',
        'sound_louder',
        'sound_mute',
        'sound_quiter',
        'sound_set_level',
        'sound_unmute',
        'tandem_update_media_directive',
        'tts_play_placeholder',
        'type'
      ]),
      divUiCapabilityEnabledV2: z.boolean().default(true),
      divViewCapabilityEnabled: z.boolean().default(true),
      galleryControlCapabilityEnabled: z.boolean().default(true),
      multiAccountCapability: z.object({
        addAccountDirectiveEnabled: z.boolean().default(true),
        addAccountDirectiveV2Enabled: z.boolean().default(true),
        childAccountSwitchBlockEnabled: z.boolean().default(true),
        openAccountListDirectiveEnabled: z.boolean().default(true)
      }),
      multiAccountCapabilityEnabled: z.boolean().default(true),
      musicPlatformQueueCapabilityEnabled: z.boolean().default(true),
      onOffCapability: z.object({
        screenOffDirectiveEnabled: z.boolean().default(true)
      }),
      onOffCapabilityEnabled: z.boolean().default(true),
      screensaverCapability: z.object({
        closeScreensaverDirectiveEnabled: z.boolean().default(true)
      }),
      screenshotCapabilityEnabledV1: z.boolean().default(true),
      searchCapabilityEnabled: z.boolean().default(true),
      serialNavigatorCapability: z.object({
        openPurchaseDirectiveEnabled: z.boolean().default(true),
        showEpisodeDirectiveEnabled: z.boolean().default(true)
      }),
      serialNavigatorCapabilityEnabled: z.boolean().default(true),
      sourceInputCapabilityEnabled: z.boolean().default(true),
      tvCategoriesCapabilityEnabled: z.boolean().default(true),
      tvChannelCapabilityEnabledV3: z.boolean().default(true),
      tvChannelCapabilitySizeListPrevNextChannels: z.number().default(5),
      tvUpdateCapability: z.object({
        hideTvUpdateDirectiveEnabled: z.boolean().default(true),
        installTvUpdateDirectiveEnabled: z.boolean().default(true),
        retryTvUpdateDirectiveEnabled: z.boolean().default(true)
      }),
      tvUpdateCapabilityEnabled: z.boolean().default(true),
      videoPlayerCapabilityEnabled: z.boolean().default(true),
      videoPlayerControlCapability: z.object({
        cancelSkipDirectiveEnabled: z.boolean().default(true),
        setSpeedDirectiveEnabled: z.boolean().default(true),
        skipAdDirectiveEnabled: z.boolean().default(true),
        skipVideoFragmentDirectiveEnabled: z.boolean().default(true)
      }),
      videoPlayerControlCapabilityEnabled: z.boolean().default(true),
      voiceEnrollmentCapabilityEnabled: z.boolean().default(true),
      watchListCapabilityEnabled: z.boolean().default(true),
      webPlayerCapabilityEnabled: z.boolean().default(true),
      webPlayerControlCapability: z.object({
        webPlayerControlCapabilityEnabled: z.boolean().default(true)
      }),
      whatsNewCapability: z.object({
        whatsNewCapabilityEnabled: z.boolean().default(true)
      })
    }),
    comYandexCentaurApplicationsSettings: z.object({
      appsSettingsConfig: z.object({
        permissionsWhitelist: z.array(z.string()).default([
          'android.permission.CAMERA',
          'android.permission.RECORD_AUDIO',
          'android.permission.READ_CONTACTS'
        ])
      }),
      displaySettingsConfig: z.object({
        enabledFeatures: z.array(z.string()).default([
          'wallpapers',
          'clock_and_widgets',
          'night_mode'
        ])
      }),
      enabled: z.boolean().default(true),
      enabledFeatures: z.array(z.string()).default([
        'wifi',
        'account',
        'support',
        'management',
        'display',
        'lock',
        'apps'
      ]),
      managementConfig: z.object({
        intonationInterruptingEnabled: z.boolean().default(true),
        intonationSpotterEnabled: z.boolean().default(true),
        visualSpotterEnabled: z.boolean().default(false)
      }),
      orientationSettingsConfig: z.object({
        landscapeOrientationV2: z.boolean().default(false)
      }),
      supportConfig: z.object({
        osVersion: z.string().default('YaOS X'),
        showCheckUpdatesButton: z.boolean().default(true)
      }),
      wifiSettingsConfig: z.object({
        scanDelaySeconds: z.number().default(10)
      })
    }),
    comYandexCentaurFeatureAutoDeflation: z.object({
      useLegacyAutoDeflation: z.boolean().default(false)
    }),
    comYandexCentaurFeatureMusicUi: z.object({
      nativeMusicNavigation: z.object({
        enabled: z.boolean().default(true)
      })
    }),
    comYandexCentaurIntercomRouter: z.object({
      shouldLaunchWebcamForIntercomCalls: z.boolean().default(true)
    }),
    comYandexDevicesAppstore: z.object({
      browserPackageName: z.string().default('com.yandex.browser.centaur'),
      debugLoggingEnabled: z.boolean().default(false),
      privateApps: z.object({
        enabled: z.boolean().default(true),
        subtitle: z.string().default('по QR коду или ссылке: ya.cc/quick-apps'),
        title: z.string().default('Загружайте свои приложения\nна ваши устройства'),
        url: z.string().default('https://ya.cc/quick-apps')
      }),
      sendLogError: z.boolean().default(true),
      showColoredGradient: z.boolean().default(true),
      showSearchPlaceholder: z.boolean().default(false),
      showVoiceControls: z.boolean().default(true)
    }),
    comYandexDevicesClock: z.object({
      alarms: z.object({
        isActionsAvailable: z.boolean().default(true),
        isCardNumsVisible: z.boolean().default(false),
        isOnlyViewMode: z.boolean().default(false),
        isScheduleVoiceHintAvailable: z.boolean().default(false),
        isSoundVoiceHintAvailable: z.boolean().default(false),
        snoozeDurationInMinutes: z.number().default(5),
        useUtcTime: z.boolean().default(false)
      }),
      enabled: z.boolean().default(true),
      isCloseButtonVisible: z.boolean().default(false),
      newPlayingAnimEnabled: z.boolean().default(true),
      timers: z.object({
        isCardNumsVisible: z.boolean().default(false),
        isOnlyViewMode: z.boolean().default(false),
        showRecentTimers: z.boolean().default(true),
        showTimerSetter: z.boolean().default(true)
      })
    }),
    comYandexDevicesFeatureMusicplayer: z.object({
      debounceForLyricsToggle: z.number().default(0)
    }),
    comYandexDevicesFeatureMusicplayerUi: z.object({
      coverFlipEnabled: z.boolean().default(true),
      disclaimerConfig: z.object({
        enabled: z.boolean().default(true),
        timeoutToHideDisclaimer: z.number().default(60_000)
      }),
      karaokeModeEnabledV1: z.boolean().default(true),
      keepScreenOnWhilePlayingWithoutLyrics: z.boolean().default(false),
      lyricsModeEnabledV1: z.boolean().default(true),
      playlistConfig: z.object({
        enabled: z.boolean().default(true)
      })
    }),
    comYandexDevicesFeaturesSettingsConfigurer: z.object({
      androidSettings: z.object({
        enabled: z.boolean().default(true),
        secureSettings: z.object({
          keyboardBindOnlyWithEditInfo: z.object({
            value: z.string().default('1'),
            valueType: z.string().default('INT')
          })
        })
      })
    }),
    comYandexDevicesFeatureTariffofferUi: z.object({
      fullscreenTariffOfferConfig: z.object({
        purchaseButtonText: z.string().default('К оплате')
      })
    }),
    comYandexDevicesFeatureTvchannelgridUi: z.object({
      channelsUpdatePeriodMinutes: z.number().default(55),
      isAddingToFavoritesEnabled: z.boolean().default(true),
      tvGridVoiceControlsEnabled: z.boolean().default(true)
    }),
    comYandexDevicesFeatureTvchannellist: z.object({
      channelFavouriteCategoryAtBeginning: z.boolean().default(true),
      defaultChannelsUpdatePeriodMinutes: z.number().default(25),
      programsRequestAdditionalMinutes: z.number().default(25),
      tariffOptionsSupported: z.boolean().default(true),
      useContentIdRequestStrategy: z.boolean().default(true)
    }),
    comYandexDevicesFeatureTvchannellistUi: z.object({
      channelListVoiceControlsEnabled: z.boolean().default(false),
      channelsUpdatePeriodMinutes: z.number().default(55)
    }),
    comYandexDevicesFeatureTvplayerUi: z.object({
      isProgramsEnabledV1: z.boolean().default(true),
      useNewKinopoiskOttChannelWithScheduler: z.boolean().default(true)
    }),
    comYandexDevicesFeatureVideoplayerUi: z.object({
      ignoreVideometaError: z.boolean().default(true),
      isSmartSkipEnabledV3: z.boolean().default(true),
      stopAutoPlaybackTimeoutMs: z.number().default(15_000)
    }),
    comYandexDevicesFeatureWebcamGridUi: z.object({
      showIntercomDevices: z.boolean().default(true)
    }),
    comYandexDevicesFeatureWebcamUi: z.object({
      enableCameraRotation: z.boolean().default(true)
    }),
    comYandexDevicesFeatureWebplayerUi: z.object({
      bufferSizeInSeconds: z.number().default(0.5334),
      doc2Doc: z.object({
        doc2DocEnabledV2: z.boolean().default(true),
        voiceControlsEnabledV3: z.boolean().default(true)
      }),
      isEpisodesButtonEnabled: z.boolean().default(true),
      isNextVideoButtonEnabled: z.boolean().default(true),
      supportedPlayers: z.record(z.string(), z.object({
        additionalVideoUrlParams: z.object({
          partnerName: z.string().optional()
        }).default({}),
        ignoreWebViewErrors: z.boolean().optional(),
        sandboxName: z.string().optional(),
        sandboxVersion: z.string(),
        showNativeSubtitles: z.boolean().optional(),
        useJsControlsScript: z.boolean().optional(),
        useNativeOverlayV2: z.boolean().optional(),
        userAgent: z.string().optional()
      })).default({
        __raw_opengraph_embed_url__: {
          additionalVideoUrlParams: {},
          sandboxName: 'iframe-default',
          sandboxVersion: '0x001cd987dbd',
          useJsControlsScript: true
        },
        default: {
          additionalVideoUrlParams: {},
          sandboxName: 'iframe-default',
          sandboxVersion: '0x001cd987dbd'
        },
        ebalka: {
          additionalVideoUrlParams: {},
          sandboxName: 'iframe-default',
          sandboxVersion: '0x001cd987dbd',
          useJsControlsScript: true
        },
        izlesene: {
          additionalVideoUrlParams: {},
          sandboxName: 'izlesene',
          sandboxVersion: '0x001cd987dbd'
        },
        mailru_new: {
          additionalVideoUrlParams: {},
          sandboxName: 'mailru',
          sandboxVersion: '0x001cd987dbd',
          userAgent: 'Mozilla/5.0 (Linux; Android 7.0; SM-G570M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.102 Mobile Safari/537.36'
        },
        ok: {
          additionalVideoUrlParams: {},
          sandboxName: 'ok',
          sandboxVersion: '0x001cd987dbd'
        },
        pornhub: {
          additionalVideoUrlParams: {},
          sandboxName: 'iframe-default',
          sandboxVersion: '0x001cd987dbd',
          useJsControlsScript: true
        },
        rutube: {
          additionalVideoUrlParams: {},
          ignoreWebViewErrors: true,
          sandboxName: 'rutube',
          sandboxVersion: '0x001cd987dbd'
        },
        vimeo: {
          additionalVideoUrlParams: {},
          sandboxName: 'vimeo',
          sandboxVersion: '0x001cd987dbd'
        },
        vk: {
          additionalVideoUrlParams: {
            partnerName: 'yaos'
          },
          ignoreWebViewErrors: true,
          sandboxName: 'vk',
          sandboxVersion: '0x001cd987dbd'
        },
        yandex: {
          additionalVideoUrlParams: {},
          sandboxName: 'yandex',
          sandboxVersion: '0x001cd987dbd'
        },
        zen: {
          additionalVideoUrlParams: {},
          sandboxVersion: '0x001cd987dbd',
          useJsControlsScript: true
        }
      }),
      useBrowserMediaSessionV2: z.boolean().default(true),
      voiceControlsEnabledV3: z.boolean().default(true),
      voiceControlsTracksEnabled: z.boolean().default(true)
    }),
    comYandexDevicesOverwatcher: z.object({
      enabled: z.boolean().default(true),
      watchPeriodSeconds: z.number().default(5)
    }),
    comYandexDevicesPlayer: z.object({
      ageRestrictionPolicyEnabledV2: z.boolean().default(true),
      isCommonChannelListEnabled: z.boolean().default(true),
      usePaymentAppToBuyChannels: z.boolean().default(true),
      useTariffOfferRedesignWithoutQr: z.boolean().default(true)
    }),
    comYandexDevicesSmarthome: z.object({
      enableEdgeToEdge: z.boolean().default(true)
    }),
    comYandexDevicesWhatsnew: z.object({
      supportedWhatsNewStorageFeatures: z.array(z.string()).default([
        'main_screen_setup_duo',
        'alice_skills_duo',
        'browser_duo',
        'tv_channels_duo',
        'smart_home_duo',
        'clock_duo',
        'yaos_store_duo',
        'video',
        'music_duo',
        'accounts_duo',
        'alice_intro_duo',
        'parental_control_duo',
        'screensavers_duo',
        'night_mode_duo'
      ])
    }),
    comYandexIoSdk: z.object({
      aliceSession: z.object({
        enableForceHandleAssist: z.boolean().default(true),
        enableUnconditionalShowSession: z.boolean().default(true)
      }),
      appfunction: z.object({
        enabledV1: z.boolean().default(true)
      }),
      canHandleTvGridDirectives: z.boolean().default(true),
      canHandleTvGridDirectivesV2: z.boolean().default(true),
      canHandleTvGridDirectivesV3: z.boolean().default(true),
      canHandleTvGridDirectivesV4: z.boolean().default(true),
      framedrops: z.object({
        isEnabled: z.boolean().default(true)
      }),
      framedropsV2: z.object({
        isEnabled: z.boolean().default(true)
      }),
      integration: z.object({
        quarkIntegrationVersion: z.number().default(9),
        shouldListenRemoteEndpoints: z.boolean().default(true),
        switchStrategy: z.string().default('PROCESS_RESTART_AWAIT')
      }),
      ioCom: z.object({
        capabilities: z.object({
          isConfigCapabilityEnabled: z.boolean().default(true),
          isIotDevicesCapabilitiesEnabledV3: z.boolean().default(true),
          isMusicCapabilitiesEnabledV4: z.boolean().default(true),
          isScreenshotNotificationCapabilityEnabled: z.boolean().default(true),
          useIoComForAlarm: z.boolean().default(true),
          useIoComForScreensaversV3: z.boolean().default(true)
        }),
        ioComHostEnabledV4: z.boolean().default(true),
        ioComRegistryEnabled: z.boolean().default(true),
        ioComServerEnabled: z.boolean().default(true),
        isColdMetaEnabledV3: z.boolean().default(true),
        isIoComForMusicEnabled: z.boolean().default(true),
        isIoComForVoiceControlSettingsEnabled: z.boolean().default(true)
      }),
      isIoClientFeaturesEnabledV1: z.boolean().default(true),
      isVqeEnabled: z.boolean().default(true),
      leds: z.object({
        runLedOnSpotter: z.boolean().default(true),
        spotterCancellationTimeoutMs: z.number().default(2500)
      }),
      mediaSession: z.object({
        isEnabledV3: z.boolean().default(true),
        lastWatchedEnabled: z.boolean().default(true),
        supportedBackgroundMusicApplications: z.array(z.string()).default([
          'com.yandex.tv.daydream'
        ]),
        supportedMediaSessionApplications: z.array(z.string()).default([
          'com.ctcmediagroup.videomore',
          'com.vk.tv',
          'com.yandex.tv.webplayer',
          'com.yandex.tv.ytplayer',
          'gpm.tnt_premier',
          'ru.ivi.client',
          'ru.kinopoisk.yandex.tv',
          'ru.litres.android.audio',
          'ru.rt.video.app.tv',
          'ru.rutube.app',
          'ru.start.androidmobile'
        ]),
        useDialogsBackendForMediaSession: z.boolean().default(true)
      }),
      navigateHomeOnSleepTimeoutMsV4: z.number().default(1_800_000),
      oknyx: z.object({
        enableAdjustableOknyxLocationV1: z.boolean().default(true)
      }),
      recognitionService: z.object({
        recognitionTimeoutMs: z.number().default(7000)
      }),
      restartAudioRecordTriesLimit: z.number().default(10),
      tandemSettingsEnabled: z.boolean().default(false),
      videoPlayRouter: z.object({
        shouldRouteWebRtcToGoloomV4: z.boolean().default(true)
      })
    }),
    comYandexLauncherUpdaterapp: z.object({
      media: z.object({
        image: z.record(z.string(), z.string()).default({}),
        video: z.record(z.string(), z.record(z.string(), z.object({
          fileSize: z.number(),
          maxDownloadTime: z.number(),
          url: z.string()
        }))).default({
          forcedUpdateBackgroundVideo: {
            default: {
              fileSize: 17_757_083,
              maxDownloadTime: 240,
              url: 'https://cloudcdn-ams03.cdn.yandex.net/cdnr2gfhoxlvj5gm23vk/suw_video/v2/alice_onboarding_4k_without_find_remote_v1.mp4?lid=289'
            }
          },
          suwUpdateBackgroundVideo: {
            default: {
              fileSize: 17_757_083,
              maxDownloadTime: 240,
              url: 'https://cloudcdn-ams03.cdn.yandex.net/cdnr2gfhoxlvj5gm23vk/suw_video/v2/alice_onboarding_4k_without_find_remote_v1.mp4?lid=289'
            }
          }
        })
      }),
      settings: z.object({
        abSilentInstallV2: z.object({
          enabled: z.boolean().default(true),
          strategy: z.string().default('night')
        }),
        allowFirmwareUpdate: z.object({
          ota: z.boolean().default(true)
        }),
        allowFirmwareUpdateV2: z.object({
          ota: z.boolean().default(true)
        }),
        apkSilentInstallV2: z.object({
          enabled: z.boolean().default(true),
          strategy: z.string().default('night')
        }),
        appsToDeleteEnabled: z.boolean().default(true),
        autoCheckEnabled: z.boolean().default(true),
        clearCachePartitionOnOtaUpdate: z.boolean().default(true),
        commitFirmwarePreferencesEnabled: z.boolean().default(true),
        confirmFirmwareUpdate: z.object({
          ota: z.boolean().default(true)
        }),
        confirmFirmwareUpdateV2: z.object({
          ota: z.boolean().default(true),
          retryPeriodSeconds: z.number().default(180),
          triggerFromBoot: z.boolean().default(true),
          useService: z.boolean().default(true)
        }),
        createOtaSessionIdWithRetriesEnabled: z.boolean().default(true),
        fakeStandbySilentOtaPropertyActionV2: z.string().default('force_true'),
        forceUiAfterDownload: z.boolean().default(true),
        nightIntervalEnd: z.number().default(5),
        nightIntervalStart: z.number().default(0),
        notifications: z.string().default('all'),
        notifyReboot: z.boolean().default(true),
        otaSilentInstallV2: z.object({
          enabled: z.boolean().default(true),
          strategy: z.string().default('night')
        }),
        resumeDownloadAfterHide: z.boolean().default(true),
        scheduleForcedSilentIfAllowedEnabled: z.boolean().default(false),
        suwUpdateStrategy: z.string().default('all'),
        sysRecoverySilentInstallV2: z.object({
          enabled: z.boolean().default(true),
          strategy: z.string().default('night_fake_standby')
        }),
        sysRecoveryUpdatesEnabled: z.boolean().default(true),
        updateFrequencyJitterPercent: z.number().default(0),
        updateFrequencyMin: z.number().default(50),
        updateHomeInterruptFsbOffThrottleHours: z.number().default(1),
        updateInterruptStrategy: z.string().default('only_home_non_fsb'),
        updatesV4Api: z.boolean().default(true),
        updateVersionHeader: z.object({
          enabled: z.boolean().default(true),
          romProp: z.string().default('ro.build.description'),
          strategy: z.string().default('rom')
        }),
        voiceButtonsEnabled: z.boolean().default(true)
      })
    }),
    comYandexTvAccessiblevoice: z.object({
      accessibleVoiceAppConfigMap: z.record(z.string(), z.object({
        accessibilityServiceConfig: z.object({
          enableKeyEventsHandling: z.boolean()
        }),
        drawItemSelectionOverlayDelayMs: z.number(),
        interactiveNodesFilterStrategy: z.object({
          minimumViewHeightPxToBeInteractive: z.number(),
          minimumViewWidthPxToBeInteractive: z.number()
        }),
        itemSelectionLabelsEnumerationMode: z.string(),
        itemSelectionLabelsEnumerationStrategies: z.array(z.object({
          fieldKey: z.string(),
          fieldValues: z.array(z.string()),
          includeChildren: z.boolean().optional()
        })),
        minVersionCode: z.number(),
        showItemSelectionOverlay: z.boolean()
      })).default({
        'com.yandex.browser.tv': {
          accessibilityServiceConfig: {
            enableKeyEventsHandling: true
          },
          drawItemSelectionOverlayDelayMs: 300,
          interactiveNodesFilterStrategy: {
            minimumViewHeightPxToBeInteractive: 250,
            minimumViewWidthPxToBeInteractive: 140
          },
          itemSelectionLabelsEnumerationMode: 'ENUMERATE_MATCHES',
          itemSelectionLabelsEnumerationStrategies: [
            {
              fieldKey: 'androidId',
              fieldValues: [
                'history_item_root',
                'lbro_bookmarks_item_root',
                'confirm_button',
                'cancel_button',
                'show_more_tv'
              ]
            },
            {
              fieldKey: 'androidId',
              fieldValues: [
                'lbro_popup_list'
              ],
              includeChildren: true
            }
          ],
          minVersionCode: 241_200_432,
          showItemSelectionOverlay: true
        }
      }),
      alwaysSendCurrentPackage: z.boolean().default(true),
      dialogsBackendFilterConfig: z.object({
        disabledPackageNames: z.array(z.string()).default([
          'com.yandex.tv.webplayer'
        ]),
        enabledPackageNames: z.array(z.string()).default([
          'com.yandex.devices.appstore'
        ])
      }),
      enableReceivingOpenedAppEvents: z.boolean().default(true),
      hideLabelsAfterRemoteControlActivity: z.boolean().default(true),
      itemSelectionOverlayType: z.string().default('SURFACE_VIEW'),
      packagesFilterConfig: z.object({
        filterMode: z.string().default('allow_list'),
        packageNames: z.array(z.string()).default([
          'com.yandex.browser.tv',
          'com.yandex.tv.alice',
          'com.yandex.launcher.updaterapp',
          'com.yandex.tv.bugreportsender',
          'com.yandex.tv.daydream',
          'com.yandex.tv.home',
          'com.yandex.tv.input.efir',
          'com.yandex.tv.live',
          'com.yandex.tv.setupwizard',
          'com.yandex.tv.services',
          'com.yandex.tv.services.platform',
          'com.yandex.tv.services.privileged',
          'com.yandex.tv.videoplayer',
          'com.yandex.tv.ytplayer',
          'com.yandex.tv.music',
          'com.yandex.io.sdk',
          'com.android.tv.settings'
        ])
      }),
      rootNodeUpdateDebounceMs: z.number().default(1),
      showDebugOverlay: z.boolean().default(false),
      showLabelsAfterRemoteControlInactivityMs: z.number().default(2500),
      useDialogsBackend: z.boolean().default(true),
      useDialogsBackendV1: z.boolean().default(true)
    }),
    comYandexTvAlice: z.object({
      alicekitOknyxConfig: z.object({
        animationVersion: z.string().default('SPIRIT'),
        enabled: z.boolean().default(true)
      }),
      alicePremiumAnswer: z.boolean().default(true),
      aliceStreamingV2: z.object({
        enabled: z.boolean().default(true),
        expandAnimationDurationMs: z.number().default(300),
        inactivityTimeout: z.number().default(5),
        interpolator: z.string().default('LINEAR'),
        localSuggestWhiteList: z.array(z.string()).default([
          'stop',
          'up',
          'down'
        ]),
        regex: z.string().default(String.raw`\s`),
        remoteSuggestWhiteList: z.array(z.string()).default([
          'Сохранить',
          'Источник'
        ]),
        runningAnimationDurationMs: z.number().default(200),
        waitingUiDelayMs: z.number().default(2_147_483_647)
      }),
      assistApiSettingEnabled: z.boolean().default(true),
      div: z.object({
        warmUpDivOnStart: z.boolean().default(true)
      }),
      divTextAnswerEnabled: z.boolean().default(true),
      enableScreenshotNotification: z.boolean().default(true),
      ioCom: z.object({
        isIoComHostProxyServicesEnabled: z.boolean().default(true),
        isIoComServerEnabled: z.boolean().default(true)
      }),
      itemSelectionOverlayEnabled: z.boolean().default(true),
      keepUiContextBetweenSessions: z.boolean().default(true)
    }),
    comYandexTvCommonDeviceFeatures: z.object({
      usePlatformNtpOnlyV2: z.boolean().default(true)
    }),
    comYandexTvDaydream: z.object({
      ioCom: z.object({
        capabilities: z.object({
          useIoComForAlarm: z.boolean().default(true)
        }),
        ioComHostEnabled: z.boolean().default(true),
        ioComServerEnabled: z.boolean().default(true),
        isIoComHostProxyEnabledV1: z.boolean().default(true)
      }),
      music: z.object({
        enableMusicWidgetV3: z.boolean().default(true),
        handleRcuMediaButtons: z.boolean().default(true)
      }),
      screenSaverConfig: z.object({
        aliceOverlayConfig: z.object({
          directiveWhitelist: z.array(z.string()).default([
            'add_iot_scenarios_directive',
            'alarm_add_directive',
            'alarm_cancel_directive',
            'alarm_new',
            'alarm_reset_sound',
            'alarm_set_max_level',
            'alarm_set_max_level_directive',
            'alarm_set_sound',
            'alarm_snooze_directive',
            'alarm_sound_settings_update_directive',
            'alarm_stop_directive',
            'alarm_update_directive',
            'alarm_update_sound_level_directive',
            'alarms_update',
            'alarms_update_directive',
            'apply_player_playback_queue_directive',
            'audio_play',
            'audio_player_dislike_directive',
            'audio_player_like_directive',
            'audio_player_next_directive',
            'audio_player_play_directive',
            'audio_player_previous_directive',
            'audio_player_repeat_all_directive',
            'audio_player_repeat_one_directive',
            'audio_player_rewind',
            'audio_player_shuffle_directive',
            'audio_player_undislike_directive',
            'audio_player_unlike_directive',
            'audio_player_unrepeat_directive',
            'audio_player_unshuffle_directive',
            'audio_set_speed_level_directive',
            'audio_stop',
            'cancel_timer',
            'cancel_timer_directive',
            'clear_queue',
            'divui_hide_all_views',
            'divui_hide_view',
            'divui_show_view',
            'draw_animation_directive',
            'iot_cancel_discovery_directive',
            'iot_endpoints_state_changed_directive',
            'iot_finish_discovery_directive',
            'iot_finish_system_discovery_directive',
            'iot_forget_devices_directive',
            'iot_restore_networks_directive',
            'iot_start_discovery_directive',
            'iot_sync_endpoints_directive',
            'load_screensavers',
            'pause_timer_directive',
            'player_continue',
            'player_next_track',
            'player_pause',
            'player_previous_track',
            'prepare_media_alarm_directive',
            'remove_iot_scenarios_directive',
            'resume_timer_directive',
            'set_audio_player_sequence_state_directive',
            'set_brightness_level_directive',
            'set_iot_account_settings',
            'set_iot_user_info',
            'set_location',
            'set_timer',
            'set_timer_directive',
            'set_timezone',
            'sound_louder',
            'sound_mute',
            'sound_quiter',
            'sound_set_level',
            'sound_unmute',
            'start_music_recognizer',
            'subscribe_iot_endpoints_directive',
            'sync_iot_scenarios_directive',
            'timer_cancel_directive',
            'timer_pause_directive',
            'timer_resume_directive',
            'timer_set_directive',
            'timer_stop_directive',
            'timer_stop_playing',
            'timer_stop_playing_directive',
            'tts_play_placeholder',
            'unsubscribe_iot_endpoints_directive'
          ]),
          enabled: z.boolean().default(true)
        }),
        animatedClockEnabledV4: z.boolean().default(true),
        isNewHighlightEnabledV1: z.boolean().default(true),
        screenSaverDownloadLimitBytes: z.number().default(1_073_741_824),
        screenSaverLoadingSnackbarEnabled: z.boolean().default(true),
        screensaverNewArchitectureEnabledV1: z.boolean().default(true),
        screenSaverSettingsEnabled: z.boolean().default(true),
        screenSaverSettingsTipTimeoutSeconds: z.number().default(180),
        showDurationSupportEnabled: z.boolean().default(true),
        themedScreenSaverClearDynamicWidgetsTypedCallbackEnabled: z.boolean().default(true),
        themedScreenSaverConfigTtlMs: z.number().default(28_800_000),
        themedScreenSaverEnabled: z.boolean().default(false),
        themedScreenSaverVoiceControlsEnabled: z.boolean().default(true),
        useDirectiveDatasourceV1: z.boolean().default(true)
      })
    }),
    comYandexTvFeatureAppGrid: z.object({
      showBadgeNumber: z.boolean().default(true),
      storeBannerConfig: z.object({
        tvStoreApplicationName: z.string().default('Каталог приложений')
      })
    }),
    comYandexTvFeaturePayment: z.object({
      plusSdkEnabled: z.boolean().default(true)
    }),
    comYandexTvFeaturePreinstalledApps: z.object({
      isEnabled: z.boolean().default(false)
    }),
    comYandexTvFeatureQrpayment: z.object({
      fullscreenTariffOfferConfig: z.object({
        loginButtonText: z.string().default('Войти в аккаунт'),
        loginOfferText: z.string().default('Авторизуйтесь\nдля оплаты подписки'),
        purchaseButtonHint: z.string().default('Может занять больше времени'),
        purchaseButtonText: z.string().default('Другой способ оплаты'),
        qrCodeHeaderText: z.string().default('Сканируйте QR-код,\nчтобы перейти к оплате')
      })
    }),
    comYandexTvFeatureScreensaverSettings: z.object({
      screensaverIotWidgetsEnabledV3: z.boolean().default(true)
    }),
    comYandexTvFeatureSearch: z.object({
      searchScreenV2EnabledV1: z.boolean().default(true),
      searchScreenV2EnabledV3: z.boolean().default(true),
      searchTabsEnabled: z.boolean().default(true)
    }),
    comYandexTvFeatureStorageCleanup: z.object({
      excludedTopUsedAppsCount: z.number().default(5),
      maxAppsToRemove: z.number().default(5),
      minRecommendedFreeSpaceMb: z.number().default(500),
      usageStatsPeriodDays: z.number().default(30),
      voiceControlEnabled: z.boolean().default(true),
      whitelistPackages: z.array(z.string()).default([])
    }),
    comYandexTvFeatureTvchannelgrid: z.object({
      channelsUpdatePeriodMinutes: z.number().default(55)
    }),
    comYandexTvFeatureTvchannellist: z.object({
      channelFavouriteCategoryAtBeginningV1: z.boolean().default(true),
      channelListVoiceControlsEnabled: z.boolean().default(true),
      channelListVoiceControlsEnabledV2: z.boolean().default(true),
      channelListVoiceControlsEnabledV3: z.boolean().default(true),
      channelListVoiceControlsEnabledV4: z.boolean().default(true),
      channelListVoiceControlsUpdatePeriodSeconds: z.number().default(300),
      channelsUpdatePeriodMinutes: z.number().default(55),
      defaultChannelsUpdatePeriodMinutes: z.number().default(55),
      multicatSupported: z.boolean().default(true),
      persistentVoiceControlsEnabled: z.boolean().default(true),
      tariffOptionsSupported: z.boolean().default(true),
      tvGridEnabledV2: z.boolean().default(true)
    }),
    comYandexTvFeatureTvplayer: z.object({
      allowRemoteConfigurationV1: z.boolean().default(true),
      ioCom: z.object({
        capabilities: z.object({
          useIoComForAlarm: z.boolean().default(true)
        }),
        isIoComHostProxyEnabledV1: z.boolean().default(true)
      }),
      maxAutoQualityMultiplex: z.number().default(480),
      mbuSettings: z.object({
        mbuDoNotOverrideRh: z.boolean().default(true),
        mbuEnableForDynamic: z.boolean().default(true),
        mbuEnableMoveToUnbanned: z.boolean().default(false),
        mbuEnableUpdate: z.boolean().default(true),
        mbuFallbackByAnyExc: z.boolean().default(true)
      }),
      preloadVideoDataSettings: z.object({
        isPreloadCacheStaticV1: z.boolean().default(true),
        preloadVideoDataLifetime: z.number().default(18_000_000)
      }),
      preventAmlogic2MemoryLeak: z.boolean().default(true),
      recoveredErrorsList: z.array(z.string()).default([
        'FrameDropDetected'
      ]),
      secureDecodersForClearVideo: z.boolean().default(true),
      shouldMonitorFrameDrops: z.boolean().default(true),
      shouldUseAutoplayFalseForMultiplex: z.boolean().default(true),
      useBandwidthLastValueProvider: z.boolean().default(true)
    }),
    comYandexTvFeatureTvplayerUi: z.object({
      freeChannelsLoginWallEnabledV1: z.boolean().default(false),
      freeChannelsLoginWallEnabledV2: z.boolean().default(false),
      multiplexInactivityStopV1: z.object({
        notificationDurationMs: z.number().default(60_000),
        remainingTimeThresholdPercentage: z.number().default(10),
        timeoutMs: z.number().default(14_400_000)
      }),
      preloadChannelsWindow: z.number().default(6),
      thresholdTimePutChannelToRecentMs: z.number().default(5000),
      useNewKinopoiskOttChannelNonMultiplexStrategyV1: z.boolean().default(true),
      useNewKinopoiskOttChannelStrategyV6: z.boolean().default(true),
      useNewKinopoiskOttChannelWithScheduler: z.boolean().default(true),
      voiceoverButtonEnabled: z.boolean().default(true)
    }),
    comYandexTvFeatureTvprogramlistUi: z.object({
      isCatchupInProgramListEnabledV1: z.boolean().default(true)
    }),
    comYandexTvFeatureWhatsnew: z.object({
      enabledWhatsNewFeatures: z.array(z.string()).default([
        'accessible_voice',
        'ai_pq',
        'karaoke_promo',
        'more_than_a_tv',
        'night_mode_monet_magritte',
        'no_vh_recents',
        'parents_mode_promo',
        'play_football',
        'play_hockey',
        'sport_section'
      ]),
      supportedWhatsNewFeatures: z.array(z.string()).default([
        'accessible_voice',
        'ai_pq',
        'karaoke_promo',
        'more_than_a_tv',
        'night_mode_monet_magritte',
        'no_vh_recents',
        'parents_mode_promo',
        'play_football',
        'play_hockey',
        'sport_section'
      ]),
      timelinePollingDelayMs: z.number().default(500),
      watchCompletedThreshold: z.number().default(80),
      whatsNewScreenEnabledV2: z.boolean().default(true)
    }),
    comYandexTvHome: z.object({
      appGridEnabledV4: z.boolean().default(true),
      appsMarketCache: z.object({
        cacheThrottleTimeMs: z.number().default(600_000),
        newCacheLogicV1: z.boolean().default(true)
      }),
      appsMarketScreen: z.object({
        appCatalogTitle: z.string().default('YaOS Store'),
        getFromAppstoreApiV2: z.boolean().default(true),
        localSortingEnabled: z.boolean().default(false),
        redesignEnabled: z.boolean().default(true),
        voicedAppsLayoutEnabledV1: z.boolean().default(true)
      }),
      blackHomeBackground: z.boolean().default(true),
      cachingFragmentsCountV5: z.number().default(3),
      cachingFragmentsStrategyV5: z.string().default('number'),
      catalogProtoHttpTestEnabled: z.boolean().default(true),
      catalogScreen: z.object({
        enumerationEnabled: z.boolean().default(true),
        redesignEnabled: z.boolean().default(true),
        separateGalleryRequest: z.boolean().default(true),
        voiceControlsEnabled: z.boolean().default(true)
      }),
      categoriesContentProtoHttpEnabledV2: z.boolean().default(true),
      categoriesMenuProtoHttpV2: z.object({
        cacheHoursLifetime: z.number().default(24),
        enabled: z.boolean().default(true)
      }),
      coldStartRecommendations: z.object({
        coldStartScreenEnabledV1: z.boolean().default(false)
      }),
      continueWatchingImageType: z.string().default('horizontal_poster_and_thumbnail'),
      detailsBookmarkLoginWall: z.string().default('login_wall'),
      detailsButtonsFromApiEnabledV1: z.boolean().default(true),
      detailsExternalOptionsEnabled: z.boolean().default(true),
      detailsNewDesignEnabled: z.boolean().default(true),
      detailsPromoCinemaEnabled: z.boolean().default(true),
      detailsProtoHttpEnabled: z.boolean().default(true),
      detailsProtoSerialNavigatorButtonSearchEnabled: z.boolean().default(true),
      detailsPublicSourceVoiceControlsEnabledV2: z.boolean().default(true),
      detailsPurchaseWithoutPayWall: z.boolean().default(true),
      detailsScreenVideoPreviewV2: z.object({
        autoHideUIEnabledV3: z.boolean().default(true),
        enabled: z.boolean().default(true),
        hideUiEnabled: z.boolean().default(true),
        hintMode: z.string().default('pre_trailer'),
        repeatEnabled: z.boolean().default(true),
        soundWhenUiHidden: z.number().default(100),
        startMovieAfterTrailer: z.object({
          mode: z.string().default('auto'),
          offsetSeconds: z.number().default(10)
        }),
        volume: z.number().default(0)
      }),
      detailsSummaryEnabled: z.boolean().default(true),
      detailsVoiceControls: z.object({
        detailsKpVoiceControlsEnabledV2: z.boolean().default(true),
        detailsPirateVoiceControlsEnabledV2: z.boolean().default(true),
        externalCinemasVoiceControlsEnabled: z.boolean().default(true)
      }),
      dpadRemoveMusicFromRecent: z.boolean().default(true),
      favoriteEnabled: z.boolean().default(true),
      favoriteOnNonKpEnabled: z.boolean().default(true),
      fullscreenPromo: z.boolean().default(true),
      fullscreenPromoAutoplayIntervalMs: z.number().default(7000),
      getWillWatchCarouselInFeedEnabledV2: z.boolean().default(true),
      giftPromoDelayMs: z.number().default(15_000),
      halfPirateDetailsEnabled: z.boolean().default(true),
      hideContinueWatchingCarouselTitles: z.boolean().default(true),
      hideFocusVoiceNavigationGoHomeEnabled: z.boolean().default(true),
      homeCardNumbersEnabled: z.boolean().default(true),
      homeCarouselMusicEnabledV2: z.boolean().default(true),
      homeCarouselsProtoHttpEnabledV2: z.boolean().default(true),
      homePreloadRecentVideosCount: z.number().default(2),
      homeRecentActionsEnabledV2: z.boolean().default(true),
      homeRecentMusicItemEnabledV2: z.boolean().default(true),
      homeRecentWebItemEnabled: z.boolean().default(true),
      homeVoiceControlsEnabled: z.boolean().default(true),
      ioCom: z.object({
        capabilities: z.object({
          useIoComForAlarm: z.boolean().default(true)
        }),
        isIoComHostProxyEnabledV1: z.boolean().default(true)
      }),
      isContinueWatchingDurationBadgeHiddenOutOfFocus: z.boolean().default(true),
      isContinueWatchingProgressBackgroundEnabled: z.boolean().default(true),
      isManagingRecommendationsEnabled: z.boolean().default(true),
      loginwallPolicy: z.object({
        appsAccessible: z.boolean().default(true),
        profilesAccessible: z.boolean().default(true),
        recentAccessible: z.boolean().default(true),
        showOnConnection: z.boolean().default(false),
        storeAccessible: z.boolean().default(true),
        youtubeAccessible: z.boolean().default(true)
      }),
      maxSystemBootWaitTimeMs: z.number().default(1000),
      menuFragmentDebounceMillisV4: z.number().default(350),
      menuFragmentResyncDelayMinutesV5: z.number().default(20),
      mixContinueWatchingWithTop10v3: z.object({
        divider: z.boolean().default(true),
        enable: z.boolean().default(true),
        maxCwItemsCount: z.number().default(1)
      }),
      moveAppsMarketToCategoriesV2: z.boolean().default(true),
      musicCategory: z.object({
        redesignEnabled: z.boolean().default(true)
      }),
      musicCategoryContentProtoHttpEnabled: z.boolean().default(true),
      newActorScreenEnabled: z.boolean().default(true),
      newDesignCategoriesIds: z.array(z.string()).default([
        'kids',
        'music'
      ]),
      newSearchCarouselsEnabledV3: z.boolean().default(true),
      noMainCarouselsCache: z.boolean().default(true),
      noMenuFragmentsPreload: z.boolean().default(true),
      periodsToReportFrameMetricsOnStartV2: z.array(z.number()).default([
        30_000,
        60_000,
        90_000,
        120_000
      ]),
      pimpleOnProfileButtonEnabled: z.boolean().default(false),
      pirateCardButtonsConfig: z.object({
        halfPirateCardBrowserActionEnabled: z.boolean().default(true),
        halfPirateCardBrowserButtonText: z.string().default('Поиск в Браузере'),
        halfPirateCardSearchActionEnabled: z.boolean().default(true),
        halfPirateCardSearchButtonText: z.string().default('Поиск по видео'),
        pirateCardBrowserActionEnabled: z.boolean().default(true),
        pirateCardBrowserButtonText: z.string().default('Поиск в Браузере'),
        pirateCardSearchActionEnabled: z.boolean().default(true),
        pirateCardSearchButtonText: z.string().default('Поиск по видео')
      }),
      previewOnCardEnabled: z.boolean().default(true),
      profileButtonWithAvatarEnabled: z.boolean().default(true),
      progressDataForKpContentFromGetCardDetailsEnabledV2: z.boolean().default(true),
      progressDataForKpContentFromGetCardDetailsEnabledV3: z.boolean().default(true),
      progressDataForPublicContentFromGetCardDetailsEnabled: z.boolean().default(true),
      promoButtonForPromoCarouselEnabled: z.boolean().default(true),
      recentInsideContinueWatchingPosition: z.number().default(0),
      recentInsideContinueWatchingSize: z.number().default(6),
      recentsConfig: z.object({
        appDeeplinks: z.record(z.string(), z.string()).default({
          'ru.ivi.client': 'ruiviclient://index?partner_entry_point=yaos_zapin'
        }),
        appIcons: z.record(z.string(), z.string()).default({
          'com.vk.tv': 'https://avatars.mds.yandex.net/get-ott/236744/vk_carousel_promo_v3/200x200',
          'ru.ivi.client': 'https://avatars.mds.yandex.net/get-ott/18164279/promoinyaos-973_0/200x200',
          'ru.rutube.app': 'https://avatars.mds.yandex.net/get-ott/18701600/PROMOINYAOS-1429-rutube-200x200/orig'
        }),
        appNames: z.record(z.string(), z.string()).default({
          'com.vk.tv': 'VK Видео',
          'ru.ivi.client': 'Иви',
          'ru.rutube.app': 'RUTUBE'
        }),
        customAppIconsPackages: z.array(z.string()).default([
          'com.fitstars.tv',
          'ag.tv.a24h'
        ]),
        pinnedItems: z.object({
          comVkTv: z.number().default(6),
          ruIviClient: z.number().default(2),
          ruRutubeApp: z.number().default(4)
        }),
        recentExternalAppVideoItemsEnabledV1: z.boolean().default(true)
      }),
      recentViaTvProviderEnabled: z.boolean().default(true),
      screenSaverShortcutSettings: z.object({
        doubleTapInterval: z.number().default(500),
        enabled: z.boolean().default(true),
        longPressInterval: z.number().default(1000),
        mode: z.string().default('longPress')
      }),
      searchPromoBannerEnabled: z.boolean().default(true),
      searchProtoHttpEnabledV2: z.boolean().default(true),
      searchRedesignEnabled: z.boolean().default(true),
      searchViaArpc: z.boolean().default(true),
      searchVideoScenarioEnabled: z.boolean().default(true),
      searchVoiceControlsEnabled: z.boolean().default(true),
      serialNavigatorScreen: z.object({
        enumerationEnabled: z.boolean().default(true),
        newSerialNavigatorEnabledV3: z.boolean().default(true),
        resetEpisodeToBeginningAfterPercent: z.number().default(95),
        serialNavigatorRedesignEnabled: z.boolean().default(true),
        useKpIdForRequest: z.boolean().default(true),
        voiceControlsEnabled: z.boolean().default(true)
      }),
      showNewNotifications: z.boolean().default(true),
      showRecentIfNoContinueWatching: z.boolean().default(true),
      showRecentInsideContinueWatching: z.boolean().default(true),
      showRecentOnLoadingEnabledV1: z.boolean().default(true),
      sideMenu: z.object({
        isAliceManualV2Enabled: z.boolean().default(true),
        isMenuOverContentEnabled: z.boolean().default(true),
        isMenuRedesignEnabledV2: z.boolean().default(true),
        isProfileIconAtBottomV2: z.boolean().default(true),
        isProfileIconInsteadAliceEnabled: z.boolean().default(true),
        useBackendStatedImage: z.boolean().default(true)
      }),
      statusBarBackgroundV2: z.boolean().default(true),
      tandem: z.object({
        backgrounds: z.record(z.string(), z.record(z.string(), z.string())).default({
          bergamot: {
            default: 'https://androidtvprod.s3.yandex.net/tandem_bg/bergamot_black.png',
            G: 'https://androidtvprod.s3.yandex.net/tandem_bg/bergamot_gray.jpg',
            K: 'https://androidtvprod.s3.yandex.net/tandem_bg/bergamot_black.png',
            V: 'https://androidtvprod.s3.yandex.net/tandem_bg/bergamot_violet.jpg'
          },
          blackthorn: {
            default: 'https://androidtvprod.s3.yandex.net/tandem_bg/blackthorn_black.png',
            K: 'https://androidtvprod.s3.yandex.net/tandem_bg/blackthorn_black.png'
          },
          cucumber: {
            default: 'https://androidtvprod.s3.yandex.net/tandem_bg/cucumber_black.png',
            G: 'https://androidtvprod.s3.yandex.net/tandem_bg/cucumber_grey.png',
            K: 'https://androidtvprod.s3.yandex.net/tandem_bg/cucumber_black.png',
            N: 'https://androidtvprod.s3.yandex.net/tandem_bg/cucumber_pink.png',
            Y: 'https://androidtvprod.s3.yandex.net/tandem_bg/cucumber_orange.png',
            Z: 'https://androidtvprod.s3.yandex.net/tandem_bg/cucumber_green.png'
          },
          mango: {
            default: 'https://androidtvprod.s3.yandex.net/tandem_bg/station_1.jpg'
          },
          pickle: {
            B: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_bg/pickle/station-mini3-pro-blue2.png',
            default: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_bg/pickle/station-mini3-pro-black2.png',
            K: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_bg/pickle/station-mini3-pro-black2.png',
            V: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_bg/pickle/station-mini3-pro-violet2.png',
            W: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_bg/pickle/station-mini3-pro-white2.png',
            Z: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_bg/pickle/station-mini3-pro-green2.png'
          },
          plum: {
            B: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_bg/plum_prune_lylak.png',
            C: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_bg/plum_prune_coral.png',
            default: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_bg/plum_prune_green.png',
            K: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_bg/plum_prune_grey.png',
            N: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_bg/plum_prune_pink.png',
            V: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_bg/plum_prune_lylak.png',
            Z: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_bg/plum_prune_green.png'
          },
          yandexmicro: {
            B: 'https://androidtvprod.s3.yandex.net/tandem_bg/micro_beige.jpg',
            default: 'https://androidtvprod.s3.yandex.net/tandem_bg/micro_green.jpg',
            G: 'https://androidtvprod.s3.yandex.net/tandem_bg/micro_green.jpg',
            N: 'https://androidtvprod.s3.yandex.net/tandem_bg/micro_pink.jpg',
            P: 'https://androidtvprod.s3.yandex.net/tandem_bg/micro_purple.jpg',
            R: 'https://androidtvprod.s3.yandex.net/tandem_bg/micro_red.jpg',
            Y: 'https://androidtvprod.s3.yandex.net/tandem_bg/micro_yellow.jpg'
          },
          yandexmidi: {
            B: 'https://androidtvprod.s3.yandex.net/tandem_bg/midi_blue.jpg',
            C: 'https://androidtvprod.s3.yandex.net/tandem_bg/midi_copper.jpg',
            default: 'https://androidtvprod.s3.yandex.net/tandem_bg/midi_black.jpg',
            E: 'https://androidtvprod.s3.yandex.net/tandem_bg/midi_beige.jpg',
            K: 'https://androidtvprod.s3.yandex.net/tandem_bg/midi_black.jpg'
          },
          yandexmini: {
            default: 'https://androidtvprod.s3.yandex.net/tandem_bg/mini.jpg'
          },
          yandexmini_2: {
            B: 'https://androidtvprod.s3.yandex.net/tandem_bg/mini_2_blue.jpg',
            default: 'https://androidtvprod.s3.yandex.net/tandem_bg/mini_2_black.jpg',
            G: 'https://androidtvprod.s3.yandex.net/tandem_bg/mini_2_gray.jpg',
            K: 'https://androidtvprod.s3.yandex.net/tandem_bg/mini_2_black.jpg',
            R: 'https://androidtvprod.s3.yandex.net/tandem_bg/mini_2_red.jpg'
          },
          yandexstation: {
            default: 'https://androidtvprod.s3.yandex.net/tandem_bg/station_1.jpg'
          },
          yandexstation_2: {
            B: 'https://androidtvprod.s3.yandex.net/tandem_bg/station_2_blue.jpg',
            default: 'https://androidtvprod.s3.yandex.net/tandem_bg/station_2_black.jpg',
            K: 'https://androidtvprod.s3.yandex.net/tandem_bg/station_2_black.jpg',
            R: 'https://androidtvprod.s3.yandex.net/tandem_bg/station_2_red.jpg',
            W: 'https://androidtvprod.s3.yandex.net/tandem_bg/station_2_white.jpg'
          }
        })
      }),
      tandemColorCodesConfig: z.record(z.string(), z.record(z.string(), z.array(z.string()))).default({
        bergamot: {
          14: [
            '13',
            '14'
          ]
        },
        cucumber: {
          14: [
            '13',
            '14'
          ]
        },
        pickle: {
          14: [
            '13',
            '14'
          ]
        },
        plum: {
          14: [
            '13',
            '14'
          ]
        }
      }),
      timersOnScreenEnable: z.boolean().default(true),
      tvChannelsConfig: z.object({
        channelsUpdatePeriodMinutes: z.number().default(55),
        epgFragmentEnabled: z.boolean().default(true),
        epgFragmentEnabledV2: z.boolean().default(true),
        epgFragmentEnabledV3: z.boolean().default(true),
        epgFragmentEnabledV4: z.boolean().default(true),
        favouritesEnabledV3: z.boolean().default(true),
        multicatSupported: z.boolean().default(true),
        tariffOptionsSupported: z.boolean().default(true),
        tvGridEnabled: z.boolean().default(true),
        tvGridEnabledV2: z.boolean().default(true),
        tvGridEnabledV3: z.boolean().default(true),
        tvGridEnabledV4: z.boolean().default(true),
        tvGridVoiceControlsEnabled: z.boolean().default(true),
        tvGridVoiceControlsEnabledV2: z.boolean().default(true),
        tvGridVoiceControlsEnabledV3: z.boolean().default(true),
        tvGridVoiceControlsEnabledV4: z.boolean().default(true),
        tvGridVoiceControlsUpdatePeriodSeconds: z.number().default(300)
      }),
      updateHomeScreenByButton: z.boolean().default(true),
      updateOnlyFeatureHomeScreen: z.boolean().default(true),
      useBackendBadgeImage: z.boolean().default(true),
      watchButtonForPublicContentEnabled: z.boolean().default(true),
      watchButtonForPublicContentEnabledV2: z.boolean().default(true)
    }),
    comYandexTvInputEfir: z.object({
      adYandexPlayerEnabled: z.boolean().default(true),
      adYandexPlayerEnabledV3: z.boolean().default(true),
      mbuSettings: z.object({
        mbuDoNotOverrideRh: z.boolean().default(true),
        mbuEnableForDynamic: z.boolean().default(true),
        mbuEnableMoveToUnbanned: z.boolean().default(false),
        mbuEnableUpdate: z.boolean().default(true),
        mbuFallbackByAnyExc: z.boolean().default(true)
      }),
      multicatSupported: z.boolean().default(true),
      preventAmlogic2MemoryLeak: z.boolean().default(true),
      secureDecodersForClearVideo: z.boolean().default(true),
      shouldMonitorFrameDrops: z.boolean().default(true),
      smotreshkaChannelsEnabled: z.boolean().default(true),
      tariffOptionsSupported: z.boolean().default(true),
      tvGridEnabledV2: z.boolean().default(true),
      tvGridEnabledV3: z.boolean().default(true),
      tvGridEnabledV4: z.boolean().default(true),
      tvGridEnabledV5: z.boolean().default(true),
      tvProgramsProtoHttpEnabledV2: z.boolean().default(true)
    }),
    comYandexTvLive: z.object({
      channelListFragmentEnabled: z.boolean().default(true),
      channelListFragmentEnabledV2: z.boolean().default(true),
      channelListFragmentEnabledV3: z.boolean().default(true),
      channelListFragmentEnabledV4: z.boolean().default(true),
      channelsUpdatePeriodMinutes: z.number().default(25),
      channelSwitching: z.object({
        restartInputServiceOnChannelSwitched: z.boolean().default(false)
      }),
      channelThumbStubs: z.array(z.string()).default([
        'channelThumbStub01',
        'channelThumbStub02',
        'channelThumbStub03',
        'channelThumbStub04',
        'channelThumbStub05'
      ]),
      checkChannelLicensePeriodMs: z.number().default(15_000),
      disableChannelVoiceControls: z.boolean().default(true),
      epgFragmentEnabled: z.boolean().default(true),
      epgFragmentEnabledV2: z.boolean().default(true),
      epgFragmentEnabledV3: z.boolean().default(true),
      epgFragmentEnabledV4: z.boolean().default(true),
      forcedScrollChannelListEnabledV2: z.boolean().default(true),
      forcedScrollChannelListEnabledV3: z.boolean().default(true),
      forcedScrollChannelListEnabledV4: z.boolean().default(true),
      forcedScrollChannelListEnabledV5: z.boolean().default(true),
      gridPlayerLayoutEnabled: z.boolean().default(true),
      gridPlayerLayoutEnabledV2: z.boolean().default(true),
      gridPlayerLayoutEnabledV3: z.boolean().default(true),
      gridPlayerLayoutEnabledV4: z.boolean().default(true),
      isNewPlayerEnabledV2: z.boolean().default(true),
      isNewPlayerEnabledV3: z.boolean().default(true),
      media: z.object({
        image: z.record(z.string(), z.record(z.string(), z.object({
          fileSize: z.number(),
          maxDownloadTime: z.number(),
          url: z.string()
        }))).default({
          channelThumbStub01: {
            default: {
              fileSize: 397_603,
              maxDownloadTime: 500,
              url: 'https://androidtvprod.s3.yandex.net/channel_thumbs/thumb01.png'
            }
          },
          channelThumbStub02: {
            default: {
              fileSize: 396_352,
              maxDownloadTime: 500,
              url: 'https://androidtvprod.s3.yandex.net/channel_thumbs/thumb02.png'
            }
          },
          channelThumbStub03: {
            default: {
              fileSize: 394_099,
              maxDownloadTime: 500,
              url: 'https://androidtvprod.s3.yandex.net/channel_thumbs/thumb03.png'
            }
          },
          channelThumbStub04: {
            default: {
              fileSize: 379_494,
              maxDownloadTime: 500,
              url: 'https://androidtvprod.s3.yandex.net/channel_thumbs/thumb04.png'
            }
          },
          channelThumbStub05: {
            default: {
              fileSize: 390_012,
              maxDownloadTime: 500,
              url: 'https://androidtvprod.s3.yandex.net/channel_thumbs/thumb05.png'
            }
          }
        }),
        video: z.record(z.string(), z.string()).default({})
      }),
      newZappingUiEnabled: z.boolean().default(true),
      paidChannelStubV2EnabledProd: z.boolean().default(true),
      sources: z.object({
        designV2Enabled: z.boolean().default(true),
        sourcesSortingActiveFirst: z.boolean().default(true),
        sourcesUsbEnabled: z.boolean().default(true)
      }),
      sourcesPlayerOverlay: z.object({
        dolbyAudioEnabledV1: z.boolean().default(false),
        overlayEnabledV1: z.boolean().default(true)
      }),
      sourcesPlayerTcbEnabled: z.boolean().default(true),
      statusBarOnV1: z.boolean().default(true),
      tariffPurchaseStubEnabled: z.boolean().default(true),
      thresholdTimePutChannelToRecentMs: z.number().default(5000)
    }),
    comYandexTvMusic: z.object({
      animatedBackground: z.boolean().default(false),
      debounceForLyricsButton: z.number().default(250),
      delayForLyricsViewVisibility: z.number().default(0),
      disclaimerConfig: z.object({
        disclaimersEnabled: z.boolean().default(true)
      }),
      focusableProgressBar: z.boolean().default(true),
      ioCom: z.object({
        capabilities: z.object({
          useIoComForAlarm: z.boolean().default(true)
        }),
        isIoComHostProxyEnabledV1: z.boolean().default(true),
        useIoComMusicServiceApiV4: z.boolean().default(true)
      }),
      isKaraokeModeEnabledV1: z.boolean().default(true),
      isLyricsModeEnabledV1: z.boolean().default(true),
      isNewNativePlayerEnabledV3: z.boolean().default(true),
      isPlaybackSpeedEnabledV1: z.boolean().default(true),
      keepScreenOnWhilePlayingWithoutLyrics: z.boolean().default(false),
      lyricsAlwaysOnWhenKaraokeEnabledV1: z.boolean().default(true),
      musicAppCanStopMusicWhenHiddenV1: z.boolean().default(false),
      playlistConfig: z.object({
        enableListenedToCheckmarks: z.boolean().default(true),
        isPlaylistsEnabledV3: z.boolean().default(true),
        itemsToScrollForByVoice: z.number().default(7)
      }),
      shouldApplyBlur: z.boolean().default(false),
      statusBarOnV2: z.boolean().default(true),
      stopBackgroundMusicWhenTurnOffScreenEnabledV2: z.boolean().default(false)
    }),
    comYandexTvServices: z.object({
      aiPqEnabled: z.boolean().default(true),
      aiPqTitle: z.string().default('AI Picture Quality'),
      allAccountState: z.boolean().default(true),
      appsVersions: z.object({
        collectIntervalMinutes: z.number().default(30),
        debounceMs: z.number().default(30_000),
        isEnabled: z.boolean().default(true),
        maxPackagesCount: z.number().default(30),
        requiredPackages: z.array(z.string()).default([
          'com.yandex.devices.appstore',
          'com.yandex.devices.payment',
          'com.yandex.devices.player',
          'com.yandex.devices.whatsnew',
          'com.yandex.io.sdk',
          'com.yandex.launcher.updaterapp',
          'com.yandex.tv.alice',
          'com.yandex.tv.bugreportsender',
          'com.yandex.tv.companion.screen',
          'com.yandex.tv.daydream',
          'com.yandex.tv.demo',
          'com.yandex.tv.home',
          'com.yandex.tv.input.efir',
          'com.yandex.tv.keyboard',
          'com.yandex.tv.live',
          'com.yandex.tv.music',
          'com.yandex.tv.qc',
          'com.yandex.tv.services',
          'com.yandex.tv.services.platform',
          'com.yandex.tv.services.privileged',
          'com.yandex.tv.setupwizard',
          'com.yandex.tv.videoplayer',
          'com.yandex.tv.webplayer',
          'com.yandex.tv.ytplayer',
          'ru.kinopoisk.yandex.tv'
        ]),
        usageStatsPeriodDays: z.number().default(30)
      }),
      appUsageTrackerEnabled: z.boolean().default(true),
      authSuggest: z.object({
        enabled: z.boolean().default(true),
        maxShowCount: z.number().default(5),
        showTimeoutSeconds: z.number().default(2_628_000)
      }),
      batteryNotifications: z.object({
        levelsForNotifications: z.array(z.number()).default([
          20,
          15,
          10
        ]),
        requestsEnabled: z.boolean().default(true),
        resetNotificationsLevel: z.number().default(50)
      }),
      batteryNotificationsV2: z.object({
        batteryNotificationDuration: z.number().default(5000),
        levelsForNotifications: z.array(z.number()).default([
          20,
          15,
          10
        ]),
        requestFrequencyMinutes: z.number().default(15),
        requestsEnabled: z.boolean().default(true),
        resetNotificationsLevel: z.number().default(50)
      }),
      btPairingSettingEnabled: z.boolean().default(true),
      crashSender: z.object({
        whitelist: z.array(z.string()).default([
          'ru.yandex.',
          'com.yandex.',
          'com.android.providers.media.module',
          'com.android.providers.tv',
          'com.android.tv.settings',
          'com.android.systemui',
          'com.ctv.android.tvboot',
          'com.droidlogic',
          'com.mediatek.tv.agent',
          'com.mediatek.tvinput',
          'com.mediatek.androidbox',
          'com.mediatek.wwtv.tvcenter',
          '/system/bin/audioserver',
          '/system/bin/surfaceflinger',
          '/system/bin/wificond',
          'media.codec',
          'media.swcodec',
          '/vendor/bin/hw/android.hardware.bluetooth',
          '/vendor/bin/hw/android.hardware.audio',
          '/vendor/bin/hw/android.hardware.wifi',
          '/vendor/bin/hw/android.hardware.media.c2',
          '/vendor/bin/hw/android.hardware.graphics.composer'
        ])
      }),
      enabledPromos: z.array(z.string()).default([]),
      eventRateLimitConfig: z.object({
        rateLimitEnabled: z.boolean().default(true),
        rateLimiters: z.array(z.object({
          acceptedEventNames: z.array(z.string()),
          debounceTime: z.number()
        })).default([
          {
            acceptedEventNames: [
              'app_crash'
            ],
            debounceTime: 60_000
          },
          {
            acceptedEventNames: [
              'app_error'
            ],
            debounceTime: 5000
          },
          {
            acceptedEventNames: [
              'error_screen_show'
            ],
            debounceTime: 60_000
          }
        ])
      }),
      fastWakeupEnabled: z.boolean().default(true),
      fastWakeupSettingsEnabled: z.boolean().default(true),
      freeSpaceInspector: z.object({
        enabled: z.boolean().default(true),
        intervalBetweenShowNotificationMs: z.number().default(7_200_000),
        notificationDurationMs: z.number().default(15_000),
        useStorageCleanupScreenV2: z.boolean().default(true)
      }),
      giftDesign: z.object({
        alternativeLaterButtonAppearanceTimeMs: z.number().default(10_000),
        biggerText: z.boolean().default(true)
      }),
      giftPromoLackTtl: z.number().default(10_800_000),
      giftPromoMaxCount: z.number().default(3),
      giftPromoTimeout: z.number().default(604_800_000),
      hints: z.object({
        defaultHintsDuration: z.number().default(10_000),
        enabled: z.boolean().default(true),
        minimalHintDuration: z.number().default(3000),
        newReportApiEnabledV2: z.boolean().default(true),
        requestDelay: z.number().default(360),
        screenTriggerThreshold: z.number().default(5000),
        showDelay: z.number().default(30),
        triggers: z.array(z.string()).default([
          'main_screen_opened',
          'tv_channels_screen_opened',
          'music_screen_opened',
          'app_market_screen_opened',
          'details_screen_opened',
          'music_player_screen_opened',
          'profile_screen_opened',
          'video_player_screen_opened',
          'main_navigation_on_video_content',
          'category_navigation_on_video_content',
          'tv_channels_add_to_favourites'
        ])
      }),
      ioCom: z.object({
        ioComServerEnabled: z.boolean().default(true),
        isIoComHostServiceEnabledV1: z.boolean().default(true)
      }),
      isAuthErrorForceSyncTimeEnabled: z.boolean().default(true),
      isViewDetailedErrorAboutRegistrationOnTheBackendEnabled: z.boolean().default(true),
      media: z.object({
        image: z.record(z.string(), z.record(z.string(), z.object({
          fileSize: z.number(),
          maxDownloadTime: z.number(),
          url: z.string()
        }))).default({
          passportGiftCardEntrySideImage: {
            default: {
              fileSize: 140_624,
              maxDownloadTime: 180,
              url: 'https://androidtvprod.s3.yandex.net/suw_images/plus_sell_gift_v2.webp'
            }
          },
          passportGiftPromoBackgroundImage: {
            default: {
              fileSize: 140_624,
              maxDownloadTime: 180,
              url: 'https://androidtvprod.s3.yandex.net/suw_images/plus_sell_gift_v2.webp'
            }
          }
        }),
        video: z.record(z.string(), z.string()).default({})
      }),
      metricaImportantBindEnabled: z.boolean().default(true),
      newAuthForm: z.boolean().default(true),
      newAuthFormV2: z.boolean().default(false),
      newAuthSkipLoginWall: z.boolean().default(true),
      newAuthSkipLoginWallV2: z.boolean().default(true),
      newAuthSuccessScreen: z.boolean().default(true),
      newAuthSuccessScreenV2: z.boolean().default(true),
      newPinCodeScreenEnabled: z.boolean().default(true),
      nightMode: z.object({
        dynamicSoundCompressionSupported: z.boolean().default(true),
        lowBlueLightSupported: z.boolean().default(true),
        nightModeSupported: z.boolean().default(true)
      }),
      notifications: z.object({
        interactiveNotificationLongPressDurationMs: z.number().default(2500),
        interactiveNotificationsEnabled: z.boolean().default(true),
        serviceEnabled: z.boolean().default(true),
        whitelist: z.array(z.string()).default(['purchasedSuccessfulNotification'])
      }),
      passport: z.object({
        iosdkUseExternalToken: z.boolean().default(true),
        iosdkUseUnifiedClientId: z.boolean().default(true),
        servicesUseUnifiedClientId: z.boolean().default(true)
      }),
      pinCodeSendRequestButtonEnabled: z.boolean().default(true),
      plusPayEnabled: z.boolean().default(true),
      promoProtoHttpEnabled: z.boolean().default(true),
      promoTimeout: z.number().default(10_800_000),
      qrCodeGiftFlow: z.boolean().default(true),
      qrCodeGiftFlowV2: z.boolean().default(true),
      rcuV1: z.object({
        isEnabled: z.boolean().default(true)
      }),
      realtimeEvents: z.object({
        clickdaemonBatchUri: z.string().default('https://clck.yandex.net/tv/write/json/batch'),
        clickdaemonErrorsBatchUri: z.string().default('https://clck.yandex.net/tv/write/json/batch'),
        enabled: z.boolean().default(true),
        whitelist: z.array(z.string()).default([
          'app_error',
          'app_crash',
          'app_heartbeat',
          'tv_player_heartbeat',
          'youtube_player_heartbeat',
          'native_player_heartbeat',
          'error_screen_show',
          'card_show',
          'restore_state_success',
          'restore_state_start',
          'restore_state_fail',
          'restore_transition_success',
          'restore_transition_start',
          'restore_transition_fail',
          'audio_record_heartbeat',
          'audio_record_muted_heartbeat',
          'account_login_fail',
          'account_login_success',
          'webview_player_heartbeat',
          'verification_failed',
          'tv_network_error'
        ])
      }),
      sendSysRecoveryVersion: z.boolean().default(true),
      showChildAccountSwitchBlockSetting: z.boolean().default(true),
      silentRebootV3: z.object({
        alwaysTurnOn: z.object({
          enabled: z.boolean().default(true),
          endSec: z.number().default(18_000),
          startSec: z.number().default(82_800),
          supportRebootOnFSB: z.boolean().default(true),
          uptimeMs: z.number().default(604_800_000)
        }),
        standby: z.object({
          enabled: z.boolean().default(true),
          uptimeMs: z.number().default(126_000_000)
        })
      }),
      sleepModeSettingsScreenEnabled: z.boolean().default(true),
      splitOwnerAndActive: z.boolean().default(true),
      syncTimeDiffToResetSession: z.number().default(43_200_000),
      tandemSetup: z.object({
        backgrounds: z.record(z.string(), z.union([z.record(z.string(), z.string()), z.string()])).default({
          bergamot: {
            default: 'https://androidtvprod.s3.yandex.net/tandem_bg/bergamot_black.png',
            G: 'https://androidtvprod.s3.yandex.net/tandem_bg/bergamot_gray.jpg',
            K: 'https://androidtvprod.s3.yandex.net/tandem_bg/bergamot_black.png',
            V: 'https://androidtvprod.s3.yandex.net/tandem_bg/bergamot_violet.jpg'
          },
          blackthorn: {
            default: 'https://androidtvprod.s3.yandex.net/tandem_bg/blackthorn_black.png',
            K: 'https://androidtvprod.s3.yandex.net/tandem_bg/blackthorn_black.png'
          },
          cucumber: {
            default: 'https://androidtvprod.s3.yandex.net/tandem_bg/cucumber_black.png',
            G: 'https://androidtvprod.s3.yandex.net/tandem_bg/cucumber_grey.png',
            K: 'https://androidtvprod.s3.yandex.net/tandem_bg/cucumber_black.png',
            N: 'https://androidtvprod.s3.yandex.net/tandem_bg/cucumber_pink.png',
            Y: 'https://androidtvprod.s3.yandex.net/tandem_bg/cucumber_orange.png',
            Z: 'https://androidtvprod.s3.yandex.net/tandem_bg/cucumber_green.png'
          },
          default: 'https://androidtvprod.s3.yandex.net/tandem_bg/station_1.jpg',
          mango: {
            default: 'https://androidtvprod.s3.yandex.net/tandem_bg/station_1.jpg'
          },
          pickle: {
            B: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_bg/pickle/station-mini3-pro-blue2.png',
            default: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_bg/pickle/station-mini3-pro-black2.png',
            K: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_bg/pickle/station-mini3-pro-black2.png',
            V: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_bg/pickle/station-mini3-pro-violet2.png',
            W: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_bg/pickle/station-mini3-pro-white2.png',
            Z: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_bg/pickle/station-mini3-pro-green2.png'
          },
          plum: {
            B: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_bg/plum_prune_lylak.png',
            C: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_bg/plum_prune_coral.png',
            default: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_bg/plum_prune_green.png',
            K: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_bg/plum_prune_grey.png',
            N: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_bg/plum_prune_pink.png',
            V: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_bg/plum_prune_lylak.png',
            Z: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_bg/plum_prune_green.png'
          },
          yandexmicro: {
            B: 'https://androidtvprod.s3.yandex.net/tandem_bg/micro_beige.jpg',
            default: 'https://androidtvprod.s3.yandex.net/tandem_bg/micro_green.jpg',
            G: 'https://androidtvprod.s3.yandex.net/tandem_bg/micro_green.jpg',
            N: 'https://androidtvprod.s3.yandex.net/tandem_bg/micro_pink.jpg',
            P: 'https://androidtvprod.s3.yandex.net/tandem_bg/micro_purple.jpg',
            R: 'https://androidtvprod.s3.yandex.net/tandem_bg/micro_red.jpg',
            Y: 'https://androidtvprod.s3.yandex.net/tandem_bg/micro_yellow.jpg'
          },
          yandexmidi: {
            B: 'https://androidtvprod.s3.yandex.net/tandem_bg/midi_blue.jpg',
            C: 'https://androidtvprod.s3.yandex.net/tandem_bg/midi_copper.jpg',
            default: 'https://androidtvprod.s3.yandex.net/tandem_bg/midi_black.jpg',
            E: 'https://androidtvprod.s3.yandex.net/tandem_bg/midi_beige.jpg',
            K: 'https://androidtvprod.s3.yandex.net/tandem_bg/midi_black.jpg'
          },
          yandexmini: {
            default: 'https://androidtvprod.s3.yandex.net/tandem_bg/mini.jpg'
          },
          yandexmini_2: {
            B: 'https://androidtvprod.s3.yandex.net/tandem_bg/mini_2_blue.jpg',
            default: 'https://androidtvprod.s3.yandex.net/tandem_bg/mini_2_black.jpg',
            G: 'https://androidtvprod.s3.yandex.net/tandem_bg/mini_2_gray.jpg',
            K: 'https://androidtvprod.s3.yandex.net/tandem_bg/mini_2_black.jpg',
            R: 'https://androidtvprod.s3.yandex.net/tandem_bg/mini_2_red.jpg'
          },
          yandexstation: {
            default: 'https://androidtvprod.s3.yandex.net/tandem_bg/station_1.jpg'
          },
          yandexstation_2: {
            B: 'https://androidtvprod.s3.yandex.net/tandem_bg/station_2_blue.jpg',
            default: 'https://androidtvprod.s3.yandex.net/tandem_bg/station_2_black.jpg',
            K: 'https://androidtvprod.s3.yandex.net/tandem_bg/station_2_black.jpg',
            R: 'https://androidtvprod.s3.yandex.net/tandem_bg/station_2_red.jpg',
            W: 'https://androidtvprod.s3.yandex.net/tandem_bg/station_2_white.jpg'
          }
        }),
        icons: z.record(z.string(), z.union([z.record(z.string(), z.object({
          default: z.string(),
          stereopair: z.string()
        })), z.string()])).default({
          bergamot: {
            default: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/bergamot_black.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/bergamot_black_stereo.png'
            },
            G: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/bergamot_gray.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/bergamot_gray_stereo.png'
            },
            K: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/bergamot_black.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/bergamot_black_stereo.png'
            },
            V: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/bergamot_violet.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/bergamot_violet_stereo.png'
            }
          },
          blackthorn: {
            default: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/blackthorn_black.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/blackthorn_black_stereo.png'
            },
            K: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/blackthorn_black.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/blackthorn_black_stereo.png'
            }
          },
          cucumber: {
            default: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/cucumber_black.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/cucumber_black_stereo.png'
            },
            G: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/cucumber_white.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/cucumber_white_stereo.png'
            },
            K: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/cucumber_black.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/cucumber_black_stereo.png'
            },
            N: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/cucumber_pink.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/cucumber_pink_stereo.png'
            },
            Y: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/cucumber_yellow.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/cucumber_yellow_stereo.png'
            },
            Z: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/cucumber_cyan.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/cucumber_cyan_stereo.png'
            }
          },
          default: 'https://androidtvprod.s3.yandex.net/tandem_icons/station_1.png',
          mango: {
            default: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/station_1.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/station_1_stereo.png'
            }
          },
          pickle: {
            B: {
              default: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_icons/pickle/station-mini3-pro-blue.png',
              stereopair: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_icons/pickle/station-mini3-pro-tandem-blue.png'
            },
            default: {
              default: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_icons/pickle/station-mini3-pro-black.png',
              stereopair: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_icons/pickle/station-mini3-pro-tandem-black.png'
            },
            K: {
              default: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_icons/pickle/station-mini3-pro-black.png',
              stereopair: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_icons/pickle/station-mini3-pro-tandem-black.png'
            },
            V: {
              default: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_icons/pickle/station-mini3-pro-violet.png',
              stereopair: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_icons/pickle/station-mini3-pro-tandem-violet.png'
            },
            W: {
              default: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_icons/pickle/station-mini3-pro-gray.png',
              stereopair: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_icons/pickle/station-mini3-pro-tandem-gray.png'
            },
            Z: {
              default: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_icons/pickle/station-mini3-pro-green.png',
              stereopair: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_icons/pickle/station-mini3-pro-tandem-green.png'
            }
          },
          plum: {
            B: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/plum_blue.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/plum_blue_stereo.png'
            },
            C: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/plum_copper.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/plum_copper_stereo.png'
            },
            default: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/plum_black.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/plum_black_stereo.png'
            },
            K: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/plum_black.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/plum_black_stereo.png'
            },
            N: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/plum_pink.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/plum_pink_stereo.png'
            },
            V: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/plum_violet.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/plum_violet_stereo.png'
            },
            Z: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/plum_green.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/plum_green_stereo.png'
            }
          },
          yandexmicro: {
            B: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/micro_beige.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/micro_beige_stereo.png'
            },
            default: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/micro_green.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/micro_green_stereo.png'
            },
            G: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/micro_green.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/micro_green_stereo.png'
            },
            N: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/micro_pink.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/micro_pink_stereo.png'
            },
            P: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/micro_purple.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/micro_purple_stereo.png'
            },
            R: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/micro_red.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/micro_red_stereo.png'
            },
            Y: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/micro_yellow.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/micro_yellow_stereo.png'
            }
          },
          yandexmidi: {
            B: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/midi_blue.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/midi_blue_stereo.png'
            },
            C: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/midi_copper.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/midi_copper_stereo.png'
            },
            default: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/midi_black.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/midi_black_stereo.png'
            },
            E: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/midi_beige.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/midi_beige_stereo.png'
            },
            K: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/midi_black.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/midi_black_stereo.png'
            }
          },
          yandexmini: {
            default: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/mini_1_black.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/mini_1_black_stereo.png'
            }
          },
          yandexmini_2: {
            B: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/mini_2_blue.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/mini_2_blue_stereo.png'
            },
            default: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/mini_2_black.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/mini_2_black_stereo.png'
            },
            G: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/mini_2_gray.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/mini_2_gray_stereo.png'
            },
            K: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/mini_2_black.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/mini_2_black_stereo.png'
            },
            R: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/mini_2_red.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/mini_2_red_stereo.png'
            }
          },
          yandexstation: {
            default: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/station_1.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/station_1_stereo.png'
            }
          },
          yandexstation_2: {
            B: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/station_2_blue.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/station_2_blue_stereo.png'
            },
            default: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/station_2_black.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/station_2_black_stereo.png'
            },
            K: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/station_2_black.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/station_2_black_stereo.png'
            },
            R: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/station_2_red.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/station_2_red_stereo.png'
            },
            W: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/station_2_white.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/station_2_white_stereo.png'
            }
          }
        })
      }),
      timeLimitSettingsScreenEnabled: z.boolean().default(true),
      timePersistConfig: z.object({
        timePersistEnabled: z.boolean().default(true),
        timePersistIntervalMs: z.number().default(30_000)
      }),
      transparentAuthWebview: z.boolean().default(true),
      voiceEnrollmentEnabled: z.boolean().default(true),
      writeIsActiveAccountChildSystemProperty: z.boolean().default(true)
    }),
    comYandexTvServicesMetrica: z.object({
      timePersistConfig: z.object({
        timePersistEnabled: z.boolean().default(true),
        timePersistIntervalMs: z.number().default(30_000)
      })
    }),
    comYandexTvServicesPlatform: z.object({
      accessibilityConfig: z.object({
        serviceTypes: z.array(z.string()).default([
          'key-event-metrics',
          'perform-user-actions'
        ])
      }),
      adbEnabled: z.boolean().default(true),
      androidSettingsConfig: z.object({
        enabled: z.boolean().default(true),
        globalSettingsMap: z.record(z.string(), z.object({
          value: z.string(),
          valueType: z.string()
        })).default({
          captive_portal_fallback_url: {
            value: 'http://scbh.yandex.net/generate_204',
            valueType: 'String'
          },
          captive_portal_http_url: {
            value: 'http://www.google.com/generate_204',
            valueType: 'String'
          },
          ntp_server: {
            value: 'ru.pool.ntp.org',
            valueType: 'String'
          }
        }),
        secureSettingsMap: z.record(z.string(), z.object({
          value: z.string(),
          valueType: z.string()
        })).default({
          keyboard_bind_only_with_edit_info: {
            value: '1',
            valueType: 'INT'
          }
        })
      }),
      audioServerStateListenEnabled: z.boolean().default(true),
      defaultVoiceRecognitionService: z.string().default('iosdk'),
      externalAppAsCurrentScreenEnabledV3: z.boolean().default(true),
      isForegroundAppListenerEnabledV1: z.boolean().default(true),
      lastWatchedEnabled: z.boolean().default(true),
      lmk: z.object({
        configurerEnabled: z.boolean().default(true),
        highPriorityProcesses: z.array(z.string()).default([
          'com.yandex.tv.services:Metrica',
          'com.yandex.tv.services:passport'
        ]),
        highPriorityProcessesEnabled: z.boolean().default(true)
      }),
      mediaSessionServiceEnabledV2: z.boolean().default(false),
      osNameDisplayed: z.boolean().default(true),
      screensaver: z.object({
        ecoModeV2: z.object({
          brightnessPercent: z.number().default(15),
          enabled: z.boolean().default(true)
        }),
        pictureModeV3: z.object({
          enabled: z.boolean().default(false)
        }),
        pictureModeV4: z.object({
          enabled: z.boolean().default(true)
        }),
        themeChooserSetting: z.object({
          settingEnabled: z.boolean().default(true)
        })
      }),
      sendStoragedInfoPeriodMsV2: z.number().default(3_600_000),
      settings: z.object({
        keyboardComponent: z.string().default('com.yandex.tv.keyboard/.YaOSKeyboardService'),
        systemPropertyWrite: z.object({
          backlightMinMax: z.string().default('auto_bl'),
          lmkMetricsEnabled: z.string().default('true'),
          memcEnhance: z.string().default('true')
        })
      }),
      settingsOverlayEnabledV2: z.boolean().default(true),
      sourcesOverlayEnabled: z.boolean().default(true),
      supportedMediaSessionApplications: z.array(z.string()).default([
        'com.ctcmediagroup.videomore',
        'com.vk.tv',
        'com.yandex.tv.webplayer',
        'com.yandex.tv.ytplayer',
        'gpm.tnt_premier',
        'ru.ivi.client',
        'ru.kinopoisk.yandex.tv',
        'ru.litres.android.audio',
        'ru.rt.video.app.tv',
        'ru.rutube.app',
        'ru.start.androidmobile'
      ]),
      systemui: z.object({
        islandVolumeEnabled: z.boolean().default(true)
      }),
      voiceVolumeStep: z.number().default(5)
    }),
    comYandexTvServicesPrivileged: z.object({
      foregroundServicesLimiter: z.object({
        packagesWhitelist: z.array(z.string()).default([
          'androidx.test.orchestrator',
          'androidx.test.services',
          'jp.co.cyberagent.stf'
        ])
      })
    }),
    comYandexTvSettings: z.object({
      parentalControlDynamic: z.boolean().default(true)
    }),
    comYandexTvSetupwizard: z.object({
      coldStartRecommendations: z.object({
        coldStartChangingTextPhrasesDelayMs: z.number().default(3000),
        coldStartHomeCarouselsReloadTimeoutMs: z.number().default(10_000),
        coldStartScreenEnabled: z.boolean().default(true),
        coldStartScreenEnabledV1: z.boolean().default(true),
        coldStartTransitionPhrases: z.array(z.string()).default([
          'Подбираем фильмы специально для вас',
          'Создаём рецепт идеального киносвидания для вас',
          'Придумываем сценарий вашего безупречного киновечера',
          'Ваш вкус безупречен — учитываем ваши киноинтересы',
          'Момент, и вы окунётесь в мир ваших идеальных фильмов'
        ])
      }),
      media: z.object({
        image: z.record(z.string(), z.record(z.string(), z.object({
          fileSize: z.number(),
          maxDownloadTime: z.number(),
          url: z.string()
        }))).default({
          suwAuthPromoBackgroundImage: {
            default: {
              fileSize: 58_964,
              maxDownloadTime: 180,
              url: 'https://androidtvprod.s3.yandex.net/suw_images/suwAuthPromoBackgroundImageV2.webp'
            }
          }
        }),
        video: z.record(z.string(), z.record(z.string(), z.object({
          fileSize: z.number(),
          maxDownloadTime: z.number(),
          url: z.string()
        }))).default({
          coldStartRecommendationsLoopVideo: {
            default: {
              fileSize: 2_378_367,
              maxDownloadTime: 180,
              url: 'https://cdnrsiggl4o3oqvksiom.svc.cdn.yandex.net/suw_video/coldstart_v2/cold_start_recommendations_loop_video_v2.mp4'
            }
          },
          coldStartRecommendationsTransitionInVideo: {
            default: {
              fileSize: 1_296_657,
              maxDownloadTime: 180,
              url: 'https://cdnrsiggl4o3oqvksiom.svc.cdn.yandex.net/suw_video/coldstart_v2/cold_start_recommendations_transition_in_video_v2.mp4'
            }
          },
          coldStartRecommendationsTransitionOutVideo: {
            default: {
              fileSize: 1_912_124,
              maxDownloadTime: 180,
              url: 'https://cdnrsiggl4o3oqvksiom.svc.cdn.yandex.net/suw_video/coldstart_v2/cold_start_recommendations_transition_out_video_v2.mp4'
            }
          }
        })
      }),
      setupSoundEnabled: z.boolean().default(true),
      skipAuthButtonAvailable: z.boolean().default(true),
      tandemSetup: z.object({
        backgrounds: z.record(z.string(), z.union([z.record(z.string(), z.string()), z.string()])).default({
          bergamot: {
            default: 'https://androidtvprod.s3.yandex.net/tandem_bg/bergamot_black.png',
            G: 'https://androidtvprod.s3.yandex.net/tandem_bg/bergamot_gray.jpg',
            K: 'https://androidtvprod.s3.yandex.net/tandem_bg/bergamot_black.png',
            V: 'https://androidtvprod.s3.yandex.net/tandem_bg/bergamot_violet.jpg'
          },
          blackthorn: {
            default: 'https://androidtvprod.s3.yandex.net/tandem_bg/blackthorn_black.png',
            K: 'https://androidtvprod.s3.yandex.net/tandem_bg/blackthorn_black.png'
          },
          cucumber: {
            default: 'https://androidtvprod.s3.yandex.net/tandem_bg/cucumber_black.png',
            G: 'https://androidtvprod.s3.yandex.net/tandem_bg/cucumber_grey.png',
            K: 'https://androidtvprod.s3.yandex.net/tandem_bg/cucumber_black.png',
            N: 'https://androidtvprod.s3.yandex.net/tandem_bg/cucumber_pink.png',
            Y: 'https://androidtvprod.s3.yandex.net/tandem_bg/cucumber_orange.png',
            Z: 'https://androidtvprod.s3.yandex.net/tandem_bg/cucumber_green.png'
          },
          default: 'https://androidtvprod.s3.yandex.net/tandem_bg/station_1.jpg',
          mango: {
            default: 'https://androidtvprod.s3.yandex.net/tandem_bg/station_1.jpg'
          },
          pickle: {
            B: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_bg/pickle/station-mini3-pro-blue2.png',
            default: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_bg/pickle/station-mini3-pro-black2.png',
            K: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_bg/pickle/station-mini3-pro-black2.png',
            V: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_bg/pickle/station-mini3-pro-violet2.png',
            W: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_bg/pickle/station-mini3-pro-white2.png',
            Z: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_bg/pickle/station-mini3-pro-green2.png'
          },
          plum: {
            B: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_bg/plum_prune_lylak.png',
            C: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_bg/plum_prune_coral.png',
            default: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_bg/plum_prune_green.png',
            K: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_bg/plum_prune_grey.png',
            N: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_bg/plum_prune_pink.png',
            V: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_bg/plum_prune_lylak.png',
            Z: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_bg/plum_prune_green.png'
          },
          yandexmicro: {
            B: 'https://androidtvprod.s3.yandex.net/tandem_bg/micro_beige.jpg',
            default: 'https://androidtvprod.s3.yandex.net/tandem_bg/micro_green.jpg',
            G: 'https://androidtvprod.s3.yandex.net/tandem_bg/micro_green.jpg',
            N: 'https://androidtvprod.s3.yandex.net/tandem_bg/micro_pink.jpg',
            P: 'https://androidtvprod.s3.yandex.net/tandem_bg/micro_purple.jpg',
            R: 'https://androidtvprod.s3.yandex.net/tandem_bg/micro_red.jpg',
            Y: 'https://androidtvprod.s3.yandex.net/tandem_bg/micro_yellow.jpg'
          },
          yandexmidi: {
            B: 'https://androidtvprod.s3.yandex.net/tandem_bg/midi_blue.jpg',
            C: 'https://androidtvprod.s3.yandex.net/tandem_bg/midi_copper.jpg',
            default: 'https://androidtvprod.s3.yandex.net/tandem_bg/midi_black.jpg',
            E: 'https://androidtvprod.s3.yandex.net/tandem_bg/midi_beige.jpg',
            K: 'https://androidtvprod.s3.yandex.net/tandem_bg/midi_black.jpg'
          },
          yandexmini: {
            default: 'https://androidtvprod.s3.yandex.net/tandem_bg/mini.jpg'
          },
          yandexmini_2: {
            B: 'https://androidtvprod.s3.yandex.net/tandem_bg/mini_2_blue.jpg',
            default: 'https://androidtvprod.s3.yandex.net/tandem_bg/mini_2_black.jpg',
            G: 'https://androidtvprod.s3.yandex.net/tandem_bg/mini_2_gray.jpg',
            K: 'https://androidtvprod.s3.yandex.net/tandem_bg/mini_2_black.jpg',
            R: 'https://androidtvprod.s3.yandex.net/tandem_bg/mini_2_red.jpg'
          },
          yandexstation: {
            default: 'https://androidtvprod.s3.yandex.net/tandem_bg/station_1.jpg'
          },
          yandexstation_2: {
            B: 'https://androidtvprod.s3.yandex.net/tandem_bg/station_2_blue.jpg',
            default: 'https://androidtvprod.s3.yandex.net/tandem_bg/station_2_black.jpg',
            K: 'https://androidtvprod.s3.yandex.net/tandem_bg/station_2_black.jpg',
            R: 'https://androidtvprod.s3.yandex.net/tandem_bg/station_2_red.jpg',
            W: 'https://androidtvprod.s3.yandex.net/tandem_bg/station_2_white.jpg'
          }
        }),
        icons: z.record(z.string(), z.union([z.record(z.string(), z.object({
          default: z.string(),
          stereopair: z.string()
        })), z.string()])).default({
          bergamot: {
            default: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/bergamot_black.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/bergamot_black_stereo.png'
            },
            G: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/bergamot_gray.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/bergamot_gray_stereo.png'
            },
            K: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/bergamot_black.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/bergamot_black_stereo.png'
            },
            V: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/bergamot_violet.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/bergamot_violet_stereo.png'
            }
          },
          blackthorn: {
            default: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/blackthorn_black.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/blackthorn_black_stereo.png'
            },
            K: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/blackthorn_black.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/blackthorn_black_stereo.png'
            }
          },
          cucumber: {
            default: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/cucumber_black.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/cucumber_black_stereo.png'
            },
            G: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/cucumber_white.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/cucumber_white_stereo.png'
            },
            K: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/cucumber_black.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/cucumber_black_stereo.png'
            },
            N: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/cucumber_pink.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/cucumber_pink_stereo.png'
            },
            Y: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/cucumber_yellow.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/cucumber_yellow_stereo.png'
            },
            Z: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/cucumber_cyan.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/cucumber_cyan_stereo.png'
            }
          },
          default: 'https://androidtvprod.s3.yandex.net/tandem_icons/station_1.png',
          mango: {
            default: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/station_1.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/station_1_stereo.png'
            }
          },
          pickle: {
            B: {
              default: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_icons/pickle/station-mini3-pro-blue.png',
              stereopair: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_icons/pickle/station-mini3-pro-tandem-blue.png'
            },
            default: {
              default: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_icons/pickle/station-mini3-pro-black.png',
              stereopair: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_icons/pickle/station-mini3-pro-tandem-black.png'
            },
            K: {
              default: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_icons/pickle/station-mini3-pro-black.png',
              stereopair: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_icons/pickle/station-mini3-pro-tandem-black.png'
            },
            V: {
              default: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_icons/pickle/station-mini3-pro-violet.png',
              stereopair: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_icons/pickle/station-mini3-pro-tandem-violet.png'
            },
            W: {
              default: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_icons/pickle/station-mini3-pro-gray.png',
              stereopair: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_icons/pickle/station-mini3-pro-tandem-gray.png'
            },
            Z: {
              default: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_icons/pickle/station-mini3-pro-green.png',
              stereopair: 'https://cdnr2gfhoxlvj5gm23vk.svc.cdn.yandex.net/tandem_icons/pickle/station-mini3-pro-tandem-green.png'
            }
          },
          plum: {
            B: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/plum_blue.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/plum_blue_stereo.png'
            },
            C: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/plum_copper.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/plum_copper_stereo.png'
            },
            default: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/plum_black.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/plum_black_stereo.png'
            },
            K: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/plum_black.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/plum_black_stereo.png'
            },
            N: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/plum_pink.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/plum_pink_stereo.png'
            },
            V: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/plum_violet.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/plum_violet_stereo.png'
            },
            Z: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/plum_green.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/plum_green_stereo.png'
            }
          },
          yandexmicro: {
            B: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/micro_beige.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/micro_beige_stereo.png'
            },
            default: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/micro_green.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/micro_green_stereo.png'
            },
            G: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/micro_green.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/micro_green_stereo.png'
            },
            N: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/micro_pink.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/micro_pink_stereo.png'
            },
            P: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/micro_purple.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/micro_purple_stereo.png'
            },
            R: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/micro_red.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/micro_red_stereo.png'
            },
            Y: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/micro_yellow.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/micro_yellow_stereo.png'
            }
          },
          yandexmidi: {
            B: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/midi_blue.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/midi_blue_stereo.png'
            },
            C: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/midi_copper.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/midi_copper_stereo.png'
            },
            default: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/midi_black.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/midi_black_stereo.png'
            },
            E: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/midi_beige.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/midi_beige_stereo.png'
            },
            K: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/midi_black.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/midi_black_stereo.png'
            }
          },
          yandexmini: {
            default: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/mini_1_black.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/mini_1_black_stereo.png'
            }
          },
          yandexmini_2: {
            B: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/mini_2_blue.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/mini_2_blue_stereo.png'
            },
            default: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/mini_2_black.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/mini_2_black_stereo.png'
            },
            G: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/mini_2_gray.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/mini_2_gray_stereo.png'
            },
            K: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/mini_2_black.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/mini_2_black_stereo.png'
            },
            R: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/mini_2_red.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/mini_2_red_stereo.png'
            }
          },
          yandexstation: {
            default: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/station_1.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/station_1_stereo.png'
            }
          },
          yandexstation_2: {
            B: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/station_2_blue.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/station_2_blue_stereo.png'
            },
            default: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/station_2_black.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/station_2_black_stereo.png'
            },
            K: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/station_2_black.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/station_2_black_stereo.png'
            },
            R: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/station_2_red.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/station_2_red_stereo.png'
            },
            W: {
              default: 'https://androidtvprod.s3.yandex.net/tandem_icons/station_2_white.png',
              stereopair: 'https://androidtvprod.s3.yandex.net/tandem_icons/station_2_white_stereo.png'
            }
          }
        })
      })
    }),
    comYandexTvSport: z.object({
      backendMenuItemUnlocked: z.boolean().default(true),
      carouselAutoUpdateEnabled: z.boolean().default(true),
      carouselAutoUpdateInterval: z.number().default(300),
      hintsEnabled: z.boolean().default(true),
      reminderButtonIsVisible: z.boolean().default(true),
      scoreIsVisible: z.boolean().default(false)
    }),
    comYandexTvVideoplayer: z.object({
      adsEnabledProd: z.boolean().default(true),
      adsScenarioId: z.string().default('188'),
      allowRemoteConfigurationV1: z.boolean().default(true),
      availableSpeedListV1: z.array(z.number()).default([
        0.25,
        0.5,
        0.75,
        1,
        1.25,
        1.5,
        1.75,
        2
      ]),
      buyPlusButtonV5: z.object({
        isVisible: z.boolean().default(true)
      }),
      ignoreVideometaError: z.boolean().default(true),
      ioCom: z.object({
        capabilities: z.object({
          useIoComForAlarm: z.boolean().default(true)
        }),
        isIoComHostProxyEnabledV1: z.boolean().default(true)
      }),
      isNewPlayerEnabledV1: z.boolean().default(true),
      isNewPlayerEnabledV2: z.boolean().default(true),
      isNewPlayerEnabledV3: z.boolean().default(true),
      isNewPlayerEnabledV4: z.boolean().default(true),
      isNewPlayerEnabledV5: z.boolean().default(true),
      isNewPlayerEnabledV6: z.boolean().default(true),
      isSmartSkipEnabledV2: z.boolean().default(true),
      manifestsDataSourceSettings: z.object({
        cachedDataSourceContentIdsCount: z.number().default(5),
        cachedDataSourcePerContentIdsKbSize: z.number().default(8120),
        isCachedDataSourceEnabled: z.boolean().default(true)
      }),
      mbuSettings: z.object({
        mbuDoNotOverrideRh: z.boolean().default(true),
        mbuEnableForDynamic: z.boolean().default(true),
        mbuEnableMoveToUnbanned: z.boolean().default(false),
        mbuEnableUpdate: z.boolean().default(true),
        mbuFallbackByAnyExc: z.boolean().default(true)
      }),
      optimizeConcurrentCommandExecutionV1: z.boolean().default(true),
      preloadVideoDataSettings: z.object({
        isPreloadCacheStaticV1: z.boolean().default(true),
        preloadVideoDataLifetime: z.number().default(18_000_000)
      }),
      preventAmlogic2MemoryLeak: z.boolean().default(true),
      secureDecodersForClearVideo: z.boolean().default(true),
      shouldMonitorFrameDrops: z.boolean().default(true),
      statusBarOnV2: z.boolean().default(true),
      stopAutoPlaybackTimeoutMs: z.number().default(300_000),
      useArpcForReceiveSubscriptionOfferV5: z.boolean().default(true),
      useArpcForVideoMetadataV4: z.boolean().default(true),
      useBandwidthLastValueProvider: z.boolean().default(true),
      useManualAdBreaks: z.boolean().default(true),
      useNewKinopoiskOttMovieStrategyV1: z.boolean().default(true),
      useNewKinopoiskOttSportStrategyV1: z.boolean().default(true),
      useQuasarPlatformAsFromBlockParameter: z.boolean().default(true),
      useReleaseInsteadStopV1: z.boolean().default(true)
    }),
    comYandexTvWebplayer: z.object({
      bufferSizeInSeconds: z.number().default(1.0667),
      doc2Doc: z.object({
        doc2DocEnabledV2: z.boolean().default(true),
        voiceControlsEnabledV2: z.boolean().default(true)
      }),
      isEpisodesButtonEnabled: z.boolean().default(true),
      isNextVideoButtonEnabled: z.boolean().default(true),
      pointerEnabledV1: z.boolean().default(true),
      supportedPlayers: z.record(z.string(), z.object({
        additionalVideoUrlParams: z.record(z.string(), z.string()).default({}),
        ignoreWebViewErrors: z.boolean().optional(),
        sandboxName: z.string(),
        sandboxVersion: z.string(),
        showNativeSubtitles: z.boolean().optional(),
        useJsControlsScript: z.boolean().optional(),
        useNativeOverlayV5: z.boolean().optional(),
        userAgent: z.string().optional()
      })).default({
        __raw_opengraph_embed_url__: {
          additionalVideoUrlParams: {},
          sandboxName: 'iframe-default',
          sandboxVersion: '0x001cd987dbd',
          useJsControlsScript: true
        },
        default: {
          additionalVideoUrlParams: {},
          sandboxName: 'iframe-default',
          sandboxVersion: '0x001cd987dbd'
        },
        ebalka: {
          additionalVideoUrlParams: {},
          sandboxName: 'iframe-default',
          sandboxVersion: '0x001cd987dbd',
          useJsControlsScript: true
        },
        izlesene: {
          additionalVideoUrlParams: {},
          sandboxName: 'izlesene',
          sandboxVersion: '0x001cd987dbd'
        },
        mailru_new: {
          additionalVideoUrlParams: {},
          sandboxName: 'mailru',
          sandboxVersion: '0x001cd987dbd',
          userAgent: 'Mozilla/5.0 (Linux; Android 7.0; SM-G570M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.102 Mobile Safari/537.36'
        },
        ok: {
          additionalVideoUrlParams: {},
          sandboxName: 'ok',
          sandboxVersion: '0x001cd987dbd',
          userAgent: 'Mozilla/5.0 (Linux; Android 7.0; SM-G570M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.102 Mobile Safari/537.36'
        },
        pornhub: {
          additionalVideoUrlParams: {},
          sandboxName: 'iframe-default',
          sandboxVersion: '0x001cd987dbd',
          useJsControlsScript: true
        },
        rutube: {
          additionalVideoUrlParams: {
            deviceType: 'tv',
            os: 'yaos'
          },
          ignoreWebViewErrors: true,
          sandboxName: 'rutube',
          sandboxVersion: '0x001cd987dbd',
          showNativeSubtitles: true,
          useNativeOverlayV5: true
        },
        vimeo: {
          additionalVideoUrlParams: {},
          sandboxName: 'vimeo',
          sandboxVersion: '0x001cd987dbd'
        },
        vk: {
          additionalVideoUrlParams: {
            partner_name: 'yaos'
          },
          ignoreWebViewErrors: true,
          sandboxName: 'vk',
          sandboxVersion: '0x001cd987dbd'
        },
        yandex: {
          additionalVideoUrlParams: {},
          sandboxName: 'yandex',
          sandboxVersion: '0x001cd987dbd'
        },
        zen: {
          additionalVideoUrlParams: {},
          sandboxName: 'dzen',
          sandboxVersion: '0x001cd987dbd',
          useJsControlsScript: true
        }
      }),
      useBrowserMediaSessionV2: z.boolean().default(true),
      voiceControlsTracksEnabled: z.boolean().default(true)
    }),
    counterActivation: z.object({
      aliceTimeToWin: z.number().default(0),
      commandTimeToWin: z.number().default(150),
      enabled: z.boolean().default(true)
    }),
    deviceControlPanel: z.object({
      checkAliceProSubscription: z.boolean().default(true)
    }),
    droidekaUrl: z.string().default('https://droideka.smarttv.yandex.net'),
    enableBackCommandSpotterForAnyContent: z.boolean().default(true),
    enableBiometryAccountOptions: z.boolean().default(true),
    enableCommandSpotters: z.boolean().default(true),
    enableUpdateTtsDirectives261: z.boolean().default(true),
    equalizer: z.object({
      type: z.string().default('hybrid')
    }),
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
    fastCommandRequester: z.object({
      useTvOnWithBiometry: z.boolean().default(true)
    }),
    fluentBit: z.object({
      level: z.string().default('warn'),
      samplingRatio: z.number().default(0.5),
      variables: z.object({
        daemonsLogsDst: z.string().default('none'),
        flushInterval: z.string().default('60'),
        httpRetryLimit: z.string().default('2'),
        ipcLogsDst: z.string().default('none'),
        kernelLogsDst: z.string().default('none'),
        libLogsDst: z.string().default('none'),
        logcatDst: z.string().default('none')
      })
    }),
    forceWifiReconfigure: z.boolean().default(false),
    gamerCopilot: z.object({
      enableGamerCopilotSettings: z.boolean().default(true),
      sendAskForHdcpInstructionTcb: z.boolean().default(true),
      useCachedScreenshotWhenOnConsoles: z.boolean().default(true)
    }),
    geoSyncSchedulerSettings: z.object({
      enabled: z.boolean().default(true)
    }),
    glagold: z.object({
      enabled: z.boolean().default(true),
      enableEndpointProtocol: z.boolean().default(true),
      peersExchange: z.boolean().default(true),
      useFamilyDeviceList: z.boolean().default(false)
    }),
    glagolHeartbeat: z.boolean().default(true),
    hybridRequestFactory: z.object({
      hybrid: z.object({
        scenarios: z.object({
          fastCommandScenario: z.object({
            enableLocalContinueForVideoPlayer: z.boolean().default(true),
            enableLocalStopForVideoPlayer: z.boolean().default(true),
            enableLocalTtsStop: z.boolean().default(true),
            supportedFramesArray: z.array(z.string()).default([
              'personal_assistant.scenarios.bluetooth_off',
              'personal_assistant.scenarios.bluetooth_on',
              'personal_assistant.scenarios.player.continue',
              'personal_assistant.scenarios.player.next_track',
              'personal_assistant.scenarios.player.pause',
              'personal_assistant.scenarios.player.previous_track',
              'personal_assistant.scenarios.sound.louder',
              'personal_assistant.scenarios.sound.quiter'
            ]),
            supportedFramesObject: z.record(z.string(), z.array(z.string())).default({
              'personal_assistant.scenarios.bluetooth_off': [],
              'personal_assistant.scenarios.bluetooth_on': [],
              'personal_assistant.scenarios.player.continue': [],
              'personal_assistant.scenarios.player.next_track': [],
              'personal_assistant.scenarios.player.pause': [],
              'personal_assistant.scenarios.player.previous_track': [],
              'personal_assistant.scenarios.quasar.go_back': [
                'main',
                'centaur_default_screen',
                'music_player',
                'video_player'
              ],
              'personal_assistant.scenarios.quasar.go_down': [
                'main',
                'centaur_default_screen'
              ],
              'personal_assistant.scenarios.quasar.go_forward': [
                'main',
                'centaur_default_screen'
              ],
              'personal_assistant.scenarios.quasar.go_home': [],
              'personal_assistant.scenarios.quasar.go_left': [
                'main',
                'centaur_default_screen'
              ],
              'personal_assistant.scenarios.quasar.go_up': [
                'main',
                'centaur_default_screen'
              ],
              'personal_assistant.scenarios.sound.louder': [],
              'personal_assistant.scenarios.sound.quiter': []
            })
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
    iotScenarios: z.object({
      syncOnNonExistingDb: z.boolean().default(true)
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
      hlsRandomizePlaylists: z.boolean().default(true),
      useGstreamerAudioPlayer2: z.boolean().default(true)
    }),
    metricsDumperPeriodSec: z.number().default(600),
    multiroomd: z.object({
      latencyMs: z.number().default(-177)
    }),
    networkMetricaLoggingEnabled: z.boolean().default(false),
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
    nsdInsteadOfAvahi: z.boolean().default(true),
    onlineSpotterEnabled: z.boolean().default(true),
    passportApi: z.object({
      useAuthInfoProviderV2: z.boolean().default(false)
    }),
    phoneCalls: z.object({
      accountRegConfig: z.object({
        timeoutSec: z.number().default(60)
      }),
      atsManager: z.boolean().default(true),
      blockUpdatesOnCall: z.boolean().default(true),
      enabled: z.boolean().default(true),
      executeServerCallbacks: z.boolean().default(true),
      pjsip: z.object({
        enabled: z.boolean().default(true)
      }),
      registerOnAdd: z.boolean().default(false),
      webrtc: z.object({
        enabled: z.boolean().default(false)
      })
    }),
    pinger: z.object({
      pings: z.array(z.object({
        gateway: z.boolean().optional(),
        host: z.string().optional(),
        intervalMs: z.number(),
        timeoutMs: z.number()
      })).default([
        {
          host: 'quasar.yandex.ru',
          intervalMs: 10_000,
          timeoutMs: 10_000
        },
        {
          gateway: true,
          intervalMs: 5000,
          timeoutMs: 5000
        },
        {
          host: '8.8.8.8',
          intervalMs: 10_000,
          timeoutMs: 10_000
        }
      ]),
      socketType: z.string().default('dgram')
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
    quickPinger: z.object({
      pings: z.array(z.object({
        gateway: z.boolean(),
        intervalMs: z.number(),
        timeoutMs: z.number()
      })).default([
        {
          gateway: true,
          intervalMs: 100,
          timeoutMs: 100
        }
      ]),
      socketType: z.string().default('dgram')
    }),
    sendCapabilityStateUpdates: z.boolean().default(true),
    sendVinsRequestProto: z.boolean().default(true),
    shouldCheckWifi: z.boolean().default(false),
    smartVolume: z.object({
      androidOverrides: z.array(z.object({
        newFields: z.object({
          splCalibShift: z.number()
        }),
        properties: z.record(z.string(), z.string())
      })).default([
        {
          newFields: {
            splCalibShift: 116.4
          },
          properties: {
            'ro.boot.hardware.revision': '1',
            'ro.yndx.screen.size': '43'
          }
        },
        {
          newFields: {
            splCalibShift: 117.2
          },
          properties: {
            'ro.boot.hardware.revision': '1',
            'ro.yndx.screen.size': '50'
          }
        },
        {
          newFields: {
            splCalibShift: 112.7
          },
          properties: {
            'ro.boot.hardware.revision': '1',
            'ro.yndx.screen.size': '55'
          }
        },
        {
          newFields: {
            splCalibShift: 112.2
          },
          properties: {
            'ro.boot.hardware.revision': '1',
            'ro.yndx.screen.size': '65'
          }
        },
        {
          newFields: {
            splCalibShift: 112.8
          },
          properties: {
            'ro.boot.hardware.revision': '2',
            'ro.yndx.screen.size': '43'
          }
        },
        {
          newFields: {
            splCalibShift: 112.1
          },
          properties: {
            'ro.boot.hardware.revision': '2',
            'ro.yndx.screen.size': '50'
          }
        },
        {
          newFields: {
            splCalibShift: 111.9
          },
          properties: {
            'ro.boot.hardware.revision': '2',
            'ro.yndx.screen.size': '55'
          }
        },
        {
          newFields: {
            splCalibShift: 113.2
          },
          properties: {
            'ro.boot.hardware.revision': '2',
            'ro.yndx.screen.size': '65'
          }
        }
      ]),
      enabled: z.boolean().default(true),
      percentThresholds: z.array(z.object({
        from: z.number(),
        to: z.array(z.object({
          upperThresh: z.number().nullable(),
          vol: z.number().nullable()
        }))
      })).default([
        {
          from: 0,
          to: [
            {
              upperThresh: null,
              vol: null
            }
          ]
        },
        {
          from: 7.5,
          to: [
            {
              upperThresh: 38,
              vol: null
            },
            {
              upperThresh: null,
              vol: 10
            }
          ]
        },
        {
          from: 12.5,
          to: [
            {
              upperThresh: 42,
              vol: null
            },
            {
              upperThresh: null,
              vol: 15
            }
          ]
        },
        {
          from: 17.5,
          to: [
            {
              upperThresh: 46,
              vol: null
            },
            {
              upperThresh: null,
              vol: 20
            }
          ]
        },
        {
          from: 22.5,
          to: [
            {
              upperThresh: 50,
              vol: null
            },
            {
              upperThresh: null,
              vol: 25
            }
          ]
        },
        {
          from: 27.5,
          to: [
            {
              upperThresh: null,
              vol: null
            }
          ]
        },
        {
          from: 32.5,
          to: [
            {
              upperThresh: null,
              vol: null
            },
            {
              upperThresh: 42,
              vol: 25
            }
          ]
        },
        {
          from: 37.5,
          to: [
            {
              upperThresh: null,
              vol: 30
            }
          ]
        },
        {
          from: 42.5,
          to: [
            {
              upperThresh: null,
              vol: 35
            }
          ]
        },
        {
          from: 100,
          to: [
            {
              upperThresh: null,
              vol: null
            }
          ]
        }
      ]),
      skipFrames: z.number().default(31),
      soundWindowSize: z.number().default(256),
      splCalibSilence: z.number().default(-150),
      splQuantile: z.number().default(0.15),
      volumeChangeDisableTimeout: z.number().default(300),
      volumeLevelSplsPercent: z.array(z.object({
        spl: z.number(),
        vol: z.number()
      })).default([
        {
          spl: 14.2,
          vol: 1
        },
        {
          spl: 21.5,
          vol: 5
        },
        {
          spl: 29,
          vol: 10
        },
        {
          spl: 35.5,
          vol: 15
        },
        {
          spl: 42.3,
          vol: 20
        },
        {
          spl: 47.8,
          vol: 25
        },
        {
          spl: 53.2,
          vol: 30
        },
        {
          spl: 56.4,
          vol: 35
        },
        {
          spl: 59.7,
          vol: 40
        },
        {
          spl: 62.9,
          vol: 45
        },
        {
          spl: 64.4,
          vol: 50
        },
        {
          spl: 65.8,
          vol: 55
        },
        {
          spl: 67.4,
          vol: 60
        },
        {
          spl: 68.6,
          vol: 65
        },
        {
          spl: 69.7,
          vol: 70
        },
        {
          spl: 70.8,
          vol: 75
        },
        {
          spl: 72,
          vol: 80
        },
        {
          spl: 72.8,
          vol: 85
        },
        {
          spl: 74.2,
          vol: 90
        },
        {
          spl: 75.2,
          vol: 95
        },
        {
          spl: 76.2,
          vol: 100
        }
      ]),
      volumeRestoreRule: z.string().default('save_if_manual'),
      volumeSelectionStrategy: z.string().default('percent')
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
    speechkitLogChannels: z.array(z.string()).default([
      'vqe_0',
      'vqe_bnr_0'
    ]),
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
    tandemColorCodesConfig: z.record(z.string(), z.record(z.string(), z.array(z.string()))).default({
      bergamot: {
        14: [
          '13',
          '14'
        ]
      },
      cucumber: {
        14: [
          '13',
          '14'
        ]
      },
      pickle: {
        14: [
          '13',
          '14'
        ]
      },
      plum: {
        14: [
          '13',
          '14'
        ]
      }
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
        bucketsCount: z.number().default(1),
        filteredEvents: z.array(z.string()).default([
          'system_app_anr',
          'system_app_crash',
          'system_app_native_crash',
          'init_error_screen_shown',
          'passport_error',
          'teasers_loading_error'
        ]),
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
    ttsAnnotationsMapper: z.object({
      enabled: z.boolean().default(true)
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
    uniProxyUrl: z.string().default('wss://uniproxy.alice.yandex.net/uni.ws'),
    useActiveAccountGuestOptions: z.boolean().default(true),
    useDeviceStateRaw: z.boolean().default(true),
    useEnvironmentStateRaw: z.boolean().default(true),
    useVinsRequestProto: z.boolean().default(true),
    voiceActivityDetector: z.object({
      eventsEnabled: z.boolean().default(true)
    }),
    voiceDialogSettings: z.object({
      activationSpotterSettings: z.object({
        spotterLoggingRareEventPercent: z.number().default(50),
        spotterLoggingRareEventTailMillis: z.number().default(5000),
        spotterLoggingVeryRareEventTailMillis: z.number().default(5000)
      }),
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
      resetAfterTrigger: z.boolean().default(false),
      spotterLoggingHeadMillis: z.number().default(0),
      spotterLoggingRareEventPercent: z.number().default(0),
      spotterLoggingTailMillis: z.number().default(0),
      spotterLoggingVeryRareEventPercent: z.number().default(1),
      spotterLoggingVeryRareStreamingLengthMillis: z.number().default(5000),
      useCounterActivation: z.boolean().default(true),
      useProtoAliceApi: z.boolean().default(true)
    }),
    wifiCapability: z.object({
      enabledV2: z.boolean().default(true),
      reassociateWhenNoInternet: z.boolean().default(false)
    }),
    wifiReseter: z.object({}).default({}),
    wifiReseter2: z.object({
      minResetIntervalSec: z.number().default(120),
      noInternet: z.object({
        intervalSec: z.number().default(120),
        method: z.string().default('old')
      })
    }),
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
    wifiStats: z.object({
      allBss: z.boolean().default(true),
      bothIE: z.boolean().default(true),
      iface: z.boolean().default(true),
      longCpblt: z.boolean().default(false),
      periodSec: z.number().default(600),
      survey: z.boolean().default(true),
      tids: z.boolean().default(false)
    }),
    yandexMusic: z.object({
      volume: z.number().default(100)
    }),
    yandexTvGeneral: z.object({
      connectivityMaxReachabilityCheckDelayS: z.number().default(10),
      mandatoryAuth: z.boolean().default(true),
      marketUrl: z.string().default('https://dialogs.yandex.ru/app-store'),
      networkErrorEventName: z.string().default('arpc_network_error'),
      networkMetricaLoggingEnabled: z.boolean().default(true),
      networkRequestEventName: z.string().default('arpc_network_request'),
      notifyAndroidAboutNetworkState: z.boolean().default(true),
      notifyAndroidAboutNetworkStateV2: z.boolean().default(true),
      quickPingsEnabled: z.boolean().default(true),
      shouldRetryServerErrors: z.boolean().default(false),
      tvChannelsProtoHttpEnabled: z.boolean().default(true),
      useAndroidConnectivityManager: z.boolean().default(true),
      yandexConnectivityCheckUrl: z.string().default('http://scbh.yandex.net/generate_204')
    }),
    zigbee: z.object({
      externalTemperatureMeasurement: z.object({
        enabled: z.boolean().default(true),
        reportingIntervalSec: z.number().default(60)
      })
    })
  }),
  tags: z.array(z.string()).default([]),
  timezone: z.object({
    name: z.string().default(Intl.DateTimeFormat().resolvedOptions().timeZone),
    offsetSeconds: z.number().default(new Date().getTimezoneOffset() * -60)
  })
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
