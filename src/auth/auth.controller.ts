import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { AuthService } from './auth.service';
import type { AuthenticatedUser, AuthResult, UserProfile } from './auth.types';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly users: UsersService,
  ) {}

  /** POST /api/auth/signup — register and receive a token (FR-1.1). */
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  signup(@Body() dto: SignupDto): Promise<AuthResult> {
    return this.authService.signup(dto);
  }

  /** POST /api/auth/login — authenticate and receive a token (FR-1.1). */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<AuthResult> {
    return this.authService.login(dto);
  }

  /** GET /api/auth/me — the authenticated user's profile. */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() current: AuthenticatedUser): Promise<UserProfile> {
    const user = await this.users.findById(current.id);
    if (!user) {
      throw new NotFoundException('User no longer exists.');
    }
    return this.authService.toProfile(user);
  }

  /**
   * POST /api/auth/logout — FR-1.3. Tokens are stateless JWTs, so logout is
   * completed client-side by discarding the token; this endpoint confirms it
   * and gives the frontend a single call to hit.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  logout(): { success: true } {
    return { success: true };
  }
}
