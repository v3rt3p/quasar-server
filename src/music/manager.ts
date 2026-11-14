import { MusicTrack } from '@v3rt3p/types/music'
import { randomUUID } from 'node:crypto'

import { MusicBackend } from '../backend/backend'
import { getLogger } from '../logger'

export interface MusicSavedPosition {
  position: number
  trackId: string,
}

export class MusicManager {
  private readonly logger = getLogger<MusicManager>()

  private readonly positionCache: Map<string, MusicSavedPosition> = new Map()
  private readonly recoverCommitTokensMap: Map<string, string> = new Map()

  constructor (private readonly backend: MusicBackend) {}

  async advanceQueueBackward (deviceId: string): Promise<void> {
    this.positionCache.delete(deviceId)
    await this.backend.advanceQueueBackward(deviceId)
  }

  async advanceQueueForward (deviceId: string): Promise<void> {
    this.positionCache.delete(deviceId)
    await this.backend.advanceQueueForward(deviceId)
  }

  async getCurrentTrack (deviceId: string): Promise<MusicTrack | null> {
    return await this.backend.getCurrentTrack(deviceId)
  }

  getLastSavedPosition (deviceId: string): MusicSavedPosition | null {
    return this.positionCache.get(deviceId) ?? null
  }

  async getNextTrack (deviceId: string): Promise<null | {
    recoverCommitToken: string
    track: MusicTrack,
  }> {
    const nextTrack = await this.backend.getNextTrack(deviceId)
    if (nextTrack === null) {
      return null
    }
    const commitToken = randomUUID()
    this.recoverCommitTokensMap.set(deviceId, commitToken)
    return {
      recoverCommitToken: commitToken,
      track: nextTrack
    }
  }

  async recoverCommit (deviceId: string, token: string) {
    if (this.recoverCommitTokensMap.get(deviceId) === token) {
      this.recoverCommitTokensMap.delete(deviceId)
      await this.advanceQueueForward(deviceId)
    } else {
      this.logger.warn(`Failed to commit recover for ${deviceId}: ${this.recoverCommitTokensMap.get(token)} != ${token}`)
    }
  }

  savePosition (deviceId: string, position: MusicSavedPosition): void {
    this.positionCache.set(deviceId, position)
  }
}
