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
 * The business account that owns content within the platform (scope §8).
 * The POC runs with a single organization (Decision D1), but the model is
 * shaped so multi-tenancy can be added later without a rewrite (NFR-7).
 */
@Entity({ name: 'organizations' })
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  /** Base domain used when building content URLs and metadata (FR-1.4). */
  @Column({ name: 'base_domain', type: 'varchar', length: 255 })
  baseDomain: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => User, (user) => user.organization)
  users: User[];

  /** All content owned by this organization (scope §6, FR-1.2). */
  @OneToMany(() => ContentItem, (item) => item.organization)
  contentItems: ContentItem[];
}
