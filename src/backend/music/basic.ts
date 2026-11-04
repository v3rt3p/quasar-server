import { musicTrack, MusicTrack } from '@v3rt3p/types/music'

import { MusicBackend } from '../backend'

export class BasicMusicBackend extends MusicBackend {
  constructor (private readonly baseUrl: string) {
    super()
  }

  async advanceQueueBackward (deviceId: string): Promise<void> {
    await fetch(`${this.baseUrl}/queue/${deviceId}/backward`, {
      method: 'POST'
    })
  }

  async advanceQueueForward (deviceId: string): Promise<void> {
    await fetch(`${this.baseUrl}/queue/${deviceId}/forward`, {
      method: 'POST'
    })
  }

  async getCurrentTrack (deviceId: string): Promise<MusicTrack | null> {
    const response = await fetch(`${this.baseUrl}/queue/${deviceId}/current`, {
      method: 'GET'
    })

    if (response.status === 404) {
      return null
    }

    const body = await response.json()

    return musicTrack.parse(body)
  }

  async getNextTrack (deviceId: string): Promise<MusicTrack | null> {
    const response = await fetch(`${this.baseUrl}/queue/${deviceId}/next`, {
      method: 'GET'
    })

    if (response.status === 404) {
      return null
    }

    const body = await response.json()

    return musicTrack.parse(body)
  }
}
