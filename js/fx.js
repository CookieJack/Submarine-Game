/* ============ 特效：粒子 / 气泡 / 冲击环 / 浮动文字 / 震屏 / 闪光 ============ */

const FX = {
  particles: [],
  rings: [],
  texts: [],
  shakeAmt: 0,
  flashA: 0,
  flashRGB: [232, 251, 255],
  hitA: 0,

  colors: {
    cyan: [95, 242, 255],
    white: [232, 251, 255],
    amber: [255, 200, 87],
    orange: [255, 140, 60],
    danger: [255, 77, 109],
    smoke: [18, 40, 50],
    foam: [210, 246, 255]
  },

  reset() {
    this.particles.length = 0;
    this.rings.length = 0;
    this.texts.length = 0;
    this.shakeAmt = 0;
    this.flashA = 0;
    this.hitA = 0;
  },

  addParticle(p) {
    if (this.particles.length >= CFG.FX.MAX_PARTICLES) this.particles.shift();
    this.particles.push(p);
  },

  /* ---------- 粒子发射 ---------- */

  bubble(x, y, count = 1, opts = {}) {
    for (let i = 0; i < count; i++) {
      const life = opts.life || Utils.rand(0.5, 1.1);
      this.addParticle({
        type: 'bubble',
        x: x + Utils.rand(-(opts.spread || 6), opts.spread || 6),
        y: y + Utils.rand(-4, 4),
        vx: Utils.rand(-10, 10),
        vy: -Utils.rand(opts.speed || 24, (opts.speed || 24) + 34),
        g: -6,
        drag: 0.985,
        sway: Utils.rand(0, Math.PI * 2),
        size: Utils.rand(opts.size || 1.2, (opts.size || 1.2) + 2.2),
        life,
        maxLife: life
      });
    }
  },

  spark(x, y, count = 10, opts = {}) {
    const rgb = opts.rgb || this.colors.orange;
    for (let i = 0; i < count; i++) {
      const life = Utils.rand(0.3, 0.75);
      const ang = Utils.rand(0, Math.PI * 2);
      const sp = Utils.rand(50, opts.speed || 230);
      this.addParticle({
        type: 'spark',
        x, y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp - 30,
        g: 220,
        drag: 0.97,
        size: Utils.rand(1.2, 2.8),
        rgb,
        life,
        maxLife: life
      });
    }
  },

  smoke(x, y, count = 1, opts = {}) {
    for (let i = 0; i < count; i++) {
      const life = Utils.rand(1.0, 2.0);
      this.addParticle({
        type: 'smoke',
        x: x + Utils.rand(-8, 8),
        y: y + Utils.rand(-4, 4),
        vx: Utils.rand(-12, 12),
        vy: -Utils.rand(12, 34),
        g: -3,
        drag: 0.99,
        size: Utils.rand(6, 12),
        grow: Utils.rand(6, 14),
        rgb: opts.rgb || this.colors.smoke,
        life,
        maxLife: life
      });
    }
  },

  foam(x, y, count = 3, opts = {}) {
    for (let i = 0; i < count; i++) {
      const life = Utils.rand(0.35, 0.8);
      this.addParticle({
        type: 'foam',
        x: x + Utils.rand(-(opts.spread || 8), opts.spread || 8),
        y: y + Utils.rand(-2, 2),
        vx: Utils.rand(-26, 26),
        vy: -Utils.rand(8, 36),
        g: 120,
        drag: 0.98,
        size: Utils.rand(1.5, 3.4),
        rgb: this.colors.foam,
        life,
        maxLife: life
      });
    }
  },

  /* ---------- 组合特效 ---------- */

  ring(x, y, opts = {}) {
    this.rings.push({
      x, y,
      r: opts.r || 4,
      maxR: opts.maxR || 80,
      life: opts.life || 0.6,
      maxLife: opts.life || 0.6,
      width: opts.width || 2,
      rgb: opts.rgb || this.colors.cyan
    });
  },

  explosion(x, y, radius, opts = {}) {
    const underwater = !!opts.underwater;

    this.ring(x, y, {
      maxR: radius * 1.25,
      life: 0.45,
      width: 3.5,
      rgb: this.colors.white
    });
    this.ring(x, y, {
      maxR: radius * 1.95,
      life: 0.85,
      width: 1.6,
      rgb: underwater ? this.colors.cyan : this.colors.amber
    });

    if (underwater) {
      this.bubble(x, y, 26, { spread: radius * 0.5, speed: 30, size: 2 });
      this.bubble(x, y, 12, { spread: radius * 0.7, speed: 55, size: 1.4 });
      this.spark(x, y, 16, { rgb: this.colors.cyan, speed: radius * 2.2 });
      this.spark(x, y, 8, { rgb: this.colors.white, speed: radius * 1.6 });
      this.flash(0.09, this.colors.cyan);
      this.shake(opts.shake || 8);
    } else {
      this.spark(x, y, 26, { rgb: this.colors.orange, speed: radius * 4.2 });
      this.spark(x, y, 12, { rgb: this.colors.white, speed: radius * 3.2 });
      this.smoke(x, y, 7, { rgb: this.colors.smoke });
      this.foam(x, y, 14, { spread: radius * 0.6 });
      this.bubble(x, y + 8, 8, { spread: radius * 0.4 });
      this.flash(0.18, this.colors.white);
      this.shake(opts.shake || 11);
    }
  },

  splash(x, y) {
    this.ring(x, y, {
      maxR: 26,
      life: 0.35,
      width: 1.4,
      rgb: this.colors.cyan
    });
    this.foam(x, y, 6, { spread: 5 });
    this.bubble(x, y + 4, 4, { spread: 3, speed: 22 });
  },

  text(x, y, str, rgb, size = 15) {
    this.texts.push({
      x, y, str,
      rgb: rgb || this.colors.white,
      size,
      vy: -34,
      life: 1.05,
      maxLife: 1.05
    });
  },

  shake(amount) {
    this.shakeAmt = Math.min(CFG.FX.SHAKE_MAX, this.shakeAmt + amount);
  },

  flash(alpha, rgb) {
    this.flashA = Math.max(this.flashA, alpha);
    if (rgb) this.flashRGB = rgb;
  },

  hitFlash() {
    this.hitA = 0.85;
    this.flash(0.12, this.colors.danger);
  },

  getShake() {
    if (this.shakeAmt <= 0.05) return { x: 0, y: 0 };
    return {
      x: Utils.rand(-1, 1) * this.shakeAmt,
      y: Utils.rand(-1, 1) * this.shakeAmt
    };
  },

  /* ---------- 更新 ---------- */

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += p.g * dt;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.sway !== undefined) {
        p.sway += dt * 4;
        p.x += Math.sin(p.sway) * 8 * dt;
      }
      if (p.grow) p.size += p.grow * dt;
    }

    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt;
      if (r.life <= 0) {
        this.rings.splice(i, 1);
        continue;
      }
      const t = 1 - r.life / r.maxLife;
      r.r = 4 + (r.maxR - 4) * Utils.easeOutCubic(t);
    }

    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      if (t.life <= 0) {
        this.texts.splice(i, 1);
        continue;
      }
      t.y += t.vy * dt;
    }

    this.shakeAmt *= Math.exp(-5.5 * dt);
    if (this.shakeAmt < 0.05) this.shakeAmt = 0;
    this.flashA = Math.max(0, this.flashA - dt * 2.1);
    this.hitA = Math.max(0, this.hitA - dt * 1.5);
  },

  /* ---------- 绘制 ---------- */

  draw(ctx) {
    // 冲击环
    for (const r of this.rings) {
      const a = r.life / r.maxLife;
      ctx.strokeStyle = Utils.rgba(r.rgb, a * 0.75);
      ctx.lineWidth = r.width;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 粒子
    for (const p of this.particles) {
      const a = Math.max(0, p.life / p.maxLife);

      if (p.type === 'bubble') {
        ctx.strokeStyle = Utils.rgba(this.colors.white, a * 0.55);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = Utils.rgba(this.colors.cyan, a * 0.18);
        ctx.fill();
      } else if (p.type === 'spark') {
        ctx.fillStyle = Utils.rgba(p.rgb, a);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'smoke') {
        ctx.fillStyle = Utils.rgba(p.rgb, a * 0.34);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'foam') {
        ctx.fillStyle = Utils.rgba(p.rgb, a * 0.7);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 浮动文字
    for (const t of this.texts) {
      const a = Math.min(1, (t.life / t.maxLife) * 1.8);
      ctx.font = `bold ${t.size}px "SF Mono", "PingFang SC", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = Utils.rgba(t.rgb, a);
      ctx.shadowColor = Utils.rgba(t.rgb, a * 0.8);
      ctx.shadowBlur = 8;
      ctx.fillText(t.str, t.x, t.y);
      ctx.shadowBlur = 0;
    }
  },

  /* 全屏叠加：受击红晕 + 闪光（不参与震屏位移） */
  drawScreenOverlay(ctx) {
    if (this.hitA > 0) {
      const g = ctx.createRadialGradient(
        CFG.W / 2, CFG.H / 2, CFG.H * 0.2,
        CFG.W / 2, CFG.H / 2, CFG.H * 0.8
      );
      g.addColorStop(0, 'rgba(255,20,60,0)');
      g.addColorStop(1, Utils.rgba(this.colors.danger, this.hitA * 0.38));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, CFG.W, CFG.H);
    }

    if (this.flashA > 0) {
      ctx.fillStyle = Utils.rgba(this.flashRGB, this.flashA);
      ctx.fillRect(0, 0, CFG.W, CFG.H);
    }
  }
};
