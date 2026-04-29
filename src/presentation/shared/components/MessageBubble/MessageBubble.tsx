// src/presentation/shared/components/MessageBubble/MessageBubble.tsx
import React from 'react';
import type { Message } from '@core/domain/types';
import { MessageRole } from '@core/domain/enums';
import './MessageBubble.scss';

export interface MessageBubbleProps {
  message: Message;
  className?: string;
}

const AVATAR_LABELS: Record<string, string> = {
  [MessageRole.USER]: '👤',
  [MessageRole.ASSISTANT]: '🤖',
  [MessageRole.SYSTEM]: '⚙️',
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, className = '' }) => {
  const classNames = [
    'ramiro-message',
    `ramiro-message--${message.role}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classNames}>
      <div className={`ramiro-message__avatar ramiro-message__avatar--${message.role}`}>
        {AVATAR_LABELS[message.role] || '?'}
      </div>
      <div className="ramiro-message__content">
        <div className="ramiro-message__text">
          {message.content.split('\n').map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
        {message.sources && message.sources.length > 0 && (
          <div className="ramiro-message__sources">
            {message.sources.map((src) => (
              <span key={src.documentId} className="ramiro-tier-badge" data-tier={src.tier}>
                {src.title}
              </span>
            ))}
          </div>
        )}
        <div className="ramiro-message__meta">
          <span>{new Date(message.createdAt).toLocaleTimeString()}</span>
          {message.model && <span>· {message.model}</span>}
          {message.tokenCount > 0 && <span>· {message.tokenCount} tokens</span>}
        </div>
      </div>
    </div>
  );
};
