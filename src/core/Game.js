// 게임 오케스트레이터 — 상태/루프/저장/콤보/레벨 관리 + 보드·파티클 조율.
import { bus } from './Events.js';
import { audio } from './Audio.js';
import { Input } from './Input.js';
import { Particles } from '../systems/Particles.js';
import { Board } from '../systems/Board.js';
import { Quests } from '../systems/Quests.js';
import { getItem, itemCount } from '../data/items.js';
import { PRODUCERS } from '../data/producers.js';
import * as Storage from './Storage.js';

const COLS = 5, ROWS = 7;

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.bus = bus; this.audio = audio;
    this.particles = new Particles();
    this.board = new Board(COLS, ROWS, bus, this.particles, audio);
    this.quests = new Quests(bus);

    // 상태
    this.coins = 50; this.gems = 5; this.level = 1; this.exp = 0;
    this.stats = { merges: 0, produces: 0, boxes: 0, coinsTotal: 0 };
    this.discovered = new Set();
    this.sound = true; this.music = true;

    // 콤보
    this.combo = 0; this.comboTimer = 0; this.comboMax = 1.6;
    this.autoMerge = false; this.autoMergeTimer = 0;
    this.shake = 0; this.shakeX = 0; this.shakeY = 0;
    this.superFlash = 0;
    this.zoom = 0; this.zoomX = 0; this.zoomY = 0;
    this.ambient = this._initAmbient();

    // 레벨에 따라 성장하는 세계 — 배경이 마을 → 왕국 → 미래도시로 변화
    this._bgStages = [
      { min: 0,  src: 'assets/img/bg_town.webp' },
      { min: 5,  src: 'assets/img/bg_kingdom.webp' },
      { min: 13, src: 'assets/img/bg_city.webp' },
    ];
    this.bg = new Image();
    this._bgSrc = '';
    this._updateBg();
    this.input = new Input(canvas);
    this.input.on('down', (x, y) => { audio.resume(); this.board.onDown(x, y); });
    this.input.on('move', (x, y) => this.board.onMove(x, y));
    this.input.on('up',   (x, y) => this.board.onUp(x, y));

    this._wireEvents();
    this.last = performance.now();
    this.autosaveTimer = 0;
  }

  _wireEvents() {
    bus.on('merge', ({ item, x, y }) => this._onMerge(item, x, y));
    bus.on('produce', () => { this.stats.produces++; });
    bus.on('discover', (id) => this._onDiscover(id));
    bus.on('maxMerge', ({ item, x, y }) => this._superMerge(item, x, y));
    bus.on('mergePunch', ({ x, y, power, flash }) => {
      this.zoom = Math.max(this.zoom, power); this.zoomX = x; this.zoomY = y;
      if (flash) this.superFlash = Math.max(this.superFlash, flash);
    });
    bus.on('boardFull', () => this.particles.floatText(this.vw/2, this.vh*0.4, '보드가 가득 찼어요!', '#ff6b6b'));
  }

  _onDiscover(id) {
    if (this.discovered.has(id)) return;          // 이미 발견 → 무시
    this.discovered.add(id);
    bus.emit('collectionUpdated');
    const it = getItem(id);
    // 머지로 만든 새 아이템(레벨2+)은 "신규 발견!" 특별 연출 + 보상
    if (it && it.level >= 2 && this._started) {
      const reward = { coins: it.coins * 3, gems: it.level >= 7 ? 2 : 0 };
      this.addCoins(reward.coins, false);
      if (reward.gems) this.addGems(reward.gems);
      bus.emit('newDiscovery', { item: it, reward });
    }
  }

  // ---- 시작/저장 ----
  start() {
    const saved = Storage.load();
    if (saved) this._applySave(saved);
    else this._freshStart();
    // 막힘 방지: 생산기가 하나도 없으면 기본 생산기 복구(구버전 세이브 등)
    if (!this.board.entries.some(e => e.kind === 'producer')) {
      this.board.spawnProducer('desk');
      this.board.spawnProducer('garage');
    }
    this._updateBg(); // 저장된 레벨에 맞는 배경 적용
    this._started = true; // 이후의 발견부터 "신규 발견!" 연출 허용
    audio.setSound(this.sound); audio.setMusic(this.music);
    this.resize();
    requestAnimationFrame(this._frame.bind(this));
    // 오프라인 보상
    if (saved) {
      const r = Storage.offlineReward(saved.ts, this.level);
      if (r && r.coins > 0) {
        this.addCoins(r.coins, false);
        bus.emit('offlineReward', r);
      }
    }
    // 자동 저장
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.save(); });
    window.addEventListener('beforeunload', () => this.save());
  }
  _freshStart() {
    // 초기 생산기(미니 건물) + 시작 아이템 — 첫 화면부터 풍성하게
    this.board.spawnProducer('desk');
    this.board.spawnProducer('garage');
    this.board.spawnProducer('station');
    for (let i = 0; i < 4; i++) this.board.spawnItem('insurance_1', -1, false);
    for (let i = 0; i < 3; i++) this.board.spawnItem('car_1', -1, false);
    for (let i = 0; i < 2; i++) this.board.spawnItem('fire_1', -1, false);
    this.discovered.add('insurance_1'); this.discovered.add('car_1'); this.discovered.add('fire_1');
  }
  _applySave(s) {
    this.coins = s.coins ?? 50; this.gems = s.gems ?? 5;
    this.level = s.level ?? 1; this.exp = s.exp ?? 0;
    this.stats = { ...this.stats, ...(s.stats || {}) };
    this.sound = s.sound ?? true; this.music = s.music ?? true;
    (s.discovered || []).forEach(id => this.discovered.add(id));
    this.board.load(s.board || []);
    this.quests.load(s.quests);
  }
  save() { Storage.save(this); }
  reset() { Storage.wipe(); location.reload(); }

  // ---- 경제/성장 ----
  expForLevel(l) { return Math.floor(50 * Math.pow(l, 1.45)); }
  addCoins(n, fx = true) {
    this.coins += n; this.stats.coinsTotal += n;
    bus.emit('coinsEarned', n);
    if (fx) audio.coin();
  }
  addGems(n) { this.gems += n; }
  addExp(n) {
    this.exp += n;
    while (this.exp >= this.expForLevel(this.level)) {
      this.exp -= this.expForLevel(this.level);
      this.level++;
      audio.levelup();
      this.particles.floatText(this.canvas.width/2, this.canvas.height*0.35, `LEVEL ${this.level}!`, '#ffe07a');
      this.particles.ring(this.canvas.width/2, this.canvas.height*0.4, '#ffe07a', 28);
      this.gems += 1;
      this._updateBg();
      bus.emit('levelup', this.level);
    }
  }

  _onMerge(item, x, y) {
    this.stats.merges++;
    // 콤보
    this.combo = this.comboTimer > 0 ? this.combo + 1 : 1;
    this.comboTimer = this.comboMax;
    const mult = this.combo >= 2 ? this.combo : 1;
    const coins = item.coins * mult;
    this.addCoins(coins);
    this.addExp(item.exp);
    this.particles.coinPop(x, y, Math.min(14, 4 + item.level));
    this.particles.floatText(x, y - this.board.cell*0.5, `+${coins}`, '#ffd76a');
    if (this.combo >= 2) {
      audio.combo(this.combo);
      this.particles.floatText(x, y - this.board.cell*0.9, `COMBO x${this.combo}!`, '#ff7ad9');
      this.shake = Math.max(this.shake, Math.min(16, 6 + this.combo));
    }
    this.vibrate(item.level >= 5 ? 30 : 12);
  }
  _superMerge(item, x, y) {
    this.superFlash = 1;
    this.particles.ring(x, y, item.accent, 40);
    this.particles.burst(x, y, '#fff', 40, { speed: 520, size: 8 });
    this.particles.floatText(this.canvas.width/2, this.canvas.height*0.4, 'SUPER MERGE!!', '#fff');
    this.addGems(2);
    this.vibrate([20, 40, 20]);
  }

  vibrate(p) { if (this.sound && navigator.vibrate) try { navigator.vibrate(p); } catch {} }

  // 외부(UI)에서 호출
  buyProducer(producerId, cost) {
    if (this.gems < cost) { audio.error(); return false; }
    if (this.board.emptyCells().length === 0) { bus.emit('boardFull'); return false; }
    this.gems -= cost;
    this.board.spawnProducer(producerId);
    audio.shine();
    return true;
  }
  giveItem(itemId) {
    const e = this.board.spawnItem(itemId);
    if (e) { const it = getItem(itemId); this.particles.ring(e.px, e.py, it.accent, 18); }
    return !!e;
  }
  // 코인으로 사는 보급 상자 — 보석이 없어도 항상 새 아이템 확보(막힘 방지).
  supplyCost() { return 15 + this.level * 5; }
  openSupply() {
    const cost = this.supplyCost();
    if (this.coins < cost) { audio.error(); return { ok: false, reason: 'coins', cost }; }
    if (this.board.emptyCells().length === 0) { audio.error(); bus.emit('boardFull'); return { ok: false, reason: 'full', cost }; }
    this.coins -= cost;
    // 해금된 라인 중 랜덤, 대부분 Lv1·가끔 Lv2
    const themes = ['insurance', 'car', 'fire', 'health'];
    const th = themes[(Math.random() * themes.length) | 0];
    const lv = Math.random() < 0.8 ? 1 : 2;
    const id = `${th}_${lv}`;
    const e = this.board.spawnItem(id);
    if (e) { const it = getItem(id); this.particles.coinPop(e.px, e.py, 6); this.particles.ring(e.px, e.py, it.accent, 16); }
    audio.pop();
    return { ok: true, item: getItem(id), cost };
  }
  // 막힘 감지 — 합칠 게 없으면 안내, 완전히 막히면 긴급 무료 지급(영구 막힘 방지)
  _checkStuck(dt) {
    this._stuckTimer = (this._stuckTimer || 0) + dt;
    if (this._stuckTimer < 1) return;
    this._stuckTimer = 0;
    const hasMerge = !!this.board.findMergePair();
    const readyProducer = this.board.entries.some(e => e.kind === 'producer' && e.charges > 0);
    const canSupply = this.coins >= this.supplyCost();
    const hasEmpty = this.board.emptyCells().length > 0;
    // 생산기에 "탭!" 안내를 띄울지 — 합칠 게 없고 충전된 생산기가 있을 때
    this.board.hintProducers = !hasMerge && readyProducer;
    // 완전 막힘(머지·충전·코인 모두 없음)이면 긴급 무료 아이템
    if (!hasMerge && !readyProducer && !canSupply && hasEmpty) {
      this._stuckCount = (this._stuckCount || 0) + 1;
      if (this._stuckCount >= 3) {            // 3초 연속 막힘 확인 후 지급
        this._stuckCount = 0;
        const id = ['insurance_1', 'car_1', 'fire_1', 'health_1'][(Math.random() * 4) | 0];
        const e = this.board.spawnItem(id);
        if (e) { this.particles.ring(e.px, e.py, '#ffd76a', 20); this.particles.floatText(e.px, e.py - this.board.cell * 0.5, '긴급 보급!', '#ffd76a'); }
        bus.emit('emergencySupply', getItem(id));
      }
    } else this._stuckCount = 0;
  }

  claimQuest(id) {
    const r = this.quests.claim(id);
    if (!r) return false;
    if (r.coins) this.addCoins(r.coins);
    if (r.gems) this.addGems(r.gems);
    if (r.exp) this.addExp(r.exp);
    audio.levelup();
    return true;
  }

  // ---- 루프 ----
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (w === 0 || h === 0) { // 레이아웃 전(0px)이면 다음 프레임에 재시도
      requestAnimationFrame(() => this.resize());
      return;
    }
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.vw = w; this.vh = h;
    // 보드는 화면 전체 너비를 쓰고(좌우 작은 여백), 위로는 HUD, 아래로는 하단 바만 피한다.
    // → 사이드 버튼을 없앴으므로 보드가 가로·세로 공간을 꽉 채움.
    const safeTop = this._safe('top'), safeBottom = this._safe('bottom');
    const padX  = Math.max(6, w * 0.02);            // 좌우 작은 여백
    const topM  = 54 + safeTop;                     // 상단 HUD
    const botM  = 78 + safeBottom;                  // 하단 네비게이션 바
    this.board.layout(padX, topM, w - padX * 2, h - topM - botM);
  }
  // CSS env(safe-area-inset-*) 값을 px 로 읽기 (노치/홈바 대응)
  _safe(side) {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--safe-' + (side === 'top' ? 'top' : 'bot'));
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }

  _frame(now) {
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt > 0.05) dt = 0.05; // 탭 비활성 후 점프 방지

    // update
    this.board.update(dt);
    this.particles.update(dt);
    if (this.comboTimer > 0) { this.comboTimer -= dt; if (this.comboTimer <= 0) this.combo = 0; }
    this.shake = Math.max(this.shake, this.board.shake);
    this.board.shake = 0;
    if (this.shake > 0) {
      this.shakeX = (Math.random() - 0.5) * this.shake;
      this.shakeY = (Math.random() - 0.5) * this.shake;
      this.shake = Math.max(0, this.shake - dt * 40);
    } else { this.shakeX = this.shakeY = 0; }
    if (this.superFlash > 0) this.superFlash = Math.max(0, this.superFlash - dt * 2);
    if (this.zoom > 0) this.zoom = Math.max(0, this.zoom - dt * 0.25);
    this._updateAmbient(dt);
    this._checkStuck(dt);

    // 자동 머지 (해금 시)
    if (this.autoMerge) {
      this.autoMergeTimer += dt;
      if (this.autoMergeTimer > 1.1) { this.autoMergeTimer = 0; this.board.autoMergeOne(); }
    }

    this.autosaveTimer += dt;
    if (this.autosaveTimer > 5) { this.autosaveTimer = 0; this.save(); }

    this._draw();
    bus.emit('hud');
    requestAnimationFrame(this._frame.bind(this));
  }

  _draw() {
    const ctx = this.ctx, w = this.vw, h = this.vh;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(this.shakeX, this.shakeY);
    // 머지 줌 펀치 (머지 지점 중심으로 살짝 확대)
    if (this.zoom > 0.001) {
      const z = 1 + this.zoom;
      ctx.translate(this.zoomX, this.zoomY); ctx.scale(z, z); ctx.translate(-this.zoomX, -this.zoomY);
    }

    // 배경
    if (this.bg.complete && this.bg.naturalWidth) {
      this._coverImage(ctx, this.bg, w, h);
      ctx.fillStyle = 'rgba(20,28,46,0.38)'; ctx.fillRect(-40, -40, w+80, h+80);
    } else { ctx.fillStyle = '#1b2440'; ctx.fillRect(0,0,w,h); }

    this._drawAmbient(ctx, w, h);
    this.board.draw(ctx);
    this.particles.draw(ctx);

    if (this.superFlash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.superFlash * 0.4})`;
      ctx.fillRect(-40,-40,w+80,h+80);
    }
    ctx.restore();
  }

  // ===== 배경 생동감 (구름·새·빛 입자) =====
  // 현재 레벨에 맞는 배경 선택(성장감)
  _updateBg() {
    let stage = this._bgStages[0];
    for (const s of this._bgStages) if (this.level >= s.min) stage = s;
    if (stage.src !== this._bgSrc) {
      this._bgSrc = stage.src;
      const img = new Image();
      img.onload = () => { this.bg = img; bus.emit('worldGrew', stage); };
      img.src = stage.src;
    }
  }

  _initAmbient() {
    const clouds = [];
    for (let i = 0; i < 5; i++) clouds.push({ x: Math.random(), y: 0.05 + Math.random() * 0.35, s: 0.5 + Math.random() * 0.9, v: 0.004 + Math.random() * 0.006 });
    const motes = [];
    for (let i = 0; i < 18; i++) motes.push({ x: Math.random(), y: Math.random(), v: 0.01 + Math.random() * 0.02, ph: Math.random() * 6, r: 1 + Math.random() * 2 });
    const birds = [];
    return { clouds, motes, birds, t: 0, birdTimer: 2 };
  }
  _updateAmbient(dt) {
    const a = this.ambient; a.t += dt;
    for (const c of a.clouds) { c.x += c.v * dt; if (c.x > 1.3) c.x = -0.3; }
    for (const m of a.motes) { m.y -= m.v * dt; m.x += Math.sin(a.t + m.ph) * 0.0004; if (m.y < -0.02) { m.y = 1.02; m.x = Math.random(); } }
    a.birdTimer -= dt;
    if (a.birdTimer <= 0) { a.birdTimer = 7 + Math.random() * 9; a.birds.push({ x: -0.1, y: 0.05 + Math.random() * 0.16, v: 0.05 + Math.random() * 0.04, ph: Math.random() * 6 }); }
    for (let i = a.birds.length - 1; i >= 0; i--) { a.birds[i].x += a.birds[i].v * dt; if (a.birds[i].x > 1.2) a.birds.splice(i, 1); }
  }
  _drawAmbient(ctx, w, h) {
    const a = this.ambient;
    // 흐르는 구름
    ctx.save();
    for (const c of a.clouds) {
      const x = c.x * w, y = c.y * h, s = c.s * w * 0.16;
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.beginPath();
      ctx.ellipse(x, y, s, s * 0.6, 0, 0, Math.PI * 2);
      ctx.ellipse(x + s * 0.7, y + s * 0.1, s * 0.7, s * 0.45, 0, 0, Math.PI * 2);
      ctx.ellipse(x - s * 0.7, y + s * 0.12, s * 0.6, s * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // 떠오르는 빛 입자
    for (const m of a.motes) {
      ctx.globalAlpha = 0.25 + 0.25 * Math.sin(a.t * 2 + m.ph);
      ctx.fillStyle = '#fff7d0';
      ctx.beginPath(); ctx.arc(m.x * w, m.y * h, m.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // 날아가는 새 (작고 옅은 갈매기 실루엣, 상단 하늘에만)
    ctx.strokeStyle = 'rgba(70,84,110,0.4)'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    for (const b of a.birds) {
      const x = b.x * w, y = b.y * h, fl = Math.sin(a.t * 9 + b.ph) * 3;
      ctx.beginPath();
      ctx.moveTo(x - 6, y); ctx.quadraticCurveTo(x - 3, y - 4 - fl, x, y);
      ctx.quadraticCurveTo(x + 3, y - 4 - fl, x + 6, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  _coverImage(ctx, img, w, h) {
    const ir = img.naturalWidth / img.naturalHeight, cr = w / h;
    let dw, dh;
    if (ir > cr) { dh = h; dw = h * ir; } else { dw = w; dh = w / ir; }
    ctx.drawImage(img, (w - dw)/2, (h - dh)/2, dw, dh);
  }

  totalItems() { return itemCount(); }
}
