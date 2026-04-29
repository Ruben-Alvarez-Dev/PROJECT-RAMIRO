// src/presentation/shared/hooks/useSession.ts
import { useState, useCallback } from 'react';
import type { Message, Session } from '@core/domain/types';
import { SessionState, SessionType, MessageRole, TierLevel } from '@core/domain/enums';

interface UseSessionState {
  session: Session | null;
  messages: Message[];
  isProcessing: boolean;
  error: string | null;
}

export function useSession() {
  const [state, setState] = useState<UseSessionState>({
    session: null,
    messages: [],
    isProcessing: false,
    error: null,
  });

  const createSession = useCallback((type: SessionType) => {
    const session: Session = {
      id: crypto.randomUUID(),
      state: SessionState.IDLE,
      type,
      sources: [],
      modelConfig: {
        omni: { provider: 'xiaomi', model: 'mimo-v2-omni', temperature: 0.1, maxTokens: 32768 },
        pro: { provider: 'xiaomi', model: 'mimo-v2.5-pro', temperature: 0.1, maxTokens: 32768 },
        tts: { provider: 'xiaomi', model: 'mimo-v2-tts', temperature: 0.1, maxTokens: 4096 },
        stt: { provider: 'xiaomi', model: 'mimo-v2-omni', temperature: 0, maxTokens: 4096 },
        fallback: { provider: 'qwen', model: 'qwen2.5-omni', temperature: 0.1, maxTokens: 32768 },
      },
      knowledgeConfig: {
        tier0Paths: [],
        tier1Collections: ['default'],
        maxContextTokens: 1_000_000,
        autoSummarize: true,
        focusAnchoring: true,
      },
      messages: [],
      memory: [],
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setState(prev => ({ ...prev, session, messages: [], error: null }));
    return session;
  }, []);

  const addMessage = useCallback((role: MessageRole, content: string, model?: string) => {
    const message: Message = {
      id: crypto.randomUUID(),
      role,
      content,
      model: model || 'user',
      tier: TierLevel.DYNAMIC,
      tokenCount: Math.ceil(content.length / 4),
      metadata: {},
      createdAt: new Date(),
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, message],
    }));

    return message;
  }, []);

  const setProcessing = useCallback((isProcessing: boolean) => {
    setState(prev => ({ ...prev, isProcessing }));
  }, []);

  const updateState = useCallback((sessionState: SessionState) => {
    setState(prev => ({
      ...prev,
      session: prev.session ? { ...prev.session, state: sessionState, updatedAt: new Date() } : null,
    }));
  }, []);

  return {
    ...state,
    createSession,
    addMessage,
    setProcessing,
    updateState,
  };
}
