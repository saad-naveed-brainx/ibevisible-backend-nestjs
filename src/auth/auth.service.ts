import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { OrganizationsService } from '../organizations/organizations.service';
import { User } from '../users/user.entity';
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
    private readonly jwt: JwtService,
  ) {}

  /** FR-1.1 (registration): create a user under the single POC organization. */
  async signup(dto: SignupDto): Promise<AuthResult> {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('An account with this email already exists.');
    }

    const organization = await this.organizations.getDefault();
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.users.create({
      email: dto.email,
      passwordHash,
      fullName: dto.fullName,
      organizationId: organization.id,
    });

    return this.buildAuthResult(user);
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
      createdAt: user.createdAt,
    };
  }
}
