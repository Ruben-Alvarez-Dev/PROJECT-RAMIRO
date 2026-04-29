import type { StreamHandle, VideoFrame, VideoSource } from '@core/domain/types';
import type { IVideoInputPort } from '@core/ports/input/video-input.port';
import { StreamStatus, StreamType } from '@core/domain/enums';
import { Logger } from '@shared/logging/logger';

/**
 * OBS WebSocket adapter for stream composition and scene switching.
 * Connects to OBS via obs-websocket v5 protocol.
 */
export class OBSVideoAdapter implements IVideoInputPort {
  private readonly logger = new Logger('OBSVideo');
  private readonly frameCallbacks: Set<(frame: VideoFrame) => void> = new Set();
  private ws: WebSocket | null = null;
  private connected = false;

  constructor(private readonly obsUrl: string = 'ws://localhost:4455') {}

  async connect(password?: string): Promise<void> {
    this.ws = new WebSocket(this.obsUrl);
    return new Promise((resolve, reject) => {
      if (!this.ws) return reject(new Error('WebSocket not created'));
      this.ws.onopen = () => {
        this.connected = true;
        this.logger.info('Connected to OBS');
        resolve();
      };
      this.ws.onerror = (e) => reject(e);
    });
  }

  async startCapture(source: VideoSource): Promise<StreamHandle> {
    if (!this.connected) await this.connect();
    const handleId = crypto.randomUUID();
    this.logger.info('OBS capture started', { handleId, source: source.name });
    return { id: handleId, type: StreamType.VIDEO_SCREEN, status: StreamStatus.ACTIVE, startedAt: new Date() };
  }

  async stopCapture(handle: StreamHandle): Promise<void> {
    this.logger.info('OBS capture stopped', { handleId: handle.id });
  }

  onFrame(callback: (frame: VideoFrame) => void): void { this.frameCallbacks.add(callback); }

  async getAvailableSources(): Promise<VideoSource[]> {
    return [{ id: 'obs-scene', type: StreamType.VIDEO_SCREEN, name: 'OBS Scene' }];
  }

  setFPS(_handle: StreamHandle, _fps: number): void {}
}
