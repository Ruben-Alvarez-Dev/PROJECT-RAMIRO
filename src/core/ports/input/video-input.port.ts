// src/core/ports/input/video-input.port.ts

import type { StreamHandle, VideoFrame, VideoSource } from '../../domain/types';

export interface IVideoInputPort {
  startCapture(source: VideoSource): Promise<StreamHandle>;
  stopCapture(handle: StreamHandle): Promise<void>;
  onFrame(callback: (frame: VideoFrame) => void): void;
  getAvailableSources(): Promise<VideoSource[]>;
  setFPS(handle: StreamHandle, fps: number): void;
}
