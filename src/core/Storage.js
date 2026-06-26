// LocalStorage 저장 / 불러오기 + 오프라인 보상 계산.
const KEY = 'merge_kingdom_save_v1';

export function save(state) {
  try {
    const data = {
      v: 1,
      ts: Date.now(),
      coins: state.coins, gems: state.gems, level: state.level, exp: state.exp,
      board: state.board.serialize(),
      stats: state.stats,
      discovered: [...state.discovered],
      quests: state.quests.serialize(),
      sound: state.sound, music: state.music,
    };
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch (e) { console.warn('save failed', e); return false; }
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}

export function wipe() { localStorage.removeItem(KEY); }

// 오프라인 보상: 마지막 저장 이후 경과시간 기반(최대 8시간).
export function offlineReward(savedTs, level) {
  if (!savedTs) return null;
  const elapsedMs = Date.now() - savedTs;
  const capped = Math.min(elapsedMs, 8 * 3600 * 1000);
  const minutes = capped / 60000;
  if (minutes < 1) return null;
  const ratePerMin = 5 + level * 2;
  const coins = Math.floor(minutes * ratePerMin);
  return { coins, minutes: Math.floor(minutes) };
}
