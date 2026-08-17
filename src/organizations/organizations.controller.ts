import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { Invitation } from './invitation.entity';
import { InvitationsService } from './invitations.service';
import { OrganizationsService } from './organizations.service';
import {
  CreatedInvitation,
  InvitationPreview,
  InvitationSummary,
  OrganizationMember,
  OrganizationProfile,
} from './organizations.types';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/user-role.enum';

/**
 * Organization & team management (multi-organization support). Every route
 * except the public invitation preview requires auth and is scoped to the
 * caller's own organization — there is no way to read or act on another
 * tenant's data (NFR-3).
 */
@Controller('organizations')
export class OrganizationsController {
  constructor(
    private readonly organizations: OrganizationsService,
    private readonly invitations: InvitationsService,
    private readonly users: UsersService,
  ) {}

  /** GET /api/organizations/me — the caller's own organization. */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrganizationProfile> {
    const organization = await this.organizations.findById(user.organizationId);
    if (!organization) {
      throw new NotFoundException('Organization no longer exists.');
    }
    return {
      id: organization.id,
      name: organization.name,
      baseDomain: organization.baseDomain,
      createdAt: organization.createdAt,
    };
  }

  /** GET /api/organizations/members — everyone in the caller's organization. */
  @Get('members')
  @UseGuards(JwtAuthGuard)
  async members(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrganizationMember[]> {
    const rows = await this.users.findAllByOrganization(user.organizationId);
    return rows.map((row) => ({
      id: row.id,
      email: row.email,
      fullName: row.fullName,
      role: row.role,
      createdAt: row.createdAt,
    }));
  }

  /**
   * GET /api/organizations/invitations — invites sent from the caller's
   * organization. Owner-only: this is team-management, not something content
   * creators need to see.
   */
  @Get('invitations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Owner)
  async listInvitations(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<InvitationSummary[]> {
    const rows = await this.invitations.listForOrganization(
      user.organizationId,
    );
    return rows.map((row) => this.toSummary(row));
  }

  /**
   * POST /api/organizations/invitations — invite a content creator into the
   * caller's organization. Owner-only.
   */
  @Post('invitations')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Owner)
  async invite(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateInvitationDto,
  ): Promise<CreatedInvitation> {
    const { invitation, token } = await this.invitations.create(
      user.organizationId,
      user.id,
      dto.email,
    );
    return {
      id: invitation.id,
      email: invitation.email,
      token,
      expiresAt: invitation.expiresAt,
    };
  }

  /** DELETE /api/organizations/invitations/:id — revoke a pending invite. Owner-only. */
  @Delete('invitations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Owner)
  async revokeInvitation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    await this.invitations.revoke(user.organizationId, id);
  }

  /**
   * GET /api/organizations/invitations/:token — public. Lets the signup page
   * show which organization an invite link belongs to before an account
   * exists.
   */
  @Get('invitations/:token')
  async previewInvitation(
    @Param('token') token: string,
  ): Promise<InvitationPreview> {
    const invitation = await this.invitations.findValidByToken(token);
    if (!invitation) {
      throw new NotFoundException('This invitation is invalid or has expired.');
    }
    return {
      organizationName: invitation.organization.name,
      email: invitation.email,
    };
  }

  private toSummary(invitation: Invitation): InvitationSummary {
    const status = invitation.acceptedAt
      ? 'accepted'
      : invitation.expiresAt < new Date()
        ? 'expired'
        : 'pending';
    return {
      id: invitation.id,
      email: invitation.email,
      status,
      createdAt: invitation.createdAt,
      expiresAt: invitation.expiresAt,
    };
  }
}
