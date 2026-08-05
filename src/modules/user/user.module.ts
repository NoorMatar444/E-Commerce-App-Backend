import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, userSchema } from 'src/models/user.model';
import { UserRepo } from 'src/Rebo/user.repo';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: userSchema }]),
  ],
  providers: [UserRepo],
  exports: [UserRepo],
})
export class UserModule {}
