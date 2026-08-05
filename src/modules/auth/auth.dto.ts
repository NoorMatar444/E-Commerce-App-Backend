import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsPhoneNumber,
  IsString,
  IsStrongPassword,
  Matches,
} from 'class-validator';
import { IMatch } from 'src/common/decorators/match.decorators';

export class SignupDto {
  @IsString()
  username!: string;
  @IsEmail()
  email!: string;
  @IsStrongPassword()
  password!: string;
  @IsString()
  @IMatch(['password'])
  confirmPassword!: string;
  @IsEnum(['male', 'female'])
  gender!: string;
  @IsPhoneNumber()
  phone!: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;
  @IsStrongPassword()
  password!: string;
}
export class ConfirmEmailDto {
  @IsEmail()
  email!: string;
  @IsNotEmpty()
  @Matches(/^\d{6}$/, {
    message: 'OTP must be exactly 6 digits',
  })
  otp!: string;
}
export class resendConfirmEmailOtpDto {
  @IsEmail()
  email!: string;
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{6}$/, {
    message: 'OTP must be exactly 6 digits',
  })
  otp!: string;
}

export class sendForgetPasswordOtpDto {
  @IsEmail()
  email!: string;
}

export class forgetPasswordDto {
  @IsEmail()
  email!: string;
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{6}$/, {
    message: 'OTP must be exactly 6 digits',
  })
  otp!: string;
  @IsStrongPassword()
  password!: string;
}
