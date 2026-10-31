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
    audioclient: z.object({
      gogol: z.object({
        keepAlive: z.boolean().default(true)
      }),
      playbackParams: z.object({
        common: z.object({
          gstProperties: z.object({
            spectrum: z.string().default('spectrum interval=40000000 bands=513 threshold=-80')
          })
        })
      })
    }),
    audioInput: z.object({
      audioDevice: z.object({
        addInRateRawChannels: z.boolean().default(true),
        vqeHardwareConfigV2: z.object({
          enableVqeOnDsp: z.boolean().default(true)
        })
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
      enableSmartCrossfade: z.boolean().default(true),
      pausePlayerOnStop: z.boolean().default(true)
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
        adbEnabled: z.boolean().default(false)
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
            partnerName: z.string()
          }).optional(),
          ignoreWebViewErrors: z.boolean().optional(),
          sandboxName: z.string().optional(),
          sandboxVersion: z.string().optional(),
          useJsControlsScript: z.boolean().optional(),
          userAgent: z.string().optional()
        })).default({
          __raw_opengraph_embed_url__: {
            sandboxName: 'iframe-default',
            useJsControlsScript: true
          },
          default: {
            sandboxName: 'iframe-default',
            sandboxVersion: '0x1c08506a220'
          },
          ebalka: {
            sandboxName: 'iframe-default',
            useJsControlsScript: true
          },
          izlesene: {
            sandboxName: 'izlesene'
          },
          mailru_new: {
            sandboxName: 'mailru',
            sandboxVersion: '0x1c08506a220',
            userAgent: 'Mozilla/5.0 (Linux; Android 7.0; SM-G570M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.102 Mobile Safari/537.36'
          },
          ok: {
            sandboxName: 'ok'
          },
          pornhub: {
            sandboxName: 'iframe-default',
            useJsControlsScript: true
          },
          rutube: {
            ignoreWebViewErrors: true,
            sandboxName: 'rutube',
            sandboxVersion: '0x1c08506a220'
          },
          vimeo: {
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
            sandboxName: 'yandex'
          },
          zen: {
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
      channelListVoiceControlsEnabled: z.boolean().default(false)
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
      supportedPlayers: z.record(z.string(), z.object({
        additionalVideoUrlParams: z.object({
          partnerName: z.string()
        }).optional(),
        ignoreWebViewErrors: z.boolean().optional(),
        sandboxName: z.string().optional(),
        sandboxVersion: z.string(),
        useJsControlsScript: z.boolean().optional(),
        userAgent: z.string().optional()
      })).default({
        __raw_opengraph_embed_url__: {
          sandboxName: 'iframe-default',
          sandboxVersion: '0x001cd987dbd',
          useJsControlsScript: true
        },
        default: {
          sandboxName: 'iframe-default',
          sandboxVersion: '0x001cd987dbd'
        },
        ebalka: {
          sandboxName: 'iframe-default',
          sandboxVersion: '0x001cd987dbd',
          useJsControlsScript: true
        },
        izlesene: {
          sandboxName: 'izlesene',
          sandboxVersion: '0x001cd987dbd'
        },
        mailru_new: {
          sandboxName: 'mailru',
          sandboxVersion: '0x001cd987dbd',
          userAgent: 'Mozilla/5.0 (Linux; Android 7.0; SM-G570M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.102 Mobile Safari/537.36'
        },
        ok: {
          sandboxName: 'ok',
          sandboxVersion: '0x001cd987dbd'
        },
        pornhub: {
          sandboxName: 'iframe-default',
          sandboxVersion: '0x001cd987dbd',
          useJsControlsScript: true
        },
        rutube: {
          ignoreWebViewErrors: true,
          sandboxName: 'rutube',
          sandboxVersion: '0x001cd987dbd'
        },
        vimeo: {
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
          sandboxName: 'yandex',
          sandboxVersion: '0x001cd987dbd'
        },
        zen: {
          sandboxVersion: '0x001cd987dbd',
          useJsControlsScript: true
        }
      }),
      useBrowserMediaSessionV2: z.boolean().default(true),
      voiceControlsEnabledV3: z.boolean().default(true)
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
        enableUnconditionalShowSession: z.boolean().default(true)
      }),
      isVqeEnabled: z.boolean().default(true)
    }),
    comYandexLauncherUpdaterapp: z.object({
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
        confirmFirmwareUpdate: z.object({
          ota: z.boolean().default(true)
        }),
        confirmFirmwareUpdateV2: z.object({
          ota: z.boolean().default(true),
          useService: z.boolean().default(true)
        }),
        nightIntervalEnd: z.number().default(5),
        nightIntervalStart: z.number().default(0),
        notifications: z.string().default('all'),
        notifyReboot: z.boolean().default(true),
        otaSilentInstallV2: z.object({
          enabled: z.boolean().default(true),
          strategy: z.string().default('night')
        }),
        suwUpdateStrategy: z.string().default('all'),
        updateFrequencyJitterPercent: z.number().default(0),
        updateFrequencyMin: z.number().default(50),
        updatesV4Api: z.boolean().default(true),
        updateVersionHeader: z.object({
          enabled: z.boolean().default(true),
          romProp: z.string().default('ro.build.description'),
          strategy: z.string().default('rom')
        })
      })
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
    comYandexTvServicesPlatform: z.object({
      audioServerStateListenEnabled: z.boolean().default(true)
    }),
    counterActivation: z.object({
      aliceTimeToWin: z.number().default(0),
      commandTimeToWin: z.number().default(150),
      enabled: z.boolean().default(true)
    }),
    deviceControlPanel: z.object({
      checkAliceProSubscription: z.boolean().default(true)
    }),
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
    fluentBit: z.object({
      level: z.string().default('warn'),
      samplingRatio: z.number().default(0.5),
      variables: z.object({
        daemonsLogsDst: z.string().default('none'),
        flushInterval: z.string().default('60'),
        httpRetryLimit: z.string().default('2'),
        ipcLogsDst: z.string().default('none'),
        kernelLogsDst: z.string().default('none'),
        logcatDst: z.string().default('none')
      })
    }),
    forceWifiReconfigure: z.boolean().default(false),
    geoSyncSchedulerSettings: z.object({
      enabled: z.boolean().default(true)
    }),
    glagold: z.object({
      enabled: z.boolean().default(true),
      enableEndpointProtocol: z.boolean().default(true),
      peersExchange: z.boolean().default(true),
      useFamilyDeviceList: z.boolean().default(false)
    }),
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
      hlsRandomizePlaylists: z.boolean().default(true)
    }),
    metricsDumperPeriodSec: z.number().default(600),
    multiroomd: z.object({
      latencyMs: z.number().default(-177)
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
    nsdInsteadOfAvahi: z.boolean().default(true),
    onlineSpotterEnabled: z.boolean().default(true),
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
    sendCapabilityStateUpdates: z.boolean().default(true),
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
    useActiveAccountGuestOptions: z.boolean().default(true),
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
    yandexTvGeneral: z.object({
      networkErrorEventName: z.string().default('arpc_network_error'),
      networkMetricaLoggingEnabled: z.boolean().default(true),
      networkRequestEventName: z.string().default('arpc_network_request')
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
