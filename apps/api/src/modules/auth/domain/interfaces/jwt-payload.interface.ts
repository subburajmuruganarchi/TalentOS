import { Role } from '../enums/role.enum';

export interface JwtPayload {
  sub: string;
  email: string;
  organizationId: string | null;
  role: Role;
  permissions: string[];
}
