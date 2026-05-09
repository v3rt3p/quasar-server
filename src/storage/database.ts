import { Column, DataSource, Entity, PrimaryColumn, Repository } from 'typeorm'

import { generateGlagolSecurity, getDefaultQuasarConfig } from './defaults'
import { glagolSecurity, QuasarConfig, quasarConfig, StationInfo, StationInfoProvider } from './types'

@Entity('stations')
class Station {
  @Column('jsonb')
  glagolSecurity: unknown

  @PrimaryColumn('text')
  id!: string

  @Column('text')
  name!: string

  @Column('jsonb', {
    nullable: true
  })
  networkInfo: unknown

  @Column('text')
  platform!: string

  @Column('jsonb')
  quasarConfig: unknown
}

export class PostgresDatabaseStationInfoStorage implements StationInfoProvider {
  private readonly dataSource: DataSource

  constructor (url: string) {
    this.dataSource = new DataSource({
      entities: [Station],
      synchronize: true,
      type: 'postgres',
      url
    })
  }

  async getInfo (duid: string, platform: string): Promise<StationInfo> {
    const station = await this.getOrCreate(duid, platform)

    return toInfo(station)
  }

  async getStationInfos (): Promise<StationInfo[]> {
    const stations = await this.dataSource.getRepository<Station>(Station).find()

    return stations.map(toInfo)
  }

  async initialize (): Promise<void> {
    await this.dataSource.initialize()

    await this.dataSource.transaction(async manager => {
      const repository = manager.getRepository<Station>(Station)

      const infos = await repository.find()
      for (const info of infos) {
        info.quasarConfig = quasarConfig.parse(info.quasarConfig)
      }
      await repository.save(infos)
    })
  }

  async updateNameAndQuasarConfig (duid: string, name: string | undefined, config: QuasarConfig | undefined): Promise<StationInfo> {
    return toInfo(await this.dataSource.transaction(async manager => {
      const repository = manager.getRepository<Station>(Station)

      const existing = await repository.findOne({
        where: {
          id: duid
        }
      })

      if (!existing) {
        throw new Error('Station does not exist')
      }

      if (name !== undefined) {
        existing.name = name
      }
      if (config !== undefined) {
        existing.quasarConfig = config
      }

      await repository.save(existing)

      return existing
    }))
  }

  async updateNetworkInfo (duid: string, platform: string, networkInfo: unknown): Promise<StationInfo> {
    const station = await this.getOrCreate(duid, platform, async (repo, station) => {
      station.networkInfo = networkInfo
      await repo.save(station)
    })

    return toInfo(station)
  }

  private async getOrCreate (duid: string, platform: string,
    action?: (repo: Repository<Station>, station: Station) => Promise<void>): Promise<Station> {
    return await this.dataSource.transaction(async manager => {
      const repository = manager.getRepository<Station>(Station)

      const existing = await repository.findOne({
        where: {
          id: duid
        }
      })

      if (existing) {
        if (action) {
          await action(repository, existing)
        }

        return existing
      }

      const newInfo = repository.create({
        glagolSecurity: generateGlagolSecurity(),
        id: duid,
        name: `My Favourite Yandex Station No. ${Math.floor(Math.random() * 100_000)}`,
        networkInfo: null,
        platform,
        quasarConfig: getDefaultQuasarConfig()
      })
      await repository.save(newInfo)
      if (action) {
        await action(repository, newInfo)
      }
      return newInfo
    })
  }
}

function toInfo (station: Station): StationInfo {
  return {
    duid: station.id,
    glagolSecurity: glagolSecurity.parse(station.glagolSecurity),
    name: station.name,
    networkInfo: station.networkInfo,
    platform: station.platform,
    quasarConfig: quasarConfig.parse(station.quasarConfig)
  }
}
