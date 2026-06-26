// 랜덤 박스 — 희귀도 확률에 따라 등급을 뽑고, 해당 등급의 아이템 중 하나를 반환.
import { RARITIES } from '../data/rarities.js';
import { allItems } from '../data/items.js';

export function rollRarity() {
  const roll = Math.random() * 100;
  let acc = 0;
  for (const r of RARITIES) { acc += r.boxRate; if (roll <= acc) return r.id; }
  return 'common';
}

export function openBox() {
  const rarity = rollRarity();
  const pool = allItems().filter(it => it.rarity === rarity);
  // 해당 등급이 비면 한 단계 낮춰 fallback
  let chosen = pool[(Math.random() * pool.length) | 0];
  if (!chosen) {
    const any = allItems();
    chosen = any[(Math.random() * any.length) | 0];
  }
  return { item: chosen, rarity };
}
