import { User } from 'src/models/user.model';
import { DbRepo } from './db.repo';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserRepo extends DbRepo<User> {
  constructor(@InjectModel(User.name) private readonly UserModel: Model<User>) {
    super(UserModel);
  }
}
