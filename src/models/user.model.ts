import { MongooseModule, Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { GenderEnum, ProviderEnum, RoleEnum } from 'src/common/enums/user.enum';

@Schema()
export class User {
  @Prop({ type: String, required: true })
  username!: string;
  @Prop({ type: String, required: true })
  email!: string;
  @Prop({
    type: String,
    enum: ProviderEnum,
    default: ProviderEnum.SYSTEM,
  })
  provider!: ProviderEnum;
  @Prop({
    type: String,
    required: function (this: User): boolean {
      return this.provider == ProviderEnum.SYSTEM;
    },
  })
  password!: string;
  @Prop({ type: Date })
  DOB!: Date;
  @Prop({ type: String, enum: GenderEnum, default: GenderEnum.MALE })
  gender!: GenderEnum;
  @Prop({ type: String })
  phone!: string;
  @Prop({ type: Boolean, default: false })
  confirmEmail!: boolean;
  @Prop({ type: String })
  profilePic!: string;
  @Prop({ type: [String] })
  coverPics!: string[];
  @Prop({ type: String, enum: RoleEnum, default: RoleEnum.USER })
  role!: RoleEnum;
  @Prop({ type: Date })
  changeCreditTime!: Date;
  @Prop({ type: String })
  confirmPassword!: string;
  // @Prop([{ type: Types.ObjectId, ref: 'User' }])
  // friends!: [Types.ObjectId];
  @Prop({
    type: String,
    default: null,
  })
  FCM!: string;
}
export type IHUser = HydratedDocument<User & { _id: Types.ObjectId }>;
export const userSchema = SchemaFactory.createForClass(User);

const userModel = MongooseModule.forFeature([
  {
    name: User.name,
    schema: userSchema,
  },
]);
export default userModel;
