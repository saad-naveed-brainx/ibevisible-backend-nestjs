import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './organization.entity';

/** The single POC organization, seeded by the InitAuth migration. */
export const DEFAULT_ORGANIZATION_ID = '00000000-0000-0000-0000-000000000001';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizations: Repository<Organization>,
  ) {}

  findById(id: string): Promise<Organization | null> {
    return this.organizations.findOne({ where: { id } });
  }

  /**
   * The organization new users are attached to during the single-org POC
   * (Decision D1). Falls back to the first organization if the seeded id is
   * ever missing.
   */
  async getDefault(): Promise<Organization> {
    const seeded = await this.findById(DEFAULT_ORGANIZATION_ID);
    if (seeded) {
      return seeded;
    }

    const first = await this.organizations.find({
      order: { createdAt: 'ASC' },
      take: 1,
    });
    if (first.length === 0) {
      throw new NotFoundException('No organization has been provisioned.');
    }
    return first[0];
  }
}
