import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import type { AuthenticatedUser } from '../../auth/domain/interfaces/authenticated-user.interface';
import { Permission } from '../../auth/domain/enums/permission.enum';
import { Role } from '../../auth/domain/enums/role.enum';
import { FeedbackHiringRecommendation } from '../domain/enums/feedback-hiring-recommendation.enum';
import { AiFeedbackClient } from '../infrastructure/ai/ai-feedback.client';
import { FeedbackAnalysisRepository } from '../infrastructure/persistence/repositories/feedback-analysis.repository';
import { FeedbackContextRepository } from '../infrastructure/persistence/repositories/feedback-context.repository';
import { FeedbackAnalysisDocument } from '../infrastructure/persistence/schemas/feedback-analysis.schema';
import { AnalyzeFeedbackDto, ListFeedbackAnalysesQueryDto } from '../presentation/dto/feedback.dto';

@Injectable()
export class FeedbackAnalysisService {
  constructor(
    private readonly feedbackContextRepository: FeedbackContextRepository,
    private readonly feedbackAnalysisRepository: FeedbackAnalysisRepository,
    private readonly aiFeedbackClient: AiFeedbackClient,
  ) {}

  async analyzeInterviewFeedback(
    user: AuthenticatedUser,
    interviewId: string,
    dto: AnalyzeFeedbackDto,
  ) {
    this.assertCanAnalyze(user);
    const organizationId = this.requireOrganizationId(user);
    const context = await this.feedbackContextRepository.load(organizationId, interviewId);

    const transcript =
      context.interview.processedTranscript?.cleanedText ??
      context.interview.rawTranscript;

    if (!transcript) {
      throw new BadRequestException(
        'Interview transcript is required before feedback analysis. Submit a transcript first.',
      );
    }

    const interviewerFeedback = this.buildInterviewerFeedback(context, dto.additionalFeedback);
    const candidateProfilePayload = this.buildCandidateProfilePayload(context.candidate);

    const aiResult = await this.aiFeedbackClient.analyze({
      job_title: context.job.title,
      interviewer_feedback: interviewerFeedback,
      interviewer_recommendation: context.interview.interviewerDecision.recommendation,
      transcript,
      candidate_profile: candidateProfilePayload,
    });

    const actorId = new Types.ObjectId(user.userId);
    const saved = await this.feedbackAnalysisRepository.upsertByInterview(
      organizationId,
      interviewId,
      {
        organizationId: new Types.ObjectId(organizationId),
        jobId: context.interview.jobId,
        candidateId: context.interview.candidateId,
        interviewId: context.interview._id,
        input: {
          interviewerFeedback,
          interviewerRecommendation: context.interview.interviewerDecision.recommendation,
          transcript,
          candidateProfile: candidateProfilePayload,
        },
        analysis: {
          technicalScore: aiResult.data.technical_score,
          communicationScore: aiResult.data.communication_score,
          strengths: aiResult.data.strengths,
          weaknesses: aiResult.data.weaknesses,
          hiringRecommendation: aiResult.data
            .hiring_recommendation as FeedbackHiringRecommendation,
          rationale: aiResult.data.rationale,
        },
        llmModel: aiResult.model,
        llmProvider: aiResult.provider,
        createdBy: actorId,
        updatedBy: actorId,
      },
    );

    return this.toResponse(saved);
  }

  async getByInterview(user: AuthenticatedUser, interviewId: string) {
    const organizationId = this.requireOrganizationId(user);
    const analysis = await this.feedbackAnalysisRepository.findLatestByInterview(
      organizationId,
      interviewId,
    );

    if (!analysis) {
      throw new NotFoundException('No feedback analysis found for this interview');
    }

    return this.toResponse(analysis);
  }

  async getById(user: AuthenticatedUser, id: string) {
    const organizationId = this.requireOrganizationId(user);
    const analysis = await this.feedbackAnalysisRepository.findById(organizationId, id);

    if (!analysis) {
      throw new NotFoundException('Feedback analysis not found');
    }

    return this.toResponse(analysis);
  }

  async list(user: AuthenticatedUser, query: ListFeedbackAnalysesQueryDto) {
    const organizationId = this.requireOrganizationId(user);
    const analyses = await this.feedbackAnalysisRepository.findAll({
      organizationId,
      jobId: query.jobId,
      candidateId: query.candidateId,
      interviewId: query.interviewId,
    });

    return analyses.map((item) => this.toResponse(item));
  }

  private buildInterviewerFeedback(
    context: Awaited<ReturnType<FeedbackContextRepository['load']>>,
    additionalFeedback?: string,
  ) {
    const parts: string[] = [];
    const decision = context.interview.interviewerDecision;

    if (decision.recommendation) {
      parts.push(`Interviewer recommendation: ${decision.recommendation}`);
    }
    if (decision.notes) {
      parts.push(decision.notes);
    }
    if (additionalFeedback) {
      parts.push(additionalFeedback);
    }

    if (parts.length === 0) {
      throw new BadRequestException(
        'Interviewer feedback is required. Submit interviewer decision notes or provide additionalFeedback.',
      );
    }

    return parts.join('\n\n');
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

  private assertCanAnalyze(user: AuthenticatedUser) {
    if (user.role === Role.SUPER_ADMIN) {
      return;
    }
    if (
      !user.permissions.includes(Permission.FEEDBACK_WRITE) &&
      !user.permissions.includes(Permission.INTERVIEWS_WRITE)
    ) {
      throw new ForbiddenException('Insufficient permissions to run feedback analysis');
    }
  }

  private requireOrganizationId(user: AuthenticatedUser): string {
    if (!user.organizationId) {
      throw new ForbiddenException('Organization context is required');
    }
    return user.organizationId;
  }

  private toResponse(analysis: FeedbackAnalysisDocument) {
    return {
      id: analysis._id.toString(),
      jobId: analysis.jobId.toString(),
      candidateId: analysis.candidateId.toString(),
      interviewId: analysis.interviewId.toString(),
      input: analysis.input,
      analysis: {
        technicalScore: analysis.analysis.technicalScore,
        communicationScore: analysis.analysis.communicationScore,
        strengths: analysis.analysis.strengths,
        weaknesses: analysis.analysis.weaknesses,
        hiringRecommendation: analysis.analysis.hiringRecommendation,
        rationale: analysis.analysis.rationale,
      },
      llmModel: analysis.llmModel,
      llmProvider: analysis.llmProvider,
      createdAt: analysis.createdAt,
      updatedAt: analysis.updatedAt,
    };
  }
}
