// src/tests/unit/session-entity.spec.ts

import { describe, it, expect } from 'vitest';
import { SessionState, SessionType, MessageRole, TierLevel } from '@core/domain/enums';
import type { Session, Message } from '@core/domain/types';
import { DEFAULT_MODEL_CONFIG } from '@core/domain/value-objects/model-config';
import { DEFAULT_KNOWLEDGE_CONFIG } from '@core/domain/value-objects/knowledge-config';

describe('Session Entity', () => {
  const createSession = (overrides?: Partial<Session>): Session => ({
    id: crypto.randomUUID(),
    state: SessionState.IDLE,
    type: SessionType.VOICE,
    sources: [],
    modelConfig: DEFAULT_MODEL_CONFIG,
    knowledgeConfig: DEFAULT_KNOWLEDGE_CONFIG,
    messages: [],
    memory: [],
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  it('should create a session with default state IDLE', () => {
    const session = createSession();
    expect(session.state).toBe(SessionState.IDLE);
    expect(session.type).toBe(SessionType.VOICE);
    expect(session.messages).toHaveLength(0);
  });

  it('should transition through valid states', () => {
    const session = createSession();
    expect(session.state).toBe(SessionState.IDLE);

    session.state = SessionState.CONNECTING;
    expect(session.state).toBe(SessionState.CONNECTING);

    session.state = SessionState.ACTIVE;
    expect(session.state).toBe(SessionState.ACTIVE);

    session.state = SessionState.PAUSED;
    expect(session.state).toBe(SessionState.PAUSED);

    session.state = SessionState.ARCHIVED;
    expect(session.state).toBe(SessionState.ARCHIVED);
  });

  it('should support all session types', () => {
    const types = [SessionType.VOICE, SessionType.VIDEO, SessionType.STUDY, SessionType.CHAT];
    for (const type of types) {
      const session = createSession({ type });
      expect(session.type).toBe(type);
    }
  });

  it('should hold messages with correct roles', () => {
    const message: Message = {
      id: crypto.randomUUID(),
      role: MessageRole.USER,
      content: 'Hello Ramiro',
      model: 'user',
      tier: TierLevel.DYNAMIC,
      tokenCount: 2,
      metadata: {},
      createdAt: new Date(),
    };

    const session = createSession({ messages: [message] });
    expect(session.messages).toHaveLength(1);
    expect(session.messages[0]!.role).toBe(MessageRole.USER);
    expect(session.messages[0]!.content).toBe('Hello Ramiro');
  });

  it('should support multiple sources up to 4', () => {
    const sources = Array.from({ length: 4 }, (_, i) => ({
      id: `source-${i}`,
      type: i % 2 === 0 ? 'video_camera' as const : 'audio_input' as const,
      name: `Source ${i}`,
      config: { sampleRate: 24000, channels: 1, bitDepth: 16, codec: 'opus' as const, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      status: 'active' as const,
      priority: i + 1,
    }));

    const session = createSession({ sources });
    expect(session.sources).toHaveLength(4);
  });
});
