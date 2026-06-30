import {
  IsEmail,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Role } from '../../domain/enums/role.enum';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsString()
  @MinLength(1)
  lastName!: string;

  @ValidateIf((dto: RegisterDto) => !dto.organizationName)
  @IsMongoId()
  organizationId?: string;

  @ValidateIf((dto: RegisterDto) => !dto.organizationId)
  @IsString()
  @MinLength(2)
  organizationName?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
