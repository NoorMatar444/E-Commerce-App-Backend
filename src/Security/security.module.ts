import { Module } from '@nestjs/common';
import { SecurityServices } from './security.services';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [SecurityServices],
  exports: [SecurityServices],
})
export class SecurityModule {}
