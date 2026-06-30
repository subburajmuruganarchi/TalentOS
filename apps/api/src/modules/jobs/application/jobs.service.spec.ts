import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { Role } from '../../auth/domain/enums/role.enum';
import { ExtractionStatus } from '../domain/enums/extraction-status.enum';
import { JobDescriptionSourceType } from '../domain/enums/job-description-source.enum';
import { JobStatus } from '../domain/enums/job-status.enum';
import { JOB_DESCRIPTION_AI_PROCESSOR } from '../domain/interfaces/job-description-ai-processor.interface';
import { DocumentRepository } from '../infrastructure/persistence/repositories/document.repository';
import { JobDescriptionRepository } from '../infrastructure/persistence/repositories/job-description.repository';
import { JobRepository } from '../infrastructure/persistence/repositories/job.repository';
import { LocalDocumentStorage } from '../infrastructure/storage/local-document.storage';
import { JobsService } from './jobs.service';

describe('JobsService', () => {
  let service: JobsService;

  const user = {
    userId: new Types.ObjectId().toString(),
    email: 'hr@acme.com',
    organizationId: new Types.ObjectId().toString(),
    role: Role.HR_ADMIN,
    permissions: ['jobs:write'],
  };

  const jobRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    setCurrentJobDescription: jest.fn(),
  };

  const jobDescriptionRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findActiveByJob: jest.fn(),
    findAllByJob: jest.fn(),
    getNextVersion: jest.fn(),
    deactivateActiveVersions: jest.fn(),
    updateExtraction: jest.fn(),
  };

  const documentRepository = {
    create: jest.fn(),
  };

  const localDocumentStorage = {
    save: jest.fn(),
  };

  const aiProcessor = {
    queueExtraction: jest
      .fn()
      .mockResolvedValue({ processingJobId: 'job-123' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: JobRepository, useValue: jobRepository },
        {
          provide: JobDescriptionRepository,
          useValue: jobDescriptionRepository,
        },
        { provide: DocumentRepository, useValue: documentRepository },
        { provide: LocalDocumentStorage, useValue: localDocumentStorage },
        { provide: JOB_DESCRIPTION_AI_PROCESSOR, useValue: aiProcessor },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
    jest.clearAllMocks();
  });

  it('creates a draft job for the organization', async () => {
    const jobId = new Types.ObjectId();
    jobRepository.create.mockResolvedValue({
      _id: jobId,
      title: 'Backend Engineer',
      status: JobStatus.DRAFT,
      department: null,
      location: null,
      employmentType: null,
      currentJobDescriptionId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.createJob(user, { title: 'Backend Engineer' });

    expect(result.title).toBe('Backend Engineer');
    expect(result.status).toBe(JobStatus.DRAFT);
    expect(jobRepository.create).toHaveBeenCalled();
  });

  it('rejects unsupported upload mime types', async () => {
    jobRepository.findById.mockResolvedValue({
      _id: new Types.ObjectId(),
      title: 'Role',
      status: JobStatus.DRAFT,
    });

    await expect(
      service.uploadJobDescription(user, new Types.ObjectId().toString(), {
        originalname: 'job.exe',
        mimetype: 'application/octet-stream',
        size: 100,
        buffer: Buffer.from('test'),
      } as Express.Multer.File),
    ).rejects.toThrow(BadRequestException);
  });

  it('queues AI extraction for PDF uploads', async () => {
    const jobId = new Types.ObjectId();
    const jobDescriptionId = new Types.ObjectId();
    const documentId = new Types.ObjectId();

    jobRepository.findById.mockResolvedValue({
      _id: jobId,
      title: 'Role',
      status: JobStatus.DRAFT,
    });
    jobDescriptionRepository.getNextVersion.mockResolvedValue(1);
    jobDescriptionRepository.deactivateActiveVersions.mockResolvedValue(
      undefined,
    );
    jobDescriptionRepository.create.mockResolvedValue({
      _id: jobDescriptionId,
      jobId,
      version: 1,
      isActive: true,
      source: {
        type: JobDescriptionSourceType.UPLOAD,
        documentId: null,
        linkedinUrl: null,
        originalFilename: 'jd.pdf',
        mimeType: 'application/pdf',
      },
      rawText: null,
      structuredMetadata: null,
      extraction: { status: ExtractionStatus.QUEUED, processingJobId: null },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    localDocumentStorage.save.mockResolvedValue({
      provider: 'local',
      bucket: null,
      path: 'org/jobs/file.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 4,
      checksum: 'sha256:abc',
    });
    documentRepository.create.mockResolvedValue({ _id: documentId });
    jobDescriptionRepository.updateExtraction.mockResolvedValue({
      _id: jobDescriptionId,
      jobId,
      version: 1,
      isActive: true,
      source: {
        type: JobDescriptionSourceType.UPLOAD,
        documentId,
        linkedinUrl: null,
        originalFilename: 'jd.pdf',
        mimeType: 'application/pdf',
      },
      rawText: null,
      structuredMetadata: null,
      extraction: {
        status: ExtractionStatus.QUEUED,
        processingJobId: 'job-123',
        aiAnalysisId: null,
        error: null,
        reviewedAt: null,
        reviewedBy: null,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    jobRepository.setCurrentJobDescription.mockResolvedValue(undefined);

    const result = await service.uploadJobDescription(user, jobId.toString(), {
      originalname: 'jd.pdf',
      mimetype: 'application/pdf',
      size: 4,
      buffer: Buffer.from('%PDF'),
    } as Express.Multer.File);

    expect(aiProcessor.queueExtraction).toHaveBeenCalled();
    expect(result.extraction.processingJobId).toBe('job-123');
  });
});
