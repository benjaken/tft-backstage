import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TFTacticsService } from './tftactics.service';

@Injectable()
export class CrawlerScheduler implements OnModuleDestroy {
  private readonly logger = new Logger(CrawlerScheduler.name);
  private retryTimeout: NodeJS.Timeout | null = null;
  private readonly MAX_RETRIES = 3; // 最大重试次数
  private retryCount = 0;

  constructor(private readonly tftacticsService: TFTacticsService) {}

  // 每小时执行一次（在每个小时的第 0 分钟执行）
  @Cron(CronExpression.EVERY_HOUR)
  async handleCron() {
    // 重置重试计数
    this.retryCount = 0;
    await this.executeCrawl();
  }

  private async executeCrawl(retry = false) {
    if (retry) {
      this.logger.log(`开始重试爬虫任务 (第 ${this.retryCount} 次重试)...`);
    } else {
      this.logger.log('开始执行定时爬虫任务...');
    }

    const url = 'https://tftactics.gg/tierlist/team-comps/';

    try {
      const result = await this.tftacticsService.crawlTeamComps(url);
      this.logger.log(`定时任务执行成功: 爬取了 ${result.total} 个团队组合`);

      // 成功执行后，清除可能存在的重试定时器
      if (this.retryTimeout) {
        clearTimeout(this.retryTimeout);
        this.retryTimeout = null;
      }
      this.retryCount = 0; // 重置重试计数
    } catch (error) {
      this.logger.error(
        `定时任务执行失败 (第 ${this.retryCount} 次尝试):`,
        error,
      );

      // 如果还有重试次数，5分钟后重试
      if (this.retryCount < this.MAX_RETRIES) {
        this.retryCount++;
        this.logger.log(`将在 5 分钟后进行第 ${this.retryCount} 次重试...`);

        // 清除之前的重试定时器（如果存在）
        if (this.retryTimeout) {
          clearTimeout(this.retryTimeout);
        }

        // 5分钟后重试（5分钟 = 5 * 60 * 1000 毫秒）
        this.retryTimeout = setTimeout(
          () => {
            void this.executeCrawl(true);
          },
          5 * 60 * 1000,
        );
      } else {
        this.logger.error(`已达到最大重试次数 (${this.MAX_RETRIES})，停止重试`);
        this.retryCount = 0; // 重置重试计数
        if (this.retryTimeout) {
          clearTimeout(this.retryTimeout);
          this.retryTimeout = null;
        }
      }
    }
  }

  /**
   * 每周四定时刷新英雄（单位）基础数据
   * 表达式：0 4 * * 4 => 每周四 04:00
   */
  @Cron('0 4 * * 4')
  async handleUnitsCron() {
    const url = 'https://www.datatft.com/database#unit';
    const seasons = ['S15']; // 后续有 S16、S17 时可在此扩展

    for (const season of seasons) {
      try {
        this.logger.log(`开始执行英雄数据定时任务，赛季: ${season}`);
        const result = await this.tftacticsService.crawlUnits(url, season);
        this.logger.log(
          `英雄数据定时任务成功，赛季: ${season}，数量: ${result.total}`,
        );
      } catch (error) {
        this.logger.error(
          `英雄数据定时任务失败，赛季: ${season}`,
          error as Error,
        );
      }
    }
  }

  // 清理资源
  onModuleDestroy() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }
}
