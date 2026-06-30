import { Role } from '../enums/role.enum';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  organizationId: string | null;
  role: Role;
  permissions: string[];
}
