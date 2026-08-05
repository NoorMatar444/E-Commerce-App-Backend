import { Injectable, UnauthorizedException } from '@nestjs/common';

import { JwtService, JwtSignOptions, JwtVerifyOptions } from '@nestjs/jwt';

import { ConfigService } from '@nestjs/config';

import { randomUUID } from 'crypto';

import { RoleEnum } from 'src/common/enums/user.enum';
import { TokenEnum } from '../enums/token.enum';

import { IHUser } from 'src/models/user.model';
import { UserRepo } from 'src/Rebo/user.repo';

import { RedisService } from 'src/modules/redis/redis.service';

interface ITokenPayload {
  sub: string;
  role: RoleEnum;
  aud?: string | string[];
  iat?: number;
  exp?: number;
  jti?: string;
}

@Injectable()
export class TokenServices {
  constructor(
    private readonly ConfigService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly userRepo: UserRepo,
    private readonly RedisService: RedisService,
  ) {}

  // -------------------------------------------------------
  // Get access and refresh secrets depending on user role
  // -------------------------------------------------------

  getSecret(role: RoleEnum = RoleEnum.ADMIN) {
    let access_secret: string | undefined;
    let refresh_secret: string | undefined;

    switch (role) {
      case RoleEnum.ADMIN:
        access_secret = this.ConfigService.get<string>(
          'TOKEN_ACCESS_SECRET_ADMIN',
        );

        refresh_secret = this.ConfigService.get<string>(
          'TOKEN_REFRESH_SECRET_ADMIN',
        );

        break;

      case RoleEnum.USER:
        access_secret = this.ConfigService.get<string>(
          'TOKEN_ACCESS_SECRET_USER',
        );

        refresh_secret = this.ConfigService.get<string>(
          'TOKEN_REFRESH_SECRET_USER',
        );

        break;

      default:
        throw new UnauthorizedException('Invalid user role');
    }

    if (!access_secret || !refresh_secret) {
      throw new UnauthorizedException('Token secrets are not configured');
    }

    return {
      access_secret,
      refresh_secret,
    };
  }

  // -------------------------------------------------------
  // Generate JWT
  // -------------------------------------------------------

  getToken({
    payload,
    signature,
    options = {},
  }: {
    payload: object;
    signature: string;
    options?: JwtSignOptions;
  }): string {
    return this.jwtService.sign(payload, {
      ...options,
      secret: signature,
    });
  }

  // -------------------------------------------------------
  // Decode JWT
  // -------------------------------------------------------

  decodeToken({ token }: { token: string }): ITokenPayload | null {
    const decoded = this.jwtService.decode<ITokenPayload>(token);

    if (!decoded || typeof decoded !== 'object') {
      return null;
    }

    return decoded;
  }

  // -------------------------------------------------------
  // Verify JWT
  // -------------------------------------------------------

  verifyToken({
    token,
    secret,
    audience,
  }: {
    token: string;
    secret: string;
    audience: string[];
  }): ITokenPayload {
    try {
      return this.jwtService.verify<ITokenPayload>(token, {
        secret,
        audience,
      } as JwtVerifyOptions);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  // -------------------------------------------------------
  // Generate access + refresh tokens
  // -------------------------------------------------------

  generate_access_and_refresh_token(user: IHUser) {
    const { access_secret, refresh_secret } = this.getSecret(user.role);

    // Give each token its own unique ID
    const accessTokenId = randomUUID();
    const refreshTokenId = randomUUID();

    const payload = {
      sub: user._id.toString(),
      role: user.role,
    };

    const access_token = this.getToken({
      payload,

      signature: access_secret,

      options: {
        audience: [String(user.role), TokenEnum.ACCESS],

        expiresIn: '1d',

        jwtid: accessTokenId,
      },
    });

    const refresh_token = this.getToken({
      payload,

      signature: refresh_secret,

      options: {
        audience: [String(user.role), TokenEnum.REFRESH],

        expiresIn: '1y',

        jwtid: refreshTokenId,
      },
    });

    return {
      access_token,
      refresh_token,
    };
  }

  // -------------------------------------------------------
  // Check token
  // -------------------------------------------------------

  async checkToken(token: string, tokenTypePram: TokenEnum = TokenEnum.ACCESS) {
    // ---------------------------------------------
    // 1. Basic token validation
    // ---------------------------------------------

    if (!token || typeof token !== 'string') {
      throw new UnauthorizedException('Token is required');
    }

    // ---------------------------------------------
    // 2. Decode only to determine role
    // ---------------------------------------------

    const decodedToken = this.decodeToken({
      token,
    });

    if (!decodedToken) {
      throw new UnauthorizedException('Invalid token');
    }

    // ---------------------------------------------
    // 3. Validate role
    // ---------------------------------------------

    const userRole = decodedToken.role;

    if (userRole !== RoleEnum.ADMIN && userRole !== RoleEnum.USER) {
      throw new UnauthorizedException('Invalid token role');
    }

    // ---------------------------------------------
    // 4. Get correct secrets
    // ---------------------------------------------

    const { access_secret, refresh_secret } = this.getSecret(userRole);

    const secret =
      tokenTypePram === TokenEnum.ACCESS ? access_secret : refresh_secret;

    // ---------------------------------------------
    // 5. Expected audience
    // ---------------------------------------------

    const expectedAudience = [String(userRole), tokenTypePram];

    // ---------------------------------------------
    // 6. Verify signature + expiration + audience
    // ---------------------------------------------

    const verifiedToken = this.verifyToken({
      token,

      secret,

      audience: expectedAudience,
    });

    // ---------------------------------------------
    // 7. Make sure token type is correct
    // ---------------------------------------------

    const tokenAudience = verifiedToken.aud;

    const audienceArray = Array.isArray(tokenAudience)
      ? tokenAudience
      : [tokenAudience];

    if (!audienceArray.includes(tokenTypePram)) {
      throw new UnauthorizedException('Invalid token type');
    }

    // ---------------------------------------------
    // 8. Make sure token contains user ID
    // ---------------------------------------------

    if (!verifiedToken.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // ---------------------------------------------
    // 9. Check token blacklist
    // ---------------------------------------------

    if (verifiedToken.jti) {
      const blacklistKey = this.RedisService.getBlackListTokenKey({
        userId: verifiedToken.sub,

        tokenId: verifiedToken.jti,
      });

      const isBlacklisted = await this.RedisService.exists({
        keys: blacklistKey,
      });

      if (isBlacklisted) {
        throw new UnauthorizedException('Login again');
      }
    }

    // ---------------------------------------------
    // 10. Find user
    // ---------------------------------------------

    const user = await this.userRepo.findById({
      id: verifiedToken.sub,
    });

    if (!user) {
      throw new UnauthorizedException('User not found, signup again');
    }

    // ---------------------------------------------
    // 11. Check whether credentials changed
    // ---------------------------------------------

    if (verifiedToken.iat && user.changeCreditTime) {
      const tokenIssuedAt = new Date(verifiedToken.iat * 1000);

      if (tokenIssuedAt < user.changeCreditTime) {
        throw new UnauthorizedException('Login again');
      }
    }

    // ---------------------------------------------
    // 12. Everything is valid
    // ---------------------------------------------

    return {
      user,
      verifiedToken,
    };
  }
}
