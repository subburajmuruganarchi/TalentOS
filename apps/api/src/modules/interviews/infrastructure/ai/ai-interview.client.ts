import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AiGenerateQuestionsPayload {
  job_description: {
    job_title: string;
    raw_text: string | null;
    structured: Record<string, unknown> | null;
  };
  candidate_profile: Record<string, unknown>;
  coding_count?: number;
  technical_count?: number;
  architecture_count?: number;
}

export interface AiInterviewQuestion {
  type: string;
  question: string;
  rationale: string;
  evaluation_criteria: string[];
  difficulty: string;
  follow_up_prompts: string[];
  expected_topics: string[];
}

export interface AiGenerateQuestionsResponse {
  data: {
    coding: AiInterviewQuestion[];
    technical: AiInterviewQuestion[];
    architecture: AiInterviewQuestion[];
  };
  provider: string;
  model: string;
}

export interface AiTranscriptAnalyzePayload {
  transcript: string;
  job_title: string;
  candidate_name: string;
  questions?: {
    coding: AiInterviewQuestion[];
    technical: AiInterviewQuestion[];
    architecture: AiInterviewQuestion[];
  } | null;
}

export interface AiTranscriptAnalyzeResponse {
  processed: {
    cleaned_text: string;
    speaker_segments: Array<{ speaker: string; text: string }>;
    key_topics: string[];
  };
  summary: {
    overall_assessment: string;
    strengths: string[];
    concerns: string[];
    skill_signals: string[];
    question_responses: Array<{ topic: string; summary: string; evidence: string | null }>;
    suggested_follow_ups: string[];
    ai_recommendation: string;
    rationale: string;
  };
  provider: string;
  model: string;
}

@Injectable()
export class AiInterviewClient {
  constructor(private readonly configService: ConfigService) {}

  async generateQuestions(
    payload: AiGenerateQuestionsPayload,
  ): Promise<AiGenerateQuestionsResponse> {
    return this.post('/api/v1/interviews/questions/generate', payload);
  }

  async analyzeTranscript(payload: AiTranscriptAnalyzePayload): Promise<AiTranscriptAnalyzeResponse> {
    return this.post('/api/v1/interviews/transcript/analyze', payload);
  }

  private async post<T>(path: string, payload: unknown): Promise<T> {
    const baseUrl = this.configService.get<string>('AI_SERVICE_URL', 'http://localhost:8000');
    const url = `${baseUrl.replace(/\/$/, '')}${path}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new ServiceUnavailableException(
        `AI interview service failed (${response.status}): ${detail}`,
      );
    }

    return (await response.json()) as T;
  }
}
