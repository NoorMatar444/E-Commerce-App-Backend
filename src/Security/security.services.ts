import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { compare, hashSync } from 'bcrypt';
import * as CryptoJS from 'crypto-js';

@Injectable()
export class SecurityServices {
  constructor(private configService: ConfigService) {}
  hashOperation({
    data,
    salt_Rounds = Number(this.configService.get<string>('salt_Rounds') ?? 7),
  }: {
    data: string;
    salt_Rounds?: string | number;
  }) {
    return hashSync(data, Number(salt_Rounds));
  }
  async compareOperation({
    data,
    encrypted,
  }: {
    data: string | Buffer;
    encrypted: string;
  }) {
    return await compare(data, encrypted);
  }

  encryptOperation({
    message,
    ENCRYPTION_KEY = this.configService.get<string>('ENCRYPTION_KEY') ?? '',
  }: {
    message: string;
    ENCRYPTION_KEY?: string;
  }) {
    return CryptoJS.AES.encrypt(message, ENCRYPTION_KEY).toString();
  }

  decryptOperation({
    message,
    ENCRYPTION_KEY = this.configService.get<string>('ENCRYPTION_KEY') ?? '',
  }: {
    message: string;
    ENCRYPTION_KEY?: string;
  }) {
    return CryptoJS.AES.decrypt(message, ENCRYPTION_KEY).toString(
      CryptoJS.enc.Utf8,
    );
  }
}
