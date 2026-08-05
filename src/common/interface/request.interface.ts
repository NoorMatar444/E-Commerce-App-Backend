import { JwtPayload } from 'jsonwebtoken';
import { IHUser } from 'src/models/user.model';
import { Request } from 'express';

export interface IAuthRequest extends Request {
  user: IHUser;
  tokenPayload: JwtPayload;
}
