// src/presentation/web/App.tsx
import React, { useState, useCallback } from 'react';
import { ControlBar } from '../shared/components/ControlBar';
import { MessageBubble } from '../shared/components/MessageBubble';
import { AudioWaveform } from '../shared/components/AudioWaveform';
import { Button } from '../shared/components/Button';
import { useSession } from '../shared/hooks/useSession';
import { useAudio } from '../shared/hooks/useAudio';
import { useVideo } from '../shared/hooks/useVideo';
import { useKnowledge } from '../shared/hooks/useKnowledge';
import { SessionType, MessageRole, SessionState } from '@core/domain/enums';
import type { AudioPipelineState } from '@application/services/audio/audio-pipeline.service';
import '../shared/styles/reset.scss';
import '../shared/styles/layout.scss';

const INITIAL_PIPELINE_STATE: AudioPipelineState = {
  status: 'idle',
  currentTranscript: '',
  lastResponse: '',
  latencyMs: 0,
};

export const App: React.FC = () => {
  const session = useSession();
  const audio = useAudio();
  const video = useVideo();
  const knowledge = useKnowledge();
  const [pipelineState, setPipelineState] = useState<AudioPipelineState>(INITIAL_PIPELINE_STATE);
  const [isMicActive, setIsMicActive] = useState(false);

  const handleStartVoice = useCallback(() => {
    session.createSession(SessionType.VOICE);
    session.updateState(SessionState.CONNECTING);
    audio.startCapture();
    session.updateState(SessionState.ACTIVE);
    setPipelineState(prev => ({ ...prev, status: 'capturing' }));
  }, [session, audio]);

  const handleStartVideo = useCallback(() => {
    session.createSession(SessionType.VIDEO);
    session.updateState(SessionState.CONNECTING);
    video.startCamera();
    session.updateState(SessionState.ACTIVE);
    setPipelineState(prev => ({ ...prev, status: 'capturing' }));
  }, [session, video]);

  const handleStop = useCallback(() => {
    audio.stopCapture();
    video.stopAll();
    session.updateState(SessionState.IDLE);
    setPipelineState(INITIAL_PIPELINE_STATE);
    setIsMicActive(false);
  }, [audio, video, session]);

  const handleMicToggle = useCallback(() => {
    if (isMicActive) {
      setIsMicActive(false);
      setPipelineState(prev => ({ ...prev, status: 'capturing' }));
    } else {
      setIsMicActive(true);
      setPipelineState(prev => ({ ...prev, status: 'listening' }));
    }
  }, [isMicActive]);

  const handleModelChange = useCallback((model: string) => {
    // Model change would update orchestrator config
    console.log('Model changed to:', model);
  }, []);

  return (
    <div className="ramiro-layout">
      <ControlBar
        pipelineState={pipelineState}
        isSessionActive={session.session !== null}
        latencyMs={pipelineState.latencyMs}
        onStartVoice={handleStartVoice}
        onStartVideo={handleStartVideo}
        onStop={handleStop}
        onMicToggle={handleMicToggle}
        onModelChange={handleModelChange}
      />

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
          {session.messages.length === 0 && !session.session && (
            <div className="ramiro-chat__empty">
              <h2>🎤 Start a conversation</h2>
              <p>Press Voice or Video to begin a realtime session with Ramiro.</p>
            </div>
          )}
          {session.messages.length === 0 && session.session && (
            <div className="ramiro-chat__empty">
              <AudioWaveform isActive={pipelineState.status === 'listening'} barCount={32} />
              <p>{pipelineState.status === 'listening' ? 'Listening...' : 'Press the mic button to speak.'}</p>
            </div>
          )}
          {session.messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {pipelineState.status === 'processing' && (
            <div className="ramiro-chat__typing">
              <span className="ramiro-spinner" />
              Thinking...
            </div>
          )}
          {pipelineState.status === 'speaking' && (
            <div className="ramiro-chat__speaking">
              <AudioWaveform isActive={true} barCount={16} />
              <span>Speaking...</span>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="ramiro-chat__input-area">
          {pipelineState.currentTranscript && (
            <div className="ramiro-chat__transcript">
              <span className="ramiro-chat__transcript-label">You said:</span>
              <span className="ramiro-chat__transcript-text">{pipelineState.currentTranscript}</span>
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
          {knowledge.results.length === 0 && !knowledge.isSearching && (
            <div className="ramiro-knowledge__empty">
              <p>Search your knowledge base for oposition materials, documentation, and references.</p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};
