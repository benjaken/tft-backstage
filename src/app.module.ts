import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheModule } from '@nestjs/cache-manager';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CrawlerController } from './crawler/crawler.controller';
import { CrawlerService } from './crawler/crawler.service';
import { TFTacticsService } from './crawler/tftactics.service';
import { CrawlerScheduler } from './crawler/crawler.scheduler';
import { DatabaseService } from './database/database.service';
import { getDatabaseConfig } from './config/database.config';
import { getCacheConfig } from './config/cache.config';
import { TeamComp } from './entities/team-comp.entity';
import { Champion } from './entities/champion.entity';
import { Item } from './entities/item.entity';
import { PowerUp } from './entities/power-up.entity';
import { Trait } from './entities/trait.entity';
import { CarouselItem } from './entities/carousel-item.entity';
import { TeamOption } from './entities/team-option.entity';
import { PositionedChampion } from './entities/positioned-champion.entity';
import { EarlyCompChampion } from './entities/early-comp-champion.entity';
import { TeamOptionChampion } from './entities/team-option-champion.entity';
import { TftUnit } from './entities/tft-unit.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // 全局配置模块
      envFilePath: '.env', // 环境变量文件路径
    }),
    ScheduleModule.forRoot(), // 定时任务模块
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: getCacheConfig,
      inject: [ConfigService],
      isGlobal: true, // 全局缓存模块
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getDatabaseConfig,
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([
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
    ] as any),
  ],
  controllers: [AppController, CrawlerController],
  providers: [
    AppService,
    CrawlerService,
    TFTacticsService,
    DatabaseService,
    CrawlerScheduler, // 定时任务服务
  ],
})
export class AppModule {}
