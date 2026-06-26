// 아이템 레지스트리 — themes.js 로부터 자동 생성.
// 코드 수정 없이 themes.js 데이터만 추가하면 아이템이 늘어납니다.
import { THEMES } from './themes.js';
import { rarityForLevel } from './rarities.js';

const ITEMS = {};       // id -> item def
const CHAINS = {};      // themeId -> [itemId...]

for (const theme of THEMES) {
  const ids = [];
  theme.chain.forEach((entry, i) => {
    const level = i + 1;
    const id = `${theme.id}_${level}`;
    const def = {
      id, theme: theme.id, level,
      name: entry.name, glyph: entry.glyph, subj: entry.subj, desc: entry.desc || '',
      img: `assets/items/${id}.webp`,
      accent: theme.accent, category: theme.category, region: theme.id,
      rarity: rarityForLevel(level),
      next: i < theme.chain.length - 1 ? `${theme.id}_${level + 1}` : null,
      isMax: i === theme.chain.length - 1,
      coins: Math.round(3 * Math.pow(1.95, level - 1)),
      exp:   Math.round(2 * Math.pow(1.7, level - 1)),
      sellValue: Math.round(1 * Math.pow(1.8, level - 1)),
    };
    ITEMS[id] = def;
    ids.push(id);
  });
  CHAINS[theme.id] = ids;
}

export function getItem(id) { return ITEMS[id]; }
export function allItems() { return Object.values(ITEMS); }
export function chainOf(themeId) { return CHAINS[themeId] || []; }
export function itemCount() { return Object.keys(ITEMS).length; }
export { ITEMS, CHAINS };
