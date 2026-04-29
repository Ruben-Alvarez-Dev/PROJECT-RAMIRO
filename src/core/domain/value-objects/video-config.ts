// src/core/domain/value-objects/video-config.ts

export interface VideoConfig {
  readonly width: number;
  readonly height: number;
  readonly fps: number;
  readonly codec: 'vp8' | 'vp9' | 'h264';
  readonly maxBitrate: number;
  readonly facing: 'user' | 'environment';
}

export const DEFAULT_VIDEO_CONFIG: VideoConfig = {
  width: 1280,
  height: 720,
  fps: 15,
  codec: 'vp8',
  maxBitrate: 2500,
  facing: 'user',
};
