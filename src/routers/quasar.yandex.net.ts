import { Application, Router } from 'express'
import { jwtVerify, SignJWT } from 'jose'

import { getLogger } from '../logger'
import { StationInfo, StationInfoProvider } from '../storage/types'

const logger = getLogger()

interface QuasarRouterProperties {
  glagolJwtKey: string
  infoProvider: StationInfoProvider
}

export function registerQuasarYandexNetRouter (app: Application, properties: QuasarRouterProperties): void {
  const router = Router()

  router.get('/check_updates', (request, response) => {
    logger.debug(`Requested updates: ${JSON.stringify(request.query)}`)

    response.json({
      hasUpdate: false
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
    try {
      logger.debug(`Requested glagol device list: ${JSON.stringify(request.query)}`)

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
          tags: []
        })),
        status: 'ok'
      })
    } catch (error) {
      logger.error(`Error on GET /glagol/device_list: ${error}`)
      response.status(500).end()
    }
  })

  router.get('/get_sync_info', async (request, response) => {
    logger.debug(`Get sync info: ${JSON.stringify(request.query)}`)

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
        tags: []
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

  const environment = {
    quasmodrom_group: system.analyticsEnvironment.quasmodromGroup,
    quasmodrom_subgroup: system.analyticsEnvironment.quasmodromSubgroup,
    test_buckets: system.analyticsEnvironment.testBuckets,
    testids: system.analyticsEnvironment.testids
  }

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
    audio_player_capability: {
      enableMusicSets: system.audioPlayerCapability.enableMusicSets,
      enableSmartCrossfade: system.audioPlayerCapability.enableSmartCrossfade
    },
    audioclient: {
      gogol: {
        keepAlive: system.audioclient.gogol.keepAlive
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
        showEpisodeDirectiveEnabled: system.comYandexCapabilities.serialNavigatorCapability.showEpisodeDirectiveEnabled
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
    device_control_panel: {
      checkAliceProSubscription: system.deviceControlPanel.checkAliceProSubscription
    },
    env: environment,
    experiments: system.experiments,
    'fluent-bit': {
      samplingRatio: system.fluentBit.samplingRatio
    },
    forceWifiReconfigure: system.forceWifiReconfigure,
    hybrid_request_factory: {
      hybrid: {
        scenarios: {
          fast_command_scenario: {
            supported_frames: system.hybridRequestFactory.hybrid.scenarios.fastCommandScenario.supportedFrames
          }
        }
      },
      hybrid_text_inputs: system.hybridRequestFactory.hybridTextInputs,
      use_protobuf_analytics_info: system.hybridRequestFactory.useProtobufAnalyticsInfo
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
      enableOnOtaSystemDiscovery: system.matter.enableOnOtaSystemDiscovery,
      enableSystemDiscovery: system.matter.enableSystemDiscovery
    },
    mediad: {
      hlsFragmentDistance: system.mediad.hlsFragmentDistance,
      hlsRandomizePlaylists: system.mediad.hlsRandomizePlaylists
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
    system_config: {
      addAllEmbeddedEndpoints: system.addAllEmbeddedEndpoints,
      appmetrikaReportEnvironment: environment,
      audioInput: {
        model_storage: {
          models: Object.fromEntries(
            Object.entries(system.audioInput.modelStorage.models).map(
              ([key1, value1]) => [key1, Object.fromEntries(
                Object.entries(value1).map(
                  ([key, value]) => [key, {
                    crc: value.crc,
                    fallbackUrls: value.fallbackUrls,
                    format: value.format,
                    url: value.url,
                    word: value.word
                  }]
                )
              )]
            )
          )
        }
      }
    },
    teleme3d: {
      appmetrica: {
        '+events': system.teleme3d.appmetrica.plusEvents
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
        spotterLoggingRareEventPercent: system.voiceDialogSettings.commandSpotterSettings.spotterLoggingRareEventPercent
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
        packSoundBuffer: system.voiceDialogSettings.recognizer.packSoundBuffer
      },
      spotterLoggingRareEventPercent: system.voiceDialogSettings.spotterLoggingRareEventPercent
    },
    wifi_capability: {
      enabled_v2: system.wifiCapability.enabledV2
    },
    wifiSettings: {
      generate204: {
        failPeriodMs: system.wifiSettings.generate204.failPeriodMs,
        maxFailAttempts: system.wifiSettings.generate204.maxFailAttempts,
        periodOnLastFailAttemptMs: system.wifiSettings.generate204.periodOnLastFailAttemptMs,
        periodSec: system.wifiSettings.generate204.periodSec,
        timeoutMs: system.wifiSettings.generate204.timeoutMs
      }
    },
    zigbee: {
      externalTemperatureMeasurement: {
        enabled: system.zigbee.externalTemperatureMeasurement.enabled,
        reportingIntervalSec: system.zigbee.externalTemperatureMeasurement.reportingIntervalSec
      }
    }
  }
}
