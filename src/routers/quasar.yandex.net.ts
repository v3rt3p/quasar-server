import { Application, Router } from 'express'
import { jwtVerify, SignJWT } from 'jose'

import { getLogger } from '../logger'
import { StationInfo, StationInfoProvider } from '../storage/types'
import { UpdatesConfig } from '../updates'

const logger = getLogger()

interface QuasarRouterProperties {
  glagolJwtKey: string
  infoProvider: StationInfoProvider
  updatesConfig: UpdatesConfig
}

export function registerQuasarYandexNetRouter (app: Application, properties: QuasarRouterProperties): void {
  const router = Router()

  router.get('/check_updates', (request, response) => {
    logger.debug(`Requested updates: ${JSON.stringify(request.query)}`)

    const platform = String(request.query['platform'])
    const version = String(request.query['version'])

    const update = properties.updatesConfig.updates[platform]

    if (!update || update.version === version) {
      response.json({
        hasUpdate: false
      })
      return
    }

    response.json({
      crc32: update.crc32,
      critical: true,
      downloadUrl: update.downloadUrl,
      fallbackIp: '127.0.0.1', // meh
      fallbackUrl: update.fallbackUrl ?? update.downloadUrl,
      hasUpdate: true,
      updateId: update.updateId,
      version: update.version
    })
  })

  router.post('/push_subscribe', (_request, response) => {
    response.status(500).end()
  })

  router.post('/register', (request, response) => {
    logger.debug(`Register on Quasar: ${JSON.stringify(request.query)}`)

    const platform = String(request.query['platform'])
    const version = String(request.query['firmware_version'])

    const update = properties.updatesConfig.updates[platform]

    response.status(200).json({
      hasCriticalUpdate: update && update.version !== version,
      status: 'ok'
    })
  })

  router.post('/update_device_state', async (request, response) => {
    try {
      const duid = String(request.query['device_id'])
      if (!duid) {
        throw new Error('No device_id present in query')
      }
      const platform = String(request.query['platform']) ?? 'unknown'

      await properties.infoProvider.updateNetworkInfo(duid, platform, request.body)

      response.status(200).json({
        status: 'ok'
      })
    } catch (error) {
      logger.error(`Error on POST /update_device_state: ${error}`)
      response.status(500).end()
    }
  })

  router.post('/glagol/check_token', async (request, response) => {
    logger.debug(`Checking glagol token: ${JSON.stringify(request.query)}`)

    try {
      try {
        await jwtVerify(request.body.toString('utf8'), Buffer.from(properties.glagolJwtKey))
      } catch {
        response.status(200).json({
          status: 'ok',
          valid: false
        })
        return
      }

      response.status(200).json({
        status: 'ok',
        valid: true
      })
    } catch (error) {
      logger.error(`Error on GET /glagol/check_token: ${error}`)
      response.status(500).end()
    }
  })

  router.post('/glagol/v2.0/check_token', async (request, response) => {
    logger.debug(`Checking glagol token (v2): ${JSON.stringify(request.query)}`)

    try {
      try {
        await jwtVerify(request.body.toString('utf8'), Buffer.from(properties.glagolJwtKey))
      } catch {
        response.status(200).json({
          guest: false,
          owner: false,
          status: 'ok'
        })
        return
      }

      response.status(200).json({
        guest: false,
        owner: true,
        status: 'ok'
      })
    } catch (error) {
      logger.error(`Error on GET /glagol/check_token: ${error}`)
      response.status(500).end()
    }
  })

  router.get('/glagol/token', async (request, response) => {
    logger.debug(`Requesting glagol token: ${JSON.stringify(request.query)}`)

    try {
      const duid = String(request.query['device_id'])
      if (!duid) {
        throw new Error('No device_id present in query')
      }
      const platform = String(request.query['platform']) ?? 'unknown'

      const jwt = await new SignJWT({
        plt: platform
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setSubject(duid)
        .setIssuer('quasar-backend')
        .setAudience('glagol')
        .setExpirationTime('1d')
        .sign(Buffer.from(properties.glagolJwtKey))

      response.status(200).json({
        status: 'ok',
        token: jwt
      })
    } catch (error) {
      logger.error(`Error on GET /glagol/token: ${error}`)
      response.status(500).end()
    }
  })

  router.get('/glagol/device_list', async (request, response) => {
    logger.debug(`Requested glagol device list: ${JSON.stringify(request.query)}`)
    try {
      const stationInfos = await properties.infoProvider.getStationInfos()

      response.json({
        devices: stationInfos.map(info => ({
          activation_code: Math.floor(Math.random() * 1_000_000_000),
          activation_region: 'RU',
          config: mapStationInfoToGlagolDeviceConfig(info),
          glagol: {
            security: {
              server_certificate: info.glagolSecurity.certificate,
              server_private_key: info.glagolSecurity.privateKey
            }
          },
          id: info.duid,
          name: info.name,
          networkInfo: info.networkInfo,
          platform: info.platform,
          promocode_activated: false,
          tags: info.quasarConfig.tags
        })),
        status: 'ok'
      })
    } catch (error) {
      logger.error(`Error on GET /glagol/device_list: ${error}`)
      response.status(500).end()
    }
  })

  router.get('/get_sync_info', async (request, response) => {
    logger.debug(`Requesting sync info: ${JSON.stringify(request.query)}`)

    try {
      const duid = String(request.query['device_id'])
      if (!duid) {
        throw new Error('No device_id present in query')
      }
      const platform = String(request.query['platform']) ?? 'unknown'

      const info = await properties.infoProvider.getInfo(duid, platform)

      response.status(200).json({
        alice_pro_subscription: {
          enabled: info.quasarConfig.aliceProSubscription.enabled,
          ttl: info.quasarConfig.aliceProSubscription.enabled ? info.quasarConfig.aliceProSubscription.ttl : undefined
        },
        config: mapStationInfoToStationSyncInfoResponseConfig(info),
        glagol: {
          security: {
            server_certificate: info.glagolSecurity.certificate,
            server_private_key: info.glagolSecurity.privateKey
          }
        },
        status: 'ok',
        subscription: {
          mode: 'transaction'
        },
        tags: info.quasarConfig.tags
      })
    } catch (error) {
      logger.error(`Error on GET /get_sync_info: ${error}`)
      response.status(500).end()
    }
  })

  app.use('/quasar.yandex.net', router)
}

function mapStationInfoToGlagolDeviceConfig (info: StationInfo): unknown {
  const config = info.quasarConfig.deviceConfig

  return {
    dndMode: {
      enabled: config.dndMode.enabled,
      features: {
        allowIncomingCalls: config.dndMode.features.allowIncomingCalls
      }
    },
    led: {
      brightness: {
        auto: config.led.brightness.auto,
        value: config.led.brightness.value
      },
      idle_animation: config.led.idleAnimation,
      music_equalizer_visualization: {
        auto: config.led.musicEqualizerVisualization.auto,
        style: config.led.musicEqualizerVisualization.style
      },
      time_visualization: {
        format: config.led.timeVisualization.format
      },
    },
    locale: config.locale,
    location: config.location
      ? {
          latitude: config.location.latitude,
          longitude: config.location.longitude
        }
      : {},
    name: info.name,
    standby: {
      deepStandbyEnabled: config.standby.deepStandbyEnabled,
      deepStandbyTimeoutMinutes: config.standby.deepStandbyTimeoutMinutes
    },
    ...(config.stereoPair
      ? {
          stereo_pair: {
            channel: config.stereoPair.channel,
            partnerDeviceId: config.stereoPair.partnerDeviceId,
            role: config.stereoPair.role
          }
        }
      : {}),
  }
}

function mapStationInfoToStationSyncInfoResponseConfig (info: StationInfo): unknown {
  const config = info.quasarConfig
  const account = config.accountConfig
  const device = config.deviceConfig
  const system = config.systemConfig

  return {
    account_config: {
      aliceAdaptiveVolume: {
        enabled: account.aliceAdaptiveVolume.enabled
      },
      aliceProactivity: account.aliceProactivity,
      alwaysOnMicForShortcuts: account.alwaysOnMicForShortcuts,
      audio_player: {
        crossfadeEnabled: account.audioPlayer.crossfadeEnabled
      },
      childContentAccess: account.childContentAccess,
      contentAccess: account.contentAccess,
      doNotUseUserLogs: account.doNotUseUserLogs,
      enableChildVad: account.enableChildVad,
      enabledCommandSpotters: {
        call: {
          answer: account.enabledCommandSpotters.call.answer
        },
        music: {
          bluetooth: account.enabledCommandSpotters.music.bluetooth,
          feedback: account.enabledCommandSpotters.music.feedback,
          navigation: account.enabledCommandSpotters.music.navigation,
          playAndPause: account.enabledCommandSpotters.music.playAndPause,
          volume: account.enabledCommandSpotters.music.volume
        },
        smartHome: {
          light: account.enabledCommandSpotters.smartHome.light,
          tv: account.enabledCommandSpotters.smartHome.tv
        },
        tv: {
          backToHome: account.enabledCommandSpotters.tv.backToHome,
          navigation: account.enabledCommandSpotters.tv.navigation
        }
      },
      intonationSpotting: account.intonationSpotting,
      jingle: account.jingle,
      saveHistoryUsage: account.saveHistoryUsage,
      smartActivation: account.smartActivation,
      spotter: account.spotter,
      useBiometryChildScoring: account.useBiometryChildScoring,
      user_wifi_config: {
        wifi_hash: account.userWifiConfig.wifiHash
      },
      useRichModelForPro: account.useRichModelForPro
    },
    device_config: {
      beta: device.beta,
      dndMode: {
        enabled: device.dndMode.enabled,
        features: {
          allowIncomingCalls: device.dndMode.features.allowIncomingCalls
        }
      },
      led: {
        brightness: {
          auto: device.led.brightness.auto,
          value: device.led.brightness.value
        },
        idle_animation: device.led.idleAnimation,
        music_equalizer_visualization: {
          auto: device.led.musicEqualizerVisualization.auto,
          style: device.led.musicEqualizerVisualization.style
        },
        time_visualization: {
          format: device.led.timeVisualization.format
        },
      },
      locale: device.locale,
      location: device.location
        ? {
            latitude: device.location.latitude,
            longitude: device.location.longitude
          }
        : {},
      name: info.name,
      standby: {
        deepStandbyEnabled: device.standby.deepStandbyEnabled,
        deepStandbyTimeoutMinutes: device.standby.deepStandbyTimeoutMinutes
      },
      ...(device.stereoPair
        ? {
            stereo_pair: {
              channel: device.stereoPair.channel,
              partnerDeviceId: device.stereoPair.partnerDeviceId,
              role: device.stereoPair.role
            }
          }
        : {}),
      tv_beta: device.tvBeta
    },
    system_config: {
      adbd: {
        network: system.adbd.network,
        remoteActivation: system.adbd.remoteActivation,
      },
      addAllEmbeddedEndpoints: system.addAllEmbeddedEndpoints,
      appmetrikaReportEnvironment: {
        quasmodrom_group: system.analyticsEnvironment.quasmodromGroup,
        quasmodrom_subgroup: system.analyticsEnvironment.quasmodromSubgroup,
        test_buckets: system.analyticsEnvironment.testBuckets,
        testids: system.analyticsEnvironment.testids
      },
      audio_player_capability: {
        enableMusicSets: system.audioPlayerCapability.enableMusicSets,
        enableSmartCrossfade: system.audioPlayerCapability.enableSmartCrossfade
      },
      audioclient: {
        gogol: {
          keepAlive: system.audioclient.gogol.keepAlive
        }
      },
      audioInput: {
        audioDevice: {
          addInRateRawChannels: system.audioInput.audioDevice.addInRateRawChannels
        },
        model_storage: {
          models: Object.fromEntries(
            Object.entries(system.audioInput.modelStorage.models).map(
              ([key1, value1]) => [key1, Object.fromEntries(
                Object.entries(value1).map(
                  ([key, value]) => [key, {
                    crc: value.crc,
                    fallbackUrls: value.fallbackUrls,
                    format: value.format,
                    type: value.type,
                    url: value.url,
                    word: value.word
                  }]
                )
              )]
            )
          )
        }
      },
      bio_capability: {
        engine_config: {
          context_scoring: {
            enabled: system.bioCapability.engineConfig.contextScoring.enabled,
            guest_threshold: system.bioCapability.engineConfig.contextScoring.guestThreshold,
            lambda: system.bioCapability.engineConfig.contextScoring.lambda,
            max_time_diff_seconds: system.bioCapability.engineConfig.contextScoring.maxTimeDiffSeconds,
            min_embedding_cosine: system.bioCapability.engineConfig.contextScoring.minEmbeddingCosine,
            use_exp_formula: system.bioCapability.engineConfig.contextScoring.useExpFormula
          }
        },
        use_ondevice_classification: system.bioCapability.useOnDeviceClassification
      },
      calld: {
        audio_processing_config: {
          pre_amplifier: {
            enabled: system.calld.audioProcessingConfig.preAmplifier.enabled,
            fixed_gain_factor: system.calld.audioProcessingConfig.preAmplifier.fixedGainFactor
          }
        },
        auto_gain_control: system.calld.autoGainControl,
        tx_agc_digital_compression_gain: system.calld.txAgcDigitalCompressionGain
      },
      'com.yandex.capabilities': {
        appLaunchCapabilityEnabled: system.comYandexCapabilities.appLaunchCapabilityEnabled,
        detailsCapability: {
          openPurchaseProcessDirectiveEnabled: system.comYandexCapabilities.detailsCapability
            .openPurchaseProcessDirectiveEnabled
        },
        detailsCapabilityEnabled: system.comYandexCapabilities.detailsCapabilityEnabled,
        serialNavigatorCapability: {
          openPurchaseDirectiveEnabled: system.comYandexCapabilities.serialNavigatorCapability
            .openPurchaseDirectiveEnabled,
          showEpisodeDirectiveEnabled: system.comYandexCapabilities.serialNavigatorCapability
            .showEpisodeDirectiveEnabled
        },
        serialNavigatorCapabilityEnabled: system.comYandexCapabilities.serialNavigatorCapabilityEnabled
      },
      'com.yandex.tv.home': {
        detailsProtoHttpEnabled: system.comYandexTvHome.detailsProtoHttpEnabled,
        serialNavigatorScreen: {
          enumerationEnabled: system.comYandexTvHome.serialNavigatorScreen.enumerationEnabled,
          newSerialNavigatorEnabledV3: system.comYandexTvHome.serialNavigatorScreen.newSerialNavigatorEnabledV3,
          voiceControlsEnabled: system.comYandexTvHome.serialNavigatorScreen.voiceControlsEnabled
        }
      },
      'com.yandex.tv.services': {
        notifications: {
          whitelist: system.comYandexTvServices.notifications.whitelist
        }
      },
      device_control_panel: {
        checkAliceProSubscription: system.deviceControlPanel.checkAliceProSubscription
      },
      enableUpdateTtsDirectives_261: system.enableUpdateTtsDirectives261,
      env: {
        quasmodrom_group: system.analyticsEnvironment.quasmodromGroup,
        quasmodrom_subgroup: system.analyticsEnvironment.quasmodromSubgroup,
        test_buckets: system.analyticsEnvironment.testBuckets,
        testids: system.analyticsEnvironment.testids
      },
      experiments: system.experiments,
      'fluent-bit': {
        samplingRatio: system.fluentBit.samplingRatio
      },
      forceWifiReconfigure: system.forceWifiReconfigure,
      geoSyncSchedulerSettings: {
        enabled: system.geoSyncSchedulerSettings.enabled
      },
      glagold: {
        useFamilyDeviceList: system.glagold.useFamilyDeviceList
      },
      hybrid_request_factory: {
        hybrid: {
          scenarios: {
            fast_command_scenario: {
              enable_local_tts_stop: system.hybridRequestFactory.hybrid.scenarios.fastCommandScenario
                .enableLocalTtsStop,
              supported_frames: system.hybridRequestFactory.hybrid.scenarios.fastCommandScenario.supportedFrames
            }
          }
        },
        hybrid_text_inputs: system.hybridRequestFactory.hybridTextInputs,
        hybrid_voice_inputs: system.hybridRequestFactory.hybridVoiceInputs,
        local_voice_inputs_when_disconnected: system.hybridRequestFactory.localVoiceInputsWhenDisconnected,
        use_protobuf_analytics_info: system.hybridRequestFactory.useProtobufAnalyticsInfo,
        use_uniproxy_eou_hint: system.hybridRequestFactory.useUniproxyEouHint,
        wait_client_approval: system.hybridRequestFactory.waitClientApproval,
        wait_spotter_validation_while_disconnected: system.hybridRequestFactory.waitSpotterValidationWhileDisconnected
      },
      intonationSpotting: {
        defaultEnabled: system.intonationSpotting.defaultEnabled,
        disableOnNoSpeechAfterSpotter: system.intonationSpotting.disableOnNoSpeechAfterSpotter,
        disableOnNoSpeechContexts: system.intonationSpotting.disableOnNoSpeechContexts,
        disableOnNoSpeechDetected: system.intonationSpotting.disableOnNoSpeechDetected,
        doNotIncludeTTS: system.intonationSpotting.doNotIncludeTTS,
        enableOnActivationTranscripts: system.intonationSpotting.enableOnActivationTranscripts,
        enableTimeMs: system.intonationSpotting.enableTimeMs,
        ledVisualization: system.intonationSpotting.ledVisualization
      },
      iot: {
        finishSystemDiscoveryAccumulateTimeout: system.iot.finishSystemDiscoveryAccumulateTimeout,
        maxFinishSystemDiscoveryAccumulateTimeout: system.iot.maxFinishSystemDiscoveryAccumulateTimeout,
        providers: system.iot.providers,
        syncApi: system.iot.syncApi,
        syncEndpoints: system.iot.syncEndpoints,
        syncEndpointsRemoveEnable: system.iot.syncEndpointsRemoveEnable,
        systemDiscovery: system.iot.systemDiscovery
      },
      maind: {
        selfDestroyer: {
          additionalMemoryLimitsKb: {
            intonationInterruptionModel: system.maind.selfDestroyer.additionalMemoryLimitsKb.intonationInterruptionModel
          }
        }
      },
      matter: {
        capability: {
          pumpkin: {
            useColorAnimationCapability: system.matter.capability.pumpkin.useColorAnimationCapability
          }
        },
        diagnosticsServiceEnabled: system.matter.diagnosticsServiceEnabled,
        enableOnOtaSystemDiscovery: system.matter.enableOnOtaSystemDiscovery,
        enableSystemDiscovery: system.matter.enableSystemDiscovery,
        node_wifi_network_diagnostics_capability: {
          enabled: system.matter.nodeWifiNetworkDiagnosticsCapability.enabled
        }
      },
      mediad: {
        hlsFragmentDistance: system.mediad.hlsFragmentDistance,
        hlsRandomizePlaylists: system.mediad.hlsRandomizePlaylists
      },
      noise_detector: {
        enabled: system.noiseDetector.enabled,
        spotterLogging: system.noiseDetector.spotterLogging,
        throttles: {
          alarm: system.noiseDetector.throttles.alarm,
          break_glass: system.noiseDetector.throttles.breakGlass,
          child_cry: system.noiseDetector.throttles.childCry,
          clap: system.noiseDetector.throttles.clap,
          dog_bark: system.noiseDetector.throttles.dogBark,
          meow: system.noiseDetector.throttles.meow,
          snap: system.noiseDetector.throttles.snap,
          water_sound: system.noiseDetector.throttles.waterSound
        }
      },
      onlineSpotterEnabled: system.onlineSpotterEnabled,
      phone_calls: {
        block_updates_on_call: system.phoneCalls.blockUpdatesOnCall,
        enabled: system.phoneCalls.enabled,
        webrtc: {
          enabled: system.phoneCalls.webrtc.enabled
        }
      },
      qrPaymentConfig: {
        cardDetails: {
          playAfterLogin: system.qrPaymentConfig.cardDetails.playAfterLogin,
          playAfterPurchase: system.qrPaymentConfig.cardDetails.playAfterPurchase,
          pollingApiEnabled: system.qrPaymentConfig.cardDetails.pollingApiEnabled,
          showQrAfterLogin: system.qrPaymentConfig.cardDetails.showQrAfterLogin
        },
        checkActiveUserIsOwnerEnabled: system.qrPaymentConfig.checkActiveUserIsOwnerEnabled,
        qrPaymentEnabled: system.qrPaymentConfig.qrPaymentEnabled,
        redesignEnabledV3: system.qrPaymentConfig.redesignEnabledV3
      },
      quasmodrom_group: system.analyticsEnvironment.quasmodromGroup,
      quasmodrom_subgroup: system.analyticsEnvironment.quasmodromSubgroup,
      sendVinsRequestProto: system.sendVinsRequestProto,
      shouldCheckWifi: system.shouldCheckWifi,
      smart_volume: {
        enabled: system.smartVolume.enabled
      },
      spectrogramAnimation: {
        presets: Object.fromEntries(
          Object.entries(system.spectrogramAnimation.presets).map(([key, preset]) => [key, {
            alwaysOnLeds: preset.alwaysOnLeds,
            angleSpeed: preset.angleSpeed,
            bandCount: preset.bandCount,
            blockMove: preset.blockMove,
            blockOnShifting: preset.blockOnShifting,
            c0: {
              h: preset.c0.h,
              s: preset.c0.s,
              v: preset.c0.v
            },
            c1: {
              h: preset.c1.h,
              s: preset.c1.s,
              v: preset.c1.v
            },
            c2: {
              h: preset.c2.h,
              s: preset.c2.s,
              v: preset.c2.v
            },
            c3: {
              h: preset.c3.h,
              s: preset.c3.s,
              v: preset.c3.v
            },
            center: preset.center,
            colors: {
              baseColor: {
                b: preset.colors.baseColor.b,
                g: preset.colors.baseColor.g,
                r: preset.colors.baseColor.r
              },
              defaultColor: {
                b: preset.colors.defaultColor.b,
                g: preset.colors.defaultColor.g,
                r: preset.colors.defaultColor.r
              },
              gradientCenterColor: {
                h: preset.colors.gradientCenterColor.h,
                s: preset.colors.gradientCenterColor.s,
                v: preset.colors.gradientCenterColor.v
              },
              gradientMiddleColor: {
                h: preset.colors.gradientMiddleColor.h,
                s: preset.colors.gradientMiddleColor.s,
                v: preset.colors.gradientMiddleColor.v
              },
              gradientSideColor: {
                h: preset.colors.gradientSideColor.h,
                s: preset.colors.gradientSideColor.s,
                v: preset.colors.gradientSideColor.v
              }
            },
            derivation: preset.derivation,
            distanceBetweenPoints: preset.distanceBetweenPoints,
            enableMiddleColor: preset.enableMiddleColor,
            filters: {
              twitchFilter: {
                decreasingDelta: preset.filters.twitchFilter.decreasingDelta,
                enabled: preset.filters.twitchFilter.enabled,
                increasingDelta: preset.filters.twitchFilter.increasingDelta,
                maxValue: preset.filters.twitchFilter.maxValue,
                minDecreasingDelta: preset.filters.twitchFilter.minDecreasingDelta,
                minDecreasingStateChange: preset.filters.twitchFilter.minDecreasingStateChange,
                minDecreasingSwitchDistance: preset.filters.twitchFilter.minDecreasingSwitchDistance,
                minIncreasingDelta: preset.filters.twitchFilter.minIncreasingDelta,
                minIncreasingStateChange: preset.filters.twitchFilter.minIncreasingStateChange,
                minIncreasingSwitchDistance: preset.filters.twitchFilter.minIncreasingSwitchDistance,
                minState: preset.filters.twitchFilter.minState,
                returnToZero: preset.filters.twitchFilter.returnToZero
              }
            },
            gradientColors: preset.gradientColors.map(color => ({
              h: color.h,
              s: color.s,
              v: color.v
            })),
            gradientDistribution: preset.gradientDistribution,
            gradientShifts: preset.gradientShifts,
            l0: preset.l0,
            l1: preset.l1,
            l2: preset.l2,
            l3: preset.l3,
            ledLength: preset.ledLength,
            lengthWhenMoving: preset.lengthWhenMoving,
            maxBand: preset.maxBand,
            maxFrequency: preset.maxFrequency,
            maxShift: preset.maxShift,
            minBrightness: preset.minBrightness,
            minFrequency: preset.minFrequency,
            minHeight: preset.minHeight,
            pointsToCheckCount: preset.pointsToCheckCount,
            shiftFromMean: preset.shiftFromMean,
            updateLedFrequency: preset.updateLedFrequency,
            useAllSides: preset.useAllSides,
            useNewProAnimation: preset.useNewProAnimation,
            usePureColors: preset.usePureColors
          }])
        ),
        voice_preset: system.spectrogramAnimation.voicePreset
      },
      spotterRecognizer: {
        maxRecognitionTime: system.spotterRecognizer.maxRecognitionTime
      },
      streamingAnimations: {
        ignore_repeated_animations_when_playing: system.streamingAnimations.ignoreRepeatedAnimationsWhenPlaying,
        repeated_animations_whitelist: system.streamingAnimations.repeatedAnimationsWhitelist
      },
      syncd: {
        pollPeriodSec: system.syncd.pollPeriodSec
      },
      teleme3d: {
        appmetrica: {
          '+events': system.teleme3d.appmetrica.plusEvents,
          persistentBatcher: {
            enabled: system.teleme3d.appmetrica.persistentBatcher.enabled,
            lookForNetworkConnection: system.teleme3d.appmetrica.persistentBatcher.lookForNetworkConnection,
            maxBatchCollectingWhenNoInternetTimeSec: system.teleme3d.appmetrica.persistentBatcher
              .maxBatchCollectingWhenNoInternetTimeSec,
            maxStorageSizeMb: system.teleme3d.appmetrica.persistentBatcher.maxStorageSizeMb,
            storagePath: system.teleme3d.appmetrica.persistentBatcher.storagePath,
            syncPeriodSec: system.teleme3d.appmetrica.persistentBatcher.syncPeriodSec
          }
        },
        persistentAppmetrica: {
          '+events': system.teleme3d.persistentAppmetrica.plusEvents
        }
      },
      telemetry: {
        rate_limiter: {
          groups: system.telemetry.rateLimiter.groups.map(g => ({
            count_limit: g.countLimit,
            events: g.events,
            interval_ms: g.intervalMs
          }))
        }
      },
      ultrasound: {
        detector: {
          meta: {
            bandWidth: system.ultrasound.detector.meta.bandWidth,
            channelAggregation: system.ultrasound.detector.meta.channelAggregation,
            cooldownPeriod: system.ultrasound.detector.meta.cooldownPeriod,
            frameWidth: system.ultrasound.detector.meta.frameWidth,
            freq: system.ultrasound.detector.meta.freq,
            groupingWindowWidth: system.ultrasound.detector.meta.groupingWindowWidth,
            hopLength: system.ultrasound.detector.meta.hopLength,
            numChannels: system.ultrasound.detector.meta.numChannels,
            numTriggers: system.ultrasound.detector.meta.numTriggers,
            pickChannelIdx: system.ultrasound.detector.meta.pickChannelIdx,
            postclassifier: {
              channelAggregation: system.ultrasound.detector.meta.postclassifier.channelAggregation,
              cooldownPeriod: system.ultrasound.detector.meta.postclassifier.cooldownPeriod,
              groupingWindowWidth: system.ultrasound.detector.meta.postclassifier.groupingWindowWidth,
              numTriggers: system.ultrasound.detector.meta.postclassifier.numTriggers,
              pickChannelIdx: system.ultrasound.detector.meta.postclassifier.pickChannelIdx,
              slidingAvgWidth: system.ultrasound.detector.meta.postclassifier.slidingAvgWidth,
              threshold: system.ultrasound.detector.meta.postclassifier.threshold
            },
            sampleRate: system.ultrasound.detector.meta.sampleRate,
            slidingAvgWidth: system.ultrasound.detector.meta.slidingAvgWidth,
            thresholdDb: system.ultrasound.detector.meta.thresholdDb
          },
          type: system.ultrasound.detector.type
        },
        enabled: system.ultrasound.enabled,
        generator: {
          amplitude: system.ultrasound.generator.amplitude,
          blockSize: system.ultrasound.generator.blockSize,
          fadeLength: system.ultrasound.generator.fadeLength,
          nChannels: system.ultrasound.generator.nChannels,
          sampleRate: system.ultrasound.generator.sampleRate,
          waveFreqHz: system.ultrasound.generator.waveFreqHz,
          zeroChannels: system.ultrasound.generator.zeroChannels
        },
        sendMetricaEvents: system.ultrasound.sendMetricaEvents
      },
      unbound: {
        checkHosts: system.unbound.checkHosts,
        enable: system.unbound.enable,
        forwarders: system.unbound.forwarders,
        serverParams: system.unbound.serverParams
      },
      useVinsRequestProto: system.useVinsRequestProto,
      voice_activity_detector: {
        events_enabled: system.voiceActivityDetector.eventsEnabled
      },
      voiceDialogSettings: {
        backoffUseNew: system.voiceDialogSettings.backoffUseNew,
        blockUpdateSettingsWhileActiveRequest: system.voiceDialogSettings.blockUpdateSettingsWhileActiveRequest,
        commandSpotterSettings: {
          spotterLoggingRareEventPercent: system.voiceDialogSettings.commandSpotterSettings
            .spotterLoggingRareEventPercent
        },
        intonationInterruptionSpotterSettings: {
          spotterLoggingRareEventPercent: system.voiceDialogSettings
            .intonationInterruptionSpotterSettings.spotterLoggingRareEventPercent,
          spotterLoggingRareEventTailMillis: system.voiceDialogSettings
            .intonationInterruptionSpotterSettings.spotterLoggingRareEventTailMillis,
          spotterLoggingVeryRareEventTailMillis: system.voiceDialogSettings
            .intonationInterruptionSpotterSettings.spotterLoggingVeryRareEventTailMillis
        },
        intonationSpotterSettings: {
          spotterLoggingRareEventPercent: system.voiceDialogSettings
            .intonationSpotterSettings.spotterLoggingRareEventPercent,
          spotterLoggingRareEventTailMillis: system.voiceDialogSettings
            .intonationSpotterSettings.spotterLoggingRareEventTailMillis,
          spotterLoggingVeryRareEventTailMillis: system.voiceDialogSettings
            .intonationSpotterSettings.spotterLoggingVeryRareEventTailMillis
        },
        protoAliceApi: {
          clientEventsWhitelist: system.voiceDialogSettings.protoAliceApi.clientEventsWhitelist,
          serverEventsWhitelist: system.voiceDialogSettings.protoAliceApi.serverEventsWhitelist
        },
        recognizer: {
          encodingApplication: system.voiceDialogSettings.recognizer.encodingApplication,
          encodingBitrate: system.voiceDialogSettings.recognizer.encodingBitrate,
          encodingComplexity: system.voiceDialogSettings.recognizer.encodingComplexity,
          packSoundBuffer: system.voiceDialogSettings.recognizer.packSoundBuffer,
          spotterSubscribePointShiftMs: system.voiceDialogSettings.recognizer.spotterSubscribePointShiftMs
        },
        spotterLoggingHeadMillis: system.voiceDialogSettings.spotterLoggingHeadMillis,
        spotterLoggingRareEventPercent: system.voiceDialogSettings.spotterLoggingRareEventPercent,
        spotterLoggingTailMillis: system.voiceDialogSettings.spotterLoggingTailMillis,
        spotterLoggingVeryRareEventPercent: system.voiceDialogSettings.spotterLoggingVeryRareEventPercent,
        spotterLoggingVeryRareStreamingLengthMillis: system.voiceDialogSettings
          .spotterLoggingVeryRareStreamingLengthMillis
      },
      wifi_capability: {
        enabled_v2: system.wifiCapability.enabledV2,
        reassociateWhenNoInternet: system.wifiCapability.reassociateWhenNoInternet
      },
      wifiReseter: system.wifiReseter,
      wifiSettings: {
        disableWlan0Monitor: system.wifiSettings.disableWlan0Monitor,
        enableInternetRecovery: system.wifiSettings.enableInternetRecovery,
        generate204: {
          failPeriodMs: system.wifiSettings.generate204.failPeriodMs,
          maxFailAttempts: system.wifiSettings.generate204.maxFailAttempts,
          periodOnLastFailAttemptMs: system.wifiSettings.generate204.periodOnLastFailAttemptMs,
          periodSec: system.wifiSettings.generate204.periodSec,
          timeoutMs: system.wifiSettings.generate204.timeoutMs
        },
        wifiReportWindowSec: system.wifiSettings.wifiReportWindowSec
      },
      zigbee: {
        externalTemperatureMeasurement: {
          enabled: system.zigbee.externalTemperatureMeasurement.enabled,
          reportingIntervalSec: system.zigbee.externalTemperatureMeasurement.reportingIntervalSec
        }
      }
    }
  }
}
