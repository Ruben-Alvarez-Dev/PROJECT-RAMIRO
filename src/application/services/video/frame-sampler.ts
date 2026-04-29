// src/application/services/video/frame-sampler.ts
// Samples video frames at configurable FPS from multiple simultaneous sources.
// Implements ring buffer per source to prevent memory leaks in long sessions.

export interface FrameSamplerConfig {
  readonly fpsPerSource: number;      // default 5
  readonly maxBufferFrames: number;   // default 30 per source (6s at 5fps)
  readonly jpegQuality: number;       // default 0.7
  readonly maxWidth: number;          // default 1280
  readonly maxHeight: number;         // default 720
}

export const DEFAULT_SAMPLER_CONFIG: FrameSamplerConfig = {
  fpsPerSource: 5,
  maxBufferFrames: 30,
  jpegQuality: 0.7,
  maxWidth: 1280,
  maxHeight: 720,
};

export interface SampledFrame {
  readonly sourceId: string;
  readonly timestamp: number;
  readonly jpegData: string;       // base64 encoded JPEG
  readonly width: number;
  readonly height: number;
}

export interface FrameSource {
  readonly id: string;
  readonly name: string;
  readonly type: 'camera' | 'screen' | 'window' | 'app' | 'obs';
  stream: MediaStream | null;
  videoElement: HTMLVideoElement | null;
  canvas: HTMLCanvasElement | null;
  ctx: CanvasRenderingContext2D | null;
  intervalId: ReturnType<typeof setInterval> | null;
  buffer: SampledFrame[];
}

export class FrameSampler {
  private readonly sources = new Map<string, FrameSource>();
  private readonly callbacks: Set<(frame: SampledFrame) => void> = new Set();
  private config: FrameSamplerConfig;
  private canvasPool: HTMLCanvasElement[] = [];

  constructor(config: Partial<FrameSamplerConfig> = {}) {
    this.config = { ...DEFAULT_SAMPLER_CONFIG, ...config };
  }

  onFrame(callback: (frame: SampledFrame) => void): void {
    this.callbacks.add(callback);
  }

  async addSource(sourceId: string, name: string, type: FrameSource['type'], stream: MediaStream): Promise<void> {
    if (this.sources.size >= 4) {
      throw new Error('Maximum 4 simultaneous video sources allowed');
    }

    const video = document.createElement('video');
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    await video.play();

    const canvas = this.getCanvas();
    canvas.width = this.config.maxWidth;
    canvas.height = this.config.maxHeight;
    const ctx = canvas.getContext('2d');

    const frameSource: FrameSource = {
      id: sourceId,
      name,
      type,
      stream,
      videoElement: video,
      canvas,
      ctx,
      intervalId: null,
      buffer: [],
    };

    // Start sampling at configured FPS
    const intervalMs = 1000 / this.config.fpsPerSource;
    frameSource.intervalId = setInterval(() => {
      this.sampleFrame(frameSource);
    }, intervalMs);

    this.sources.set(sourceId, frameSource);
  }

  removeSource(sourceId: string): void {
    const source = this.sources.get(sourceId);
    if (!source) return;

    if (source.intervalId) clearInterval(source.intervalId);
    source.stream?.getTracks().forEach(t => t.stop());
    source.videoElement?.remove();
    if (source.canvas) this.canvasPool.push(source.canvas);
    this.sources.delete(sourceId);
  }

  getActiveSourceCount(): number {
    return this.sources.size;
  }

  getSources(): Array<{ id: string; name: string; type: FrameSource['type'] }> {
    return Array.from(this.sources.values()).map(s => ({ id: s.id, name: s.name, type: s.type }));
  }

  getLatestFrames(): SampledFrame[] {
    const frames: SampledFrame[] = [];
    for (const [, source] of this.sources) {
      const latest = source.buffer[source.buffer.length - 1];
      if (latest) frames.push(latest);
    }
    return frames;
  }

  getAllBuffers(): Map<string, SampledFrame[]> {
    const result = new Map<string, SampledFrame[]>();
    for (const [id, source] of this.sources) {
      result.set(id, [...source.buffer]);
    }
    return result;
  }

  stopAll(): void {
    for (const [id] of this.sources) {
      this.removeSource(id);
    }
  }

  setFPS(sourceId: string, fps: number): void {
    const source = this.sources.get(sourceId);
    if (!source) return;
    if (source.intervalId) clearInterval(source.intervalId);
    const intervalMs = 1000 / fps;
    source.intervalId = setInterval(() => this.sampleFrame(source), intervalMs);
  }

  private sampleFrame(source: FrameSource): void {
    if (!source.ctx || !source.canvas || !source.videoElement) return;

    source.ctx.drawImage(source.videoElement, 0, 0, source.canvas.width, source.canvas.height);

    let jpegData: string;
    try {
      jpegData = source.canvas.toDataURL('image/jpeg', this.config.jpegQuality).split(',')[1] || '';
    } catch {
      return; // SecurityError on tainted canvas
    }

    const frame: SampledFrame = {
      sourceId: source.id,
      timestamp: performance.now(),
      jpegData,
      width: source.canvas.width,
      height: source.canvas.height,
    };

    // Ring buffer
    source.buffer.push(frame);
    if (source.buffer.length > this.config.maxBufferFrames) {
      source.buffer.shift();
    }

    for (const cb of this.callbacks) {
      try { cb(frame); } catch {}
    }
  }

  private getCanvas(): HTMLCanvasElement {
    if (this.canvasPool.length > 0) {
      return this.canvasPool.pop()!;
    }
    return document.createElement('canvas');
  }
}
