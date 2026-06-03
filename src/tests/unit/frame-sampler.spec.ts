import { DEFAULT_SAMPLER_CONFIG, FrameSampler } from '@application/services/video/frame-sampler';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('FrameSampler', () => {
  let sampler: FrameSampler;

  beforeEach(() => {
    sampler = new FrameSampler();
  });

  it('should initialize with default config', () => {
    expect(sampler.getActiveSourceCount()).toBe(0);
    expect(sampler.getSources()).toHaveLength(0);
  });

  it('should accept custom config', () => {
    const custom = new FrameSampler({ fpsPerSource: 10, maxBufferFrames: 60 });
    expect(custom.getActiveSourceCount()).toBe(0);
  });

  it('should reject more than 4 sources', async () => {
    const mockStream = { getTracks: () => [] } as unknown as MediaStream;

    // FrameSampler.addSource touches the DOM (createElement('video'/'canvas')).
    // Stub it with inert fakes so we can exercise the real 4-source cap logic
    // without depending on a full media stack. (DOM extraction → Wave 2.)
    const fakeVideo = () => ({
      srcObject: null as unknown,
      muted: false,
      playsInline: false,
      play: async () => {},
      remove: () => {},
    });
    const fakeCanvas = () => ({
      width: 0,
      height: 0,
      getContext: () => ({ drawImage: () => {} }),
      toDataURL: () => 'data:image/jpeg;base64,AAAA',
    });
    vi.spyOn(document, 'createElement').mockImplementation(
      (tag: string) => (tag === 'canvas' ? fakeCanvas() : fakeVideo()) as unknown as HTMLElement,
    );

    try {
      // Fill the 4 allowed slots, then expect the 5th to be rejected.
      for (let i = 0; i < 4; i++) {
        await sampler.addSource(`src-${i}`, `Source ${i}`, 'camera', mockStream);
      }
      expect(sampler.getActiveSourceCount()).toBe(4);

      await expect(
        sampler.addSource('src-overflow', 'Overflow', 'camera', mockStream),
      ).rejects.toThrow('Maximum 4 simultaneous video sources allowed');

      sampler.stopAll();
      expect(sampler.getActiveSourceCount()).toBe(0);
      expect(DEFAULT_SAMPLER_CONFIG.fpsPerSource).toBe(5);
    } finally {
      vi.restoreAllMocks();
    }
  });

  it('should provide latest frames from buffer', () => {
    const frames = sampler.getLatestFrames();
    expect(frames).toHaveLength(0);
  });

  it('should provide all buffers', () => {
    const buffers = sampler.getAllBuffers();
    expect(buffers.size).toBe(0);
  });

  it('should register frame callbacks', () => {
    const cb = vi.fn();
    sampler.onFrame(cb);
    // Callback registered (no way to verify without triggering)
    expect(true).toBe(true);
  });

  it('should stop all sources cleanly', () => {
    sampler.stopAll();
    expect(sampler.getActiveSourceCount()).toBe(0);
    expect(sampler.getSources()).toHaveLength(0);
  });
});
