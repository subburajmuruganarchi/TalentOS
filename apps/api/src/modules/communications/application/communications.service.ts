import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import type { AuthenticatedUser } from '../../auth/domain/interfaces/authenticated-user.interface';
import { CommunicationStatus } from '../domain/enums/communication-status.enum';
import { CommunicationType } from '../domain/enums/communication-type.enum';
import { AiCommunicationClient } from '../infrastructure/ai/ai-communication.client';
import { EMAIL_SENDER } from '../infrastructure/email/email-sender.interface';
import type { EmailSender } from '../infrastructure/email/email-sender.interface';
import { CommunicationContextRepository } from '../infrastructure/persistence/repositories/communication-context.repository';
import { CommunicationRepository } from '../infrastructure/persistence/repositories/communication.repository';
import { CommunicationDocument } from '../infrastructure/persistence/schemas/communication.schema';
import {
  ApproveCommunicationDto,
  CreateCommunicationDraftDto,
  ListCommunicationsQueryDto,
  UpdateCommunicationDraftDto,
} from '../presentation/dto/communication.dto';

const EDITABLE_STATUSES = new Set<CommunicationStatus>([
  CommunicationStatus.DRAFT,
  CommunicationStatus.PENDING_APPROVAL,
]);

@Injectable()
export class CommunicationsService {
  constructor(
    private readonly communicationContextRepository: CommunicationContextRepository,
    private readonly communicationRepository: CommunicationRepository,
    private readonly aiCommunicationClient: AiCommunicationClient,
    @Inject(EMAIL_SENDER) private readonly emailSender: EmailSender,
  ) {}

  async generateDraft(
    user: AuthenticatedUser,
    jobId: string,
    candidateId: string,
    dto: CreateCommunicationDraftDto,
  ) {
    const organizationId = this.requireOrganizationId(user);
    const context = await this.communicationContextRepository.load(
      organizationId,
      jobId,
      candidateId,
    );

    const interview =
      dto.type === CommunicationType.INTERVIEW_INVITATION && dto.interview
        ? {
            interview_date: dto.interview.interviewDate ?? null,
            interview_location: dto.interview.interviewLocation ?? null,
            meeting_link: dto.interview.meetingLink ?? null,
            interviewer_names: dto.interview.interviewerNames ?? [],
            duration_minutes: dto.interview.durationMinutes ?? null,
          }
        : null;

    const aiResult = await this.aiCommunicationClient.generateDraft({
      communication_type: dto.type,
      context: {
        job_title: context.job.title,
        candidate_name: context.candidate.fullName,
        candidate_email: context.candidate.email,
        recruiter_name: user.email,
        additional_notes: dto.additionalNotes ?? null,
        interview,
      },
    });

    const actorId = new Types.ObjectId(user.userId);
    const saved = await this.communicationRepository.create({
      organizationId: new Types.ObjectId(organizationId),
      jobId: new Types.ObjectId(jobId),
      candidateId: new Types.ObjectId(candidateId),
      type: dto.type,
      status: CommunicationStatus.DRAFT,
      recipientEmail: context.candidate.email,
      recipientName: context.candidate.fullName,
      subject: aiResult.data.subject,
      body: aiResult.data.body,
      bodyHtml: aiResult.data.body_html,
      aiDraft: {
        subject: aiResult.data.subject,
        body: aiResult.data.body,
        bodyHtml: aiResult.data.body_html,
        toneNotes: aiResult.data.tone_notes,
        llmModel: aiResult.model,
        llmProvider: aiResult.provider,
      },
      interviewDetails:
        dto.type === CommunicationType.INTERVIEW_INVITATION && dto.interview
          ? {
              interviewDate: dto.interview.interviewDate ?? null,
              interviewLocation: dto.interview.interviewLocation ?? null,
              meetingLink: dto.interview.meetingLink ?? null,
              interviewerNames: dto.interview.interviewerNames ?? [],
              durationMinutes: dto.interview.durationMinutes ?? null,
            }
          : null,
      createdBy: actorId,
      updatedBy: actorId,
    });

    return this.toResponse(saved);
  }

  async list(user: AuthenticatedUser, query: ListCommunicationsQueryDto) {
    const organizationId = this.requireOrganizationId(user);
    const communications = await this.communicationRepository.findAll({
      organizationId,
      jobId: query.jobId,
      candidateId: query.candidateId,
      status: query.status as CommunicationStatus | undefined,
      type: query.type as CommunicationType | undefined,
    });

    return communications.map((item) => this.toResponse(item));
  }

  async getById(user: AuthenticatedUser, id: string) {
    const communication = await this.findCommunication(user, id);
    return this.toResponse(communication);
  }

  async updateDraft(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateCommunicationDraftDto,
  ) {
    const communication = await this.findCommunication(user, id);
    this.assertEditable(communication);

    const actorId = new Types.ObjectId(user.userId);
    const updated = await this.communicationRepository.update(
      this.requireOrganizationId(user),
      id,
      {
        recipientEmail: dto.recipientEmail ?? communication.recipientEmail,
        recipientName: dto.recipientName ?? communication.recipientName,
        subject: dto.subject ?? communication.subject,
        body: dto.body ?? communication.body,
        bodyHtml: dto.bodyHtml ?? communication.bodyHtml,
        updatedBy: actorId,
      },
    );

    if (!updated) {
      throw new NotFoundException('Communication not found');
    }

    return this.toResponse(updated);
  }

  async requestApproval(user: AuthenticatedUser, id: string) {
    const communication = await this.findCommunication(user, id);

    if (communication.status !== CommunicationStatus.DRAFT) {
      throw new BadRequestException(
        'Only draft communications can be submitted for approval',
      );
    }

    const actorId = new Types.ObjectId(user.userId);
    const updated = await this.communicationRepository.update(
      this.requireOrganizationId(user),
      id,
      {
        status: CommunicationStatus.PENDING_APPROVAL,
        approval: {
          ...communication.approval,
          requestedAt: new Date(),
          requestedBy: actorId,
        },
        updatedBy: actorId,
      },
    );

    if (!updated) {
      throw new NotFoundException('Communication not found');
    }

    return this.toResponse(updated);
  }

  async approve(
    user: AuthenticatedUser,
    id: string,
    dto: ApproveCommunicationDto,
  ) {
    const communication = await this.findCommunication(user, id);

    if (communication.status !== CommunicationStatus.PENDING_APPROVAL) {
      throw new BadRequestException(
        'Only communications pending approval can be approved',
      );
    }

    const actorId = new Types.ObjectId(user.userId);
    const updated = await this.communicationRepository.update(
      this.requireOrganizationId(user),
      id,
      {
        status: CommunicationStatus.APPROVED,
        approval: {
          ...communication.approval,
          approvedAt: new Date(),
          approvedBy: actorId,
          approvalNotes: dto.approvalNotes ?? null,
        },
        updatedBy: actorId,
      },
    );

    if (!updated) {
      throw new NotFoundException('Communication not found');
    }

    return this.toResponse(updated);
  }

  async send(user: AuthenticatedUser, id: string) {
    const communication = await this.findCommunication(user, id);

    if (communication.status !== CommunicationStatus.APPROVED) {
      throw new BadRequestException(
        'Email must be approved before sending. Approve the communication first.',
      );
    }

    const actorId = new Types.ObjectId(user.userId);

    try {
      const result = await this.emailSender.send({
        to: communication.recipientEmail,
        toName: communication.recipientName,
        subject: communication.subject,
        body: communication.body,
        bodyHtml: communication.bodyHtml,
      });

      const updated = await this.communicationRepository.update(
        this.requireOrganizationId(user),
        id,
        {
          status: CommunicationStatus.SENT,
          delivery: {
            sentAt: new Date(),
            sentBy: actorId,
            messageId: result.messageId,
            error: null,
          },
          updatedBy: actorId,
        },
      );

      if (!updated) {
        throw new NotFoundException('Communication not found');
      }

      return this.toResponse(updated);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Send failed';
      await this.communicationRepository.update(
        this.requireOrganizationId(user),
        id,
        {
          delivery: {
            ...communication.delivery,
            error: message,
          },
          updatedBy: actorId,
        },
      );
      throw error;
    }
  }

  async cancel(user: AuthenticatedUser, id: string) {
    const communication = await this.findCommunication(user, id);

    if (communication.status === CommunicationStatus.SENT) {
      throw new BadRequestException('Sent communications cannot be cancelled');
    }

    const actorId = new Types.ObjectId(user.userId);
    const updated = await this.communicationRepository.update(
      this.requireOrganizationId(user),
      id,
      {
        status: CommunicationStatus.CANCELLED,
        updatedBy: actorId,
      },
    );

    if (!updated) {
      throw new NotFoundException('Communication not found');
    }

    return this.toResponse(updated);
  }

  private async findCommunication(user: AuthenticatedUser, id: string) {
    const organizationId = this.requireOrganizationId(user);
    const communication = await this.communicationRepository.findById(
      organizationId,
      id,
    );

    if (!communication) {
      throw new NotFoundException('Communication not found');
    }

    return communication;
  }

  private assertEditable(communication: CommunicationDocument) {
    if (!EDITABLE_STATUSES.has(communication.status)) {
      throw new BadRequestException(
        `Communication in status "${communication.status}" cannot be edited`,
      );
    }
  }

  private requireOrganizationId(user: AuthenticatedUser): string {
    if (!user.organizationId) {
      throw new ForbiddenException('Organization context is required');
    }
    return user.organizationId;
  }

  private toResponse(communication: CommunicationDocument) {
    return {
      id: communication._id.toString(),
      jobId: communication.jobId.toString(),
      candidateId: communication.candidateId.toString(),
      type: communication.type,
      status: communication.status,
      recipientEmail: communication.recipientEmail,
      recipientName: communication.recipientName,
      subject: communication.subject,
      body: communication.body,
      bodyHtml: communication.bodyHtml,
      aiDraft: communication.aiDraft,
      interviewDetails: communication.interviewDetails,
      approval: communication.approval,
      delivery: communication.delivery,
      createdAt: communication.createdAt,
      updatedAt: communication.updatedAt,
    };
  }
}
