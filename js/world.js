/* ============ 深海环境：海水 / 光柱 / 海面 / 海床 / 海洋雪 / 远景鱼群 ============ */

const World = {
  time: 0,
  snow: [],
  shafts: [],
  rocks: [],
  corals: [],
  schools: [],

  init() {
    this.reset();
  },

  reset() {
    this.time = 0;

    // 海洋雪
    this.snow = [];
    for (let i = 0; i < 90; i++) {
      this.snow.push({
        x: Utils.rand(0, CFG.W),
        y: Utils.rand(CFG.SURFACE_Y, CFG.H),
        r: Utils.rand(0.6, 1.9),
        speed: Utils.rand(6, 24),
        drift: Utils.rand(-5, 5),
        alpha: Utils.rand(0.08, 0.28),
        phase: Utils.rand(0, Math.PI * 2)
      });
    }

    // 光柱
    this.shafts = [];
    for (let i = 0; i < 7; i++) {
      this.shafts.push({
        x: Utils.rand(-80, CFG.W + 80),
        width: Utils.rand(55, 170),
        phase: Utils.rand(0, Math.PI * 2),
        speed: Utils.rand(0.08, 0.22),
        alpha: Utils.rand(0.018, 0.045)
      });
    }

    // 海床礁石
    this.rocks = [];
    for (let i = 0; i < 16; i++) {
      const w = Utils.rand(50, 190);
      const h = Utils.rand(16, 72);
      const x = Utils.rand(-20, CFG.W + 20);
      const pts = [];
      const n = Utils.randInt(3, 5);
      for (let k = 0; k <= n; k++) {
        pts.push({
          dx: -w / 2 + (w * k) / n,
          dy: k === 0 || k === n ? 0 : -Utils.rand(h * 0.35, h)
        });
      }
      this.rocks.push({ x, w, h, pts });
    }

    // 霓虹珊瑚
    this.corals = [];
    for (let i = 0; i < 9; i++) {
      this.corals.push({
        x: Utils.rand(30, CFG.W - 30),
        h: Utils.rand(22, 58),
        lean: Utils.rand(-0.5, 0.5),
        rgb: i % 2 === 0 ? CFG.COLORS.cyanRGB : [190, 120, 255],
        phase: Utils.rand(0, Math.PI * 2)
      });
    }

    // 远景鱼群
    this.schools = [];
    for (let s = 0; s < 2; s++) {
      const school = {
        x: Utils.rand(0, CFG.W),
        y: Utils.rand(280, 600),
        dir: Math.random() < 0.5 ? 1 : -1,
        speed: Utils.rand(10, 22),
        fish: []
      };
      const count = Utils.randInt(5, 8);
      for (let i = 0; i < count; i++) {
        school.fish.push({
          dx: Utils.rand(-46, 46),
          dy: Utils.rand(-14, 14),
          phase: Utils.rand(0, Math.PI * 2),
          size: Utils.rand(1.4, 2.4)
        });
      }
      this.schools.push(school);
    }
  },

  update(dt) {
    this.time += dt;

    for (const s of this.snow) {
      s.y += s.speed * dt;
      s.x += Math.sin(this.time * 0.6 + s.phase) * 3 * dt + s.drift * dt;
      if (s.y > CFG.H + 4) {
        s.y = CFG.SURFACE_Y - 4;
        s.x = Utils.rand(0, CFG.W);
      }
      if (s.x < -4) s.x = CFG.W + 4;
      if (s.x > CFG.W + 4) s.x = -4;
    }

    for (const school of this.schools) {
      school.x += school.dir * school.speed * dt;
      if (school.x < -90) school.x = CFG.W + 90;
      if (school.x > CFG.W + 90) school.x = -90;
    }
  },

  /* 背景层：海水 / 光柱 / 鱼群 / 海洋雪 / 海床 */
  drawBack(ctx) {
    // 海水渐变
    const g = ctx.createLinearGradient(0, CFG.SURFACE_Y, 0, CFG.H);
    g.addColorStop(0, CFG.COLORS.bgTop);
    g.addColorStop(0.45, CFG.COLORS.bgMid);
    g.addColorStop(1, CFG.COLORS.bgBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CFG.W, CFG.H);

    // 海面附近的冷光
    const glow = ctx.createRadialGradient(
      CFG.W / 2, CFG.SURFACE_Y, 20,
      CFG.W / 2, CFG.SURFACE_Y, CFG.H * 0.75
    );
    glow.addColorStop(0, 'rgba(70,210,245,0.12)');
    glow.addColorStop(1, 'rgba(4,20,32,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, CFG.W, CFG.H);

    // 光柱
    for (const s of this.shafts) {
      const sway = Math.sin(this.time * s.speed + s.phase) * 46;
      const topX = s.x + sway;
      const bottomX = s.x + sway * 2.4 + s.width * 0.3;
      const sg = ctx.createLinearGradient(0, CFG.SURFACE_Y, 0, CFG.FLOOR_Y);
      sg.addColorStop(0, `rgba(120,240,255,${s.alpha})`);
      sg.addColorStop(0.55, `rgba(90,210,240,${s.alpha * 0.45})`);
      sg.addColorStop(1, 'rgba(60,170,210,0)');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.moveTo(topX - s.width * 0.25, CFG.SURFACE_Y);
      ctx.lineTo(topX + s.width * 0.25, CFG.SURFACE_Y);
      ctx.lineTo(bottomX + s.width * 0.85, CFG.FLOOR_Y);
      ctx.lineTo(bottomX - s.width * 0.85, CFG.FLOOR_Y);
      ctx.closePath();
      ctx.fill();
    }

    // 远景鱼群
    for (const school of this.schools) {
      for (const f of school.fish) {
        const fx = school.x + f.dx * school.dir;
        const fy = school.y + f.dy + Math.sin(this.time * 1.6 + f.phase) * 3;
        ctx.save();
        ctx.translate(fx, fy);
        ctx.scale(school.dir, 1);
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = '#06121a';
        ctx.strokeStyle = 'rgba(95,242,255,0.35)';
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.ellipse(0, 0, 7 * f.size, 2.4 * f.size, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-6 * f.size, 0);
        ctx.lineTo(-11 * f.size, -3 * f.size);
        ctx.lineTo(-11 * f.size, 3 * f.size);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    // 海洋雪
    for (const s of this.snow) {
      ctx.fillStyle = `rgba(210,248,255,${s.alpha})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    this.drawFloor(ctx);
  },

  drawFloor(ctx) {
    // 海床主体
    ctx.fillStyle = CFG.COLORS.seaFloor;
    ctx.beginPath();
    ctx.moveTo(0, CFG.FLOOR_Y + 6);
    ctx.lineTo(0, CFG.FLOOR_Y + 2);
    for (let x = 0; x <= CFG.W; x += 40) {
      const y = CFG.FLOOR_Y + 2 + Math.sin(x * 0.013) * 5 + Math.sin(x * 0.041) * 3;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(CFG.W, CFG.H);
    ctx.lineTo(0, CFG.H);
    ctx.closePath();
    ctx.fill();

    // 礁石
    for (const r of this.rocks) {
      ctx.fillStyle = '#020b12';
      ctx.strokeStyle = 'rgba(40,130,160,0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(r.x + r.pts[0].dx, CFG.FLOOR_Y + 4);
      for (const p of r.pts) {
        ctx.lineTo(r.x + p.dx, CFG.FLOOR_Y + 4 + p.dy);
      }
      ctx.lineTo(r.x + r.w / 2, CFG.FLOOR_Y + 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // 霓虹珊瑚
    for (const c of this.corals) {
      const sway = Math.sin(this.time * 0.7 + c.phase) * 3;
      ctx.strokeStyle = Utils.rgba(c.rgb, 0.22);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(c.x, CFG.FLOOR_Y + 10);
      ctx.quadraticCurveTo(c.x + c.lean * 16 + sway, CFG.FLOOR_Y - c.h * 0.6, c.x + c.lean * 26 + sway, CFG.FLOOR_Y - c.h);
      ctx.stroke();
      ctx.lineWidth = 1;
      for (let i = 1; i <= 3; i++) {
        const t = i / 4;
        const bx = c.x + c.lean * 12 * t + sway * t;
        const by = CFG.FLOOR_Y + 10 - c.h * t;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + (i % 2 === 0 ? 12 : -12), by - 9);
        ctx.stroke();
      }
    }

    // 海床霓虹边光
    ctx.strokeStyle = 'rgba(70,200,230,0.14)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = 0; x <= CFG.W; x += 12) {
      const y = CFG.FLOOR_Y + 2 + Math.sin(x * 0.013) * 5 + Math.sin(x * 0.041) * 3;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  },

  /* 海面层：波光与焦散 */
  drawSurface(ctx) {
    const y0 = CFG.SURFACE_Y;

    // 海面亮带
    const g = ctx.createLinearGradient(0, y0 - 22, 0, y0 + 26);
    g.addColorStop(0, 'rgba(120,240,255,0.02)');
    g.addColorStop(0.55, 'rgba(130,245,255,0.16)');
    g.addColorStop(1, 'rgba(60,190,225,0.02)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y0 - 22, CFG.W, 48);

    // 水面波线
    for (let k = 0; k < 3; k++) {
      ctx.strokeStyle = `rgba(150,246,255,${0.22 - k * 0.06})`;
      ctx.lineWidth = k === 0 ? 2 : 1;
      ctx.beginPath();
      for (let x = 0; x <= CFG.W; x += 16) {
        const y = y0 + Math.sin(x * 0.022 + this.time * (1.1 + k * 0.25) + k) * (1.8 + k * 0.8);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // 焦散光斑
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 11; i++) {
      const cx = (i * 137 + this.time * (12 + i * 1.7)) % (CFG.W + 160) - 80;
      const cy = y0 + 18 + Math.sin(this.time * 0.8 + i) * 12;
      const w = 34 + (i % 4) * 18;
      ctx.fillStyle = `rgba(120,240,255,${0.028 + (i % 3) * 0.012})`;
      ctx.beginPath();
      ctx.ellipse(cx, cy, w, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 海面细碎泡沫
    for (let i = 0; i < 8; i++) {
      const fx = (i * 193 + this.time * 8) % (CFG.W + 80) - 40;
      ctx.fillStyle = 'rgba(225,252,255,0.12)';
      ctx.beginPath();
      ctx.arc(fx, y0 - 2 + Math.sin(this.time + i) * 2, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  /* 前景暗角 */
  drawOverlay(ctx) {
    const g = ctx.createRadialGradient(
      CFG.W / 2, CFG.H * 0.52, CFG.H * 0.34,
      CFG.W / 2, CFG.H * 0.52, CFG.H * 0.86
    );
    g.addColorStop(0, 'rgba(0,4,10,0)');
    g.addColorStop(1, 'rgba(0,4,10,0.6)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CFG.W, CFG.H);

    const top = ctx.createLinearGradient(0, 0, 0, 160);
    top.addColorStop(0, 'rgba(0,3,8,0.5)');
    top.addColorStop(1, 'rgba(0,3,8,0)');
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, CFG.W, 160);
  }
};
