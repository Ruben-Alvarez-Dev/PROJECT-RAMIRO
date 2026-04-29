// src/presentation/web/App.tsx
import React from 'react';
import { Button, MessageBubble } from '../shared/components';
import { useSession } from '../shared/hooks/useSession';
import { useAudio } from '../shared/hooks/useAudio';
import { useVideo } from '../shared/hooks/useVideo';
import { useKnowledge } from '../shared/hooks/useKnowledge';
import { SessionType, MessageRole, SessionState } from '@core/domain/enums';
import '../shared/styles/reset.scss';

export const App: React.FC = () => {
  const session = useSession();
  const audio = useAudio();
  const video = useVideo();
  const knowledge = useKnowledge();

  const handleStartVoice = () => {
    session.createSession(SessionType.VOICE);
    session.updateState(SessionState.CONNECTING);
    audio.startCapture();
    session.updateState(SessionState.ACTIVE);
  };

  const handleStartVideo = () => {
    session.createSession(SessionType.VIDEO);
    session.updateState(SessionState.CONNECTING);
    video.startCamera();
    session.updateState(SessionState.ACTIVE);
  };

  const handleStop = () => {
    audio.stopCapture();
    video.stopAll();
    session.updateState(SessionState.IDLE);
  };

  return (
    <div className="ramiro-layout">
      {/* Control Bar */}
      <header className="ramiro-control-bar">
        <div className="ramiro-control-bar__left">
          <h1 className="ramiro-control-bar__title">Ramiro</h1>
          <span className="ramiro-control-bar__status" data-state={session.session?.state}>
            {session.session?.state || 'idle'}
          </span>
        </div>
        <div className="ramiro-control-bar__center">
          {!session.session ? (
            <>
              <Button variant="primary" onClick={handleStartVoice}>
                🎤 Start Voice
              </Button>
              <Button variant="secondary" onClick={handleStartVideo}>
                📹 Start Video
              </Button>
            </>
          ) : (
            <Button variant="ghost" onClick={handleStop}>
              ⏹ Stop
            </Button>
          )}
        </div>
        <div className="ramiro-control-bar__right">
          <span className="ramiro-context-meter">
            Context: {session.messages.length} messages
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="ramiro-chat">
        {/* Video Grid */}
        {video.isStreaming && (
          <div className="ramiro-video-grid" data-sources={video.sources.length}>
            {video.sources.map((source) => (
              <div key={source.id} className="ramiro-video-grid__cell">
                <video
                  ref={(el) => {
                    if (el && source.stream) el.srcObject = source.stream;
                  }}
                  autoPlay
                  muted
                  playsInline
                />
                <span className="ramiro-video-grid__label">{source.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Messages */}
        <div className="ramiro-chat__messages">
          {session.messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {session.isProcessing && (
            <div className="ramiro-chat__typing">
              <span className="ramiro-spinner" />
              Thinking...
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="ramiro-chat__input-area">
          {audio.isCapturing && (
            <div className="ramiro-waveform">
              <span className="ramiro-stream-indicator" data-active="true">
                🔴 Listening...
              </span>
            </div>
          )}
          <input
            className="ramiro-chat__input"
            type="text"
            placeholder="Type a message or speak..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                session.addMessage(MessageRole.USER, e.currentTarget.value.trim());
                e.currentTarget.value = '';
              }
            }}
          />
        </div>
      </main>

      {/* Knowledge Sidebar */}
      <aside className="ramiro-knowledge">
        <div className="ramiro-knowledge__search">
          <input
            className="ramiro-input"
            type="search"
            placeholder="Search knowledge..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') knowledge.search(e.currentTarget.value);
            }}
          />
        </div>
        <div className="ramiro-knowledge__results">
          {knowledge.results.map((result) => (
            <div key={result.documentId} className="ramiro-source-card">
              <span className="ramiro-tier-badge" data-tier={result.tier}>
                T{result.tier}
              </span>
              <h4 className="ramiro-source-card__title">{result.title}</h4>
              <p className="ramiro-source-card__snippet">{result.chunk}</p>
              <span className="ramiro-source-card__score">
                {(result.score * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
};
