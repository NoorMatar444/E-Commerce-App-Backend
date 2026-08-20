import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { RedisModule } from '../redis/redis.module';
import { AuthService } from './auth.service';
import { SecurityModule } from 'src/Security/security.module';
import { ConfigService } from '@nestjs/config';
import { TokenServices } from 'src/common/Services/Token.services';
import { EmailServices } from 'src/common/Services/email.service';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../redis/redis.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [UserModule, RedisModule, SecurityModule],

  providers: [
    AuthService,
    ConfigService,
    TokenServices,
    EmailServices,
    JwtService,
    RedisService,
  ],

  controllers: [AuthController],
})
export class AuthModule {}
