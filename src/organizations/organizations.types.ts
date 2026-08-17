import { UserRole } from '../users/user-role.enum';

/** Public representation of the caller's organization. */
export interface OrganizationProfile {
  id: string;
  name: string;
  baseDomain: string | null;
  createdAt: Date;
}

/** A user belonging to the caller's organization (Team page). */
export interface OrganizationMember {
  id: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  createdAt: Date;
}

/** An invitation as shown to existing members — the token itself is never re-exposed. */
export interface InvitationSummary {
  id: string;
  email: string;
  status: 'pending' | 'accepted' | 'expired';
  createdAt: Date;
  expiresAt: Date;
}

/** Returned once, at creation time, so the inviter can share the link. */
export interface CreatedInvitation {
  id: string;
  email: string;
  token: string;
  expiresAt: Date;
}

/** Public preview of an invite, shown on the signup page before an account exists. */
export interface InvitationPreview {
  organizationName: string;
  email: string;
}
