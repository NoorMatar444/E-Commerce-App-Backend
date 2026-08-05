import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { RedisModule } from '../redis/redis.module';
import { AuthService } from './auth.service';
import { SecurityServices } from 'src/Security/security.services';
import { ConfigService } from '@nestjs/config';
import { TokenServices } from 'src/common/Services/Token.services';
import { EmailServices } from 'src/common/Services/email.service';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../redis/redis.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [UserModule, RedisModule],

  providers: [
    AuthService,
    SecurityServices,
    ConfigService,
    TokenServices,
    EmailServices,
    JwtService,
    RedisService,
  ],

  controllers: [AuthController],
})
export class AuthModule {}
