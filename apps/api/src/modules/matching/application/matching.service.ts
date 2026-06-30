import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import type { AuthenticatedUser } from '../../auth/domain/interfaces/authenticated-user.interface';
import { MatchRecommendation } from '../domain/enums/match-recommendation.enum';
import { AiMatchingClient } from '../infrastructure/ai/ai-matching.client';
import { CandidateMatchRepository } from '../infrastructure/persistence/repositories/candidate-match.repository';
import { MatchContextRepository } from '../infrastructure/persistence/repositories/match-context.repository';

@Injectable()
export class MatchingService {
  constructor(
    private readonly matchContextRepository: MatchContextRepository,
    private readonly candidateMatchRepository: CandidateMatchRepository,
    private readonly aiMatchingClient: AiMatchingClient,
  ) {}

  async runMatch(user: AuthenticatedUser, jobId: string, candidateId: string) {
    const organizationId = this.requireOrganizationId(user);
    const context = await this.matchContextRepository.load(organizationId, jobId, candidateId);

    if (!context.jobDescription.rawText && !context.jobDescription.structuredMetadata) {
      throw new BadRequestException(
        'Job description must be processed before matching. Upload and extract JD first.',
      );
    }

    const candidateProfile = this.buildCandidateProfilePayload(context.candidate);

    const aiResult = await this.aiMatchingClient.match({
      organization_id: organizationId,
      job_id: jobId,
      candidate_id: candidateId,
      job_description: {
        job_title: context.job.title,
        raw_text: context.jobDescription.rawText,
        structured: context.jobDescription.structuredMetadata,
      },
      candidate_profile: candidateProfile,
    });

    const actorId = new Types.ObjectId(user.userId);
    const saved = await this.candidateMatchRepository.upsertLatest(
      organizationId,
      jobId,
      candidateId,
      {
        organizationId: new Types.ObjectId(organizationId),
        jobId: new Types.ObjectId(jobId),
        candidateId: new Types.ObjectId(candidateId),
        jobDescriptionId: context.jobDescription._id,
        resumeId: context.candidate.currentResumeId,
        match: {
          matchPercentage: aiResult.data.match_percentage,
          skillComparison: aiResult.data.skill_comparison.map((item) => ({
            skill: item.skill,
            required: item.required,
            candidateLevel: item.candidate_level,
            gap: item.gap,
          })),
          strengths: aiResult.data.strengths,
          missingSkills: aiResult.data.missing_skills,
          recommendation: aiResult.data.recommendation as MatchRecommendation,
          aiRationale: aiResult.data.rationale,
          vectorSimilarity: aiResult.vector_similarity,
        },
        embeddingModel: aiResult.embedding_model,
        llmModel: aiResult.model,
        createdBy: actorId,
        updatedBy: actorId,
      },
    );

    return this.toMatchResponse(saved);
  }

  async getLatestMatch(user: AuthenticatedUser, jobId: string, candidateId: string) {
    const organizationId = this.requireOrganizationId(user);
    const match = await this.candidateMatchRepository.findLatest(
      organizationId,
      jobId,
      candidateId,
    );

    if (!match) {
      throw new BadRequestException('No match result found for this job and candidate');
    }

    return this.toMatchResponse(match);
  }

  private buildCandidateProfilePayload(candidate: {
    fullName: string;
    email: string;
    phone?: string | null;
    profile: {
      summary?: string | null;
      totalExperienceYears?: number | null;
      skills: Array<{ name: string; proficiency?: string | null; years?: number | null }>;
      experience: Array<{
        company: string;
        role: string;
        startDate?: string | null;
        endDate?: string | null;
        highlights?: string[];
      }>;
      education: Record<string, unknown>[];
      certifications: Record<string, unknown>[];
      projects: Record<string, unknown>[];
    };
  }) {
    return {
      candidate: {
        full_name: candidate.fullName,
        email: candidate.email,
        phone: candidate.phone ?? null,
        location: null,
        linkedin_url: null,
        summary: candidate.profile.summary ?? null,
      },
      skills: candidate.profile.skills.map((skill) => ({
        name: skill.name,
        proficiency: skill.proficiency ?? null,
        years: skill.years ?? null,
      })),
      experience: candidate.profile.experience,
      projects: candidate.profile.projects,
      education: candidate.profile.education,
      certifications: candidate.profile.certifications,
      total_experience_years: candidate.profile.totalExperienceYears ?? null,
    };
  }

  private requireOrganizationId(user: AuthenticatedUser): string {
    if (!user.organizationId) {
      throw new ForbiddenException('Organization context is required');
    }
    return user.organizationId;
  }

  private toMatchResponse(match: {
    _id: Types.ObjectId;
    jobId: Types.ObjectId;
    candidateId: Types.ObjectId;
    jobDescriptionId?: Types.ObjectId | null;
    resumeId?: Types.ObjectId | null;
    match: {
      matchPercentage: number;
      skillComparison: Array<{
        skill: string;
        required: boolean;
        candidateLevel: string | null;
        gap: string | null;
      }>;
      strengths: string[];
      missingSkills: string[];
      recommendation: MatchRecommendation;
      aiRationale: string;
      vectorSimilarity: number;
    };
    embeddingModel?: string | null;
    llmModel?: string | null;
    humanReview?: {
      overridden: boolean;
      recommendation: MatchRecommendation | null;
      notes: string | null;
      reviewedBy: Types.ObjectId | null;
      reviewedAt: Date | null;
    };
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    return {
      id: match._id.toString(),
      jobId: match.jobId.toString(),
      candidateId: match.candidateId.toString(),
      jobDescriptionId: match.jobDescriptionId?.toString() ?? null,
      resumeId: match.resumeId?.toString() ?? null,
      match: {
        matchPercentage: match.match.matchPercentage,
        skillComparison: match.match.skillComparison,
        strengths: match.match.strengths,
        missingSkills: match.match.missingSkills,
        recommendation: match.match.recommendation,
        aiRationale: match.match.aiRationale,
        vectorSimilarity: match.match.vectorSimilarity,
      },
      embeddingModel: match.embeddingModel ?? null,
      llmModel: match.llmModel ?? null,
      humanReview: match.humanReview ?? {
        overridden: false,
        recommendation: null,
        notes: null,
        reviewedBy: null,
        reviewedAt: null,
      },
      createdAt: match.createdAt,
      updatedAt: match.updatedAt,
    };
  }
}
