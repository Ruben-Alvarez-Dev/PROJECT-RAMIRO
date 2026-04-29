import type { ILLMPort } from '@core/ports/output/llm.port';
import type { LLMRequest, LLMChunk, ModelInfo, MultimodalRequest } from '@core/domain/types';
import { AdapterError } from '@shared/errors/domain.error';
import { Logger } from '@shared/logging/logger';

export class QwenAdapter implements ILLMPort {
  private readonly logger = new Logger('QwenAdapter');

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string = 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  ) {}

  async *chat(request: LLMRequest): AsyncIterable<LLMChunk> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: request.model ?? 'qwen2.5-omni',
        messages: request.messages,
        temperature: request.temperature ?? 0.1,
        max_tokens: request.maxTokens ?? 32768,
        stream: true,
      }),
    });

    if (!response.ok) throw new AdapterError(`Qwen API error: ${response.status}`, 'qwen');

    const reader = response.body?.getReader();
    if (!reader) throw new AdapterError('No response body', 'qwen');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
        try {
          const data = JSON.parse(line.slice(6));
          const delta = data.choices?.[0]?.delta;
          if (delta?.content) yield { content: delta.content };
          if (data.usage) yield { content: '', finishReason: 'stop', usage: { promptTokens: data.usage.prompt_tokens, completionTokens: data.usage.completion_tokens } };
        } catch {}
      }
    }
  }

  async *chatMultimodal(request: MultimodalRequest): AsyncIterable<LLMChunk> {
    yield* this.chat({ ...request, stream: true });
  }

  async getAvailableModels(): Promise<ModelInfo[]> {
    return [
      { provider: 'qwen', model: 'qwen2.5-omni', displayName: 'Qwen 2.5 Omni', capabilities: ['text', 'vision', 'audio'], contextWindow: 131072 },
      { provider: 'qwen', model: 'qwen-max', displayName: 'Qwen Max', capabilities: ['text'], contextWindow: 131072 },
    ];
  }

  estimateTokens(text: string): number { return Math.ceil(text.length / 3); }
}
