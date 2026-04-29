// src/application/dto/audio.dto.ts

export interface StartAudioSessionDTO {
  sessionId: string;
  audioConfig?: {
    sampleRate?: number;
    channels?: number;
    codec?: string;
    echoCancellation?: boolean;
    noiseSuppression?: boolean;
  };
  systemPrompt?: string;
  tier0Context?: string;
}

export interface AudioSessionResponseDTO {
  sessionId: string;
  handleId: string;
  status: 'connected' | 'error';
  error?: string;
}

export interface StopAudioSessionDTO {
  sessionId: string;
  handleId: string;
}

export interface AudioTranscriptDTO {
  sessionId: string;
  text: string;
  confidence: number;
  timestamp: number;
}

export interface AudioResponseDTO {
  sessionId: string;
  text: string;
  audioUrl?: string;
  durationMs?: number;
}
