// 엔트리 — 게임 + UI 초기화, 리사이즈/시작 게이트.
import { Game } from './core/Game.js';
import { UI } from './ui/UI.js';
import { audio } from './core/Audio.js';

const canvas = document.getElementById('game');
const game = new Game(canvas);
const ui = new UI(game);

function resize() { game.resize(); }
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));
window.addEventListener('load', resize);
// 캔버스 크기 변화를 직접 감지 → 어떤 기기/브라우저에서도 보드가 정확히 정렬됨.
if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);

// 시작 게이트 (오디오 정책 + 첫 탭)
const splash = document.getElementById('splash');
let started = false;
function startGame() {
  if (started) return;
  started = true;
  // 오디오 초기화는 실패해도 게임 시작을 막지 않도록 방어.
  try { audio.resume(); audio.startMusic(); } catch (e) { console.warn('audio init failed', e); }
  splash.classList.add('hide');
  setTimeout(() => splash.remove(), 500);
}
// 버튼 클릭 + 스플래시 어디든 탭/클릭으로 시작 (마우스·터치 모두)
document.getElementById('start-btn').addEventListener('click', startGame);
splash.addEventListener('click', startGame);
splash.addEventListener('touchend', (e) => { e.preventDefault(); startGame(); }, { passive: false });

game.start();
window.__game = game; // 디버그용
