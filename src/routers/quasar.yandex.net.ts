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

  router.post('/tv/api/v4/updates', (request, response) => {
    const platform = String(request.headers['x-yaquasarplatform'] ?? 'unknown')

    logger.debug(`Requested TV updates v4: ${JSON.stringify(request.headers)}`)

    const update = properties.updatesConfig.updates[platform]

    if (!update) {
      response.json({
        updates: []
      })
      return
    }

    return response.json({
      updates: [{
        extra: {},
        md5_hash: update.md5Hash,
        priority: 'FORCED',
        size: update.size,
        type: 'ota',
        update_id: update.updateId,
        url: update.downloadUrl,
        version_code: Number.parseInt(update.version),
        version_name: update.tvVersion ?? update.version
      }]
    })
  })

  router.post('/tv/api/v3/updates', (_request, response) => {
    response.json({
      bundles: [],
      updates: []
    })
  })

  router.get('/tv/api/v3/ota', (request, response) => {
    const platform = String(request.headers['x-yaquasarplatform'] ?? 'unknown')

    logger.debug(`Requested TV updates v3: ${JSON.stringify(request.headers)}`)

    const update = properties.updatesConfig.updates[platform]

    if (!update) {
      response.json({})
      return
    }

    return response.json({
      md5_hash: update.md5Hash,
      priority: 'FORCED',
      size: update.size,
      update_id: update.updateId,
      url: update.downloadUrl,
      version: Number.parseInt(update.version)
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
  const platform = info.platform

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
      alarmd: {
        disableTimerAfterFire: system.alarmd.disableTimerAfterFire,
        separatedDefaultSound: system.alarmd.separatedDefaultSound,
        timerSoundFilename: system.alarmd.timerSoundFilename
      },
      aliced: {
        aliceStreamingV2: {
          provideAliceState: system.aliced.aliceStreamingV2.provideAliceState
        }
      },
      android_app: {
        Logging: {
          level: system.androidApp.logging.level
        }
      },
      androidSettingsConfig: {
        enabled: system.androidSettingsConfig.enabled,
        globalSettingsMap: Object.fromEntries(
          Object.entries(system.androidSettingsConfig.globalSettingsMap).map(([key, value]) => [key, {
            value: value.value,
            valueType: value.valueType
          }])
        )
      },
      appmetrikaReportEnvironment: {
        quasmodrom_group: system.analyticsEnvironment.quasmodromGroup,
        quasmodrom_subgroup: system.analyticsEnvironment.quasmodromSubgroup,
        test_buckets: system.analyticsEnvironment.testBuckets,
        testids: system.analyticsEnvironment.testids
      },
      audio_player_capability: {
        enableMusicSets: system.audioPlayerCapability.enableMusicSets,
        enableSmartCrossfade: system.audioPlayerCapability.enableSmartCrossfade,
        pausePlayerOnStop: system.audioPlayerCapability.pausePlayerOnStop,
        qualityChangeReaction: system.audioPlayerCapability.qualityChangeReaction
      },
      audioclient: {
        extraPlaybackParams: {
          apiUrl: system.audioclient.extraPlaybackParams.apiUrl
        },
        gogol: {
          keepAlive: system.audioclient.gogol.keepAlive
        },
        playbackParams: {
          common: {
            gstProperties: {
              SPECTRUM: system.audioclient.playbackParams.common.gstProperties.spectrum
            }
          }
        },
        volume: {
          audio: system.audioclient.volume.audio,
          stream: system.audioclient.volume.stream,
          voice: system.audioclient.volume.voice
        }
      },
      audioInput: {
        audioDevice: {
          addInRateRawChannels: system.audioInput.audioDevice.addInRateRawChannels,
          dspMetricsEnabled: system.audioInput.audioDevice.dspMetricsEnabled,
          vqe: {
            preset: {
              omniChannelGainCoefficient: system.audioInput.audioDevice.vqe.preset.omniChannelGainCoefficient
            },
            type: system.audioInput.audioDevice.vqe.type
          },
          vqeHardwareConfigV2: {
            enableVqeOnDsp: system.audioInput.audioDevice.vqeHardwareConfigV2.enableVqeOnDsp
          },
          vqeMetricsEnabled: system.audioInput.audioDevice.vqeMetricsEnabled,
          vqeMetricsTimeoutMin: system.audioInput.audioDevice.vqeMetricsTimeoutMin,
          vqeTelemetryMetricsEnabled: system.audioInput.audioDevice.vqeTelemetryMetricsEnabled,
          vqeTelemetryMetricsEnabledV1: system.audioInput.audioDevice.vqeTelemetryMetricsEnabledV1
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
          ),
          useFallback: system.audioInput.modelStorage.useFallback
        }
      },
      bio_capability: {
        enabled: system.bioCapability.enabled,
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
        log_storage: system.bioCapability.logStorage,
        model_storage: {
          models: Object.fromEntries(
            Object.entries(system.bioCapability.modelStorage.models).map(([key, value]) => [key, Object.fromEntries(
              Object.entries(value).map(([key, value]) => [key, {
                checksum: value.checksum,
                fallbackUrls: value.fallbackUrls,
                format: value.format,
                url: value.url
              }])
            )])
          )
        },
        spotter_sound_duration_ms: system.bioCapability.spotterSoundDurationMs,
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
      capabilityStateSender: {
        capabilityIdsWhitelist: system.capabilityStateSender.capabilityIdsWhitelist
      },
      centaur: {
        '298_nps_onboarding': {
          critical: system.centaur['298NpsOnboarding'].critical,
          enabled: system.centaur['298NpsOnboarding'].enabled
        },
        accessible_voice: {
          accessibleVoiceConfig: {
            accessibleVoicePackagesFilterConfig: {
              filterMode: system.centaur.accessibleVoice.accessibleVoiceConfig
                .accessibleVoicePackagesFilterConfig.filterMode
            },
            enableReceivingOpenedAppEvents: system.centaur.accessibleVoice.accessibleVoiceConfig
              .enableReceivingOpenedAppEvents,
            useDialogsBackend: system.centaur.accessibleVoice.accessibleVoiceConfig.useDialogsBackend
          }
        },
        alice_streaming_settings: {
          markdownEnabled: system.centaur.aliceStreamingSettings.markdownEnabled,
          printingDelay: system.centaur.aliceStreamingSettings.printingDelay,
          streamingEnabled: system.centaur.aliceStreamingSettings.streamingEnabled
        },
        animate_layers: system.centaur.animateLayers,
        app_store_config: {
          enabled: system.centaur.appStoreConfig.enabled,
          enabled_apps_and_services_title: system.centaur.appStoreConfig.enabledAppsAndServicesTitle,
          redesign_enabled: system.centaur.appStoreConfig.redesignEnabled,
          yaos_store_name_enabled: system.centaur.appStoreConfig.yaosStoreNameEnabled
        },
        appsVersions: {
          debounceMs: system.centaur.appsVersions.debounceMs,
          isEnabled: system.centaur.appsVersions.isEnabled,
          maxPackagesCount: system.centaur.appsVersions.maxPackagesCount,
          usageStatsPeriodDays: system.centaur.appsVersions.usageStatsPeriodDays
        },
        audio_config: {
          vqe_metrics_enabled: system.centaur.audioConfig.vqeMetricsEnabled,
          vqe_metrics_timeout_min: system.centaur.audioConfig.vqeMetricsTimeoutMin
        },
        autoRotate_enabled: system.centaur.autoRotateEnabled,
        bluetooth_player_settings: {
          alice_toasts_on_off_events_enable: system.centaur.bluetoothPlayerSettings
            .aliceToastsOnOffEventsEnable,
          bluetooth_on_off_events_enable: system.centaur.bluetoothPlayerSettings.bluetoothOnOffEventsEnable
        },
        brightness_settings: {
          appmetrica_sending_enabled: system.centaur.brightnessSettings.appmetricaSendingEnabled,
          appmetrica_sending_interval_seconds: system.centaur.brightnessSettings
            .appmetricaSendingIntervalSeconds,
          autobrightness_manual_change: system.centaur.brightnessSettings.autobrightnessManualChange,
          ema_range: system.centaur.brightnessSettings.emaRange,
          force_night_mode_brightness: system.centaur.brightnessSettings.forceNightModeBrightness,
          logging_enabled: system.centaur.brightnessSettings.loggingEnabled,
          max_for_night_mode: system.centaur.brightnessSettings.maxForNightMode,
          min_for_off_night_mode: system.centaur.brightnessSettings.minForOffNightMode,
          night_mode_breakout_timeout_milliseconds: system.centaur.brightnessSettings
            .nightModeBreakoutTimeoutMilliseconds,
          night_mode_brightness: system.centaur.brightnessSettings.nightModeBrightness,
          night_mode_short_breakout_timeout_milliseconds: system.centaur.brightnessSettings
            .nightModeShortBreakoutTimeoutMilliseconds,
          read_threshold: system.centaur.brightnessSettings.readThreshold,
          read_window_size: system.centaur.brightnessSettings.readWindowSize
        },
        browser_lite_settings: {
          clear_data_on_account_changed: system.centaur.browserLiteSettings.clearDataOnAccountChanged,
          launch_from_start_activity_v2: system.centaur.browserLiteSettings.launchFromStartActivityV2
        },
        camera_marks_detection: {
          colors_threshold: system.centaur.cameraMarksDetection.colorsThreshold,
          enabled: system.centaur.cameraMarksDetection.enabled,
          max_colors_distance: system.centaur.cameraMarksDetection.maxColorsDistance
        },
        carousel_chrome_enabled: system.centaur.carouselChromeEnabled,
        carousel_server_updates: system.centaur.carouselServerUpdates,
        centaur_webview: {
          analytics: {
            allowed_to_report_urls: system.centaur.centaurWebview.analytics.allowedToReportUrls,
            enabled: system.centaur.centaurWebview.analytics.enabled
          },
          initial_scale_per_url: system.centaur.centaurWebview.initialScalePerUrl,
          permissions: system.centaur.centaurWebview.permissions.map(item => ({
            name: item.name,
            white_list: item.whiteList
          }))
        },
        channel_list_config: {
          tariff_options_supported_v2: system.centaur.channelListConfig.tariffOptionsSupportedV2
        },
        click_daemon_settings: {
          crash_log_config: {
            max_dropbox_text_entry_bytes: system.centaur.clickDaemonSettings.crashLogConfig
              .maxDropboxTextEntryBytes,
            white_list: system.centaur.clickDaemonSettings.crashLogConfig.whiteList
          }
        },
        common_players_settings: {
          is_bluetooth_player_enabled: system.centaur.commonPlayersSettings.isBluetoothPlayerEnabled,
          is_hls_video_play_enabled: system.centaur.commonPlayersSettings.isHlsVideoPlayEnabled,
          is_music_player_enabled_v1: system.centaur.commonPlayersSettings.isMusicPlayerEnabledV1,
          is_tv_player_enabled_v1: system.centaur.commonPlayersSettings.isTvPlayerEnabledV1,
          is_video_player_enabled: system.centaur.commonPlayersSettings.isVideoPlayerEnabled,
          is_web_player_enabled_v2: system.centaur.commonPlayersSettings.isWebPlayerEnabledV2,
          is_web_rtc_video_play_enabled: system.centaur.commonPlayersSettings.isWebRtcVideoPlayEnabled
        },
        cv: {
          auto_crop: {
            animation: {
              fps: system.centaur.cv.autoCrop.animation.fps,
              min_horizontal_offset: system.centaur.cv.autoCrop.animation.minHorizontalOffset,
              min_size_ratio: system.centaur.cv.autoCrop.animation.minSizeRatio,
              min_vertical_offset: system.centaur.cv.autoCrop.animation.minVerticalOffset,
              no_faces_timeout_ms: system.centaur.cv.autoCrop.animation.noFacesTimeoutMs,
              poll_rate_ms: system.centaur.cv.autoCrop.animation.pollRateMs,
              speed: system.centaur.cv.autoCrop.animation.speed,
              switch_off_duration_ms: system.centaur.cv.autoCrop.animation.switchOffDurationMs
            },
            detection: {
              max_face_height_ratio: system.centaur.cv.autoCrop.detection.maxFaceHeightRatio,
              min_face_count_for_max_face_height_ratio: system.centaur.cv.autoCrop.detection
                .minFaceCountForMaxFaceHeightRatio,
              min_face_score: system.centaur.cv.autoCrop.detection.minFaceScore,
              new_face_delay_ms: system.centaur.cv.autoCrop.detection.newFaceDelayMs,
              remove_face_delay_ms: system.centaur.cv.autoCrop.detection.removeFaceDelayMs,
              same_face_distance_ratio: system.centaur.cv.autoCrop.detection.sameFaceDistanceRatio,
              same_face_max_size_ratio: system.centaur.cv.autoCrop.detection.sameFaceMaxSizeRatio
            },
            margin_bottom_ratio: system.centaur.cv.autoCrop.marginBottomRatio,
            margin_left_ratio: system.centaur.cv.autoCrop.marginLeftRatio,
            margin_right_ratio: system.centaur.cv.autoCrop.marginRightRatio,
            margin_top_ratio: system.centaur.cv.autoCrop.marginTopRatio,
            max_zoom: system.centaur.cv.autoCrop.maxZoom
          },
          auto_crop_portrait: {
            animation: {
              fps: system.centaur.cv.autoCropPortrait.animation.fps,
              min_horizontal_offset: system.centaur.cv.autoCropPortrait.animation.minHorizontalOffset,
              min_size_ratio: system.centaur.cv.autoCropPortrait.animation.minSizeRatio,
              min_vertical_offset: system.centaur.cv.autoCropPortrait.animation.minVerticalOffset,
              no_faces_timeout_ms: system.centaur.cv.autoCropPortrait.animation.noFacesTimeoutMs,
              poll_rate_ms: system.centaur.cv.autoCropPortrait.animation.pollRateMs,
              speed: system.centaur.cv.autoCropPortrait.animation.speed,
              switch_off_duration_ms: system.centaur.cv.autoCropPortrait.animation.switchOffDurationMs
            },
            detection: {
              max_face_height_ratio: system.centaur.cv.autoCropPortrait.detection.maxFaceHeightRatio,
              min_face_count_for_max_face_height_ratio: system.centaur.cv.autoCropPortrait
                .detection.minFaceCountForMaxFaceHeightRatio,
              min_face_score: system.centaur.cv.autoCropPortrait.detection.minFaceScore,
              new_face_delay_ms: system.centaur.cv.autoCropPortrait.detection.newFaceDelayMs,
              remove_face_delay_ms: system.centaur.cv.autoCropPortrait.detection.removeFaceDelayMs,
              same_face_distance_ratio: system.centaur.cv.autoCropPortrait.detection.sameFaceDistanceRatio,
              same_face_max_size_ratio: system.centaur.cv.autoCropPortrait.detection.sameFaceMaxSizeRatio
            },
            margin_bottom_ratio: system.centaur.cv.autoCropPortrait.marginBottomRatio,
            margin_left_ratio: system.centaur.cv.autoCropPortrait.marginLeftRatio,
            margin_right_ratio: system.centaur.cv.autoCropPortrait.marginRightRatio,
            margin_top_ratio: system.centaur.cv.autoCropPortrait.marginTopRatio,
            max_zoom: system.centaur.cv.autoCropPortrait.maxZoom
          },
          features: system.centaur.cv.features,
          gesture_recognizer: {
            allow_chain: system.centaur.cv.gestureRecognizer.allowChain,
            cv_camera: {
              camera_block_producer: system.centaur.cv.gestureRecognizer.cvCamera.cameraBlockProducer,
              camera_height: system.centaur.cv.gestureRecognizer.cvCamera.cameraHeight,
              camera_queue_depth: system.centaur.cv.gestureRecognizer.cvCamera.cameraQueueDepth,
              camera_width: system.centaur.cv.gestureRecognizer.cvCamera.cameraWidth
            },
            disallowed_card_names: system.centaur.cv.gestureRecognizer.disallowedCardNames,
            force_enabled_card_names: system.centaur.cv.gestureRecognizer.forceEnabledCardNames,
            gesture_timeout_ms: system.centaur.cv.gestureRecognizer.gestureTimeoutMs,
            holding_max_speed: system.centaur.cv.gestureRecognizer.holdingMaxSpeed,
            max_angle: system.centaur.cv.gestureRecognizer.maxAngle,
            max_hands_count: system.centaur.cv.gestureRecognizer.maxHandsCount,
            max_x_angle: system.centaur.cv.gestureRecognizer.maxXAngle,
            max_y_angle: system.centaur.cv.gestureRecognizer.maxYAngle,
            max_z_angle: system.centaur.cv.gestureRecognizer.maxZAngle,
            min_angle: system.centaur.cv.gestureRecognizer.minAngle,
            min_hand_detection_confidence: system.centaur.cv.gestureRecognizer.minHandDetectionConfidence,
            min_hand_presence_confidence: system.centaur.cv.gestureRecognizer.minHandPresenceConfidence,
            min_holding_duration_ms: system.centaur.cv.gestureRecognizer.minHoldingDurationMs,
            min_score: system.centaur.cv.gestureRecognizer.minScore,
            min_tracking_confidence: system.centaur.cv.gestureRecognizer.minTrackingConfidence,
            min_trigger_period_ms: system.centaur.cv.gestureRecognizer.minTriggerPeriodMs,
            min_x_angle: system.centaur.cv.gestureRecognizer.minXAngle,
            min_y_angle: system.centaur.cv.gestureRecognizer.minYAngle,
            min_z_angle: system.centaur.cv.gestureRecognizer.minZAngle,
            on_palm_send_clear_queue: system.centaur.cv.gestureRecognizer.onPalmSendClearQueue,
            on_palm_send_text_command: system.centaur.cv.gestureRecognizer.onPalmSendTextCommand,
            on_palm_stop_media: system.centaur.cv.gestureRecognizer.onPalmStopMedia,
            trigger_delay_ms: system.centaur.cv.gestureRecognizer.triggerDelayMs
          },
          gestures: {
            card_names_reactions: system.centaur.cv.gestures.cardNamesReactions,
            detection_timeout_ms: system.centaur.cv.gestures.detectionTimeoutMs,
            disallowed_activity_names: system.centaur.cv.gestures.disallowedActivityNames,
            disallowed_card_names: system.centaur.cv.gestures.disallowedCardNames,
            force_enabled_card_names: system.centaur.cv.gestures.forceEnabledCardNames,
            force_only_stop_reaction: system.centaur.cv.gestures.forceOnlyStopReaction,
            ignore_device_config_setting: system.centaur.cv.gestures.ignoreDeviceConfigSetting,
            intents_gestures: Object.fromEntries(
              Object.entries(system.centaur.cv.gestures.intentsGestures).map(([key, value]) => [key, value])
            ),
            min_gestures_scores: system.centaur.cv.gestures.minGesturesScores,
            min_hand_height_ratio: system.centaur.cv.gestures.minHandHeightRatio,
            min_repeated_iou: system.centaur.cv.gestures.minRepeatedIou,
            reactions_text_commands: system.centaur.cv.gestures.reactionsTextCommands,
            resumable_pause_duration_ms: system.centaur.cv.gestures.resumablePauseDurationMs,
            resume_reaction_allowed_activities: system.centaur.cv.gestures.resumeReactionAllowedActivities,
            resume_reaction_allowed_cards: system.centaur.cv.gestures.resumeReactionAllowedCards
              .map(item => ({
                name: item.name
              })),
            send_setting_tcb: system.centaur.cv.gestures.sendSettingTcb,
            skip_first_activation: system.centaur.cv.gestures.skipFirstActivation,
            system_camera: {
              rest_time_ms: system.centaur.cv.gestures.systemCamera.restTimeMs,
              skip_frames_count: system.centaur.cv.gestures.systemCamera.skipFramesCount
            }
          },
          gestures_portrait: {
            allowed_gestures: system.centaur.cv.gesturesPortrait.allowedGestures,
            card_names_reactions: system.centaur.cv.gesturesPortrait.cardNamesReactions,
            detection_timeout_ms: system.centaur.cv.gesturesPortrait.detectionTimeoutMs,
            disallowed_activity_names: system.centaur.cv.gesturesPortrait.disallowedActivityNames,
            disallowed_card_names: system.centaur.cv.gesturesPortrait.disallowedCardNames,
            force_enabled_card_names: system.centaur.cv.gesturesPortrait.forceEnabledCardNames,
            force_only_stop_reaction: system.centaur.cv.gesturesPortrait.forceOnlyStopReaction,
            ignore_device_config_setting: system.centaur.cv.gesturesPortrait.ignoreDeviceConfigSetting,
            intents_gestures: Object.fromEntries(
              Object.entries(system.centaur.cv.gesturesPortrait.intentsGestures)
                .map(([key, value]) => [key, value])
            ),
            min_gestures_scores: system.centaur.cv.gesturesPortrait.minGesturesScores,
            min_hand_height_ratio: system.centaur.cv.gesturesPortrait.minHandHeightRatio,
            min_repeated_iou: system.centaur.cv.gesturesPortrait.minRepeatedIou,
            reactions_text_commands: system.centaur.cv.gesturesPortrait.reactionsTextCommands,
            resumable_pause_duration_ms: system.centaur.cv.gesturesPortrait.resumablePauseDurationMs,
            resume_reaction_allowed_activities: system.centaur.cv.gesturesPortrait.resumeReactionAllowedActivities,
            resume_reaction_allowed_cards: system.centaur.cv.gesturesPortrait
              .resumeReactionAllowedCards.map(item => ({
                name: item.name
              })),
            send_setting_tcb: system.centaur.cv.gesturesPortrait.sendSettingTcb,
            skip_first_activation: system.centaur.cv.gesturesPortrait.skipFirstActivation,
            system_camera: {
              rest_time_ms: system.centaur.cv.gesturesPortrait.systemCamera.restTimeMs,
              skip_frames_count: system.centaur.cv.gesturesPortrait.systemCamera.skipFramesCount
            }
          },
          service_enabled: system.centaur.cv.serviceEnabled,
          visual_spotter: {
            ignore_device_config_setting: system.centaur.cv.visualSpotter.ignoreDeviceConfigSetting,
            soft_enable_count: system.centaur.cv.visualSpotter.softEnableCount
          },
          yandex_face_processor: {
            models_config: {
              models_mapping: Object.fromEntries(
                Object.entries(system.centaur.cv.yandexFaceProcessor.modelsConfig
                  .modelsMapping).map(([key, value]) => [key, value])
              )
            }
          }
        },
        debug: {
          adb_enabled: system.centaur.debug.adbEnabled
        },
        div: {
          disable_assertions: system.centaur.div.disableAssertions,
          disable_black_background: system.centaur.div.disableBlackBackground,
          parse_on_background_thread: system.centaur.div.parseOnBackgroundThread,
          scroll_angle: system.centaur.div.scrollAngle,
          view_pool: {
            enabled: system.centaur.div.viewPool.enabled
          }
        },
        enable_music_informer_next_track_button: system.centaur.enableMusicInformerNextTrackButton,
        enable_music_informer_skeleton: system.centaur.enableMusicInformerSkeleton,
        enable_night_mode_capability: system.centaur.enableNightModeCapability,
        enable_vertical_skeleton: system.centaur.enableVerticalSkeleton,
        enable_web_player_capability: system.centaur.enableWebPlayerCapability,
        enabled_platform_capabilities_ids: system.centaur.enabledPlatformCapabilitiesIds,
        familial_settings: {
          browser_text: system.centaur.familialSettings.browserText,
          show_warnings: system.centaur.familialSettings.showWarnings,
          telegram_text: system.centaur.familialSettings.telegramText,
          youtube_text: system.centaur.familialSettings.youtubeText
        },
        fragments_controller: {
          type: system.centaur.fragmentsController.type
        },
        framedrops_stats_v3: {
          is_enabled: system.centaur.framedropsStatsV3.isEnabled,
          stats_collection_period_ms: system.centaur.framedropsStatsV3.statsCollectionPeriodMs,
          stats_window_ms: system.centaur.framedropsStatsV3.statsWindowMs
        },
        generate_204_settings: {
          failPeriodMs: system.centaur.generate204Settings.failPeriodMs,
          periodMs: system.centaur.generate204Settings.periodMs,
          timeoutMs: system.centaur.generate204Settings.timeoutMs
        },
        image_cache_settings: {
          bitmap_cache_size_mb: system.centaur.imageCacheSettings.bitmapCacheSizeMb,
          compressed_cache_size_mb: system.centaur.imageCacheSettings.compressedCacheSizeMb,
          memory_trim_evict_level: system.centaur.imageCacheSettings.memoryTrimEvictLevel,
          use_compressed_cache: system.centaur.imageCacheSettings.useCompressedCache
        },
        informers_appearance_289: system.centaur.informersAppearance289,
        informers_enabled: system.centaur.informersEnabled,
        iocom: {
          enable_cold_capabilities: system.centaur.iocom.enableColdCapabilities,
          use_active_connection_for_all_directives: system.centaur.iocom.useActiveConnectionForAllDirectives
        },
        iosdk_reporter_settings: {
          events_white_list: system.centaur.iosdkReporterSettings.eventsWhiteList
        },
        iot_devices: {
          available_iot_devices_types: system.centaur.iotDevices.availableIotDevicesTypes,
          offline_device_status_metrics_enabled: system.centaur.iotDevices.offlineDeviceStatusMetricsEnabled,
          use_new_iot_devices_interactor: system.centaur.iotDevices.useNewIotDevicesInteractor
        },
        is_io_client_features_enabled_v1: system.centaur.isIoClientFeaturesEnabledV1,
        js_inject: {
          browser_url: system.centaur.jsInject.browserUrl,
          smart_home_url: system.centaur.jsInject.smartHomeUrl,
          youtube_url: system.centaur.jsInject.youtubeUrl
        },
        'keyboard_screen_resize-settings': system.centaur.keyboardScreenResizeSettings,
        launcher_config: {
          youtube_enabled: system.centaur.launcherConfig.youtubeEnabled
        },
        lava_level: system.centaur.lavaLevel,
        leds: {
          bluetooth_music_enabled: system.centaur.leds.bluetoothMusicEnabled,
          bluetooth_play_animation_enabled: system.centaur.leds.bluetoothPlayAnimationEnabled,
          enabled: system.centaur.leds.enabled,
          health: {
            check_period_ms: system.centaur.leds.health.checkPeriodMs,
            enabled: system.centaur.leds.health.enabled,
            max_duration_playing_ms: system.centaur.leds.health.maxDurationPlayingMs,
            timeout_ms: system.centaur.leds.health.timeoutMs
          },
          new_led_in_clock: system.centaur.leds.newLedInClock
        },
        main_screen: {
          design: system.centaur.mainScreen.design,
          timeout_seconds: system.centaur.mainScreen.timeoutSeconds,
          use_timeout: system.centaur.mainScreen.useTimeout
        },
        main_screen_server_updates: system.centaur.mainScreenServerUpdates,
        media_session_service_settings: {
          enabled: system.centaur.mediaSessionServiceSettings.enabled,
          video_supported_media_session_applications: system.centaur.mediaSessionServiceSettings
            .videoSupportedMediaSessionApplications
        },
        memory_analytics: {
          enabled: system.centaur.memoryAnalytics.enabled,
          memory_report_period_ms: system.centaur.memoryAnalytics.memoryReportPeriodMs
        },
        meson: {
          nightIntervalEnd: system.centaur.meson.nightIntervalEnd,
          nightIntervalStart: system.centaur.meson.nightIntervalStart,
          quarkIntegrationVersion: system.centaur.meson.quarkIntegrationVersion,
          switchStrategy: system.centaur.meson.switchStrategy
        },
        multi_account: {
          enable_accounts_suggest_v2: system.centaur.multiAccount.enableAccountsSuggestV2,
          enabled: system.centaur.multiAccount.enabled,
          enabled_multi_account_capability: system.centaur.multiAccount.enabledMultiAccountCapability,
          need_update_settings: system.centaur.multiAccount.needUpdateSettings,
          need_update_teasers: system.centaur.multiAccount.needUpdateTeasers
        },
        multiapp: {
          enabled_alice_ui_252: system.centaur.multiapp.enabledAliceUi252,
          finish_task_on_hide: system.centaur.multiapp.finishTaskOnHide,
          keep_alive_tasks_whitelist: system.centaur.multiapp.keepAliveTasksWhitelist,
          registry: {
            iosdk_capabilities: Object.fromEntries(
              Object.entries(system.centaur.multiapp.registry.iosdkCapabilities)
                .map(([key, value]) => [key, {
                  enable_strategy: value.enableStrategy,
                  hosts: value.hosts,
                  switch_strategy: value.switchStrategy
                }])
            )
          }
        },
        music_player_config: {
          debounce_for_lyrics_toggle: system.centaur.musicPlayerConfig.debounceForLyricsToggle,
          delay_for_lyrics_view: system.centaur.musicPlayerConfig.delayForLyricsView,
          disclaimer_config: {
            enabled: system.centaur.musicPlayerConfig.disclaimerConfig.enabled,
            timeout_to_hide_disclaimer: system.centaur.musicPlayerConfig.disclaimerConfig
              .timeoutToHideDisclaimer
          },
          enable_bluetooth_player_v1: system.centaur.musicPlayerConfig.enableBluetoothPlayerV1,
          karaoke_mode_enabled_v1: system.centaur.musicPlayerConfig.karaokeModeEnabledV1,
          lyrics_mode_enabled_v1: system.centaur.musicPlayerConfig.lyricsModeEnabledV1,
          playlist_config: {
            enable_listened_to_checkmarks: system.centaur.musicPlayerConfig.playlistConfig
              .enableListenedToCheckmarks,
            enable_modal_dialog: system.centaur.musicPlayerConfig.playlistConfig.enableModalDialog,
            enabled: system.centaur.musicPlayerConfig.playlistConfig.enabled
          },
          redesign_enabled: system.centaur.musicPlayerConfig.redesignEnabled
        },
        music_player_settings: {
          default_cover_image_297_enabled: system.centaur.musicPlayerSettings.defaultCoverImage297Enabled,
          hide_timeout_in_seconds: system.centaur.musicPlayerSettings.hideTimeoutInSeconds,
          is_timeout_enabled: system.centaur.musicPlayerSettings.isTimeoutEnabled
        },
        music_search: {
          horizontal_scroll_enabled: system.centaur.musicSearch.horizontalScrollEnabled,
          indexes_load_extra: system.centaur.musicSearch.indexesLoadExtra,
          initial_load_size: system.centaur.musicSearch.initialLoadSize,
          max_item_count: system.centaur.musicSearch.maxItemCount,
          page_size: system.centaur.musicSearch.pageSize,
          prefetch_distance: system.centaur.musicSearch.prefetchDistance
        },
        native_music_vertical_v2: {
          enable_music_search: system.centaur.nativeMusicVerticalV2.enableMusicSearch,
          enable_native_music_vertical: system.centaur.nativeMusicVerticalV2.enableNativeMusicVertical,
          enable_search_history: system.centaur.nativeMusicVerticalV2.enableSearchHistory,
          is_arpc_enabled: system.centaur.nativeMusicVerticalV2.isArpcEnabled,
          play_card_as_my_wave: system.centaur.nativeMusicVerticalV2.playCardAsMyWave,
          show_playback_info_in_card: system.centaur.nativeMusicVerticalV2.showPlaybackInfoInCard
        },
        native_tv: {
          enable_native_tv_channels_list: system.centaur.nativeTv.enableNativeTvChannelsList,
          is_common_grid_enabled: system.centaur.nativeTv.isCommonGridEnabled,
          native_tv_skeleton_enabled: system.centaur.nativeTv.nativeTvSkeletonEnabled,
          tariff_options_supported: system.centaur.nativeTv.tariffOptionsSupported
        },
        native_video_player: {
          enable_native_video_player: system.centaur.nativeVideoPlayer.enableNativeVideoPlayer
        },
        new_home_screen: {
          enable_teasers_change_by_swipe: system.centaur.newHomeScreen.enableTeasersChangeBySwipe,
          enabled: system.centaur.newHomeScreen.enabled,
          lockscreen_return_delay_s: system.centaur.newHomeScreen.lockscreenReturnDelayS,
          whitelisted_package_prefixes_in_grid: system.centaur.newHomeScreen.whitelistedPackagePrefixesInGrid
        },
        new_video_skeleton: system.centaur.newVideoSkeleton,
        new_videoplayer_skin_enabled: system.centaur.newVideoplayerSkinEnabled,
        night_mode_config: {
          awake_device_on_alice_spotter: system.centaur.nightModeConfig.awakeDeviceOnAliceSpotter,
          enable_custom_fonts: system.centaur.nightModeConfig.enableCustomFonts,
          enable_red_clock_mode: system.centaur.nightModeConfig.enableRedClockMode,
          enable_show_clock_switch: system.centaur.nightModeConfig.enableShowClockSwitch,
          is_new_night_mode_enabled_v2: system.centaur.nightModeConfig.isNewNightModeEnabledV2,
          is_new_night_mode_enabled_v4: system.centaur.nightModeConfig.isNewNightModeEnabledV4
        },
        offline_mode_settings: {
          enabled: system.centaur.offlineModeSettings.enabled,
          glass_enabled: system.centaur.offlineModeSettings.glassEnabled,
          internet_not_reachable_toast_enabled: system.centaur.offlineModeSettings
            .internetNotReachableToastEnabled,
          local_teaser_enabled: system.centaur.offlineModeSettings.localTeaserEnabled
        },
        offline_mode_settings_v2: {
          local_teaser_enabled_v2: system.centaur.offlineModeSettingsV2.localTeaserEnabledV2
        },
        parentalControlConfig: {
          age_restriction_policy_enabled_v2: system.centaur.parentalControlConfig.ageRestrictionPolicyEnabledV2,
          allowed_pin_enter_attempts: system.centaur.parentalControlConfig.allowedPinEnterAttempts,
          app_whitelist_supported_v3: system.centaur.parentalControlConfig.appWhitelistSupportedV3,
          can_block_video_search: system.centaur.parentalControlConfig.canBlockVideoSearch,
          search_video_restrictions_notification_duration_ms: system.centaur.parentalControlConfig
            .searchVideoRestrictionsNotificationDurationMs,
          supported: system.centaur.parentalControlConfig.supported
        },
        realtime_metrica_config: {
          whitelist: system.centaur.realtimeMetricaConfig.whitelist
        },
        realtime_metrica_settings: {
          enable_send_crash_error: system.centaur.realtimeMetricaSettings.enableSendCrashError,
          enable_send_log_error: system.centaur.realtimeMetricaSettings.enableSendLogError
        },
        recents_informer_config_v2: {
          background_update_enabled: system.centaur.recentsInformerConfigV2.backgroundUpdateEnabled,
          enabled: system.centaur.recentsInformerConfigV2.enabled,
          internal_apps: system.centaur.recentsInformerConfigV2.internalApps,
          is_organic_content_enabled: system.centaur.recentsInformerConfigV2.isOrganicContentEnabled,
          max_items_count: system.centaur.recentsInformerConfigV2.maxItemsCount,
          update_period_jitter: system.centaur.recentsInformerConfigV2.updatePeriodJitter,
          update_period_s: system.centaur.recentsInformerConfigV2.updatePeriodS
        },
        reporting: {
          cma_alloc_failed_report_debounce_ms: system.centaur.reporting.cmaAllocFailedReportDebounceMs
        },
        screen_navigation_settings: {
          should_close_card_with_keyboard_on_go_back: system.centaur.screenNavigationSettings
            .shouldCloseCardWithKeyboardOnGoBack,
          swipes_enabled: system.centaur.screenNavigationSettings.swipesEnabled,
          swipes_timeout: system.centaur.screenNavigationSettings.swipesTimeout,
          voice_navigation_enabled: system.centaur.screenNavigationSettings.voiceNavigationEnabled
        },
        should_filter_1080p_quality: system.centaur.shouldFilter1080pQuality,
        skip_video_fragment_directive_enabled: system.centaur.skipVideoFragmentDirectiveEnabled,
        smart_home_settings: {
          enable_v2_app: system.centaur.smartHomeSettings.enableV2App,
          is_active_in_background: system.centaur.smartHomeSettings.isActiveInBackground,
          use_app: system.centaur.smartHomeSettings.useApp
        },
        speaker_calls_enabled: system.centaur.speakerCallsEnabled,
        speaker_calls_on_top: system.centaur.speakerCallsOnTop,
        status_bar_config_v2: {
          enabled: system.centaur.statusBarConfigV2.enabled,
          enabled_on_div_screens: system.centaur.statusBarConfigV2.enabledOnDivScreens
        },
        system_dialogs: {
          system_dialogs_interaction: system.centaur.systemDialogs.systemDialogsInteraction
        },
        task_stack: {
          enabled: system.centaur.taskStack.enabled,
          offset_threshold: system.centaur.taskStack.offsetThreshold,
          velocity_threshold: system.centaur.taskStack.velocityThreshold
        },
        teasers_feature_config: {
          teasers_settings_metrics_enabled: system.centaur.teasersFeatureConfig.teasersSettingsMetricsEnabled,
          teasers_settings_metrics_send_period_minutes: system.centaur.teasersFeatureConfig
            .teasersSettingsMetricsSendPeriodMinutes
        },
        teasers_settings: {
          advanced_bitmap_cache_size_mb: system.centaur.teasersSettings.advancedBitmapCacheSizeMb,
          chunk_size: system.centaur.teasersSettings.chunkSize,
          live_background_remove_strategy: system.centaur.teasersSettings.liveBackgroundRemoveStrategy,
          native_teasers_enabled: system.centaur.teasersSettings.nativeTeasersEnabled,
          preheat_teasers_count: system.centaur.teasersSettings.preheatTeasersCount,
          teasers_auto_change_period_seconds: system.centaur.teasersSettings.teasersAutoChangePeriodSeconds,
          teasers_debounce_config: {
            from_min: system.centaur.teasersSettings.teasersDebounceConfig.fromMin,
            to_min: system.centaur.teasersSettings.teasersDebounceConfig.toMin
          },
          teasers_request_period_min: system.centaur.teasersSettings.teasersRequestPeriodMin,
          teasers_request_random_period: {
            fromMin: system.centaur.teasersSettings.teasersRequestRandomPeriod.fromMin,
            toMin: system.centaur.teasersSettings.teasersRequestRandomPeriod.toMin
          },
          use_advanced_image_cache: system.centaur.teasersSettings.useAdvancedImageCache,
          video_backgrounds_config: {
            backgrounds_directory_max_size_mb: system.centaur.teasersSettings
              .videoBackgroundsConfig.backgroundsDirectoryMaxSizeMb,
            is_external_downloading_enabled: system.centaur.teasersSettings
              .videoBackgroundsConfig.isExternalDownloadingEnabled,
            update_period_hours: system.centaur.teasersSettings.videoBackgroundsConfig.updatePeriodHours,
            video_backgrounds_relevancy_time_days: system.centaur.teasersSettings
              .videoBackgroundsConfig.videoBackgroundsRelevancyTimeDays
          }
        },
        timers_settings: {
          auto_hide_card_on_day_delay_minutes: system.centaur.timersSettings.autoHideCardOnDayDelayMinutes,
          auto_hide_card_on_night_delay_minutes: system.centaur.timersSettings.autoHideCardOnNightDelayMinutes
        },
        top_sheet_settings: {
          advanced_top_sheet_enabled: system.centaur.topSheetSettings.advancedTopSheetEnabled,
          music_player_enabled: system.centaur.topSheetSettings.musicPlayerEnabled
        },
        tv_player_config: {
          allow_remote_configuration: system.centaur.tvPlayerConfig.allowRemoteConfiguration
        },
        tv_settings: {
          enabled: system.centaur.tvSettings.enabled,
          enabled_channels: system.centaur.tvSettings.enabledChannels
        },
        use_backend_inactivity_timeout: system.centaur.useBackendInactivityTimeout,
        use_backend_settings: system.centaur.useBackendSettings,
        use_local_directive_pipe: system.centaur.useLocalDirectivePipe,
        use_master_clear_intent_for_reset: system.centaur.useMasterClearIntentForReset,
        use_serverside_activity_kinds: system.centaur.useServersideActivityKinds,
        use_stacked_layer_manager: system.centaur.useStackedLayerManager,
        use_yabro_view: system.centaur.useYabroView,
        video_app_config: {
          enabled: system.centaur.videoAppConfig.enabled
        },
        video_calls: {
          buffer_time_min_for_delete_and_added_contacts: system.centaur.videoCalls
            .bufferTimeMinForDeleteAndAddedContacts,
          should_free_egl_on_destroy: system.centaur.videoCalls.shouldFreeEglOnDestroy,
          telegram_calls_enabled: system.centaur.videoCalls.telegramCallsEnabled
        },
        video_config: {
          enable_external_cinemas_v2: system.centaur.videoConfig.enableExternalCinemasV2,
          enable_horizontal_loader: system.centaur.videoConfig.enableHorizontalLoader,
          is_edit_mode_supported: system.centaur.videoConfig.isEditModeSupported,
          is_organic_content_enabled: system.centaur.videoConfig.isOrganicContentEnabled,
          is_video_purchase_enabled: system.centaur.videoConfig.isVideoPurchaseEnabled,
          native_movie_details_search_button_enabled: system.centaur.videoConfig
            .nativeMovieDetailsSearchButtonEnabled,
          native_movie_details_skeleton_enabled: system.centaur.videoConfig.nativeMovieDetailsSkeletonEnabled,
          native_seasons_and_episodes_skeleton_enabled: system.centaur.videoConfig
            .nativeSeasonsAndEpisodesSkeletonEnabled,
          native_video_main_screen_enabled: system.centaur.videoConfig.nativeVideoMainScreenEnabled,
          scroll_angle: system.centaur.videoConfig.scrollAngle,
          video_vertical_indexes_load_extra: system.centaur.videoConfig.videoVerticalIndexesLoadExtra
        },
        video_player_config: {
          allow_remote_configuration: system.centaur.videoPlayerConfig.allowRemoteConfiguration,
          ignore_videometa_error: system.centaur.videoPlayerConfig.ignoreVideometaError,
          use_arpc_for_video_metadata: system.centaur.videoPlayerConfig.useArpcForVideoMetadata
        },
        video_player_control: {
          enabled: system.centaur.videoPlayerControl.enabled
        },
        video_search_config: {
          enable_browser_button: system.centaur.videoSearchConfig.enableBrowserButton,
          enable_native_search: system.centaur.videoSearchConfig.enableNativeSearch
        },
        web_player_config: {
          doc_2_doc_enabled_v3: system.centaur.webPlayerConfig.doc2DocEnabledV3,
          supported_players: Object.fromEntries(
            Object.entries(system.centaur.webPlayerConfig.supportedPlayers).map(([key, value]) => [key, {
              additional_video_url_params: {
                partner_name: value.additionalVideoUrlParams.partnerName
              },
              ignore_web_view_errors: value.ignoreWebViewErrors,
              sandbox_name: value.sandboxName,
              sandbox_version: value.sandboxVersion,
              use_js_controls_script: value.useJsControlsScript,
              user_agent: value.userAgent
            }])
          ),
          use_browser_media_session: system.centaur.webPlayerConfig.useBrowserMediaSession,
          voice_controls_enabled_v3: system.centaur.webPlayerConfig.voiceControlsEnabledV3
        },
        web_player_settings: {
          supported_players: Object.fromEntries(
            Object.entries(system.centaur.webPlayerSettings.supportedPlayers).map(([key, value]) => [key, {
              sandbox_name: value.sandboxName,
              sandbox_version: value.sandboxVersion,
              use_custom_js_script: value.useCustomJsScript
            }])
          )
        },
        widgets_v2: {
          enable: system.centaur.widgetsV2.enable,
          smart_home: {
            enabled: system.centaur.widgetsV2.smartHome.enabled,
            open_device_enabled: system.centaur.widgetsV2.smartHome.openDeviceEnabled
          }
        },
        youtube_inject: {
          enable_voice_navigation: system.centaur.youtubeInject.enableVoiceNavigation,
          enable_youtube_client: system.centaur.youtubeInject.enableYoutubeClient,
          player_codecs: {
            allowed: system.centaur.youtubeInject.playerCodecs.allowed,
            disallowed: system.centaur.youtubeInject.playerCodecs.disallowed,
            enabled: system.centaur.youtubeInject.playerCodecs.enabled
          },
          shorts_autoplay: system.centaur.youtubeInject.shortsAutoplay,
          voice_item_selection: system.centaur.youtubeInject.voiceItemSelection
        },
        youtube_player: {
          enabled: system.centaur.youtubePlayer.enabled
        },
        youtube_urls_whitelist: system.centaur.youtubeUrlsWhitelist
      },
      'com.yandex.capabilities': {
        accessibleVoiceCapabilityEnabled: system.comYandexCapabilities.accessibleVoiceCapabilityEnabled,
        appFunctionCapabilityEnabled: system.comYandexCapabilities.appFunctionCapabilityEnabled,
        appLaunchCapabilityEnabled: system.comYandexCapabilities.appLaunchCapabilityEnabled,
        brightnessCapabilityEnabled: system.comYandexCapabilities.brightnessCapabilityEnabled,
        catalogCapability: {
          openCatalogDirectiveEnabled: system.comYandexCapabilities.catalogCapability.openCatalogDirectiveEnabled
        },
        catalogCapabilityEnabled: system.comYandexCapabilities.catalogCapabilityEnabled,
        deeplinkCapabilityEnabled: system.comYandexCapabilities.deeplinkCapabilityEnabled,
        detailsCapability: {
          openPurchaseProcessDirectiveEnabled: system.comYandexCapabilities.detailsCapability
            .openPurchaseProcessDirectiveEnabled,
          showExternalCinemasDirectiveEnabled: system.comYandexCapabilities.detailsCapability
            .showExternalCinemasDirectiveEnabled
        },
        detailsCapabilityEnabled: system.comYandexCapabilities.detailsCapabilityEnabled,
        deviceControlPanelCapabilityV1: {
          childModeUnblockDirectiveEnabled: system.comYandexCapabilities.deviceControlPanelCapabilityV1
            .childModeUnblockDirectiveEnabled,
          deviceControlPanelAppUsageUpdatePeriodMs: system.comYandexCapabilities
            .deviceControlPanelCapabilityV1.deviceControlPanelAppUsageUpdatePeriodMs,
          enabled: system.comYandexCapabilities.deviceControlPanelCapabilityV1.enabled
        },
        divUiCapabilityBackgroundDirectives: system.comYandexCapabilities.divUiCapabilityBackgroundDirectives,
        divUiCapabilityEnabledV2: system.comYandexCapabilities.divUiCapabilityEnabledV2,
        divViewCapabilityEnabled: system.comYandexCapabilities.divViewCapabilityEnabled,
        galleryControlCapabilityEnabled: system.comYandexCapabilities.galleryControlCapabilityEnabled,
        multiAccountCapability: {
          addAccountDirectiveEnabled: system.comYandexCapabilities.multiAccountCapability.addAccountDirectiveEnabled,
          addAccountDirectiveV2Enabled: system.comYandexCapabilities.multiAccountCapability
            .addAccountDirectiveV2Enabled,
          childAccountSwitchBlockEnabled: system.comYandexCapabilities.multiAccountCapability
            .childAccountSwitchBlockEnabled,
          openAccountListDirectiveEnabled: system.comYandexCapabilities.multiAccountCapability
            .openAccountListDirectiveEnabled
        },
        multiAccountCapabilityEnabled: system.comYandexCapabilities.multiAccountCapabilityEnabled,
        musicPlatformQueueCapabilityEnabled: system.comYandexCapabilities.musicPlatformQueueCapabilityEnabled,
        onOffCapability: {
          screenOffDirectiveEnabled: system.comYandexCapabilities.onOffCapability.screenOffDirectiveEnabled
        },
        onOffCapabilityEnabled: system.comYandexCapabilities.onOffCapabilityEnabled,
        screensaverCapability: {
          closeScreensaverDirectiveEnabled: system.comYandexCapabilities.screensaverCapability
            .closeScreensaverDirectiveEnabled
        },
        screenshotCapabilityEnabledV1: system.comYandexCapabilities.screenshotCapabilityEnabledV1,
        searchCapabilityEnabled: system.comYandexCapabilities.searchCapabilityEnabled,
        serialNavigatorCapability: {
          openPurchaseDirectiveEnabled: system.comYandexCapabilities.serialNavigatorCapability
            .openPurchaseDirectiveEnabled,
          showEpisodeDirectiveEnabled: system.comYandexCapabilities.serialNavigatorCapability
            .showEpisodeDirectiveEnabled
        },
        serialNavigatorCapabilityEnabled: system.comYandexCapabilities.serialNavigatorCapabilityEnabled,
        sourceInputCapabilityEnabled: system.comYandexCapabilities.sourceInputCapabilityEnabled,
        tvCategoriesCapabilityEnabled: system.comYandexCapabilities.tvCategoriesCapabilityEnabled,
        tvChannelCapabilityEnabledV3: system.comYandexCapabilities.tvChannelCapabilityEnabledV3,
        tvChannelCapabilitySizeListPrevNextChannels: system.comYandexCapabilities
          .tvChannelCapabilitySizeListPrevNextChannels,
        tvUpdateCapability: {
          hideTvUpdateDirectiveEnabled: system.comYandexCapabilities.tvUpdateCapability.hideTvUpdateDirectiveEnabled,
          installTvUpdateDirectiveEnabled: system.comYandexCapabilities.tvUpdateCapability
            .installTvUpdateDirectiveEnabled,
          retryTvUpdateDirectiveEnabled: system.comYandexCapabilities.tvUpdateCapability.retryTvUpdateDirectiveEnabled
        },
        tvUpdateCapabilityEnabled: system.comYandexCapabilities.tvUpdateCapabilityEnabled,
        videoPlayerCapabilityEnabled: system.comYandexCapabilities.videoPlayerCapabilityEnabled,
        videoPlayerControlCapability: {
          cancelSkipDirectiveEnabled: system.comYandexCapabilities.videoPlayerControlCapability
            .cancelSkipDirectiveEnabled,
          setSpeedDirectiveEnabled: system.comYandexCapabilities.videoPlayerControlCapability.setSpeedDirectiveEnabled,
          skipAdDirectiveEnabled: system.comYandexCapabilities.videoPlayerControlCapability.skipAdDirectiveEnabled,
          skipVideoFragmentDirectiveEnabled: system.comYandexCapabilities.videoPlayerControlCapability
            .skipVideoFragmentDirectiveEnabled
        },
        videoPlayerControlCapabilityEnabled: system.comYandexCapabilities.videoPlayerControlCapabilityEnabled,
        voiceEnrollmentCapabilityEnabled: system.comYandexCapabilities.voiceEnrollmentCapabilityEnabled,
        watchListCapabilityEnabled: system.comYandexCapabilities.watchListCapabilityEnabled,
        webPlayerCapabilityEnabled: system.comYandexCapabilities.webPlayerCapabilityEnabled,
        webPlayerControlCapability: {
          webPlayerControlCapabilityEnabled: system.comYandexCapabilities.webPlayerControlCapability
            .webPlayerControlCapabilityEnabled
        },
        whatsNewCapability: {
          whatsNewCapabilityEnabled: system.comYandexCapabilities.whatsNewCapability.whatsNewCapabilityEnabled
        }
      },
      'com.yandex.centaur.applications.settings': {
        apps_settings_config: {
          permissions_whitelist: system.comYandexCentaurApplicationsSettings.appsSettingsConfig
            .permissionsWhitelist
        },
        display_settings_config: {
          enabled_features: system.comYandexCentaurApplicationsSettings.displaySettingsConfig.enabledFeatures
        },
        enabled: system.comYandexCentaurApplicationsSettings.enabled,
        enabled_features: system.comYandexCentaurApplicationsSettings.enabledFeatures,
        management_config: {
          intonation_interrupting_enabled: system.comYandexCentaurApplicationsSettings
            .managementConfig.intonationInterruptingEnabled,
          intonation_spotter_enabled: system.comYandexCentaurApplicationsSettings.managementConfig
            .intonationSpotterEnabled,
          visual_spotter_enabled: system.comYandexCentaurApplicationsSettings.managementConfig
            .visualSpotterEnabled
        },
        orientation_settings_config: {
          landscape_orientation_v2: system.comYandexCentaurApplicationsSettings
            .orientationSettingsConfig.landscapeOrientationV2
        },
        support_config: {
          os_version: system.comYandexCentaurApplicationsSettings.supportConfig.osVersion,
          show_check_updates_button: system.comYandexCentaurApplicationsSettings.supportConfig
            .showCheckUpdatesButton
        },
        wifi_settings_config: {
          scan_delay_seconds: system.comYandexCentaurApplicationsSettings.wifiSettingsConfig.scanDelaySeconds
        }
      },
      'com.yandex.centaur.feature.auto.deflation': {
        use_legacy_auto_deflation: system.comYandexCentaurFeatureAutoDeflation.useLegacyAutoDeflation
      },
      'com.yandex.centaur.feature.music-ui': {
        native_music_navigation: {
          enabled: system.comYandexCentaurFeatureMusicUi.nativeMusicNavigation.enabled
        }
      },
      'com.yandex.centaur.intercom.router': {
        shouldLaunchWebcamForIntercomCalls: system.comYandexCentaurIntercomRouter.shouldLaunchWebcamForIntercomCalls
      },
      'com.yandex.devices.appstore': {
        browserPackageName: system.comYandexDevicesAppstore.browserPackageName,
        debugLoggingEnabled: system.comYandexDevicesAppstore.debugLoggingEnabled,
        privateApps: {
          enabled: system.comYandexDevicesAppstore.privateApps.enabled,
          subtitle: system.comYandexDevicesAppstore.privateApps.subtitle,
          title: system.comYandexDevicesAppstore.privateApps.title,
          url: system.comYandexDevicesAppstore.privateApps.url
        },
        sendLogError: system.comYandexDevicesAppstore.sendLogError,
        showColoredGradient: system.comYandexDevicesAppstore.showColoredGradient,
        showSearchPlaceholder: system.comYandexDevicesAppstore.showSearchPlaceholder,
        showVoiceControls: system.comYandexDevicesAppstore.showVoiceControls
      },
      'com.yandex.devices.clock': {
        alarms: {
          isActionsAvailable: system.comYandexDevicesClock.alarms.isActionsAvailable,
          isCardNumsVisible: system.comYandexDevicesClock.alarms.isCardNumsVisible,
          isOnlyViewMode: system.comYandexDevicesClock.alarms.isOnlyViewMode,
          isScheduleVoiceHintAvailable: system.comYandexDevicesClock.alarms.isScheduleVoiceHintAvailable,
          isSoundVoiceHintAvailable: system.comYandexDevicesClock.alarms.isSoundVoiceHintAvailable,
          snoozeDurationInMinutes: system.comYandexDevicesClock.alarms.snoozeDurationInMinutes,
          useUtcTime: system.comYandexDevicesClock.alarms.useUtcTime
        },
        enabled: system.comYandexDevicesClock.enabled,
        isCloseButtonVisible: system.comYandexDevicesClock.isCloseButtonVisible,
        new_playing_anim_enabled: system.comYandexDevicesClock.newPlayingAnimEnabled,
        timers: {
          isCardNumsVisible: system.comYandexDevicesClock.timers.isCardNumsVisible,
          isOnlyViewMode: system.comYandexDevicesClock.timers.isOnlyViewMode,
          showRecentTimers: system.comYandexDevicesClock.timers.showRecentTimers,
          showTimerSetter: system.comYandexDevicesClock.timers.showTimerSetter
        }
      },
      'com.yandex.devices.feature.musicplayer': {
        debounceForLyricsToggle: system.comYandexDevicesFeatureMusicplayer.debounceForLyricsToggle
      },
      'com.yandex.devices.feature.musicplayer.ui': {
        coverFlipEnabled: system.comYandexDevicesFeatureMusicplayerUi.coverFlipEnabled,
        disclaimerConfig: {
          enabled: system.comYandexDevicesFeatureMusicplayerUi.disclaimerConfig.enabled,
          timeoutToHideDisclaimer: system.comYandexDevicesFeatureMusicplayerUi.disclaimerConfig
            .timeoutToHideDisclaimer
        },
        karaokeModeEnabledV1: system.comYandexDevicesFeatureMusicplayerUi.karaokeModeEnabledV1,
        keepScreenOnWhilePlayingWithoutLyrics: system.comYandexDevicesFeatureMusicplayerUi
          .keepScreenOnWhilePlayingWithoutLyrics,
        lyricsModeEnabledV1: system.comYandexDevicesFeatureMusicplayerUi.lyricsModeEnabledV1,
        playlistConfig: {
          enabled: system.comYandexDevicesFeatureMusicplayerUi.playlistConfig.enabled
        }
      },
      'com.yandex.devices.feature.tariffoffer.ui': {
        fullscreenTariffOfferConfig: {
          purchaseButtonText: system.comYandexDevicesFeatureTariffofferUi.fullscreenTariffOfferConfig
            .purchaseButtonText
        }
      },
      'com.yandex.devices.feature.tvchannelgrid.ui': {
        channelsUpdatePeriodMinutes: system.comYandexDevicesFeatureTvchannelgridUi.channelsUpdatePeriodMinutes,
        isAddingToFavoritesEnabled: system.comYandexDevicesFeatureTvchannelgridUi.isAddingToFavoritesEnabled,
        tvGridVoiceControlsEnabled: system.comYandexDevicesFeatureTvchannelgridUi.tvGridVoiceControlsEnabled
      },
      'com.yandex.devices.feature.tvchannellist': {
        channelFavouriteCategoryAtBeginning: system.comYandexDevicesFeatureTvchannellist
          .channelFavouriteCategoryAtBeginning,
        defaultChannelsUpdatePeriodMinutes: system.comYandexDevicesFeatureTvchannellist
          .defaultChannelsUpdatePeriodMinutes,
        programsRequestAdditionalMinutes: system.comYandexDevicesFeatureTvchannellist
          .programsRequestAdditionalMinutes,
        tariffOptionsSupported: system.comYandexDevicesFeatureTvchannellist.tariffOptionsSupported,
        useContentIdRequestStrategy: system.comYandexDevicesFeatureTvchannellist.useContentIdRequestStrategy
      },
      'com.yandex.devices.feature.tvchannellist.ui': {
        channelListVoiceControlsEnabled: system.comYandexDevicesFeatureTvchannellistUi
          .channelListVoiceControlsEnabled,
        channelsUpdatePeriodMinutes: system.comYandexDevicesFeatureTvchannellistUi.channelsUpdatePeriodMinutes
      },
      'com.yandex.devices.feature.tvplayer.ui': {
        isProgramsEnabledV1: system.comYandexDevicesFeatureTvplayerUi.isProgramsEnabledV1,
        useNewKinopoiskOttChannelWithScheduler: system.comYandexDevicesFeatureTvplayerUi
          .useNewKinopoiskOttChannelWithScheduler
      },
      'com.yandex.devices.feature.videoplayer.ui': {
        ignoreVideometaError: system.comYandexDevicesFeatureVideoplayerUi.ignoreVideometaError,
        isSmartSkipEnabledV3: system.comYandexDevicesFeatureVideoplayerUi.isSmartSkipEnabledV3,
        stopAutoPlaybackTimeoutMs: system.comYandexDevicesFeatureVideoplayerUi.stopAutoPlaybackTimeoutMs
      },
      'com.yandex.devices.feature.webcam.grid.ui': {
        showIntercomDevices: system.comYandexDevicesFeatureWebcamGridUi.showIntercomDevices
      },
      'com.yandex.devices.feature.webcam.ui': {
        enableCameraRotation: system.comYandexDevicesFeatureWebcamUi.enableCameraRotation
      },
      'com.yandex.devices.feature.webplayer.ui': {
        bufferSizeInSeconds: system.comYandexDevicesFeatureWebplayerUi.bufferSizeInSeconds,
        doc2Doc: {
          doc2DocEnabledV2: system.comYandexDevicesFeatureWebplayerUi.doc2Doc.doc2DocEnabledV2,
          voiceControlsEnabledV3: system.comYandexDevicesFeatureWebplayerUi.doc2Doc.voiceControlsEnabledV3
        },
        isEpisodesButtonEnabled: system.comYandexDevicesFeatureWebplayerUi.isEpisodesButtonEnabled,
        isNextVideoButtonEnabled: system.comYandexDevicesFeatureWebplayerUi.isNextVideoButtonEnabled,
        supportedPlayers: Object.fromEntries(
          Object.entries(system.comYandexDevicesFeatureWebplayerUi.supportedPlayers).map(([key, value]) => [key, {
            additionalVideoUrlParams: {
              partner_name: value.additionalVideoUrlParams.partnerName
            },
            ignoreWebViewErrors: value.ignoreWebViewErrors,
            sandboxName: value.sandboxName,
            sandboxVersion: value.sandboxVersion,
            showNativeSubtitles: value.showNativeSubtitles,
            useJsControlsScript: value.useJsControlsScript,
            useNativeOverlayV2: value.useNativeOverlayV2,
            userAgent: value.userAgent
          }])
        ),
        useBrowserMediaSessionV2: system.comYandexDevicesFeatureWebplayerUi.useBrowserMediaSessionV2,
        voiceControlsEnabledV3: system.comYandexDevicesFeatureWebplayerUi.voiceControlsEnabledV3,
        voiceControlsTracksEnabled: system.comYandexDevicesFeatureWebplayerUi.voiceControlsTracksEnabled
      },
      'com.yandex.devices.features.settings.configurer': {
        android_settings: {
          enabled: system.comYandexDevicesFeaturesSettingsConfigurer.androidSettings.enabled,
          secure_settings: {
            keyboard_bind_only_with_edit_info: {
              value: system.comYandexDevicesFeaturesSettingsConfigurer.androidSettings
                .secureSettings.keyboardBindOnlyWithEditInfo.value,
              value_type: system.comYandexDevicesFeaturesSettingsConfigurer.androidSettings
                .secureSettings.keyboardBindOnlyWithEditInfo.valueType
            }
          }
        }
      },
      'com.yandex.devices.overwatcher': {
        enabled: system.comYandexDevicesOverwatcher.enabled,
        watchPeriodSeconds: system.comYandexDevicesOverwatcher.watchPeriodSeconds
      },
      'com.yandex.devices.player': {
        ageRestrictionPolicyEnabledV2: system.comYandexDevicesPlayer.ageRestrictionPolicyEnabledV2,
        isCommonChannelListEnabled: system.comYandexDevicesPlayer.isCommonChannelListEnabled,
        usePaymentAppToBuyChannels: system.comYandexDevicesPlayer.usePaymentAppToBuyChannels,
        useTariffOfferRedesignWithoutQr: system.comYandexDevicesPlayer.useTariffOfferRedesignWithoutQr
      },
      'com.yandex.devices.smarthome': {
        enableEdgeToEdge: system.comYandexDevicesSmarthome.enableEdgeToEdge
      },
      'com.yandex.devices.whatsnew': {
        supportedWhatsNewStorageFeatures: system.comYandexDevicesWhatsnew.supportedWhatsNewStorageFeatures
      },
      'com.yandex.io.sdk': {
        aliceSession: {
          enableForceHandleAssist: system.comYandexIoSdk.aliceSession.enableForceHandleAssist,
          enableUnconditionalShowSession: system.comYandexIoSdk.aliceSession.enableUnconditionalShowSession
        },
        appfunction: {
          enabledV1: system.comYandexIoSdk.appfunction.enabledV1
        },
        canHandleTvGridDirectives: system.comYandexIoSdk.canHandleTvGridDirectives,
        canHandleTvGridDirectivesV2: system.comYandexIoSdk.canHandleTvGridDirectivesV2,
        canHandleTvGridDirectivesV3: system.comYandexIoSdk.canHandleTvGridDirectivesV3,
        canHandleTvGridDirectivesV4: system.comYandexIoSdk.canHandleTvGridDirectivesV4,
        framedrops: {
          isEnabled: system.comYandexIoSdk.framedrops.isEnabled
        },
        framedropsV2: {
          isEnabled: system.comYandexIoSdk.framedropsV2.isEnabled
        },
        integration: {
          quarkIntegrationVersion: system.comYandexIoSdk.integration.quarkIntegrationVersion,
          shouldListenRemoteEndpoints: system.comYandexIoSdk.integration.shouldListenRemoteEndpoints,
          switchStrategy: system.comYandexIoSdk.integration.switchStrategy
        },
        ioCom: {
          capabilities: {
            isConfigCapabilityEnabled: system.comYandexIoSdk.ioCom.capabilities.isConfigCapabilityEnabled,
            isIotDevicesCapabilitiesEnabledV3: system.comYandexIoSdk.ioCom.capabilities
              .isIotDevicesCapabilitiesEnabledV3,
            isMusicCapabilitiesEnabledV4: system.comYandexIoSdk.ioCom.capabilities.isMusicCapabilitiesEnabledV4,
            isScreenshotNotificationCapabilityEnabled: system.comYandexIoSdk.ioCom.capabilities
              .isScreenshotNotificationCapabilityEnabled,
            useIoComForAlarm: system.comYandexIoSdk.ioCom.capabilities.useIoComForAlarm,
            useIoComForScreensaversV3: system.comYandexIoSdk.ioCom.capabilities.useIoComForScreensaversV3
          },
          ioComHostEnabledV4: system.comYandexIoSdk.ioCom.ioComHostEnabledV4,
          ioComRegistryEnabled: system.comYandexIoSdk.ioCom.ioComRegistryEnabled,
          ioComServerEnabled: system.comYandexIoSdk.ioCom.ioComServerEnabled,
          isColdMetaEnabledV3: system.comYandexIoSdk.ioCom.isColdMetaEnabledV3,
          isIoComForMusicEnabled: system.comYandexIoSdk.ioCom.isIoComForMusicEnabled,
          isIoComForVoiceControlSettingsEnabled: system.comYandexIoSdk.ioCom.isIoComForVoiceControlSettingsEnabled
        },
        isIoClientFeaturesEnabledV1: system.comYandexIoSdk.isIoClientFeaturesEnabledV1,
        isVqeEnabled: system.comYandexIoSdk.isVqeEnabled,
        leds: {
          runLedOnSpotter: system.comYandexIoSdk.leds.runLedOnSpotter,
          spotterCancellationTimeoutMs: system.comYandexIoSdk.leds.spotterCancellationTimeoutMs
        },
        mediaSession: {
          isEnabledV3: system.comYandexIoSdk.mediaSession.isEnabledV3,
          lastWatchedEnabled: system.comYandexIoSdk.mediaSession.lastWatchedEnabled,
          supportedBackgroundMusicApplications: system.comYandexIoSdk.mediaSession.supportedBackgroundMusicApplications,
          supportedMediaSessionApplications: system.comYandexIoSdk.mediaSession.supportedMediaSessionApplications,
          useDialogsBackendForMediaSession: system.comYandexIoSdk.mediaSession.useDialogsBackendForMediaSession
        },
        navigateHomeOnSleepTimeoutMsV4: system.comYandexIoSdk.navigateHomeOnSleepTimeoutMsV4,
        oknyx: {
          enableAdjustableOknyxLocationV1: system.comYandexIoSdk.oknyx.enableAdjustableOknyxLocationV1
        },
        recognitionService: {
          recognitionTimeoutMs: system.comYandexIoSdk.recognitionService.recognitionTimeoutMs
        },
        restartAudioRecordTriesLimit: system.comYandexIoSdk.restartAudioRecordTriesLimit,
        tandemSettingsEnabled: system.comYandexIoSdk.tandemSettingsEnabled,
        videoPlayRouter: {
          shouldRouteWebRtcToGoloomV4: system.comYandexIoSdk.videoPlayRouter.shouldRouteWebRtcToGoloomV4
        }
      },
      'com.yandex.launcher.updaterapp': {
        media: {
          image: system.comYandexLauncherUpdaterapp.media.image,
          video: Object.fromEntries(
            Object.entries(system.comYandexLauncherUpdaterapp.media.video).map(([key, value]) => [key, Object
              .fromEntries(
                Object.entries(value).map(([key, value]) => [key, {
                  file_size: value.fileSize,
                  max_download_time: value.maxDownloadTime,
                  url: value.url
                }])
              )])
          )
        },
        settings: {
          abSilentInstallV2: {
            enabled: system.comYandexLauncherUpdaterapp.settings.abSilentInstallV2.enabled,
            strategy: system.comYandexLauncherUpdaterapp.settings.abSilentInstallV2.strategy
          },
          allowFirmwareUpdate: {
            ota: system.comYandexLauncherUpdaterapp.settings.allowFirmwareUpdate.ota
          },
          allowFirmwareUpdateV2: {
            ota: system.comYandexLauncherUpdaterapp.settings.allowFirmwareUpdateV2.ota
          },
          apkSilentInstallV2: {
            enabled: system.comYandexLauncherUpdaterapp.settings.apkSilentInstallV2.enabled,
            strategy: system.comYandexLauncherUpdaterapp.settings.apkSilentInstallV2.strategy
          },
          appsToDeleteEnabled: system.comYandexLauncherUpdaterapp.settings.appsToDeleteEnabled,
          autoCheckEnabled: system.comYandexLauncherUpdaterapp.settings.autoCheckEnabled,
          clearCachePartitionOnOtaUpdate: system.comYandexLauncherUpdaterapp.settings.clearCachePartitionOnOtaUpdate,
          commitFirmwarePreferencesEnabled: system.comYandexLauncherUpdaterapp.settings
            .commitFirmwarePreferencesEnabled,
          confirmFirmwareUpdate: {
            ota: system.comYandexLauncherUpdaterapp.settings.confirmFirmwareUpdate.ota
          },
          confirmFirmwareUpdateV2: {
            ota: system.comYandexLauncherUpdaterapp.settings.confirmFirmwareUpdateV2.ota,
            retryPeriodSeconds: system.comYandexLauncherUpdaterapp.settings.confirmFirmwareUpdateV2.retryPeriodSeconds,
            triggerFromBoot: system.comYandexLauncherUpdaterapp.settings.confirmFirmwareUpdateV2.triggerFromBoot,
            useService: system.comYandexLauncherUpdaterapp.settings.confirmFirmwareUpdateV2.useService
          },
          createOtaSessionIdWithRetriesEnabled: system.comYandexLauncherUpdaterapp.settings
            .createOtaSessionIdWithRetriesEnabled,
          fakeStandbySilentOtaPropertyActionV2: system.comYandexLauncherUpdaterapp.settings
            .fakeStandbySilentOtaPropertyActionV2,
          forceUiAfterDownload: system.comYandexLauncherUpdaterapp.settings.forceUiAfterDownload,
          nightIntervalEnd: system.comYandexLauncherUpdaterapp.settings.nightIntervalEnd,
          nightIntervalStart: system.comYandexLauncherUpdaterapp.settings.nightIntervalStart,
          notifications: system.comYandexLauncherUpdaterapp.settings.notifications,
          notifyReboot: system.comYandexLauncherUpdaterapp.settings.notifyReboot,
          otaSilentInstallV2: {
            enabled: system.comYandexLauncherUpdaterapp.settings.otaSilentInstallV2.enabled,
            strategy: system.comYandexLauncherUpdaterapp.settings.otaSilentInstallV2.strategy
          },
          resumeDownloadAfterHide: system.comYandexLauncherUpdaterapp.settings.resumeDownloadAfterHide,
          scheduleForcedSilentIfAllowedEnabled: system.comYandexLauncherUpdaterapp.settings
            .scheduleForcedSilentIfAllowedEnabled,
          suwUpdateStrategy: system.comYandexLauncherUpdaterapp.settings.suwUpdateStrategy,
          sysRecoverySilentInstallV2: {
            enabled: system.comYandexLauncherUpdaterapp.settings.sysRecoverySilentInstallV2.enabled,
            strategy: system.comYandexLauncherUpdaterapp.settings.sysRecoverySilentInstallV2.strategy
          },
          sysRecoveryUpdatesEnabled: system.comYandexLauncherUpdaterapp.settings.sysRecoveryUpdatesEnabled,
          updateFrequencyJitterPercent: system.comYandexLauncherUpdaterapp.settings
            .updateFrequencyJitterPercent,
          updateFrequencyMin: system.comYandexLauncherUpdaterapp.settings.updateFrequencyMin,
          updateHomeInterruptFsbOffThrottleHours: system.comYandexLauncherUpdaterapp.settings
            .updateHomeInterruptFsbOffThrottleHours,
          updateInterruptStrategy: system.comYandexLauncherUpdaterapp.settings.updateInterruptStrategy,
          updatesV4Api: system.comYandexLauncherUpdaterapp.settings.updatesV4Api,
          updateVersionHeader: {
            enabled: system.comYandexLauncherUpdaterapp.settings.updateVersionHeader.enabled,
            rom_prop: system.comYandexLauncherUpdaterapp.settings.updateVersionHeader.romProp,
            strategy: system.comYandexLauncherUpdaterapp.settings.updateVersionHeader.strategy
          },
          voiceButtonsEnabled: system.comYandexLauncherUpdaterapp.settings.voiceButtonsEnabled
        }
      },
      'com.yandex.tv.accessiblevoice': {
        accessibleVoiceAppConfigMap: Object.fromEntries(
          Object.entries(system.comYandexTvAccessiblevoice.accessibleVoiceAppConfigMap).map(([key, value]) => [key, {
            accessibilityServiceConfig: {
              enableKeyEventsHandling: value.accessibilityServiceConfig.enableKeyEventsHandling
            },
            drawItemSelectionOverlayDelayMs: value.drawItemSelectionOverlayDelayMs,
            interactiveNodesFilterStrategy: {
              minimumViewHeightPxToBeInteractive: value.interactiveNodesFilterStrategy
                .minimumViewHeightPxToBeInteractive,
              minimumViewWidthPxToBeInteractive: value.interactiveNodesFilterStrategy.minimumViewWidthPxToBeInteractive
            },
            itemSelectionLabelsEnumerationMode: value.itemSelectionLabelsEnumerationMode,
            itemSelectionLabelsEnumerationStrategies: value.itemSelectionLabelsEnumerationStrategies.map(item => ({
              fieldKey: item.fieldKey,
              fieldValues: item.fieldValues,
              includeChildren: item.includeChildren
            })),
            minVersionCode: value.minVersionCode,
            showItemSelectionOverlay: value.showItemSelectionOverlay
          }])
        ),
        alwaysSendCurrentPackage: system.comYandexTvAccessiblevoice.alwaysSendCurrentPackage,
        dialogsBackendFilterConfig: {
          disabledPackageNames: system.comYandexTvAccessiblevoice.dialogsBackendFilterConfig.disabledPackageNames,
          enabledPackageNames: system.comYandexTvAccessiblevoice.dialogsBackendFilterConfig.enabledPackageNames
        },
        enableReceivingOpenedAppEvents: system.comYandexTvAccessiblevoice.enableReceivingOpenedAppEvents,
        hideLabelsAfterRemoteControlActivity: system.comYandexTvAccessiblevoice.hideLabelsAfterRemoteControlActivity,
        itemSelectionOverlayType: system.comYandexTvAccessiblevoice.itemSelectionOverlayType,
        packagesFilterConfig: {
          filterMode: system.comYandexTvAccessiblevoice.packagesFilterConfig.filterMode,
          packageNames: system.comYandexTvAccessiblevoice.packagesFilterConfig.packageNames
        },
        rootNodeUpdateDebounceMs: system.comYandexTvAccessiblevoice.rootNodeUpdateDebounceMs,
        showDebugOverlay: system.comYandexTvAccessiblevoice.showDebugOverlay,
        showLabelsAfterRemoteControlInactivityMs: system.comYandexTvAccessiblevoice
          .showLabelsAfterRemoteControlInactivityMs,
        useDialogsBackend: system.comYandexTvAccessiblevoice.useDialogsBackend,
        useDialogsBackendV1: system.comYandexTvAccessiblevoice.useDialogsBackendV1
      },
      'com.yandex.tv.alice': {
        alicekitOknyxConfig: {
          animationVersion: system.comYandexTvAlice.alicekitOknyxConfig.animationVersion,
          enabled: system.comYandexTvAlice.alicekitOknyxConfig.enabled
        },
        alicePremiumAnswer: system.comYandexTvAlice.alicePremiumAnswer,
        aliceStreamingV2: {
          enabled: system.comYandexTvAlice.aliceStreamingV2.enabled,
          expandAnimationDurationMs: system.comYandexTvAlice.aliceStreamingV2.expandAnimationDurationMs,
          inactivityTimeout: system.comYandexTvAlice.aliceStreamingV2.inactivityTimeout,
          interpolator: system.comYandexTvAlice.aliceStreamingV2.interpolator,
          localSuggestWhiteList: system.comYandexTvAlice.aliceStreamingV2.localSuggestWhiteList,
          regex: system.comYandexTvAlice.aliceStreamingV2.regex,
          remoteSuggestWhiteList: system.comYandexTvAlice.aliceStreamingV2.remoteSuggestWhiteList,
          runningAnimationDurationMs: system.comYandexTvAlice.aliceStreamingV2.runningAnimationDurationMs,
          waitingUiDelayMs: system.comYandexTvAlice.aliceStreamingV2.waitingUiDelayMs
        },
        assistApiSettingEnabled: system.comYandexTvAlice.assistApiSettingEnabled,
        div: {
          warmUpDivOnStart: system.comYandexTvAlice.div.warmUpDivOnStart
        },
        divTextAnswerEnabled: system.comYandexTvAlice.divTextAnswerEnabled,
        enableScreenshotNotification: system.comYandexTvAlice.enableScreenshotNotification,
        ioCom: {
          isIoComHostProxyServicesEnabled: system.comYandexTvAlice.ioCom.isIoComHostProxyServicesEnabled,
          isIoComServerEnabled: system.comYandexTvAlice.ioCom.isIoComServerEnabled
        },
        itemSelectionOverlayEnabled: system.comYandexTvAlice.itemSelectionOverlayEnabled,
        keepUiContextBetweenSessions: system.comYandexTvAlice.keepUiContextBetweenSessions
      },
      'com.yandex.tv.common.device.features': {
        usePlatformNtpOnlyV2: system.comYandexTvCommonDeviceFeatures.usePlatformNtpOnlyV2
      },
      'com.yandex.tv.daydream': {
        ioCom: {
          capabilities: {
            useIoComForAlarm: system.comYandexTvDaydream.ioCom.capabilities.useIoComForAlarm
          },
          ioComHostEnabled: system.comYandexTvDaydream.ioCom.ioComHostEnabled,
          ioComServerEnabled: system.comYandexTvDaydream.ioCom.ioComServerEnabled,
          isIoComHostProxyEnabledV1: system.comYandexTvDaydream.ioCom.isIoComHostProxyEnabledV1
        },
        music: {
          enableMusicWidgetV3: system.comYandexTvDaydream.music.enableMusicWidgetV3,
          handleRcuMediaButtons: system.comYandexTvDaydream.music.handleRcuMediaButtons
        },
        screenSaverConfig: {
          aliceOverlayConfig: {
            directiveWhitelist: system.comYandexTvDaydream.screenSaverConfig.aliceOverlayConfig.directiveWhitelist,
            enabled: system.comYandexTvDaydream.screenSaverConfig.aliceOverlayConfig.enabled
          },
          animatedClockEnabledV4: system.comYandexTvDaydream.screenSaverConfig.animatedClockEnabledV4,
          isNewHighlightEnabledV1: system.comYandexTvDaydream.screenSaverConfig.isNewHighlightEnabledV1,
          screenSaverDownloadLimitBytes: system.comYandexTvDaydream.screenSaverConfig.screenSaverDownloadLimitBytes,
          screenSaverLoadingSnackbarEnabled: system.comYandexTvDaydream.screenSaverConfig
            .screenSaverLoadingSnackbarEnabled,
          screensaverNewArchitectureEnabledV1: system.comYandexTvDaydream.screenSaverConfig
            .screensaverNewArchitectureEnabledV1,
          screenSaverSettingsEnabled: system.comYandexTvDaydream.screenSaverConfig.screenSaverSettingsEnabled,
          screenSaverSettingsTipTimeoutSeconds: system.comYandexTvDaydream.screenSaverConfig
            .screenSaverSettingsTipTimeoutSeconds,
          showDurationSupportEnabled: system.comYandexTvDaydream.screenSaverConfig.showDurationSupportEnabled,
          themedScreenSaverClearDynamicWidgetsTypedCallbackEnabled: system.comYandexTvDaydream
            .screenSaverConfig.themedScreenSaverClearDynamicWidgetsTypedCallbackEnabled,
          themedScreenSaverConfigTtlMs: system.comYandexTvDaydream.screenSaverConfig.themedScreenSaverConfigTtlMs,
          themedScreenSaverEnabled: system.comYandexTvDaydream.screenSaverConfig.themedScreenSaverEnabled,
          themedScreenSaverVoiceControlsEnabled: system.comYandexTvDaydream.screenSaverConfig
            .themedScreenSaverVoiceControlsEnabled,
          useDirectiveDatasourceV1: system.comYandexTvDaydream.screenSaverConfig.useDirectiveDatasourceV1
        }
      },
      'com.yandex.tv.feature.app_grid': {
        showBadgeNumber: system.comYandexTvFeatureAppGrid.showBadgeNumber,
        storeBannerConfig: {
          tvStoreApplicationName: system.comYandexTvFeatureAppGrid.storeBannerConfig.tvStoreApplicationName
        }
      },
      'com.yandex.tv.feature.payment': {
        plusSdkEnabled: system.comYandexTvFeaturePayment.plusSdkEnabled
      },
      'com.yandex.tv.feature.preinstalled.apps': {
        isEnabled: system.comYandexTvFeaturePreinstalledApps.isEnabled
      },
      'com.yandex.tv.feature.qrpayment': {
        fullscreenTariffOfferConfig: {
          loginButtonText: system.comYandexTvFeatureQrpayment.fullscreenTariffOfferConfig.loginButtonText,
          loginOfferText: system.comYandexTvFeatureQrpayment.fullscreenTariffOfferConfig.loginOfferText,
          purchaseButtonHint: system.comYandexTvFeatureQrpayment.fullscreenTariffOfferConfig.purchaseButtonHint,
          purchaseButtonText: system.comYandexTvFeatureQrpayment.fullscreenTariffOfferConfig.purchaseButtonText,
          qrCodeHeaderText: system.comYandexTvFeatureQrpayment.fullscreenTariffOfferConfig.qrCodeHeaderText
        }
      },
      'com.yandex.tv.feature.screensaver.settings': {
        screensaverIotWidgetsEnabledV3: system.comYandexTvFeatureScreensaverSettings.screensaverIotWidgetsEnabledV3
      },
      'com.yandex.tv.feature.search': {
        searchScreenV2EnabledV1: system.comYandexTvFeatureSearch.searchScreenV2EnabledV1,
        searchScreenV2EnabledV3: system.comYandexTvFeatureSearch.searchScreenV2EnabledV3,
        searchTabsEnabled: system.comYandexTvFeatureSearch.searchTabsEnabled
      },
      'com.yandex.tv.feature.storage.cleanup': {
        excludedTopUsedAppsCount: system.comYandexTvFeatureStorageCleanup.excludedTopUsedAppsCount,
        maxAppsToRemove: system.comYandexTvFeatureStorageCleanup.maxAppsToRemove,
        minRecommendedFreeSpaceMb: system.comYandexTvFeatureStorageCleanup.minRecommendedFreeSpaceMb,
        usageStatsPeriodDays: system.comYandexTvFeatureStorageCleanup.usageStatsPeriodDays,
        voiceControlEnabled: system.comYandexTvFeatureStorageCleanup.voiceControlEnabled,
        whitelistPackages: system.comYandexTvFeatureStorageCleanup.whitelistPackages
      },
      'com.yandex.tv.feature.tvchannelgrid': {
        channelsUpdatePeriodMinutes: system.comYandexTvFeatureTvchannelgrid.channelsUpdatePeriodMinutes
      },
      'com.yandex.tv.feature.tvchannellist': {
        channelFavouriteCategoryAtBeginningV1: system.comYandexTvFeatureTvchannellist
          .channelFavouriteCategoryAtBeginningV1,
        channelListVoiceControlsEnabled: system.comYandexTvFeatureTvchannellist.channelListVoiceControlsEnabled,
        channelListVoiceControlsEnabledV2: system.comYandexTvFeatureTvchannellist.channelListVoiceControlsEnabledV2,
        channelListVoiceControlsEnabledV3: system.comYandexTvFeatureTvchannellist.channelListVoiceControlsEnabledV3,
        channelListVoiceControlsEnabledV4: system.comYandexTvFeatureTvchannellist.channelListVoiceControlsEnabledV4,
        channelListVoiceControlsUpdatePeriodSeconds: system.comYandexTvFeatureTvchannellist
          .channelListVoiceControlsUpdatePeriodSeconds,
        channelsUpdatePeriodMinutes: system.comYandexTvFeatureTvchannellist.channelsUpdatePeriodMinutes,
        defaultChannelsUpdatePeriodMinutes: system.comYandexTvFeatureTvchannellist.defaultChannelsUpdatePeriodMinutes,
        multicatSupported: system.comYandexTvFeatureTvchannellist.multicatSupported,
        persistentVoiceControlsEnabled: system.comYandexTvFeatureTvchannellist.persistentVoiceControlsEnabled,
        tariffOptionsSupported: system.comYandexTvFeatureTvchannellist.tariffOptionsSupported,
        tvGridEnabledV2: system.comYandexTvFeatureTvchannellist.tvGridEnabledV2
      },
      'com.yandex.tv.feature.tvplayer': {
        allowRemoteConfigurationV1: system.comYandexTvFeatureTvplayer.allowRemoteConfigurationV1,
        ioCom: {
          capabilities: {
            useIoComForAlarm: system.comYandexTvFeatureTvplayer.ioCom.capabilities.useIoComForAlarm
          },
          isIoComHostProxyEnabledV1: system.comYandexTvFeatureTvplayer.ioCom.isIoComHostProxyEnabledV1
        },
        maxAutoQualityMultiplex: system.comYandexTvFeatureTvplayer.maxAutoQualityMultiplex,
        mbuSettings: {
          mbuDoNotOverrideRh: system.comYandexTvFeatureTvplayer.mbuSettings.mbuDoNotOverrideRh,
          mbuEnableForDynamic: system.comYandexTvFeatureTvplayer.mbuSettings.mbuEnableForDynamic,
          mbuEnableMoveToUnbanned: system.comYandexTvFeatureTvplayer.mbuSettings.mbuEnableMoveToUnbanned,
          mbuEnableUpdate: system.comYandexTvFeatureTvplayer.mbuSettings.mbuEnableUpdate,
          mbuFallbackByAnyExc: system.comYandexTvFeatureTvplayer.mbuSettings.mbuFallbackByAnyExc
        },
        preloadVideoDataSettings: {
          isPreloadCacheStaticV1: system.comYandexTvFeatureTvplayer.preloadVideoDataSettings.isPreloadCacheStaticV1,
          preloadVideoDataLifetime: system.comYandexTvFeatureTvplayer.preloadVideoDataSettings.preloadVideoDataLifetime
        },
        preventAmlogic2MemoryLeak: system.comYandexTvFeatureTvplayer.preventAmlogic2MemoryLeak,
        recoveredErrorsList: system.comYandexTvFeatureTvplayer.recoveredErrorsList,
        secureDecodersForClearVideo: system.comYandexTvFeatureTvplayer.secureDecodersForClearVideo,
        shouldMonitorFrameDrops: system.comYandexTvFeatureTvplayer.shouldMonitorFrameDrops,
        shouldUseAutoplayFalseForMultiplex: system.comYandexTvFeatureTvplayer.shouldUseAutoplayFalseForMultiplex,
        useBandwidthLastValueProvider: system.comYandexTvFeatureTvplayer.useBandwidthLastValueProvider
      },
      'com.yandex.tv.feature.tvplayer.ui': {
        freeChannelsLoginWallEnabledV1: system.comYandexTvFeatureTvplayerUi.freeChannelsLoginWallEnabledV1,
        freeChannelsLoginWallEnabledV2: system.comYandexTvFeatureTvplayerUi.freeChannelsLoginWallEnabledV2,
        multiplexInactivityStopV1: {
          notificationDurationMs: system.comYandexTvFeatureTvplayerUi.multiplexInactivityStopV1.notificationDurationMs,
          remainingTimeThresholdPercentage: system.comYandexTvFeatureTvplayerUi.multiplexInactivityStopV1
            .remainingTimeThresholdPercentage,
          timeoutMs: system.comYandexTvFeatureTvplayerUi.multiplexInactivityStopV1.timeoutMs
        },
        preloadChannelsWindow: system.comYandexTvFeatureTvplayerUi.preloadChannelsWindow,
        thresholdTimePutChannelToRecentMs: system.comYandexTvFeatureTvplayerUi.thresholdTimePutChannelToRecentMs,
        useNewKinopoiskOttChannelNonMultiplexStrategyV1: system.comYandexTvFeatureTvplayerUi
          .useNewKinopoiskOttChannelNonMultiplexStrategyV1,
        useNewKinopoiskOttChannelStrategyV6: system.comYandexTvFeatureTvplayerUi.useNewKinopoiskOttChannelStrategyV6,
        useNewKinopoiskOttChannelWithScheduler: system.comYandexTvFeatureTvplayerUi
          .useNewKinopoiskOttChannelWithScheduler,
        voiceoverButtonEnabled: system.comYandexTvFeatureTvplayerUi.voiceoverButtonEnabled
      },
      'com.yandex.tv.feature.tvprogramlist.ui': {
        isCatchupInProgramListEnabledV1: system.comYandexTvFeatureTvprogramlistUi.isCatchupInProgramListEnabledV1
      },
      'com.yandex.tv.feature.whatsnew': {
        enabledWhatsNewFeatures: system.comYandexTvFeatureWhatsnew.enabledWhatsNewFeatures,
        supportedWhatsNewFeatures: system.comYandexTvFeatureWhatsnew.supportedWhatsNewFeatures,
        timelinePollingDelayMs: system.comYandexTvFeatureWhatsnew.timelinePollingDelayMs,
        watchCompletedThreshold: system.comYandexTvFeatureWhatsnew.watchCompletedThreshold,
        whatsNewScreenEnabledV2: system.comYandexTvFeatureWhatsnew.whatsNewScreenEnabledV2
      },
      'com.yandex.tv.home': {
        appGridEnabledV4: system.comYandexTvHome.appGridEnabledV4,
        appsMarketCache: {
          cacheThrottleTimeMs: system.comYandexTvHome.appsMarketCache.cacheThrottleTimeMs,
          newCacheLogicV1: system.comYandexTvHome.appsMarketCache.newCacheLogicV1
        },
        appsMarketScreen: {
          appCatalogTitle: system.comYandexTvHome.appsMarketScreen.appCatalogTitle,
          getFromAppstoreApiV2: system.comYandexTvHome.appsMarketScreen.getFromAppstoreApiV2,
          localSortingEnabled: system.comYandexTvHome.appsMarketScreen.localSortingEnabled,
          redesignEnabled: system.comYandexTvHome.appsMarketScreen.redesignEnabled,
          voicedAppsLayoutEnabledV1: system.comYandexTvHome.appsMarketScreen.voicedAppsLayoutEnabledV1
        },
        blackHomeBackground: system.comYandexTvHome.blackHomeBackground,
        cachingFragmentsCountV5: system.comYandexTvHome.cachingFragmentsCountV5,
        cachingFragmentsStrategyV5: system.comYandexTvHome.cachingFragmentsStrategyV5,
        catalogProtoHttpTestEnabled: system.comYandexTvHome.catalogProtoHttpTestEnabled,
        catalogScreen: {
          enumerationEnabled: system.comYandexTvHome.catalogScreen.enumerationEnabled,
          redesignEnabled: system.comYandexTvHome.catalogScreen.redesignEnabled,
          separateGalleryRequest: system.comYandexTvHome.catalogScreen.separateGalleryRequest,
          voiceControlsEnabled: system.comYandexTvHome.catalogScreen.voiceControlsEnabled
        },
        categoriesContentProtoHttpEnabledV2: system.comYandexTvHome.categoriesContentProtoHttpEnabledV2,
        categoriesMenuProtoHttpV2: {
          cacheHoursLifetime: system.comYandexTvHome.categoriesMenuProtoHttpV2.cacheHoursLifetime,
          enabled: system.comYandexTvHome.categoriesMenuProtoHttpV2.enabled
        },
        coldStartRecommendations: {
          coldStartScreenEnabledV1: system.comYandexTvHome.coldStartRecommendations.coldStartScreenEnabledV1
        },
        continueWatchingImageType: system.comYandexTvHome.continueWatchingImageType,
        detailsBookmarkLoginWall: system.comYandexTvHome.detailsBookmarkLoginWall,
        detailsButtonsFromApiEnabledV1: system.comYandexTvHome.detailsButtonsFromApiEnabledV1,
        detailsExternalOptionsEnabled: system.comYandexTvHome.detailsExternalOptionsEnabled,
        detailsNewDesignEnabled: system.comYandexTvHome.detailsNewDesignEnabled,
        detailsPromoCinemaEnabled: system.comYandexTvHome.detailsPromoCinemaEnabled,
        detailsProtoHttpEnabled: system.comYandexTvHome.detailsProtoHttpEnabled,
        detailsProtoSerialNavigatorButtonSearchEnabled: system.comYandexTvHome
          .detailsProtoSerialNavigatorButtonSearchEnabled,
        detailsPublicSourceVoiceControlsEnabledV2: system.comYandexTvHome.detailsPublicSourceVoiceControlsEnabledV2,
        detailsPurchaseWithoutPayWall: system.comYandexTvHome.detailsPurchaseWithoutPayWall,
        detailsScreenVideoPreviewV2: {
          autoHideUIEnabledV3: system.comYandexTvHome.detailsScreenVideoPreviewV2.autoHideUIEnabledV3,
          enabled: system.comYandexTvHome.detailsScreenVideoPreviewV2.enabled,
          hideUiEnabled: system.comYandexTvHome.detailsScreenVideoPreviewV2.hideUiEnabled,
          hintMode: system.comYandexTvHome.detailsScreenVideoPreviewV2.hintMode,
          repeatEnabled: system.comYandexTvHome.detailsScreenVideoPreviewV2.repeatEnabled,
          soundWhenUiHidden: system.comYandexTvHome.detailsScreenVideoPreviewV2.soundWhenUiHidden,
          startMovieAfterTrailer: {
            mode: system.comYandexTvHome.detailsScreenVideoPreviewV2.startMovieAfterTrailer.mode,
            offsetSeconds: system.comYandexTvHome.detailsScreenVideoPreviewV2.startMovieAfterTrailer.offsetSeconds
          },
          volume: system.comYandexTvHome.detailsScreenVideoPreviewV2.volume
        },
        detailsSummaryEnabled: system.comYandexTvHome.detailsSummaryEnabled,
        detailsVoiceControls: {
          detailsKpVoiceControlsEnabledV2: system.comYandexTvHome.detailsVoiceControls.detailsKpVoiceControlsEnabledV2,
          detailsPirateVoiceControlsEnabledV2: system.comYandexTvHome.detailsVoiceControls
            .detailsPirateVoiceControlsEnabledV2,
          externalCinemasVoiceControlsEnabled: system.comYandexTvHome.detailsVoiceControls
            .externalCinemasVoiceControlsEnabled
        },
        dpadRemoveMusicFromRecent: system.comYandexTvHome.dpadRemoveMusicFromRecent,
        favoriteEnabled: system.comYandexTvHome.favoriteEnabled,
        favoriteOnNonKpEnabled: system.comYandexTvHome.favoriteOnNonKpEnabled,
        fullscreenPromo: system.comYandexTvHome.fullscreenPromo,
        fullscreenPromoAutoplayIntervalMs: system.comYandexTvHome.fullscreenPromoAutoplayIntervalMs,
        getWillWatchCarouselInFeedEnabledV2: system.comYandexTvHome.getWillWatchCarouselInFeedEnabledV2,
        giftPromoDelayMs: system.comYandexTvHome.giftPromoDelayMs,
        halfPirateDetailsEnabled: system.comYandexTvHome.halfPirateDetailsEnabled,
        hideContinueWatchingCarouselTitles: system.comYandexTvHome.hideContinueWatchingCarouselTitles,
        hideFocusVoiceNavigationGoHomeEnabled: system.comYandexTvHome.hideFocusVoiceNavigationGoHomeEnabled,
        homeCardNumbersEnabled: system.comYandexTvHome.homeCardNumbersEnabled,
        homeCarouselMusicEnabledV2: system.comYandexTvHome.homeCarouselMusicEnabledV2,
        homeCarouselsProtoHttpEnabledV2: system.comYandexTvHome.homeCarouselsProtoHttpEnabledV2,
        homePreloadRecentVideosCount: system.comYandexTvHome.homePreloadRecentVideosCount,
        homeRecentActionsEnabledV2: system.comYandexTvHome.homeRecentActionsEnabledV2,
        homeRecentMusicItemEnabledV2: system.comYandexTvHome.homeRecentMusicItemEnabledV2,
        homeRecentWebItemEnabled: system.comYandexTvHome.homeRecentWebItemEnabled,
        homeVoiceControlsEnabled: system.comYandexTvHome.homeVoiceControlsEnabled,
        ioCom: {
          capabilities: {
            useIoComForAlarm: system.comYandexTvHome.ioCom.capabilities.useIoComForAlarm
          },
          isIoComHostProxyEnabledV1: system.comYandexTvHome.ioCom.isIoComHostProxyEnabledV1
        },
        isContinueWatchingDurationBadgeHiddenOutOfFocus: system.comYandexTvHome
          .isContinueWatchingDurationBadgeHiddenOutOfFocus,
        isContinueWatchingProgressBackgroundEnabled: system.comYandexTvHome.isContinueWatchingProgressBackgroundEnabled,
        isManagingRecommendationsEnabled: system.comYandexTvHome.isManagingRecommendationsEnabled,
        loginwallPolicy: {
          appsAccessible: system.comYandexTvHome.loginwallPolicy.appsAccessible,
          profilesAccessible: system.comYandexTvHome.loginwallPolicy.profilesAccessible,
          recentAccessible: system.comYandexTvHome.loginwallPolicy.recentAccessible,
          showOnConnection: system.comYandexTvHome.loginwallPolicy.showOnConnection,
          storeAccessible: system.comYandexTvHome.loginwallPolicy.storeAccessible,
          youtubeAccessible: system.comYandexTvHome.loginwallPolicy.youtubeAccessible
        },
        maxSystemBootWaitTimeMs: system.comYandexTvHome.maxSystemBootWaitTimeMs,
        menuFragmentDebounceMillisV4: system.comYandexTvHome.menuFragmentDebounceMillisV4,
        menuFragmentResyncDelayMinutesV5: system.comYandexTvHome.menuFragmentResyncDelayMinutesV5,
        mixContinueWatchingWithTop10v3: {
          divider: system.comYandexTvHome.mixContinueWatchingWithTop10v3.divider,
          enable: system.comYandexTvHome.mixContinueWatchingWithTop10v3.enable,
          maxCwItemsCount: system.comYandexTvHome.mixContinueWatchingWithTop10v3.maxCwItemsCount
        },
        moveAppsMarketToCategoriesV2: system.comYandexTvHome.moveAppsMarketToCategoriesV2,
        musicCategory: {
          redesignEnabled: system.comYandexTvHome.musicCategory.redesignEnabled
        },
        musicCategoryContentProtoHttpEnabled: system.comYandexTvHome.musicCategoryContentProtoHttpEnabled,
        newActorScreenEnabled: system.comYandexTvHome.newActorScreenEnabled,
        newDesignCategoriesIds: system.comYandexTvHome.newDesignCategoriesIds,
        newSearchCarouselsEnabledV3: system.comYandexTvHome.newSearchCarouselsEnabledV3,
        noMainCarouselsCache: system.comYandexTvHome.noMainCarouselsCache,
        noMenuFragmentsPreload: system.comYandexTvHome.noMenuFragmentsPreload,
        periodsToReportFrameMetricsOnStartV2: system.comYandexTvHome.periodsToReportFrameMetricsOnStartV2,
        pimpleOnProfileButtonEnabled: system.comYandexTvHome.pimpleOnProfileButtonEnabled,
        pirateCardButtonsConfig: {
          halfPirateCardBrowserActionEnabled: system.comYandexTvHome.pirateCardButtonsConfig
            .halfPirateCardBrowserActionEnabled,
          halfPirateCardBrowserButtonText: system.comYandexTvHome.pirateCardButtonsConfig
            .halfPirateCardBrowserButtonText,
          halfPirateCardSearchActionEnabled: system.comYandexTvHome.pirateCardButtonsConfig
            .halfPirateCardSearchActionEnabled,
          halfPirateCardSearchButtonText: system.comYandexTvHome.pirateCardButtonsConfig.halfPirateCardSearchButtonText,
          pirateCardBrowserActionEnabled: system.comYandexTvHome.pirateCardButtonsConfig.pirateCardBrowserActionEnabled,
          pirateCardBrowserButtonText: system.comYandexTvHome.pirateCardButtonsConfig.pirateCardBrowserButtonText,
          pirateCardSearchActionEnabled: system.comYandexTvHome.pirateCardButtonsConfig.pirateCardSearchActionEnabled,
          pirateCardSearchButtonText: system.comYandexTvHome.pirateCardButtonsConfig.pirateCardSearchButtonText
        },
        previewOnCardEnabled: system.comYandexTvHome.previewOnCardEnabled,
        profileButtonWithAvatarEnabled: system.comYandexTvHome.profileButtonWithAvatarEnabled,
        progressDataForKpContentFromGetCardDetailsEnabledV2: system.comYandexTvHome
          .progressDataForKpContentFromGetCardDetailsEnabledV2,
        progressDataForKpContentFromGetCardDetailsEnabledV3: system.comYandexTvHome
          .progressDataForKpContentFromGetCardDetailsEnabledV3,
        progressDataForPublicContentFromGetCardDetailsEnabled: system.comYandexTvHome
          .progressDataForPublicContentFromGetCardDetailsEnabled,
        promoButtonForPromoCarouselEnabled: system.comYandexTvHome.promoButtonForPromoCarouselEnabled,
        recentInsideContinueWatchingPosition: system.comYandexTvHome.recentInsideContinueWatchingPosition,
        recentInsideContinueWatchingSize: system.comYandexTvHome.recentInsideContinueWatchingSize,
        recentsConfig: {
          appDeeplinks: system.comYandexTvHome.recentsConfig.appDeeplinks,
          appIcons: system.comYandexTvHome.recentsConfig.appIcons,
          appNames: system.comYandexTvHome.recentsConfig.appNames,
          customAppIconsPackages: system.comYandexTvHome.recentsConfig.customAppIconsPackages,
          pinnedItems: {
            'com.vk.tv': system.comYandexTvHome.recentsConfig.pinnedItems.comVkTv,
            'ru.ivi.client': system.comYandexTvHome.recentsConfig.pinnedItems.ruIviClient,
            'ru.rutube.app': system.comYandexTvHome.recentsConfig.pinnedItems.ruRutubeApp
          },
          recentExternalAppVideoItemsEnabledV1: system.comYandexTvHome.recentsConfig
            .recentExternalAppVideoItemsEnabledV1
        },
        recentViaTvProviderEnabled: system.comYandexTvHome.recentViaTvProviderEnabled,
        screenSaverShortcutSettings: {
          doubleTapInterval: system.comYandexTvHome.screenSaverShortcutSettings.doubleTapInterval,
          enabled: system.comYandexTvHome.screenSaverShortcutSettings.enabled,
          longPressInterval: system.comYandexTvHome.screenSaverShortcutSettings.longPressInterval,
          mode: system.comYandexTvHome.screenSaverShortcutSettings.mode
        },
        searchPromoBannerEnabled: system.comYandexTvHome.searchPromoBannerEnabled,
        searchProtoHttpEnabledV2: system.comYandexTvHome.searchProtoHttpEnabledV2,
        searchRedesignEnabled: system.comYandexTvHome.searchRedesignEnabled,
        searchViaArpc: system.comYandexTvHome.searchViaArpc,
        searchVideoScenarioEnabled: system.comYandexTvHome.searchVideoScenarioEnabled,
        searchVoiceControlsEnabled: system.comYandexTvHome.searchVoiceControlsEnabled,
        serialNavigatorScreen: {
          enumerationEnabled: system.comYandexTvHome.serialNavigatorScreen.enumerationEnabled,
          newSerialNavigatorEnabledV3: system.comYandexTvHome.serialNavigatorScreen.newSerialNavigatorEnabledV3,
          resetEpisodeToBeginningAfterPercent: system.comYandexTvHome.serialNavigatorScreen
            .resetEpisodeToBeginningAfterPercent,
          serialNavigatorRedesignEnabled: system.comYandexTvHome.serialNavigatorScreen.serialNavigatorRedesignEnabled,
          useKpIdForRequest: system.comYandexTvHome.serialNavigatorScreen.useKpIdForRequest,
          voiceControlsEnabled: system.comYandexTvHome.serialNavigatorScreen.voiceControlsEnabled
        },
        showNewNotifications: system.comYandexTvHome.showNewNotifications,
        showRecentIfNoContinueWatching: system.comYandexTvHome.showRecentIfNoContinueWatching,
        showRecentInsideContinueWatching: system.comYandexTvHome.showRecentInsideContinueWatching,
        showRecentOnLoadingEnabledV1: system.comYandexTvHome.showRecentOnLoadingEnabledV1,
        sideMenu: {
          isAliceManualV2Enabled: system.comYandexTvHome.sideMenu.isAliceManualV2Enabled,
          isMenuOverContentEnabled: system.comYandexTvHome.sideMenu.isMenuOverContentEnabled,
          isMenuRedesignEnabledV2: system.comYandexTvHome.sideMenu.isMenuRedesignEnabledV2,
          isProfileIconAtBottomV2: system.comYandexTvHome.sideMenu.isProfileIconAtBottomV2,
          isProfileIconInsteadAliceEnabled: system.comYandexTvHome.sideMenu.isProfileIconInsteadAliceEnabled,
          useBackendStatedImage: system.comYandexTvHome.sideMenu.useBackendStatedImage
        },
        statusBarBackgroundV2: system.comYandexTvHome.statusBarBackgroundV2,
        tandem: {
          backgrounds: Object.fromEntries(
            Object.entries(system.comYandexTvHome.tandem.backgrounds).map(([key, value]) => [key, value])
          )
        },
        tandemColorCodesConfig: Object.fromEntries(
          Object.entries(system.comYandexTvHome.tandemColorCodesConfig).map(([key, value]) => [key, Object.fromEntries(
            Object.entries(value).map(([code, colors]) => [code, colors])
          )])
        ),
        timersOnScreenEnable: system.comYandexTvHome.timersOnScreenEnable,
        tvChannelsConfig: {
          channelsUpdatePeriodMinutes: system.comYandexTvHome.tvChannelsConfig.channelsUpdatePeriodMinutes,
          epgFragmentEnabled: system.comYandexTvHome.tvChannelsConfig.epgFragmentEnabled,
          epgFragmentEnabledV2: system.comYandexTvHome.tvChannelsConfig.epgFragmentEnabledV2,
          epgFragmentEnabledV3: system.comYandexTvHome.tvChannelsConfig.epgFragmentEnabledV3,
          epgFragmentEnabledV4: system.comYandexTvHome.tvChannelsConfig.epgFragmentEnabledV4,
          favouritesEnabledV3: system.comYandexTvHome.tvChannelsConfig.favouritesEnabledV3,
          multicatSupported: system.comYandexTvHome.tvChannelsConfig.multicatSupported,
          tariffOptionsSupported: system.comYandexTvHome.tvChannelsConfig.tariffOptionsSupported,
          tvGridEnabled: system.comYandexTvHome.tvChannelsConfig.tvGridEnabled,
          tvGridEnabledV2: system.comYandexTvHome.tvChannelsConfig.tvGridEnabledV2,
          tvGridEnabledV3: system.comYandexTvHome.tvChannelsConfig.tvGridEnabledV3,
          tvGridEnabledV4: system.comYandexTvHome.tvChannelsConfig.tvGridEnabledV4,
          tvGridVoiceControlsEnabled: system.comYandexTvHome.tvChannelsConfig.tvGridVoiceControlsEnabled,
          tvGridVoiceControlsEnabledV2: system.comYandexTvHome.tvChannelsConfig.tvGridVoiceControlsEnabledV2,
          tvGridVoiceControlsEnabledV3: system.comYandexTvHome.tvChannelsConfig.tvGridVoiceControlsEnabledV3,
          tvGridVoiceControlsEnabledV4: system.comYandexTvHome.tvChannelsConfig.tvGridVoiceControlsEnabledV4,
          tvGridVoiceControlsUpdatePeriodSeconds: system.comYandexTvHome.tvChannelsConfig
            .tvGridVoiceControlsUpdatePeriodSeconds
        },
        updateHomeScreenByButton: system.comYandexTvHome.updateHomeScreenByButton,
        updateOnlyFeatureHomeScreen: system.comYandexTvHome.updateOnlyFeatureHomeScreen,
        useBackendBadgeImage: system.comYandexTvHome.useBackendBadgeImage,
        watchButtonForPublicContentEnabled: system.comYandexTvHome.watchButtonForPublicContentEnabled,
        watchButtonForPublicContentEnabledV2: system.comYandexTvHome.watchButtonForPublicContentEnabledV2
      },
      'com.yandex.tv.input.efir': {
        adYandexPlayerEnabled: system.comYandexTvInputEfir.adYandexPlayerEnabled,
        adYandexPlayerEnabledV3: system.comYandexTvInputEfir.adYandexPlayerEnabledV3,
        mbuSettings: {
          mbuDoNotOverrideRh: system.comYandexTvInputEfir.mbuSettings.mbuDoNotOverrideRh,
          mbuEnableForDynamic: system.comYandexTvInputEfir.mbuSettings.mbuEnableForDynamic,
          mbuEnableMoveToUnbanned: system.comYandexTvInputEfir.mbuSettings.mbuEnableMoveToUnbanned,
          mbuEnableUpdate: system.comYandexTvInputEfir.mbuSettings.mbuEnableUpdate,
          mbuFallbackByAnyExc: system.comYandexTvInputEfir.mbuSettings.mbuFallbackByAnyExc
        },
        multicatSupported: system.comYandexTvInputEfir.multicatSupported,
        preventAmlogic2MemoryLeak: system.comYandexTvInputEfir.preventAmlogic2MemoryLeak,
        secureDecodersForClearVideo: system.comYandexTvInputEfir.secureDecodersForClearVideo,
        shouldMonitorFrameDrops: system.comYandexTvInputEfir.shouldMonitorFrameDrops,
        smotreshka_channels_enabled: system.comYandexTvInputEfir.smotreshkaChannelsEnabled,
        tariffOptionsSupported: system.comYandexTvInputEfir.tariffOptionsSupported,
        tvGridEnabledV2: system.comYandexTvInputEfir.tvGridEnabledV2,
        tvGridEnabledV3: system.comYandexTvInputEfir.tvGridEnabledV3,
        tvGridEnabledV4: system.comYandexTvInputEfir.tvGridEnabledV4,
        tvGridEnabledV5: system.comYandexTvInputEfir.tvGridEnabledV5,
        tvProgramsProtoHttpEnabledV2: system.comYandexTvInputEfir.tvProgramsProtoHttpEnabledV2
      },
      'com.yandex.tv.live': {
        channelListFragmentEnabled: system.comYandexTvLive.channelListFragmentEnabled,
        channelListFragmentEnabledV2: system.comYandexTvLive.channelListFragmentEnabledV2,
        channelListFragmentEnabledV3: system.comYandexTvLive.channelListFragmentEnabledV3,
        channelListFragmentEnabledV4: system.comYandexTvLive.channelListFragmentEnabledV4,
        channelsUpdatePeriodMinutes: system.comYandexTvLive.channelsUpdatePeriodMinutes,
        channelSwitching: {
          restartInputServiceOnChannelSwitched: system.comYandexTvLive.channelSwitching
            .restartInputServiceOnChannelSwitched
        },
        channelThumbStubs: system.comYandexTvLive.channelThumbStubs,
        checkChannelLicensePeriodMs: system.comYandexTvLive.checkChannelLicensePeriodMs,
        disableChannelVoiceControls: system.comYandexTvLive.disableChannelVoiceControls,
        epgFragmentEnabled: system.comYandexTvLive.epgFragmentEnabled,
        epgFragmentEnabledV2: system.comYandexTvLive.epgFragmentEnabledV2,
        epgFragmentEnabledV3: system.comYandexTvLive.epgFragmentEnabledV3,
        epgFragmentEnabledV4: system.comYandexTvLive.epgFragmentEnabledV4,
        forcedScrollChannelListEnabledV2: system.comYandexTvLive.forcedScrollChannelListEnabledV2,
        forcedScrollChannelListEnabledV3: system.comYandexTvLive.forcedScrollChannelListEnabledV3,
        forcedScrollChannelListEnabledV4: system.comYandexTvLive.forcedScrollChannelListEnabledV4,
        forcedScrollChannelListEnabledV5: system.comYandexTvLive.forcedScrollChannelListEnabledV5,
        gridPlayerLayoutEnabled: system.comYandexTvLive.gridPlayerLayoutEnabled,
        gridPlayerLayoutEnabledV2: system.comYandexTvLive.gridPlayerLayoutEnabledV2,
        gridPlayerLayoutEnabledV3: system.comYandexTvLive.gridPlayerLayoutEnabledV3,
        gridPlayerLayoutEnabledV4: system.comYandexTvLive.gridPlayerLayoutEnabledV4,
        isNewPlayerEnabledV2: system.comYandexTvLive.isNewPlayerEnabledV2,
        isNewPlayerEnabledV3: system.comYandexTvLive.isNewPlayerEnabledV3,
        media: {
          image: Object.fromEntries(
            Object.entries(system.comYandexTvLive.media.image).map(([key, value]) => [key, Object.fromEntries(
              Object.entries(value).map(([key, value]) => [key, {
                file_size: value.fileSize,
                max_download_time: value.maxDownloadTime,
                url: value.url
              }])
            )])
          ),
          video: system.comYandexTvLive.media.video
        },
        newZappingUiEnabled: system.comYandexTvLive.newZappingUiEnabled,
        paidChannelStubV2EnabledProd: system.comYandexTvLive.paidChannelStubV2EnabledProd,
        sources: {
          designV2Enabled: system.comYandexTvLive.sources.designV2Enabled,
          sourcesSortingActiveFirst: system.comYandexTvLive.sources.sourcesSortingActiveFirst,
          sourcesUsbEnabled: system.comYandexTvLive.sources.sourcesUsbEnabled
        },
        sourcesPlayerOverlay: {
          dolbyAudioEnabledV1: system.comYandexTvLive.sourcesPlayerOverlay.dolbyAudioEnabledV1,
          overlayEnabledV1: system.comYandexTvLive.sourcesPlayerOverlay.overlayEnabledV1
        },
        sourcesPlayerTcbEnabled: system.comYandexTvLive.sourcesPlayerTcbEnabled,
        statusBarOnV1: system.comYandexTvLive.statusBarOnV1,
        tariffPurchaseStubEnabled: system.comYandexTvLive.tariffPurchaseStubEnabled,
        thresholdTimePutChannelToRecentMs: system.comYandexTvLive.thresholdTimePutChannelToRecentMs
      },
      'com.yandex.tv.music': {
        animatedBackground: system.comYandexTvMusic.animatedBackground,
        debounceForLyricsButton: system.comYandexTvMusic.debounceForLyricsButton,
        delayForLyricsViewVisibility: system.comYandexTvMusic.delayForLyricsViewVisibility,
        disclaimerConfig: {
          disclaimersEnabled: system.comYandexTvMusic.disclaimerConfig.disclaimersEnabled
        },
        focusableProgressBar: system.comYandexTvMusic.focusableProgressBar,
        ioCom: {
          capabilities: {
            useIoComForAlarm: system.comYandexTvMusic.ioCom.capabilities.useIoComForAlarm
          },
          isIoComHostProxyEnabledV1: system.comYandexTvMusic.ioCom.isIoComHostProxyEnabledV1,
          useIoComMusicServiceApiV4: system.comYandexTvMusic.ioCom.useIoComMusicServiceApiV4
        },
        isKaraokeModeEnabledV1: system.comYandexTvMusic.isKaraokeModeEnabledV1,
        isLyricsModeEnabledV1: system.comYandexTvMusic.isLyricsModeEnabledV1,
        isNewNativePlayerEnabledV3: system.comYandexTvMusic.isNewNativePlayerEnabledV3,
        isPlaybackSpeedEnabledV1: system.comYandexTvMusic.isPlaybackSpeedEnabledV1,
        keepScreenOnWhilePlayingWithoutLyrics: system.comYandexTvMusic.keepScreenOnWhilePlayingWithoutLyrics,
        lyricsAlwaysOnWhenKaraokeEnabledV1: system.comYandexTvMusic.lyricsAlwaysOnWhenKaraokeEnabledV1,
        musicAppCanStopMusicWhenHiddenV1: system.comYandexTvMusic.musicAppCanStopMusicWhenHiddenV1,
        playlistConfig: {
          enableListenedToCheckmarks: system.comYandexTvMusic.playlistConfig.enableListenedToCheckmarks,
          isPlaylistsEnabledV3: system.comYandexTvMusic.playlistConfig.isPlaylistsEnabledV3,
          itemsToScrollForByVoice: system.comYandexTvMusic.playlistConfig.itemsToScrollForByVoice
        },
        shouldApplyBlur: system.comYandexTvMusic.shouldApplyBlur,
        statusBarOnV2: system.comYandexTvMusic.statusBarOnV2,
        stopBackgroundMusicWhenTurnOffScreenEnabledV2: system.comYandexTvMusic
          .stopBackgroundMusicWhenTurnOffScreenEnabledV2
      },
      'com.yandex.tv.services': {
        aiPqEnabled: system.comYandexTvServices.aiPqEnabled,
        aiPqTitle: system.comYandexTvServices.aiPqTitle,
        allAccountState: system.comYandexTvServices.allAccountState,
        appsVersions: {
          collectIntervalMinutes: system.comYandexTvServices.appsVersions.collectIntervalMinutes,
          debounceMs: system.comYandexTvServices.appsVersions.debounceMs,
          isEnabled: system.comYandexTvServices.appsVersions.isEnabled,
          maxPackagesCount: system.comYandexTvServices.appsVersions.maxPackagesCount,
          requiredPackages: system.comYandexTvServices.appsVersions.requiredPackages,
          usageStatsPeriodDays: system.comYandexTvServices.appsVersions.usageStatsPeriodDays
        },
        appUsageTrackerEnabled: system.comYandexTvServices.appUsageTrackerEnabled,
        authSuggest: {
          enabled: system.comYandexTvServices.authSuggest.enabled,
          maxShowCount: system.comYandexTvServices.authSuggest.maxShowCount,
          showTimeoutSeconds: system.comYandexTvServices.authSuggest.showTimeoutSeconds
        },
        batteryNotifications: {
          levelsForNotifications: system.comYandexTvServices.batteryNotifications.levelsForNotifications,
          requestsEnabled: system.comYandexTvServices.batteryNotifications.requestsEnabled,
          resetNotificationsLevel: system.comYandexTvServices.batteryNotifications.resetNotificationsLevel
        },
        batteryNotifications_v2: {
          batteryNotificationDuration: system.comYandexTvServices.batteryNotificationsV2.batteryNotificationDuration,
          levelsForNotifications: system.comYandexTvServices.batteryNotificationsV2.levelsForNotifications,
          requestFrequencyMinutes: system.comYandexTvServices.batteryNotificationsV2.requestFrequencyMinutes,
          requestsEnabled: system.comYandexTvServices.batteryNotificationsV2.requestsEnabled,
          resetNotificationsLevel: system.comYandexTvServices.batteryNotificationsV2.resetNotificationsLevel
        },
        btPairingSettingEnabled: system.comYandexTvServices.btPairingSettingEnabled,
        crashSender: {
          whitelist: system.comYandexTvServices.crashSender.whitelist
        },
        enabledPromos: system.comYandexTvServices.enabledPromos,
        eventRateLimitConfig: {
          rateLimitEnabled: system.comYandexTvServices.eventRateLimitConfig.rateLimitEnabled,
          rateLimiters: system.comYandexTvServices.eventRateLimitConfig.rateLimiters.map(item => ({
            acceptedEventNames: item.acceptedEventNames,
            debounceTime: item.debounceTime
          }))
        },
        fastWakeupEnabled: system.comYandexTvServices.fastWakeupEnabled,
        fastWakeupSettingsEnabled: system.comYandexTvServices.fastWakeupSettingsEnabled,
        freeSpaceInspector: {
          enabled: system.comYandexTvServices.freeSpaceInspector.enabled,
          intervalBetweenShowNotificationMs: system.comYandexTvServices.freeSpaceInspector
            .intervalBetweenShowNotificationMs,
          notificationDurationMs: system.comYandexTvServices.freeSpaceInspector.notificationDurationMs,
          useStorageCleanupScreenV2: system.comYandexTvServices.freeSpaceInspector.useStorageCleanupScreenV2
        },
        giftDesign: {
          alternativeLaterButtonAppearanceTimeMs: system.comYandexTvServices.giftDesign
            .alternativeLaterButtonAppearanceTimeMs,
          biggerText: system.comYandexTvServices.giftDesign.biggerText
        },
        giftPromoLackTtl: system.comYandexTvServices.giftPromoLackTtl,
        giftPromoMaxCount: system.comYandexTvServices.giftPromoMaxCount,
        giftPromoTimeout: system.comYandexTvServices.giftPromoTimeout,
        hints: {
          defaultHintsDuration: system.comYandexTvServices.hints.defaultHintsDuration,
          enabled: system.comYandexTvServices.hints.enabled,
          minimalHintDuration: system.comYandexTvServices.hints.minimalHintDuration,
          newReportApiEnabledV2: system.comYandexTvServices.hints.newReportApiEnabledV2,
          requestDelay: system.comYandexTvServices.hints.requestDelay,
          screenTriggerThreshold: system.comYandexTvServices.hints.screenTriggerThreshold,
          showDelay: system.comYandexTvServices.hints.showDelay,
          triggers: system.comYandexTvServices.hints.triggers
        },
        ioCom: {
          ioComServerEnabled: system.comYandexTvServices.ioCom.ioComServerEnabled,
          isIoComHostServiceEnabledV1: system.comYandexTvServices.ioCom.isIoComHostServiceEnabledV1
        },
        isAuthErrorForceSyncTimeEnabled: system.comYandexTvServices.isAuthErrorForceSyncTimeEnabled,
        isViewDetailedErrorAboutRegistrationOnTheBackendEnabled: system.comYandexTvServices
          .isViewDetailedErrorAboutRegistrationOnTheBackendEnabled,
        media: {
          image: Object.fromEntries(
            Object.entries(system.comYandexTvServices.media.image).map(([key, value]) => [key, Object.fromEntries(
              Object.entries(value).map(([key, value]) => [key, {
                file_size: value.fileSize,
                max_download_time: value.maxDownloadTime,
                url: value.url
              }])
            )])
          ),
          video: system.comYandexTvServices.media.video
        },
        metricaImportantBindEnabled: system.comYandexTvServices.metricaImportantBindEnabled,
        newAuthForm: system.comYandexTvServices.newAuthForm,
        newAuthFormV2: system.comYandexTvServices.newAuthFormV2,
        newAuthSkipLoginWall: system.comYandexTvServices.newAuthSkipLoginWall,
        newAuthSkipLoginWallV2: system.comYandexTvServices.newAuthSkipLoginWallV2,
        newAuthSuccessScreen: system.comYandexTvServices.newAuthSuccessScreen,
        newAuthSuccessScreenV2: system.comYandexTvServices.newAuthSuccessScreenV2,
        newPinCodeScreenEnabled: system.comYandexTvServices.newPinCodeScreenEnabled,
        nightMode: {
          dynamicSoundCompressionSupported: system.comYandexTvServices.nightMode.dynamicSoundCompressionSupported,
          lowBlueLightSupported: system.comYandexTvServices.nightMode.lowBlueLightSupported,
          nightModeSupported: system.comYandexTvServices.nightMode.nightModeSupported
        },
        notifications: {
          interactiveNotificationLongPressDurationMs: system.comYandexTvServices.notifications
            .interactiveNotificationLongPressDurationMs,
          interactiveNotificationsEnabled: system.comYandexTvServices.notifications.interactiveNotificationsEnabled,
          serviceEnabled: system.comYandexTvServices.notifications.serviceEnabled,
          whitelist: system.comYandexTvServices.notifications.whitelist
        },
        passport: {
          iosdkUseExternalToken: system.comYandexTvServices.passport.iosdkUseExternalToken,
          iosdkUseUnifiedClientId: system.comYandexTvServices.passport.iosdkUseUnifiedClientId,
          servicesUseUnifiedClientId: system.comYandexTvServices.passport.servicesUseUnifiedClientId
        },
        pinCodeSendRequestButtonEnabled: system.comYandexTvServices.pinCodeSendRequestButtonEnabled,
        plusPayEnabled: system.comYandexTvServices.plusPayEnabled,
        promoProtoHttpEnabled: system.comYandexTvServices.promoProtoHttpEnabled,
        promoTimeout: system.comYandexTvServices.promoTimeout,
        qrCodeGiftFlow: system.comYandexTvServices.qrCodeGiftFlow,
        qrCodeGiftFlowV2: system.comYandexTvServices.qrCodeGiftFlowV2,
        rcuV1: {
          isEnabled: system.comYandexTvServices.rcuV1.isEnabled
        },
        realtimeEvents: {
          clickdaemonBatchUri: system.comYandexTvServices.realtimeEvents.clickdaemonBatchUri,
          clickdaemonErrorsBatchUri: system.comYandexTvServices.realtimeEvents.clickdaemonErrorsBatchUri,
          enabled: system.comYandexTvServices.realtimeEvents.enabled,
          whitelist: system.comYandexTvServices.realtimeEvents.whitelist
        },
        sendSysRecoveryVersion: system.comYandexTvServices.sendSysRecoveryVersion,
        showChildAccountSwitchBlockSetting: system.comYandexTvServices.showChildAccountSwitchBlockSetting,
        silentRebootV3: {
          alwaysTurnOn: {
            enabled: system.comYandexTvServices.silentRebootV3.alwaysTurnOn.enabled,
            endSec: system.comYandexTvServices.silentRebootV3.alwaysTurnOn.endSec,
            startSec: system.comYandexTvServices.silentRebootV3.alwaysTurnOn.startSec,
            supportRebootOnFSB: system.comYandexTvServices.silentRebootV3.alwaysTurnOn.supportRebootOnFSB,
            uptimeMs: system.comYandexTvServices.silentRebootV3.alwaysTurnOn.uptimeMs
          },
          standby: {
            enabled: system.comYandexTvServices.silentRebootV3.standby.enabled,
            uptimeMs: system.comYandexTvServices.silentRebootV3.standby.uptimeMs
          }
        },
        sleepModeSettingsScreenEnabled: system.comYandexTvServices.sleepModeSettingsScreenEnabled,
        splitOwnerAndActive: system.comYandexTvServices.splitOwnerAndActive,
        syncTimeDiffToResetSession: system.comYandexTvServices.syncTimeDiffToResetSession,
        tandemSetup: {
          backgrounds: Object.fromEntries(
            Object.entries(system.comYandexTvServices.tandemSetup.backgrounds).map(([key, value]) => [key, value])
          ),
          icons: Object.fromEntries(
            Object.entries(system.comYandexTvServices.tandemSetup.icons).map(([key, value]) => [key,
              typeof value === 'string'
                ? value
                : Object.fromEntries(Object.entries(value).map(([color, icon]) => [color, {
                  default: icon.default,
                  stereopair: icon.stereopair
                }]))
            ])
          )
        },
        timeLimitSettingsScreenEnabled: system.comYandexTvServices.timeLimitSettingsScreenEnabled,
        timePersistConfig: {
          timePersistEnabled: system.comYandexTvServices.timePersistConfig.timePersistEnabled,
          timePersistIntervalMs: system.comYandexTvServices.timePersistConfig.timePersistIntervalMs
        },
        transparentAuthWebview: system.comYandexTvServices.transparentAuthWebview,
        voiceEnrollmentEnabled: system.comYandexTvServices.voiceEnrollmentEnabled,
        writeIsActiveAccountChildSystemProperty: system.comYandexTvServices.writeIsActiveAccountChildSystemProperty
      },
      'com.yandex.tv.services.metrica': {
        timePersistConfig: {
          timePersistEnabled: system.comYandexTvServicesMetrica.timePersistConfig.timePersistEnabled,
          timePersistIntervalMs: system.comYandexTvServicesMetrica.timePersistConfig.timePersistIntervalMs
        }
      },
      'com.yandex.tv.services.platform': {
        accessibilityConfig: {
          serviceTypes: system.comYandexTvServicesPlatform.accessibilityConfig.serviceTypes
        },
        adbEnabled: system.comYandexTvServicesPlatform.adbEnabled,
        androidSettingsConfig: {
          enabled: system.comYandexTvServicesPlatform.androidSettingsConfig.enabled,
          globalSettingsMap: Object.fromEntries(
            Object.entries(system.comYandexTvServicesPlatform.androidSettingsConfig.globalSettingsMap)
              .map(([key, value]) => [key, {
                value: value.value,
                valueType: value.valueType
              }])
          ),
          secureSettingsMap: Object.fromEntries(
            Object.entries(system.comYandexTvServicesPlatform.androidSettingsConfig.secureSettingsMap)
              .map(([key, value]) => [key, {
                value: value.value,
                valueType: value.valueType
              }])
          )
        },
        audioServerStateListenEnabled: system.comYandexTvServicesPlatform.audioServerStateListenEnabled,
        defaultVoiceRecognitionService: system.comYandexTvServicesPlatform.defaultVoiceRecognitionService,
        externalAppAsCurrentScreenEnabledV3: system.comYandexTvServicesPlatform.externalAppAsCurrentScreenEnabledV3,
        isForegroundAppListenerEnabledV1: system.comYandexTvServicesPlatform.isForegroundAppListenerEnabledV1,
        lastWatchedEnabled: system.comYandexTvServicesPlatform.lastWatchedEnabled,
        lmk: {
          configurerEnabled: system.comYandexTvServicesPlatform.lmk.configurerEnabled,
          highPriorityProcesses: system.comYandexTvServicesPlatform.lmk.highPriorityProcesses,
          highPriorityProcessesEnabled: system.comYandexTvServicesPlatform.lmk.highPriorityProcessesEnabled
        },
        mediaSessionServiceEnabledV2: system.comYandexTvServicesPlatform.mediaSessionServiceEnabledV2,
        osNameDisplayed: system.comYandexTvServicesPlatform.osNameDisplayed,
        screensaver: {
          ecoModeV2: {
            brightnessPercent: system.comYandexTvServicesPlatform.screensaver.ecoModeV2.brightnessPercent,
            enabled: system.comYandexTvServicesPlatform.screensaver.ecoModeV2.enabled
          },
          pictureModeV3: {
            enabled: system.comYandexTvServicesPlatform.screensaver.pictureModeV3.enabled
          },
          pictureModeV4: {
            enabled: system.comYandexTvServicesPlatform.screensaver.pictureModeV4.enabled
          },
          themeChooserSetting: {
            settingEnabled: system.comYandexTvServicesPlatform.screensaver.themeChooserSetting.settingEnabled
          }
        },
        sendStoragedInfoPeriodMsV2: system.comYandexTvServicesPlatform.sendStoragedInfoPeriodMsV2,
        settings: {
          keyboardComponent: system.comYandexTvServicesPlatform.settings.keyboardComponent,
          systemPropertyWrite: {
            'backlight.min_max': system.comYandexTvServicesPlatform.settings.systemPropertyWrite.backlightMinMax,
            lmk_metrics_enabled: system.comYandexTvServicesPlatform.settings.systemPropertyWrite.lmkMetricsEnabled,
            memc_enhance: system.comYandexTvServicesPlatform.settings.systemPropertyWrite.memcEnhance
          }
        },
        settingsOverlayEnabledV2: system.comYandexTvServicesPlatform.settingsOverlayEnabledV2,
        sourcesOverlayEnabled: system.comYandexTvServicesPlatform.sourcesOverlayEnabled,
        supportedMediaSessionApplications: system.comYandexTvServicesPlatform.supportedMediaSessionApplications,
        systemui: {
          islandVolumeEnabled: system.comYandexTvServicesPlatform.systemui.islandVolumeEnabled
        },
        voiceVolumeStep: system.comYandexTvServicesPlatform.voiceVolumeStep
      },
      'com.yandex.tv.services.privileged': {
        foregroundServicesLimiter: {
          packagesWhitelist: system.comYandexTvServicesPrivileged.foregroundServicesLimiter.packagesWhitelist
        }
      },
      'com.yandex.tv.settings': {
        parentalControlDynamic: system.comYandexTvSettings.parentalControlDynamic
      },
      'com.yandex.tv.setupwizard': {
        coldStartRecommendations: {
          coldStartChangingTextPhrasesDelayMs: system.comYandexTvSetupwizard.coldStartRecommendations
            .coldStartChangingTextPhrasesDelayMs,
          coldStartHomeCarouselsReloadTimeoutMs: system.comYandexTvSetupwizard.coldStartRecommendations
            .coldStartHomeCarouselsReloadTimeoutMs,
          coldStartScreenEnabled: system.comYandexTvSetupwizard.coldStartRecommendations.coldStartScreenEnabled,
          coldStartScreenEnabledV1: system.comYandexTvSetupwizard.coldStartRecommendations.coldStartScreenEnabledV1,
          coldStartTransitionPhrases: system.comYandexTvSetupwizard.coldStartRecommendations.coldStartTransitionPhrases
        },
        media: {
          image: Object.fromEntries(
            Object.entries(system.comYandexTvSetupwizard.media.image).map(([key, value]) => [key, Object.fromEntries(
              Object.entries(value).map(([key, value]) => [key, {
                file_size: value.fileSize,
                max_download_time: value.maxDownloadTime,
                url: value.url
              }])
            )])
          ),
          video: Object.fromEntries(
            Object.entries(system.comYandexTvSetupwizard.media.video).map(([key, value]) => [key, Object.fromEntries(
              Object.entries(value).map(([key, value]) => [key, {
                file_size: value.fileSize,
                max_download_time: value.maxDownloadTime,
                url: value.url
              }])
            )])
          )
        },
        setupSoundEnabled: system.comYandexTvSetupwizard.setupSoundEnabled,
        skipAuthButtonAvailable: system.comYandexTvSetupwizard.skipAuthButtonAvailable,
        tandemSetup: {
          backgrounds: Object.fromEntries(
            Object.entries(system.comYandexTvSetupwizard.tandemSetup.backgrounds).map(([key, value]) => [key, value])
          ),
          icons: Object.fromEntries(
            Object.entries(system.comYandexTvSetupwizard.tandemSetup.icons).map(([key, value]) => [key,
              typeof value === 'string'
                ? value
                : Object.fromEntries(Object.entries(value).map(([color, icon]) => [color, {
                  default: icon.default,
                  stereopair: icon.stereopair
                }]))
            ])
          )
        }
      },
      'com.yandex.tv.sport': {
        backendMenuItemUnlocked: system.comYandexTvSport.backendMenuItemUnlocked,
        carouselAutoUpdateEnabled: system.comYandexTvSport.carouselAutoUpdateEnabled,
        carouselAutoUpdateInterval: system.comYandexTvSport.carouselAutoUpdateInterval,
        hintsEnabled: system.comYandexTvSport.hintsEnabled,
        reminderButtonIsVisible: system.comYandexTvSport.reminderButtonIsVisible,
        scoreIsVisible: system.comYandexTvSport.scoreIsVisible
      },
      'com.yandex.tv.videoplayer': {
        adsEnabledProd: system.comYandexTvVideoplayer.adsEnabledProd,
        adsScenarioId: system.comYandexTvVideoplayer.adsScenarioId,
        allowRemoteConfigurationV1: system.comYandexTvVideoplayer.allowRemoteConfigurationV1,
        availableSpeedListV1: system.comYandexTvVideoplayer.availableSpeedListV1,
        buyPlusButtonV5: {
          isVisible: system.comYandexTvVideoplayer.buyPlusButtonV5.isVisible
        },
        ignoreVideometaError: system.comYandexTvVideoplayer.ignoreVideometaError,
        ioCom: {
          capabilities: {
            useIoComForAlarm: system.comYandexTvVideoplayer.ioCom.capabilities.useIoComForAlarm
          },
          isIoComHostProxyEnabledV1: system.comYandexTvVideoplayer.ioCom.isIoComHostProxyEnabledV1
        },
        isNewPlayerEnabledV1: system.comYandexTvVideoplayer.isNewPlayerEnabledV1,
        isNewPlayerEnabledV2: system.comYandexTvVideoplayer.isNewPlayerEnabledV2,
        isNewPlayerEnabledV3: system.comYandexTvVideoplayer.isNewPlayerEnabledV3,
        isNewPlayerEnabledV4: system.comYandexTvVideoplayer.isNewPlayerEnabledV4,
        isNewPlayerEnabledV5: system.comYandexTvVideoplayer.isNewPlayerEnabledV5,
        isNewPlayerEnabledV6: system.comYandexTvVideoplayer.isNewPlayerEnabledV6,
        isSmartSkipEnabledV2: system.comYandexTvVideoplayer.isSmartSkipEnabledV2,
        manifestsDataSourceSettings: {
          cachedDataSourceContentIdsCount: system.comYandexTvVideoplayer.manifestsDataSourceSettings
            .cachedDataSourceContentIdsCount,
          cachedDataSourcePerContentIdsKbSize: system.comYandexTvVideoplayer.manifestsDataSourceSettings
            .cachedDataSourcePerContentIdsKbSize,
          isCachedDataSourceEnabled: system.comYandexTvVideoplayer.manifestsDataSourceSettings.isCachedDataSourceEnabled
        },
        mbuSettings: {
          mbuDoNotOverrideRh: system.comYandexTvVideoplayer.mbuSettings.mbuDoNotOverrideRh,
          mbuEnableForDynamic: system.comYandexTvVideoplayer.mbuSettings.mbuEnableForDynamic,
          mbuEnableMoveToUnbanned: system.comYandexTvVideoplayer.mbuSettings.mbuEnableMoveToUnbanned,
          mbuEnableUpdate: system.comYandexTvVideoplayer.mbuSettings.mbuEnableUpdate,
          mbuFallbackByAnyExc: system.comYandexTvVideoplayer.mbuSettings.mbuFallbackByAnyExc
        },
        optimizeConcurrentCommandExecutionV1: system.comYandexTvVideoplayer.optimizeConcurrentCommandExecutionV1,
        preloadVideoDataSettings: {
          isPreloadCacheStaticV1: system.comYandexTvVideoplayer.preloadVideoDataSettings.isPreloadCacheStaticV1,
          preloadVideoDataLifetime: system.comYandexTvVideoplayer.preloadVideoDataSettings.preloadVideoDataLifetime
        },
        preventAmlogic2MemoryLeak: system.comYandexTvVideoplayer.preventAmlogic2MemoryLeak,
        secureDecodersForClearVideo: system.comYandexTvVideoplayer.secureDecodersForClearVideo,
        shouldMonitorFrameDrops: system.comYandexTvVideoplayer.shouldMonitorFrameDrops,
        statusBarOnV2: system.comYandexTvVideoplayer.statusBarOnV2,
        stopAutoPlaybackTimeoutMs: system.comYandexTvVideoplayer.stopAutoPlaybackTimeoutMs,
        useArpcForReceiveSubscriptionOfferV5: system.comYandexTvVideoplayer.useArpcForReceiveSubscriptionOfferV5,
        useArpcForVideoMetadataV4: system.comYandexTvVideoplayer.useArpcForVideoMetadataV4,
        useBandwidthLastValueProvider: system.comYandexTvVideoplayer.useBandwidthLastValueProvider,
        useManualAdBreaks: system.comYandexTvVideoplayer.useManualAdBreaks,
        useNewKinopoiskOttMovieStrategyV1: system.comYandexTvVideoplayer.useNewKinopoiskOttMovieStrategyV1,
        useNewKinopoiskOttSportStrategyV1: system.comYandexTvVideoplayer.useNewKinopoiskOttSportStrategyV1,
        useQuasarPlatformAsFromBlockParameter: system.comYandexTvVideoplayer.useQuasarPlatformAsFromBlockParameter,
        useReleaseInsteadStopV1: system.comYandexTvVideoplayer.useReleaseInsteadStopV1
      },
      'com.yandex.tv.webplayer': {
        bufferSizeInSeconds: system.comYandexTvWebplayer.bufferSizeInSeconds,
        doc2Doc: {
          doc2DocEnabledV2: system.comYandexTvWebplayer.doc2Doc.doc2DocEnabledV2,
          voiceControlsEnabledV2: system.comYandexTvWebplayer.doc2Doc.voiceControlsEnabledV2
        },
        isEpisodesButtonEnabled: system.comYandexTvWebplayer.isEpisodesButtonEnabled,
        isNextVideoButtonEnabled: system.comYandexTvWebplayer.isNextVideoButtonEnabled,
        pointerEnabledV1: system.comYandexTvWebplayer.pointerEnabledV1,
        supportedPlayers: Object.fromEntries(
          Object.entries(system.comYandexTvWebplayer.supportedPlayers).map(([key, value]) => [key, {
            additionalVideoUrlParams: value.additionalVideoUrlParams,
            ignoreWebViewErrors: value.ignoreWebViewErrors,
            sandboxName: value.sandboxName,
            sandboxVersion: value.sandboxVersion,
            showNativeSubtitles: value.showNativeSubtitles,
            useJsControlsScript: value.useJsControlsScript,
            useNativeOverlayV5: value.useNativeOverlayV5,
            userAgent: value.userAgent
          }])
        ),
        useBrowserMediaSessionV2: system.comYandexTvWebplayer.useBrowserMediaSessionV2,
        voiceControlsTracksEnabled: system.comYandexTvWebplayer.voiceControlsTracksEnabled
      },
      commandSpottersMode: system.commandSpottersMode,
      commandSpottersSoundDurations: system.commandSpottersSoundDurations,
      counter_activation: {
        aliceTimeToWin: system.counterActivation.aliceTimeToWin,
        commandTimeToWin: system.counterActivation.commandTimeToWin,
        enabled: system.counterActivation.enabled
      },
      device_control_panel: {
        checkAliceProSubscription: system.deviceControlPanel.checkAliceProSubscription
      },
      droidekaUrl: system.droidekaUrl,
      enableBackCommandSpotterForAnyContent: system.enableBackCommandSpotterForAnyContent,
      enableBiometryAccountOptions: system.enableBiometryAccountOptions,
      enableCommandSpotters: system.enableCommandSpotters,
      enableUpdateTtsDirectives_261: system.enableUpdateTtsDirectives261,
      env: {
        quasmodrom_group: system.analyticsEnvironment.quasmodromGroup,
        quasmodrom_subgroup: system.analyticsEnvironment.quasmodromSubgroup,
        test_buckets: system.analyticsEnvironment.testBuckets,
        testids: system.analyticsEnvironment.testids
      },
      equalizer: {
        type: system.equalizer.type
      },
      experiments: system.experiments,
      fast_command_requester: {
        useTvOnWithBiometry: system.fastCommandRequester.useTvOnWithBiometry
      },
      'fluent-bit': {
        level: system.fluentBit.level,
        samplingRatio: system.fluentBit.samplingRatio,
        variables: {
          daemonsLogsDst: system.fluentBit.variables.daemonsLogsDst,
          flushInterval: system.fluentBit.variables.flushInterval,
          httpRetryLimit: system.fluentBit.variables.httpRetryLimit,
          ipcLogsDst: system.fluentBit.variables.ipcLogsDst,
          kernelLogsDst: system.fluentBit.variables.kernelLogsDst,
          libLogsDst: system.fluentBit.variables.libLogsDst,
          logcatDst: system.fluentBit.variables.logcatDst
        }
      },
      forceWifiReconfigure: system.forceWifiReconfigure,
      gamerCopilot: {
        enableGamerCopilotSettings: system.gamerCopilot.enableGamerCopilotSettings,
        sendAskForHdcpInstructionTcb: system.gamerCopilot.sendAskForHdcpInstructionTcb,
        useCachedScreenshotWhenOnConsoles: system.gamerCopilot.useCachedScreenshotWhenOnConsoles
      },
      geoSyncSchedulerSettings: {
        enabled: system.geoSyncSchedulerSettings.enabled
      },
      glagold: {
        enabled: system.glagold.enabled,
        enableEndpointProtocol: system.glagold.enableEndpointProtocol,
        peersExchange: system.glagold.peersExchange,
        useFamilyDeviceList: system.glagold.useFamilyDeviceList
      },
      glagolHeartbeat: system.glagolHeartbeat,
      hybrid_request_factory: {
        hybrid: {
          scenarios: {
            fast_command_scenario: {
              enable_local_continue_for_video_player: system.hybridRequestFactory.hybrid.scenarios
                .fastCommandScenario.enableLocalContinueForVideoPlayer,
              enable_local_stop_for_video_player: system.hybridRequestFactory.hybrid.scenarios
                .fastCommandScenario.enableLocalStopForVideoPlayer,
              enable_local_tts_stop: system.hybridRequestFactory.hybrid.scenarios.fastCommandScenario
                .enableLocalTtsStop,
              supported_frames: platform === 'chiron' || platform === 'magritte'
                ? system.hybridRequestFactory.hybrid.scenarios.fastCommandScenario.supportedFramesObject
                : system.hybridRequestFactory.hybrid.scenarios.fastCommandScenario.supportedFramesArray
            }
          }
        },
        hybrid_text_inputs: system.hybridRequestFactory.hybridTextInputs,
        ...(platform === 'chiron' || platform === 'magritte'
          ? {}
          : {
              hybrid_voice_inputs: system.hybridRequestFactory.hybridVoiceInputs,
            }),
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
      iot_scenarios: {
        syncOnNonExistingDb: system.iotScenarios.syncOnNonExistingDb
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
        hlsRandomizePlaylists: system.mediad.hlsRandomizePlaylists,
        useGstreamerAudioPlayer2: system.mediad.useGstreamerAudioPlayer2
      },
      metricsDumperPeriodSec: system.metricsDumperPeriodSec,
      multiroomd: {
        latency_ms: system.multiroomd.latencyMs
      },
      networkMetricaLoggingEnabled: system.networkMetricaLoggingEnabled,
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
      nsdInsteadOfAvahi: system.nsdInsteadOfAvahi,
      onlineSpotterEnabled: system.onlineSpotterEnabled,
      passportApi: {
        useAuthInfoProviderV2: system.passportApi.useAuthInfoProviderV2
      },
      phone_calls: {
        account_reg_config: {
          timeout_sec: system.phoneCalls.accountRegConfig.timeoutSec
        },
        ats_manager: system.phoneCalls.atsManager,
        block_updates_on_call: system.phoneCalls.blockUpdatesOnCall,
        enabled: system.phoneCalls.enabled,
        execute_server_callbacks: system.phoneCalls.executeServerCallbacks,
        pjsip: {
          enabled: system.phoneCalls.pjsip.enabled
        },
        register_on_add: system.phoneCalls.registerOnAdd,
        webrtc: {
          enabled: system.phoneCalls.webrtc.enabled
        }
      },
      pinger: {
        pings: system.pinger.pings.map(item => ({
          gateway: item.gateway,
          host: item.host,
          intervalMs: item.intervalMs,
          timeoutMs: item.timeoutMs
        })),
        socketType: system.pinger.socketType
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
      quick_pinger: {
        pings: system.quickPinger.pings.map(item => ({
          gateway: item.gateway,
          intervalMs: item.intervalMs,
          timeoutMs: item.timeoutMs
        })),
        socketType: system.quickPinger.socketType
      },
      sendCapabilityStateUpdates: system.sendCapabilityStateUpdates,
      sendVinsRequestProto: system.sendVinsRequestProto,
      shouldCheckWifi: system.shouldCheckWifi,
      smart_volume: {
        _android_overrides: system.smartVolume.androidOverrides.map(item => ({
          newFields: {
            splCalibShift: item.newFields.splCalibShift
          },
          properties: item.properties
        })),
        enabled: system.smartVolume.enabled,
        percentThresholds: system.smartVolume.percentThresholds.map(item => ({
          from: item.from,
          to: item.to.map(item => ({
            upperThresh: item.upperThresh,
            vol: item.vol
          }))
        })),
        skipFrames: system.smartVolume.skipFrames,
        soundWindowSize: system.smartVolume.soundWindowSize,
        splCalibSilence: system.smartVolume.splCalibSilence,
        splQuantile: system.smartVolume.splQuantile,
        volumeChangeDisableTimeout: system.smartVolume.volumeChangeDisableTimeout,
        volumeLevelSplsPercent: system.smartVolume.volumeLevelSplsPercent.map(item => ({
          spl: item.spl,
          vol: item.vol
        })),
        volumeRestoreRule: system.smartVolume.volumeRestoreRule,
        volumeSelectionStrategy: system.smartVolume.volumeSelectionStrategy
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
      speechkitLogChannels: system.speechkitLogChannels,
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
      tandemColorCodesConfig: Object.fromEntries(
        Object.entries(system.tandemColorCodesConfig).map(([key, value]) => [key, Object.fromEntries(
          Object.entries(value).map(([code, colors]) => [code, colors])
        )])
      ),
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
          buckets_count: system.telemetry.rateLimiter.bucketsCount,
          filtered_events: system.telemetry.rateLimiter.filteredEvents,
          groups: system.telemetry.rateLimiter.groups.map(g => ({
            count_limit: g.countLimit,
            events: g.events,
            interval_ms: g.intervalMs
          }))
        }
      },
      ttsAnnotationsMapper: {
        enabled: system.ttsAnnotationsMapper.enabled
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
      uniProxyUrl: system.uniProxyUrl,
      useActiveAccountGuestOptions: system.useActiveAccountGuestOptions,
      useDeviceStateRaw: system.useDeviceStateRaw,
      useEnvironmentStateRaw: system.useEnvironmentStateRaw,
      useVinsRequestProto: system.useVinsRequestProto,
      voice_activity_detector: {
        events_enabled: system.voiceActivityDetector.eventsEnabled
      },
      voiceDialogSettings: {
        activationSpotterSettings: {
          spotterLoggingRareEventPercent: system.voiceDialogSettings.activationSpotterSettings
            .spotterLoggingRareEventPercent,
          spotterLoggingRareEventTailMillis: system.voiceDialogSettings.activationSpotterSettings
            .spotterLoggingRareEventTailMillis,
          spotterLoggingVeryRareEventTailMillis: system.voiceDialogSettings.activationSpotterSettings
            .spotterLoggingVeryRareEventTailMillis
        },
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
          spotterLoggingRareEventPercent: system.voiceDialogSettings.intonationSpotterSettings
            .spotterLoggingRareEventPercent,
          spotterLoggingRareEventTailMillis: system.voiceDialogSettings.intonationSpotterSettings
            .spotterLoggingRareEventTailMillis,
          spotterLoggingVeryRareEventTailMillis: system.voiceDialogSettings.intonationSpotterSettings
            .spotterLoggingVeryRareEventTailMillis
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
        resetAfterTrigger: system.voiceDialogSettings.resetAfterTrigger,
        spotterLoggingHeadMillis: system.voiceDialogSettings.spotterLoggingHeadMillis,
        spotterLoggingRareEventPercent: system.voiceDialogSettings.spotterLoggingRareEventPercent,
        spotterLoggingTailMillis: system.voiceDialogSettings.spotterLoggingTailMillis,
        spotterLoggingVeryRareEventPercent: system.voiceDialogSettings.spotterLoggingVeryRareEventPercent,
        spotterLoggingVeryRareStreamingLengthMillis: system.voiceDialogSettings
          .spotterLoggingVeryRareStreamingLengthMillis,
        useCounterActivation: system.voiceDialogSettings.useCounterActivation,
        useProtoAliceApi: system.voiceDialogSettings.useProtoAliceApi
      },
      wifi_capability: {
        enabled_v2: system.wifiCapability.enabledV2,
        reassociateWhenNoInternet: system.wifiCapability.reassociateWhenNoInternet
      },
      wifi_reseter2: {
        minResetIntervalSec: system.wifiReseter2.minResetIntervalSec,
        noInternet: {
          intervalSec: system.wifiReseter2.noInternet.intervalSec,
          method: system.wifiReseter2.noInternet.method
        }
      },
      wifi_stats: {
        allBss: system.wifiStats.allBss,
        bothIE: system.wifiStats.bothIE,
        iface: system.wifiStats.iface,
        longCpblt: system.wifiStats.longCpblt,
        periodSec: system.wifiStats.periodSec,
        survey: system.wifiStats.survey,
        tids: system.wifiStats.tids
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
      YandexMusic: {
        volume: system.yandexMusic.volume
      },
      yandexTvGeneral: {
        connectivityMaxReachabilityCheckDelayS: system.yandexTvGeneral.connectivityMaxReachabilityCheckDelayS,
        mandatoryAuth: system.yandexTvGeneral.mandatoryAuth,
        marketUrl: system.yandexTvGeneral.marketUrl,
        networkErrorEventName: system.yandexTvGeneral.networkErrorEventName,
        networkMetricaLoggingEnabled: system.yandexTvGeneral.networkMetricaLoggingEnabled,
        networkRequestEventName: system.yandexTvGeneral.networkRequestEventName,
        notifyAndroidAboutNetworkState: system.yandexTvGeneral.notifyAndroidAboutNetworkState,
        notifyAndroidAboutNetworkStateV2: system.yandexTvGeneral.notifyAndroidAboutNetworkStateV2,
        quickPingsEnabled: system.yandexTvGeneral.quickPingsEnabled,
        shouldRetryServerErrors: system.yandexTvGeneral.shouldRetryServerErrors,
        tvChannelsProtoHttpEnabled: system.yandexTvGeneral.tvChannelsProtoHttpEnabled,
        useAndroidConnectivityManager: system.yandexTvGeneral.useAndroidConnectivityManager,
        yandexConnectivityCheckUrl: system.yandexTvGeneral.yandexConnectivityCheckUrl
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
