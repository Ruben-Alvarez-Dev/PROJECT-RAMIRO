// src/application/services/video/model-router.ts
// Routing rules for OMNI vs PRO models.
// Supports user override via ModelSwitch (AUTO/OMNI/PRO/BOTH).

import type { SampledFrame } from './frame-sampler';
import { Logger } from '@shared/logging/logger';

export type ModelMode = 'auto' | 'omni' | 'pro' | 'both';

export type RouteDecision = 'omni_only' | 'pro_only' | 'both_parallel';

export interface RoutingContext {
  readonly userMode: ModelMode;
  readonly hasVideo: boolean;
  readonly hasAudio: boolean;
  readonly frameComplexity: 'simple' | 'moderate' | 'complex';
  readonly conversationPhase: 'greeting' | 'teaching' | 'questioning' | 'reviewing';
  readonly sessionDurationMs: number;
}

export interface RoutingResult {
  readonly decision: RouteDecision;
  readonly reason: string;
  readonly omniPrompt: string;
  readonly proPrompt: string;
}

const logger = new Logger('ModelRouter');

export function decideRoute(ctx: RoutingContext): RoutingResult {
  // User override: explicit mode wins always
  if (ctx.userMode === 'omni') {
    return {
      decision: 'omni_only',
      reason: 'User selected OMNI mode (speed/realtime)',
      omniPrompt: 'Describe what you see and respond concisely.',
      proPrompt: '',
    };
  }

  if (ctx.userMode === 'pro') {
    return {
      decision: 'pro_only',
      reason: 'User selected PRO mode (depth/reasoning)',
      omniPrompt: '',
      proPrompt: 'Provide a thorough, structured analysis. Reference the knowledge base.',
    };
  }

  if (ctx.userMode === 'both') {
    return {
      decision: 'both_parallel',
      reason: 'User selected BOTH mode (parallel processing)',
      omniPrompt: 'Describe what you see concisely.',
      proPrompt: 'Provide a detailed analysis. Reference the knowledge base for accuracy.',
    };
  }

  // AUTO mode: system decides based on context
  if (ctx.conversationPhase === 'greeting') {
    return {
      decision: 'omni_only',
      reason: 'AUTO: Greeting phase — fast acknowledgement via OMNI',
      omniPrompt: 'Respond briefly to the user. Be warm and direct.',
      proPrompt: '',
    };
  }

  if (ctx.frameComplexity === 'complex' && ctx.hasVideo) {
    return {
      decision: 'both_parallel',
      reason: 'AUTO: Complex visual content — both models for comprehensive response',
      omniPrompt: 'Describe every element you see in this frame.',
      proPrompt: 'Analyze the visual content in depth. What is the user looking at?',
    };
  }

  if (ctx.conversationPhase === 'teaching' && ctx.hasVideo) {
    return {
      decision: 'both_parallel',
      reason: 'AUTO: Teaching session with visual — both models',
      omniPrompt: 'Describe the visual content briefly.',
      proPrompt: 'Explain what the user is seeing in the study context. Be pedagogical.',
    };
  }

  if (!ctx.hasVideo && ctx.hasAudio) {
    return {
      decision: 'pro_only',
      reason: 'AUTO: Audio-only — PRO for text reasoning',
      omniPrompt: '',
      proPrompt: 'Respond conversationally. Use the knowledge base for accuracy.',
    };
  }

  if (ctx.sessionDurationMs > 1_800_000 && ctx.frameComplexity === 'simple') {
    return {
      decision: 'omni_only',
      reason: 'AUTO: Long session, simple frames — OMNI to conserve context',
      omniPrompt: 'Briefly describe what you see.',
      proPrompt: '',
    };
  }

  return {
    decision: 'both_parallel',
    reason: 'AUTO: Default — both models running in parallel',
    omniPrompt: 'Describe what you see and respond briefly.',
    proPrompt: 'Provide a thorough response. Reference the knowledge base.',
  };
}
