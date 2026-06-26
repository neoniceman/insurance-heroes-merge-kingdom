// 아이템 토큰 렌더러 — 생성된 일러스트(흰 배경)를 흰 내부 패널에 녹여 게임 토큰처럼 표현.
// 둥근 카드 + 희귀도 테두리 + 큰 그림자 + 상단 하이라이트 + 레벨 배지. 이미지 로드 후 캐시.
import { RARITY_MAP } from '../data/rarities.js';

const imgBank = new Map();   // path -> Image
const tileCache = new Map(); // key -> {canvas, ready}

export function img(path) {
  if (!imgBank.has(path)) {
    const im = new Image();
    im.src = path;
    imgBank.set(path, im);
  }
  return imgBank.get(path);
}
export function imgReady(path) { const im = img(path); return im.complete && im.naturalWidth > 0; }

function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function lighten(hex, amt) {
  const c = hex.replace('#', '');
  const n = parseInt(c.length === 3 ? c.split('').map(x => x + x).join('') : c, 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.round(r + (255 - r) * amt); g = Math.round(g + (255 - g) * amt); b = Math.round(b + (255 - b) * amt);
  return `rgb(${r},${g},${b})`;
}

// item 토큰 캔버스 반환 (이미지 로드 시 자동 갱신).
export function getTile(item, size, silhouette = false) {
  const ready = imgReady(item.img);
  const key = `${item.id}|${size}|${silhouette ? 's' : 'n'}|${ready ? 1 : 0}`;
  if (tileCache.has(key)) return tileCache.get(key);

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cv = document.createElement('canvas');
  cv.width = size * dpr; cv.height = size * dpr;
  const ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);

  const rarity = RARITY_MAP[item.rarity];
  const pad = size * 0.035, w = size - pad * 2, r = size * 0.26;

  // 그림자
  ctx.save();
  ctx.shadowColor = 'rgba(20,30,60,0.30)'; ctx.shadowBlur = size * 0.10; ctx.shadowOffsetY = size * 0.05;
  // 외곽 카드 (테마색 그라데이션)
  const g = ctx.createLinearGradient(0, pad, 0, pad + w);
  if (silhouette) { g.addColorStop(0, '#3a455e'); g.addColorStop(1, '#2a3346'); }
  else { g.addColorStop(0, lighten(item.accent, 0.45)); g.addColorStop(1, lighten(item.accent, 0.05)); }
  rr(ctx, pad, pad, w, w, r); ctx.fillStyle = g; ctx.fill();
  ctx.restore();

  // 희귀도 테두리
  rr(ctx, pad, pad, w, w, r);
  ctx.lineWidth = Math.max(2.5, size * 0.04);
  ctx.strokeStyle = silhouette ? 'rgba(255,255,255,.12)' : rarity.color;
  ctx.stroke();

  // 내부 흰 패널 (이미지의 흰 배경을 자연스럽게 녹임) — 일러스트가 카드를 꽉 채우게
  const ipad = size * 0.075, iw = size - ipad * 2, ir = size * 0.21;
  rr(ctx, ipad, ipad, iw, iw, ir);
  ctx.fillStyle = silhouette ? 'rgba(255,255,255,0.05)' : '#ffffff';
  ctx.fill();

  // 콘텐츠 (이미지 또는 글리프)
  ctx.save();
  rr(ctx, ipad, ipad, iw, iw, ir); ctx.clip();
  if (silhouette) {
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.font = `900 ${iw * 0.6}px system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('?', size / 2, size / 2 + iw * 0.02);
  } else if (ready) {
    ctx.drawImage(img(item.img), ipad, ipad, iw, iw);
  } else {
    ctx.font = `${iw * 0.62}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(item.glyph || '❓', size / 2, size * 0.54);
  }
  ctx.restore();

  // 상단 광택
  ctx.save();
  rr(ctx, pad, pad, w, w, r); ctx.clip();
  const hl = ctx.createLinearGradient(0, pad, 0, pad + w * 0.4);
  hl.addColorStop(0, 'rgba(255,255,255,0.35)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hl; ctx.fillRect(pad, pad, w, w * 0.4);
  ctx.restore();

  // 레벨 배지
  if (!silhouette) {
    const bx = pad + size * 0.15, by = pad + size * 0.15, br = size * 0.125;
    ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fillStyle = '#1c2533'; ctx.fill();
    ctx.lineWidth = size * 0.018; ctx.strokeStyle = rarity.color; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = `900 ${size * 0.14}px system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(item.level), bx, by + size * 0.004);
  }

  const result = cv;
  tileCache.set(key, result);
  // 이미지가 아직 로딩 중이면 로드 완료 시 캐시 무효화되도록 onload 등록
  if (!ready && !silhouette) {
    const im = img(item.img);
    im.onload = () => { tileCache.delete(`${item.id}|${size}|n|0`); };
  }
  return result;
}

export function clearTileCache() { tileCache.clear(); }
