/**
 * A user's permission level within their organization (multi-organization
 * support, "invite content creators" feature). Assigned once at signup and
 * never changed since there is no promotion/demotion flow yet.
 */
export enum UserRole {
  /** Created the organization at signup; can invite/manage content creators. */
  Owner = 'owner',
  /** Joined via an invite link; authors content but cannot manage the team. */
  ContentCreator = 'content_creator',
}
