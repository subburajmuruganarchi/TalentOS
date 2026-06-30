import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { Role } from '../../auth/domain/enums/role.enum';
import { MatchRecommendation } from '../domain/enums/match-recommendation.enum';
import { AiMatchingClient } from '../infrastructure/ai/ai-matching.client';
import { CandidateMatchRepository } from '../infrastructure/persistence/repositories/candidate-match.repository';
import { MatchContextRepository } from '../infrastructure/persistence/repositories/match-context.repository';
import { MatchingService } from './matching.service';

describe('MatchingService', () => {
  let service: MatchingService;

  const organizationId = new Types.ObjectId().toString();
  const jobId = new Types.ObjectId().toString();
  const candidateId = new Types.ObjectId().toString();
  const userId = new Types.ObjectId().toString();

  const user = {
    userId,
    email: 'hr@acme.com',
    organizationId,
    role: Role.HR_ADMIN,
    permissions: ['matches:write'],
  };

  const matchContextRepository = {
    load: jest.fn(),
  };

  const candidateMatchRepository = {
    upsertLatest: jest.fn(),
    findLatest: jest.fn(),
  };

  const aiMatchingClient = {
    match: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchingService,
        { provide: MatchContextRepository, useValue: matchContextRepository },
        { provide: CandidateMatchRepository, useValue: candidateMatchRepository },
        { provide: AiMatchingClient, useValue: aiMatchingClient },
      ],
    }).compile();

    service = module.get<MatchingService>(MatchingService);
    jest.clearAllMocks();
  });

  it('requires organization context', async () => {
    await expect(
      service.runMatch({ ...user, organizationId: undefined }, jobId, candidateId),
    ).rejects.toThrow(ForbiddenException);
  });

  it('runs match and persists result', async () => {
    const jobDescriptionId = new Types.ObjectId();
    const resumeId = new Types.ObjectId();
    const matchId = new Types.ObjectId();

    matchContextRepository.load.mockResolvedValue({
      job: { title: 'Backend Engineer' },
      jobDescription: {
        _id: jobDescriptionId,
        rawText: 'Node.js required',
        structuredMetadata: { skills: ['Node.js'] },
      },
      candidate: {
        fullName: 'Jane Doe',
        email: 'jane@email.com',
        phone: null,
        currentResumeId: resumeId,
        profile: {
          summary: 'Backend engineer',
          totalExperienceYears: 6,
          skills: [{ name: 'Node.js', proficiency: 'expert', years: 6 }],
          experience: [],
          education: [],
          certifications: [],
          projects: [],
        },
      },
    });

    aiMatchingClient.match.mockResolvedValue({
      data: {
        match_percentage: 82,
        skill_comparison: [
          {
            skill: 'Node.js',
            required: true,
            candidate_level: 'expert',
            gap: 'met',
          },
        ],
        strengths: ['Strong Node.js'],
        missing_skills: [],
        recommendation: 'match',
        rationale: 'Good fit',
      },
      vector_similarity: 0.78,
      provider: 'openai',
      model: 'gpt-4o-mini',
      embedding_model: 'text-embedding-3-small',
    });

    candidateMatchRepository.upsertLatest.mockResolvedValue({
      _id: matchId,
      jobId: new Types.ObjectId(jobId),
      candidateId: new Types.ObjectId(candidateId),
      jobDescriptionId,
      resumeId,
      match: {
        matchPercentage: 82,
        skillComparison: [
          {
            skill: 'Node.js',
            required: true,
            candidateLevel: 'expert',
            gap: 'met',
          },
        ],
        strengths: ['Strong Node.js'],
        missingSkills: [],
        recommendation: MatchRecommendation.MATCH,
        aiRationale: 'Good fit',
        vectorSimilarity: 0.78,
      },
      embeddingModel: 'text-embedding-3-small',
      llmModel: 'gpt-4o-mini',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.runMatch(user, jobId, candidateId);

    expect(aiMatchingClient.match).toHaveBeenCalledWith(
      expect.objectContaining({
        organization_id: organizationId,
        job_id: jobId,
        candidate_id: candidateId,
      }),
    );
    expect(result.match.recommendation).toBe(MatchRecommendation.MATCH);
    expect(result.match.matchPercentage).toBe(82);
  });

  it('rejects match when JD is not processed', async () => {
    matchContextRepository.load.mockResolvedValue({
      job: { title: 'Backend Engineer' },
      jobDescription: {
        _id: new Types.ObjectId(),
        rawText: null,
        structuredMetadata: null,
      },
      candidate: {
        fullName: 'Jane Doe',
        email: 'jane@email.com',
        profile: { skills: [], experience: [], education: [], certifications: [], projects: [] },
      },
    });

    await expect(service.runMatch(user, jobId, candidateId)).rejects.toThrow(BadRequestException);
  });
});
