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
import { AiInterviewRecommendation } from '../domain/enums/interviewer-recommendation.enum';
import { InterviewStatus } from '../domain/enums/interview-status.enum';
import {
  AiInterviewClient,
  AiInterviewQuestion,
} from '../infrastructure/ai/ai-interview.client';
import { InterviewContextRepository } from '../infrastructure/persistence/repositories/interview-context.repository';
import { InterviewRepository } from '../infrastructure/persistence/repositories/interview.repository';
import {
  InterviewDocument,
  InterviewQuestionPack,
} from '../infrastructure/persistence/schemas/interview.schema';
import {
  CreateInterviewDto,
  GenerateQuestionsDto,
  ListInterviewsQueryDto,
  SubmitDecisionDto,
  SubmitTranscriptDto,
  UpdateQuestionPackDto,
} from '../presentation/dto/interview.dto';

@Injectable()
export class InterviewsService {
  constructor(
    private readonly interviewContextRepository: InterviewContextRepository,
    private readonly interviewRepository: InterviewRepository,
    private readonly aiInterviewClient: AiInterviewClient,
  ) {}

  async createInterview(
    user: AuthenticatedUser,
    jobId: string,
    candidateId: string,
    dto: CreateInterviewDto,
  ) {
    const organizationId = this.requireOrganizationId(user);
    await this.interviewContextRepository.load(
      organizationId,
      jobId,
      candidateId,
    );

    const actorId = new Types.ObjectId(user.userId);
    const saved = await this.interviewRepository.create({
      organizationId: new Types.ObjectId(organizationId),
      jobId: new Types.ObjectId(jobId),
      candidateId: new Types.ObjectId(candidateId),
      interviewerId: dto.interviewerId
        ? new Types.ObjectId(dto.interviewerId)
        : null,
      status: InterviewStatus.SCHEDULED,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      durationMinutes: dto.durationMinutes ?? 60,
      questionPack: { coding: [], technical: [], architecture: [] },
      createdBy: actorId,
      updatedBy: actorId,
    });

    return this.toResponse(saved);
  }

  async generateQuestions(
    user: AuthenticatedUser,
    interviewId: string,
    dto: GenerateQuestionsDto,
  ) {
    this.assertPermission(user, Permission.INTERVIEWS_WRITE);
    const interview = await this.findInterview(user, interviewId);
    const context = await this.interviewContextRepository.load(
      this.requireOrganizationId(user),
      interview.jobId.toString(),
      interview.candidateId.toString(),
    );

    if (
      !context.jobDescription.rawText &&
      !context.jobDescription.structuredMetadata
    ) {
      throw new BadRequestException(
        'Job description must be processed before generating interview questions.',
      );
    }

    const aiResult = await this.aiInterviewClient.generateQuestions({
      job_description: {
        job_title: context.job.title,
        raw_text: context.jobDescription.rawText,
        structured: context.jobDescription.structuredMetadata,
      },
      candidate_profile: this.buildCandidateProfilePayload(context.candidate),
      coding_count: dto.codingCount ?? 2,
      technical_count: dto.technicalCount ?? 3,
      architecture_count: dto.architectureCount ?? 2,
    });

    const pack = this.mapQuestionPack(aiResult.data);
    const actorId = new Types.ObjectId(user.userId);
    const updated = await this.interviewRepository.update(
      this.requireOrganizationId(user),
      interviewId,
      {
        aiQuestions: {
          pack,
          llmModel: aiResult.model,
          llmProvider: aiResult.provider,
          generatedAt: new Date(),
        },
        questionPack: pack,
        updatedBy: actorId,
      },
    );

    if (!updated) {
      throw new NotFoundException('Interview not found');
    }

    return this.toResponse(updated);
  }

  async updateQuestions(
    user: AuthenticatedUser,
    interviewId: string,
    dto: UpdateQuestionPackDto,
  ) {
    const interview = await this.findInterview(user, interviewId);
    this.assertCanEditInterview(user, interview);

    const actorId = new Types.ObjectId(user.userId);
    const mapDtoQuestions = (questions: UpdateQuestionPackDto['coding']) =>
      (questions ?? []).map((question) => ({
        type: question.type,
        question: question.question,
        rationale: question.rationale,
        evaluationCriteria: question.evaluationCriteria ?? [],
        difficulty: question.difficulty ?? 'medium',
        followUpPrompts: question.followUpPrompts ?? [],
        expectedTopics: question.expectedTopics ?? [],
      }));

    const updated = await this.interviewRepository.update(
      this.requireOrganizationId(user),
      interviewId,
      {
        questionPack: {
          coding: dto.coding
            ? mapDtoQuestions(dto.coding)
            : interview.questionPack.coding,
          technical: dto.technical
            ? mapDtoQuestions(dto.technical)
            : interview.questionPack.technical,
          architecture: dto.architecture
            ? mapDtoQuestions(dto.architecture)
            : interview.questionPack.architecture,
        },
        updatedBy: actorId,
      },
    );

    if (!updated) {
      throw new NotFoundException('Interview not found');
    }

    return this.toResponse(updated);
  }

  async submitTranscript(
    user: AuthenticatedUser,
    interviewId: string,
    dto: SubmitTranscriptDto,
  ) {
    const interview = await this.findInterview(user, interviewId);
    this.assertCanContributeToInterview(user, interview);

    const actorId = new Types.ObjectId(user.userId);
    const updated = await this.interviewRepository.update(
      this.requireOrganizationId(user),
      interviewId,
      {
        rawTranscript: dto.transcript,
        status: InterviewStatus.COMPLETED,
        updatedBy: actorId,
      },
    );

    if (!updated) {
      throw new NotFoundException('Interview not found');
    }

    return this.toResponse(updated);
  }

  async generateSummary(user: AuthenticatedUser, interviewId: string) {
    const interview = await this.findInterview(user, interviewId);
    this.assertCanContributeToInterview(user, interview);

    if (!interview.rawTranscript) {
      throw new BadRequestException(
        'Submit a transcript before generating a summary',
      );
    }

    const context = await this.interviewContextRepository.load(
      this.requireOrganizationId(user),
      interview.jobId.toString(),
      interview.candidateId.toString(),
    );

    const aiResult = await this.aiInterviewClient.analyzeTranscript({
      transcript: interview.rawTranscript,
      job_title: context.job.title,
      candidate_name: context.candidate.fullName,
      questions: this.hasQuestions(interview.questionPack)
        ? this.mapQuestionsForAi(interview.questionPack)
        : null,
    });

    const actorId = new Types.ObjectId(user.userId);
    const updated = await this.interviewRepository.update(
      this.requireOrganizationId(user),
      interviewId,
      {
        processedTranscript: {
          cleanedText: aiResult.processed.cleaned_text,
          speakerSegments: aiResult.processed.speaker_segments.map(
            (segment) => ({
              speaker: segment.speaker,
              text: segment.text,
            }),
          ),
          keyTopics: aiResult.processed.key_topics,
          processedAt: new Date(),
        },
        aiSummary: {
          overallAssessment: aiResult.summary.overall_assessment,
          strengths: aiResult.summary.strengths,
          concerns: aiResult.summary.concerns,
          skillSignals: aiResult.summary.skill_signals,
          questionResponses: aiResult.summary.question_responses.map(
            (item) => ({
              topic: item.topic,
              summary: item.summary,
              evidence: item.evidence,
            }),
          ),
          suggestedFollowUps: aiResult.summary.suggested_follow_ups,
          aiRecommendation: aiResult.summary
            .ai_recommendation as AiInterviewRecommendation,
          rationale: aiResult.summary.rationale,
          llmModel: aiResult.model,
          generatedAt: new Date(),
        },
        updatedBy: actorId,
      },
    );

    if (!updated) {
      throw new NotFoundException('Interview not found');
    }

    return this.toResponse(updated);
  }

  async submitDecision(
    user: AuthenticatedUser,
    interviewId: string,
    dto: SubmitDecisionDto,
  ) {
    const interview = await this.findInterview(user, interviewId);
    this.assertCanContributeToInterview(user, interview);

    const actorId = new Types.ObjectId(user.userId);
    const updated = await this.interviewRepository.update(
      this.requireOrganizationId(user),
      interviewId,
      {
        interviewerDecision: {
          recommendation: dto.recommendation,
          notes: dto.notes ?? null,
          decidedBy: actorId,
          decidedAt: new Date(),
          overridesAiSummary: dto.overridesAiSummary ?? false,
        },
        updatedBy: actorId,
      },
    );

    if (!updated) {
      throw new NotFoundException('Interview not found');
    }

    return this.toResponse(updated);
  }

  async getById(user: AuthenticatedUser, interviewId: string) {
    const interview = await this.findInterview(user, interviewId);
    return this.toResponse(interview);
  }

  async list(user: AuthenticatedUser, query: ListInterviewsQueryDto) {
    const organizationId = this.requireOrganizationId(user);
    const interviews = await this.interviewRepository.findAll({
      organizationId,
      jobId: query.jobId,
      candidateId: query.candidateId,
      interviewerId: query.interviewerId,
      status: query.status as InterviewStatus | undefined,
    });

    return interviews.map((item) => this.toResponse(item));
  }

  private async findInterview(user: AuthenticatedUser, interviewId: string) {
    const organizationId = this.requireOrganizationId(user);
    const interview = await this.interviewRepository.findById(
      organizationId,
      interviewId,
    );

    if (!interview) {
      throw new NotFoundException('Interview not found');
    }

    return interview;
  }

  private assertCanEditInterview(
    user: AuthenticatedUser,
    interview: InterviewDocument,
  ) {
    if (user.permissions.includes(Permission.INTERVIEWS_WRITE)) {
      return;
    }

    if (
      user.permissions.includes(Permission.FEEDBACK_WRITE) &&
      interview.interviewerId?.toString() === user.userId
    ) {
      return;
    }

    throw new ForbiddenException(
      'You cannot edit questions for this interview',
    );
  }

  private assertCanContributeToInterview(
    user: AuthenticatedUser,
    interview: InterviewDocument,
  ) {
    if (user.permissions.includes(Permission.INTERVIEWS_WRITE)) {
      return;
    }

    if (user.permissions.includes(Permission.FEEDBACK_WRITE)) {
      if (
        interview.interviewerId &&
        interview.interviewerId.toString() !== user.userId &&
        user.role === Role.INTERVIEWER
      ) {
        throw new ForbiddenException('You are not assigned to this interview');
      }
      return;
    }

    throw new ForbiddenException(
      'Insufficient permissions for this interview action',
    );
  }

  private assertPermission(user: AuthenticatedUser, permission: Permission) {
    if (user.role === Role.SUPER_ADMIN) {
      return;
    }
    if (!user.permissions.includes(permission)) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }

  private hasQuestions(pack: InterviewQuestionPack) {
    return (
      pack.coding.length > 0 ||
      pack.technical.length > 0 ||
      pack.architecture.length > 0
    );
  }

  private mapQuestionsForAi(pack: InterviewQuestionPack) {
    const mapQuestion = (
      question: InterviewQuestionPack['coding'][number],
    ) => ({
      type: question.type,
      question: question.question,
      rationale: question.rationale,
      evaluation_criteria: question.evaluationCriteria,
      difficulty: question.difficulty,
      follow_up_prompts: question.followUpPrompts,
      expected_topics: question.expectedTopics,
    });

    return {
      coding: pack.coding.map(mapQuestion),
      technical: pack.technical.map(mapQuestion),
      architecture: pack.architecture.map(mapQuestion),
    };
  }

  private mapQuestionPack(data: {
    coding: AiInterviewQuestion[];
    technical: AiInterviewQuestion[];
    architecture: AiInterviewQuestion[];
  }): InterviewQuestionPack {
    const map = (question: AiInterviewQuestion) => ({
      type: question.type as InterviewQuestionPack['coding'][number]['type'],
      question: question.question,
      rationale: question.rationale,
      evaluationCriteria: question.evaluation_criteria,
      difficulty: question.difficulty,
      followUpPrompts: question.follow_up_prompts,
      expectedTopics: question.expected_topics,
    });

    return {
      coding: data.coding.map(map),
      technical: data.technical.map(map),
      architecture: data.architecture.map(map),
    };
  }

  private buildCandidateProfilePayload(candidate: {
    fullName: string;
    email: string;
    phone?: string | null;
    profile: {
      summary?: string | null;
      totalExperienceYears?: number | null;
      skills: Array<{
        name: string;
        proficiency?: string | null;
        years?: number | null;
      }>;
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

  private toResponse(interview: InterviewDocument) {
    return {
      id: interview._id.toString(),
      jobId: interview.jobId.toString(),
      candidateId: interview.candidateId.toString(),
      interviewerId: interview.interviewerId?.toString() ?? null,
      status: interview.status,
      scheduledAt: interview.scheduledAt,
      durationMinutes: interview.durationMinutes,
      aiQuestions: interview.aiQuestions,
      questionPack: interview.questionPack,
      rawTranscript: interview.rawTranscript,
      processedTranscript: interview.processedTranscript,
      aiSummary: interview.aiSummary,
      interviewerDecision: interview.interviewerDecision,
      createdAt: interview.createdAt,
      updatedAt: interview.updatedAt,
    };
  }
}
