// src/application/use-cases/audio/start-audio-session.ts

import type { IAudioInputPort } from '@core/ports/input/audio-input.port';
import type { IAudioOutputPort } from '@core/ports/output/audio-output.port';
import type { ISTTPort } from '@core/ports/output/stt.port';
import type { ITTSPort } from '@core/ports/output/tts.port';
import type { ILLMPort } from '@core/ports/output/llm.port';
import type { IEventBus } from '@core/ports/notification/event-bus.port';
import type { AudioConfig, LLMMessage } from '@core/domain/types';
import { DEFAULT_AUDIO_CONFIG } from '@core/domain/value-objects/audio-config';
import { MessageRole, TierLevel } from '@core/domain/enums';

export interface StartAudioSessionInput {
  readonly sessionId: string;
  readonly audioConfig?: AudioConfig;
  readonly systemPrompt?: string;
  readonly tier0Context?: string;
}

export interface StartAudioSessionOutput {
  readonly sessionId: string;
  readonly handleId: string;
  readonly status: 'connected' | 'error';
  readonly error?: string;
}

export class StartAudioSession {
  constructor(
    private readonly audioInput: IAudioInputPort,
    private readonly audioOutput: IAudioOutputPort,
    private readonly stt: ISTTPort,
    private readonly tts: ITTSPort,
    private readonly llm: ILLMPort,
    private readonly eventBus: IEventBus,
  ) {}

  async execute(input: StartAudioSessionInput): Promise<StartAudioSessionOutput> {
    const config = input.audioConfig ?? DEFAULT_AUDIO_CONFIG;

    try {
      const handle = await this.audioInput.startCapture(config);

      this.audioInput.onFrame(async (frame) => {
        const transcript = await this.stt.transcribe({
          data: frame.data,
          sampleRate: frame.sampleRate,
          channels: frame.channels,
          duration: frame.data.length / (frame.sampleRate * frame.channels),
        });

        if (transcript.confidence < 0.5) return;

        const messages: LLMMessage[] = [];
        if (input.systemPrompt) {
          messages.push({ role: 'system', content: input.systemPrompt });
        }
        if (input.tier0Context) {
          messages.push({ role: 'system', content: `[TIER 0 — Sacred Word]\n${input.tier0Context}` });
        }
        messages.push({ role: 'user', content: transcript.text });

        this.eventBus.emit({
          type: 'audio.transcript.received',
          payload: { sessionId: input.sessionId, text: transcript.text, confidence: transcript.confidence },
          timestamp: new Date(),
        });

        let fullResponse = '';
        for await (const chunk of this.llm.chat({ messages, stream: true })) {
          fullResponse += chunk.content;
        }

        this.eventBus.emit({
          type: 'llm.response.generated',
          payload: { sessionId: input.sessionId, text: fullResponse },
          timestamp: new Date(),
        });

        for await (const audioChunk of this.tts.synthesize(fullResponse)) {
          await this.audioOutput.play(audioChunk);
        }

        this.eventBus.emit({
          type: 'audio.response.played',
          payload: { sessionId: input.sessionId },
          timestamp: new Date(),
        });
      });

      return { sessionId: input.sessionId, handleId: handle.id, status: 'connected' };
    } catch (error) {
      return {
        sessionId: input.sessionId,
        handleId: '',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
