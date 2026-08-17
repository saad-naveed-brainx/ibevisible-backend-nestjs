import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './organization.entity';

export interface CreateOrganizationInput {
  name: string;
  baseDomain?: string | null;
}

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizations: Repository<Organization>,
  ) {}

  findById(id: string): Promise<Organization | null> {
    return this.organizations.findOne({ where: { id } });
  }

  /** Creates a brand-new tenant, e.g. for a self-serve signup (FR-1.1). */
  create(input: CreateOrganizationInput): Promise<Organization> {
    const organization = this.organizations.create({
      name: input.name.trim(),
      baseDomain: input.baseDomain?.trim() || null,
    });
    return this.organizations.save(organization);
  }
}
