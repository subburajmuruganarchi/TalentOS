import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import type { AuthenticatedUser } from '../../auth/domain/interfaces/authenticated-user.interface';
import { ExtractionStatus } from '../domain/enums/extraction-status.enum';
import {
  ALLOWED_JOB_DESCRIPTION_MIME_TYPES,
  JobDescriptionMimeType,
  JobDescriptionSourceType,
} from '../domain/enums/job-description-source.enum';
import { JobStatus } from '../domain/enums/job-status.enum';
import type { JobDescriptionAiProcessor } from '../domain/interfaces/job-description-ai-processor.interface';
import { JOB_DESCRIPTION_AI_PROCESSOR } from '../domain/interfaces/job-description-ai-processor.interface';
import { DocumentRepository } from '../infrastructure/persistence/repositories/document.repository';
import { JobDescriptionRepository } from '../infrastructure/persistence/repositories/job-description.repository';
import { JobRepository } from '../infrastructure/persistence/repositories/job.repository';
import { LocalDocumentStorage } from '../infrastructure/storage/local-document.storage';
import { CreateJobDto } from '../presentation/dto/create-job.dto';
import { LinkedInJobDescriptionDto } from '../presentation/dto/linkedin-job-description.dto';
import { UpdateJobDto } from '../presentation/dto/update-job.dto';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

@Injectable()
export class JobsService {
  constructor(
    private readonly jobRepository: JobRepository,
    private readonly jobDescriptionRepository: JobDescriptionRepository,
    private readonly documentRepository: DocumentRepository,
    private readonly localDocumentStorage: LocalDocumentStorage,
    @Inject(JOB_DESCRIPTION_AI_PROCESSOR)
    private readonly aiProcessor: JobDescriptionAiProcessor,
  ) {}

  async createJob(user: AuthenticatedUser, dto: CreateJobDto) {
    const organizationId = this.requireOrganizationId(user);
    const actorId = new Types.ObjectId(user.userId);

    const job = await this.jobRepository.create({
      organizationId: new Types.ObjectId(organizationId),
      title: dto.title,
      status: JobStatus.DRAFT,
      department: dto.department ?? null,
      location: dto.location ?? null,
      employmentType: dto.employmentType ?? null,
      createdBy: actorId,
      updatedBy: actorId,
    });

    return this.toJobResponse(job, null);
  }

  async listJobs(user: AuthenticatedUser, status?: JobStatus) {
    const organizationId = this.requireOrganizationId(user);
    const jobs = await this.jobRepository.findAll(organizationId, { status });
    const responses = await Promise.all(
      jobs.map(async (job) => {
        const jobDescription = job.currentJobDescriptionId
          ? await this.jobDescriptionRepository.findById(
              organizationId,
              job.currentJobDescriptionId.toString(),
            )
          : null;
        return this.toJobResponse(job, jobDescription);
      }),
    );
    return responses;
  }

  async getJob(user: AuthenticatedUser, jobId: string) {
    const organizationId = this.requireOrganizationId(user);
    const job = await this.findJobOrThrow(organizationId, jobId);
    const jobDescription = job.currentJobDescriptionId
      ? await this.jobDescriptionRepository.findById(
          organizationId,
          job.currentJobDescriptionId.toString(),
        )
      : null;

    return this.toJobResponse(job, jobDescription);
  }

  async updateJob(user: AuthenticatedUser, jobId: string, dto: UpdateJobDto) {
    const organizationId = this.requireOrganizationId(user);
    await this.findJobOrThrow(organizationId, jobId);

    const updated = await this.jobRepository.update(organizationId, jobId, {
      ...dto,
      updatedBy: new Types.ObjectId(user.userId),
    });

    if (!updated) {
      throw new NotFoundException('Job not found');
    }

    const jobDescription = updated.currentJobDescriptionId
      ? await this.jobDescriptionRepository.findById(
          organizationId,
          updated.currentJobDescriptionId.toString(),
        )
      : null;

    return this.toJobResponse(updated, jobDescription);
  }

  async uploadJobDescription(
    user: AuthenticatedUser,
    jobId: string,
    file: Express.Multer.File,
  ) {
    const organizationId = this.requireOrganizationId(user);
    await this.findJobOrThrow(organizationId, jobId);
    this.validateUploadedFile(file);
    const mimeType = file.mimetype as JobDescriptionMimeType;

    const actorId = new Types.ObjectId(user.userId);
    const version = await this.jobDescriptionRepository.getNextVersion(
      organizationId,
      jobId,
    );
    await this.jobDescriptionRepository.deactivateActiveVersions(
      organizationId,
      jobId,
    );

    const jobDescription = await this.jobDescriptionRepository.create({
      organizationId: new Types.ObjectId(organizationId),
      jobId: new Types.ObjectId(jobId),
      version,
      isActive: true,
      source: {
        type: JobDescriptionSourceType.UPLOAD,
        documentId: null,
        linkedinUrl: null,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
      },
      rawText: null,
      structuredMetadata: null,
      extraction: {
        status: ExtractionStatus.QUEUED,
        aiAnalysisId: null,
        processingJobId: null,
        error: null,
        reviewedAt: null,
        reviewedBy: null,
      },
      createdBy: actorId,
      updatedBy: actorId,
    });

    const stored = await this.localDocumentStorage.save({
      organizationId,
      jobId,
      jobDescriptionId: jobDescription._id.toString(),
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      buffer: file.buffer,
    });

    const document = await this.documentRepository.create({
      organizationId: new Types.ObjectId(organizationId),
      entityType: 'job_description',
      entityId: jobDescription._id,
      storage: stored,
      originalFilename: file.originalname,
      status: 'active',
      uploadedBy: actorId,
      createdBy: actorId,
      updatedBy: actorId,
    });

    jobDescription.source.documentId = document._id;

    let extractionStatus = ExtractionStatus.QUEUED;
    let rawText: string | null = null;
    let processingJobId: string | null = null;

    if (mimeType === JobDescriptionMimeType.TXT) {
      rawText = file.buffer.toString('utf-8');
      extractionStatus = ExtractionStatus.READY_FOR_REVIEW;
    } else {
      const queued = await this.aiProcessor.queueExtraction({
        organizationId,
        jobId,
        jobDescriptionId: jobDescription._id.toString(),
        sourceType: JobDescriptionSourceType.UPLOAD,
        documentId: document._id.toString(),
      });
      processingJobId = queued.processingJobId;
    }

    const updatedJobDescription =
      await this.jobDescriptionRepository.updateExtraction(
        organizationId,
        jobDescription._id.toString(),
        {
          status: extractionStatus,
          processingJobId,
        },
        {
          rawText,
          source: {
            type: JobDescriptionSourceType.UPLOAD,
            documentId: document._id,
            linkedinUrl: null,
            originalFilename: file.originalname,
            mimeType: file.mimetype,
          },
          updatedBy: actorId,
        },
      );

    await this.jobRepository.setCurrentJobDescription(
      organizationId,
      jobId,
      jobDescription._id,
      actorId,
    );

    return this.toJobDescriptionResponse(updatedJobDescription!);
  }

  async submitLinkedInJobDescription(
    user: AuthenticatedUser,
    jobId: string,
    dto: LinkedInJobDescriptionDto,
  ) {
    const organizationId = this.requireOrganizationId(user);
    await this.findJobOrThrow(organizationId, jobId);

    const actorId = new Types.ObjectId(user.userId);
    const version = await this.jobDescriptionRepository.getNextVersion(
      organizationId,
      jobId,
    );
    await this.jobDescriptionRepository.deactivateActiveVersions(
      organizationId,
      jobId,
    );

    const jobDescription = await this.jobDescriptionRepository.create({
      organizationId: new Types.ObjectId(organizationId),
      jobId: new Types.ObjectId(jobId),
      version,
      isActive: true,
      source: {
        type: JobDescriptionSourceType.LINKEDIN_URL,
        documentId: null,
        linkedinUrl: dto.linkedinUrl,
        originalFilename: null,
        mimeType: null,
      },
      rawText: null,
      structuredMetadata: null,
      extraction: {
        status: ExtractionStatus.QUEUED,
        aiAnalysisId: null,
        processingJobId: null,
        error: null,
        reviewedAt: null,
        reviewedBy: null,
      },
      createdBy: actorId,
      updatedBy: actorId,
    });

    const queued = await this.aiProcessor.queueExtraction({
      organizationId,
      jobId,
      jobDescriptionId: jobDescription._id.toString(),
      sourceType: JobDescriptionSourceType.LINKEDIN_URL,
      linkedinUrl: dto.linkedinUrl,
    });

    const updatedJobDescription =
      await this.jobDescriptionRepository.updateExtraction(
        organizationId,
        jobDescription._id.toString(),
        { processingJobId: queued.processingJobId },
      );

    await this.jobRepository.setCurrentJobDescription(
      organizationId,
      jobId,
      jobDescription._id,
      actorId,
    );

    return this.toJobDescriptionResponse(
      updatedJobDescription ?? jobDescription,
    );
  }

  async getCurrentJobDescription(user: AuthenticatedUser, jobId: string) {
    const organizationId = this.requireOrganizationId(user);
    await this.findJobOrThrow(organizationId, jobId);

    const jobDescription = await this.jobDescriptionRepository.findActiveByJob(
      organizationId,
      jobId,
    );

    if (!jobDescription) {
      throw new NotFoundException('No job description found for this job');
    }

    return this.toJobDescriptionResponse(jobDescription);
  }

  async listJobDescriptionVersions(user: AuthenticatedUser, jobId: string) {
    const organizationId = this.requireOrganizationId(user);
    await this.findJobOrThrow(organizationId, jobId);

    const versions = await this.jobDescriptionRepository.findAllByJob(
      organizationId,
      jobId,
    );
    return versions.map((item) => this.toJobDescriptionResponse(item));
  }

  private validateUploadedFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException('File exceeds maximum size of 10MB');
    }

    if (
      !ALLOWED_JOB_DESCRIPTION_MIME_TYPES.includes(
        file.mimetype as JobDescriptionMimeType,
      )
    ) {
      throw new BadRequestException(
        'Unsupported file type. Allowed: PDF, DOC, DOCX, TXT',
      );
    }
  }

  private requireOrganizationId(user: AuthenticatedUser): string {
    if (!user.organizationId) {
      throw new ForbiddenException('Organization context is required');
    }
    return user.organizationId;
  }

  private async findJobOrThrow(organizationId: string, jobId: string) {
    const job = await this.jobRepository.findById(organizationId, jobId);
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    return job;
  }

  private toJobResponse(
    job: {
      _id: Types.ObjectId;
      title: string;
      status: JobStatus;
      department?: string | null;
      location?: string | null;
      employmentType?: string | null;
      currentJobDescriptionId?: Types.ObjectId | null;
      createdAt?: Date;
      updatedAt?: Date;
    },
    jobDescription: Awaited<ReturnType<JobDescriptionRepository['findById']>>,
  ) {
    return {
      id: job._id.toString(),
      title: job.title,
      status: job.status,
      department: job.department ?? null,
      location: job.location ?? null,
      employmentType: job.employmentType ?? null,
      currentJobDescriptionId: job.currentJobDescriptionId?.toString() ?? null,
      currentJobDescription: jobDescription
        ? this.toJobDescriptionResponse(jobDescription)
        : null,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }

  private toJobDescriptionResponse(
    jobDescription: NonNullable<
      Awaited<ReturnType<JobDescriptionRepository['findById']>>
    >,
  ) {
    return {
      id: jobDescription._id.toString(),
      jobId: jobDescription.jobId.toString(),
      version: jobDescription.version,
      isActive: jobDescription.isActive,
      source: {
        type: jobDescription.source.type,
        documentId: jobDescription.source.documentId?.toString() ?? null,
        linkedinUrl: jobDescription.source.linkedinUrl,
        originalFilename: jobDescription.source.originalFilename,
        mimeType: jobDescription.source.mimeType,
      },
      rawText: jobDescription.rawText,
      structuredMetadata: jobDescription.structuredMetadata,
      extraction: {
        status: jobDescription.extraction.status,
        processingJobId: jobDescription.extraction.processingJobId,
        aiAnalysisId:
          jobDescription.extraction.aiAnalysisId?.toString() ?? null,
        error: jobDescription.extraction.error,
        reviewedAt: jobDescription.extraction.reviewedAt,
        reviewedBy: jobDescription.extraction.reviewedBy?.toString() ?? null,
      },
      createdAt: jobDescription.createdAt,
      updatedAt: jobDescription.updatedAt,
    };
  }
}
