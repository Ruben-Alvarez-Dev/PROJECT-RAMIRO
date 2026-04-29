// src/core/domain/enums/index.ts
// Domain enumerations for PROJECT-RAMIRO

export enum SessionState {
  IDLE = 'idle',
  CONNECTING = 'connecting',
  ACTIVE = 'active',
  PAUSED = 'paused',
  ARCHIVING = 'archiving',
  ARCHIVED = 'archived',
}

export enum SessionType {
  VOICE = 'voice',
  VIDEO = 'video',
  STUDY = 'study',
  CHAT = 'chat',
}

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

export enum StreamType {
  AUDIO_INPUT = 'audio_input',
  AUDIO_OUTPUT = 'audio_output',
  VIDEO_CAMERA = 'video_camera',
  VIDEO_SCREEN = 'video_screen',
  VIDEO_WINDOW = 'video_window',
  VIDEO_APP = 'video_app',
}

export enum StreamStatus {
  IDLE = 'idle',
  ACTIVE = 'active',
  ERROR = 'error',
  RECONNECTING = 'reconnecting',
}

export enum TierLevel {
  SACRED = 0,
  CORE = 1,
  DYNAMIC = 2,
  EPHEMERAL = 3,
}

export enum ModelRole {
  OMNI = 'omni',
  PRO = 'pro',
  TTS = 'tts',
  STT = 'stt',
  FALLBACK = 'fallback',
}

export enum Platform {
  MACOS = 'macos',
  WEB = 'web',
  ANDROID = 'android',
}
