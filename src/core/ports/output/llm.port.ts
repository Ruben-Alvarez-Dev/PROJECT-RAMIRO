// src/core/ports/output/llm.port.ts

import type { LLMChunk, LLMRequest, ModelInfo, MultimodalRequest } from '../../domain/types';

export interface ILLMPort {
  chat(request: LLMRequest): AsyncIterable<LLMChunk>;
  chatMultimodal(request: MultimodalRequest): AsyncIterable<LLMChunk>;
  getAvailableModels(): Promise<ModelInfo[]>;
  estimateTokens(text: string): number;
}
