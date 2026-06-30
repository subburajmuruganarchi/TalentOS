import { IsUrl } from 'class-validator';

export class LinkedInJobDescriptionDto {
  @IsUrl({ require_protocol: true })
  linkedinUrl!: string;
}
