import { Injectable, OnModuleInit } from '@nestjs/common';
import { ROLE_PERMISSIONS } from '../../domain/constants/role-permissions.map';
import { Permission } from '../../domain/enums/permission.enum';
import { Role } from '../../domain/enums/role.enum';
import { PermissionRepository } from '../persistence/repositories/permission.repository';
import { RoleRepository } from '../persistence/repositories/role.repository';

const PERMISSION_DEFINITIONS: Array<{
  code: Permission;
  resource: string;
  action: string;
  description: string;
  module: string;
}> = [
  {
    code: Permission.PLATFORM_MANAGE,
    resource: 'platform',
    action: 'manage',
    description: 'Manage SaaS platform',
    module: 'platform',
  },
  {
    code: Permission.ORG_MANAGE,
    resource: 'org',
    action: 'manage',
    description: 'Manage organization settings',
    module: 'organizations',
  },
  {
    code: Permission.USERS_MANAGE,
    resource: 'users',
    action: 'manage',
    description: 'Manage organization users',
    module: 'users',
  },
  {
    code: Permission.JOBS_READ,
    resource: 'jobs',
    action: 'read',
    description: 'View jobs',
    module: 'jobs',
  },
  {
    code: Permission.JOBS_WRITE,
    resource: 'jobs',
    action: 'write',
    description: 'Manage jobs',
    module: 'jobs',
  },
  {
    code: Permission.CANDIDATES_READ,
    resource: 'candidates',
    action: 'read',
    description: 'View candidates',
    module: 'candidates',
  },
  {
    code: Permission.CANDIDATES_WRITE,
    resource: 'candidates',
    action: 'write',
    description: 'Manage candidates',
    module: 'candidates',
  },
  {
    code: Permission.MATCHES_READ,
    resource: 'matches',
    action: 'read',
    description: 'View candidate matches',
    module: 'matching',
  },
  {
    code: Permission.MATCHES_WRITE,
    resource: 'matches',
    action: 'write',
    description: 'Manage candidate matches',
    module: 'matching',
  },
  {
    code: Permission.COMMUNICATIONS_READ,
    resource: 'communications',
    action: 'read',
    description: 'View communications',
    module: 'communications',
  },
  {
    code: Permission.COMMUNICATIONS_APPROVE,
    resource: 'communications',
    action: 'approve',
    description: 'Approve and send communications',
    module: 'communications',
  },
  {
    code: Permission.INTERVIEWS_READ,
    resource: 'interviews',
    action: 'read',
    description: 'View interviews',
    module: 'interviews',
  },
  {
    code: Permission.INTERVIEWS_WRITE,
    resource: 'interviews',
    action: 'write',
    description: 'Manage interviews',
    module: 'interviews',
  },
  {
    code: Permission.FEEDBACK_WRITE,
    resource: 'feedback',
    action: 'write',
    description: 'Submit interview feedback',
    module: 'feedback',
  },
  {
    code: Permission.ANALYTICS_READ,
    resource: 'analytics',
    action: 'read',
    description: 'View analytics',
    module: 'analytics',
  },
  {
    code: Permission.PORTAL_READ,
    resource: 'portal',
    action: 'read',
    description: 'Access candidate portal',
    module: 'portal',
  },
];

const ROLE_NAMES: Record<Role, string> = {
  [Role.SUPER_ADMIN]: 'Super Admin',
  [Role.CEO]: 'CEO',
  [Role.HR_ADMIN]: 'HR Admin',
  [Role.HR_EMPLOYEE]: 'HR Employee',
  [Role.INTERVIEWER]: 'Interviewer',
  [Role.CANDIDATE]: 'Candidate',
};

@Injectable()
export class AuthSeedService implements OnModuleInit {
  constructor(
    private readonly permissionRepository: PermissionRepository,
    private readonly roleRepository: RoleRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.permissionRepository.upsertMany(
      PERMISSION_DEFINITIONS.map((item) => ({
        code: item.code,
        resource: item.resource,
        action: item.action,
        description: item.description,
        module: item.module,
      })),
    );

    for (const role of Object.values(Role)) {
      await this.roleRepository.upsertSystemRole(
        role,
        ROLE_NAMES[role],
        ROLE_PERMISSIONS[role],
      );
    }
  }
}
