import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { Role } from '../../auth/domain/enums/role.enum';
import { CommunicationStatus } from '../domain/enums/communication-status.enum';
import { CommunicationType } from '../domain/enums/communication-type.enum';
import { AiCommunicationClient } from '../infrastructure/ai/ai-communication.client';
import { EMAIL_SENDER } from '../infrastructure/email/email-sender.interface';
import { CommunicationContextRepository } from '../infrastructure/persistence/repositories/communication-context.repository';
import { CommunicationRepository } from '../infrastructure/persistence/repositories/communication.repository';
import { CommunicationsService } from './communications.service';

describe('CommunicationsService', () => {
  let service: CommunicationsService;

  const organizationId = new Types.ObjectId().toString();
  const jobId = new Types.ObjectId().toString();
  const candidateId = new Types.ObjectId().toString();
  const userId = new Types.ObjectId().toString();
  const communicationId = new Types.ObjectId();

  const user = {
    userId,
    email: 'hr@acme.com',
    organizationId,
    role: Role.HR_ADMIN,
    permissions: ['communications:read', 'communications:approve'],
  };

  const communicationContextRepository = { load: jest.fn() };
  const communicationRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
  };
  const aiCommunicationClient = { generateDraft: jest.fn() };
  const emailSender = { send: jest.fn() };

  const baseCommunication = {
    _id: communicationId,
    organizationId: new Types.ObjectId(organizationId),
    jobId: new Types.ObjectId(jobId),
    candidateId: new Types.ObjectId(candidateId),
    type: CommunicationType.SHORTLIST,
    status: CommunicationStatus.DRAFT,
    recipientEmail: 'jane@email.com',
    recipientName: 'Jane Doe',
    subject: 'Next steps',
    body: 'Hello Jane',
    bodyHtml: null,
    aiDraft: {
      subject: 'Next steps',
      body: 'Hello Jane',
      bodyHtml: null,
      toneNotes: 'Professional',
      llmModel: 'gpt-4o-mini',
      llmProvider: 'openai',
    },
    interviewDetails: null,
    approval: {},
    delivery: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunicationsService,
        { provide: CommunicationContextRepository, useValue: communicationContextRepository },
        { provide: CommunicationRepository, useValue: communicationRepository },
        { provide: AiCommunicationClient, useValue: aiCommunicationClient },
        { provide: EMAIL_SENDER, useValue: emailSender },
      ],
    }).compile();

    service = module.get<CommunicationsService>(CommunicationsService);
    jest.clearAllMocks();
  });

  it('requires organization context', async () => {
    await expect(
      service.generateDraft({ ...user, organizationId: undefined }, jobId, candidateId, {
        type: CommunicationType.SHORTLIST,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('generates AI draft without sending', async () => {
    communicationContextRepository.load.mockResolvedValue({
      job: { title: 'Backend Engineer' },
      candidate: { fullName: 'Jane Doe', email: 'jane@email.com' },
    });
    aiCommunicationClient.generateDraft.mockResolvedValue({
      data: {
        subject: 'Congratulations',
        body: 'Dear Jane...',
        body_html: null,
        tone_notes: 'Warm',
      },
      communication_type: 'shortlist',
      provider: 'openai',
      model: 'gpt-4o-mini',
    });
    communicationRepository.create.mockResolvedValue(baseCommunication);

    const result = await service.generateDraft(user, jobId, candidateId, {
      type: CommunicationType.SHORTLIST,
    });

    expect(aiCommunicationClient.generateDraft).toHaveBeenCalled();
    expect(emailSender.send).not.toHaveBeenCalled();
    expect(result.status).toBe(CommunicationStatus.DRAFT);
  });

  it('blocks send until approved', async () => {
    communicationRepository.findById.mockResolvedValue({
      ...baseCommunication,
      status: CommunicationStatus.DRAFT,
    });

    await expect(service.send(user, communicationId.toString())).rejects.toThrow(
      BadRequestException,
    );
    expect(emailSender.send).not.toHaveBeenCalled();
  });

  it('sends only after approval', async () => {
    communicationRepository.findById.mockResolvedValue({
      ...baseCommunication,
      status: CommunicationStatus.APPROVED,
    });
    emailSender.send.mockResolvedValue({ messageId: 'msg-123' });
    communicationRepository.update.mockResolvedValue({
      ...baseCommunication,
      status: CommunicationStatus.SENT,
      delivery: { sentAt: new Date(), sentBy: new Types.ObjectId(userId), messageId: 'msg-123' },
    });

    const result = await service.send(user, communicationId.toString());

    expect(emailSender.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'jane@email.com', subject: 'Next steps' }),
    );
    expect(result.status).toBe(CommunicationStatus.SENT);
  });

  it('moves draft through approval workflow', async () => {
    communicationRepository.findById
      .mockResolvedValueOnce({ ...baseCommunication, status: CommunicationStatus.DRAFT })
      .mockResolvedValueOnce({
        ...baseCommunication,
        status: CommunicationStatus.PENDING_APPROVAL,
      });
    communicationRepository.update
      .mockResolvedValueOnce({
        ...baseCommunication,
        status: CommunicationStatus.PENDING_APPROVAL,
      })
      .mockResolvedValueOnce({
        ...baseCommunication,
        status: CommunicationStatus.APPROVED,
      });

    const pending = await service.requestApproval(user, communicationId.toString());
    expect(pending.status).toBe(CommunicationStatus.PENDING_APPROVAL);

    const approved = await service.approve(user, communicationId.toString(), {});
    expect(approved.status).toBe(CommunicationStatus.APPROVED);
  });
});
