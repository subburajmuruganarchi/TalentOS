import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Types } from 'mongoose';
import type { AuthenticatedUser } from '../../auth/domain/interfaces/authenticated-user.interface';
import { CandidateSource, CandidateStatus } from '../domain/enums/candidate-status.enum';
import { ResumeParseStatus } from '../domain/enums/resume-parse-status.enum';
import {
  ALLOWED_RESUME_MIME_TYPES,
  ResumeMimeType,
} from '../domain/enums/resume-mime-type.enum';
import type { ResumeAiProcessor } from '../domain/interfaces/resume-ai-processor.interface';
import { RESUME_AI_PROCESSOR } from '../domain/interfaces/resume-ai-processor.interface';
import { CandidateRepository } from '../infrastructure/persistence/repositories/candidate.repository';
import { CandidateStoredFileRepository } from '../infrastructure/persistence/repositories/candidate-stored-file.repository';
import { ResumeRepository } from '../infrastructure/persistence/repositories/resume.repository';
import { CandidateDocument } from '../infrastructure/persistence/schemas/candidate.schema';
import { ResumeDocument } from '../infrastructure/persistence/schemas/resume.schema';
import { ResumeFileStorage } from '../infrastructure/storage/resume-file.storage';
import { CreateCandidateDto } from '../presentation/dto/create-candidate.dto';
import { UpdateCandidateDto } from '../presentation/dto/update-candidate.dto';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_BULK_FILES = 20;

export interface ResumeUploadResult {
  candidate: ReturnType<CandidatesService['toCandidateResponse']>;
  resume: ReturnType<CandidatesService['toResumeResponse']>;
}

@Injectable()
export class CandidatesService {
  constructor(
    private readonly candidateRepository: CandidateRepository,
    private readonly resumeRepository: ResumeRepository,
    private readonly storedFileRepository: CandidateStoredFileRepository,
    private readonly resumeFileStorage: ResumeFileStorage,
    @Inject(RESUME_AI_PROCESSOR)
    private readonly resumeAiProcessor: ResumeAiProcessor,
  ) {}

  async createCandidate(user: AuthenticatedUser, dto: CreateCandidateDto) {
    const organizationId = this.requireOrganizationId(user);
    const actorId = new Types.ObjectId(user.userId);

    const candidate = await this.candidateRepository.create({
      organizationId: new Types.ObjectId(organizationId),
      email: dto.email.toLowerCase(),
      phone: dto.phone ?? null,
      fullName: dto.fullName,
      source: dto.source ?? CandidateSource.UPLOAD,
      status: CandidateStatus.ACTIVE,
      currentResumeId: null,
      profile: {
        summary: null,
        totalExperienceYears: null,
        skills: [],
        experience: [],
        education: [],
        certifications: [],
        projects: [],
      },
      extraction: {
        status: ResumeParseStatus.QUEUED,
        aiAnalysisId: null,
        processingJobId: null,
        error: null,
        reviewedAt: null,
        reviewedBy: null,
      },
      assignedRecruiterId: actorId,
      createdBy: actorId,
      updatedBy: actorId,
    });

    return this.toCandidateResponse(candidate, []);
  }

  async listCandidates(user: AuthenticatedUser, status?: CandidateStatus) {
    const organizationId = this.requireOrganizationId(user);
    const candidates = await this.candidateRepository.findAll(organizationId, { status });

    return Promise.all(
      candidates.map(async (candidate) => {
        const resumes = await this.resumeRepository.findByCandidate(
          organizationId,
          candidate._id.toString(),
        );
        return this.toCandidateResponse(candidate, resumes);
      }),
    );
  }

  async getCandidate(user: AuthenticatedUser, candidateId: string) {
    const organizationId = this.requireOrganizationId(user);
    const candidate = await this.findCandidateOrThrow(organizationId, candidateId);
    const resumes = await this.resumeRepository.findByCandidate(organizationId, candidateId);
    return this.toCandidateResponse(candidate, resumes);
  }

  async updateCandidate(user: AuthenticatedUser, candidateId: string, dto: UpdateCandidateDto) {
    const organizationId = this.requireOrganizationId(user);
    await this.findCandidateOrThrow(organizationId, candidateId);

    const updated = await this.candidateRepository.update(organizationId, candidateId, {
      ...dto,
      ...(dto.email ? { email: dto.email.toLowerCase() } : {}),
      updatedBy: new Types.ObjectId(user.userId),
    });

    if (!updated) {
      throw new NotFoundException('Candidate not found');
    }

    const resumes = await this.resumeRepository.findByCandidate(organizationId, candidateId);
    return this.toCandidateResponse(updated, resumes);
  }

  async uploadResumesToCandidate(
    user: AuthenticatedUser,
    candidateId: string,
    files: Express.Multer.File[],
  ): Promise<ResumeUploadResult[]> {
    const organizationId = this.requireOrganizationId(user);
    await this.findCandidateOrThrow(organizationId, candidateId);
    this.validateFiles(files);

    const results: ResumeUploadResult[] = [];
    for (const file of files) {
      results.push(await this.processResumeUpload(user, organizationId, candidateId, file));
    }

    return results;
  }

  async bulkUploadResumes(
    user: AuthenticatedUser,
    files: Express.Multer.File[],
  ): Promise<ResumeUploadResult[]> {
    const organizationId = this.requireOrganizationId(user);
    this.validateFiles(files);

    const results: ResumeUploadResult[] = [];

    for (const file of files) {
      const candidate = await this.createCandidateFromResumeFilename(user, organizationId, file);
      const uploadResult = await this.processResumeUpload(
        user,
        organizationId,
        candidate._id.toString(),
        file,
      );
      results.push(uploadResult);
    }

    return results;
  }

  async listResumes(user: AuthenticatedUser, candidateId: string) {
    const organizationId = this.requireOrganizationId(user);
    await this.findCandidateOrThrow(organizationId, candidateId);
    const resumes = await this.resumeRepository.findByCandidate(organizationId, candidateId);

    return Promise.all(
      resumes.map(async (resume) => {
        const storedFile = await this.storedFileRepository.findById(
          organizationId,
          resume.documentId.toString(),
        );
        return this.toResumeResponse(resume, storedFile?.storage.path);
      }),
    );
  }

  private async processResumeUpload(
    user: AuthenticatedUser,
    organizationId: string,
    candidateId: string,
    file: Express.Multer.File,
  ): Promise<ResumeUploadResult> {
    const actorId = new Types.ObjectId(user.userId);
    const resumeId = new Types.ObjectId();
    const version = await this.resumeRepository.getNextVersion(organizationId, candidateId);
    await this.resumeRepository.deactivatePrimary(organizationId, candidateId);

    const stored = await this.resumeFileStorage.save({
      organizationId,
      candidateId,
      resumeId: resumeId.toString(),
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      buffer: file.buffer,
    });

    const storedFile = await this.storedFileRepository.create({
      organizationId: new Types.ObjectId(organizationId),
      entityType: 'resume',
      entityId: resumeId,
      storage: stored,
      originalFilename: file.originalname,
      status: 'active',
      uploadedBy: actorId,
      createdBy: actorId,
      updatedBy: actorId,
    });

    const queued = await this.resumeAiProcessor.queueParsing({
      organizationId,
      candidateId,
      resumeId: resumeId.toString(),
      documentId: storedFile._id.toString(),
    });

    const resume = await this.resumeRepository.createWithId(resumeId, {
      organizationId: new Types.ObjectId(organizationId),
      candidateId: new Types.ObjectId(candidateId),
      documentId: storedFile._id,
      version,
      isPrimary: true,
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSizeBytes: file.size,
      parseStatus: ResumeParseStatus.QUEUED,
      processingJobId: queued.processingJobId,
      aiAnalysisId: null,
      parsedAt: null,
      uploadedBy: actorId,
      createdBy: actorId,
      updatedBy: actorId,
    });

    await this.candidateRepository.update(organizationId, candidateId, {
      extraction: {
        status: ResumeParseStatus.QUEUED,
        aiAnalysisId: null,
        processingJobId: queued.processingJobId,
        error: null,
        reviewedAt: null,
        reviewedBy: null,
      },
      updatedBy: actorId,
    });

    await this.candidateRepository.setCurrentResume(
      organizationId,
      candidateId,
      resume._id,
      actorId,
    );

    const candidate = await this.findCandidateOrThrow(organizationId, candidateId);

    return {
      candidate: this.toCandidateResponse(candidate, [resume]),
      resume: this.toResumeResponse(resume, stored.path),
    };
  }

  private async createCandidateFromResumeFilename(
    user: AuthenticatedUser,
    organizationId: string,
    file: Express.Multer.File,
  ) {
    const actorId = new Types.ObjectId(user.userId);
    const baseName = file.originalname.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
    const placeholderEmail = `pending-${randomUUID()}@talentos.local`;

    return this.candidateRepository.create({
      organizationId: new Types.ObjectId(organizationId),
      email: placeholderEmail,
      phone: null,
      fullName: baseName || 'Unknown Candidate',
      source: CandidateSource.UPLOAD,
      status: CandidateStatus.ACTIVE,
      currentResumeId: null,
      profile: {
        summary: null,
        totalExperienceYears: null,
        skills: [],
        experience: [],
        education: [],
        certifications: [],
        projects: [],
      },
      extraction: {
        status: ResumeParseStatus.QUEUED,
        aiAnalysisId: null,
        processingJobId: null,
        error: null,
        reviewedAt: null,
        reviewedBy: null,
      },
      assignedRecruiterId: actorId,
      createdBy: actorId,
      updatedBy: actorId,
    });
  }

  private validateFiles(files: Express.Multer.File[]): void {
    if (!files?.length) {
      throw new BadRequestException('At least one resume file is required');
    }

    if (files.length > MAX_BULK_FILES) {
      throw new BadRequestException(`Maximum ${MAX_BULK_FILES} files allowed per upload`);
    }

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        throw new BadRequestException(`File ${file.originalname} exceeds maximum size of 10MB`);
      }

      if (!ALLOWED_RESUME_MIME_TYPES.includes(file.mimetype as ResumeMimeType)) {
        throw new BadRequestException(
          `File ${file.originalname}: unsupported type. Allowed: PDF, DOC, DOCX`,
        );
      }
    }
  }

  private requireOrganizationId(user: AuthenticatedUser): string {
    if (!user.organizationId) {
      throw new ForbiddenException('Organization context is required');
    }
    return user.organizationId;
  }

  private async findCandidateOrThrow(organizationId: string, candidateId: string) {
    const candidate = await this.candidateRepository.findById(organizationId, candidateId);
    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }
    return candidate;
  }

  toCandidateResponse(candidate: CandidateDocument, resumes: ResumeDocument[]) {
    return {
      id: candidate._id.toString(),
      email: candidate.email,
      phone: candidate.phone ?? null,
      fullName: candidate.fullName,
      source: candidate.source,
      status: candidate.status,
      currentResumeId: candidate.currentResumeId?.toString() ?? null,
      profile: candidate.profile,
      extraction: {
        status: candidate.extraction.status,
        processingJobId: candidate.extraction.processingJobId ?? null,
        aiAnalysisId: candidate.extraction.aiAnalysisId?.toString() ?? null,
        error: candidate.extraction.error ?? null,
        reviewedAt: candidate.extraction.reviewedAt ?? null,
        reviewedBy: candidate.extraction.reviewedBy?.toString() ?? null,
      },
      assignedRecruiterId: candidate.assignedRecruiterId?.toString() ?? null,
      resumes: resumes.map((r) => ({
        id: r._id.toString(),
        version: r.version,
        isPrimary: r.isPrimary,
        fileName: r.fileName,
        mimeType: r.mimeType,
        parseStatus: r.parseStatus,
        processingJobId: r.processingJobId ?? null,
      })),
      createdAt: candidate.createdAt,
      updatedAt: candidate.updatedAt,
    };
  }

  toResumeResponse(resume: ResumeDocument, fileLocation?: string) {
    return {
      id: resume._id.toString(),
      candidateId: resume.candidateId.toString(),
      documentId: resume.documentId.toString(),
      version: resume.version,
      isPrimary: resume.isPrimary,
      fileName: resume.fileName,
      mimeType: resume.mimeType,
      fileSizeBytes: resume.fileSizeBytes,
      fileLocation: fileLocation ?? null,
      parseStatus: resume.parseStatus,
      processingJobId: resume.processingJobId ?? null,
      aiAnalysisId: resume.aiAnalysisId?.toString() ?? null,
      parsedAt: resume.parsedAt ?? null,
      createdAt: resume.createdAt,
      updatedAt: resume.updatedAt,
    };
  }
}
