import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { ContentItem } from '../content/content-item.entity';

/**
 * The business account (tenant) that owns content within the platform
 * (scope §8, NFR-7). Any number of organizations can exist side by side;
 * each user belongs to exactly one, and all content is scoped by
 * `organization_id` so tenants never see each other's data.
 */
@Entity({ name: 'organizations' })
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  /**
   * Base domain used when building content URLs and metadata (FR-1.4).
   * Null until the organization configures a custom domain (e.g. right after
   * self-serve signup, before onboarding is complete).
   */
  @Column({ name: 'base_domain', type: 'varchar', length: 255, nullable: true })
  baseDomain: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => User, (user) => user.organization)
  users: User[];

  /** All content owned by this organization (scope §6, FR-1.2). */
  @OneToMany(() => ContentItem, (item) => item.organization)
  contentItems: ContentItem[];
}
