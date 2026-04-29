// src/shared/errors/domain.error.ts

/**
 * Base domain error. All custom errors extend this.
 * Preserves stack trace and error context for debugging.
 */
export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class AdapterError extends DomainError {
  constructor(
    message: string,
    public readonly provider: string,
    context?: Record<string, unknown>,
  ) {
    super(message, 'ADAPTER_ERROR', { ...context, provider });
  }
}

export class ModelNotAvailableError extends DomainError {
  constructor(provider: string, model: string) {
    super(
      `Model not available: ${provider}/${model}`,
      'MODEL_NOT_AVAILABLE',
      { provider, model },
    );
  }
}

export class StreamError extends DomainError {
  constructor(
    message: string,
    public readonly streamId: string,
    context?: Record<string, unknown>,
  ) {
    super(message, 'STREAM_ERROR', { ...context, streamId });
  }
}

export class KnowledgeError extends DomainError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'KNOWLEDGE_ERROR', context);
  }
}

export class SessionError extends DomainError {
  constructor(message: string, public readonly sessionId: string) {
    super(message, 'SESSION_ERROR', { sessionId });
  }
}

export class ContextOverflowError extends DomainError {
  constructor(currentTokens: number, maxTokens: number) {
    super(
      `Context overflow: ${currentTokens}/${maxTokens} tokens`,
      'CONTEXT_OVERFLOW',
      { currentTokens, maxTokens },
    );
  }
}

export class AuthenticationError extends DomainError {
  constructor(provider: string) {
    super(`Authentication failed for provider: ${provider}`, 'AUTH_ERROR', { provider });
  }
}
