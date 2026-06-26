// 머지 보드 — 그리드, 드래그앤드롭 머지, 생산기, 애니메이션.
import { getItem } from '../data/items.js';
import { PRODUCER_MAP } from '../data/producers.js';
import { getTile, img, imgReady } from './ItemRenderer.js';
import { RARITY_MAP } from '../data/rarities.js';

let UID = 1;

export class Board {
  constructor(cols, rows, bus, particles, audio) {
    this.cols = cols; this.rows = rows;
    this.bus = bus; this.particles = particles; this.audio = audio;
    this.cells = new Array(cols * rows).fill(null); // cell index -> entry|null
    this.entries = [];
    // layout rect (set by resize)
    this.bx = 0; this.by = 0; this.cell = 64; this.gap = 6;
    this.drag = null;       // {entry, ox, oy, fromCell, moved}
    this.shake = 0;
  }

  idx(c, r) { return r * this.cols + c; }
  inBounds(c, r) { return c >= 0 && c < this.cols && r >= 0 && r < this.rows; }

  layout(x, y, w, h) {
    const cw = w / this.cols, ch = h / this.rows;
    this.cell = Math.floor(Math.min(cw, ch));
    const gridW = this.cell * this.cols, gridH = this.cell * this.rows;
    this.bx = x + (w - gridW) / 2;
    this.by = y + (h - gridH) / 2;
    this.gap = this.cell * 0.05;
    for (const e of this.entries) {
      if (e !== this.drag?.entry) { const p = this.cellCenter(e.cell); e.px = p.x; e.py = p.y; }
    }
  }
  cellCenter(cell) {
    const c = cell % this.cols, r = Math.floor(cell / this.cols);
    return { x: this.bx + c * this.cell + this.cell / 2, y: this.by + r * this.cell + this.cell / 2 };
  }
  cellAt(x, y) {
    const c = Math.floor((x - this.bx) / this.cell);
    const r = Math.floor((y - this.by) / this.cell);
    if (!this.inBounds(c, r)) return -1;
    return this.idx(c, r);
  }
  emptyCells() {
    const out = [];
    for (let i = 0; i < this.cells.length; i++) if (!this.cells[i]) out.push(i);
    return out;
  }
  randomEmpty() {
    const e = this.emptyCells();
    return e.length ? e[(Math.random() * e.length) | 0] : -1;
  }

  // ---- 엔트리 생성 ----
  _newEntry(kind, refId, cell) {
    const p = this.cellCenter(cell);
    const e = {
      uid: UID++, kind, cell,
      itemId: kind === 'item' ? refId : null,
      producerId: kind === 'producer' ? refId : null,
      px: p.x, py: p.y, scale: 0.1, born: performance.now(),
      charges: 0, timer: 0,
      phase: Math.random() * Math.PI * 2,  // idle 둥둥 위상
      pulse: 0,                            // 생산 시 튀는 효과
    };
    if (kind === 'producer') {
      const def = PRODUCER_MAP[refId];
      e.charges = def.maxCharges; e.timer = 0;
    }
    this.cells[cell] = e; this.entries.push(e);
    return e;
  }

  spawnItem(itemId, cell = -1, fx = true) {
    if (cell < 0) cell = this.randomEmpty();
    if (cell < 0) { this.bus.emit('boardFull'); return null; }
    const e = this._newEntry('item', itemId, cell);
    if (fx) {
      const it = getItem(itemId);
      this.particles.burst(e.px, e.py, RARITY_MAP[it.rarity].glow, 6, { speed: 120, size: 4 });
    }
    this.bus.emit('discover', itemId);
    return e;
  }
  spawnProducer(producerId, cell = -1) {
    if (cell < 0) cell = this.randomEmpty();
    if (cell < 0) return null;
    return this._newEntry('producer', producerId, cell);
  }

  removeEntry(e) {
    const i = this.entries.indexOf(e);
    if (i >= 0) this.entries.splice(i, 1);
    if (this.cells[e.cell] === e) this.cells[e.cell] = null;
  }

  // ---- 입력 ----
  onDown(x, y) {
    const cell = this.cellAt(x, y);
    if (cell < 0) return;
    const e = this.cells[cell];
    if (!e) return;
    this.drag = { entry: e, ox: e.px - x, oy: e.py - y, fromCell: cell, moved: false, sx: x, sy: y };
  }
  onMove(x, y) {
    if (!this.drag) return;
    const d = this.drag;
    d.entry.px = x + d.ox; d.entry.py = y + d.oy;
    if (Math.hypot(x - d.sx, y - d.sy) > this.cell * 0.18) d.moved = true;
  }
  onUp(x, y) {
    if (!this.drag) return;
    const d = this.drag, e = d.entry;
    this.drag = null;

    // 탭(이동 거의 없음): 생산기면 생산
    if (!d.moved) {
      if (e.kind === 'producer') { this.produce(e); }
      else { this.bus.emit('tapItem', e); }
      const p = this.cellCenter(e.cell); e.px = p.x; e.py = p.y;
      return;
    }

    const target = this.cellAt(x, y);
    if (target < 0) { this._snapBack(e); return; }
    const other = this.cells[target];

    if (other && other !== e) {
      // 머지 시도
      if (this._canMerge(e, other)) { this._doMerge(e, other, target); return; }
      // 머지 불가 → 자리 교환
      this._swap(e, other);
      return;
    }
    // 빈 칸으로 이동
    this.cells[d.fromCell] = null;
    this.cells[target] = e;
    e.cell = target;
    const p = this.cellCenter(target); // px,py lerp 처리됨
    this.audio.click();
  }

  // 자동 머지용: 머지 가능한 동일 아이템 페어 한 쌍 찾기
  findMergePair() {
    const byItem = {};
    for (const e of this.entries) {
      if (e.kind !== 'item') continue;
      if (!getItem(e.itemId).next) continue;
      (byItem[e.itemId] ||= []).push(e);
      if (byItem[e.itemId].length === 2) return byItem[e.itemId];
    }
    return null;
  }
  autoMergeOne() {
    const pair = this.findMergePair();
    if (!pair) return false;
    const [a, b] = pair;
    this._doMerge(a, b, b.cell);
    return true;
  }

  _snapBack(e) { /* lerp 가 알아서 원위치로 */ }
  _swap(a, b) {
    const ca = a.cell, cb = b.cell;
    this.cells[ca] = b; this.cells[cb] = a;
    a.cell = cb; b.cell = ca;
  }

  _canMerge(a, b) {
    if (a.kind !== b.kind) return false;
    if (a.kind === 'item') return a.itemId === b.itemId && getItem(a.itemId).next;
    if (a.kind === 'producer') return a.producerId === b.producerId;
    return false;
  }
  _doMerge(a, b, targetCell) {
    if (a.kind === 'item') {
      const cur = getItem(a.itemId);
      const nextId = cur.next;
      const ax = a.px, ay = a.py, bx2 = b.px, by2 = b.py;
      this.removeEntry(a); this.removeEntry(b);
      const ne = this._newEntry('item', nextId, targetCell);
      ne.scale = 0.05; ne.born = performance.now();
      ne.spin = Math.PI * 1.5;            // 회전하며 등장
      const nit = getItem(nextId);
      const rar = RARITY_MAP[nit.rarity];
      const cx = ne.px, cy = ne.py;
      const rank = ['common','rare','epic','legendary','mythic','infinity'].indexOf(nit.rarity);
      // 두 아이템이 빨려 들어오는 듯한 수렴 파티클
      this.particles.absorb?.(ax, ay, cx, cy, rar.color);
      this.particles.absorb?.(bx2, by2, cx, cy, rar.color);
      // 별/폭발/링 — 등급이 높을수록 화려
      this.particles.ring(cx, cy, rar.glow, 22 + rank * 8);
      this.particles.burst(cx, cy, rar.color, 20 + rank * 12, { speed: 340 + rank * 80, size: 6 + rank, shape: rank >= 1 ? 'spark' : 'circle' });
      if (rank >= 1) this.particles.starBurst?.(cx, cy, rar.glow, 8 + rank * 4);
      this.shake = Math.min(20, 5 + nit.level + rank * 2);
      this.audio.merge(rar.fx);
      // 화면 줌 펀치 + (Legendary+) 전체 플래시
      this.bus.emit('mergePunch', { x: cx, y: cy, power: 0.04 + rank * 0.02, flash: rank >= 3 ? 0.5 + rank * 0.1 : 0 });
      this.bus.emit('merge', { item: nit, x: cx, y: cy });
      this.bus.emit('discover', nextId);
      if (nit.isMax) this.bus.emit('maxMerge', { item: nit, x: cx, y: cy });
    } else {
      // 생산기 머지 → charges/maxCharges 강화(간단히 즉시 충전)
      this.removeEntry(b);
      a.cell = targetCell; this.cells[targetCell] = a;
      a.charges = PRODUCER_MAP[a.producerId].maxCharges;
      this.audio.shine();
      this.particles.ring(a.px, a.py, '#9fe0ff', 16);
      this.bus.emit('mergeProducer', { producer: a });
    }
  }

  produce(e) {
    const def = PRODUCER_MAP[e.producerId];
    if (e.charges <= 0) { this.audio.error(); this.particles.floatText(e.px, e.py - this.cell*0.4, '충전중…', '#ffd76a'); return; }
    if (this.emptyCells().length === 0) { this.audio.error(); this.bus.emit('boardFull'); return; }
    e.charges--;
    const maxLv = def.outputMaxLevel;
    const lv = 1 + ((Math.random() < 0.78) ? 0 : (1 + ((Math.random() * maxLv) | 0)) % maxLv);
    const itemId = `${def.theme}_${Math.min(lv, maxLv)}`;
    const e2 = this.spawnItem(itemId, -1, true);
    e.pulse = 1; // 생산기 튀는 효과
    this.audio.pop();
    this.bus.emit('produce', { producer: e, item: getItem(itemId) });
  }

  update(dt) {
    const now = performance.now();
    // 생산기 충전
    for (const e of this.entries) {
      if (e.kind === 'producer') {
        const def = PRODUCER_MAP[e.producerId];
        if (e.charges < def.maxCharges) {
          e.timer += dt;
          if (e.timer >= def.cooldown) { e.timer = 0; e.charges++; }
        } else e.timer = 0;
      }
      // 위치 lerp (드래그 중 제외)
      if (this.drag?.entry !== e) {
        const p = this.cellCenter(e.cell);
        e.px += (p.x - e.px) * Math.min(1, dt * 16);
        e.py += (p.y - e.py) * Math.min(1, dt * 16);
      }
      // 등장 스케일 애니메이션
      const age = (now - e.born) / 1000;
      const target = (this.drag?.entry === e) ? 1.12 : 1;
      const pop = age < 0.3 ? 1 + Math.sin(Math.min(1, age/0.3) * Math.PI) * 0.25 : 1;
      e.scale += (target * pop - e.scale) * Math.min(1, dt * 18);
      if (e.pulse > 0) e.pulse = Math.max(0, e.pulse - dt * 3);
      if (e.spin) { e.spin *= (1 - Math.min(1, dt * 10)); if (Math.abs(e.spin) < 0.01) e.spin = 0; }
    }
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 40);
  }

  draw(ctx) {
    const t = performance.now() / 1000;
    // ── 보험 캠퍼스 바닥 (회색 격자 대신 따뜻한 잔디/타일 플랫폼) ──
    const gx = this.bx - this.gap, gy = this.by - this.gap;
    const gw = this.cell * this.cols + this.gap * 2, gh = this.cell * this.rows + this.gap * 2;
    const pr = this.cell * 0.5;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.28)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
    const grd = ctx.createLinearGradient(0, gy, 0, gy + gh);
    grd.addColorStop(0, 'rgba(126,184,116,0.34)');   // 잔디 톤(은은하게 배경과 섞임)
    grd.addColorStop(1, 'rgba(92,150,98,0.34)');
    this._rr(ctx, gx, gy, gw, gh, pr); ctx.fillStyle = grd; ctx.fill();
    ctx.restore();
    // 아주 옅은 테두리(거의 안 보이게)
    this._rr(ctx, gx, gy, gw, gh, pr);
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.stroke();

    // 셀: 빈칸만 아주 옅게 표시(아이템이 주인공이 되도록 격자선 거의 제거)
    const r = this.cell * 0.26;
    for (let i = 0; i < this.cells.length; i++) {
      if (this.cells[i]) continue; // 아이템 있는 칸은 표시 안 함
      const c = i % this.cols, row = Math.floor(i / this.cols);
      const x = this.bx + c * this.cell + this.gap / 2;
      const y = this.by + row * this.cell + this.gap / 2;
      const s = this.cell - this.gap;
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      this._rr(ctx, x, y, s, s, r); ctx.fill();
    }

    // 엔트리 (드래그 중인 것은 맨 위)
    const order = this.entries.slice().sort((a, b) => (a === this.drag?.entry ? 1 : 0) - (b === this.drag?.entry ? 1 : 0));
    for (const e of order) this._drawEntry(ctx, e, t);
  }

  _drawEntry(ctx, e, t) {
    const size = (this.cell - this.gap);
    const dragging = this.drag?.entry === e;
    // idle 둥둥 + 생산 pulse
    const bob = dragging ? 0 : Math.sin(t * 2 + e.phase) * size * 0.03;
    const drawSize = size * e.scale * (1 + e.pulse * 0.12);
    ctx.save();
    ctx.translate(e.px, e.py + bob);
    if (dragging) { // 들어올린 그림자
      ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(0, size * 0.5, size * 0.34, size * 0.12, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    } else { // 바닥 접지 그림자(입체감)
      ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = '#16203a';
      ctx.beginPath(); ctx.ellipse(0, size * 0.42, size * 0.30, size * 0.10, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    if (e.spin) ctx.rotate(e.spin);
    if (e.kind === 'item') {
      const it = getItem(e.itemId);
      const tile = getTile(it, 160);
      ctx.drawImage(tile, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
    } else {
      this._drawProducer(ctx, e, drawSize, t);
    }
    ctx.restore();
  }

  _drawProducer(ctx, e, s, t) {
    const def = PRODUCER_MAP[e.producerId];
    const r = s * 0.24;
    const full = e.charges >= def.maxCharges;
    // 살아있는 미니 건물: 준비되면 살짝 들썩
    const ready = full ? Math.sin(t * 4) * s * 0.015 : 0;
    ctx.save();
    ctx.translate(0, ready);
    // 카드 본체 (테마색)
    ctx.save();
    ctx.shadowColor = 'rgba(20,30,60,.35)'; ctx.shadowBlur = s * 0.12; ctx.shadowOffsetY = s * 0.05;
    const g = ctx.createLinearGradient(0, -s / 2, 0, s / 2);
    g.addColorStop(0, this._lighten(def.color, 0.4)); g.addColorStop(1, this._lighten(def.color, 0.0));
    this._rr(ctx, -s / 2, -s / 2, s, s, r); ctx.fillStyle = g; ctx.fill();
    ctx.restore();
    this._rr(ctx, -s / 2, -s / 2, s, s, r); ctx.lineWidth = Math.max(2.5, s * 0.045); ctx.strokeStyle = '#fff'; ctx.stroke();
    // 내부 흰 패널 + 건물 이미지/글리프
    const ip = s * 0.13, iw = s - ip * 2, ir = s * 0.16;
    this._rr(ctx, -s / 2 + ip, -s / 2 + ip, iw, iw, ir);
    ctx.save(); ctx.fillStyle = '#fff'; ctx.fill();
    this._rr(ctx, -s / 2 + ip, -s / 2 + ip, iw, iw, ir); ctx.clip();
    if (imgReady(def.img)) ctx.drawImage(img(def.img), -s / 2 + ip, -s / 2 + ip, iw, iw);
    else { ctx.font = `${iw * 0.6}px "Apple Color Emoji","Segoe UI Emoji",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(def.glyph, 0, 0); }
    ctx.restore();
    // 준비 완료 시 '탭!' 반짝
    if (full) {
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 5);
      this._rr(ctx, -s / 2, -s / 2, s, s, r); ctx.lineWidth = s * 0.04; ctx.strokeStyle = '#37e0a0'; ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // 충전 게이지
    const gx = -s * 0.36, gy = s * 0.32, gw = s * 0.72, gh = s * 0.11;
    ctx.fillStyle = 'rgba(0,0,0,.4)'; this._rr(ctx, gx, gy, gw, gh, gh / 2); ctx.fill();
    const frac = full ? 1 : (e.timer / def.cooldown);
    ctx.fillStyle = full ? '#37e0a0' : '#ffe07a';
    this._rr(ctx, gx, gy, gw * frac, gh, gh / 2); ctx.fill();
    // 충전 수 배지
    ctx.beginPath(); ctx.arc(s * 0.32, -s * 0.32, s * 0.16, 0, Math.PI * 2);
    ctx.fillStyle = full ? '#37e0a0' : '#1c2533'; ctx.fill();
    ctx.lineWidth = s * 0.02; ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = `900 ${s * 0.18}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(e.charges), s * 0.32, -s * 0.31);
    // 막힘 안내: 합칠 게 없을 때 충전된 생산기 위에 "👆 탭!" 말풍선(통통 튐)
    if (this.hintProducers && e.charges > 0) {
      const by = -s * 0.62 + Math.sin(t * 6) * s * 0.06;
      const bw = s * 0.5, bh = s * 0.26;
      ctx.fillStyle = '#ffcf3a';
      this._rr(ctx, -bw / 2, by - bh / 2, bw, bh, bh / 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-s * 0.06, by + bh / 2); ctx.lineTo(s * 0.06, by + bh / 2); ctx.lineTo(0, by + bh * 0.95); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#3a2c00'; ctx.font = `900 ${s * 0.15}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('탭!', 0, by);
    }
    ctx.restore();
  }

  _lighten(hex, amt) {
    const c = hex.replace('#', '');
    const n = parseInt(c.length === 3 ? c.split('').map(x => x + x).join('') : c, 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = Math.round(r + (255 - r) * amt); g = Math.round(g + (255 - g) * amt); b = Math.round(b + (255 - b) * amt);
    return `rgb(${r},${g},${b})`;
  }

  _rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w/2, h/2);
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
  }

  // ---- 직렬화 ----
  serialize() {
    return this.entries.map(e => ({
      cell: e.cell, kind: e.kind, itemId: e.itemId, producerId: e.producerId,
      charges: e.charges, timer: e.timer,
    }));
  }
  load(data) {
    this.cells.fill(null); this.entries.length = 0;
    for (const d of data) {
      if (d.cell == null || d.cell >= this.cells.length || this.cells[d.cell]) continue;
      // 구버전/유효하지 않은 참조는 건너뜀(크래시 방지)
      if (d.kind === 'item' && !getItem(d.itemId)) continue;
      if (d.kind === 'producer' && !PRODUCER_MAP[d.producerId]) continue;
      const e = this._newEntry(d.kind, d.kind === 'item' ? d.itemId : d.producerId, d.cell);
      e.scale = 1;
      if (d.kind === 'producer') { e.charges = d.charges ?? 0; e.timer = d.timer ?? 0; }
    }
  }
}
