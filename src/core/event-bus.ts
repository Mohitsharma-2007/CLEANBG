type EventCallback = (...args: any[]) => void;

class EventBus {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  on(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  off(event: string, callback: EventCallback): void {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event: string, ...args: any[]): void {
    this.listeners.get(event)?.forEach(cb => {
      try {
        cb(...args);
      } catch (e) {
        console.error(`Event handler error for "${event}":`, e);
      }
    });
  }

  once(event: string, callback: EventCallback): () => void {
    const wrapper = (...args: any[]) => {
      this.off(event, wrapper);
      callback(...args);
    };
    return this.on(event, wrapper);
  }

  removeAll(): void {
    this.listeners.clear();
  }
}

export const events = new EventBus();
export const eventBus = events;

