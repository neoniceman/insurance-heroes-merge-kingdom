// 머지 라인(테마) 정의 — 보험왕국 세계관. 순수 데이터.
// 각 chain 원소: { name(한글), subj(일러스트 생성/표현용 영문 설명), glyph(폴백 이모지), desc(도감 설명) }
// 아이템 id = `${theme.id}_${level}`, 희귀도는 레벨로 자동 매핑.
// 이미지는 assets/items/<id>.webp (Replicate flux 로 생성, 흰 배경) — 없으면 glyph 폴백.

export const THEMES = [
  {
    id: 'insurance', name: '보험 라인', category: '보험', accent: '#4f8cff', ground: 'office',
    chain: [
      { name: '보험 신청서', glyph: '📝', subj: 'a cute insurance application paper form with a pencil', desc: '모든 보장의 시작. 고객의 첫 신청서.' },
      { name: '보험 증권', glyph: '📜', subj: 'a rolled insurance policy certificate scroll with a ribbon seal', desc: '보장을 약속하는 공식 증권.' },
      { name: '보험 파일철', glyph: '📂', subj: 'a chubby ring binder folder full of insurance documents', desc: '서류를 정리하는 든든한 파일철.' },
      { name: '보험 가방', glyph: '💼', subj: 'a cute rounded business briefcase bag', desc: '상담사의 필수품, 보험 가방.' },
      { name: '보험 상담사', glyph: '🧑‍💼', subj: 'a friendly cartoon insurance consultant character with a headset, upper body', desc: '고객을 돕는 친절한 상담사.' },
      { name: '보험 데스크', glyph: '🪑', subj: 'a cozy reception desk counter with a computer and a small plant', desc: '상담이 이루어지는 보험 데스크.' },
      { name: '보험 사무실', glyph: '🏢', subj: 'a small cute office room building with a sign', desc: '작지만 따뜻한 보험 사무실.' },
      { name: '보험 지점', glyph: '🏬', subj: 'a charming two story insurance branch office building', desc: '동네를 지키는 보험 지점.' },
      { name: '보험 본사', glyph: '🏛️', subj: 'a grand insurance headquarters tower building with flags', desc: '왕국을 총괄하는 보험 본사.' },
      { name: 'AI 보험센터', glyph: '🤖', subj: 'a futuristic glowing AI insurance center building with holograms', desc: '미래를 지키는 AI 보험센터.' },
      { name: '보험 도시', glyph: '🏙️', subj: 'a bright bustling insurance city with many buildings', desc: '보험이 지키는 빛나는 도시.' },
      { name: '보험 왕국', glyph: '👑', subj: 'a majestic insurance kingdom castle with golden crown', desc: '모두가 보장받는 보험 왕국.' },
      { name: '보험 행성', glyph: '🪐', subj: 'a small cute planet shaped like a shield with rings', desc: '보장이 감싸는 보험 행성.' },
      { name: '보험 우주', glyph: '🌌', subj: 'a cute galaxy nebula shaped like a protective shield', desc: '끝없이 펼쳐진 보험 우주.' },
      { name: '보험 멀티버스', glyph: '🌠', subj: 'a dazzling multiverse portal of glowing shields and stars', desc: '모든 차원을 지키는 보험 멀티버스.' },
    ],
  },
  {
    id: 'car', name: '자동차 위험 라인', category: '자동차', accent: '#ff8a3d', ground: 'road',
    chain: [
      { name: '타이어', glyph: '🛞', subj: 'a single cute black car tire', desc: '굴러가는 모든 것의 시작.' },
      { name: '공구상자', glyph: '🧰', subj: 'a red toolbox with tools', desc: '무엇이든 고치는 공구상자.' },
      { name: '정비 키트', glyph: '🔧', subj: 'a car maintenance kit with wrench and oil can', desc: '정비사의 손길, 정비 키트.' },
      { name: '자동차', glyph: '🚗', subj: 'a cute rounded cartoon car', desc: '보험으로 지키는 소중한 차.' },
      { name: '긴급출동차', glyph: '🚙', subj: 'a cute emergency roadside assistance van with a beacon light', desc: '위기에 달려오는 긴급출동차.' },
      { name: '견인차', glyph: '🚛', subj: 'a cute tow truck carrying a small car', desc: '사고 차량을 옮기는 견인차.' },
      { name: '스마트 구조차', glyph: '🚐', subj: 'a futuristic smart rescue vehicle with sensors and lights', desc: '센서로 위험을 감지하는 구조차.' },
      { name: 'AI 모빌리티 센터', glyph: '🛰️', subj: 'a futuristic AI mobility control center building with screens', desc: '도로를 총괄하는 AI 센터.' },
    ],
  },
  {
    id: 'fire', name: '화재 위험 라인', category: '화재', accent: '#ff5a4d', ground: 'tile',
    chain: [
      { name: '작은 소화기', glyph: '🧯', subj: 'a small cute red fire extinguisher', desc: '첫 불씨를 막는 소화기.' },
      { name: '소방호스', glyph: '🚿', subj: 'a coiled fire hose with a nozzle', desc: '강한 물줄기, 소방호스.' },
      { name: '방화복', glyph: '🧥', subj: 'a firefighter protective suit with helmet', desc: '불길을 견디는 방화복.' },
      { name: '소방차', glyph: '🚒', subj: 'a cute red fire truck with a ladder', desc: '사이렌을 울리는 소방차.' },
      { name: '소방서', glyph: '🏚️', subj: 'a cute fire station building with a red door', desc: '영웅들이 모이는 소방서.' },
      { name: '드론 소방대', glyph: '🚁', subj: 'a firefighting drone squad with water tanks', desc: '하늘에서 진압하는 드론 소방대.' },
      { name: 'AI 화재관제센터', glyph: '🛎️', subj: 'a futuristic AI fire control center building with fire monitor screens', desc: '도시의 불을 지켜보는 AI 관제센터.' },
    ],
  },
  {
    id: 'health', name: '건강 보장 라인', category: '건강', accent: '#36d39a', ground: 'grass',
    chain: [
      { name: '비타민', glyph: '💊', subj: 'a cute bottle of vitamin pills', desc: '건강의 작은 시작, 비타민.' },
      { name: '약상자', glyph: '🧴', subj: 'a cute medicine box with a red cross', desc: '필요할 때 꺼내는 약상자.' },
      { name: '응급키트', glyph: '🩹', subj: 'a first aid emergency kit with a red cross', desc: '응급 상황의 든든함, 응급키트.' },
      { name: '간호사', glyph: '👩‍⚕️', subj: 'a friendly cartoon nurse character with a cap, upper body', desc: '환자를 돌보는 따뜻한 간호사.' },
      { name: '의사', glyph: '🧑‍⚕️', subj: 'a friendly cartoon doctor character with a stethoscope, upper body', desc: '생명을 지키는 의사.' },
      { name: '병원', glyph: '🏥', subj: 'a cute hospital building with a red cross sign', desc: '모두를 돌보는 병원.' },
      { name: 'AI 헬스케어센터', glyph: '🧬', subj: 'a futuristic AI healthcare center building with DNA hologram', desc: '미래 의료, AI 헬스케어센터.' },
    ],
  },
];

export const THEME_MAP = Object.fromEntries(THEMES.map(t => [t.id, t]));
