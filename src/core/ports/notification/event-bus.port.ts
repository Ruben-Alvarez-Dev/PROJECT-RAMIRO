// src/core/ports/notification/event-bus.port.ts

export interface DomainEvent {
  readonly type: string;
  readonly payload: Record<string, unknown>;
  readonly timestamp: Date;
}

export type EventHandler = (event: DomainEvent) => void | Promise<void>;

export interface Subscription {
  unsubscribe(): void;
}

export interface IEventBus {
  emit(event: DomainEvent): void;
  on(eventType: string, handler: EventHandler): Subscription;
  off(subscription: Subscription): void;
}
