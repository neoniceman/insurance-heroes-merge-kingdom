// 퀘스트/업적 추적 — 이벤트 버스 구독으로 진행도 갱신.
import { TUTORIAL_QUESTS, DAILY_QUESTS, ACHIEVEMENTS } from '../data/quests.js';

export class Quests {
  constructor(bus) {
    this.bus = bus;
    this.progress = {};   // questId -> number
    this.claimed = {};    // questId -> bool
    this._init();
    bus.on('merge', ({ item }) => {
      this._bump('merge', 1);
      this._makeCheck(item.id);
      this._rarityCheck(item.rarity);
    });
    bus.on('produce', ({ item }) => { this._bump('produce', 1); if (item) this._makeCheck(item.id); });
    bus.on('coinsEarned', (n) => this._bump('coins', n));
  }
  _defs() { return [...TUTORIAL_QUESTS, ...DAILY_QUESTS, ...ACHIEVEMENTS]; }
  _init() { for (const q of this._defs()) if (this.progress[q.id] == null) this.progress[q.id] = 0; }

  all() {
    return this._defs().map(q => ({
      ...q,
      cur: Math.min(this.progress[q.id] || 0, q.goal),
      done: (this.progress[q.id] || 0) >= q.goal,
      claimed: !!this.claimed[q.id],
      group: TUTORIAL_QUESTS.includes(q) ? 'tutorial' : DAILY_QUESTS.includes(q) ? 'daily' : 'achievement',
    }));
  }

  _bump(type, n) {
    for (const q of this._defs()) {
      if (q.type === type && !this.claimed[q.id]) this.progress[q.id] = (this.progress[q.id] || 0) + n;
    }
    this.bus.emit('questUpdated');
  }
  _makeCheck(itemId) {
    for (const q of this._defs()) {
      if (q.type === 'make' && !this.claimed[q.id] && q.meta?.item === itemId) {
        this.progress[q.id] = (this.progress[q.id] || 0) + 1;
      }
    }
    this.bus.emit('questUpdated');
  }
  _rarityCheck(rarity) {
    const order = ['common','rare','epic','legendary','mythic','infinity'];
    for (const q of this._defs()) {
      if (q.type === 'rarity' && !this.claimed[q.id] && order.indexOf(rarity) >= order.indexOf(q.meta.rarity))
        this.progress[q.id] = q.goal;
    }
  }
  canClaim(id) {
    const q = this._defs().find(x => x.id === id);
    return q && (this.progress[id] || 0) >= q.goal && !this.claimed[id];
  }
  claim(id) {
    if (!this.canClaim(id)) return null;
    this.claimed[id] = true;
    this.bus.emit('questUpdated');
    return this._defs().find(x => x.id === id).reward;
  }
  resetDaily() { for (const q of DAILY_QUESTS) { this.progress[q.id] = 0; this.claimed[q.id] = false; } }
  serialize() { return { progress: this.progress, claimed: this.claimed }; }
  load(d) { if (!d) return; this.progress = { ...this.progress, ...d.progress }; this.claimed = d.claimed || {}; }
}
