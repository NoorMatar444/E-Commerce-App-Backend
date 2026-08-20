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
import { RoleEnum } from 'src/common/enums/user.enum';

@Injectable()
export class AuthService {
  private readonly confirmEmailOtpPrefix = 'confirmEmailOtp:';
  private readonly forgotPasswordOtpPrefix = 'forgotPasswordOtp:';

  constructor(
    private readonly userRepo: UserRepo,
    private readonly SecurityServices: SecurityServices,
    private readonly ConfigService: ConfigService,
    private readonly tokenServices: TokenServices,
    private readonly emailService: EmailServices,
    private readonly redisService: RedisService,
  ) {}

  async signup(body: SignupDto) {
    const {
      phone,
      password,
      email,
      confirmPassword: _,
      ...signupData
    } = body;
    void _;

    if (await this.userRepo.findOne({ filter: { email } })) {
      throw new BadRequestException('user already exist');
    }

    const hashedPassword = this.SecurityServices.hashOperation({
      data: password,
      salt_Rounds: Number(this.ConfigService.get<string>('salt_Rounds')),
    });

    const encryptedPhone = this.SecurityServices.encryptOperation({
      message: phone,
      ENCRYPTION_KEY: this.ConfigService.get<string>('ENCRYPTION_KEY'),
    });

    const createUser = await this.userRepo.create({
      data: {
        ...signupData,
        email,
        password: hashedPassword,
        phone: encryptedPhone,
        role: RoleEnum.USER,
      },
    });

    await this.sendOtpEmail({
      email,
      redisKey: this.getConfirmEmailOtpKey(createUser._id.toString()),
    });

    return this.sanitizeUser(createUser);
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

    await this.verifyOtp({
      redisKey: this.getConfirmEmailOtpKey(user._id.toString()),
      otp,
    });

    user.confirmEmail = true;

    await user.save();
    await this.redisService.delete({
      key: this.getConfirmEmailOtpKey(user._id.toString()),
    });

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

    if (user.confirmEmail) {
      throw new BadRequestException('Email is already confirmed');
    }

    await this.sendOtpEmail({
      email,
      redisKey: this.getConfirmEmailOtpKey(user._id.toString()),
    });

    return 'OTP sent successfully';
  }

  async sendForgetPasswordOtp(body: sendForgetPasswordOtpDto) {
    const { email } = body;
    const user = await this.userRepo.findOne({ filter: { email } });

    if (!user) {
      throw new NotFoundException('user not exist');
    }

    await this.sendOtpEmail({
      email,
      redisKey: this.getForgotPasswordOtpKey(user._id.toString()),
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

    await this.verifyOtp({
      redisKey: this.getForgotPasswordOtpKey(user._id.toString()),
      otp,
    });

    user.password = this.SecurityServices.hashOperation({
      data: password,
      salt_Rounds: Number(this.ConfigService.get<string>('salt_Rounds')),
    });
    user.changeCreditTime = new Date();

    await user.save();
    await this.redisService.delete({
      key: this.getForgotPasswordOtpKey(user._id.toString()),
    });

    return { message: 'Password updated successfully' };
  }

  private async sendOtpEmail({
    email,
    redisKey,
  }: {
    email: string;
    redisKey: string;
  }) {
    const otp = generateOtp();

    const hashedOtp = this.SecurityServices.hashOperation({
      data: otp,
      salt_Rounds: Number(this.ConfigService.get<string>('salt_Rounds')),
    });

    await this.emailService.sendEmail({
      to: email,
      subject: 'otp',
      text: otp,
    });

    await this.redisService.set({
      key: redisKey,
      value: hashedOtp,
    });

    await this.redisService.expire({
      key: redisKey,
      seconds: 4 * 60,
    });
  }

  private async verifyOtp({
    redisKey,
    otp,
  }: {
    redisKey: string;
    otp: string;
  }) {
    const hashedOtp = await this.redisService.get({
      key: redisKey,
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
  }

  private getConfirmEmailOtpKey(userId: string) {
    return `${this.confirmEmailOtpPrefix}${userId}`;
  }

  private getForgotPasswordOtpKey(userId: string) {
    return `${this.forgotPasswordOtpPrefix}${userId}`;
  }

  private sanitizeUser(user: {
    toObject: () => Record<string, unknown> & {
      password?: string;
      confirmPassword?: string;
    };
  }) {
    const { password, confirmPassword, ...sanitized } = user.toObject();
    void password;
    void confirmPassword;
    return sanitized;
  }
}
