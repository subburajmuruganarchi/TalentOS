import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { Role } from '../../auth/domain/enums/role.enum';
import { InterviewerRecommendation } from '../../interviews/domain/enums/interviewer-recommendation.enum';
import { FeedbackHiringRecommendation } from '../domain/enums/feedback-hiring-recommendation.enum';
import { AiFeedbackClient } from '../infrastructure/ai/ai-feedback.client';
import { FeedbackAnalysisRepository } from '../infrastructure/persistence/repositories/feedback-analysis.repository';
import { FeedbackContextRepository } from '../infrastructure/persistence/repositories/feedback-context.repository';
import { FeedbackAnalysisService } from './feedback-analysis.service';

describe('FeedbackAnalysisService', () => {
  let service: FeedbackAnalysisService;

  const organizationId = new Types.ObjectId().toString();
  const interviewId = new Types.ObjectId().toString();
  const jobId = new Types.ObjectId();
  const candidateId = new Types.ObjectId();
  const userId = new Types.ObjectId().toString();

  const user = {
    userId,
    email: 'interviewer@acme.com',
    organizationId,
    role: Role.INTERVIEWER,
    permissions: ['feedback:write', 'interviews:read'],
  };

  const feedbackContextRepository = { load: jest.fn() };
  const feedbackAnalysisRepository = { upsertByInterview: jest.fn(), findLatestByInterview: jest.fn() };
  const aiFeedbackClient = { analyze: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedbackAnalysisService,
        { provide: FeedbackContextRepository, useValue: feedbackContextRepository },
        { provide: FeedbackAnalysisRepository, useValue: feedbackAnalysisRepository },
        { provide: AiFeedbackClient, useValue: aiFeedbackClient },
      ],
    }).compile();

    service = module.get<FeedbackAnalysisService>(FeedbackAnalysisService);
    jest.clearAllMocks();
  });

  it('requires organization context', async () => {
    await expect(
      service.analyzeInterviewFeedback(
        { ...user, organizationId: undefined },
        interviewId,
        {},
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('analyzes feedback and stores result in MongoDB', async () => {
    feedbackContextRepository.load.mockResolvedValue({
      job: { title: 'Backend Engineer' },
      candidate: {
        fullName: 'Jane Doe',
        email: 'jane@email.com',
        profile: { skills: [], experience: [], education: [], certifications: [], projects: [] },
      },
      interview: {
        _id: new Types.ObjectId(interviewId),
        jobId,
        candidateId,
        rawTranscript: 'Interviewer: Hello\nCandidate: Hi\n'.repeat(20),
        processedTranscript: null,
        interviewerDecision: {
          recommendation: InterviewerRecommendation.HIRE,
          notes: 'Strong technical skills and clear communication.',
        },
      },
    });

    aiFeedbackClient.analyze.mockResolvedValue({
      data: {
        technical_score: 85,
        communication_score: 80,
        strengths: ['API design'],
        weaknesses: ['Limited testing discussion'],
        hiring_recommendation: 'hire',
        rationale: 'Solid interview performance.',
      },
      provider: 'openai',
      model: 'gpt-4o-mini',
    });

    feedbackAnalysisRepository.upsertByInterview.mockResolvedValue({
      _id: new Types.ObjectId(),
      jobId,
      candidateId,
      interviewId: new Types.ObjectId(interviewId),
      input: {},
      analysis: {
        technicalScore: 85,
        communicationScore: 80,
        strengths: ['API design'],
        weaknesses: ['Limited testing discussion'],
        hiringRecommendation: FeedbackHiringRecommendation.HIRE,
        rationale: 'Solid interview performance.',
      },
      llmModel: 'gpt-4o-mini',
      llmProvider: 'openai',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.analyzeInterviewFeedback(user, interviewId, {});

    expect(aiFeedbackClient.analyze).toHaveBeenCalled();
    expect(feedbackAnalysisRepository.upsertByInterview).toHaveBeenCalled();
    expect(result.analysis.technicalScore).toBe(85);
    expect(result.analysis.hiringRecommendation).toBe(FeedbackHiringRecommendation.HIRE);
  });

  it('requires transcript before analysis', async () => {
    feedbackContextRepository.load.mockResolvedValue({
      job: { title: 'Backend Engineer' },
      candidate: {
        fullName: 'Jane Doe',
        email: 'jane@email.com',
        profile: { skills: [], experience: [], education: [], certifications: [], projects: [] },
      },
      interview: {
        _id: new Types.ObjectId(interviewId),
        rawTranscript: null,
        processedTranscript: null,
        interviewerDecision: { notes: 'Good candidate' },
      },
    });

    await expect(service.analyzeInterviewFeedback(user, interviewId, {})).rejects.toThrow(
      BadRequestException,
    );
  });
});
