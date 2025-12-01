import { CacheModuleOptions } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-redis-store';

export const getCacheConfig = (
  configService: ConfigService,
): CacheModuleOptions => {
  const redisHost = configService.get<string>('REDIS_HOST', 'localhost');
  const redisPort = configService.get<number>('REDIS_PORT', 6379);
  const redisPassword = configService.get<string>('REDIS_PASSWORD', '');

  return {
    store: redisStore as unknown as CacheModuleOptions['store'],
    host: redisHost,
    port: redisPort,
    password: redisPassword || undefined,
    ttl: 3600, // 默认缓存时间：1 小时（秒）
    max: 100, // 最大缓存项数
  };
};

