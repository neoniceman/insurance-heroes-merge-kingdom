// 생산기(미니 건물) 정의 — 데이터 중심.
// 탭하면 charges 소모해 해당 라인의 1~outputMaxLevel 아이템을 보드에 생성.
// anim: 렌더러가 그릴 살아있는 애니메이션 종류.
export const PRODUCERS = [
  { id: 'desk',    name: '보험 데스크', theme: 'insurance', glyph: '🖨️', img: 'assets/items/prod_desk.webp',
    cooldown: 5, maxCharges: 6, outputMaxLevel: 2, anim: 'printer', color: '#4f8cff' },
  { id: 'garage',  name: '정비소',     theme: 'car',       glyph: '🔧', img: 'assets/items/prod_garage.webp',
    cooldown: 6, maxCharges: 5, outputMaxLevel: 2, anim: 'car',     color: '#ff8a3d' },
  { id: 'station', name: '소방서',     theme: 'fire',      glyph: '🚒', img: 'assets/items/prod_station.webp',
    cooldown: 6, maxCharges: 5, outputMaxLevel: 2, anim: 'siren',   color: '#ff5a4d' },
  { id: 'clinic',  name: '병원',       theme: 'health',    glyph: '🏥', img: 'assets/items/prod_clinic.webp',
    cooldown: 6, maxCharges: 5, outputMaxLevel: 2, anim: 'pulse',   color: '#36d39a' },
];

export const PRODUCER_MAP = Object.fromEntries(PRODUCERS.map(p => [p.id, p]));
