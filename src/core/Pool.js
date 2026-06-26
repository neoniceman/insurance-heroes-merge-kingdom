// 객체 풀링 — 파티클 등 빈번히 생성/소멸하는 객체의 GC 부담을 줄임.
export class Pool {
  constructor(factory, reset, size = 256) {
    this.factory = factory;
    this.reset = reset;
    this.free = [];
    this.active = [];
    for (let i = 0; i < size; i++) this.free.push(factory());
  }
  obtain(...args) {
    const obj = this.free.pop() || this.factory();
    this.reset(obj, ...args);
    this.active.push(obj);
    return obj;
  }
  release(obj) {
    const i = this.active.indexOf(obj);
    if (i >= 0) { this.active.splice(i, 1); this.free.push(obj); }
  }
  // active 를 순회하며 dead 인 것들을 회수
  sweep(isDead) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const o = this.active[i];
      if (isDead(o)) { this.active.splice(i, 1); this.free.push(o); }
    }
  }
}
