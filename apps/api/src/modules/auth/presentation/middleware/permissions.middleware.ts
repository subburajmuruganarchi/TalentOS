import {
  ForbiddenException,
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { NextFunction, Request, Response } from 'express';
import { AuthService } from '../../application/auth.service';
import { JwtPayload } from '../../domain/interfaces/jwt-payload.interface';

const PUBLIC_PATH_SUFFIXES = ['/health', '/auth/register', '/auth/login'];

@Injectable()
export class PermissionsMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    const requestPath = req.originalUrl.split('?')[0];

    if (PUBLIC_PATH_SUFFIXES.some((suffix) => requestPath.endsWith(suffix))) {
      next();
      return;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.slice(7);

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET', 'change-me'),
      });

      const user = this.authService.validatePayload(payload);
      (
        req as Request & { user: ReturnType<AuthService['validatePayload']> }
      ).user = user;

      const organizationHeader = req.headers['x-organization-id'];
      if (
        organizationHeader &&
        user.organizationId &&
        organizationHeader !== user.organizationId
      ) {
        throw new ForbiddenException('Organization context mismatch');
      }

      next();
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
