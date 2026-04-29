// src/application/services/video/model-router.ts
// Defines when to use OMNI vs PRO models for optimal response quality.
//
// Strategy based on MiMo architecture docs:
// - OMNI (mimo-v2-omni / mimo-v2.5-omni): Realtime visual understanding.
//   Fast, low latency. Best for: frame description, object detection,
//   scene understanding, voice-to-voice. Has native audio+vision input.
// - PRO (mimo-v2.5-pro): Deep reasoning. Structured analysis. Best for:
//   summarization, comparison, exam-style Q&A, complex explanations.
//
// Rule: For realtime video, OMNI processes every frame (speed).
//       PRO processes selected frames or upon request (depth).
//       Both always run in parallel. Orchestrator merges.

import type { SampledFrame } from './frame-sampler';
import type { DualProcessResult } from './dual-model-processor';
import { Logger } from '@shared/logging/logger';

export type RouteDecision = 'omni_only' | 'pro_only' | 'both_parallel' | 'both_sequential';

export interface RoutingContext {
  readonly hasVideo: boolean;
  readonly hasAudio: boolean;
  readonly userRequestedDepth: boolean;
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
  // Rule 1: Greeting phase → OMNI only (fast, light)
  if (ctx.conversationPhase === 'greeting') {
    return {
      decision: 'omni_only',
      reason: 'Greeting phase — fast acknowledgement via OMNI',
      omniPrompt: 'Respond briefly to the user. Be warm and direct.',
      proPrompt: '',
    };
  }

  // Rule 2: User explicitly asked for depth → PRO primary
  if (ctx.userRequestedDepth) {
    return {
      decision: 'both_parallel',
      reason: 'User requested detailed analysis — both models, PRO primary merge',
      omniPrompt: 'Describe what you see concisely.',
      proPrompt: 'Provide a detailed, structured analysis. Include sources if available.',
    };
  }

  // Rule 3: Complex frames → both parallel (OMNI describes, PRO analyzes)
  if (ctx.frameComplexity === 'complex') {
    return {
      decision: 'both_parallel',
      reason: 'Complex visual content — both models for comprehensive response',
      omniPrompt: 'Describe every element you see in this frame.',
      proPrompt: 'Analyze the visual content in depth. What is the user looking at? What are the key details?',
    };
  }

  // Rule 4: Teaching phase with video → both (OMNI describes, PRO explains)
  if (ctx.conversationPhase === 'teaching' && ctx.hasVideo) {
    return {
      decision: 'both_parallel',
      reason: 'Teaching session with visual — both models for description + explanation',
      omniPrompt: 'Describe the visual content briefly.',
      proPrompt: 'Explain what the user is seeing in the context of the study topic. Be pedagogical.',
    };
  }

  // Rule 5: Long session (>30 min) with simple frames → OMNI only (save tokens)
  if (ctx.sessionDurationMs > 1_800_000 && ctx.frameComplexity === 'simple') {
    return {
      decision: 'omni_only',
      reason: 'Long session, simple frames — OMNI only to conserve context',
      omniPrompt: 'Briefly describe what you see.',
      proPrompt: '',
    };
  }

  // Rule 6: Audio-only (no video) → PRO only (text reasoning)
  if (!ctx.hasVideo && ctx.hasAudio) {
    return {
      decision: 'pro_only',
      reason: 'Audio-only session — PRO for text reasoning',
      omniPrompt: '',
      proPrompt: 'Respond to the user conversationally. Use the knowledge base for accuracy.',
    };
  }

  // Default: both parallel
  return {
    decision: 'both_parallel',
    reason: 'Default: both models running in parallel',
    omniPrompt: 'Describe what you see and respond briefly.',
    proPrompt: 'Provide a thorough response. Reference the knowledge base.',
  };
}
