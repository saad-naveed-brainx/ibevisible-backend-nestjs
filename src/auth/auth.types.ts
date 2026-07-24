/** Claims embedded in the signed JWT. */
export interface JwtPayload {
  sub: string; // user id
  email: string;
  organizationId: string;
}

/** The user shape attached to the request after JWT validation. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  organizationId: string;
}

/** Public representation of a user (never includes the password hash). */
export interface UserProfile {
  id: string;
  email: string;
  fullName: string | null;
  organizationId: string;
  createdAt: Date;
}

export interface AuthResult {
  accessToken: string;
  user: UserProfile;
}
