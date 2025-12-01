import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { TeamComp } from '../entities/team-comp.entity';
import { Champion } from '../entities/champion.entity';
import { TftUnit } from '../entities/tft-unit.entity';
import { Item } from '../entities/item.entity';
import { PowerUp } from '../entities/power-up.entity';
import { Trait } from '../entities/trait.entity';
import { CarouselItem } from '../entities/carousel-item.entity';
import { TeamOption } from '../entities/team-option.entity';
import { PositionedChampion } from '../entities/positioned-champion.entity';
import { EarlyCompChampion } from '../entities/early-comp-champion.entity';
import { TeamOptionChampion } from '../entities/team-option-champion.entity';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'mysql',
  host: configService.get<string>('DB_HOST', 'localhost'),
  port: configService.get<number>('DB_PORT', 3306),
  username: configService.get<string>('DB_USERNAME', 'root'),
  password: configService.get<string>('DB_PASSWORD', ''),
  database: configService.get<string>('DB_DATABASE', 'tftactics'),
  entities: [
    TeamComp,
    Champion,
    TftUnit,
    Item,
    PowerUp,
    Trait,
    CarouselItem,
    TeamOption,
    PositionedChampion,
    EarlyCompChampion,
    TeamOptionChampion,
  ],
  synchronize: configService.get<string>('NODE_ENV') !== 'production', // 开发环境自动同步表结构
  logging: configService.get<string>('NODE_ENV') === 'development',
  charset: 'utf8mb4',
  // 连接池配置
  extra: {
    connectionLimit: 10, // 最大连接数
    connectTimeout: 10000, // 连接超时（毫秒）
    acquireTimeout: 10000, // 获取连接超时（毫秒）
    timeout: 10000, // 查询超时（毫秒）
  },
  // 重试配置
  retryAttempts: 3, // 重试次数
  retryDelay: 3000, // 重试延迟（毫秒）
});

// 向后兼容：直接导出配置对象（使用环境变量）
export const databaseConfig: TypeOrmModuleOptions = {
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'tftactics',
  entities: [
    TeamComp,
    Champion,
    TftUnit,
    Item,
    PowerUp,
    Trait,
    CarouselItem,
    TeamOption,
    PositionedChampion,
    EarlyCompChampion,
    TeamOptionChampion,
  ],
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV === 'development',
  charset: 'utf8mb4',
  // 连接池配置
  extra: {
    connectionLimit: 10,
    connectTimeout: 10000,
    acquireTimeout: 10000,
    timeout: 10000,
  },
  // 重试配置
  retryAttempts: 3,
  retryDelay: 3000,
};
