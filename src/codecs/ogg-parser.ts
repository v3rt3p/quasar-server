export interface OggPage {
  absoluteGranulePosition: bigint;
  flags: {
    continuedPacket: boolean;
    firstPage: boolean;
    lastPage: boolean;
  };
  pageChecksum: number;
  pageSequenceNumber: number;
  segments: Buffer[];
  streamSerialNumber: number;
}

export const OggParser = {
  parse (chunk: Buffer): OggPage[] {
    const chunks: OggPage[] = []

    let position = 0
    const dataView = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength)
    while (position < dataView.byteLength) {
      const magic = dataView.getUint32(position, false)
      if (magic !== 0x4F_67_67_53) {
        throw new Error('Not an Ogg chunk')
      }
      const streamStructureVersion = dataView.getUint8(position + 4)
      if (streamStructureVersion !== 0) {
        throw new Error('Wrong Ogg stream structure version')
      }
      const headerTypeFlag = dataView.getUint8(position + 5)
      const absoluteGranulePosition = dataView.getBigUint64(position + 6, true)
      const streamSerialNumber = dataView.getUint32(position + 14, true)
      const pageSequenceNumber = dataView.getUint32(position + 18, true)
      const pageChecksum = dataView.getUint32(position + 22, true)
      const segmentsCount = dataView.getUint8(position + 26)
      const segmentSizes = []
      for (let index = 0; index < segmentsCount; index++) {
        segmentSizes.push(dataView.getUint8(position + 27 + index))
      }

      position += 27 + segmentsCount

      const segments = []
      for (const segmentSize of segmentSizes) {
        segments.push(chunk.subarray(position, position + segmentSize))
        position += segmentSize
      }

      chunks.push({
        absoluteGranulePosition,
        flags: {
          continuedPacket: (headerTypeFlag & 1) > 0,
          firstPage: (headerTypeFlag & 2) > 0,
          lastPage: (headerTypeFlag & 4) > 0,
        },
        pageChecksum,
        pageSequenceNumber,
        segments,
        streamSerialNumber
      })
    }
    return chunks
  },
}
