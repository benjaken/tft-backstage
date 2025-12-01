import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeamComp } from '../entities/team-comp.entity';
import { Champion } from '../entities/champion.entity';
import { TftUnit } from '../entities/tft-unit.entity';
import { getBeijingTime, formatDateTime } from '../utils/time.util';
import { Item } from '../entities/item.entity';
import { PowerUp } from '../entities/power-up.entity';
import { Trait } from '../entities/trait.entity';
import { CarouselItem } from '../entities/carousel-item.entity';
import { TeamOption } from '../entities/team-option.entity';
import { PositionedChampion } from '../entities/positioned-champion.entity';
import { EarlyCompChampion } from '../entities/early-comp-champion.entity';
import { TeamOptionChampion } from '../entities/team-option-champion.entity';
import {
  TFTacticsResponseDto,
  TFTUnitsResponseDto,
  TeamComp as TeamCompDto,
  Champion as ChampionDto,
  Item as ItemDto,
  PowerUp as PowerUpDto,
  Trait as TraitDto,
  CarouselItem as CarouselItemDto,
  TeamOption as TeamOptionDto,
  PositionedChampion as PositionedChampionDto,
} from '../crawler/dto/tftactics.dto';

@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly CACHE_KEY_TEAM_COMPS = 'team_comps_all'; // 爬虫接口和 list 接口共享的缓存键
  private readonly CACHE_KEY_UPDATE_TIME = 'update_time';
  private readonly CACHE_KEY_UNITS_PREFIX = 'tft_units_season_';

  constructor(
    @InjectRepository(TeamComp)
    private teamCompRepository: Repository<TeamComp>,
    @InjectRepository(Champion)
    private championRepository: Repository<Champion>,
    @InjectRepository(TftUnit)
    private tftUnitRepository: Repository<TftUnit>,
    @InjectRepository(Item)
    private itemRepository: Repository<Item>,
    @InjectRepository(PowerUp)
    private powerUpRepository: Repository<PowerUp>,
    @InjectRepository(Trait)
    private traitRepository: Repository<Trait>,
    @InjectRepository(CarouselItem)
    private carouselItemRepository: Repository<CarouselItem>,
    @InjectRepository(TeamOption)
    private teamOptionRepository: Repository<TeamOption>,
    @InjectRepository(PositionedChampion)
    private positionedChampionRepository: Repository<PositionedChampion>,
    @InjectRepository(EarlyCompChampion)
    private earlyCompChampionRepository: Repository<EarlyCompChampion>,
    @InjectRepository(TeamOptionChampion)
    private teamOptionChampionRepository: Repository<TeamOptionChampion>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * 保存英雄（单位）基础数据，支持多赛季
   * 使用 (season, name) 作为唯一键，后续赛季（S16、S17 等）可以共存
   */
  async saveUnits(data: TFTUnitsResponseDto, season: string): Promise<void> {
    const now = getBeijingTime();
    for (const unit of data.champions) {
      let exist = await this.tftUnitRepository.findOne({
        where: {
          season,
          name: unit.name,
        },
      });

      if (!exist) {
        exist = this.tftUnitRepository.create({
          season,
          name: unit.name,
        });
      }

      exist.imageUrl = unit.imageUrl;
      exist.cost = unit.cost;
      exist.traits = unit.traits || [];
      exist.role = unit.role;
      exist.range = unit.range;
      exist.skillName = unit.skillName;
      exist.skillMana = unit.skillMana;
      exist.skillDescription = unit.skillDescription;
      exist.skillDetails = unit.skillDetails || [];
      exist.updatedAt = now;

      await this.tftUnitRepository.save(exist);
    }

    // 同步写入 Redis 缓存，便于前端快速读取
    const cacheKey = `${this.CACHE_KEY_UNITS_PREFIX}${season}`;
    try {
      await this.cacheManager.set(cacheKey, data, 24 * 60 * 60 * 1000); // 24 小时
      this.logger.debug(
        `已将赛季 ${season} 的英雄数据写入 Redis 缓存，数量：${data.total}`,
      );
    } catch (error) {
      this.logger.warn('写入英雄数据 Redis 缓存失败:', error);
    }
  }

  /**
   * 按赛季获取英雄（单位）列表，优先读 Redis，没有则回源数据库
   */
  async getUnitsBySeason(season: string): Promise<TFTUnitsResponseDto> {
    const cacheKey = `${this.CACHE_KEY_UNITS_PREFIX}${season}`;

    // 1. 先查 Redis
    try {
      const cached = await this.cacheManager.get<TFTUnitsResponseDto>(cacheKey);
      if (cached) {
        this.logger.debug(
          `从 Redis 获取赛季 ${season} 的英雄数据，数量：${cached.total}`,
        );
        return cached;
      }
    } catch (error) {
      this.logger.warn('读取英雄数据 Redis 缓存失败，将从数据库查询:', error);
    }

    // 2. 查数据库
    const units = await this.tftUnitRepository.find({
      where: { season },
      order: { id: 'ASC' },
    });

    if (units.length === 0) {
      return {
        champions: [],
        total: 0,
      };
    }

    const champions: ChampionDto[] = units.map((u) => ({
      name: u.name,
      imageUrl: u.imageUrl,
      cost: u.cost,
      traits: u.traits,
      role: u.role,
      range: u.range,
      skillName: u.skillName,
      skillMana: u.skillMana,
      skillDescription: u.skillDescription,
      skillDetails: u.skillDetails,
    }));

    const result: TFTUnitsResponseDto = {
      champions,
      total: champions.length,
    };

    // 3. 回写 Redis
    try {
      await this.cacheManager.set(cacheKey, result, 24 * 60 * 60 * 1000);
    } catch (error) {
      this.logger.warn('写入英雄数据 Redis 缓存失败:', error);
    }

    return result;
  }

  async saveTeamComps(data: TFTacticsResponseDto): Promise<void> {
    const crawlTime = getBeijingTime(); // 记录爬取时间（北京时间）

    for (const teamCompDto of data.teamComps) {
      // 检查团队组合是否已存在
      let savedTeamComp = await this.teamCompRepository.findOne({
        where: { name: teamCompDto.name },
      });

      if (!savedTeamComp) {
        // 保存团队组合
        const teamComp = this.teamCompRepository.create({
          name: teamCompDto.name,
          strategy: teamCompDto.strategy,
          isEmblem: teamCompDto.isEmblem || false,
          isAugment: teamCompDto.isAugment || false,
          teamCode: teamCompDto.teamCode,
          tier: teamCompDto.tier,
          lastCrawlTime: crawlTime,
        });
        savedTeamComp = await this.teamCompRepository.save(teamComp);
      } else {
        // 如果已存在，更新基本信息
        savedTeamComp.strategy = teamCompDto.strategy;
        savedTeamComp.isEmblem = teamCompDto.isEmblem || false;
        savedTeamComp.isAugment = teamCompDto.isAugment || false;
        savedTeamComp.teamCode = teamCompDto.teamCode;
        savedTeamComp.tier = teamCompDto.tier;
        savedTeamComp.lastCrawlTime = crawlTime; // 更新爬取时间
        savedTeamComp = await this.teamCompRepository.save(savedTeamComp);
      }

      // 保存英雄
      for (const championDto of teamCompDto.champions) {
        // 检查该团队组合中是否已存在同名英雄
        let savedChampion = await this.championRepository.findOne({
          where: {
            name: championDto.name,
            teamCompId: savedTeamComp.id,
          },
        });

        if (!savedChampion) {
          // 创建新英雄
          const champion = this.championRepository.create({
            name: championDto.name,
            imageUrl: championDto.imageUrl,
            starLevel: championDto.starLevel,
            isLocked: championDto.isLocked || false,
            unlockCondition: championDto.unlockCondition,
            teamCompId: savedTeamComp.id,
          });
          savedChampion = await this.championRepository.save(champion);
        } else {
          // 更新现有英雄
          savedChampion.imageUrl = championDto.imageUrl;
          savedChampion.starLevel = championDto.starLevel;
          savedChampion.isLocked = championDto.isLocked || false;
          savedChampion.unlockCondition = championDto.unlockCondition;
          savedChampion = await this.championRepository.save(savedChampion);
        }

        // 保存英雄的装备
        if (championDto.items && championDto.items.length > 0) {
          // 使用 Map 来去重，以装备名称为 key
          const itemsMap = new Map<string, Item>();

          for (const itemDto of championDto.items) {
            // 如果已经处理过同名装备，跳过
            if (itemsMap.has(itemDto.name)) {
              continue;
            }

            let item = await this.itemRepository.findOne({
              where: { name: itemDto.name },
            });

            if (!item) {
              item = this.itemRepository.create({
                name: itemDto.name,
                imageUrl: itemDto.imageUrl,
                identifier: itemDto.identifier,
                isLocked: itemDto.isLocked || false,
                unlockCondition: itemDto.unlockCondition,
              });
              item = await this.itemRepository.save(item);
            }
            itemsMap.set(itemDto.name, item);
          }

          // 将 Map 转换为数组
          const items = Array.from(itemsMap.values());

          // 先获取现有的关联关系
          const existingItems = await this.championRepository
            .createQueryBuilder()
            .relation(Champion, 'items')
            .of(savedChampion.id)
            .loadMany();

          const existingItemIds = (existingItems as Item[]).map(
            (item) => item.id,
          );
          // 去重：确保 newItemIds 中没有重复的 ID
          const newItemIds = Array.from(new Set(items.map((item) => item.id)));

          // 计算需要删除和添加的ID
          const itemsToRemove = existingItemIds.filter(
            (id) => !newItemIds.includes(id),
          );
          const itemsToAdd = newItemIds.filter(
            (id) => !existingItemIds.includes(id),
          );

          // 使用 addAndRemove 来更新关联关系
          if (itemsToRemove.length > 0) {
            await this.championRepository
              .createQueryBuilder()
              .relation(Champion, 'items')
              .of(savedChampion.id)
              .remove(itemsToRemove);
          }

          if (itemsToAdd.length > 0) {
            // 再次去重以确保安全
            const uniqueItemsToAdd = Array.from(new Set(itemsToAdd));
            await this.championRepository
              .createQueryBuilder()
              .relation(Champion, 'items')
              .of(savedChampion.id)
              .add(uniqueItemsToAdd);
          }
        } else {
          // 如果没有装备，清除所有关联
          const existingItems = await this.championRepository
            .createQueryBuilder()
            .relation(Champion, 'items')
            .of(savedChampion.id)
            .loadMany();

          if (existingItems && existingItems.length > 0) {
            const existingItemIds = (existingItems as Item[]).map(
              (item) => item.id,
            );
            await this.championRepository
              .createQueryBuilder()
              .relation(Champion, 'items')
              .of(savedChampion.id)
              .remove(existingItemIds);
          }
        }
      }

      // 保存 PowerUps
      if (teamCompDto.powerUps && teamCompDto.powerUps.length > 0) {
        for (const powerUpDto of teamCompDto.powerUps) {
          const powerUp = this.powerUpRepository.create({
            name: powerUpDto.name,
            imageUrl: powerUpDto.imageUrl,
            teamCompId: savedTeamComp.id,
          });
          await this.powerUpRepository.save(powerUp);
        }
      }

      // 保存特征
      if (teamCompDto.traits && teamCompDto.traits.length > 0) {
        for (const traitDto of teamCompDto.traits) {
          const trait = this.traitRepository.create({
            name: traitDto.name,
            iconUrl: traitDto.iconUrl,
            count: traitDto.count,
            isActive: traitDto.isActive || false,
            teamCompId: savedTeamComp.id,
          });
          await this.traitRepository.save(trait);
        }
      }

      // 保存轮盘装备
      if (teamCompDto.carousel && teamCompDto.carousel.length > 0) {
        for (const carouselDto of teamCompDto.carousel) {
          const carouselItem = this.carouselItemRepository.create({
            baseItemName: carouselDto.baseItem.name,
            baseItemImageUrl: carouselDto.baseItem.imageUrl,
            fullItemName: carouselDto.fullItem.name,
            fullItemImageUrl: carouselDto.fullItem.imageUrl,
            teamCompId: savedTeamComp.id,
          });
          await this.carouselItemRepository.save(carouselItem);
        }
      }

      // 保存选项
      if (teamCompDto.options && teamCompDto.options.length > 0) {
        for (const optionDto of teamCompDto.options) {
          // 保存替换出的英雄
          if (optionDto.out && optionDto.out.length > 0) {
            const teamOption = this.teamOptionRepository.create({
              level: optionDto.level,
              optionType: 'out',
              teamCompId: savedTeamComp.id,
            });
            const savedOption =
              await this.teamOptionRepository.save(teamOption);

            for (const championDto of optionDto.out) {
              let champion = await this.championRepository.findOne({
                where: { name: championDto.name, teamCompId: savedTeamComp.id },
              });

              if (!champion) {
                champion = this.championRepository.create({
                  name: championDto.name,
                  imageUrl: championDto.imageUrl,
                  teamCompId: savedTeamComp.id,
                });
                champion = await this.championRepository.save(champion);
              }

              const teamOptionChampion =
                this.teamOptionChampionRepository.create({
                  teamOptionId: savedOption.id,
                  championId: champion.id,
                });
              await this.teamOptionChampionRepository.save(teamOptionChampion);
            }
          }

          // 保存替换进的英雄
          if (optionDto.in && optionDto.in.length > 0) {
            const teamOption = this.teamOptionRepository.create({
              level: optionDto.level,
              optionType: 'in',
              teamCompId: savedTeamComp.id,
            });
            const savedOption =
              await this.teamOptionRepository.save(teamOption);

            for (const championDto of optionDto.in) {
              let champion = await this.championRepository.findOne({
                where: { name: championDto.name, teamCompId: savedTeamComp.id },
              });

              if (!champion) {
                champion = this.championRepository.create({
                  name: championDto.name,
                  imageUrl: championDto.imageUrl,
                  teamCompId: savedTeamComp.id,
                });
                champion = await this.championRepository.save(champion);
              }

              const teamOptionChampion =
                this.teamOptionChampionRepository.create({
                  teamOptionId: savedOption.id,
                  championId: champion.id,
                });
              await this.teamOptionChampionRepository.save(teamOptionChampion);
            }
          }
        }
      }

      // 保存早期组合
      if (teamCompDto.earlyComp && teamCompDto.earlyComp.champions) {
        for (const championDto of teamCompDto.earlyComp.champions) {
          let champion = await this.championRepository.findOne({
            where: { name: championDto.name, teamCompId: savedTeamComp.id },
          });

          if (!champion) {
            champion = this.championRepository.create({
              name: championDto.name,
              imageUrl: championDto.imageUrl,
              teamCompId: savedTeamComp.id,
            });
            champion = await this.championRepository.save(champion);
          }

          const earlyCompChampion = this.earlyCompChampionRepository.create({
            teamCompId: savedTeamComp.id,
            championId: champion.id,
          });
          await this.earlyCompChampionRepository.save(earlyCompChampion);
        }
      }

      // 保存站位
      if (teamCompDto.positioning && teamCompDto.positioning.length > 0) {
        for (const positionedDto of teamCompDto.positioning) {
          let champion = await this.championRepository.findOne({
            where: { name: positionedDto.name, teamCompId: savedTeamComp.id },
          });

          if (!champion) {
            champion = this.championRepository.create({
              name: positionedDto.name,
              imageUrl: positionedDto.imageUrl,
              teamCompId: savedTeamComp.id,
            });
            champion = await this.championRepository.save(champion);
          }

          const positionedChampion = this.positionedChampionRepository.create({
            x: positionedDto.x,
            y: positionedDto.y,
            teamCompId: savedTeamComp.id,
            championId: champion.id,
          });
          await this.positionedChampionRepository.save(positionedChampion);
        }
      }
    }

    // 清除缓存，因为数据已更新
    // 清除共享的缓存键，确保下次获取最新数据
    try {
      await this.cacheManager.del(this.CACHE_KEY_TEAM_COMPS); // 清除共享缓存（爬虫接口和 list 接口）
      await this.cacheManager.del(this.CACHE_KEY_UPDATE_TIME);
      this.logger.debug(
        '已清除 Redis 缓存（数据已更新，包括爬虫接口和列表接口的共享缓存）',
      );
    } catch (error) {
      this.logger.warn('Redis 缓存清除失败:', error);
    }
  }

  async getAllTeamComps(): Promise<TFTacticsResponseDto> {
    // 优先从 Redis 缓存获取数据
    try {
      const cachedData = await this.cacheManager.get<TFTacticsResponseDto>(
        this.CACHE_KEY_TEAM_COMPS,
      );
      if (cachedData) {
        this.logger.log(
          `✅ 从 Redis 缓存获取团队组合数据 (缓存键: ${this.CACHE_KEY_TEAM_COMPS})`,
        );
        return cachedData;
      } else {
        this.logger.log(
          `⚠️ Redis 缓存中没有数据 (缓存键: ${this.CACHE_KEY_TEAM_COMPS})，将从数据库查询`,
        );
      }
    } catch (error) {
      this.logger.error(
        '❌ Redis 缓存获取失败，将从数据库查询:',
        error instanceof Error ? error.message : error,
      );
    }

    // Redis 中没有数据，从数据库查询
    this.logger.log('📊 开始从数据库查询团队组合数据...');

    // 先快速检查是否有数据
    const count = await this.teamCompRepository.count();
    if (count === 0) {
      const emptyResult = {
        title: 'TFT Team Comps',
        teamComps: [],
        total: 0,
      };
      // 缓存空结果，但时间短一些
      try {
        await this.cacheManager.set(
          this.CACHE_KEY_TEAM_COMPS,
          emptyResult,
          60 * 1000,
        ); // 1 分钟
        this.logger.debug('已将空结果存入 Redis 缓存');
      } catch (error) {
        this.logger.warn('Redis 缓存存储失败:', error);
      }
      return emptyResult;
    }

    // 使用 QueryBuilder 一次性加载所有数据，避免多次查询
    // 使用 cache 可以进一步提升性能（可选）
    const teamComps = await this.teamCompRepository
      .createQueryBuilder('teamComp')
      .leftJoinAndSelect('teamComp.champions', 'champion')
      .leftJoinAndSelect('champion.items', 'item')
      .leftJoinAndSelect('teamComp.powerUps', 'powerUp')
      .leftJoinAndSelect('teamComp.traits', 'trait')
      .leftJoinAndSelect('teamComp.carousel', 'carousel')
      .leftJoinAndSelect('teamComp.options', 'option')
      .leftJoinAndSelect('teamComp.positioning', 'positioning')
      .leftJoinAndSelect('teamComp.earlyCompChampions', 'earlyCompChampion')
      .orderBy('teamComp.id', 'ASC')
      .getMany();

    // 批量加载所有需要的数据，避免 N+1 查询
    const allTeamCompIds = teamComps.map((tc) => tc.id);

    if (allTeamCompIds.length === 0) {
      return {
        title: 'TFT Team Comps',
        teamComps: [],
        total: 0,
      };
    }

    // 批量加载所有选项的英雄关联
    const allOptions = teamComps.flatMap((tc) => tc.options || []);
    const allOptionIds = allOptions.map((opt) => opt.id);
    const allOptionChampions =
      allOptionIds.length > 0
        ? await this.teamOptionChampionRepository
            .createQueryBuilder('toc')
            .leftJoinAndSelect('toc.champion', 'champion')
            .leftJoinAndSelect('champion.items', 'item')
            .where('toc.teamOptionId IN (:...ids)', { ids: allOptionIds })
            .getMany()
        : [];

    // 批量加载所有站位英雄
    const allPositioningChampions = await this.positionedChampionRepository
      .createQueryBuilder('pc')
      .leftJoinAndSelect('pc.champion', 'champion')
      .where('pc.teamCompId IN (:...ids)', { ids: allTeamCompIds })
      .getMany();

    // 批量加载所有早期组合英雄
    const allEarlyCompChampions = await this.earlyCompChampionRepository
      .createQueryBuilder('ecc')
      .leftJoinAndSelect('ecc.champion', 'champion')
      .leftJoinAndSelect('champion.items', 'item')
      .where('ecc.teamCompId IN (:...ids)', { ids: allTeamCompIds })
      .getMany();

    // 创建映射表以提高查询效率
    const optionChampionsMap = new Map<number, typeof allOptionChampions>();
    for (const oc of allOptionChampions) {
      if (!optionChampionsMap.has(oc.teamOptionId)) {
        optionChampionsMap.set(oc.teamOptionId, []);
      }
      optionChampionsMap.get(oc.teamOptionId)!.push(oc);
    }

    const positioningMap = new Map<number, typeof allPositioningChampions>();
    for (const pc of allPositioningChampions) {
      if (!positioningMap.has(pc.teamCompId)) {
        positioningMap.set(pc.teamCompId, []);
      }
      positioningMap.get(pc.teamCompId)!.push(pc);
    }

    const earlyCompMap = new Map<number, typeof allEarlyCompChampions>();
    for (const ecc of allEarlyCompChampions) {
      if (!earlyCompMap.has(ecc.teamCompId)) {
        earlyCompMap.set(ecc.teamCompId, []);
      }
      earlyCompMap.get(ecc.teamCompId)!.push(ecc);
    }

    // 转换为 DTO 格式
    const teamCompDtos: TeamCompDto[] = [];

    for (const teamComp of teamComps) {
      // 转换英雄
      const champions: ChampionDto[] = [];
      if (teamComp.champions) {
        for (const champion of teamComp.champions) {
          const championDto: ChampionDto = {
            name: champion.name,
            imageUrl: champion.imageUrl,
            starLevel: champion.starLevel,
            isLocked: champion.isLocked,
            unlockCondition: champion.unlockCondition,
          };

          // 转换英雄的装备
          if (champion.items && champion.items.length > 0) {
            championDto.items = champion.items.map((item) => ({
              name: item.name,
              imageUrl: item.imageUrl,
              identifier: item.identifier,
              isLocked: item.isLocked,
              unlockCondition: item.unlockCondition,
            }));
          }

          champions.push(championDto);
        }
      }

      // 转换 PowerUps
      const powerUps: PowerUpDto[] | undefined =
        teamComp.powerUps && teamComp.powerUps.length > 0
          ? teamComp.powerUps.map((powerUp) => ({
              name: powerUp.name,
              imageUrl: powerUp.imageUrl,
            }))
          : undefined;

      // 转换特征
      const traits: TraitDto[] | undefined =
        teamComp.traits && teamComp.traits.length > 0
          ? teamComp.traits.map((trait) => ({
              name: trait.name,
              iconUrl: trait.iconUrl,
              count: trait.count,
              isActive: trait.isActive,
            }))
          : undefined;

      // 转换轮盘装备
      const carousel: CarouselItemDto[] | undefined =
        teamComp.carousel && teamComp.carousel.length > 0
          ? teamComp.carousel.map((carouselItem) => ({
              baseItem: {
                name: carouselItem.baseItemName,
                imageUrl: carouselItem.baseItemImageUrl,
              },
              fullItem: {
                name: carouselItem.fullItemName,
                imageUrl: carouselItem.fullItemImageUrl,
              },
            }))
          : undefined;

      // 转换选项
      const options: TeamOptionDto[] | undefined =
        teamComp.options && teamComp.options.length > 0
          ? teamComp.options.map((option) => {
              const teamOptionDto: TeamOptionDto = {
                level: option.level,
              };

              // 从映射表中获取英雄关联
              const optionChampions = optionChampionsMap.get(option.id) || [];

              if (option.optionType === 'out') {
                teamOptionDto.out = optionChampions.map((oc) => {
                  const champDto: ChampionDto = {
                    name: oc.champion.name,
                    imageUrl: oc.champion.imageUrl,
                    starLevel: oc.champion.starLevel,
                    isLocked: oc.champion.isLocked,
                    unlockCondition: oc.champion.unlockCondition,
                  };

                  if (oc.champion.items && oc.champion.items.length > 0) {
                    champDto.items = oc.champion.items.map((item) => ({
                      name: item.name,
                      imageUrl: item.imageUrl,
                      identifier: item.identifier,
                      isLocked: item.isLocked,
                      unlockCondition: item.unlockCondition,
                    }));
                  }

                  return champDto;
                });
              } else if (option.optionType === 'in') {
                teamOptionDto.in = optionChampions.map((oc) => {
                  const champDto: ChampionDto = {
                    name: oc.champion.name,
                    imageUrl: oc.champion.imageUrl,
                    starLevel: oc.champion.starLevel,
                    isLocked: oc.champion.isLocked,
                    unlockCondition: oc.champion.unlockCondition,
                  };

                  if (oc.champion.items && oc.champion.items.length > 0) {
                    champDto.items = oc.champion.items.map((item) => ({
                      name: item.name,
                      imageUrl: item.imageUrl,
                      identifier: item.identifier,
                      isLocked: item.isLocked,
                      unlockCondition: item.unlockCondition,
                    }));
                  }

                  return champDto;
                });
              }

              return teamOptionDto;
            })
          : undefined;

      // 转换早期组合
      const earlyCompChampions = earlyCompMap.get(teamComp.id) || [];
      const earlyComp: { champions: ChampionDto[] } | undefined =
        earlyCompChampions.length > 0
          ? {
              champions: earlyCompChampions.map((ecc) => {
                const championDto: ChampionDto = {
                  name: ecc.champion.name,
                  imageUrl: ecc.champion.imageUrl,
                  starLevel: ecc.champion.starLevel,
                  isLocked: ecc.champion.isLocked,
                  unlockCondition: ecc.champion.unlockCondition,
                };

                if (ecc.champion.items && ecc.champion.items.length > 0) {
                  championDto.items = ecc.champion.items.map((item) => ({
                    name: item.name,
                    imageUrl: item.imageUrl,
                    identifier: item.identifier,
                    isLocked: item.isLocked,
                    unlockCondition: item.unlockCondition,
                  }));
                }

                return championDto;
              }),
            }
          : undefined;

      // 转换站位
      const positioningChampions = positioningMap.get(teamComp.id) || [];
      const positioning: PositionedChampionDto[] | undefined =
        positioningChampions.length > 0
          ? positioningChampions.map((pc) => ({
              name: pc.champion.name,
              imageUrl: pc.champion.imageUrl,
              x: pc.x,
              y: pc.y,
            }))
          : undefined;

      const teamCompDto: TeamCompDto = {
        name: teamComp.name,
        strategy: teamComp.strategy,
        isEmblem: teamComp.isEmblem,
        isAugment: teamComp.isAugment,
        champions,
        powerUps,
        teamCode: teamComp.teamCode,
        tier: teamComp.tier,
        earlyComp,
        traits,
        carousel,
        options,
        positioning,
      };

      teamCompDtos.push(teamCompDto);
    }

    const result = {
      title: 'TFT Team Comps',
      teamComps: teamCompDtos,
      total: teamCompDtos.length,
    };

    // 将查询结果存入 Redis 缓存，1 小时
    try {
      await this.cacheManager.set(
        this.CACHE_KEY_TEAM_COMPS,
        result,
        3600 * 1000,
      );
      this.logger.log(
        `✅ 已将团队组合数据存入 Redis 缓存 (缓存键: ${this.CACHE_KEY_TEAM_COMPS}，有效期: 1小时，数据量: ${result.total}个)`,
      );
    } catch (error) {
      this.logger.error('❌ Redis 缓存存储失败:', error);
    }

    return result;
  }

  async getUpdateTime(): Promise<{
    lastCrawlTime: string | null;
    totalCount: number;
  }> {
    // 优先从 Redis 缓存获取数据
    try {
      const cachedData = await this.cacheManager.get<{
        lastCrawlTime: string | null;
        totalCount: number;
      }>(this.CACHE_KEY_UPDATE_TIME);
      if (cachedData) {
        this.logger.debug('从 Redis 缓存获取更新时间');
        return cachedData;
      }
    } catch (error) {
      this.logger.warn('Redis 缓存获取失败，将从数据库查询:', error);
    }

    // Redis 中没有数据，从数据库查询
    this.logger.debug('从数据库查询更新时间');

    // 使用优化查询获取最新的爬取时间
    const result = await this.teamCompRepository
      .createQueryBuilder('teamComp')
      .select('MAX(teamComp.lastCrawlTime)', 'lastCrawlTime')
      .addSelect('COUNT(teamComp.id)', 'totalCount')
      .getRawOne();

    // 格式化时间为 YYYY-MM-DD HH:mm:ss（北京时间）
    const formattedTime =
      result?.lastCrawlTime && result.lastCrawlTime instanceof Date
        ? formatDateTime(result.lastCrawlTime)
        : null;

    const updateTimeData = {
      lastCrawlTime: formattedTime,
      totalCount: parseInt(
        typeof result?.totalCount === 'string'
          ? result.totalCount
          : String(result?.totalCount || '0'),
        10,
      ),
    };

    // 将查询结果存入 Redis 缓存，10 分钟
    try {
      await this.cacheManager.set(
        this.CACHE_KEY_UPDATE_TIME,
        updateTimeData,
        10 * 60 * 1000,
      );
      this.logger.debug('已将更新时间存入 Redis 缓存');
    } catch (error) {
      this.logger.warn('Redis 缓存存储失败:', error);
    }

    return updateTimeData;
  }
}
