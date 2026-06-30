import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './application/auth.service';
import { AuthSeedService } from './infrastructure/seed/auth.seed.service';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';
import { OrganizationMemberRepository } from './infrastructure/persistence/repositories/organization-member.repository';
import { OrganizationRepository } from './infrastructure/persistence/repositories/organization.repository';
import { PermissionRepository } from './infrastructure/persistence/repositories/permission.repository';
import { RoleRepository } from './infrastructure/persistence/repositories/role.repository';
import { UserRepository } from './infrastructure/persistence/repositories/user.repository';
import {
  OrganizationMember,
  OrganizationMemberSchema,
} from './infrastructure/persistence/schemas/organization-member.schema';
import {
  Organization,
  OrganizationSchema,
} from './infrastructure/persistence/schemas/organization.schema';
import {
  PermissionEntity,
  PermissionSchema,
} from './infrastructure/persistence/schemas/permission.schema';
import {
  RoleEntity,
  RoleSchema,
} from './infrastructure/persistence/schemas/role.schema';
import {
  User,
  UserSchema,
} from './infrastructure/persistence/schemas/user.schema';
import { AuthController } from './presentation/auth.controller';
import { JwtAuthGuard } from './presentation/guards/jwt-auth.guard';
import { PermissionsGuard } from './presentation/guards/permissions.guard';
import { RolesGuard } from './presentation/guards/roles.guard';
import { PermissionsMiddleware } from './presentation/middleware/permissions.middleware';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'change-me'),
        signOptions: {
          expiresIn: config.get<string>(
            'JWT_ACCESS_EXPIRES_IN',
            '15m',
          ) as `${number}${'s' | 'm' | 'h' | 'd'}`,
        },
      }),
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Organization.name, schema: OrganizationSchema },
      { name: OrganizationMember.name, schema: OrganizationMemberSchema },
      { name: RoleEntity.name, schema: RoleSchema },
      { name: PermissionEntity.name, schema: PermissionSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthSeedService,
    UserRepository,
    OrganizationRepository,
    OrganizationMemberRepository,
    RoleRepository,
    PermissionRepository,
    JwtStrategy,
    PermissionsMiddleware,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(PermissionsMiddleware)
      .exclude(
        { path: 'health', method: RequestMethod.GET },
        { path: 'auth/register', method: RequestMethod.POST },
        { path: 'auth/login', method: RequestMethod.POST },
      )
      .forRoutes('*');
  }
}
