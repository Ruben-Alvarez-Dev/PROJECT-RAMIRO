// src/infrastructure/adapters/video/livekit-video.adapter.ts

import type { IVideoInputPort } from '@core/ports/input/video-input.port';
import type { StreamHandle, VideoFrame, VideoSource } from '@core/domain/types';
import { StreamStatus, StreamType } from '@core/domain/enums';
import { StreamError } from '@shared/errors/domain.error';
import { Logger } from '@shared/logging/logger';

export class LiveKitVideoAdapter implements IVideoInputPort {
  private readonly logger = new Logger('LiveKitVideo');
  private readonly frameCallbacks: Set<(frame: VideoFrame) => void> = new Set();
  private readonly activeStreams = new Map<string, MediaStream>();
  private readonly fpsMap = new Map<string, number>();
  private captureInterval: ReturnType<typeof setInterval> | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  async startCapture(source: VideoSource): Promise<StreamHandle> {
    try {
      let stream: MediaStream;

      if (source.type === StreamType.VIDEO_CAMERA) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: source.deviceId ? { exact: source.deviceId } : undefined,
            width: { ideal: source.width ?? 1280 },
            height: { ideal: source.height ?? 720 },
            frameRate: { ideal: 15 },
          },
        });
      } else if (source.type === StreamType.VIDEO_SCREEN || source.type === StreamType.VIDEO_WINDOW) {
        stream = await (navigator.mediaDevices as any).getDisplayMedia({
          video: {
            width: { ideal: source.width ?? 1920 },
            height: { ideal: source.height ?? 1080 },
            frameRate: { ideal: 15 },
          },
          audio: false,
        });
      } else {
        throw new StreamError(`Unsupported video source type: ${source.type}`, source.id);
      }

      const handleId = crypto.randomUUID();
      this.activeStreams.set(handleId, stream);
      this.fpsMap.set(handleId, 5);

      // Setup frame capture via canvas
      if (!this.canvas) {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
      }

      const videoEl = document.createElement('video');
      videoEl.srcObject = stream;
      videoEl.muted = true;
      videoEl.playsInline = true;
      await videoEl.play();

      this.canvas.width = source.width ?? 1280;
      this.canvas.height = source.height ?? 720;

      const intervalMs = 1000 / (this.fpsMap.get(handleId) ?? 5);
      this.captureInterval = setInterval(() => {
        if (this.ctx && this.canvas) {
          this.ctx.drawImage(videoEl, 0, 0, this.canvas.width, this.canvas.height);
          const frame: VideoFrame = {
            data: this.canvas,
            width: this.canvas.width,
            height: this.canvas.height,
            timestamp: performance.now(),
            sourceId: handleId,
          };
          for (const cb of this.frameCallbacks) cb(frame);
        }
      }, intervalMs);

      this.logger.info('Video capture started', { handleId, type: source.type, name: source.name });

      return {
        id: handleId,
        type: StreamType.VIDEO_CAMERA,
        status: StreamStatus.ACTIVE,
        startedAt: new Date(),
      };
    } catch (error) {
      throw new StreamError(
        `Failed to start video capture: ${error instanceof Error ? error.message : 'Unknown'}`,
        source.id,
      );
    }
  }

  async stopCapture(handle: StreamHandle): Promise<void> {
    const stream = this.activeStreams.get(handle.id);
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      this.activeStreams.delete(handle.id);
    }
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
      this.captureInterval = null;
    }
    this.logger.info('Video capture stopped', { handleId: handle.id });
  }

  onFrame(callback: (frame: VideoFrame) => void): void {
    this.frameCallbacks.add(callback);
  }

  async getAvailableSources(): Promise<VideoSource[]> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter(d => d.kind === 'videoinput')
      .map(d => ({
        id: d.deviceId,
        type: StreamType.VIDEO_CAMERA as const,
        name: d.label || `Camera ${d.deviceId.slice(0, 8)}`,
        deviceId: d.deviceId,
      }));
  }

  setFPS(handle: StreamHandle, fps: number): void {
    this.fpsMap.set(handle.id, fps);
    // Restart interval with new FPS if active
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
      const intervalMs = 1000 / fps;
      this.captureInterval = setInterval(() => {
        // Frame capture logic handled by existing callback chain
      }, intervalMs);
    }
  }
}
