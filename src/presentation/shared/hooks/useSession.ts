import { useState, useCallback, useRef } from 'react';
import { SessionState, SessionType, MessageRole } from '@core/domain/enums';
import type { Message, Session } from '@core/domain/types';
import { DEFAULT_MODEL_CONFIG } from '@core/domain/value-objects/model-config';
import { DEFAULT_KNOWLEDGE_CONFIG } from '@core/domain/value-objects/knowledge-config';

export interface UseSessionReturn {
  session: Session | null;
  messages: Message[];
  state: SessionState;
  createSession: (type: SessionType) => void;
  updateState: (state: SessionState) => void;
  addMessage: (role: MessageRole, content: string) => void;
  clearSession: () => void;
}

export function useSession(): UseSessionReturn {
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [state, setState] = useState<SessionState>(SessionState.IDLE);

  const createSession = useCallback((type: SessionType) => {
    const newSession: Session = {
      id: crypto.randomUUID(),
      state: SessionState.CONNECTING,
      type,
      sources: [],
      modelConfig: DEFAULT_MODEL_CONFIG,
      knowledgeConfig: DEFAULT_KNOWLEDGE_CONFIG,
      messages: [],
      memory: [],
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setSession(newSession);
    setMessages([]);
    setState(SessionState.CONNECTING);
  }, []);

  const updateState = useCallback((newState: SessionState) => {
    setState(newState);
    setSession(prev => prev ? { ...prev, state: newState, updatedAt: new Date() } : null);
  }, []);

  const addMessage = useCallback((role: MessageRole, content: string) => {
    const msg: Message = {
      id: crypto.randomUUID(),
      role,
      content,
      model: role === MessageRole.USER ? 'user' : 'ramiro',
      tier: 3, // ephemeral
      tokenCount: Math.ceil(content.length / 3.5),
      metadata: {},
      createdAt: new Date(),
    };
    setMessages(prev => [...prev, msg]);
    setSession(prev => prev ? { ...prev, messages: [...prev.messages, msg], updatedAt: new Date() } : null);
  }, []);

  const clearSession = useCallback(() => {
    setSession(null);
    setMessages([]);
    setState(SessionState.IDLE);
  }, []);

  return { session, messages, state, createSession, updateState, addMessage, clearSession };
}
