import { OpusEncoder } from '@discordjs/opus'

import { OggPage, OggParser } from './ogg-parser'

const OPUS_HEAD_BUFFER = Buffer.from([0x4F, 0x70, 0x75, 0x73, 0x48, 0x65, 0x61, 0x64])

interface OpusHead {
  channelCount: number;
  outputGain: number;
  preSkip: number;
  sampleRate: number;
}

export class OpusProcessor {
  private encoder: null | OpusEncoder = null

  constructor (private readonly onAudioData: (data: Buffer) => Promise<void>,
    private readonly onSampleRate: (sampleRate: number) => Promise<void>) {}

  async handleAudioData (audioData: Buffer): Promise<void> {
    const oggPages = OggParser.parse(audioData)
    for (const page of oggPages) {
      await this.handleOpusPage(page)
    }
  }

  private async handleOpusPage (page: OggPage): Promise<void> {
    if (page.pageSequenceNumber === 0) {
      const head = parseOpusHead(Buffer.concat(page.segments))
      if (head.channelCount !== 1) {
        throw new Error(`Unsupported number of channels: ${head.channelCount}`)
      }
      this.encoder = new OpusEncoder(head.sampleRate, head.channelCount)

      await this.onSampleRate(head.sampleRate)
      return
    }
    if (page.pageSequenceNumber === 1) {
      // skip page
      return
    }
    if (this.encoder === null) {
      throw new Error("Can't decode Opus without OpusHead before")
    }
    for (const segment of page.segments) {
      const decoded = this.encoder.decode(segment)
      await this.onAudioData(decoded)
    }
  }
}

function parseOpusHead (buffer: Buffer): OpusHead {
  const dataView = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  if (!buffer.subarray(0, 8).equals(OPUS_HEAD_BUFFER)) {
    throw new Error('OpusHead is not present in zero page')
  }
  if (dataView.getUint8(8) !== 1) {
    throw new Error('Wrong Opus version')
  }
  const channelCount = dataView.getUint8(9)
  const preSkip = dataView.getUint16(10, true)
  const sampleRate = dataView.getUint32(12, true)
  const outputGain = dataView.getUint16(14, true)
  const mappingFamily = dataView.getUint8(16)
  if (mappingFamily !== 0) {
    throw new Error('Unsupported mapping family')
  }
  return {
    channelCount,
    outputGain,
    preSkip,
    sampleRate
  }
}
