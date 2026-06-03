// src/application/services/orchestrator.service.ts

import type { ModelRole } from '@core/domain/enums';
import type { LLMMessage, LLMRequest, ModelConfig } from '@core/domain/types';
import type { IEventBus } from '@core/ports/notification/event-bus.port';
import type { ILLMPort } from '@core/ports/output/llm.port';

export interface OrchestrationRequest {
  readonly messages: LLMMessage[];
  readonly modelConfig: ModelConfig;
  readonly role: ModelRole;
  readonly stream?: boolean;
}

export interface OrchestrationResponse {
  readonly content: string;
  readonly model: string;
  readonly provider: string;
  readonly usage?: { promptTokens: number; completionTokens: number };
}

/**
 * OrchestratorService routes requests to the appropriate model based on role.
 * Handles failover: primary model → fallback model.
 * For OMNI role, routes to omni config; for PRO, routes to pro config.
 */
export class OrchestratorService {
  private readonly modelAdapters: Map<string, ILLMPort>;

  constructor(
    adapters: Map<string, ILLMPort>,
    private readonly eventBus: IEventBus,
  ) {
    this.modelAdapters = adapters;
  }

  async execute(request: OrchestrationRequest): Promise<OrchestrationResponse> {
    const provider = this.resolveProvider(request.role, request.modelConfig);
    const adapter = this.modelAdapters.get(provider.provider);

    if (!adapter) {
      // Fallback
      const fallbackAdapter = this.modelAdapters.get(request.modelConfig.fallback.provider);
      if (!fallbackAdapter) {
        throw new Error(
          `No adapter found for provider: ${provider.provider} and no fallback available`,
        );
      }
      return this.executeWithAdapter(fallbackAdapter, request, request.modelConfig.fallback);
    }

    try {
      // NOTE: `await` is required here — executeWithAdapter is async and the
      // adapter can reject *inside* its `for await` loop. Without awaiting, the
      // rejected promise would escape this try/catch and failover would never run.
      return await this.executeWithAdapter(adapter, request, provider);
    } catch {
      // Primary failed, try fallback
      this.eventBus.emit({
        type: 'orchestrator.failover',
        payload: { from: provider.provider, to: request.modelConfig.fallback.provider },
        timestamp: new Date(),
      });

      const fallbackAdapter = this.modelAdapters.get(request.modelConfig.fallback.provider);
      if (!fallbackAdapter) throw new Error('Fallback adapter not available');
      return this.executeWithAdapter(fallbackAdapter, request, request.modelConfig.fallback);
    }
  }

  private resolveProvider(role: ModelRole, config: ModelConfig) {
    switch (role) {
      case 'omni':
        return config.omni;
      case 'pro':
        return config.pro;
      case 'tts':
        return config.tts;
      case 'stt':
        return config.stt;
      case 'fallback':
        return config.fallback;
      default:
        return config.omni;
    }
  }

  private async executeWithAdapter(
    adapter: ILLMPort,
    request: OrchestrationRequest,
    provider: { provider: string; model: string },
  ): Promise<OrchestrationResponse> {
    const llmRequest: LLMRequest = {
      messages: request.messages,
      model: provider.model,
      temperature: 0.1,
      stream: request.stream ?? true,
    };

    let content = '';
    let usage: { promptTokens: number; completionTokens: number } | undefined;

    for await (const chunk of adapter.chat(llmRequest)) {
      content += chunk.content;
      if (chunk.usage) usage = chunk.usage;
    }

    return { content, model: provider.model, provider: provider.provider, usage };
  }
}
