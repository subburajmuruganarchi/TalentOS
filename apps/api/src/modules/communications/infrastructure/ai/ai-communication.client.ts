import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AiCommunicationDraftPayload {
  communication_type: string;
  context: {
    organization_name?: string | null;
    job_title: string;
    candidate_name: string;
    candidate_email?: string | null;
    recruiter_name?: string | null;
    additional_notes?: string | null;
    interview?: {
      interview_date?: string | null;
      interview_location?: string | null;
      meeting_link?: string | null;
      interviewer_names?: string[];
      duration_minutes?: number | null;
    } | null;
  };
}

export interface AiCommunicationDraftResponse {
  data: {
    subject: string;
    body: string;
    body_html: string | null;
    tone_notes: string | null;
  };
  communication_type: string;
  provider: string;
  model: string;
}

@Injectable()
export class AiCommunicationClient {
  constructor(private readonly configService: ConfigService) {}

  async generateDraft(
    payload: AiCommunicationDraftPayload,
  ): Promise<AiCommunicationDraftResponse> {
    const baseUrl = this.configService.get<string>(
      'AI_SERVICE_URL',
      'http://localhost:8000',
    );
    const url = `${baseUrl.replace(/\/$/, '')}/api/v1/communications/draft`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new ServiceUnavailableException(
        `AI communication service failed (${response.status}): ${detail}`,
      );
    }

    return (await response.json()) as AiCommunicationDraftResponse;
  }
}
