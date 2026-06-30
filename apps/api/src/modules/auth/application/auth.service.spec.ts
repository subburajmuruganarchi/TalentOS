import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { Role } from '../domain/enums/role.enum';
import { OrganizationMemberRepository } from '../infrastructure/persistence/repositories/organization-member.repository';
import { OrganizationRepository } from '../infrastructure/persistence/repositories/organization.repository';
import { UserRepository } from '../infrastructure/persistence/repositories/user.repository';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  const userRepository = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    updateLastLogin: jest.fn(),
  };

  const organizationRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findBySlug: jest.fn(),
  };

  const organizationMemberRepository = {
    create: jest.fn(),
    findActiveByUser: jest.fn(),
    findByUserAndOrganization: jest.fn(),
  };

  const jwtService = {
    signAsync: jest.fn().mockResolvedValue('signed-token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserRepository, useValue: userRepository },
        { provide: OrganizationRepository, useValue: organizationRepository },
        {
          provide: OrganizationMemberRepository,
          useValue: organizationMemberRepository,
        },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('logs in an active organization member', async () => {
    userRepository.findByEmail.mockResolvedValue({
      _id: { toString: () => 'user-1' },
      email: 'hr@acme.com',
      firstName: 'HR',
      lastName: 'User',
      passwordHash: await bcrypt.hash('password123', 12),
      status: 'active',
      isPlatformAdmin: false,
    });

    organizationMemberRepository.findActiveByUser.mockResolvedValue([
      {
        organizationId: { toString: () => 'org-1' },
        role: Role.HR_EMPLOYEE,
      },
    ]);

    const result = await service.login({
      email: 'hr@acme.com',
      password: 'password123',
    });

    expect(result.tokens.accessToken).toBe('signed-token');
    expect(result.user.role).toBe(Role.HR_EMPLOYEE);
    expect(result.user.organizationId).toBe('org-1');
  });

  it('rejects invalid credentials', async () => {
    userRepository.findByEmail.mockResolvedValue(null);

    await expect(
      service.login({ email: 'missing@acme.com', password: 'password123' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
