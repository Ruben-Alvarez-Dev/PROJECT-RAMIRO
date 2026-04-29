// src/application/dto/video.dto.ts

export interface StartVideoStreamDTO {
  sessionId: string;
  sources: Array<{
    id: string;
    type: 'camera' | 'screen' | 'window' | 'app';
    name: string;
    deviceId?: string;
  }>;
  fps?: number;
  systemPrompt?: string;
  tier0Context?: string;
}

export interface VideoStreamResponseDTO {
  sessionId: string;
  handles: string[];
  status: 'streaming' | 'error';
  error?: string;
}

export interface StopVideoStreamDTO {
  sessionId: string;
  handles: string[];
}

export interface VideoFrameDTO {
  sessionId: string;
  sourceId: string;
  width: number;
  height: number;
  timestamp: number;
}

export interface VideoResponseDTO {
  sessionId: string;
  omniResponse: string;
  proResponse: string;
  mergedResponse: string;
  timestamp: number;
}
