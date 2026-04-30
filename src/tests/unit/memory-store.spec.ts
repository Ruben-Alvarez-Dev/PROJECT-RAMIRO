import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryStore, type MemoryEntry } from '@application/services/memory/memory-store';

describe('MemoryStore', () => {
  let store: MemoryStore;

  const makeEntry = (name: string, overrides?: Partial<MemoryEntry>): MemoryEntry => ({
    name,
    description: `Test entry: ${name}`,
    type: 'user',
    content: `Content of ${name}`,
    scope: 'user',
    confidence: 1.0,
    source: 'user',
    created: new Date().toISOString(),
    ...overrides,
  });

  beforeEach(() => {
    store = new MemoryStore();
  });

  it('should save and load entries', async () => {
    await store.save(makeEntry('test_memory'));
    const loaded = await store.load('test_memory');
    expect(loaded).not.toBeNull();
    expect(loaded!.name).toBe('test_memory');
  });

  it('should search by keyword', async () => {
    await store.save(makeEntry('solid_principles', { content: 'SOLID stands for Single Responsibility, Open/Closed...' }));
    await store.save(makeEntry('react_hooks', { content: 'useState, useEffect, useCallback...' }));

    const results = await store.search('SOLID');
    expect(results.length).toBe(1);
    expect(results[0]!.name).toBe('solid_principles');
  });

  it('should not overwrite higher confidence', async () => {
    await store.save(makeEntry('high_conf', { confidence: 0.9 }));
    await store.save(makeEntry('high_conf', { confidence: 0.5, content: 'lower' }));

    const loaded = await store.load('high_conf');
    expect(loaded!.confidence).toBe(0.9);
  });

  it('should delete entries', async () => {
    await store.save(makeEntry('to_delete'));
    const deleted = await store.delete('to_delete');
    expect(deleted).toBe(true);
    const loaded = await store.load('to_delete');
    expect(loaded).toBeNull();
  });

  it('should list all entries', async () => {
    await store.save(makeEntry('a'));
    await store.save(makeEntry('b'));
    await store.save(makeEntry('c'));
    const index = await store.list();
    expect(index.totalEntries).toBe(3);
  });

  it('should generate index content', async () => {
    await store.save(makeEntry('memory_1', { description: 'First memory' }));
    const content = store.getIndexContent();
    expect(content).toContain('memory_1');
    expect(content).toContain('First memory');
  });
});
