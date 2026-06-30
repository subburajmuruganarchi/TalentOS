import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AiMatchRequestPayload {
  organization_id: string;
  job_id: string;
  candidate_id: string;
  job_description: {
    job_title: string;
    raw_text: string | null;
    structured: Record<string, unknown> | null;
  };
  candidate_profile: Record<string, unknown>;
}

export interface AiSkillComparison {
  skill: string;
  required: boolean;
  candidate_level: string | null;
  gap: string | null;
}

export interface AiMatchResponsePayload {
  data: {
    match_percentage: number;
    skill_comparison: AiSkillComparison[];
    strengths: string[];
    missing_skills: string[];
    recommendation: string;
    rationale: string;
  };
  vector_similarity: number;
  provider: string;
  model: string;
  embedding_model: string;
}

@Injectable()
export class AiMatchingClient {
  constructor(private readonly configService: ConfigService) {}

  async match(payload: AiMatchRequestPayload): Promise<AiMatchResponsePayload> {
    const baseUrl = this.configService.get<string>('AI_SERVICE_URL', 'http://localhost:8000');
    const url = `${baseUrl.replace(/\/$/, '')}/api/v1/matching/match`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new ServiceUnavailableException(
        `AI matching service failed (${response.status}): ${detail}`,
      );
    }

    return (await response.json()) as AiMatchResponsePayload;
  }
}
