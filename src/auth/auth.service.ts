import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Invitation } from '../organizations/invitation.entity';
import { InvitationsService } from '../organizations/invitations.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { User } from '../users/user.entity';
import { UserRole } from '../users/user-role.enum';
import { UsersService } from '../users/users.service';
import { AuthResult, JwtPayload, UserProfile } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly organizations: OrganizationsService,
    private readonly invitations: InvitationsService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * FR-1.1 (registration), extended for multi-organization support: with no
   * invite token, `organizationName` creates a brand-new tenant and the new
   * user becomes its first member. With a valid invite token, the user joins
   * that invitation's organization instead.
   */
  async signup(dto: SignupDto): Promise<AuthResult> {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('An account with this email already exists.');
    }

    const { organizationId, role, invitation } =
      await this.resolveSignupOrganization(dto);
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.users.create({
      email: dto.email,
      passwordHash,
      fullName: dto.fullName,
      organizationId,
      role,
    });

    if (invitation) {
      await this.invitations.markAccepted(invitation.id);
    }

    return this.buildAuthResult(user);
  }

  private async resolveSignupOrganization(dto: SignupDto): Promise<{
    organizationId: string;
    role: UserRole;
    invitation?: Invitation;
  }> {
    if (dto.inviteToken) {
      const invitation = await this.invitations.findValidByToken(
        dto.inviteToken,
      );
      if (!invitation) {
        throw new BadRequestException(
          'This invitation is invalid or has expired.',
        );
      }
      if (invitation.email !== dto.email.toLowerCase()) {
        throw new BadRequestException(
          'This invitation was issued for a different email address.',
        );
      }
      // Invited users are content creators (multi-organization "invite
      // content creators" feature) — only the org's original signup is Owner.
      return {
        organizationId: invitation.organizationId,
        role: UserRole.ContentCreator,
        invitation,
      };
    }

    // dto.organizationName is guaranteed non-empty here by SignupDto's
    // conditional validation (required whenever inviteToken is absent).
    const organization = await this.organizations.create({
      name: dto.organizationName!,
    });
    return { organizationId: organization.id, role: UserRole.Owner };
  }

  /** FR-1.1 (login): verify credentials and issue a JWT. */
  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.users.findByEmail(dto.email);
    // Verify against a real or dummy hash either way to avoid leaking which
    // emails exist via response timing.
    const hash = user?.passwordHash ?? '$2b$12$invalidinvalidinvalidinvalidin';
    const passwordMatches = await bcrypt.compare(dto.password, hash);

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return this.buildAuthResult(user);
  }

  private async buildAuthResult(user: User): Promise<AuthResult> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
    };
    const accessToken = await this.jwt.signAsync(payload);
    return { accessToken, user: this.toProfile(user) };
  }

  toProfile(user: User): UserProfile {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      organizationId: user.organizationId,
      role: user.role,
      createdAt: user.createdAt,
    };
  }
}
