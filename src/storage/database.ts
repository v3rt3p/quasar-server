import { Column, DataSource, Entity, PrimaryColumn, Repository } from "typeorm";
import { glagolSecurity, QuasarConfig, quasarConfig, StationInfo, StationInfoProvider } from "./types";
import { generateGlagolSecurity, getDefaultQuasarConfig } from "./defaults";

@Entity("stations")
class Station {
  @PrimaryColumn("text")
  id!: string

  @Column("text")
  name!: string
  
  @Column("text")
  platform!: string
  
  @Column("jsonb")
  quasarConfig: unknown;
  
  @Column("jsonb")
  glagolSecurity: unknown;
  
  @Column("jsonb", {
    nullable: true
  })
  networkInfo: unknown;
}

function toInfo(station: Station): StationInfo {
  return {
    duid: station.id,
    name: station.name,
    platform: station.platform,
    quasarConfig: quasarConfig.parse(station.quasarConfig),
    networkInfo: station.networkInfo,
    glagolSecurity: glagolSecurity.parse(station.glagolSecurity)
  }
}

export class PostgresDatabaseStationInfoStorage implements StationInfoProvider {
  private readonly dataSource: DataSource

  constructor(url: string) {
    this.dataSource = new DataSource({
      type: "postgres",
      url: url,
      entities: [Station],
      synchronize: true
    })
  }

  async initialize(): Promise<void> {
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

  private async getOrCreate(duid: string, platform: string, 
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
        id: duid,
        platform: platform,
        name: `My Favourite Yandex Station No. ${Math.floor(Math.random() * 100000)}`,
        glagolSecurity: generateGlagolSecurity(),
        quasarConfig: getDefaultQuasarConfig(),
        networkInfo: null
      })
      await repository.save(newInfo)
      if (action) {
        await action(repository, newInfo)
      }
      return newInfo
    })
  }

  async getInfo(duid: string, platform: string): Promise<StationInfo> {
    const station = await this.getOrCreate(duid, platform)

    return toInfo(station)
  }

  async getStationInfos(): Promise<StationInfo[]> {
    const stations = await this.dataSource.getRepository<Station>(Station).find()

    return stations.map(toInfo)
  }

  async updateNameAndQuasarConfig(duid: string, name: string | undefined, config: QuasarConfig | undefined): Promise<StationInfo> {
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

  async updateNetworkInfo(duid: string, platform: string, networkInfo: unknown): Promise<StationInfo> {
    const station = await this.getOrCreate(duid, platform, async (repo, station) => {
      station.networkInfo = networkInfo
      await repo.save(station)
    })

    return toInfo(station)
  }
}