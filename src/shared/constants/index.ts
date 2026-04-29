// src/shared/constants/index.ts

export const APP_NAME = 'project-ramiro';
export const APP_VERSION = '0.1.0';

// Audio defaults
export const DEFAULT_SAMPLE_RATE = 24000;
export const DEFAULT_CHANNELS = 1;
export const VAD_THRESHOLD = 0.5;
export const AUDIO_BUFFER_SIZE = 4096;

// Video defaults
export const DEFAULT_FPS = 5;
export const MAX_VIDEO_SOURCES = 4;
export const MAX_AUDIO_SOURCES = 4;
export const DEFAULT_VIDEO_WIDTH = 1280;
export const DEFAULT_VIDEO_HEIGHT = 720;

// LLM defaults
export const DEFAULT_TEMPERATURE = 0.1;
export const DEFAULT_MAX_TOKENS = 32768;
export const DEFAULT_CONTEXT_WINDOW = 1_000_000;

// Knowledge defaults
export const TIER0_MAX_TOKEN_RATIO = 0.30;
export const TIER1_MAX_TOKEN_RATIO = 0.25;
export const TIER2_MAX_TOKEN_RATIO = 0.35;
export const TIER3_MAX_TOKEN_RATIO = 0.10;
export const DEFAULT_SEARCH_LIMIT = 10;
export const DEFAULT_CHUNK_SIZE = 512;
export const DEFAULT_CHUNK_OVERLAP = 64;

// Memory defaults
export const MAX_HISTORY_MESSAGES = 10;
export const AUTO_CLEANUP_THRESHOLD = 0.80;
export const AGGRESSIVE_CLEANUP_THRESHOLD = 0.90;
export const SESSION_ARCHIVE_DURATION_MS = 3_600_000; // 1 hour

// Performance targets
export const TARGET_AUDIO_LATENCY_MS = 200;
export const TARGET_VIDEO_FRAME_MS = 100;
export const TARGET_STARTUP_MS = 3000;
export const TARGET_MEMORY_IDLE_MB = 500;
export const TARGET_MEMORY_ACTIVE_MB = 2048;
export const TARGET_CPU_IDLE_PERCENT = 5;
export const TARGET_CPU_ACTIVE_PERCENT = 40;

// Paths
export const DEFAULT_DB_PATH = '~/.ramiro/data.db';
export const DEFAULT_KNOWLEDGE_PATH = '~/.ramiro/knowledge/';
export const DEFAULT_TIER0_PATH = '~/.ramiro/knowledge/tier-0/';
