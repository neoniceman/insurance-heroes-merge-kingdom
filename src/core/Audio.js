// WebAudio 기반 사운드 — 외부 음원 파일 없이 합성으로 POP/SHINE/BOOM/COSMIC 효과음 생성.
// 경량·즉시재생·크로스플랫폼. 사운드/음악 On/Off 지원.
export class AudioManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.musicOn = true;
    this.master = null;
    this.musicGain = null;
    this._musicTimer = null;
  }
  _ensure() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.35;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.12;
    this.musicGain.connect(this.ctx.destination);
  }
  resume() { this._ensure(); if (this.ctx.state === 'suspended') this.ctx.resume(); }

  _tone(freq, dur, type = 'sine', vol = 1, when = 0) {
    if (!this.enabled) return;
    this._ensure();
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  _sweep(f1, f2, dur, type = 'sawtooth', vol = 0.6) {
    if (!this.enabled) return;
    this._ensure();
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f1, t);
    o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  // 머지 결과 희귀도에 따라 효과음 분기
  merge(fx = 'none') {
    switch (fx) {
      case 'none':   this.pop(); break;
      case 'shine':  this.shine(); break;
      case 'boom':   this.boom(); break;
      case 'cosmic': this.cosmic(); break;
      default:       this.pop();
    }
  }
  pop()   { this._tone(520, 0.12, 'triangle', 0.5); this._tone(780, 0.10, 'sine', 0.3, 0.03); }
  shine() { [660, 880, 1100].forEach((f, i) => this._tone(f, 0.18, 'sine', 0.4, i * 0.05)); }
  boom()  { this._sweep(180, 60, 0.4, 'sawtooth', 0.7); this._tone(440, 0.3, 'square', 0.3, 0.02); }
  cosmic(){ this._sweep(200, 1600, 0.5, 'sine', 0.5); [523, 659, 784, 1046].forEach((f, i)=>this._tone(f,0.5,'triangle',0.35,i*0.06)); }
  coin()  { this._tone(880, 0.06, 'square', 0.25); this._tone(1320, 0.08, 'square', 0.2, 0.04); }
  click() { this._tone(300, 0.05, 'triangle', 0.3); }
  error() { this._tone(160, 0.15, 'square', 0.3); }
  combo(n){ this._tone(440 + n * 60, 0.12, 'square', 0.4); }
  levelup(){ [523,659,784,1046,1318].forEach((f,i)=>this._tone(f,0.25,'triangle',0.4,i*0.08)); }

  // 가벼운 생성형 BGM — 밝고 경쾌한 아르페지오 루프
  startMusic() {
    if (!this.musicOn) return;
    this._ensure();
    if (this._musicTimer) return;
    const scale = [0, 2, 4, 7, 9, 12, 9, 7]; // major pentatonic-ish
    let i = 0;
    const root = 261.63;
    const step = () => {
      if (!this.musicOn) return;
      const semis = scale[i % scale.length];
      const f = root * Math.pow(2, semis / 12);
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = f * (i % 16 < 8 ? 1 : 2);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.5, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o.connect(g); g.connect(this.musicGain);
      o.start(t); o.stop(t + 0.4);
      i++;
      this._musicTimer = setTimeout(step, 260);
    };
    step();
  }
  stopMusic() { if (this._musicTimer) { clearTimeout(this._musicTimer); this._musicTimer = null; } }

  setSound(on) { this.enabled = on; }
  setMusic(on) { this.musicOn = on; if (on) this.startMusic(); else this.stopMusic(); }
}
export const audio = new AudioManager();
