import { describe, it, expect, beforeEach } from 'vitest';
import { FocusAnchoringService } from '@application/services/knowledge/focus-anchoring.service';

describe('FocusAnchoringService', () => {
  let service: FocusAnchoringService;

  beforeEach(() => {
    service = new FocusAnchoringService();
  });

  it('should set topic anchor on first message', () => {
    service.updateTopic('¿Qué es el Artículo 15 de la Constitución Española?');
    const anchor = service.getCurrentAnchor();
    expect(anchor).not.toBeNull();
    expect(anchor!.keywords.length).toBeGreaterThan(0);
  });

  it('should reinforce topic on same-topic message', () => {
    service.updateTopic('Constitución Española Artículo 15 derechos fundamentales');
    const conf1 = service.getCurrentAnchor()!.confidence;
    service.updateTopic('Artículo 15 de la Constitución protección vida');
    const conf2 = service.getCurrentAnchor()!.confidence;
    expect(conf2).toBeGreaterThan(conf1);
  });

  it('should change topic on different message', () => {
    service.updateTopic('Constitución Española Artículo 15');
    const first = service.getCurrentAnchor()!.subTopic;
    service.updateTopic('Programación orientada a objetos herencia polimorfismo');
    const second = service.getCurrentAnchor()!.subTopic;
    expect(second).not.toBe(first);
  });

  it('should boost scores for topic-relevant documents', () => {
    service.updateTopic('Constitución Española Artículo 15 derechos fundamentales vida');
    const score = service.scoreResult(0.5, 'El artículo 15 de la Constitución Española reconoce el derecho a la vida');
    expect(score.boostedScore).toBeGreaterThan(score.originalScore);
    expect(score.boost).toBeGreaterThan(1.0);
  });

  it('should not boost scores for irrelevant documents', () => {
    service.updateTopic('Constitución Española Artículo 15');
    const score = service.scoreResult(0.5, 'Python programming language tutorial for beginners');
    expect(score.boostedScore).toBe(score.originalScore);
    expect(score.boost).toBe(1.0);
  });

  it('should decay topic confidence over time', () => {
    service.updateTopic('Constitución Española Artículo 15 derechos fundamentales vida');
    const initial = service.getCurrentAnchor()!.confidence;
    service.decay();
    service.decay();
    service.decay();
    const after = service.getCurrentAnchor()!.confidence;
    expect(after).toBeLessThan(initial);
  });

  it('should expire topic after enough decay', () => {
    service.updateTopic('test topic');
    for (let i = 0; i < 100; i++) service.decay();
    expect(service.getCurrentAnchor()).toBeNull();
  });

  it('should return correct score when no anchor', () => {
    const score = service.scoreResult(0.7, 'any document');
    expect(score.boostedScore).toBe(0.7);
    expect(score.boost).toBe(1.0);
  });
});
