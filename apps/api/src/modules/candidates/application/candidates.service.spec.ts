import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { Role } from '../../auth/domain/enums/role.enum';
import {
  CandidateSource,
  CandidateStatus,
} from '../domain/enums/candidate-status.enum';
import { ResumeParseStatus } from '../domain/enums/resume-parse-status.enum';
import { RESUME_AI_PROCESSOR } from '../domain/interfaces/resume-ai-processor.interface';
import { CandidateRepository } from '../infrastructure/persistence/repositories/candidate.repository';
import { CandidateStoredFileRepository } from '../infrastructure/persistence/repositories/candidate-stored-file.repository';
import { ResumeRepository } from '../infrastructure/persistence/repositories/resume.repository';
import { ResumeFileStorage } from '../infrastructure/storage/resume-file.storage';
import { CandidatesService } from './candidates.service';

describe('CandidatesService', () => {
  let service: CandidatesService;

  const user = {
    userId: new Types.ObjectId().toString(),
    email: 'hr@acme.com',
    organizationId: new Types.ObjectId().toString(),
    role: Role.HR_EMPLOYEE,
    permissions: ['candidates:write'],
  };

  const candidateRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    setCurrentResume: jest.fn(),
  };

  const resumeRepository = {
    create: jest.fn(),
    createWithId: jest.fn(),
    findById: jest.fn(),
    findByCandidate: jest.fn(),
    getNextVersion: jest.fn(),
    deactivatePrimary: jest.fn(),
    update: jest.fn(),
  };

  const storedFileRepository = {
    create: jest.fn(),
    findById: jest.fn(),
  };

  const resumeFileStorage = {
    save: jest.fn(),
  };

  const resumeAiProcessor = {
    queueParsing: jest
      .fn()
      .mockResolvedValue({ processingJobId: 'resume-job-1' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CandidatesService,
        { provide: CandidateRepository, useValue: candidateRepository },
        { provide: ResumeRepository, useValue: resumeRepository },
        {
          provide: CandidateStoredFileRepository,
          useValue: storedFileRepository,
        },
        { provide: ResumeFileStorage, useValue: resumeFileStorage },
        { provide: RESUME_AI_PROCESSOR, useValue: resumeAiProcessor },
      ],
    }).compile();

    service = module.get<CandidatesService>(CandidatesService);
    jest.clearAllMocks();
  });

  it('creates a candidate', async () => {
    const candidateId = new Types.ObjectId();
    candidateRepository.create.mockResolvedValue({
      _id: candidateId,
      email: 'dev@example.com',
      fullName: 'Jane Doe',
      source: CandidateSource.UPLOAD,
      status: CandidateStatus.ACTIVE,
      profile: {},
      extraction: { status: ResumeParseStatus.QUEUED },
      currentResumeId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.createCandidate(user, {
      email: 'dev@example.com',
      fullName: 'Jane Doe',
    });

    expect(result.fullName).toBe('Jane Doe');
    expect(candidateRepository.create).toHaveBeenCalled();
  });

  it('rejects unsupported resume mime types', async () => {
    candidateRepository.findById.mockResolvedValue({
      _id: new Types.ObjectId(),
    });

    await expect(
      service.uploadResumesToCandidate(user, new Types.ObjectId().toString(), [
        {
          originalname: 'resume.exe',
          mimetype: 'application/octet-stream',
          size: 100,
          buffer: Buffer.from('test'),
        } as Express.Multer.File,
      ]),
    ).rejects.toThrow(BadRequestException);
  });

  it('queues AI parsing when uploading a PDF resume', async () => {
    const candidateId = new Types.ObjectId();
    const resumeId = new Types.ObjectId();
    const documentId = new Types.ObjectId();

    candidateRepository.findById.mockResolvedValue({
      _id: candidateId,
      email: 'dev@example.com',
      fullName: 'Jane Doe',
      source: CandidateSource.UPLOAD,
      status: CandidateStatus.ACTIVE,
      profile: {},
      extraction: { status: ResumeParseStatus.QUEUED },
      currentResumeId: null,
    });
    resumeRepository.getNextVersion.mockResolvedValue(1);
    resumeRepository.deactivatePrimary.mockResolvedValue(undefined);
    resumeFileStorage.save.mockResolvedValue({
      provider: 'local',
      bucket: null,
      path: 'org/candidates/file.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 4,
      checksum: 'sha256:abc',
    });
    storedFileRepository.create.mockResolvedValue({ _id: documentId });
    resumeRepository.createWithId.mockResolvedValue({
      _id: resumeId,
      candidateId,
      documentId,
      version: 1,
      isPrimary: true,
      fileName: 'resume.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 4,
      parseStatus: ResumeParseStatus.QUEUED,
      processingJobId: 'resume-job-1',
    });
    candidateRepository.update.mockResolvedValue(undefined);
    candidateRepository.setCurrentResume.mockResolvedValue(undefined);

    const result = await service.uploadResumesToCandidate(
      user,
      candidateId.toString(),
      [
        {
          originalname: 'resume.pdf',
          mimetype: 'application/pdf',
          size: 4,
          buffer: Buffer.from('%PDF'),
        } as Express.Multer.File,
      ],
    );

    expect(resumeAiProcessor.queueParsing).toHaveBeenCalled();
    expect(result[0].resume.processingJobId).toBe('resume-job-1');
    expect(result[0].resume.fileLocation).toBe('org/candidates/file.pdf');
  });
});
