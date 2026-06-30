import { Permission } from '../enums/permission.enum';
import { Role } from '../enums/role.enum';

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.SUPER_ADMIN]: Object.values(Permission),
  [Role.CEO]: [
    Permission.ANALYTICS_READ,
    Permission.JOBS_READ,
    Permission.CANDIDATES_READ,
  ],
  [Role.HR_ADMIN]: [
    Permission.ORG_MANAGE,
    Permission.USERS_MANAGE,
    Permission.JOBS_READ,
    Permission.JOBS_WRITE,
    Permission.CANDIDATES_READ,
    Permission.CANDIDATES_WRITE,
    Permission.MATCHES_READ,
    Permission.MATCHES_WRITE,
    Permission.COMMUNICATIONS_READ,
    Permission.COMMUNICATIONS_APPROVE,
    Permission.INTERVIEWS_READ,
    Permission.INTERVIEWS_WRITE,
    Permission.FEEDBACK_WRITE,
    Permission.ANALYTICS_READ,
  ],
  [Role.HR_EMPLOYEE]: [
    Permission.JOBS_READ,
    Permission.JOBS_WRITE,
    Permission.CANDIDATES_READ,
    Permission.CANDIDATES_WRITE,
    Permission.MATCHES_READ,
    Permission.MATCHES_WRITE,
    Permission.COMMUNICATIONS_READ,
    Permission.COMMUNICATIONS_APPROVE,
    Permission.INTERVIEWS_READ,
    Permission.INTERVIEWS_WRITE,
  ],
  [Role.INTERVIEWER]: [
    Permission.INTERVIEWS_READ,
    Permission.FEEDBACK_WRITE,
    Permission.CANDIDATES_READ,
  ],
  [Role.CANDIDATE]: [Permission.PORTAL_READ],
};
