import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class SignupDto {
  @IsEmail({}, { message: 'A valid email address is required.' })
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  @MaxLength(72, { message: 'Password must be at most 72 characters long.' })
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  fullName?: string;

  /**
   * Required unless `inviteToken` is present: creates a brand-new
   * organization with this user as its first member (multi-organization
   * signup). Ignored when joining via an invite.
   */
  @ValidateIf((dto: SignupDto) => !dto.inviteToken)
  @IsString({ message: 'Organization name is required.' })
  @MinLength(2, { message: 'Organization name must be at least 2 characters.' })
  @MaxLength(255)
  organizationName?: string;

  /**
   * Single-use token from an invitation link. When present, the account
   * joins that invitation's organization instead of creating a new one.
   */
  @IsOptional()
  @IsString()
  inviteToken?: string;
}
