import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { Invitation } from './invitation.entity';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class InvitationsService {
  constructor(
    @InjectRepository(Invitation)
    private readonly invitations: Repository<Invitation>,
  ) {}

  /**
   * Issues a single-use invite for `email` to join `organizationId`. The raw
   * token is returned once, here, and never persisted or returned again —
   * only its hash is stored (FR-1.1 extension: multi-organization teams).
   */
  async create(
    organizationId: string,
    invitedByUserId: string,
    email: string,
  ): Promise<{ invitation: Invitation; token: string }> {
    const token = randomBytes(32).toString('hex');
    const invitation = this.invitations.create({
      organizationId,
      email: email.toLowerCase(),
      tokenHash: hashToken(token),
      invitedByUserId,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      acceptedAt: null,
    });
    const saved = await this.invitations.save(invitation);
    return { invitation: saved, token };
  }

  /** Looks up a pending, unexpired invitation by its raw token. */
  async findValidByToken(token: string): Promise<Invitation | null> {
    const invitation = await this.invitations.findOne({
      where: { tokenHash: hashToken(token) },
      relations: { organization: true },
    });
    if (
      !invitation ||
      invitation.acceptedAt ||
      invitation.expiresAt < new Date()
    ) {
      return null;
    }
    return invitation;
  }

  /** Marks an invitation as consumed once the invited user has signed up. */
  async markAccepted(id: string): Promise<void> {
    await this.invitations.update(id, { acceptedAt: new Date() });
  }

  /** All invitations for an organization, most recent first (Team page). */
  listForOrganization(organizationId: string): Promise<Invitation[]> {
    return this.invitations.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  /** Revokes a pending invitation. Scoped to the caller's own organization. */
  async revoke(organizationId: string, id: string): Promise<void> {
    const invitation = await this.invitations.findOne({ where: { id } });
    if (!invitation || invitation.organizationId !== organizationId) {
      throw new NotFoundException('Invitation not found.');
    }
    if (invitation.acceptedAt) {
      throw new ForbiddenException(
        'This invitation has already been accepted.',
      );
    }
    await this.invitations.remove(invitation);
  }
}
