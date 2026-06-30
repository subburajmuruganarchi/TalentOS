import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ROLE_PERMISSIONS } from '../domain/constants/role-permissions.map';
import { Role } from '../domain/enums/role.enum';
import { AuthenticatedUser } from '../domain/interfaces/authenticated-user.interface';
import { JwtPayload } from '../domain/interfaces/jwt-payload.interface';
import { OrganizationMemberRepository } from '../infrastructure/persistence/repositories/organization-member.repository';
import { OrganizationRepository } from '../infrastructure/persistence/repositories/organization.repository';
import { UserRepository } from '../infrastructure/persistence/repositories/user.repository';
import { Types } from 'mongoose';
import { LoginDto } from '../presentation/dto/login.dto';
import { RegisterDto } from '../presentation/dto/register.dto';

export interface AuthTokens {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
}

export interface AuthResult {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
    organizationId: string | null;
    permissions: string[];
  };
  tokens: AuthTokens;
}

@Injectable()
export class AuthService {
  private readonly saltRounds = 12;

  constructor(
    private readonly userRepository: UserRepository,
    private readonly organizationRepository: OrganizationRepository,
    private readonly organizationMemberRepository: OrganizationMemberRepository,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    if (dto.role === Role.SUPER_ADMIN) {
      throw new BadRequestException(
        'Super Admin accounts cannot be self-registered',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, this.saltRounds);
    const user = await this.userRepository.create({
      email: dto.email.toLowerCase(),
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      status: 'active',
      isPlatformAdmin: false,
    });

    let organizationId: string;
    let role: Role;

    if (dto.organizationName) {
      const slug = this.slugify(dto.organizationName);
      const slugTaken = await this.organizationRepository.findBySlug(slug);
      if (slugTaken) {
        throw new ConflictException('Organization name is already taken');
      }

      const organization = await this.organizationRepository.create({
        name: dto.organizationName,
        slug,
        status: 'active',
      });

      organizationId = organization._id.toString();
      role = Role.HR_ADMIN;
    } else {
      if (!dto.organizationId) {
        throw new BadRequestException(
          'organizationId is required when organizationName is not provided',
        );
      }

      const organization = await this.organizationRepository.findById(
        dto.organizationId,
      );
      if (!organization) {
        throw new BadRequestException('Organization not found');
      }

      organizationId = organization._id.toString();
      role = dto.role ?? Role.HR_EMPLOYEE;
    }

    await this.organizationMemberRepository.create({
      organizationId: new Types.ObjectId(organizationId),
      userId: user._id,
      role,
      status: 'active',
      joinedAt: new Date(),
    });

    return this.buildAuthResult(user, organizationId, role);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.isPlatformAdmin) {
      return this.buildAuthResult(user, null, Role.SUPER_ADMIN);
    }

    const memberships =
      await this.organizationMemberRepository.findActiveByUser(
        user._id.toString(),
      );

    if (memberships.length === 0) {
      throw new UnauthorizedException(
        'User is not assigned to any organization',
      );
    }

    let membership = memberships[0];

    if (dto.organizationId) {
      const selected = memberships.find(
        (item) => item.organizationId.toString() === dto.organizationId,
      );
      if (!selected) {
        throw new UnauthorizedException(
          'User does not belong to the specified organization',
        );
      }
      membership = selected;
    } else if (memberships.length > 1) {
      throw new BadRequestException(
        'organizationId is required when user belongs to multiple organizations',
      );
    }

    await this.userRepository.updateLastLogin(user._id.toString());

    return this.buildAuthResult(
      user,
      membership.organizationId.toString(),
      membership.role,
    );
  }

  async getProfile(user: AuthenticatedUser) {
    const dbUser = await this.userRepository.findById(user.userId);
    if (!dbUser) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: dbUser._id.toString(),
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      role: user.role,
      organizationId: user.organizationId,
      permissions: user.permissions,
    };
  }

  validatePayload(payload: JwtPayload): AuthenticatedUser {
    return {
      userId: payload.sub,
      email: payload.email,
      organizationId: payload.organizationId,
      role: payload.role,
      permissions: payload.permissions,
    };
  }

  private async buildAuthResult(
    user: {
      _id: { toString(): string };
      email: string;
      firstName: string;
      lastName: string;
    },
    organizationId: string | null,
    role: Role,
  ): Promise<AuthResult> {
    const permissions = ROLE_PERMISSIONS[role].map((permission) =>
      permission.toString(),
    );
    const payload: JwtPayload = {
      sub: user._id.toString(),
      email: user.email,
      organizationId,
      role,
      permissions,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role,
        organizationId,
        permissions,
      },
      tokens: {
        accessToken,
        tokenType: 'Bearer',
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
      },
    };
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
