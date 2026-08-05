import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { UserRepo } from 'src/Rebo/user.repo';

import {
  ConfirmEmailDto,
  forgetPasswordDto,
  LoginDto,
  resendConfirmEmailOtpDto,
  sendForgetPasswordOtpDto,
  SignupDto,
} from './auth.dto';

import { SecurityServices } from './../../Security/security.services';
import { ConfigService } from '@nestjs/config';
import { TokenServices } from 'src/common/Services/Token.services';
import { EmailServices } from 'src/common/Services/email.service';
import { generateOtp } from 'src/common/OTP/generate.otp';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepo: UserRepo,
    private readonly SecurityServices: SecurityServices,
    private readonly ConfigService: ConfigService,
    private readonly tokenServices: TokenServices,
    private readonly emailService: EmailServices,
    private readonly redisService: RedisService,
  ) {}

  async signup(body: SignupDto) {
    const { phone, password, email } = body;

    if (await this.userRepo.findOne({ filter: { email } })) {
      throw new BadRequestException('user already exist');
    }

    const hashedPassword = this.SecurityServices.hashOperation({
      data: password,
      salt_Rounds: Number(this.ConfigService.get<string>('salt_Rounds')),
    });

    body.password = hashedPassword;

    body.phone = this.SecurityServices.encryptOperation({
      message: phone,
      ENCRYPTION_KEY: this.ConfigService.get<string>('ENCRYPTION_KEY'),
    });

    const [createUser] = await this.userRepo.create({
      data: [body],
    });

    const otp = generateOtp();

    const hashedOtp = this.SecurityServices.hashOperation({
      data: otp,
      salt_Rounds: Number(this.ConfigService.get<string>('salt_Rounds')),
    });

    await this.emailService.sendEmail({
      to: 'noormatar480@gmail.com',
      subject: 'otp',
      text: otp,
    });

    await this.redisService.set({
      key: `userOtp${createUser._id.toString()}`,
      value: hashedOtp,
    });

    await this.redisService.expire({
      key: `userOtp${createUser._id.toString()}`,
      seconds: 4 * 60,
    });

    return createUser;
  }

  async login(body: LoginDto) {
    const { email, password } = body;

    const user = await this.userRepo.findOne({
      filter: {
        email,
        confirmEmail: true,
      },
    });

    if (!user) {
      throw new NotFoundException('user not exist');
    }

    const passwordSucceeded = await this.SecurityServices.compareOperation({
      data: password,
      encrypted: user.password,
    });

    if (!passwordSucceeded) {
      throw new BadRequestException('please enter the right password');
    }

    user.phone = this.SecurityServices.decryptOperation({
      message: user.phone,
      ENCRYPTION_KEY: this.ConfigService.get<string>('ENCRYPTION_KEY'),
    });

    return this.tokenServices.generate_access_and_refresh_token(user);
  }

  async confirmEmail(body: ConfirmEmailDto) {
    const { email, otp } = body;

    const user = await this.userRepo.findOne({
      filter: { email },
    });

    if (!user) {
      throw new NotFoundException('User not exist');
    }

    const hashedOtp = await this.redisService.get({
      key: `userOtp${user._id.toString()}`,
    });

    if (
      !hashedOtp ||
      !(await this.SecurityServices.compareOperation({
        data: otp,
        encrypted: hashedOtp,
      }))
    ) {
      throw new BadRequestException('Invalid otp');
    }

    user.confirmEmail = true;

    await user.save();

    return 'user confirm email succeeded';
  }

  async resendConfirmEmailOtp(body: resendConfirmEmailOtpDto) {
    const { email } = body;

    const user = await this.userRepo.findOne({
      filter: { email },
    });

    if (!user) {
      throw new NotFoundException('user not exist');
    }

    const otp = generateOtp();

    const hashedOtp = this.SecurityServices.hashOperation({
      data: otp,

      salt_Rounds: Number(this.ConfigService.get<string>('salt_Rounds')),
    });

    await this.emailService.sendEmail({
      to: 'noormatar480@gmail.com',

      subject: 'otp',

      text: otp,
    });

    await this.redisService.set({
      key: `userOtp${user._id.toString()}`,

      value: hashedOtp,
    });

    await this.redisService.expire({
      key: `userOtp${user._id.toString()}`,

      seconds: 4 * 60,
    });

    return 'OTP sent successfully';
  }
  async sendForgetPasswordOtp(body: sendForgetPasswordOtpDto) {
    const { email } = body;
    const user = await this.userRepo.findOne({ filter: { email } });
    if (!user) {
      throw new NotFoundException('user already exist');
    }
    const otp = generateOtp();

    const hashedOtp = this.SecurityServices.hashOperation({
      data: otp,

      salt_Rounds: Number(this.ConfigService.get<string>('salt_Rounds')),
    });
    await this.emailService.sendEmail({
      to: 'noormatar480@gmail.com',

      subject: 'otp',

      text: otp,
    });

    await this.redisService.set({
      key: `userOtp${user._id.toString()}`,

      value: hashedOtp,
    });

    await this.redisService.expire({
      key: `userOtp${user._id.toString()}`,

      seconds: 4 * 60,
    });

    return 'Forget password OTP sent successfully';
  }
  async forgetPassword(body: forgetPasswordDto) {
    const { email, otp, password } = body;
    const user = await this.userRepo.findOne({
      filter: { email },
    });

    if (!user) {
      throw new NotFoundException('user not exist');
    }

    const hashedOtp = await this.redisService.get({
      key: `userOtp${user._id.toString()}`,
    });

    if (
      !hashedOtp ||
      !(await this.SecurityServices.compareOperation({
        data: otp,
        encrypted: hashedOtp,
      }))
    ) {
      throw new BadRequestException('Invalid otp');
    }
    const hashedPassword = this.SecurityServices.hashOperation({
      data: password,
      salt_Rounds: Number(this.ConfigService.get<string>('salt_Rounds')),
    });
    user.password = hashedPassword;
    await user.save();
    return user;
  }
}
