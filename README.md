# 보험 히어로즈 : Merge Kingdom

HTML5 Canvas + 순수 JavaScript(ES Modules)로 만든 **데이터 중심 머지(Merge) 게임**.
모바일/PC 모두 지원하며, 코드 수정 없이 데이터(JSON/JS 배열)만 추가하면 아이템·생산기·테마·지역·퀘스트·이벤트가 무한 확장됩니다.

## 실행

빌드 과정이 없습니다. 정적 서버로 `index.html`만 열면 됩니다.

```bash
python3 -m http.server 5599
# http://localhost:5599 접속
```

> ES Modules를 쓰므로 `file://` 직접 열기는 안 되고 반드시 HTTP 서버가 필요합니다.

## 아키텍처

```
index.html              앱 셸 + 스플래시
css/style.css           반응형 UI 스타일
assets/img/             Replicate로 생성한 배경·보드·박스 이미지
src/
  main.js               엔트리 (게임+UI 초기화)
  core/
    Game.js             오케스트레이터: 상태/루프/저장/콤보/레벨
    Events.js           이벤트 버스 (시스템 간 느슨한 결합)
    Storage.js          LocalStorage 저장 + 오프라인 보상
    Audio.js            WebAudio 합성 효과음(POP/SHINE/BOOM/COSMIC) + BGM
    Input.js            마우스/터치 통합 포인터
    Pool.js             객체 풀링 (파티클 GC 최소화)
  systems/
    Board.js            그리드·드래그앤드롭 머지·생산기·자동머지·애니메이션
    ItemRenderer.js     절차적 Flat-Vector 타일 렌더(오프스크린 캐시)
    Particles.js        파티클(폭발/반짝임/코인) — 풀링
    Quests.js           퀘스트/업적 추적
    Loot.js             랜덤 박스 확률 추첨
  ui/
    UI.js               DOM HUD/패널(도감·퀘스트·상점·설정·이벤트)
  data/                 ★ 콘텐츠는 전부 여기 (코드 수정 불필요)
    themes.js           머지 체인(테마) 정의
    items.js            themes로부터 아이템 자동 생성
    producers.js        생산기 정의
    rarities.js         희귀도 + 레벨→희귀도 자동 매핑
    quests.js           매일 미션 / 업적
```

## 콘텐츠 확장 (코드 수정 없이 데이터만 추가)

### 새 테마/아이템 추가
`src/data/themes.js`의 `THEMES` 배열에 항목을 추가하면, 아이템·도감·희귀도·보상이 자동 생성됩니다.

```js
{
  id: 'pet', name: '반려동물', region: 'kingdom', accent: '#ff9ec4',
  chain: [
    ['🦴','사료'], ['🐶','강아지'], ['🏥','동물병원'], /* ... */
  ],
}
```
- 아이템 id = `${theme.id}_${레벨}` 자동 부여
- 희귀도는 레벨 기준 자동 매핑(`rarities.js`의 `rarityForLevel`)
- 코인/경험치/판매가는 레벨 기반으로 자동 산정 → 500~1000종까지 데이터만 늘리면 됨

### 새 생산기 추가
`src/data/producers.js`의 `PRODUCERS`에 추가 → 상점에 자동 노출, 보드 배치/충전/생산/머지 지원.

### 새 시즌 이벤트
`themes.js`에 `region`을 새 값(예: `'sakura'`)으로 둔 한정 테마를 추가하면 자동으로 한정 아이템 계열이 열립니다. (이벤트 노출 UI는 `ui/UI.js`의 `_renderEvents` 참고)

### 새 퀘스트/업적
`src/data/quests.js`에 `{ type, goal, reward, desc }`만 추가. 지원 type: `merge`, `produce`, `coins`, `reach`, `rarity`.

## 구현된 기능

- 드래그앤드롭 머지 (터치/마우스 통합), 생산기 탭 생산, 생산기 머지
- 희귀도 7단계(Common→Infinity) + 등급별 효과음/이펙트
- 콤보(빠른 연속 머지 시 코인 배수), SUPER MERGE 연출, 카메라 흔들림, 진동(Android)
- 레벨/경험치(레벨업 시 보석), 코인/보석 경제
- 도감(수집욕: 미발견은 ??? 표시), 매일 미션/업적 + 보상 수령
- 랜덤 박스(확률 추첨 + 오픈 연출), 자동머지 해금(Lv5)
- LocalStorage 자동 저장 + 오프라인 보상(최대 8시간)
- 사운드/음악 On·Off, 데이터 초기화
- 60FPS: 오프스크린 타일 캐시 + 파티클 객체 풀링 + dt 클램프

## 에셋 (Replicate)

`assets/img/`의 배경·보드·박스 이미지는 Replicate `black-forest-labs/flux-schnell`로 생성했습니다.
아이템 그래픽은 **이미지 파일 없이** 이모지 글리프 + 캔버스 절차적 렌더(Flat Vector)로 그려 수백 종도 즉시 표현하며 용량/로딩 부담이 없습니다.
효과음은 외부 음원 없이 WebAudio로 합성합니다.

새 이미지가 필요하면 `.env.local`의 `replicate_KEY`로 동일하게 생성해 `assets/img/`에 넣고 코드에서 참조하면 됩니다.
