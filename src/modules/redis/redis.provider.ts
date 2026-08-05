import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

// redis is a plain object not a class
export const RedisProvider = {
  provide: REDIS_CLIENT, // now you could inject redis in other modules
  useFactory: (configService: ConfigService) => {
    const redis = new Redis({
      host: configService.get<string>('REDIS_HOST'),
      port: Number(configService.get<string>('REDIS_PORT')),
      password: configService.get<string>('REDIS_PASSWORD'),
      db: Number(configService.get<string>('REDIS_DB')),
    });

    redis.on('connect', () => {
      console.log('Redis connected');
    });

    redis.on('error', (error) => {
      console.log(error);
    });

    return redis;
  },

  inject: [ConfigService],
};
