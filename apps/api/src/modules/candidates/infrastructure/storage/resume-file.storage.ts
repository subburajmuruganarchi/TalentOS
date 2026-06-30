import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

export interface ResumeStorageInput {
  organizationId: string;
  candidateId: string;
  resumeId: string;
  originalFilename: string;
  mimeType: string;
  buffer: Buffer;
}

export interface ResumeStorageResult {
  provider: string;
  bucket: string | null;
  path: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
}

@Injectable()
export class ResumeFileStorage {
  private readonly uploadRoot: string;

  constructor(private readonly configService: ConfigService) {
    this.uploadRoot = this.configService.get<string>('UPLOAD_ROOT', 'uploads');
  }

  async save(input: ResumeStorageInput): Promise<ResumeStorageResult> {
    const safeFilename = input.originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const relativePath = join(
      input.organizationId,
      'candidates',
      input.candidateId,
      'resumes',
      input.resumeId,
      safeFilename,
    );
    const absolutePath = join(this.uploadRoot, relativePath);

    await mkdir(
      join(
        this.uploadRoot,
        input.organizationId,
        'candidates',
        input.candidateId,
        'resumes',
        input.resumeId,
      ),
      { recursive: true },
    );
    await writeFile(absolutePath, input.buffer);

    const checksum = createHash('sha256').update(input.buffer).digest('hex');

    return {
      provider: 'local',
      bucket: null,
      path: relativePath.replace(/\\/g, '/'),
      mimeType: input.mimeType,
      sizeBytes: input.buffer.length,
      checksum: `sha256:${checksum}`,
    };
  }
}
