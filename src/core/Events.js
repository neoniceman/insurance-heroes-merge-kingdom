// 아주 가벼운 이벤트 버스 — 시스템 간 느슨한 결합.
export class EventBus {
  constructor() { this.map = new Map(); }
  on(evt, fn) {
    if (!this.map.has(evt)) this.map.set(evt, new Set());
    this.map.get(evt).add(fn);
    return () => this.off(evt, fn);
  }
  off(evt, fn) { this.map.get(evt)?.delete(fn); }
  emit(evt, payload) {
    const set = this.map.get(evt);
    if (set) for (const fn of set) fn(payload);
  }
}
export const bus = new EventBus();
