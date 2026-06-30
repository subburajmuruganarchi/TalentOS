/** Shared enums and types used across web and API. */

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  CEO = 'ceo',
  HR_ADMIN = 'hr_admin',
  HR_EMPLOYEE = 'hr_employee',
  INTERVIEWER = 'interviewer',
  CANDIDATE = 'candidate',
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  environment?: string;
}

export interface ApiError {
  statusCode: number;
  message: string;
  code?: string;
}
