import { Body, Controller, Post } from '@nestjs/common';
import {
  ConfirmEmailDto,
  forgetPasswordDto,
  LoginDto,
  resendConfirmEmailOtpDto,
  sendForgetPasswordOtpDto,
  SignupDto,
} from './auth.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private AuthService: AuthService) {}
  @Post('signup')
  async signup(@Body() body: SignupDto) {
    return this.AuthService.signup(body);
  }
  @Post('login')
  async login(@Body() body: LoginDto) {
    return this.AuthService.login(body);
  }
  @Post('confirmEmail')
  async confirmEmail(@Body() body: ConfirmEmailDto) {
    return this.AuthService.confirmEmail(body);
  }
  @Post('resendConfirmEmailOtp')
  async resendConfirmEmailOtp(@Body() body: resendConfirmEmailOtpDto) {
    return this.AuthService.resendConfirmEmailOtp(body);
  }
  @Post('sendForgetPasswordOtp')
  async sendForgetPasswordOtp(@Body() body: sendForgetPasswordOtpDto) {
    return this.AuthService.sendForgetPasswordOtp(body);
  }

  @Post('forgetPassword')
  async forgetPassword(@Body() body: forgetPasswordDto) {
    return this.AuthService.forgetPassword(body);
  }
}
