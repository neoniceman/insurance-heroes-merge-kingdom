// 퀘스트/업적 — 데이터 중심. 초반부터 무엇을 할지 명확히 안내.
// type: make(특정 아이템 제작) | merge(머지 횟수) | produce(생산 횟수) | coins(누적 코인) | rarity(등급 제작)
export const TUTORIAL_QUESTS = [
  { id: 't_policy', type: 'make', meta: { item: 'insurance_2' }, goal: 1, reward: { coins: 120, exp: 20 },
    desc: '보험 신청서 2개를 합쳐 보험 증권 만들기' },
  { id: 't_binder', type: 'make', meta: { item: 'insurance_3' }, goal: 1, reward: { coins: 200, exp: 30 },
    desc: '보험 증권을 합쳐 보험 파일철 만들기' },
  { id: 't_toolbox', type: 'make', meta: { item: 'car_2' }, goal: 1, reward: { coins: 150, exp: 20 },
    desc: '타이어 2개를 합쳐 공구상자 만들기' },
  { id: 't_agent', type: 'make', meta: { item: 'insurance_5' }, goal: 1, reward: { coins: 400, gems: 2 },
    desc: '보험 상담사를 만들어 고객을 돕기' },
  { id: 't_branch', type: 'make', meta: { item: 'insurance_8' }, goal: 1, reward: { coins: 1500, gems: 5 },
    desc: '보험 지점을 완성해 보험마을 확장하기' },
];

export const DAILY_QUESTS = [
  { id: 'd_merge20',   type: 'merge',   goal: 20, reward: { coins: 200, gems: 1 }, desc: '20회 머지하기' },
  { id: 'd_produce15', type: 'produce', goal: 15, reward: { coins: 150 },          desc: '생산기 15회 사용' },
  { id: 'd_make_fire', type: 'make', meta: { item: 'fire_4' }, goal: 1, reward: { coins: 300, gems: 1 }, desc: '소방차 제작하기' },
];

export const ACHIEVEMENTS = [
  { id: 'a_merge100',  type: 'merge', goal: 100,  reward: { gems: 5 },  desc: '누적 100회 머지' },
  { id: 'a_merge1000', type: 'merge', goal: 1000, reward: { gems: 30 }, desc: '누적 1000회 머지' },
  { id: 'a_coins1m',   type: 'coins', goal: 1000000, reward: { gems: 50 }, desc: '누적 100만 코인' },
  { id: 'a_legend',    type: 'rarity', meta: { rarity: 'legendary' }, goal: 1, reward: { gems: 20 }, desc: 'Legendary 등급 제작' },
  { id: 'a_mythic',    type: 'rarity', meta: { rarity: 'mythic' },    goal: 1, reward: { gems: 60 }, desc: 'Mythic 등급 제작' },
  { id: 'a_infinity',  type: 'rarity', meta: { rarity: 'infinity' },  goal: 1, reward: { gems: 200 }, desc: 'Infinity 등급 제작' },
];
