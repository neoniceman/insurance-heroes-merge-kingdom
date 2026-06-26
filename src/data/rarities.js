// 희귀도(Rarity) — 데이터 중심. 등급별 카드 테두리/반짝임/효과음/파티클이 달라집니다.
export const RARITIES = [
  { id: 'common',    name: 'Common',    color: '#9aa7b4', glow: '#d3dde6', boxRate: 60.0,  fx: 'none'   },
  { id: 'rare',      name: 'Rare',      color: '#3db6ff', glow: '#a6e3ff', boxRate: 25.0,  fx: 'shine'  },
  { id: 'epic',      name: 'Epic',      color: '#b164ff', glow: '#e4c1ff', boxRate: 10.0,  fx: 'shine'  },
  { id: 'legendary', name: 'Legendary', color: '#ffb020', glow: '#ffe6a0', boxRate: 4.0,   fx: 'boom'   },
  { id: 'mythic',    name: 'Mythic',    color: '#ff4d6d', glow: '#ffb3c4', boxRate: 0.9,   fx: 'boom'   },
  { id: 'infinity',  name: 'Infinity',  color: '#22e0c8', glow: '#bafff5', boxRate: 0.1,   fx: 'cosmic' },
];

export const RARITY_MAP = Object.fromEntries(RARITIES.map(r => [r.id, r]));

// 레벨 → 희귀도 자동 매핑 (라인 길이에 무관하게 동작).
export function rarityForLevel(level) {
  if (level >= 10) return 'infinity';
  if (level >= 9)  return 'mythic';
  if (level >= 7)  return 'legendary';
  if (level >= 5)  return 'epic';
  if (level >= 3)  return 'rare';
  return 'common';
}
