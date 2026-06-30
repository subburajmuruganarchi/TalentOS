import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AiFeedbackAnalyzePayload {
  job_title: string;
  interviewer_feedback: string;
  interviewer_recommendation?: string | null;
  transcript: string;
  candidate_profile: Record<string, unknown>;
}

export interface AiFeedbackAnalyzeResponse {
  data: {
    technical_score: number;
    communication_score: number;
    strengths: string[];
    weaknesses: string[];
    hiring_recommendation: string;
    rationale: string;
  };
  provider: string;
  model: string;
}

@Injectable()
export class AiFeedbackClient {
  constructor(private readonly configService: ConfigService) {}

  async analyze(payload: AiFeedbackAnalyzePayload): Promise<AiFeedbackAnalyzeResponse> {
    const baseUrl = this.configService.get<string>('AI_SERVICE_URL', 'http://localhost:8000');
    const url = `${baseUrl.replace(/\/$/, '')}/api/v1/feedback/analyze`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new ServiceUnavailableException(
        `AI feedback service failed (${response.status}): ${detail}`,
      );
    }

    return (await response.json()) as AiFeedbackAnalyzeResponse;
  }
}
