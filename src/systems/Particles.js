// 파티클 시스템 — 객체 풀링 사용. 머지 폭발/반짝임/코인 튐.
import { Pool } from '../core/Pool.js';

export class Particles {
  constructor() {
    this.pool = new Pool(
      () => ({ x:0,y:0,vx:0,vy:0,life:0,max:1,size:4,color:'#fff',grav:0,shape:'circle',rot:0,vr:0,text:'' }),
      (p, o) => Object.assign(p, o),
      512
    );
  }
  get list() { return this.pool.active; }

  burst(x, y, color, count = 16, opts = {}) {
    const speed = opts.speed ?? 380;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.6);
      this.pool.obtain({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: 0, max: 0.5 + Math.random() * 0.5,
        size: (opts.size ?? 6) * (0.5 + Math.random()),
        color, grav: opts.grav ?? 600, shape: opts.shape ?? 'circle',
        rot: Math.random() * 6, vr: (Math.random() - 0.5) * 10, text: opts.text ?? '',
      });
    }
  }
  ring(x, y, color, count = 24) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const s = 300;
      this.pool.obtain({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: 0, max: 0.6, size: 5, color, grav: 0, shape: 'spark', rot: a, vr: 0, text: '',
      });
    }
  }
  coinPop(x, y, count = 8) {
    for (let i = 0; i < count; i++) {
      const a = -Math.PI/2 + (Math.random()-0.5) * 1.6;
      const s = 250 + Math.random()*200;
      this.pool.obtain({
        x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s,
        life: 0, max: 0.8, size: 10, color: '#ffcf3a', grav: 800, shape: 'coin', rot:0, vr:8, text:'',
      });
    }
  }
  floatText(x, y, text, color = '#fff') {
    this.pool.obtain({ x, y, vx: 0, vy: -90, life: 0, max: 1.1, size: 26, color, grav: 0, shape: 'text', rot: 0, vr: 0, text });
  }
  // 두 출발점 → 목표점으로 빨려드는 입자
  absorb(x1, y1, x2, y2, color, count = 10) {
    for (let i = 0; i < count; i++) {
      const px = x1 + (Math.random() - 0.5) * 30, py = y1 + (Math.random() - 0.5) * 30;
      const dx = x2 - px, dy = y2 - py;
      const sp = 6 + Math.random() * 4;
      this.pool.obtain({
        x: px, y: py, vx: dx * sp, vy: dy * sp, life: 0, max: 0.18 + Math.random() * 0.08,
        size: 5 + Math.random() * 4, color, grav: 0, shape: 'circle', rot: 0, vr: 0, text: '',
      });
    }
  }
  starBurst(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, s = 220 + Math.random() * 260;
      this.pool.obtain({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: 0.7 + Math.random() * 0.4,
        size: 12 + Math.random() * 8, color, grav: 200, shape: 'star', rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12, text: '',
      });
    }
  }

  update(dt) {
    for (const p of this.list) {
      p.life += dt;
      p.vy += p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.vx *= 0.98;
    }
    this.pool.sweep(p => p.life >= p.max);
  }

  draw(ctx) {
    for (const p of this.list) {
      const t = p.life / p.max;
      const alpha = 1 - t;
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.translate(p.x, p.y);
      if (p.shape === 'text') {
        ctx.font = `900 ${p.size}px system-ui, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,.5)';
        ctx.strokeText(p.text, 0, 0);
        ctx.fillStyle = p.color; ctx.fillText(p.text, 0, 0);
      } else if (p.shape === 'coin') {
        ctx.rotate(p.rot);
        ctx.fillStyle = '#ffcf3a';
        ctx.beginPath(); ctx.ellipse(0,0,p.size*(0.6+0.4*Math.abs(Math.cos(p.rot))),p.size,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle = '#e0a020'; ctx.font = `900 ${p.size}px sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
      } else if (p.shape === 'spark') {
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size*0.2, -p.size*(1.4-t), p.size*0.4, p.size*2.4);
      } else if (p.shape === 'star') {
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        const sp = p.size * (1 - t * 0.4);
        ctx.beginPath();
        for (let k = 0; k < 5; k++) {
          const ang = (k / 5) * Math.PI * 2 - Math.PI / 2;
          const ang2 = ang + Math.PI / 5;
          ctx.lineTo(Math.cos(ang) * sp, Math.sin(ang) * sp);
          ctx.lineTo(Math.cos(ang2) * sp * 0.45, Math.sin(ang2) * sp * 0.45);
        }
        ctx.closePath(); ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(0, 0, p.size * (1 - t*0.5), 0, Math.PI*2); ctx.fill();
      }
      ctx.restore();
    }
  }
}
