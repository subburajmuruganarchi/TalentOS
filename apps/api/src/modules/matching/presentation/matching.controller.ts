import { Controller, Get, Param, Post } from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/domain/interfaces/authenticated-user.interface';
import { Permission } from '../../auth/domain/enums/permission.enum';
import { Role } from '../../auth/domain/enums/role.enum';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { RequirePermissions } from '../../auth/presentation/decorators/permissions.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { MatchingService } from '../application/matching.service';

@Controller('jobs/:jobId/candidates/:candidateId/match')
@Roles(Role.HR_ADMIN, Role.HR_EMPLOYEE)
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @Post()
  @RequirePermissions(Permission.MATCHES_WRITE)
  runMatch(
    @CurrentUser() user: AuthenticatedUser,
    @Param('jobId') jobId: string,
    @Param('candidateId') candidateId: string,
  ) {
    return this.matchingService.runMatch(user, jobId, candidateId);
  }

  @Get()
  @RequirePermissions(Permission.MATCHES_READ)
  getLatestMatch(
    @CurrentUser() user: AuthenticatedUser,
    @Param('jobId') jobId: string,
    @Param('candidateId') candidateId: string,
  ) {
    return this.matchingService.getLatestMatch(user, jobId, candidateId);
  }
}
