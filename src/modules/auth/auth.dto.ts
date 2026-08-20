import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsPhoneNumber,
  IsString,
  IsStrongPassword,
  Matches,
  MinLength,
} from 'class-validator';
import { IMatch } from 'src/common/decorators/match.decorators';
import { GenderEnum } from 'src/common/enums/user.enum';

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
  @IsEnum(GenderEnum)
  gender!: GenderEnum;
  @IsPhoneNumber()
  phone!: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;
  @IsString()
  @MinLength(1)
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
