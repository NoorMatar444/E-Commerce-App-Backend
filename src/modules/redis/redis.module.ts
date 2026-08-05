import { Module } from '@nestjs/common';
import { RedisProvider } from './redis.provider';
import { REDIS_CLIENT } from './redis.constants';
import { RedisService } from './redis.service';

@Module({
  providers: [RedisProvider, RedisService],
  exports: [REDIS_CLIENT, RedisService, RedisProvider],
})
export class RedisModule {}
