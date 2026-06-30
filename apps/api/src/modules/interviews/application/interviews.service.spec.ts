import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { Role } from '../../auth/domain/enums/role.enum';
import { InterviewStatus } from '../domain/enums/interview-status.enum';
import { InterviewerRecommendation } from '../domain/enums/interviewer-recommendation.enum';
import { AiInterviewClient } from '../infrastructure/ai/ai-interview.client';
import { InterviewContextRepository } from '../infrastructure/persistence/repositories/interview-context.repository';
import { InterviewRepository } from '../infrastructure/persistence/repositories/interview.repository';
import { InterviewsService } from './interviews.service';

describe('InterviewsService', () => {
  let service: InterviewsService;

  const organizationId = new Types.ObjectId().toString();
  const jobId = new Types.ObjectId().toString();
  const candidateId = new Types.ObjectId().toString();
  const userId = new Types.ObjectId().toString();
  const interviewId = new Types.ObjectId();

  const hrUser = {
    userId,
    email: 'hr@acme.com',
    organizationId,
    role: Role.HR_ADMIN,
    permissions: ['interviews:read', 'interviews:write', 'feedback:write'],
  };

  const interviewerUser = {
    userId,
    email: 'interviewer@acme.com',
    organizationId,
    role: Role.INTERVIEWER,
    permissions: ['interviews:read', 'feedback:write', 'candidates:read'],
  };

  const interviewContextRepository = { load: jest.fn() };
  const interviewRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
  };
  const aiInterviewClient = {
    generateQuestions: jest.fn(),
    analyzeTranscript: jest.fn(),
  };

  const baseInterview = {
    _id: interviewId,
    organizationId: new Types.ObjectId(organizationId),
    jobId: new Types.ObjectId(jobId),
    candidateId: new Types.ObjectId(candidateId),
    interviewerId: new Types.ObjectId(userId),
    status: InterviewStatus.SCHEDULED,
    scheduledAt: null,
    durationMinutes: 60,
    aiQuestions: null,
    questionPack: { coding: [], technical: [], architecture: [] },
    rawTranscript: null,
    processedTranscript: null,
    aiSummary: null,
    interviewerDecision: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InterviewsService,
        { provide: InterviewContextRepository, useValue: interviewContextRepository },
        { provide: InterviewRepository, useValue: interviewRepository },
        { provide: AiInterviewClient, useValue: aiInterviewClient },
      ],
    }).compile();

    service = module.get<InterviewsService>(InterviewsService);
    jest.clearAllMocks();
  });

  it('generates tailored interview questions', async () => {
    interviewRepository.findById.mockResolvedValue(baseInterview);
    interviewContextRepository.load.mockResolvedValue({
      job: { title: 'Backend Engineer' },
      jobDescription: { rawText: 'Node.js required', structuredMetadata: {} },
      candidate: {
        fullName: 'Jane Doe',
        email: 'jane@email.com',
        profile: { skills: [], experience: [], education: [], certifications: [], projects: [] },
      },
    });
    aiInterviewClient.generateQuestions.mockResolvedValue({
      data: {
        coding: [
          {
            type: 'coding',
            question: 'Rate limiter',
            rationale: 'API skills',
            evaluation_criteria: ['Correctness'],
            difficulty: 'medium',
            follow_up_prompts: [],
            expected_topics: ['Redis'],
          },
        ],
        technical: [],
        architecture: [],
      },
      provider: 'openai',
      model: 'gpt-4o-mini',
    });
    interviewRepository.update.mockResolvedValue({
      ...baseInterview,
      questionPack: { coding: [{ question: 'Rate limiter' }], technical: [], architecture: [] },
    });

    const result = await service.generateQuestions(hrUser, interviewId.toString(), {});

    expect(aiInterviewClient.generateQuestions).toHaveBeenCalled();
    expect(result.questionPack.coding).toHaveLength(1);
  });

  it('requires transcript before summary generation', async () => {
    interviewRepository.findById.mockResolvedValue({
      ...baseInterview,
      rawTranscript: null,
    });

    await expect(service.generateSummary(hrUser, interviewId.toString())).rejects.toThrow(
      BadRequestException,
    );
  });

  it('stores interviewer decision separately from AI summary', async () => {
    interviewRepository.findById.mockResolvedValue({
      ...baseInterview,
      aiSummary: { aiRecommendation: 'hire', rationale: 'AI suggestion' },
    });
    interviewRepository.update.mockResolvedValue({
      ...baseInterview,
      interviewerDecision: {
        recommendation: InterviewerRecommendation.NO_HIRE,
        notes: 'Culture fit concerns',
        overridesAiSummary: true,
      },
    });

    const result = await service.submitDecision(interviewerUser, interviewId.toString(), {
      recommendation: InterviewerRecommendation.NO_HIRE,
      notes: 'Culture fit concerns',
      overridesAiSummary: true,
    });

    expect(result.interviewerDecision.recommendation).toBe(InterviewerRecommendation.NO_HIRE);
    expect(result.interviewerDecision.overridesAiSummary).toBe(true);
  });

  it('blocks unassigned interviewers from contributing', async () => {
    interviewRepository.findById.mockResolvedValue({
      ...baseInterview,
      interviewerId: new Types.ObjectId(),
    });

    await expect(
      service.submitTranscript(interviewerUser, interviewId.toString(), {
        transcript: 'Interviewer: Hello\nCandidate: Hi there\n'.repeat(10),
      }),
    ).rejects.toThrow(ForbiddenException);
  });
});
