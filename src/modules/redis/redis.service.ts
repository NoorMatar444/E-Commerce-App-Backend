import { Inject, Injectable } from '@nestjs/common';
import { REDIS_CLIENT } from './redis.constants';
import Redis, { RedisKey } from 'ioredis';

@Injectable()
export class RedisService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}
  getBlackListTokenKey({
    userId,
    tokenId,
  }: {
    userId: string;
    tokenId: string;
  }) {
    return `blackListToken::${userId}::${tokenId}`;
  }
  async set({
    key,
    value,
  }: {
    key: RedisKey;
    value: string | Buffer | number;
  }) {
    return this.redis.set(key, value);
  }
  async get({ key }: { key: RedisKey }) {
    return this.redis.get(key);
  }
  async delete({ key }: { key: RedisKey }) {
    return this.redis.del(key);
  }
  async expire({ key, seconds }: { key: RedisKey; seconds: number }) {
    return this.redis.expire(key, seconds);
  }
  async exists({ keys }: { keys: RedisKey }) {
    return this.redis.exists(keys);
  }
}
