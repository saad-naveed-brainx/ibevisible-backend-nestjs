import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { UserRole } from './user-role.enum';

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  fullName?: string | null;
  organizationId: string;
  role: UserRole;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  findById(id: string): Promise<User | null> {
    return this.users.findOne({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.users.findOne({ where: { email: email.toLowerCase() } });
  }

  /** All members of an organization, oldest first (Team page). */
  findAllByOrganization(organizationId: string): Promise<User[]> {
    return this.users.find({
      where: { organizationId },
      order: { createdAt: 'ASC' },
    });
  }

  create(input: CreateUserInput): Promise<User> {
    const user = this.users.create({
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      fullName: input.fullName ?? null,
      organizationId: input.organizationId,
      role: input.role,
    });
    return this.users.save(user);
  }
}
