# src/tests/unit/di-container.spec.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { DIContainer } from '@shared/di/container';

describe('DIContainer', () => {
  let container: DIContainer;

  beforeEach(() => {
    container = new DIContainer();
  });

  it('should register and resolve instances', () => {
    const instance = { name: 'test' };
    container.register('test', instance);

    expect(container.resolve('test')).toBe(instance);
  });

  it('should register and resolve factories as singletons', () => {
    let callCount = 0;
    container.registerFactory('factory', () => ({ count: ++callCount }));

    const first = container.resolve('factory');
    const second = container.resolve('factory');

    expect(first).toBe(second); // singleton
    expect(callCount).toBe(1);  // factory called once
  });

  it('should throw when resolving unregistered key', () => {
    expect(() => container.resolve('nonexistent')).toThrow('Service not registered: nonexistent');
  });

  it('should check if key is registered', () => {
    container.register('exists', { value: 1 });
    container.registerFactory('lazy', () => ({ value: 2 }));

    expect(container.has('exists')).toBe(true);
    expect(container.has('lazy')).toBe(true);
    expect(container.has('missing')).toBe(false);
  });

  it('should clear all registrations', () => {
    container.register('a', { value: 1 });
    container.register('b', { value: 2 });
    container.clear();

    expect(container.has('a')).toBe(false);
    expect(container.has('b')).toBe(false);
  });
});
