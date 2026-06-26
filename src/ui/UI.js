// DOM 기반 UI — HUD(상단), 사이드/하단 버튼, 패널(도감/퀘스트/상점/설정).
// 캔버스(보드)는 게임 비주얼, DOM 은 선명한 반응형 UI 담당.
import { bus } from '../core/Events.js';
import { allItems, chainOf, getItem } from '../data/items.js';
import { THEMES } from '../data/themes.js';
import { PRODUCERS } from '../data/producers.js';
import { RARITY_MAP } from '../data/rarities.js';
import { getTile } from '../systems/ItemRenderer.js';
import { openBox } from '../systems/Loot.js';

const BOX_COST = 3; // 보석

export class UI {
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('ui');
    this._build();
    bus.on('hud', () => this._updateHUD());
    bus.on('collectionUpdated', () => { if (this._open === 'collection') this._renderCollection(); });
    bus.on('questUpdated', () => { if (this._open === 'quests') this._renderQuests(); this._refreshQuestBadge(); });
    bus.on('offlineReward', (r) => this._offlineModal(r));
    bus.on('levelup', () => this._toast('레벨 업! 보석 +1 💎'));
    bus.on('newDiscovery', ({ item, reward }) => this._discoveryModal(item, reward));
    bus.on('merge', ({ item, x, y }) => this._mergePop(item, x, y));
    bus.on('tapItem', (e) => this._nextHint(e));
    bus.on('emergencySupply', (item) => this._toast(`🆘 긴급 보급! ${item.name} 지급 (막힘 방지)`));
  }

  // 아이템 탭 → 다음 진화 미리보기(궁금증 유발)
  _nextHint(entry) {
    const it = getItem(entry.itemId);
    if (!it) return;
    const nextId = it.next;
    const el = this._el('div', 'next-hint');
    if (nextId) {
      const nx = getItem(nextId);
      const known = this.game.discovered.has(nextId);
      const cur = getTile(it, 64), nextTile = getTile(nx, 64, !known);
      el.appendChild(cur);
      el.appendChild(this._el('span', 'nh-arrow', '→'));
      el.appendChild(nextTile);
      el.appendChild(this._el('span', 'nh-name', known ? nx.name : '???'));
    } else {
      el.appendChild(this._el('span', 'nh-name', '🏆 최종 단계!'));
    }
    this.root.appendChild(el);
    // 화면 안으로 위치 보정 (가장자리에서 잘리지 않게)
    const stageW = this.root.clientWidth;
    const hw = el.offsetWidth / 2, hh = el.offsetHeight;
    let left = entry.px;
    left = Math.max(hw + 6, Math.min(stageW - hw - 6, left));
    const cell = this.game.board.cell;
    let top = entry.py - cell * 0.75;        // 기본: 아이템 위쪽
    el.classList.toggle('below', top - hh < 4);
    if (top - hh < 4) top = entry.py + cell * 0.75 + hh; // 위가 막히면 아래로
    el.style.left = left + 'px';
    el.style.top = top + 'px';
    setTimeout(() => el.remove(), 1600);
  }

  _mergePop(item, x, y) {
    const r = RARITY_MAP[item.rarity];
    const el = this._el('div', 'merge-pop');
    el.textContent = item.level >= 7 ? 'SUPER MERGE!' : 'MERGE!';
    el.style.cssText = `left:${x}px;top:${y - 40}px;--c:${r.glow};color:${item.level >= 5 ? r.color : '#fff'}`;
    this.root.appendChild(el);
    setTimeout(() => el.remove(), 720);
  }

  _el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  _build() {
    // ===== 상단 HUD =====
    const hud = this._el('div', 'hud');
    hud.innerHTML = `
      <div class="hud-left">
        <div class="stat coins"><span class="ic">🪙</span><span id="coins">0</span></div>
        <div class="stat gems"><span class="ic">💎</span><span id="gems">0</span></div>
      </div>
      <div class="hud-center">
        <div class="lv">Lv <span id="level">1</span></div>
        <div class="expbar"><div class="expfill" id="expfill"></div><span id="exptext"></span></div>
      </div>
      <div class="hud-right">
        <button class="ibtn" data-panel="settings" title="설정">⚙️</button>
      </div>`;
    this.root.appendChild(hud);

    // ===== 하단 통합 네비게이션 바 =====
    // (사이드 버튼이 보드를 가리지 않도록 모두 하단으로 모음 → 보드는 화면을 꽉 채움)
    const dock = this._el('div', 'dock');
    dock.innerHTML = `
      <button class="dbtn" data-panel="quests">📋<small>퀘스트</small><b class="badge" id="qbadge" hidden></b></button>
      <button class="dbtn" data-panel="collection">📚<small>도감</small></button>
      <button class="dbtn" data-panel="shop">🛒<small>상점</small></button>
      <button class="dbtn" data-panel="events">🎉<small>이벤트</small></button>
      <button class="dbtn" id="dock-auto">🤖<small>자동머지</small></button>
      <button class="dbtn highlight" id="dock-box">📦<small>보급</small><b class="price" id="supply-cost"></b></button>`;
    this.root.appendChild(dock);

    // ===== 패널 컨테이너 =====
    this.panel = this._el('div', 'panel-wrap');
    this.panel.hidden = true;
    this.panel.innerHTML = `<div class="panel"><button class="close">✕</button><div class="panel-body"></div></div>`;
    this.panel.querySelector('.close').onclick = () => this._closePanel();
    this.panel.onclick = (e) => { if (e.target === this.panel) this._closePanel(); };
    this.root.appendChild(this.panel);
    this.body = this.panel.querySelector('.panel-body');

    // ===== 토스트 =====
    this.toast = this._el('div', 'toast'); this.toast.hidden = true;
    this.root.appendChild(this.toast);

    // 버튼 바인딩
    this.root.querySelectorAll('[data-panel]').forEach(b =>
      b.onclick = () => { this.game.audio.click(); this._openPanel(b.dataset.panel); });
    dock.querySelector('#dock-box').onclick = () => { this.game.audio.click(); this._openSupply(); };
    dock.querySelector('#dock-auto').onclick = () => this._toggleAuto();
  }

  // ===== HUD =====
  _updateHUD() {
    const g = this.game;
    this._set('coins', this._fmt(g.coins));
    this._set('gems', this._fmt(g.gems));
    this._set('level', g.level);
    const need = g.expForLevel(g.level);
    const pct = Math.max(0, Math.min(100, (g.exp / need) * 100));
    const fill = document.getElementById('expfill'); if (fill) fill.style.width = pct + '%';
    this._set('exptext', `${g.exp} / ${need}`);
    const sc = document.getElementById('supply-cost');
    if (sc) { sc.textContent = '🪙' + g.supplyCost(); sc.classList.toggle('cant', g.coins < g.supplyCost()); }
    const db = document.getElementById('dock-box'); if (db) db.classList.toggle('affordable', g.coins >= g.supplyCost());
  }
  _refreshQuestBadge() {
    const n = this.game.quests.all().filter(q => q.done && !q.claimed).length;
    const b = document.getElementById('qbadge');
    if (b) { b.hidden = n === 0; b.textContent = n; }
  }
  _set(id, v) { const e = document.getElementById(id); if (e) e.textContent = v; }
  _fmt(n) {
    if (n >= 1e9) return (n/1e9).toFixed(1)+'B';
    if (n >= 1e6) return (n/1e6).toFixed(1)+'M';
    if (n >= 1e3) return (n/1e3).toFixed(1)+'K';
    return String(Math.floor(n));
  }

  // ===== 패널 =====
  _openPanel(name) {
    this._open = name;
    this.panel.hidden = false;
    if (name === 'collection') this._renderCollection();
    else if (name === 'quests') this._renderQuests();
    else if (name === 'shop') this._renderShop();
    else if (name === 'settings') this._renderSettings();
    else if (name === 'events') this._renderEvents();
  }
  _closePanel() { this.panel.hidden = true; this._open = null; this.game.audio.click(); }

  _renderCollection() {
    const g = this.game;
    const total = allItems().length;
    const found = [...g.discovered].length;
    let html = `<h2>📚 보험왕국 도감 <span class="muted">${found} / ${total}</span></h2>`;
    for (const theme of THEMES) {
      const ids = chainOf(theme.id);
      const owned = ids.filter(id => g.discovered.has(id)).length;
      const pct = Math.round((owned / ids.length) * 100);
      html += `<div class="coll-theme">
        <div class="coll-head"><b style="color:${theme.accent}">${theme.name}</b><span class="muted">${owned}/${ids.length}</span></div>
        <div class="coll-progress"><div class="coll-progress-fill" style="width:${pct}%;background:${theme.accent}"></div></div>
        <div class="coll-grid"></div></div>`;
    }
    this.body.innerHTML = html;
    // 캔버스 타일을 각 칸에 삽입 (이미지/실루엣)
    const grids = this.body.querySelectorAll('.coll-grid');
    THEMES.forEach((theme, ti) => {
      const grid = grids[ti];
      for (const id of chainOf(theme.id)) {
        const it = getItem(id);
        const has = g.discovered.has(id);
        const r = RARITY_MAP[it.rarity];
        const cell = this._el('div', 'coll-cell' + (has ? '' : ' locked'));
        cell.style.setProperty('--c', has ? r.color : 'rgba(255,255,255,.08)');
        const tile = getTile(it, 92, !has);
        tile.style.width = tile.style.height = '100%';
        const holder = this._el('div', 'coll-tile'); holder.appendChild(tile);
        cell.appendChild(holder);
        cell.appendChild(this._el('div', 'coll-name', has ? it.name : `??? Lv${it.level}`));
        if (has) cell.appendChild(this._el('div', 'coll-lv', r.name)).style.background = r.color;
        grid.appendChild(cell);
      }
    });
  }

  _renderQuests() {
    const g = this.game;
    const list = g.quests.all();
    const tut = list.filter(q => q.group === 'tutorial' && !q.claimed);
    const daily = list.filter(q => q.group === 'daily');
    const ach = list.filter(q => q.group === 'achievement');
    const row = (q) => {
      const pct = Math.min(100, (q.cur / q.goal) * 100);
      const btn = q.claimed ? `<span class="claimed">✓ 완료</span>`
        : q.done ? `<button class="claim" data-q="${q.id}">받기</button>`
        : `<span class="muted">${q.cur}/${q.goal}</span>`;
      const rw = [];
      if (q.reward.coins) rw.push(`🪙${q.reward.coins}`);
      if (q.reward.gems) rw.push(`💎${q.reward.gems}`);
      if (q.reward.exp) rw.push(`⭐${q.reward.exp}`);
      return `<div class="quest ${q.done?'done':''}">
        <div class="q-main"><div class="q-desc">${q.desc}</div>
        <div class="q-bar"><div class="q-fill" style="width:${pct}%"></div></div></div>
        <div class="q-side"><div class="q-reward">${rw.join(' ')}</div>${btn}</div></div>`;
    };
    this.body.innerHTML = `<h2>📋 퀘스트</h2>
      ${tut.length ? `<h3>🌱 시작 가이드</h3>${tut.map(row).join('')}` : ''}
      <h3>📅 매일 미션</h3>${daily.map(row).join('')}
      <h3>🏆 업적</h3>${ach.map(row).join('')}`;
    this.body.querySelectorAll('.claim').forEach(b =>
      b.onclick = () => { if (this.game.claimQuest(b.dataset.q)) { this._toast('보상 획득! 🎁'); this._renderQuests(); this._refreshQuestBadge(); } });
  }

  _renderShop() {
    let html = `<h2>🛒 상점</h2><h3>생산기 (보드에 추가)</h3><div class="shop-grid">`;
    PRODUCERS.forEach((p, i) => {
      const cost = 2 + i;
      html += `<div class="shop-item"><div class="shop-img"><img src="${p.img}" alt="" onerror="this.replaceWith(document.createTextNode('${p.glyph}'))"/></div>
        <div class="shop-name">${p.name}</div>
        <button class="buy" data-prod="${p.id}" data-cost="${cost}">💎 ${cost}</button></div>`;
    });
    html += `</div><h3>랜덤 박스</h3>
      <div class="box-promo">
        <img src="assets/img/box.webp" alt="box"/>
        <div><div class="box-text">희귀 아이템을 뽑아보세요!</div>
        <button class="buy big" id="buybox">🎁 박스 열기 — 💎 ${BOX_COST}</button></div>
      </div>`;
    this.body.innerHTML = html;
    this.body.querySelectorAll('.buy[data-prod]').forEach(b =>
      b.onclick = () => {
        const ok = this.game.buyProducer(b.dataset.prod, +b.dataset.cost);
        this._toast(ok ? '생산기를 배치했어요!' : '보석이 부족하거나 보드가 가득찼어요');
      });
    this.body.querySelector('#buybox').onclick = () => { this._closePanel(); this._openBox(); };
  }

  _renderEvents() {
    this.body.innerHTML = `<h2>🎉 이벤트</h2>
      <div class="event-card">
        <div class="ev-emoji">🌸</div>
        <div><b>시즌 이벤트 시스템</b>
        <p class="muted">벚꽃축제·여름·할로윈·크리스마스·설날 등 한정 테마가 데이터(themes.js)만 추가하면 자동으로 열립니다. 각 이벤트는 한정 아이템과 특별 맵을 제공합니다.</p></div>
      </div>
      <div class="event-card"><div class="ev-emoji">🗺️</div><div><b>지역 확장</b>
      <p class="muted">보험도시 → 해안도시 → 설산 → 우주 → 미래도시… 새 region 데이터를 추가하면 새 아이템 계열이 열립니다.</p></div></div>`;
  }

  _renderSettings() {
    const g = this.game;
    this.body.innerHTML = `<h2>⚙️ 설정</h2>
      <label class="toggle"><span>🔊 효과음</span><input type="checkbox" id="t-sound" ${g.sound?'checked':''}></label>
      <label class="toggle"><span>🎵 배경음악</span><input type="checkbox" id="t-music" ${g.music?'checked':''}></label>
      <div class="set-info">
        <div>총 머지: <b>${g.stats.merges}</b></div>
        <div>발견 아이템: <b>${[...g.discovered].length} / ${g.totalItems()}</b></div>
        <div>누적 코인: <b>${this._fmt(g.stats.coinsTotal)}</b></div>
      </div>
      <button class="danger" id="reset">데이터 초기화</button>
      <p class="muted small">자동 저장됩니다 · 오프라인 보상 지원</p>`;
    this.body.querySelector('#t-sound').onchange = (e) => { g.sound = e.target.checked; g.audio.setSound(g.sound); };
    this.body.querySelector('#t-music').onchange = (e) => { g.music = e.target.checked; g.audio.setMusic(g.music); };
    this.body.querySelector('#reset').onclick = () => { if (confirm('정말 초기화할까요? 모든 진행이 사라집니다.')) g.reset(); };
  }

  // ===== 박스 오픈 연출 =====
  _openBox() {
    const g = this.game;
    if (g.gems < BOX_COST) { this._toast('보석이 부족해요 (💎'+BOX_COST+')'); g.audio.error(); return; }
    g.gems -= BOX_COST; g.stats.boxes++;
    const { item, rarity } = openBox();
    const r = RARITY_MAP[rarity];
    g.audio.merge(r.fx);
    g.giveItem(item.id);

    const modal = this._el('div', 'modal');
    const tile = getTile(item, 200);
    modal.innerHTML = `<div class="modal-card reveal" style="--c:${r.color};--g:${r.glow}">
      <div class="reveal-rarity" style="color:${r.color}">${r.name}</div>
      <div class="reveal-tile"></div>
      <div class="reveal-name">${item.name}</div>
      <div class="reveal-sub muted">Lv ${item.level} · 보드에 추가됨</div>
      <button class="primary">확인</button></div>`;
    modal.querySelector('.reveal-tile').appendChild(tile);
    tile.style.width = tile.style.height = '160px';
    modal.querySelector('button').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    this.root.appendChild(modal);
  }

  // ===== 보급 (코인으로 새 아이템 — 막힘 방지) =====
  _openSupply() {
    const g = this.game;
    const res = g.openSupply();
    if (!res.ok) {
      if (res.reason === 'coins') this._toast(`코인이 부족해요 (🪙${res.cost})`);
      else this._toast('보드가 가득 찼어요! 먼저 합쳐서 칸을 비워주세요');
      return;
    }
    this._toast(`📦 보급 도착! ${res.item.name} (🪙${res.cost})`);
  }

  // ===== 신규 발견 연출 =====
  _discoveryModal(item, reward) {
    const r = RARITY_MAP[item.rarity];
    const modal = this._el('div', 'modal');
    const tile = getTile(item, 200);
    const rw = [];
    if (reward?.coins) rw.push(`🪙 ${reward.coins}`);
    if (reward?.gems) rw.push(`💎 ${reward.gems}`);
    modal.innerHTML = `<div class="modal-card reveal" style="--c:${r.color};--g:${r.glow}">
      <div class="discover-badge">✨ 신규 발견! ✨</div>
      <div class="reveal-rarity" style="color:${r.color}">${r.name}</div>
      <div class="reveal-tile"></div>
      <div class="reveal-name">${item.name}</div>
      <div class="reveal-desc">${item.desc || ''}</div>
      ${rw.length ? `<div class="discover-reward">${rw.join('  ')}</div>` : ''}
      <div class="reveal-sub muted">도감에 등록되었습니다</div>
      <button class="primary">좋아요!</button></div>`;
    modal.querySelector('.reveal-tile').appendChild(tile);
    tile.style.width = tile.style.height = '150px';
    const close = () => modal.remove();
    modal.querySelector('button').onclick = close;
    modal.onclick = (e) => { if (e.target === modal) close(); };
    this.root.appendChild(modal);
  }

  _toggleAuto() {
    const g = this.game;
    if (g.level < 5 && !g.autoMerge) {
      this._toast('자동머지는 레벨 5에 해금돼요!');
      g.audio.error(); return;
    }
    g.autoMerge = !g.autoMerge;
    document.getElementById('dock-auto').classList.toggle('active', g.autoMerge);
    this._toast(g.autoMerge ? '🤖 자동머지 ON' : '자동머지 OFF');
    g.audio.click();
  }

  _offlineModal(r) {
    const modal = this._el('div', 'modal');
    modal.innerHTML = `<div class="modal-card">
      <div class="off-emoji">💰</div>
      <h3>다시 오셨군요!</h3>
      <p>${r.minutes}분 동안 생산된 보상</p>
      <div class="off-reward">🪙 ${this._fmt(r.coins)}</div>
      <button class="primary">받기</button></div>`;
    modal.querySelector('button').onclick = () => { modal.remove(); this.game.audio.coin(); };
    this.root.appendChild(modal);
  }

  _toast(msg) {
    this.toast.textContent = msg;
    this.toast.hidden = false;
    this.toast.classList.remove('show'); void this.toast.offsetWidth;
    this.toast.classList.add('show');
    clearTimeout(this._tt);
    this._tt = setTimeout(() => { this.toast.hidden = true; }, 1800);
  }
}
