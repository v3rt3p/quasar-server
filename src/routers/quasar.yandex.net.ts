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
      alarmd: system.alarmd
        ? {
            disableTimerAfterFire: system.alarmd.disableTimerAfterFire,
            separatedDefaultSound: system.alarmd.separatedDefaultSound,
            timerSoundFilename: system.alarmd.timerSoundFilename
          }
        : undefined,
      aliced: system.aliced
        ? {
            aliceStreamingV2: system.aliced.aliceStreamingV2
              ? {
                  provideAliceState: system.aliced.aliceStreamingV2.provideAliceState
                }
              : undefined
          }
        : undefined,
      android_app: system.androidApp
        ? {
            Logging: system.androidApp.logging
              ? {
                  level: system.androidApp.logging.level
                }
              : undefined
          }
        : undefined,
      appmetrikaReportEnvironment: {
        quasmodrom_group: system.analyticsEnvironment.quasmodromGroup,
        quasmodrom_subgroup: system.analyticsEnvironment.quasmodromSubgroup,
        test_buckets: system.analyticsEnvironment.testBuckets,
        testids: system.analyticsEnvironment.testids
      },
      audio_player_capability: {
        enableMusicSets: system.audioPlayerCapability.enableMusicSets,
        enableSmartCrossfade: system.audioPlayerCapability.enableSmartCrossfade,
        pausePlayerOnStop: system.audioPlayerCapability.pausePlayerOnStop
      },
      audioclient: {
        gogol: {
          keepAlive: system.audioclient.gogol.keepAlive
        },
        playbackParams: system.audioclient.playbackParams
          ? {
              common: system.audioclient.playbackParams.common
                ? {
                    gstProperties: system.audioclient.playbackParams.common.gstProperties
                      ? {
                          SPECTRUM: system.audioclient.playbackParams.common.gstProperties.spectrum
                        }
                      : undefined
                  }
                : undefined
            }
          : undefined
      },
      audioInput: {
        audioDevice: {
          addInRateRawChannels: system.audioInput.audioDevice.addInRateRawChannels,
          vqeHardwareConfigV2: system.audioInput.audioDevice.vqeHardwareConfigV2
            ? {
                enableVqeOnDsp: system.audioInput.audioDevice.vqeHardwareConfigV2.enableVqeOnDsp
              }
            : undefined
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
      capabilityStateSender: system.capabilityStateSender
        ? {
            capabilityIdsWhitelist: system.capabilityStateSender.capabilityIdsWhitelist
          }
        : undefined,
      centaur: system.centaur
        ? {
            '298_nps_onboarding': system.centaur['298NpsOnboarding']
              ? {
                  critical: system.centaur['298NpsOnboarding'].critical,
                  enabled: system.centaur['298NpsOnboarding'].enabled
                }
              : undefined,
            accessible_voice: system.centaur.accessibleVoice
              ? {
                  accessibleVoiceConfig: system.centaur.accessibleVoice.accessibleVoiceConfig
                    ? {
                        accessibleVoicePackagesFilterConfig: system.centaur.accessibleVoice
                          .accessibleVoiceConfig.accessibleVoicePackagesFilterConfig
                          ? {
                              filterMode: system.centaur.accessibleVoice.accessibleVoiceConfig
                                .accessibleVoicePackagesFilterConfig.filterMode
                            }
                          : undefined,
                        enableReceivingOpenedAppEvents: system.centaur.accessibleVoice.accessibleVoiceConfig
                          .enableReceivingOpenedAppEvents,
                        useDialogsBackend: system.centaur.accessibleVoice.accessibleVoiceConfig.useDialogsBackend
                      }
                    : undefined
                }
              : undefined,
            alice_streaming_settings: system.centaur.aliceStreamingSettings
              ? {
                  markdownEnabled: system.centaur.aliceStreamingSettings.markdownEnabled,
                  printingDelay: system.centaur.aliceStreamingSettings.printingDelay,
                  streamingEnabled: system.centaur.aliceStreamingSettings.streamingEnabled
                }
              : undefined,
            animate_layers: system.centaur.animateLayers,
            app_store_config: system.centaur.appStoreConfig
              ? {
                  enabled: system.centaur.appStoreConfig.enabled,
                  enabled_apps_and_services_title: system.centaur.appStoreConfig.enabledAppsAndServicesTitle,
                  redesign_enabled: system.centaur.appStoreConfig.redesignEnabled,
                  yaos_store_name_enabled: system.centaur.appStoreConfig.yaosStoreNameEnabled
                }
              : undefined,
            appsVersions: system.centaur.appsVersions
              ? {
                  debounceMs: system.centaur.appsVersions.debounceMs,
                  isEnabled: system.centaur.appsVersions.isEnabled,
                  maxPackagesCount: system.centaur.appsVersions.maxPackagesCount,
                  usageStatsPeriodDays: system.centaur.appsVersions.usageStatsPeriodDays
                }
              : undefined,
            audio_config: system.centaur.audioConfig
              ? {
                  vqe_metrics_enabled: system.centaur.audioConfig.vqeMetricsEnabled,
                  vqe_metrics_timeout_min: system.centaur.audioConfig.vqeMetricsTimeoutMin
                }
              : undefined,
            autoRotate_enabled: system.centaur.autoRotateEnabled,
            bluetooth_player_settings: system.centaur.bluetoothPlayerSettings
              ? {
                  alice_toasts_on_off_events_enable: system.centaur.bluetoothPlayerSettings
                    .aliceToastsOnOffEventsEnable,
                  bluetooth_on_off_events_enable: system.centaur.bluetoothPlayerSettings.bluetoothOnOffEventsEnable
                }
              : undefined,
            brightness_settings: system.centaur.brightnessSettings
              ? {
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
                }
              : undefined,
            browser_lite_settings: system.centaur.browserLiteSettings
              ? {
                  clear_data_on_account_changed: system.centaur.browserLiteSettings.clearDataOnAccountChanged,
                  launch_from_start_activity_v2: system.centaur.browserLiteSettings.launchFromStartActivityV2
                }
              : undefined,
            camera_marks_detection: system.centaur.cameraMarksDetection
              ? {
                  colors_threshold: system.centaur.cameraMarksDetection.colorsThreshold,
                  enabled: system.centaur.cameraMarksDetection.enabled,
                  max_colors_distance: system.centaur.cameraMarksDetection.maxColorsDistance
                }
              : undefined,
            carousel_chrome_enabled: system.centaur.carouselChromeEnabled,
            carousel_server_updates: system.centaur.carouselServerUpdates,
            centaur_webview: system.centaur.centaurWebview
              ? {
                  analytics: system.centaur.centaurWebview.analytics
                    ? {
                        allowed_to_report_urls: system.centaur.centaurWebview.analytics.allowedToReportUrls,
                        enabled: system.centaur.centaurWebview.analytics.enabled
                      }
                    : undefined,
                  initial_scale_per_url: system.centaur.centaurWebview.initialScalePerUrl,
                  permissions: system.centaur.centaurWebview.permissions.map(item => ({
                    name: item.name,
                    white_list: item.whiteList
                  }))
                }
              : undefined,
            channel_list_config: system.centaur.channelListConfig
              ? {
                  tariff_options_supported_v2: system.centaur.channelListConfig.tariffOptionsSupportedV2
                }
              : undefined,
            click_daemon_settings: system.centaur.clickDaemonSettings
              ? {
                  crash_log_config: system.centaur.clickDaemonSettings.crashLogConfig
                    ? {
                        max_dropbox_text_entry_bytes: system.centaur.clickDaemonSettings.crashLogConfig
                          .maxDropboxTextEntryBytes,
                        white_list: system.centaur.clickDaemonSettings.crashLogConfig.whiteList
                      }
                    : undefined
                }
              : undefined,
            common_players_settings: system.centaur.commonPlayersSettings
              ? {
                  is_bluetooth_player_enabled: system.centaur.commonPlayersSettings.isBluetoothPlayerEnabled,
                  is_hls_video_play_enabled: system.centaur.commonPlayersSettings.isHlsVideoPlayEnabled,
                  is_music_player_enabled_v1: system.centaur.commonPlayersSettings.isMusicPlayerEnabledV1,
                  is_tv_player_enabled_v1: system.centaur.commonPlayersSettings.isTvPlayerEnabledV1,
                  is_video_player_enabled: system.centaur.commonPlayersSettings.isVideoPlayerEnabled,
                  is_web_player_enabled_v2: system.centaur.commonPlayersSettings.isWebPlayerEnabledV2,
                  is_web_rtc_video_play_enabled: system.centaur.commonPlayersSettings.isWebRtcVideoPlayEnabled
                }
              : undefined,
            cv: system.centaur.cv
              ? {
                  auto_crop: system.centaur.cv.autoCrop
                    ? {
                        animation: system.centaur.cv.autoCrop.animation
                          ? {
                              fps: system.centaur.cv.autoCrop.animation.fps,
                              min_horizontal_offset: system.centaur.cv.autoCrop.animation.minHorizontalOffset,
                              min_size_ratio: system.centaur.cv.autoCrop.animation.minSizeRatio,
                              min_vertical_offset: system.centaur.cv.autoCrop.animation.minVerticalOffset,
                              no_faces_timeout_ms: system.centaur.cv.autoCrop.animation.noFacesTimeoutMs,
                              poll_rate_ms: system.centaur.cv.autoCrop.animation.pollRateMs,
                              speed: system.centaur.cv.autoCrop.animation.speed,
                              switch_off_duration_ms: system.centaur.cv.autoCrop.animation.switchOffDurationMs
                            }
                          : undefined,
                        detection: system.centaur.cv.autoCrop.detection
                          ? {
                              max_face_height_ratio: system.centaur.cv.autoCrop.detection.maxFaceHeightRatio,
                              min_face_count_for_max_face_height_ratio: system.centaur.cv.autoCrop.detection
                                .minFaceCountForMaxFaceHeightRatio,
                              min_face_score: system.centaur.cv.autoCrop.detection.minFaceScore,
                              new_face_delay_ms: system.centaur.cv.autoCrop.detection.newFaceDelayMs,
                              remove_face_delay_ms: system.centaur.cv.autoCrop.detection.removeFaceDelayMs,
                              same_face_distance_ratio: system.centaur.cv.autoCrop.detection.sameFaceDistanceRatio,
                              same_face_max_size_ratio: system.centaur.cv.autoCrop.detection.sameFaceMaxSizeRatio
                            }
                          : undefined,
                        margin_bottom_ratio: system.centaur.cv.autoCrop.marginBottomRatio,
                        margin_left_ratio: system.centaur.cv.autoCrop.marginLeftRatio,
                        margin_right_ratio: system.centaur.cv.autoCrop.marginRightRatio,
                        margin_top_ratio: system.centaur.cv.autoCrop.marginTopRatio,
                        max_zoom: system.centaur.cv.autoCrop.maxZoom
                      }
                    : undefined,
                  auto_crop_portrait: system.centaur.cv.autoCropPortrait
                    ? {
                        animation: system.centaur.cv.autoCropPortrait.animation
                          ? {
                              fps: system.centaur.cv.autoCropPortrait.animation.fps,
                              min_horizontal_offset: system.centaur.cv.autoCropPortrait.animation.minHorizontalOffset,
                              min_size_ratio: system.centaur.cv.autoCropPortrait.animation.minSizeRatio,
                              min_vertical_offset: system.centaur.cv.autoCropPortrait.animation.minVerticalOffset,
                              no_faces_timeout_ms: system.centaur.cv.autoCropPortrait.animation.noFacesTimeoutMs,
                              poll_rate_ms: system.centaur.cv.autoCropPortrait.animation.pollRateMs,
                              speed: system.centaur.cv.autoCropPortrait.animation.speed,
                              switch_off_duration_ms: system.centaur.cv.autoCropPortrait.animation.switchOffDurationMs
                            }
                          : undefined,
                        detection: system.centaur.cv.autoCropPortrait.detection
                          ? {
                              max_face_height_ratio: system.centaur.cv.autoCropPortrait.detection.maxFaceHeightRatio,
                              min_face_count_for_max_face_height_ratio: system.centaur.cv.autoCropPortrait
                                .detection.minFaceCountForMaxFaceHeightRatio,
                              min_face_score: system.centaur.cv.autoCropPortrait.detection.minFaceScore,
                              new_face_delay_ms: system.centaur.cv.autoCropPortrait.detection.newFaceDelayMs,
                              remove_face_delay_ms: system.centaur.cv.autoCropPortrait.detection.removeFaceDelayMs,
                              same_face_distance_ratio: system.centaur.cv.autoCropPortrait.detection
                                .sameFaceDistanceRatio,
                              same_face_max_size_ratio: system.centaur.cv.autoCropPortrait.detection
                                .sameFaceMaxSizeRatio
                            }
                          : undefined,
                        margin_bottom_ratio: system.centaur.cv.autoCropPortrait.marginBottomRatio,
                        margin_left_ratio: system.centaur.cv.autoCropPortrait.marginLeftRatio,
                        margin_right_ratio: system.centaur.cv.autoCropPortrait.marginRightRatio,
                        margin_top_ratio: system.centaur.cv.autoCropPortrait.marginTopRatio,
                        max_zoom: system.centaur.cv.autoCropPortrait.maxZoom
                      }
                    : undefined,
                  features: system.centaur.cv.features,
                  gesture_recognizer: system.centaur.cv.gestureRecognizer
                    ? {
                        allow_chain: system.centaur.cv.gestureRecognizer.allowChain,
                        cv_camera: system.centaur.cv.gestureRecognizer.cvCamera
                          ? {
                              camera_block_producer: system.centaur.cv.gestureRecognizer.cvCamera.cameraBlockProducer,
                              camera_height: system.centaur.cv.gestureRecognizer.cvCamera.cameraHeight,
                              camera_queue_depth: system.centaur.cv.gestureRecognizer.cvCamera.cameraQueueDepth,
                              camera_width: system.centaur.cv.gestureRecognizer.cvCamera.cameraWidth
                            }
                          : undefined,
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
                      }
                    : undefined,
                  gestures: system.centaur.cv.gestures
                    ? {
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
                        system_camera: system.centaur.cv.gestures.systemCamera
                          ? {
                              rest_time_ms: system.centaur.cv.gestures.systemCamera.restTimeMs,
                              skip_frames_count: system.centaur.cv.gestures.systemCamera.skipFramesCount
                            }
                          : undefined
                      }
                    : undefined,
                  gestures_portrait: system.centaur.cv.gesturesPortrait
                    ? {
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
                        resume_reaction_allowed_activities: system.centaur.cv.gesturesPortrait
                          .resumeReactionAllowedActivities,
                        resume_reaction_allowed_cards: system.centaur.cv.gesturesPortrait
                          .resumeReactionAllowedCards.map(item => ({
                            name: item.name
                          })),
                        send_setting_tcb: system.centaur.cv.gesturesPortrait.sendSettingTcb,
                        skip_first_activation: system.centaur.cv.gesturesPortrait.skipFirstActivation,
                        system_camera: system.centaur.cv.gesturesPortrait.systemCamera
                          ? {
                              rest_time_ms: system.centaur.cv.gesturesPortrait.systemCamera.restTimeMs,
                              skip_frames_count: system.centaur.cv.gesturesPortrait.systemCamera.skipFramesCount
                            }
                          : undefined
                      }
                    : undefined,
                  service_enabled: system.centaur.cv.serviceEnabled,
                  visual_spotter: system.centaur.cv.visualSpotter
                    ? {
                        ignore_device_config_setting: system.centaur.cv.visualSpotter.ignoreDeviceConfigSetting,
                        soft_enable_count: system.centaur.cv.visualSpotter.softEnableCount
                      }
                    : undefined,
                  yandex_face_processor: system.centaur.cv.yandexFaceProcessor
                    ? {
                        models_config: system.centaur.cv.yandexFaceProcessor.modelsConfig
                          ? {
                              models_mapping: Object.fromEntries(
                                Object.entries(system.centaur.cv.yandexFaceProcessor.modelsConfig
                                  .modelsMapping).map(([key, value]) => [key, value])
                              )
                            }
                          : undefined
                      }
                    : undefined
                }
              : undefined,
            debug: system.centaur.debug
              ? {
                  adb_enabled: system.centaur.debug.adbEnabled
                }
              : undefined,
            div: system.centaur.div
              ? {
                  disable_assertions: system.centaur.div.disableAssertions,
                  disable_black_background: system.centaur.div.disableBlackBackground,
                  parse_on_background_thread: system.centaur.div.parseOnBackgroundThread,
                  scroll_angle: system.centaur.div.scrollAngle,
                  view_pool: system.centaur.div.viewPool
                    ? {
                        enabled: system.centaur.div.viewPool.enabled
                      }
                    : undefined
                }
              : undefined,
            enable_music_informer_next_track_button: system.centaur.enableMusicInformerNextTrackButton,
            enable_music_informer_skeleton: system.centaur.enableMusicInformerSkeleton,
            enable_night_mode_capability: system.centaur.enableNightModeCapability,
            enable_vertical_skeleton: system.centaur.enableVerticalSkeleton,
            enable_web_player_capability: system.centaur.enableWebPlayerCapability,
            enabled_platform_capabilities_ids: system.centaur.enabledPlatformCapabilitiesIds,
            familial_settings: system.centaur.familialSettings
              ? {
                  browser_text: system.centaur.familialSettings.browserText,
                  show_warnings: system.centaur.familialSettings.showWarnings,
                  telegram_text: system.centaur.familialSettings.telegramText,
                  youtube_text: system.centaur.familialSettings.youtubeText
                }
              : undefined,
            fragments_controller: system.centaur.fragmentsController
              ? {
                  type: system.centaur.fragmentsController.type
                }
              : undefined,
            framedrops_stats_v3: system.centaur.framedropsStatsV3
              ? {
                  is_enabled: system.centaur.framedropsStatsV3.isEnabled,
                  stats_collection_period_ms: system.centaur.framedropsStatsV3.statsCollectionPeriodMs,
                  stats_window_ms: system.centaur.framedropsStatsV3.statsWindowMs
                }
              : undefined,
            generate_204_settings: system.centaur.generate204Settings
              ? {
                  failPeriodMs: system.centaur.generate204Settings.failPeriodMs,
                  periodMs: system.centaur.generate204Settings.periodMs,
                  timeoutMs: system.centaur.generate204Settings.timeoutMs
                }
              : undefined,
            image_cache_settings: system.centaur.imageCacheSettings
              ? {
                  bitmap_cache_size_mb: system.centaur.imageCacheSettings.bitmapCacheSizeMb,
                  compressed_cache_size_mb: system.centaur.imageCacheSettings.compressedCacheSizeMb,
                  memory_trim_evict_level: system.centaur.imageCacheSettings.memoryTrimEvictLevel,
                  use_compressed_cache: system.centaur.imageCacheSettings.useCompressedCache
                }
              : undefined,
            informers_appearance_289: system.centaur.informersAppearance289,
            informers_enabled: system.centaur.informersEnabled,
            iocom: system.centaur.iocom
              ? {
                  enable_cold_capabilities: system.centaur.iocom.enableColdCapabilities,
                  use_active_connection_for_all_directives: system.centaur.iocom.useActiveConnectionForAllDirectives
                }
              : undefined,
            iosdk_reporter_settings: system.centaur.iosdkReporterSettings
              ? {
                  events_white_list: system.centaur.iosdkReporterSettings.eventsWhiteList
                }
              : undefined,
            iot_devices: system.centaur.iotDevices
              ? {
                  available_iot_devices_types: system.centaur.iotDevices.availableIotDevicesTypes,
                  offline_device_status_metrics_enabled: system.centaur.iotDevices.offlineDeviceStatusMetricsEnabled,
                  use_new_iot_devices_interactor: system.centaur.iotDevices.useNewIotDevicesInteractor
                }
              : undefined,
            is_io_client_features_enabled_v1: system.centaur.isIoClientFeaturesEnabledV1,
            js_inject: system.centaur.jsInject
              ? {
                  browser_url: system.centaur.jsInject.browserUrl,
                  smart_home_url: system.centaur.jsInject.smartHomeUrl,
                  youtube_url: system.centaur.jsInject.youtubeUrl
                }
              : undefined,
            'keyboard_screen_resize-settings': system.centaur.keyboardScreenResizeSettings,
            launcher_config: system.centaur.launcherConfig
              ? {
                  youtube_enabled: system.centaur.launcherConfig.youtubeEnabled
                }
              : undefined,
            lava_level: system.centaur.lavaLevel,
            leds: system.centaur.leds
              ? {
                  bluetooth_music_enabled: system.centaur.leds.bluetoothMusicEnabled,
                  bluetooth_play_animation_enabled: system.centaur.leds.bluetoothPlayAnimationEnabled,
                  enabled: system.centaur.leds.enabled,
                  health: system.centaur.leds.health
                    ? {
                        check_period_ms: system.centaur.leds.health.checkPeriodMs,
                        enabled: system.centaur.leds.health.enabled,
                        max_duration_playing_ms: system.centaur.leds.health.maxDurationPlayingMs,
                        timeout_ms: system.centaur.leds.health.timeoutMs
                      }
                    : undefined,
                  new_led_in_clock: system.centaur.leds.newLedInClock
                }
              : undefined,
            main_screen: system.centaur.mainScreen
              ? {
                  design: system.centaur.mainScreen.design,
                  timeout_seconds: system.centaur.mainScreen.timeoutSeconds,
                  use_timeout: system.centaur.mainScreen.useTimeout
                }
              : undefined,
            main_screen_server_updates: system.centaur.mainScreenServerUpdates,
            media_session_service_settings: system.centaur.mediaSessionServiceSettings
              ? {
                  enabled: system.centaur.mediaSessionServiceSettings.enabled,
                  video_supported_media_session_applications: system.centaur.mediaSessionServiceSettings
                    .videoSupportedMediaSessionApplications
                }
              : undefined,
            memory_analytics: system.centaur.memoryAnalytics
              ? {
                  enabled: system.centaur.memoryAnalytics.enabled,
                  memory_report_period_ms: system.centaur.memoryAnalytics.memoryReportPeriodMs
                }
              : undefined,
            meson: system.centaur.meson
              ? {
                  nightIntervalEnd: system.centaur.meson.nightIntervalEnd,
                  nightIntervalStart: system.centaur.meson.nightIntervalStart,
                  quarkIntegrationVersion: system.centaur.meson.quarkIntegrationVersion,
                  switchStrategy: system.centaur.meson.switchStrategy
                }
              : undefined,
            multi_account: system.centaur.multiAccount
              ? {
                  enable_accounts_suggest_v2: system.centaur.multiAccount.enableAccountsSuggestV2,
                  enabled: system.centaur.multiAccount.enabled,
                  enabled_multi_account_capability: system.centaur.multiAccount.enabledMultiAccountCapability,
                  need_update_settings: system.centaur.multiAccount.needUpdateSettings,
                  need_update_teasers: system.centaur.multiAccount.needUpdateTeasers
                }
              : undefined,
            multiapp: system.centaur.multiapp
              ? {
                  enabled_alice_ui_252: system.centaur.multiapp.enabledAliceUi252,
                  finish_task_on_hide: system.centaur.multiapp.finishTaskOnHide,
                  keep_alive_tasks_whitelist: system.centaur.multiapp.keepAliveTasksWhitelist,
                  registry: system.centaur.multiapp.registry
                    ? {
                        iosdk_capabilities: Object.fromEntries(
                          Object.entries(system.centaur.multiapp.registry.iosdkCapabilities)
                            .map(([key, value]) => [key, {
                              enable_strategy: value.enableStrategy,
                              hosts: value.hosts,
                              switch_strategy: value.switchStrategy
                            }])
                        )
                      }
                    : undefined
                }
              : undefined,
            music_player_config: system.centaur.musicPlayerConfig
              ? {
                  debounce_for_lyrics_toggle: system.centaur.musicPlayerConfig.debounceForLyricsToggle,
                  delay_for_lyrics_view: system.centaur.musicPlayerConfig.delayForLyricsView,
                  disclaimer_config: system.centaur.musicPlayerConfig.disclaimerConfig
                    ? {
                        enabled: system.centaur.musicPlayerConfig.disclaimerConfig.enabled,
                        timeout_to_hide_disclaimer: system.centaur.musicPlayerConfig.disclaimerConfig
                          .timeoutToHideDisclaimer
                      }
                    : undefined,
                  enable_bluetooth_player_v1: system.centaur.musicPlayerConfig.enableBluetoothPlayerV1,
                  karaoke_mode_enabled_v1: system.centaur.musicPlayerConfig.karaokeModeEnabledV1,
                  lyrics_mode_enabled_v1: system.centaur.musicPlayerConfig.lyricsModeEnabledV1,
                  playlist_config: system.centaur.musicPlayerConfig.playlistConfig
                    ? {
                        enable_listened_to_checkmarks: system.centaur.musicPlayerConfig.playlistConfig
                          .enableListenedToCheckmarks,
                        enable_modal_dialog: system.centaur.musicPlayerConfig.playlistConfig.enableModalDialog,
                        enabled: system.centaur.musicPlayerConfig.playlistConfig.enabled
                      }
                    : undefined,
                  redesign_enabled: system.centaur.musicPlayerConfig.redesignEnabled
                }
              : undefined,
            music_player_settings: system.centaur.musicPlayerSettings
              ? {
                  default_cover_image_297_enabled: system.centaur.musicPlayerSettings.defaultCoverImage297Enabled,
                  hide_timeout_in_seconds: system.centaur.musicPlayerSettings.hideTimeoutInSeconds,
                  is_timeout_enabled: system.centaur.musicPlayerSettings.isTimeoutEnabled
                }
              : undefined,
            music_search: system.centaur.musicSearch
              ? {
                  horizontal_scroll_enabled: system.centaur.musicSearch.horizontalScrollEnabled,
                  indexes_load_extra: system.centaur.musicSearch.indexesLoadExtra,
                  initial_load_size: system.centaur.musicSearch.initialLoadSize,
                  max_item_count: system.centaur.musicSearch.maxItemCount,
                  page_size: system.centaur.musicSearch.pageSize,
                  prefetch_distance: system.centaur.musicSearch.prefetchDistance
                }
              : undefined,
            native_music_vertical_v2: system.centaur.nativeMusicVerticalV2
              ? {
                  enable_music_search: system.centaur.nativeMusicVerticalV2.enableMusicSearch,
                  enable_native_music_vertical: system.centaur.nativeMusicVerticalV2.enableNativeMusicVertical,
                  enable_search_history: system.centaur.nativeMusicVerticalV2.enableSearchHistory,
                  is_arpc_enabled: system.centaur.nativeMusicVerticalV2.isArpcEnabled,
                  play_card_as_my_wave: system.centaur.nativeMusicVerticalV2.playCardAsMyWave,
                  show_playback_info_in_card: system.centaur.nativeMusicVerticalV2.showPlaybackInfoInCard
                }
              : undefined,
            native_tv: system.centaur.nativeTv
              ? {
                  enable_native_tv_channels_list: system.centaur.nativeTv.enableNativeTvChannelsList,
                  is_common_grid_enabled: system.centaur.nativeTv.isCommonGridEnabled,
                  native_tv_skeleton_enabled: system.centaur.nativeTv.nativeTvSkeletonEnabled,
                  tariff_options_supported: system.centaur.nativeTv.tariffOptionsSupported
                }
              : undefined,
            native_video_player: system.centaur.nativeVideoPlayer
              ? {
                  enable_native_video_player: system.centaur.nativeVideoPlayer.enableNativeVideoPlayer
                }
              : undefined,
            new_home_screen: system.centaur.newHomeScreen
              ? {
                  enable_teasers_change_by_swipe: system.centaur.newHomeScreen.enableTeasersChangeBySwipe,
                  enabled: system.centaur.newHomeScreen.enabled,
                  lockscreen_return_delay_s: system.centaur.newHomeScreen.lockscreenReturnDelayS,
                  whitelisted_package_prefixes_in_grid: system.centaur.newHomeScreen.whitelistedPackagePrefixesInGrid
                }
              : undefined,
            new_video_skeleton: system.centaur.newVideoSkeleton,
            new_videoplayer_skin_enabled: system.centaur.newVideoplayerSkinEnabled,
            night_mode_config: system.centaur.nightModeConfig
              ? {
                  awake_device_on_alice_spotter: system.centaur.nightModeConfig.awakeDeviceOnAliceSpotter,
                  enable_custom_fonts: system.centaur.nightModeConfig.enableCustomFonts,
                  enable_red_clock_mode: system.centaur.nightModeConfig.enableRedClockMode,
                  enable_show_clock_switch: system.centaur.nightModeConfig.enableShowClockSwitch,
                  is_new_night_mode_enabled_v2: system.centaur.nightModeConfig.isNewNightModeEnabledV2,
                  is_new_night_mode_enabled_v4: system.centaur.nightModeConfig.isNewNightModeEnabledV4
                }
              : undefined,
            offline_mode_settings: system.centaur.offlineModeSettings
              ? {
                  enabled: system.centaur.offlineModeSettings.enabled,
                  glass_enabled: system.centaur.offlineModeSettings.glassEnabled,
                  internet_not_reachable_toast_enabled: system.centaur.offlineModeSettings
                    .internetNotReachableToastEnabled,
                  local_teaser_enabled: system.centaur.offlineModeSettings.localTeaserEnabled
                }
              : undefined,
            offline_mode_settings_v2: system.centaur.offlineModeSettingsV2
              ? {
                  local_teaser_enabled_v2: system.centaur.offlineModeSettingsV2.localTeaserEnabledV2
                }
              : undefined,
            parentalControlConfig: system.centaur.parentalControlConfig
              ? {
                  age_restriction_policy_enabled_v2: system.centaur.parentalControlConfig.ageRestrictionPolicyEnabledV2,
                  allowed_pin_enter_attempts: system.centaur.parentalControlConfig.allowedPinEnterAttempts,
                  app_whitelist_supported_v3: system.centaur.parentalControlConfig.appWhitelistSupportedV3,
                  can_block_video_search: system.centaur.parentalControlConfig.canBlockVideoSearch,
                  search_video_restrictions_notification_duration_ms: system.centaur.parentalControlConfig
                    .searchVideoRestrictionsNotificationDurationMs,
                  supported: system.centaur.parentalControlConfig.supported
                }
              : undefined,
            realtime_metrica_config: system.centaur.realtimeMetricaConfig
              ? {
                  whitelist: system.centaur.realtimeMetricaConfig.whitelist
                }
              : undefined,
            realtime_metrica_settings: system.centaur.realtimeMetricaSettings
              ? {
                  enable_send_crash_error: system.centaur.realtimeMetricaSettings.enableSendCrashError,
                  enable_send_log_error: system.centaur.realtimeMetricaSettings.enableSendLogError
                }
              : undefined,
            recents_informer_config_v2: system.centaur.recentsInformerConfigV2
              ? {
                  background_update_enabled: system.centaur.recentsInformerConfigV2.backgroundUpdateEnabled,
                  enabled: system.centaur.recentsInformerConfigV2.enabled,
                  internal_apps: system.centaur.recentsInformerConfigV2.internalApps,
                  is_organic_content_enabled: system.centaur.recentsInformerConfigV2.isOrganicContentEnabled,
                  max_items_count: system.centaur.recentsInformerConfigV2.maxItemsCount,
                  update_period_jitter: system.centaur.recentsInformerConfigV2.updatePeriodJitter,
                  update_period_s: system.centaur.recentsInformerConfigV2.updatePeriodS
                }
              : undefined,
            reporting: system.centaur.reporting
              ? {
                  cma_alloc_failed_report_debounce_ms: system.centaur.reporting.cmaAllocFailedReportDebounceMs
                }
              : undefined,
            screen_navigation_settings: system.centaur.screenNavigationSettings
              ? {
                  should_close_card_with_keyboard_on_go_back: system.centaur.screenNavigationSettings
                    .shouldCloseCardWithKeyboardOnGoBack,
                  swipes_enabled: system.centaur.screenNavigationSettings.swipesEnabled,
                  swipes_timeout: system.centaur.screenNavigationSettings.swipesTimeout,
                  voice_navigation_enabled: system.centaur.screenNavigationSettings.voiceNavigationEnabled
                }
              : undefined,
            should_filter_1080p_quality: system.centaur.shouldFilter1080pQuality,
            skip_video_fragment_directive_enabled: system.centaur.skipVideoFragmentDirectiveEnabled,
            smart_home_settings: system.centaur.smartHomeSettings
              ? {
                  enable_v2_app: system.centaur.smartHomeSettings.enableV2App,
                  is_active_in_background: system.centaur.smartHomeSettings.isActiveInBackground,
                  use_app: system.centaur.smartHomeSettings.useApp
                }
              : undefined,
            speaker_calls_enabled: system.centaur.speakerCallsEnabled,
            speaker_calls_on_top: system.centaur.speakerCallsOnTop,
            status_bar_config_v2: system.centaur.statusBarConfigV2
              ? {
                  enabled: system.centaur.statusBarConfigV2.enabled,
                  enabled_on_div_screens: system.centaur.statusBarConfigV2.enabledOnDivScreens
                }
              : undefined,
            system_dialogs: system.centaur.systemDialogs
              ? {
                  system_dialogs_interaction: system.centaur.systemDialogs.systemDialogsInteraction
                }
              : undefined,
            task_stack: system.centaur.taskStack
              ? {
                  enabled: system.centaur.taskStack.enabled,
                  offset_threshold: system.centaur.taskStack.offsetThreshold,
                  velocity_threshold: system.centaur.taskStack.velocityThreshold
                }
              : undefined,
            teasers_feature_config: system.centaur.teasersFeatureConfig
              ? {
                  teasers_settings_metrics_enabled: system.centaur.teasersFeatureConfig.teasersSettingsMetricsEnabled,
                  teasers_settings_metrics_send_period_minutes: system.centaur.teasersFeatureConfig
                    .teasersSettingsMetricsSendPeriodMinutes
                }
              : undefined,
            teasers_settings: system.centaur.teasersSettings
              ? {
                  advanced_bitmap_cache_size_mb: system.centaur.teasersSettings.advancedBitmapCacheSizeMb,
                  chunk_size: system.centaur.teasersSettings.chunkSize,
                  live_background_remove_strategy: system.centaur.teasersSettings.liveBackgroundRemoveStrategy,
                  native_teasers_enabled: system.centaur.teasersSettings.nativeTeasersEnabled,
                  preheat_teasers_count: system.centaur.teasersSettings.preheatTeasersCount,
                  teasers_auto_change_period_seconds: system.centaur.teasersSettings.teasersAutoChangePeriodSeconds,
                  teasers_debounce_config: system.centaur.teasersSettings.teasersDebounceConfig
                    ? {
                        from_min: system.centaur.teasersSettings.teasersDebounceConfig.fromMin,
                        to_min: system.centaur.teasersSettings.teasersDebounceConfig.toMin
                      }
                    : undefined,
                  teasers_request_period_min: system.centaur.teasersSettings.teasersRequestPeriodMin,
                  teasers_request_random_period: system.centaur.teasersSettings.teasersRequestRandomPeriod
                    ? {
                        fromMin: system.centaur.teasersSettings.teasersRequestRandomPeriod.fromMin,
                        toMin: system.centaur.teasersSettings.teasersRequestRandomPeriod.toMin
                      }
                    : undefined,
                  use_advanced_image_cache: system.centaur.teasersSettings.useAdvancedImageCache,
                  video_backgrounds_config: system.centaur.teasersSettings.videoBackgroundsConfig
                    ? {
                        backgrounds_directory_max_size_mb: system.centaur.teasersSettings
                          .videoBackgroundsConfig.backgroundsDirectoryMaxSizeMb,
                        is_external_downloading_enabled: system.centaur.teasersSettings
                          .videoBackgroundsConfig.isExternalDownloadingEnabled,
                        update_period_hours: system.centaur.teasersSettings.videoBackgroundsConfig.updatePeriodHours,
                        video_backgrounds_relevancy_time_days: system.centaur.teasersSettings
                          .videoBackgroundsConfig.videoBackgroundsRelevancyTimeDays
                      }
                    : undefined
                }
              : undefined,
            timers_settings: system.centaur.timersSettings
              ? {
                  auto_hide_card_on_day_delay_minutes: system.centaur.timersSettings.autoHideCardOnDayDelayMinutes,
                  auto_hide_card_on_night_delay_minutes: system.centaur.timersSettings.autoHideCardOnNightDelayMinutes
                }
              : undefined,
            top_sheet_settings: system.centaur.topSheetSettings
              ? {
                  advanced_top_sheet_enabled: system.centaur.topSheetSettings.advancedTopSheetEnabled,
                  music_player_enabled: system.centaur.topSheetSettings.musicPlayerEnabled
                }
              : undefined,
            tv_player_config: system.centaur.tvPlayerConfig
              ? {
                  allow_remote_configuration: system.centaur.tvPlayerConfig.allowRemoteConfiguration
                }
              : undefined,
            tv_settings: system.centaur.tvSettings
              ? {
                  enabled: system.centaur.tvSettings.enabled,
                  enabled_channels: system.centaur.tvSettings.enabledChannels
                }
              : undefined,
            use_backend_inactivity_timeout: system.centaur.useBackendInactivityTimeout,
            use_backend_settings: system.centaur.useBackendSettings,
            use_local_directive_pipe: system.centaur.useLocalDirectivePipe,
            use_master_clear_intent_for_reset: system.centaur.useMasterClearIntentForReset,
            use_serverside_activity_kinds: system.centaur.useServersideActivityKinds,
            use_stacked_layer_manager: system.centaur.useStackedLayerManager,
            use_yabro_view: system.centaur.useYabroView,
            video_app_config: system.centaur.videoAppConfig
              ? {
                  enabled: system.centaur.videoAppConfig.enabled
                }
              : undefined,
            video_calls: system.centaur.videoCalls
              ? {
                  buffer_time_min_for_delete_and_added_contacts: system.centaur.videoCalls
                    .bufferTimeMinForDeleteAndAddedContacts,
                  should_free_egl_on_destroy: system.centaur.videoCalls.shouldFreeEglOnDestroy,
                  telegram_calls_enabled: system.centaur.videoCalls.telegramCallsEnabled
                }
              : undefined,
            video_config: system.centaur.videoConfig
              ? {
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
                }
              : undefined,
            video_player_config: system.centaur.videoPlayerConfig
              ? {
                  allow_remote_configuration: system.centaur.videoPlayerConfig.allowRemoteConfiguration,
                  ignore_videometa_error: system.centaur.videoPlayerConfig.ignoreVideometaError,
                  use_arpc_for_video_metadata: system.centaur.videoPlayerConfig.useArpcForVideoMetadata
                }
              : undefined,
            video_player_control: system.centaur.videoPlayerControl
              ? {
                  enabled: system.centaur.videoPlayerControl.enabled
                }
              : undefined,
            video_search_config: system.centaur.videoSearchConfig
              ? {
                  enable_browser_button: system.centaur.videoSearchConfig.enableBrowserButton,
                  enable_native_search: system.centaur.videoSearchConfig.enableNativeSearch
                }
              : undefined,
            web_player_config: system.centaur.webPlayerConfig
              ? {
                  doc_2_doc_enabled_v3: system.centaur.webPlayerConfig.doc2DocEnabledV3,
                  supported_players: Object.fromEntries(
                    Object.entries(system.centaur.webPlayerConfig.supportedPlayers).map(([key, value]) => [key, value
                      ? {
                          additional_video_url_params: value.additionalVideoUrlParams
                            ? {
                                partner_name: value.additionalVideoUrlParams.partnerName
                              }
                            : undefined,
                          ignore_web_view_errors: value.ignoreWebViewErrors,
                          sandbox_name: value.sandboxName,
                          sandbox_version: value.sandboxVersion,
                          use_js_controls_script: value.useJsControlsScript,
                          user_agent: value.userAgent
                        }
                      : undefined])
                  ),
                  use_browser_media_session: system.centaur.webPlayerConfig.useBrowserMediaSession,
                  voice_controls_enabled_v3: system.centaur.webPlayerConfig.voiceControlsEnabledV3
                }
              : undefined,
            web_player_settings: system.centaur.webPlayerSettings
              ? {
                  supported_players: Object.fromEntries(
                    Object.entries(system.centaur.webPlayerSettings.supportedPlayers).map(([key, value]) => [key, {
                      sandbox_name: value.sandboxName,
                      sandbox_version: value.sandboxVersion,
                      use_custom_js_script: value.useCustomJsScript
                    }])
                  )
                }
              : undefined,
            widgets_v2: system.centaur.widgetsV2
              ? {
                  enable: system.centaur.widgetsV2.enable,
                  smart_home: system.centaur.widgetsV2.smartHome
                    ? {
                        enabled: system.centaur.widgetsV2.smartHome.enabled,
                        open_device_enabled: system.centaur.widgetsV2.smartHome.openDeviceEnabled
                      }
                    : undefined
                }
              : undefined,
            youtube_inject: system.centaur.youtubeInject
              ? {
                  enable_voice_navigation: system.centaur.youtubeInject.enableVoiceNavigation,
                  enable_youtube_client: system.centaur.youtubeInject.enableYoutubeClient,
                  player_codecs: system.centaur.youtubeInject.playerCodecs
                    ? {
                        allowed: system.centaur.youtubeInject.playerCodecs.allowed,
                        disallowed: system.centaur.youtubeInject.playerCodecs.disallowed,
                        enabled: system.centaur.youtubeInject.playerCodecs.enabled
                      }
                    : undefined,
                  shorts_autoplay: system.centaur.youtubeInject.shortsAutoplay,
                  voice_item_selection: system.centaur.youtubeInject.voiceItemSelection
                }
              : undefined,
            youtube_player: system.centaur.youtubePlayer
              ? {
                  enabled: system.centaur.youtubePlayer.enabled
                }
              : undefined,
            youtube_urls_whitelist: system.centaur.youtubeUrlsWhitelist
          }
        : undefined,
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
      'com.yandex.centaur.applications.settings': system.comYandexCentaurApplicationsSettings
        ? {
            apps_settings_config: system.comYandexCentaurApplicationsSettings.appsSettingsConfig
              ? {
                  permissions_whitelist: system.comYandexCentaurApplicationsSettings.appsSettingsConfig
                    .permissionsWhitelist
                }
              : undefined,
            display_settings_config: system.comYandexCentaurApplicationsSettings.displaySettingsConfig
              ? {
                  enabled_features: system.comYandexCentaurApplicationsSettings.displaySettingsConfig.enabledFeatures
                }
              : undefined,
            enabled: system.comYandexCentaurApplicationsSettings.enabled,
            enabled_features: system.comYandexCentaurApplicationsSettings.enabledFeatures,
            management_config: system.comYandexCentaurApplicationsSettings.managementConfig
              ? {
                  intonation_interrupting_enabled: system.comYandexCentaurApplicationsSettings
                    .managementConfig.intonationInterruptingEnabled,
                  intonation_spotter_enabled: system.comYandexCentaurApplicationsSettings.managementConfig
                    .intonationSpotterEnabled,
                  visual_spotter_enabled: system.comYandexCentaurApplicationsSettings.managementConfig
                    .visualSpotterEnabled
                }
              : undefined,
            orientation_settings_config: system.comYandexCentaurApplicationsSettings.orientationSettingsConfig
              ? {
                  landscape_orientation_v2: system.comYandexCentaurApplicationsSettings
                    .orientationSettingsConfig.landscapeOrientationV2
                }
              : undefined,
            support_config: system.comYandexCentaurApplicationsSettings.supportConfig
              ? {
                  os_version: system.comYandexCentaurApplicationsSettings.supportConfig.osVersion,
                  show_check_updates_button: system.comYandexCentaurApplicationsSettings.supportConfig
                    .showCheckUpdatesButton
                }
              : undefined,
            wifi_settings_config: system.comYandexCentaurApplicationsSettings.wifiSettingsConfig
              ? {
                  scan_delay_seconds: system.comYandexCentaurApplicationsSettings.wifiSettingsConfig.scanDelaySeconds
                }
              : undefined
          }
        : undefined,
      'com.yandex.centaur.feature.auto.deflation': system.comYandexCentaurFeatureAutoDeflation
        ? {
            use_legacy_auto_deflation: system.comYandexCentaurFeatureAutoDeflation.useLegacyAutoDeflation
          }
        : undefined,
      'com.yandex.centaur.feature.music-ui': system.comYandexCentaurFeatureMusicUi
        ? {
            native_music_navigation: system.comYandexCentaurFeatureMusicUi.nativeMusicNavigation
              ? {
                  enabled: system.comYandexCentaurFeatureMusicUi.nativeMusicNavigation.enabled
                }
              : undefined
          }
        : undefined,
      'com.yandex.centaur.intercom.router': system.comYandexCentaurIntercomRouter
        ? {
            shouldLaunchWebcamForIntercomCalls: system.comYandexCentaurIntercomRouter.shouldLaunchWebcamForIntercomCalls
          }
        : undefined,
      'com.yandex.devices.appstore': system.comYandexDevicesAppstore
        ? {
            browserPackageName: system.comYandexDevicesAppstore.browserPackageName,
            debugLoggingEnabled: system.comYandexDevicesAppstore.debugLoggingEnabled,
            privateApps: system.comYandexDevicesAppstore.privateApps
              ? {
                  enabled: system.comYandexDevicesAppstore.privateApps.enabled,
                  subtitle: system.comYandexDevicesAppstore.privateApps.subtitle,
                  title: system.comYandexDevicesAppstore.privateApps.title,
                  url: system.comYandexDevicesAppstore.privateApps.url
                }
              : undefined,
            sendLogError: system.comYandexDevicesAppstore.sendLogError,
            showColoredGradient: system.comYandexDevicesAppstore.showColoredGradient,
            showSearchPlaceholder: system.comYandexDevicesAppstore.showSearchPlaceholder,
            showVoiceControls: system.comYandexDevicesAppstore.showVoiceControls
          }
        : undefined,
      'com.yandex.devices.clock': system.comYandexDevicesClock
        ? {
            alarms: system.comYandexDevicesClock.alarms
              ? {
                  isActionsAvailable: system.comYandexDevicesClock.alarms.isActionsAvailable,
                  isCardNumsVisible: system.comYandexDevicesClock.alarms.isCardNumsVisible,
                  isOnlyViewMode: system.comYandexDevicesClock.alarms.isOnlyViewMode,
                  isScheduleVoiceHintAvailable: system.comYandexDevicesClock.alarms.isScheduleVoiceHintAvailable,
                  isSoundVoiceHintAvailable: system.comYandexDevicesClock.alarms.isSoundVoiceHintAvailable,
                  snoozeDurationInMinutes: system.comYandexDevicesClock.alarms.snoozeDurationInMinutes,
                  useUtcTime: system.comYandexDevicesClock.alarms.useUtcTime
                }
              : undefined,
            enabled: system.comYandexDevicesClock.enabled,
            isCloseButtonVisible: system.comYandexDevicesClock.isCloseButtonVisible,
            new_playing_anim_enabled: system.comYandexDevicesClock.newPlayingAnimEnabled,
            timers: system.comYandexDevicesClock.timers
              ? {
                  isCardNumsVisible: system.comYandexDevicesClock.timers.isCardNumsVisible,
                  isOnlyViewMode: system.comYandexDevicesClock.timers.isOnlyViewMode,
                  showRecentTimers: system.comYandexDevicesClock.timers.showRecentTimers,
                  showTimerSetter: system.comYandexDevicesClock.timers.showTimerSetter
                }
              : undefined
          }
        : undefined,
      'com.yandex.devices.feature.musicplayer': system.comYandexDevicesFeatureMusicplayer
        ? {
            debounceForLyricsToggle: system.comYandexDevicesFeatureMusicplayer.debounceForLyricsToggle
          }
        : undefined,
      'com.yandex.devices.feature.musicplayer.ui': system.comYandexDevicesFeatureMusicplayerUi
        ? {
            coverFlipEnabled: system.comYandexDevicesFeatureMusicplayerUi.coverFlipEnabled,
            disclaimerConfig: system.comYandexDevicesFeatureMusicplayerUi.disclaimerConfig
              ? {
                  enabled: system.comYandexDevicesFeatureMusicplayerUi.disclaimerConfig.enabled,
                  timeoutToHideDisclaimer: system.comYandexDevicesFeatureMusicplayerUi.disclaimerConfig
                    .timeoutToHideDisclaimer
                }
              : undefined,
            karaokeModeEnabledV1: system.comYandexDevicesFeatureMusicplayerUi.karaokeModeEnabledV1,
            keepScreenOnWhilePlayingWithoutLyrics: system.comYandexDevicesFeatureMusicplayerUi
              .keepScreenOnWhilePlayingWithoutLyrics,
            lyricsModeEnabledV1: system.comYandexDevicesFeatureMusicplayerUi.lyricsModeEnabledV1,
            playlistConfig: system.comYandexDevicesFeatureMusicplayerUi.playlistConfig
              ? {
                  enabled: system.comYandexDevicesFeatureMusicplayerUi.playlistConfig.enabled
                }
              : undefined
          }
        : undefined,
      'com.yandex.devices.feature.tariffoffer.ui': system.comYandexDevicesFeatureTariffofferUi
        ? {
            fullscreenTariffOfferConfig: system.comYandexDevicesFeatureTariffofferUi.fullscreenTariffOfferConfig
              ? {
                  purchaseButtonText: system.comYandexDevicesFeatureTariffofferUi.fullscreenTariffOfferConfig
                    .purchaseButtonText
                }
              : undefined
          }
        : undefined,
      'com.yandex.devices.feature.tvchannelgrid.ui': system.comYandexDevicesFeatureTvchannelgridUi
        ? {
            isAddingToFavoritesEnabled: system.comYandexDevicesFeatureTvchannelgridUi.isAddingToFavoritesEnabled,
            tvGridVoiceControlsEnabled: system.comYandexDevicesFeatureTvchannelgridUi.tvGridVoiceControlsEnabled
          }
        : undefined,
      'com.yandex.devices.feature.tvchannellist': system.comYandexDevicesFeatureTvchannellist
        ? {
            channelFavouriteCategoryAtBeginning: system.comYandexDevicesFeatureTvchannellist
              .channelFavouriteCategoryAtBeginning,
            defaultChannelsUpdatePeriodMinutes: system.comYandexDevicesFeatureTvchannellist
              .defaultChannelsUpdatePeriodMinutes,
            programsRequestAdditionalMinutes: system.comYandexDevicesFeatureTvchannellist
              .programsRequestAdditionalMinutes,
            tariffOptionsSupported: system.comYandexDevicesFeatureTvchannellist.tariffOptionsSupported,
            useContentIdRequestStrategy: system.comYandexDevicesFeatureTvchannellist.useContentIdRequestStrategy
          }
        : undefined,
      'com.yandex.devices.feature.tvchannellist.ui': system.comYandexDevicesFeatureTvchannellistUi
        ? {
            channelListVoiceControlsEnabled: system.comYandexDevicesFeatureTvchannellistUi
              .channelListVoiceControlsEnabled
          }
        : undefined,
      'com.yandex.devices.feature.tvplayer.ui': system.comYandexDevicesFeatureTvplayerUi
        ? {
            isProgramsEnabledV1: system.comYandexDevicesFeatureTvplayerUi.isProgramsEnabledV1,
            useNewKinopoiskOttChannelWithScheduler: system.comYandexDevicesFeatureTvplayerUi
              .useNewKinopoiskOttChannelWithScheduler
          }
        : undefined,
      'com.yandex.devices.feature.videoplayer.ui': system.comYandexDevicesFeatureVideoplayerUi
        ? {
            ignoreVideometaError: system.comYandexDevicesFeatureVideoplayerUi.ignoreVideometaError,
            isSmartSkipEnabledV3: system.comYandexDevicesFeatureVideoplayerUi.isSmartSkipEnabledV3,
            stopAutoPlaybackTimeoutMs: system.comYandexDevicesFeatureVideoplayerUi.stopAutoPlaybackTimeoutMs
          }
        : undefined,
      'com.yandex.devices.feature.webcam.grid.ui': system.comYandexDevicesFeatureWebcamGridUi
        ? {
            showIntercomDevices: system.comYandexDevicesFeatureWebcamGridUi.showIntercomDevices
          }
        : undefined,
      'com.yandex.devices.feature.webcam.ui': system.comYandexDevicesFeatureWebcamUi
        ? {
            enableCameraRotation: system.comYandexDevicesFeatureWebcamUi.enableCameraRotation
          }
        : undefined,
      'com.yandex.devices.feature.webplayer.ui': system.comYandexDevicesFeatureWebplayerUi
        ? {
            bufferSizeInSeconds: system.comYandexDevicesFeatureWebplayerUi.bufferSizeInSeconds,
            supportedPlayers: Object.fromEntries(
              Object.entries(system.comYandexDevicesFeatureWebplayerUi.supportedPlayers).map(([key, value]) => [key, {
                additionalVideoUrlParams: value.additionalVideoUrlParams
                  ? {
                      partner_name: value.additionalVideoUrlParams.partnerName
                    }
                  : undefined,
                ignoreWebViewErrors: value.ignoreWebViewErrors,
                sandboxName: value.sandboxName,
                sandboxVersion: value.sandboxVersion,
                useJsControlsScript: value.useJsControlsScript,
                userAgent: value.userAgent
              }])
            ),
            useBrowserMediaSessionV2: system.comYandexDevicesFeatureWebplayerUi.useBrowserMediaSessionV2,
            voiceControlsEnabledV3: system.comYandexDevicesFeatureWebplayerUi.voiceControlsEnabledV3
          }
        : undefined,
      'com.yandex.devices.features.settings.configurer': system.comYandexDevicesFeaturesSettingsConfigurer
        ? {
            android_settings: system.comYandexDevicesFeaturesSettingsConfigurer.androidSettings
              ? {
                  enabled: system.comYandexDevicesFeaturesSettingsConfigurer.androidSettings.enabled,
                  secure_settings: system.comYandexDevicesFeaturesSettingsConfigurer.androidSettings.secureSettings
                    ? {
                        keyboard_bind_only_with_edit_info: system.comYandexDevicesFeaturesSettingsConfigurer
                          .androidSettings.secureSettings.keyboardBindOnlyWithEditInfo
                          ? {
                              value: system.comYandexDevicesFeaturesSettingsConfigurer.androidSettings
                                .secureSettings.keyboardBindOnlyWithEditInfo.value,
                              value_type: system.comYandexDevicesFeaturesSettingsConfigurer.androidSettings
                                .secureSettings.keyboardBindOnlyWithEditInfo.valueType
                            }
                          : undefined
                      }
                    : undefined
                }
              : undefined
          }
        : undefined,
      'com.yandex.devices.player': system.comYandexDevicesPlayer
        ? {
            ageRestrictionPolicyEnabledV2: system.comYandexDevicesPlayer.ageRestrictionPolicyEnabledV2,
            isCommonChannelListEnabled: system.comYandexDevicesPlayer.isCommonChannelListEnabled,
            usePaymentAppToBuyChannels: system.comYandexDevicesPlayer.usePaymentAppToBuyChannels,
            useTariffOfferRedesignWithoutQr: system.comYandexDevicesPlayer.useTariffOfferRedesignWithoutQr
          }
        : undefined,
      'com.yandex.devices.smarthome': system.comYandexDevicesSmarthome
        ? {
            enableEdgeToEdge: system.comYandexDevicesSmarthome.enableEdgeToEdge
          }
        : undefined,
      'com.yandex.devices.whatsnew': system.comYandexDevicesWhatsnew
        ? {
            supportedWhatsNewStorageFeatures: system.comYandexDevicesWhatsnew.supportedWhatsNewStorageFeatures
          }
        : undefined,
      'com.yandex.io.sdk': system.comYandexIoSdk
        ? {
            aliceSession: system.comYandexIoSdk.aliceSession
              ? {
                  enableUnconditionalShowSession: system.comYandexIoSdk.aliceSession.enableUnconditionalShowSession
                }
              : undefined,
            isVqeEnabled: system.comYandexIoSdk.isVqeEnabled
          }
        : undefined,
      'com.yandex.launcher.updaterapp': system.comYandexLauncherUpdaterapp
        ? {
            settings: system.comYandexLauncherUpdaterapp.settings
              ? {
                  abSilentInstallV2: system.comYandexLauncherUpdaterapp.settings.abSilentInstallV2
                    ? {
                        enabled: system.comYandexLauncherUpdaterapp.settings.abSilentInstallV2.enabled,
                        strategy: system.comYandexLauncherUpdaterapp.settings.abSilentInstallV2.strategy
                      }
                    : undefined,
                  allowFirmwareUpdate: system.comYandexLauncherUpdaterapp.settings.allowFirmwareUpdate
                    ? {
                        ota: system.comYandexLauncherUpdaterapp.settings.allowFirmwareUpdate.ota
                      }
                    : undefined,
                  allowFirmwareUpdateV2: system.comYandexLauncherUpdaterapp.settings.allowFirmwareUpdateV2
                    ? {
                        ota: system.comYandexLauncherUpdaterapp.settings.allowFirmwareUpdateV2.ota
                      }
                    : undefined,
                  apkSilentInstallV2: system.comYandexLauncherUpdaterapp.settings.apkSilentInstallV2
                    ? {
                        enabled: system.comYandexLauncherUpdaterapp.settings.apkSilentInstallV2.enabled,
                        strategy: system.comYandexLauncherUpdaterapp.settings.apkSilentInstallV2.strategy
                      }
                    : undefined,
                  appsToDeleteEnabled: system.comYandexLauncherUpdaterapp.settings.appsToDeleteEnabled,
                  autoCheckEnabled: system.comYandexLauncherUpdaterapp.settings.autoCheckEnabled,
                  confirmFirmwareUpdate: system.comYandexLauncherUpdaterapp.settings.confirmFirmwareUpdate
                    ? {
                        ota: system.comYandexLauncherUpdaterapp.settings.confirmFirmwareUpdate.ota
                      }
                    : undefined,
                  confirmFirmwareUpdateV2: system.comYandexLauncherUpdaterapp.settings.confirmFirmwareUpdateV2
                    ? {
                        ota: system.comYandexLauncherUpdaterapp.settings.confirmFirmwareUpdateV2.ota,
                        useService: system.comYandexLauncherUpdaterapp.settings.confirmFirmwareUpdateV2.useService
                      }
                    : undefined,
                  nightIntervalEnd: system.comYandexLauncherUpdaterapp.settings.nightIntervalEnd,
                  nightIntervalStart: system.comYandexLauncherUpdaterapp.settings.nightIntervalStart,
                  notifications: system.comYandexLauncherUpdaterapp.settings.notifications,
                  notifyReboot: system.comYandexLauncherUpdaterapp.settings.notifyReboot,
                  otaSilentInstallV2: system.comYandexLauncherUpdaterapp.settings.otaSilentInstallV2
                    ? {
                        enabled: system.comYandexLauncherUpdaterapp.settings.otaSilentInstallV2.enabled,
                        strategy: system.comYandexLauncherUpdaterapp.settings.otaSilentInstallV2.strategy
                      }
                    : undefined,
                  suwUpdateStrategy: system.comYandexLauncherUpdaterapp.settings.suwUpdateStrategy,
                  updateFrequencyJitterPercent: system.comYandexLauncherUpdaterapp.settings
                    .updateFrequencyJitterPercent,
                  updateFrequencyMin: system.comYandexLauncherUpdaterapp.settings.updateFrequencyMin,
                  updatesV4Api: system.comYandexLauncherUpdaterapp.settings.updatesV4Api,
                  updateVersionHeader: system.comYandexLauncherUpdaterapp.settings.updateVersionHeader
                    ? {
                        enabled: system.comYandexLauncherUpdaterapp.settings.updateVersionHeader.enabled,
                        rom_prop: system.comYandexLauncherUpdaterapp.settings.updateVersionHeader.romProp,
                        strategy: system.comYandexLauncherUpdaterapp.settings.updateVersionHeader.strategy
                      }
                    : undefined
                }
              : undefined
          }
        : undefined,
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
      'com.yandex.tv.services.platform': system.comYandexTvServicesPlatform
        ? {
            audioServerStateListenEnabled: system.comYandexTvServicesPlatform.audioServerStateListenEnabled
          }
        : undefined,
      commandSpottersMode: system.commandSpottersMode,
      counter_activation: system.counterActivation
        ? {
            aliceTimeToWin: system.counterActivation.aliceTimeToWin,
            commandTimeToWin: system.counterActivation.commandTimeToWin,
            enabled: system.counterActivation.enabled
          }
        : undefined,
      device_control_panel: {
        checkAliceProSubscription: system.deviceControlPanel.checkAliceProSubscription
      },
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
      equalizer: system.equalizer
        ? {
            type: system.equalizer.type
          }
        : undefined,
      experiments: system.experiments,
      'fluent-bit': {
        level: system.fluentBit.level,
        samplingRatio: system.fluentBit.samplingRatio,
        variables: system.fluentBit.variables
          ? {
              daemonsLogsDst: system.fluentBit.variables.daemonsLogsDst,
              flushInterval: system.fluentBit.variables.flushInterval,
              httpRetryLimit: system.fluentBit.variables.httpRetryLimit,
              ipcLogsDst: system.fluentBit.variables.ipcLogsDst,
              kernelLogsDst: system.fluentBit.variables.kernelLogsDst,
              logcatDst: system.fluentBit.variables.logcatDst
            }
          : undefined
      },
      forceWifiReconfigure: system.forceWifiReconfigure,
      geoSyncSchedulerSettings: {
        enabled: system.geoSyncSchedulerSettings.enabled
      },
      glagold: {
        enabled: system.glagold.enabled,
        enableEndpointProtocol: system.glagold.enableEndpointProtocol,
        peersExchange: system.glagold.peersExchange,
        useFamilyDeviceList: system.glagold.useFamilyDeviceList
      },
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
              supported_frames: platform === 'chiron'
                ? system.hybridRequestFactory.hybrid.scenarios.fastCommandScenario.supportedFramesObject
                : system.hybridRequestFactory.hybrid.scenarios.fastCommandScenario.supportedFramesArray
            }
          }
        },
        hybrid_text_inputs: system.hybridRequestFactory.hybridTextInputs,
        ...(platform === 'chiron'
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
      iot_scenarios: system.iotScenarios
        ? {
            syncOnNonExistingDb: system.iotScenarios.syncOnNonExistingDb
          }
        : undefined,
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
      metricsDumperPeriodSec: system.metricsDumperPeriodSec,
      multiroomd: system.multiroomd
        ? {
            latency_ms: system.multiroomd.latencyMs
          }
        : undefined,
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
      phone_calls: {
        account_reg_config: system.phoneCalls.accountRegConfig
          ? {
              timeout_sec: system.phoneCalls.accountRegConfig.timeoutSec
            }
          : undefined,
        ats_manager: system.phoneCalls.atsManager,
        block_updates_on_call: system.phoneCalls.blockUpdatesOnCall,
        enabled: system.phoneCalls.enabled,
        execute_server_callbacks: system.phoneCalls.executeServerCallbacks,
        pjsip: system.phoneCalls.pjsip
          ? {
              enabled: system.phoneCalls.pjsip.enabled
            }
          : undefined,
        register_on_add: system.phoneCalls.registerOnAdd,
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
      sendCapabilityStateUpdates: system.sendCapabilityStateUpdates,
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
      useActiveAccountGuestOptions: system.useActiveAccountGuestOptions,
      useVinsRequestProto: system.useVinsRequestProto,
      voice_activity_detector: {
        events_enabled: system.voiceActivityDetector.eventsEnabled
      },
      voiceDialogSettings: {
        activationSpotterSettings: system.voiceDialogSettings.activationSpotterSettings
          ? {
              spotterLoggingRareEventPercent: system.voiceDialogSettings.activationSpotterSettings
                .spotterLoggingRareEventPercent,
              spotterLoggingRareEventTailMillis: system.voiceDialogSettings.activationSpotterSettings
                .spotterLoggingRareEventTailMillis,
              spotterLoggingVeryRareEventTailMillis: system.voiceDialogSettings.activationSpotterSettings
                .spotterLoggingVeryRareEventTailMillis
            }
          : undefined,
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
      wifi_reseter2: system.wifiReseter2
        ? {
            minResetIntervalSec: system.wifiReseter2.minResetIntervalSec,
            noInternet: system.wifiReseter2.noInternet
              ? {
                  intervalSec: system.wifiReseter2.noInternet.intervalSec,
                  method: system.wifiReseter2.noInternet.method
                }
              : undefined
          }
        : undefined,
      wifi_stats: system.wifiStats
        ? {
            allBss: system.wifiStats.allBss,
            bothIE: system.wifiStats.bothIE,
            iface: system.wifiStats.iface,
            longCpblt: system.wifiStats.longCpblt,
            periodSec: system.wifiStats.periodSec,
            survey: system.wifiStats.survey,
            tids: system.wifiStats.tids
          }
        : undefined,
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
      yandexTvGeneral: system.yandexTvGeneral
        ? {
            networkErrorEventName: system.yandexTvGeneral.networkErrorEventName,
            networkMetricaLoggingEnabled: system.yandexTvGeneral.networkMetricaLoggingEnabled,
            networkRequestEventName: system.yandexTvGeneral.networkRequestEventName
          }
        : undefined,
      zigbee: {
        externalTemperatureMeasurement: {
          enabled: system.zigbee.externalTemperatureMeasurement.enabled,
          reportingIntervalSec: system.zigbee.externalTemperatureMeasurement.reportingIntervalSec
        }
      }
    }
  }
}
