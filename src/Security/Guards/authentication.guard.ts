import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TokenEnum } from 'src/common/enums/token.enum';
import { IAuthRequest } from 'src/common/interface/request.interface';
import { TokenServices } from 'src/common/Services/Token.services';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private TokenServices: TokenServices,
    private reflector: Reflector,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    let req!: IAuthRequest;
    let authorization: string | undefined;
    const contextType = context.getType();
    switch (contextType) {
      case 'http':
        req = context.switchToHttp().getRequest();
        authorization = req.headers.authorization;
        break;

      default:
        break;
    }
    if (!authorization) {
      throw new UnauthorizedException('Authorization header missing');
    }
    const token = authorization.startsWith('Bearer ')
      ? authorization.split(' ')[1]
      : authorization;
    if (!token) {
      throw new UnauthorizedException('Invalid token');
    }
    const tokenType =
      this.reflector.getAllAndOverride<TokenEnum>('tokenType', [
        context.getHandler(),
        context.getClass(),
      ]) ?? TokenEnum.ACCESS;
    const { user, verifiedToken } = await this.TokenServices.checkToken(
      token,
      tokenType, // use metadata to use tokenType in guard
    );
    req.user = user;
    req.tokenPayload = verifiedToken;
    return true;
  }
}
