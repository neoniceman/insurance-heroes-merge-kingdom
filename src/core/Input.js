// 마우스/터치 통합 포인터 입력. 보드(CSS 픽셀) 좌표계로 정규화.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.x = 0; this.y = 0;
    this.down = false;
    this.handlers = { down: [], move: [], up: [] };
    const opts = { passive: false };
    // 시작(down)은 캔버스에서만 받는다 → UI 버튼 위 터치는 보드로 가지 않음.
    canvas.addEventListener('mousedown', e => this._evt('down', e), opts);
    canvas.addEventListener('touchstart', e => this._evt('down', e), opts);
    // move/up 은 window 에서 추적하되, 보드 드래그 중일 때만 기본동작을 막는다.
    window.addEventListener('mousemove', e => this._evt('move', e), opts);
    window.addEventListener('mouseup',   e => this._evt('up', e), opts);
    window.addEventListener('touchmove',  e => this._evt('move', e), opts);
    window.addEventListener('touchend',   e => this._evt('up', e), opts);
    window.addEventListener('touchcancel',e => this._evt('up', e), opts);
  }
  // 캔버스의 CSS 픽셀 기준 좌표 (보드 레이아웃과 동일한 좌표계). dpr 로 스케일하지 않는다.
  _pos(e) {
    const r = this.canvas.getBoundingClientRect();
    const src = e.touches?.[0] || e.changedTouches?.[0] || e;
    return { x: src.clientX - r.left, y: src.clientY - r.top };
  }
  _evt(type, e) {
    // 보드 시작(down) 또는 보드 드래그 중(move/up)일 때만 스크롤/줌 등 기본동작 차단.
    // UI 버튼 탭(보드 밖)은 down=false 라 통과 → click 이벤트가 정상 발생.
    if (e.cancelable && (type === 'down' || this.down)) e.preventDefault();
    const p = this._pos(e);
    this.x = p.x; this.y = p.y;
    if (type === 'down') this.down = true;
    if (type === 'up') this.down = false;
    for (const fn of this.handlers[type]) fn(this.x, this.y, e);
  }
  on(type, fn) { this.handlers[type].push(fn); }
}
