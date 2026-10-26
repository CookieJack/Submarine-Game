/* ============ 游戏实体：潜艇 / 水雷 / 深水炸弹 / 驱逐舰 ============ */

/* ---------------- 潜艇 ---------------- */
class Submarine {
  constructor(x, y, kind = 'diesel') {
    this.kind = CFG.SUBMARINES[kind] ? kind : 'diesel';
    this.spec = CFG.SUBMARINES[this.kind];
    this.x = x;
    this.y = y;
    this.tx = x;
    this.ty = y;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.pitch = 0;
    this.invuln = 0;
    this.alive = true;
    this.hitFlash = 0;
    this.propTimer = 0;
  }

  update(dt) {
    const P = CFG.PLAYER;
    const S = this.spec;

    this.tx = Utils.clamp(Input.mx, P.MIN_X, P.MAX_X);
    this.ty = Utils.clamp(Input.my, P.MIN_Y, P.MAX_Y);

    // 水下洋流：缓慢变化的横向/纵向流速
    const t = World.time;
    const currentX = Math.sin((t / P.CURRENT_PERIOD_X) * Math.PI * 2) * P.CURRENT_X;
    const currentY = Math.cos((t / P.CURRENT_PERIOD_Y) * Math.PI * 2 + 0.9) * P.CURRENT_Y;

    // 到位速度：距离越近目标速度越低，避免在目标点来回抖动
    const dx = this.tx - this.x;
    const dy = this.ty - this.y;
    const d = Math.hypot(dx, dy);
    const desiredSpeed = Math.min(S.speed, d * P.ARRIVE_GAIN);
    const desiredVx = d > 0.001 ? (dx / d) * desiredSpeed : 0;
    const desiredVy = d > 0.001 ? (dy / d) * desiredSpeed : 0;

    // 推进响应延迟：速度指数趋近期望速度，形成水下惯性与滑行
    const k = 1 - Math.exp(-S.thrust * dt);
    this.vx += (desiredVx - this.vx) * k;
    this.vy += (desiredVy - this.vy) * k;

    // 洋流作为附加位移，潜艇速度是相对水的推进
    this.x += (this.vx + currentX) * dt;
    this.y += (this.vy + currentY) * dt;

    if (this.x < P.MIN_X) {
      this.x = P.MIN_X;
      if (this.vx < 0) this.vx = 0;
    }
    if (this.x > P.MAX_X) {
      this.x = P.MAX_X;
      if (this.vx > 0) this.vx = 0;
    }
    if (this.y < P.MIN_Y) {
      this.y = P.MIN_Y;
      if (this.vy < 0) this.vy = 0;
    }
    if (this.y > P.MAX_Y) {
      this.y = P.MAX_Y;
      if (this.vy > 0) this.vy = 0;
    }

    if (this.vx > 18) this.facing = 1;
    else if (this.vx < -18) this.facing = -1;
    this.pitch = Utils.damp(this.pitch, Utils.clamp(this.vy * 0.0015, -0.2, 0.2), 6, dt);

    if (this.invuln > 0) this.invuln = Math.max(0, this.invuln - dt);
    if (this.hitFlash > 0) this.hitFlash = Math.max(0, this.hitFlash - dt);

    // 螺旋桨气泡
    this.propTimer -= dt;
    if (this.propTimer <= 0) {
      this.propTimer = 0.085;
      FX.bubble(this.x - this.facing * (S.len * 0.55), this.y + 2, 1, { spread: 3, speed: 18, size: 1 });
    }
  }

  idle(dt) {
    this.y = CFG.PLAYER.START_Y + Math.sin(World.time * 1.1) * 8;
    this.pitch = Math.sin(World.time * 1.1 + 0.6) * 0.02;
    if (this.invuln > 0) this.invuln = Math.max(0, this.invuln - dt);
  }

  /* 艇体轮廓，供填充、描边与受击裁剪共用 */
  hullPath(ctx) {
    if (this.kind === 'nuclear') this.nuclearHullPath(ctx);
    else this.dieselHullPath(ctx);
  }

  /* 柴电潜艇：现有 116 长度水滴形 */
  dieselHullPath(ctx) {
    ctx.beginPath();
    ctx.moveTo(58, 0);
    ctx.bezierCurveTo(58, -5.5, 50, -10.5, 40, -11.5);
    ctx.bezierCurveTo(20, -14, -4, -17, -24, -15.5);
    ctx.bezierCurveTo(-38, -14.5, -47, -10, -54, -3.2);
    ctx.bezierCurveTo(-56, -1, -56, 1, -54, 3.2);
    ctx.bezierCurveTo(-47, 10, -38, 14.5, -24, 15.5);
    ctx.bezierCurveTo(-4, 17, 20, 14, 40, 11.5);
    ctx.bezierCurveTo(50, 10.5, 58, 5.5, 58, 0);
    ctx.closePath();
  }

  /* 核潜艇：152 长度、中段更饱满的长水滴形 */
  nuclearHullPath(ctx) {
    ctx.beginPath();
    ctx.moveTo(74, 0);
    ctx.bezierCurveTo(74, -6, 66, -12, 54, -14.5);
    ctx.bezierCurveTo(32, -18.5, -2, -19.5, -30, -18);
    ctx.bezierCurveTo(-48, -16.5, -60, -11, -66, -3.5);
    ctx.bezierCurveTo(-68, -1, -68, 1, -66, 3.5);
    ctx.bezierCurveTo(-60, 11, -48, 16.5, -30, 18);
    ctx.bezierCurveTo(-2, 19.5, 32, 18.5, 54, 14.5);
    ctx.bezierCurveTo(66, 12, 74, 6, 74, 0);
    ctx.closePath();
  }

  draw(ctx, time) {
    if (!this.alive) return;

    const blink = this.invuln > 0 ? 0.4 + 0.6 * Math.abs(Math.sin(time * 22)) : 1;

    ctx.save();
    ctx.globalAlpha = blink;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.pitch * this.facing);
    ctx.scale(this.facing, 1);

    // 艇艏探照灯（窄锥形，弱化卡通感）
    const noseX = this.spec.len * 0.48;
    const lg = ctx.createLinearGradient(noseX, 0, noseX + 174, 0);
    lg.addColorStop(0, 'rgba(140,245,255,0.10)');
    lg.addColorStop(1, 'rgba(140,245,255,0)');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.moveTo(noseX - 2, -5);
    ctx.lineTo(noseX + 174, -38);
    ctx.lineTo(noseX + 174, 38);
    ctx.lineTo(noseX - 2, 5);
    ctx.closePath();
    ctx.fill();

    if (this.kind === 'nuclear') this.drawNuclearBody(ctx, time);
    else this.drawDieselBody(ctx, time);

    // 受击红闪（裁剪在艇体内）
    if (this.hitFlash > 0) {
      ctx.save();
      this.hullPath(ctx);
      ctx.clip();
      ctx.fillStyle = Utils.rgba(CFG.COLORS.dangerRGB, this.hitFlash * 0.65);
      ctx.fillRect(-90, -24, 180, 48);
      ctx.restore();
    }

    ctx.restore();

    // 无敌护盾环
    if (this.invuln > 0) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(time * 1.8);
      ctx.setLineDash([7, 8]);
      ctx.strokeStyle = 'rgba(95,242,255,0.5)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, 0, this.spec.radius + 20, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  /* 柴电潜艇艇体细节（保持原有视觉） */
  drawDieselBody(ctx, time) {
    // 七叶螺旋桨
    ctx.save();
    ctx.translate(-57, 0);
    ctx.rotate(time * 12);
    ctx.strokeStyle = 'rgba(170,246,255,0.55)';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 7; i++) {
      ctx.save();
      ctx.rotate((Math.PI * 2 * i) / 7);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(2.2, -5.8, 6.8, -10.6);
      ctx.quadraticCurveTo(7.4, -6.4, 3.2, 0);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = 'rgba(8,20,28,0.95)';
    ctx.beginPath();
    ctx.arc(0, 0, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 尾轴
    ctx.strokeStyle = 'rgba(95,242,255,0.28)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-48, 0);
    ctx.lineTo(-56, 0);
    ctx.stroke();

    // X 形尾舵
    ctx.fillStyle = CFG.COLORS.hullDark;
    ctx.strokeStyle = 'rgba(95,242,255,0.3)';
    ctx.lineWidth = 1;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(-36, s * 11);
      ctx.lineTo(-53, s * 24);
      ctx.lineTo(-46, s * 26);
      ctx.lineTo(-30, s * 13);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // 艇体
    ctx.shadowColor = 'rgba(95,242,255,0.42)';
    ctx.shadowBlur = 12;
    const hull = ctx.createLinearGradient(0, -18, 0, 18);
    hull.addColorStop(0, '#2b6b82');
    hull.addColorStop(0.34, '#17485c');
    hull.addColorStop(0.68, CFG.COLORS.hullMid);
    hull.addColorStop(1, CFG.COLORS.hullDark);
    ctx.fillStyle = hull;
    this.hullPath(ctx);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = 'rgba(95,242,255,0.7)';
    ctx.lineWidth = 1.1;
    this.hullPath(ctx);
    ctx.stroke();

    // 艇艏声呐罩浅色渐变
    ctx.save();
    this.hullPath(ctx);
    ctx.clip();
    const nose = ctx.createLinearGradient(58, 0, 34, 0);
    nose.addColorStop(0, 'rgba(150,240,255,0.12)');
    nose.addColorStop(1, 'rgba(150,240,255,0)');
    ctx.fillStyle = nose;
    ctx.fillRect(34, -18, 26, 36);
    ctx.restore();

    // 顶部高光
    ctx.strokeStyle = 'rgba(210,252,255,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, -10.2);
    ctx.quadraticCurveTo(8, -15.6, -30, -13.4);
    ctx.stroke();

    // 消声瓦分缝
    ctx.strokeStyle = 'rgba(0,0,0,0.24)';
    ctx.lineWidth = 0.8;
    for (const sx of [-30, -17, -4, 9, 22]) {
      ctx.beginPath();
      ctx.moveTo(sx, -13);
      ctx.quadraticCurveTo(sx + 1.6, 0, sx, 12.5);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(-34, 8);
    ctx.quadraticCurveTo(0, 11, 28, 8);
    ctx.stroke();

    // 侧舷声呐阵列
    ctx.fillStyle = 'rgba(3,12,18,0.6)';
    Utils.roundRect(ctx, -29, 5.4, 47, 4.2, 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(95,242,255,0.18)';
    ctx.lineWidth = 0.7;
    for (let i = 1; i < 8; i++) {
      const sx = -29 + i * 5.9;
      ctx.beginPath();
      ctx.moveTo(sx, 5.8);
      ctx.lineTo(sx, 9.2);
      ctx.stroke();
    }

    // 鱼雷发射管舱门
    for (const sy of [-4.6, 4.6]) {
      ctx.fillStyle = 'rgba(3,12,18,0.55)';
      Utils.roundRect(ctx, 31, sy - 1.5, 8, 3, 1.4);
      ctx.fill();
      ctx.strokeStyle = 'rgba(150,245,255,0.28)';
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }

    // 艏部声呐罩分缝
    ctx.strokeStyle = 'rgba(150,245,255,0.25)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(44, -10.2);
    ctx.quadraticCurveTo(40, 0, 44, 10.2);
    ctx.stroke();

    // 围壳
    const sail = ctx.createLinearGradient(0, -35, 0, -13);
    sail.addColorStop(0, '#2a6379');
    sail.addColorStop(1, '#0b2433');
    ctx.fillStyle = sail;
    ctx.strokeStyle = 'rgba(95,242,255,0.62)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(2, -13);
    ctx.lineTo(5.5, -31);
    ctx.quadraticCurveTo(7, -34.5, 11, -34.5);
    ctx.lineTo(25, -34.5);
    ctx.quadraticCurveTo(29, -34.5, 29.5, -31);
    ctx.lineTo(31, -13);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 围壳舵
    ctx.fillStyle = 'rgba(9,30,42,0.95)';
    ctx.strokeStyle = 'rgba(95,242,255,0.36)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(5, -19.5);
    ctx.lineTo(43, -18.2);
    ctx.lineTo(43, -15.4);
    ctx.lineTo(6, -15.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 潜望镜与通气管
    ctx.strokeStyle = 'rgba(160,248,255,0.6)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(12, -34);
    ctx.lineTo(12, -47);
    ctx.lineTo(16, -47);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(21, -34);
    ctx.lineTo(21, -44);
    ctx.lineTo(18, -44);
    ctx.stroke();

    // 围壳驾驶窗
    ctx.fillStyle = 'rgba(4,14,20,0.9)';
    ctx.strokeStyle = 'rgba(120,242,255,0.3)';
    ctx.lineWidth = 0.6;
    for (const wx of [9, 17]) {
      Utils.roundRect(ctx, wx, -31.5, 6, 3, 1);
      ctx.fill();
      ctx.stroke();
    }

    // 围壳信号灯
    const sig = 0.25 + 0.35 * Math.abs(Math.sin(time * 2.6));
    ctx.fillStyle = `rgba(255,200,87,${sig})`;
    ctx.beginPath();
    ctx.arc(27, -23, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }

  /* 核潜艇（093A 参考）艇体细节 */
  drawNuclearBody(ctx, time) {
    // 七叶螺旋桨
    ctx.save();
    ctx.translate(-74, 0);
    ctx.scale(1.22, 1.22);
    ctx.rotate(time * 11);
    ctx.strokeStyle = 'rgba(170,246,255,0.5)';
    ctx.lineWidth = 1.1;
    for (let i = 0; i < 7; i++) {
      ctx.save();
      ctx.rotate((Math.PI * 2 * i) / 7);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(2.2, -5.8, 6.8, -10.6);
      ctx.quadraticCurveTo(7.4, -6.4, 3.2, 0);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = 'rgba(6,14,20,0.95)';
    ctx.beginPath();
    ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 尾轴
    ctx.strokeStyle = 'rgba(95,242,255,0.25)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-60, 0);
    ctx.lineTo(-72, 0);
    ctx.stroke();

    // X 形尾舵
    ctx.fillStyle = CFG.COLORS.hullDark;
    ctx.strokeStyle = 'rgba(95,242,255,0.28)';
    ctx.lineWidth = 1;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(-42, s * 12);
      ctx.lineTo(-62, s * 27);
      ctx.lineTo(-54, s * 29);
      ctx.lineTo(-36, s * 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // 长水滴形艇体
    ctx.shadowColor = 'rgba(95,242,255,0.38)';
    ctx.shadowBlur = 14;
    const hull = ctx.createLinearGradient(0, -20, 0, 20);
    hull.addColorStop(0, '#4a6a76');
    hull.addColorStop(0.34, '#244a58');
    hull.addColorStop(0.68, '#11293a');
    hull.addColorStop(1, '#06121a');
    ctx.fillStyle = hull;
    this.hullPath(ctx);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = 'rgba(95,242,255,0.68)';
    ctx.lineWidth = 1.1;
    this.hullPath(ctx);
    ctx.stroke();

    // 艇艏声呐罩浅色渐变
    ctx.save();
    this.hullPath(ctx);
    ctx.clip();
    const nose = ctx.createLinearGradient(74, 0, 46, 0);
    nose.addColorStop(0, 'rgba(150,240,255,0.13)');
    nose.addColorStop(1, 'rgba(150,240,255,0)');
    ctx.fillStyle = nose;
    ctx.fillRect(46, -22, 30, 44);
    ctx.restore();

    // 顶部高光
    ctx.strokeStyle = 'rgba(210,252,255,0.36)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(52, -14.5);
    ctx.quadraticCurveTo(10, -19.5, -40, -17.5);
    ctx.stroke();

    // 消声瓦分缝
    ctx.strokeStyle = 'rgba(0,0,0,0.24)';
    ctx.lineWidth = 0.8;
    for (const sx of [-40, -27, -14, -1, 12, 25, 38]) {
      ctx.beginPath();
      ctx.moveTo(sx, -18);
      ctx.quadraticCurveTo(sx + 1.6, 0, sx, 17.5);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(-46, 9);
    ctx.quadraticCurveTo(0, 12.5, 44, 9);
    ctx.stroke();

    // 侧舷声呐阵列
    ctx.fillStyle = 'rgba(3,12,18,0.6)';
    Utils.roundRect(ctx, -40, 6, 66, 4.6, 2.2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(95,242,255,0.18)';
    ctx.lineWidth = 0.7;
    for (let i = 1; i < 11; i++) {
      const sx = -40 + i * 6;
      ctx.beginPath();
      ctx.moveTo(sx, 6.4);
      ctx.lineTo(sx, 10.2);
      ctx.stroke();
    }

    // 鱼雷发射管舱门（4 个）
    for (const sy of [-8.5, -3.5, 3.5, 8.5]) {
      ctx.fillStyle = 'rgba(3,12,18,0.55)';
      Utils.roundRect(ctx, 46, sy - 1.3, 8, 2.6, 1.2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(150,245,255,0.28)';
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }

    // 艏部声呐罩分缝
    ctx.strokeStyle = 'rgba(150,245,255,0.25)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(58, -13.2);
    ctx.quadraticCurveTo(53, 0, 58, 13.2);
    ctx.stroke();

    // 背部导弹发射舱盖（3 个）
    for (let i = 0; i < 3; i++) {
      const hx = -40 + i * 11;
      ctx.fillStyle = 'rgba(4,14,20,0.75)';
      Utils.roundRect(ctx, hx, -18.8, 7, 2.8, 1);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,200,87,0.38)';
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }

    // 围壳
    const sail = ctx.createLinearGradient(0, -42, 0, -15);
    sail.addColorStop(0, '#3d6270');
    sail.addColorStop(1, '#0a2230');
    ctx.fillStyle = sail;
    ctx.strokeStyle = 'rgba(95,242,255,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(14, -15);
    ctx.lineTo(19, -39);
    ctx.quadraticCurveTo(20, -42, 24, -42);
    ctx.lineTo(42, -42);
    ctx.quadraticCurveTo(46, -42, 46.5, -38);
    ctx.lineTo(49, -15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 围壳舵（fairwater planes）
    ctx.fillStyle = 'rgba(9,30,42,0.95)';
    ctx.strokeStyle = 'rgba(95,242,255,0.36)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(18, -26.5);
    ctx.lineTo(62, -24.8);
    ctx.lineTo(62, -22.4);
    ctx.lineTo(19, -23.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 桅杆
    ctx.strokeStyle = 'rgba(160,248,255,0.6)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(24, -42);
    ctx.lineTo(24, -54);
    ctx.lineTo(29, -54);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(35, -42);
    ctx.lineTo(35, -50);
    ctx.lineTo(32, -50);
    ctx.stroke();

    // 围壳驾驶窗
    ctx.fillStyle = 'rgba(4,14,20,0.9)';
    ctx.strokeStyle = 'rgba(120,242,255,0.3)';
    ctx.lineWidth = 0.6;
    for (const wx of [23, 32]) {
      Utils.roundRect(ctx, wx, -39.5, 6, 3, 1);
      ctx.fill();
      ctx.stroke();
    }

    // 围壳信号灯
    const sig = 0.25 + 0.35 * Math.abs(Math.sin(time * 2.4));
    ctx.fillStyle = `rgba(255,200,87,${sig})`;
    ctx.beginPath();
    ctx.arc(44, -29, 1.3, 0, Math.PI * 2);
    ctx.fill();

    // 舷号（仅正朝向时绘制，避免镜像文字）
    if (this.facing === 1) {
      ctx.font = '8px monospace';
      ctx.fillStyle = 'rgba(210,245,255,0.22)';
      ctx.textAlign = 'center';
      ctx.fillText('093A', -4, 2);
      ctx.textAlign = 'left';
    }
  }
}

/* ---------------- 水雷 ---------------- */
class Mine {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.state = 'rising';        // rising → armed → sinking
    this.fuse = CFG.MINE.ARM_TIME;
    this.bob = Utils.rand(0, Math.PI * 2);
    this.t = 0;
    this.sinkT = 0;
    this.alpha = 1;
    this.dead = false;
    this.trailTimer = 0;
  }

  isArmed() {
    return this.state === 'armed';
  }

  update(dt) {
    const M = CFG.MINE;
    this.t += dt;

    if (this.state === 'rising') {
      this.y -= M.RISE_SPEED * dt;
      this.x += Math.sin(this.t * 8) * 12 * dt;

      this.trailTimer -= dt;
      if (this.trailTimer <= 0) {
        this.trailTimer = 0.07;
        FX.bubble(this.x, this.y + 12, 1, { spread: 3, speed: 20, size: 1.1 });
      }

      if (this.y <= CFG.SURFACE_Y) {
        this.y = CFG.SURFACE_Y;
        this.state = 'armed';
        this.fuse = M.ARM_TIME;
        AudioSys.play('mine_armed');
        FX.ring(this.x, CFG.SURFACE_Y, {
          maxR: 24, life: 0.35, width: 1.4, rgb: CFG.COLORS.cyanRGB
        });
      }
    } else if (this.state === 'armed') {
      this.fuse -= dt;
      if (this.fuse <= 0) {
        this.state = 'sinking';
        this.sinkT = 0;
        AudioSys.play('mine_expire');
        FX.bubble(this.x, this.y, 4, { spread: 5, speed: 18, size: 1.2 });
      }
    } else if (this.state === 'sinking') {
      this.sinkT += dt;
      this.y += 34 * dt;
      this.alpha = Math.max(0, 1 - this.sinkT / M.SINK_TIME);
      if (this.sinkT >= M.SINK_TIME) this.dead = true;
    }
  }

  draw(ctx, time) {
    const M = CFG.MINE;
    const y = this.state === 'armed'
      ? this.y + Math.sin(time * M.BOB_SPEED + this.bob) * M.BOB_AMP
      : this.y;

    ctx.save();
    ctx.globalAlpha = this.alpha;

    // 光晕
    const glow = ctx.createRadialGradient(this.x, y, 2, this.x, y, 28);
    glow.addColorStop(0, 'rgba(255,200,87,0.38)');
    glow.addColorStop(0.5, 'rgba(255,200,87,0.1)');
    glow.addColorStop(1, 'rgba(255,200,87,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(this.x, y, 28, 0, Math.PI * 2);
    ctx.fill();

    // 引信环
    if (this.state === 'armed') {
      const ratio = Utils.clamp(this.fuse / M.ARM_TIME, 0, 1);
      const hot = this.fuse < 0.65;
      ctx.strokeStyle = 'rgba(95,242,255,0.16)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(this.x, y, 21, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = hot ? CFG.COLORS.danger : CFG.COLORS.amber;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(this.x, y, 21, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
      ctx.stroke();
    }

    // 尖刺
    ctx.strokeStyle = 'rgba(180,235,245,0.8)';
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8 + this.bob;
      ctx.beginPath();
      ctx.moveTo(this.x + Math.cos(a) * 9, y + Math.sin(a) * 9);
      ctx.lineTo(this.x + Math.cos(a) * 16, y + Math.sin(a) * 16);
      ctx.stroke();
    }

    // 雷体
    const body = ctx.createRadialGradient(this.x - 3, y - 3, 1, this.x, y, 10);
    body.addColorStop(0, '#3d5b68');
    body.addColorStop(0.6, '#1b303a');
    body.addColorStop(1, '#080f14');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(this.x, y, 9.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(95,242,255,0.55)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 信号灯
    const blink = 0.45 + 0.55 * Math.abs(Math.sin(time * 9 + this.bob));
    ctx.fillStyle = this.state === 'sinking'
      ? 'rgba(120,140,150,0.4)'
      : `rgba(255,200,87,${blink})`;
    ctx.beginPath();
    ctx.arc(this.x, y, 2.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

/* ---------------- 潜射导弹 ---------------- */
class Missile {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.state = 'rising';        // rising → cruise → lost
    this.target = null;
    this.dead = false;
    this.t = 0;
    this.angle = -Math.PI / 2;
    this.trailTimer = 0;
    this.sparkTimer = 0;
  }

  update(dt, game) {
    const M = CFG.MISSILE;
    this.t += dt;

    if (this.state === 'rising') {
      this.y -= M.RISE_SPEED * dt;
      this.angle = -Math.PI / 2;

      this.trailTimer -= dt;
      if (this.trailTimer <= 0) {
        this.trailTimer = 0.06;
        FX.bubble(this.x, this.y + 12, 1, { spread: 3, speed: 24, size: 1.2 });
      }

      if (this.y <= CFG.SURFACE_Y) {
        this.y = CFG.SURFACE_Y;
        this.state = 'cruise';
        this.target = game.nearestShip(this.x, M.LOCK_RANGE);
        FX.splash(this.x, CFG.SURFACE_Y);
        FX.ring(this.x, CFG.SURFACE_Y, {
          maxR: 44, life: 0.5, width: 1.8, rgb: CFG.COLORS.cyanRGB
        });
        AudioSys.play('missile_breach');

        if (this.target) {
          this.angle = this.target.x >= this.x ? 0 : Math.PI;
        } else {
          this.state = 'lost';
          this.angle = -Math.PI / 2;
        }
      }
      return;
    }

    if (this.state === 'lost') {
      this.y -= M.LOST_CLIMB_SPEED * dt;
      this.angle = -Math.PI / 2;
      if (this.y < -60) this.dead = true;
      return;
    }

    // 巡航：目标失效则重新锁定
    if (
      !this.target ||
      this.target.sinking ||
      this.target.escaped ||
      !game.destroyers.includes(this.target)
    ) {
      this.target = game.nearestShip(this.x, M.LOCK_RANGE);
      if (!this.target) {
        this.state = 'lost';
        this.angle = -Math.PI / 2;
        return;
      }
    }

    const dx = this.target.x - this.x;
    const dir = dx >= 0 ? 1 : -1;
    const step = M.CRUISE_SPEED * dt;
    if (Math.abs(dx) <= step) this.x = this.target.x;
    else this.x += dir * step;

    const near = Math.abs(this.target.x - this.x) <= 96;
    this.y = Utils.damp(this.y, near ? CFG.SURFACE_Y - 4 : M.CRUISE_Y, near ? 9 : 5, dt);

    // 最短路径转向，末段略微俯冲
    let targetAngle = near
      ? (dir > 0 ? 0.28 : Math.PI + 0.28)
      : (dir > 0 ? 0 : Math.PI);
    let diff = targetAngle - this.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.angle += diff * (1 - Math.exp(-8 * dt));

    // 尾迹
    this.trailTimer -= dt;
    if (this.trailTimer <= 0) {
      this.trailTimer = 0.045;
      FX.smoke(this.x - dir * 9, this.y + 2, 1);
    }
    this.sparkTimer -= dt;
    if (this.sparkTimer <= 0) {
      this.sparkTimer = 0.08;
      FX.spark(this.x - dir * 9, this.y + 1, 2, { rgb: CFG.COLORS.amberRGB, speed: 50 });
    }

    if (Math.abs(this.target.x - this.x) <= 24) {
      this.x = this.target.x;
      game.missileExplode(this);
    }
  }

  draw(ctx, time) {
    const flicker = 1 + Math.sin(time * 38 + this.t * 7) * 0.22;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // 尾焰
    const flame = ctx.createLinearGradient(-9, 0, -9 - 20 * flicker, 0);
    flame.addColorStop(0, 'rgba(255,240,180,0.9)');
    flame.addColorStop(0.4, 'rgba(255,160,60,0.7)');
    flame.addColorStop(1, 'rgba(255,80,40,0)');
    ctx.fillStyle = flame;
    ctx.beginPath();
    ctx.moveTo(-8.5, -3);
    ctx.lineTo(-8.5 - 20 * flicker, 0);
    ctx.lineTo(-8.5, 3);
    ctx.closePath();
    ctx.fill();

    // 弹体光晕
    ctx.shadowColor = 'rgba(255,190,90,0.55)';
    ctx.shadowBlur = 12;
    const body = ctx.createLinearGradient(0, -3.4, 0, 3.4);
    body.addColorStop(0, '#f4f8f9');
    body.addColorStop(0.5, '#a9bbc3');
    body.addColorStop(1, '#4a5f69');
    ctx.fillStyle = body;
    Utils.roundRect(ctx, -9, -3.4, 18, 6.8, 2.4);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 弹头
    ctx.fillStyle = '#1f3038';
    ctx.beginPath();
    ctx.moveTo(8.5, -3.4);
    ctx.lineTo(14, 0);
    ctx.lineTo(8.5, 3.4);
    ctx.closePath();
    ctx.fill();

    // 尾翼
    ctx.fillStyle = '#16262e';
    ctx.beginPath();
    ctx.moveTo(-7, -3.2);
    ctx.lineTo(-13, -6.6);
    ctx.lineTo(-8, 0);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-7, 3.2);
    ctx.lineTo(-13, 6.6);
    ctx.lineTo(-8, 0);
    ctx.closePath();
    ctx.fill();

    // 青色轮廓
    ctx.strokeStyle = 'rgba(95,242,255,0.55)';
    ctx.lineWidth = 0.8;
    Utils.roundRect(ctx, -9, -3.4, 18, 6.8, 2.4);
    ctx.stroke();

    ctx.restore();
  }
}

/* ---------------- 深水炸弹 ---------------- */
class DepthCharge {
  constructor(x, depth, game) {
    this.baseX = x;
    this.x = x;
    this.y = CFG.SURFACE_Y;
    this.depth = depth;
    this.t = Utils.rand(0, Math.PI * 2);
    this.warn = -1;
    this.dead = false;
    this.canceled = false;
    this.cancelT = 0;
    this.alpha = 1;
    this.game = game;
    this.bubbleTimer = 0;
  }

  cancel() {
    if (this.canceled) return;
    this.canceled = true;
    this.cancelT = 0;
  }

  update(dt) {
    this.t += dt;

    if (this.canceled) {
      this.cancelT += dt;
      this.alpha = Math.max(0, 1 - this.cancelT / 0.4);
      if (this.cancelT >= 0.4) this.dead = true;
      return;
    }

    this.y += CFG.CHARGE.SINK_SPEED * dt;
    this.x = this.baseX + Math.sin(this.t * 2.2) * 7;

    const remain = (this.depth - this.y) / CFG.CHARGE.SINK_SPEED;
    this.warn = remain <= CFG.CHARGE.WARNING ? Math.max(remain, 0) : -1;

    this.bubbleTimer -= dt;
    if (this.bubbleTimer <= 0) {
      this.bubbleTimer = 0.09;
      FX.bubble(this.x, this.y - 6, 1, { spread: 3, speed: 22, size: 1.1 });
    }

    if (this.y >= this.depth) {
      this.dead = true;
      this.game.onChargeExplode(this);
    }
  }

  draw(ctx, time) {
    const C = CFG.CHARGE;

    if (!this.canceled) {
      // 预测爆炸圈
      const warnHot = this.warn >= 0;
      const a = warnHot
        ? 0.26 + 0.38 * Math.abs(Math.sin(time * 18))
        : 0.1;
      ctx.save();
      ctx.setLineDash([6, 8]);
      ctx.strokeStyle = Utils.rgba(CFG.COLORS.dangerRGB, a);
      ctx.lineWidth = warnHot ? 2 : 1.2;
      ctx.beginPath();
      ctx.arc(this.x, this.depth, C.BLAST_RADIUS, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // 下沉导轨
      ctx.strokeStyle = 'rgba(255,77,109,0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(this.x, CFG.SURFACE_Y);
      ctx.lineTo(this.x, this.depth);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.translate(this.x, this.y);

    // 桶体
    ctx.fillStyle = '#18232a';
    ctx.strokeStyle = 'rgba(255,77,109,0.7)';
    ctx.lineWidth = 1;
    Utils.roundRect(ctx, -5, -11, 10, 22, 3);
    ctx.fill();
    ctx.stroke();

    // 尾翼
    ctx.fillStyle = '#0d151a';
    ctx.fillRect(-8, -14, 16, 3);
    ctx.fillRect(-8, 8, 16, 3);

    // 红色信号灯
    const blink = 0.35 + 0.65 * Math.abs(Math.sin(time * (this.warn >= 0 ? 22 : 7)));
    ctx.fillStyle = Utils.rgba(CFG.COLORS.dangerRGB, blink);
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

/* ---------------- 驱逐舰 ---------------- */
class Destroyer {
  constructor(entry, level) {
    const cls = CFG.SHIPS[entry.type];

    this.type = entry.type;
    this.cls = cls;
    this.len = cls.len;
    this.beam = cls.beam;
    this.maxHp = cls.hp;
    this.hp = cls.hp;
    this.speed = cls.speed * level.speedMul * (entry.fast ? cls.fast : 1);
    this.interval = cls.drop * level.intervalMul;
    this.quota = cls.quota;
    this.dir = entry.dir === -1 ? -1 : 1;
    this.alignedPass = false;

    this.x = this.dir > 0
      ? -this.len / 2 - Utils.rand(0, 30)
      : CFG.W + this.len / 2 + Utils.rand(0, 30);
    this.y = CFG.SURFACE_Y;
    this.phase = Utils.rand(0, Math.PI * 2);
    this.dropTimer = Utils.rand(0.8, 1.6);
    this.hitFlash = 0;
    this.sinking = false;
    this.sinkT = 0;
    this.dead = false;
    this.escaped = false;
    this.wakeTimer = 0;
    this.smokeTimer = 0;
  }

  /* 舰尾端点世界坐标：深弹只从这里投放 */
  sternX() {
    return this.x - this.dir * this.len / 2;
  }

  update(dt, game) {
    this.phase += dt;

    if (this.sinking) {
      this.sinkT += dt;
      this.x += this.dir * 8 * dt;
      this.y = CFG.SURFACE_Y + this.sinkT * 44;

      this.smokeTimer -= dt;
      if (this.smokeTimer <= 0) {
        this.smokeTimer = 0.12;
        FX.smoke(this.x + Utils.rand(-this.len * 0.3, this.len * 0.2), this.y - this.beam * 0.4, 1);
        FX.bubble(this.x + Utils.rand(-this.len * 0.3, this.len * 0.3), this.y, 2, {
          spread: 8, speed: 26, size: 1.6
        });
        FX.foam(this.x, CFG.SURFACE_Y + 4, 2, { spread: this.len * 0.35 });
      }

      if (this.sinkT >= 1.6) this.dead = true;
      return;
    }

    this.x += this.speed * this.dir * dt;
    this.y = CFG.SURFACE_Y + Math.sin(this.phase * 1.3) * 1.4;
    if (this.hitFlash > 0) this.hitFlash = Math.max(0, this.hitFlash - dt);

    // 投放深水炸弹：只从舰尾释放
    const C = CFG.CHARGE;
    const sternX = this.sternX();
    const sub = game.sub;
    const aligned = !!(sub && sub.alive && Math.abs(sternX - sub.x) <= C.AIM_X_SPREAD);

    // 舰尾过顶：在满足最小间隔时提前投下一枚瞄准弹
    if (!aligned) {
      this.alignedPass = false;
    } else if (!this.alignedPass) {
      this.alignedPass = true;
      if (this.quota > 0) {
        const elapsed = this.interval - this.dropTimer;
        if (elapsed >= this.interval * C.ATTACK_MIN_ELAPSED) {
          this.dropTimer = Math.min(this.dropTimer, C.ATTACK_DELAY);
        }
      }
    }

    if (this.quota > 0 && sternX > C.DROP_MIN_X && sternX < C.DROP_MAX_X) {
      this.dropTimer -= dt;
      if (this.dropTimer <= 0) {
        this.quota--;
        this.dropTimer = this.interval * Utils.rand(0.85, 1.15);
        game.dropDepthCharge(sternX, aligned);
      }
    }

    // 舰尾尾流与舰艏泡沫
    this.wakeTimer -= dt;
    if (this.wakeTimer <= 0) {
      this.wakeTimer = 0.09;
      FX.foam(this.x - this.dir * this.len * 0.42, CFG.SURFACE_Y + this.beam * 0.35, 1, { spread: 4 });
      FX.foam(this.x + this.dir * this.len * 0.44, CFG.SURFACE_Y + 2, 1, { spread: 3 });
    }

    // 受损冒烟
    if (this.hp < this.maxHp) {
      this.smokeTimer -= dt;
      if (this.smokeTimer <= 0) {
        this.smokeTimer = 0.22;
        FX.smoke(this.x + Utils.rand(-this.len * 0.2, this.len * 0.2), this.y - this.beam, 1);
      }
    }

    if (this.dir > 0 ? this.x > CFG.W + this.len / 2 : this.x < -this.len / 2) {
      this.escaped = true;
    }
  }

  /* 返回 true 表示这一击造成击沉 */
  hit(dmg) {
    if (this.sinking) return false;
    this.hp -= dmg;
    this.hitFlash = 0.38;
    if (this.hp <= 0) {
      this.hp = 0;
      this.sinking = true;
      this.sinkT = 0;
      this.quota = 0;
      return true;
    }
    return false;
  }

  /* 倾斜艏柱 + 方形舰尾的写实舰体轮廓 */
  hullPath(ctx) {
    const hl = this.len / 2;
    const bh = this.beam / 2;
    ctx.beginPath();
    ctx.moveTo(-hl * 0.98, -bh * 0.62);
    ctx.lineTo(-hl * 0.9, -bh * 0.96);
    ctx.quadraticCurveTo(-hl * 0.45, -bh * 1.06, -hl * 0.05, -bh * 1.03);
    ctx.quadraticCurveTo(hl * 0.5, -bh * 1.02, hl * 0.8, -bh * 0.88);
    ctx.quadraticCurveTo(hl * 0.95, -bh * 0.78, hl * 0.99, -bh * 0.42);
    ctx.lineTo(hl * 0.88, -bh * 0.02);
    ctx.quadraticCurveTo(hl * 0.74, bh * 0.58, hl * 0.44, bh * 0.8);
    ctx.quadraticCurveTo(hl * 0.1, bh * 0.96, -hl * 0.5, bh * 0.9);
    ctx.lineTo(-hl * 0.92, bh * 0.7);
    ctx.lineTo(-hl * 0.98, bh * 0.2);
    ctx.closePath();
  }

  drawHull(ctx) {
    const hl = this.len / 2;
    const bh = this.beam / 2;

    const hull = ctx.createLinearGradient(0, -bh, 0, bh);
    hull.addColorStop(0, '#2a3b46');
    hull.addColorStop(0.42, CFG.COLORS.shipMid);
    hull.addColorStop(0.72, '#0f1a20');
    hull.addColorStop(1, CFG.COLORS.shipDark);
    ctx.fillStyle = hull;
    this.hullPath(ctx);
    ctx.fill();

    ctx.strokeStyle = 'rgba(95,242,255,0.62)';
    ctx.lineWidth = 1.1;
    this.hullPath(ctx);
    ctx.stroke();

    // 主甲板线
    ctx.strokeStyle = 'rgba(95,242,255,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-hl * 0.9, -bh * 0.95);
    ctx.lineTo(hl * 0.78, -bh * 0.88);
    ctx.stroke();

    // 水线与防污漆带
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = Math.max(2, bh * 0.12);
    ctx.beginPath();
    ctx.moveTo(-hl * 0.9, bh * 0.4);
    ctx.lineTo(hl * 0.78, bh * 0.32);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(140,70,58,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-hl * 0.9, bh * 0.47);
    ctx.lineTo(hl * 0.78, bh * 0.39);
    ctx.stroke();

    // 钢板分缝
    ctx.strokeStyle = 'rgba(0,0,0,0.28)';
    ctx.lineWidth = 0.8;
    for (const sx of [-0.62, -0.34, -0.05, 0.24, 0.5]) {
      ctx.beginPath();
      ctx.moveTo(hl * sx, -bh * 0.94);
      ctx.quadraticCurveTo(hl * sx + 2, 0, hl * sx, bh * 0.85);
      ctx.stroke();
    }

    // 艏部声呐导流罩弧线
    ctx.strokeStyle = 'rgba(120,220,240,0.22)';
    ctx.beginPath();
    ctx.moveTo(hl * 0.62, -bh * 0.2);
    ctx.quadraticCurveTo(hl * 0.76, bh * 0.32, hl * 0.86, bh * 0.7);
    ctx.stroke();

    // 锚穴与锚链
    ctx.fillStyle = 'rgba(2,8,12,0.9)';
    ctx.beginPath();
    ctx.ellipse(hl * 0.76, -bh * 0.66, 3.6, 2, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(160,230,245,0.28)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(hl * 0.75, -bh * 0.55);
    ctx.lineTo(hl * 0.7, bh * 0.1);
    ctx.stroke();

    // 舷号：右→左航行的舰船只展示另一侧，避免镜像文字
    if (this.dir === 1) {
      ctx.font = `${Math.max(7, Math.round(bh * 0.42))}px monospace`;
      ctx.fillStyle = 'rgba(210,245,255,0.3)';
      ctx.textAlign = 'center';
      ctx.fillText(this.cls.hullNo, hl * 0.32, bh * 0.62);
      ctx.textAlign = 'left';
    }
  }

  drawSuperstructure(ctx, time) {
    const hl = this.len / 2;
    const bh = this.beam / 2;
    const deck = -bh * 0.98;
    const isPatrol = this.type === 'patrol';
    const isHeavy = this.type === 'heavy';

    // 前部舰桥：斜面艏壁、平顶
    const topY = -bh * 1.9;
    ctx.fillStyle = '#1b2c36';
    ctx.strokeStyle = 'rgba(95,242,255,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-hl * 0.2, deck);
    ctx.lineTo(-hl * 0.2, -bh * 1.62);
    ctx.lineTo(-hl * 0.02, -bh * 1.74);
    ctx.lineTo(hl * 0.16, topY);
    ctx.lineTo(hl * 0.31, topY);
    ctx.lineTo(hl * 0.38, deck);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 舰桥顶面高光
    ctx.strokeStyle = 'rgba(190,245,255,0.28)';
    ctx.beginPath();
    ctx.moveTo(-hl * 0.02, -bh * 1.74);
    ctx.lineTo(hl * 0.16, topY);
    ctx.lineTo(hl * 0.31, topY);
    ctx.stroke();

    // 驾驶室窗带（弱青光）
    ctx.fillStyle = 'rgba(120,242,255,0.7)';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(hl * 0.05 + i * hl * 0.05, -bh * 1.7, Math.max(2, hl * 0.032), 2.2);
    }

    // 相控阵雷达板
    if (!isPatrol) {
      ctx.fillStyle = 'rgba(8,22,30,0.9)';
      ctx.strokeStyle = 'rgba(95,242,255,0.24)';
      ctx.lineWidth = 0.7;
      const panels = [[-hl * 0.14, -hl * 0.01], [hl * 0.035, hl * 0.17]];
      for (const [x0, x1] of panels) {
        ctx.beginPath();
        ctx.moveTo(x0, -bh * 1.56);
        ctx.lineTo(x1, -bh * 1.6);
        ctx.lineTo(x1, -bh * 1.2);
        ctx.lineTo(x0, -bh * 1.16);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    // 前甲板垂发舱盖
    if (!isPatrol) {
      const vx0 = hl * 0.44;
      const vx1 = hl * 0.62;
      ctx.fillStyle = 'rgba(6,16,22,0.95)';
      ctx.fillRect(vx0, deck - 2.4, vx1 - vx0, 3.2);
      ctx.strokeStyle = 'rgba(95,242,255,0.22)';
      ctx.lineWidth = 0.6;
      ctx.strokeRect(vx0, deck - 2.4, vx1 - vx0, 3.2);
      const cellW = (vx1 - vx0 - 3) / 8;
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = 'rgba(70,120,140,0.35)';
        ctx.fillRect(vx0 + 1.5 + i * cellW, deck - 1.8, Math.max(1.6, cellW - 1.2), 2);
      }
    }

    // 舰炮
    const gx = hl * 0.7;
    ctx.fillStyle = '#16262f';
    ctx.strokeStyle = 'rgba(95,242,255,0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gx - bh * 0.4, deck);
    ctx.lineTo(gx - bh * 0.32, deck - bh * 0.55);
    ctx.lineTo(gx + bh * 0.3, deck - bh * 0.6);
    ctx.lineTo(gx + bh * 0.44, deck);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(190,245,255,0.5)';
    ctx.lineWidth = Math.max(1.2, bh * 0.07);
    ctx.beginPath();
    ctx.moveTo(gx + bh * 0.24, deck - bh * 0.5);
    ctx.lineTo(gx + hl * 0.19, deck - bh * 0.78);
    ctx.stroke();

    // 后部机库与飞行甲板
    if (!isPatrol) {
      const hx0 = -hl * 0.72;
      const hx1 = -hl * 0.24;
      const hy = -bh * 1.55;
      ctx.fillStyle = '#182831';
      ctx.strokeStyle = 'rgba(95,242,255,0.42)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(hx0, deck);
      ctx.lineTo(hx0, hy);
      ctx.lineTo(hx1, hy);
      ctx.lineTo(hx1, deck);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = 'rgba(95,242,255,0.2)';
      ctx.beginPath();
      ctx.moveTo(hx0 + hl * 0.03, hy + 1);
      ctx.lineTo(hx0 + hl * 0.03, deck);
      ctx.stroke();

      // 飞行甲板降落圈与 H
      const fx = -hl * 0.85;
      ctx.strokeStyle = 'rgba(210,245,255,0.26)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(fx, deck + 1, hl * 0.11, bh * 0.16, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(fx - 2.2, deck - 1.4);
      ctx.lineTo(fx - 2.2, deck + 3.4);
      ctx.moveTo(fx + 2.2, deck - 1.4);
      ctx.lineTo(fx + 2.2, deck + 3.4);
      ctx.moveTo(fx - 2.2, deck + 1);
      ctx.lineTo(fx + 2.2, deck + 1);
      ctx.stroke();
    }

    // 重型驱逐舰：后部垂发块
    if (isHeavy) {
      const ax0 = -hl * 0.62;
      const ax1 = -hl * 0.4;
      const ay = -bh * 1.72;
      ctx.fillStyle = '#15242c';
      ctx.strokeStyle = 'rgba(95,242,255,0.32)';
      ctx.lineWidth = 0.7;
      Utils.roundRect(ctx, ax0, ay, ax1 - ax0, bh * 0.19, 1.4);
      ctx.fill();
      ctx.stroke();
      const cellW = (ax1 - ax0 - 3) / 6;
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = 'rgba(70,120,140,0.35)';
        ctx.fillRect(ax0 + 1.5 + i * cellW, ay + 1.6, Math.max(1.4, cellW - 1.1), Math.max(1.4, bh * 0.08));
      }
    }

    // 烟囱
    const funnels = isPatrol
      ? [[hl * 0.02, hl * 0.12]]
      : [[-hl * 0.06, hl * 0.03], [-hl * 0.36, -hl * 0.25]];
    for (const [x0, x1] of funnels) {
      const fy = -bh * (isHeavy ? 2.42 : 2.24);
      ctx.fillStyle = '#101d24';
      ctx.strokeStyle = 'rgba(95,242,255,0.38)';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(x0, deck);
      ctx.lineTo(x0 + (x1 - x0) * 0.18, fy);
      ctx.lineTo(x1, fy);
      ctx.lineTo(x1 + (x1 - x0) * 0.08, deck);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,140,60,0.35)';
      ctx.fillRect(x0 + (x1 - x0) * 0.18, fy, (x1 - x0) * 0.8, 1.4);
    }

    // 反舰导弹发射筒
    ctx.save();
    ctx.translate(-hl * 0.12, deck - bh * 0.45);
    ctx.rotate(-0.16);
    ctx.fillStyle = '#0d1c24';
    ctx.strokeStyle = 'rgba(95,242,255,0.3)';
    ctx.lineWidth = 0.7;
    Utils.roundRect(ctx, -hl * 0.12, -1.6, hl * 0.12, 3, 1.4);
    ctx.fill();
    ctx.stroke();
    Utils.roundRect(ctx, -hl * 0.12, 2, hl * 0.12, 3, 1.4);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 前桅
    const mx = hl * (isPatrol ? 0.12 : 0.22);
    const mastTop = -bh * (isHeavy ? 3.75 : (isPatrol ? 3.1 : 3.45));
    const mastBase = -bh * 1.86;
    ctx.strokeStyle = 'rgba(160,248,255,0.55)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(mx - bh * 0.28, mastBase);
    ctx.lineTo(mx, mastTop);
    ctx.moveTo(mx + bh * 0.28, mastBase);
    ctx.lineTo(mx, mastTop);
    ctx.moveTo(mx, mastBase);
    ctx.lineTo(mx, mastTop);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(mx - bh * 0.55, mastTop + bh * 0.3);
    ctx.lineTo(mx + bh * 0.55, mastTop + bh * 0.3);
    ctx.stroke();

    // 桅顶雷达板
    ctx.fillStyle = 'rgba(8,24,32,0.9)';
    ctx.strokeStyle = 'rgba(95,242,255,0.3)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(mx - bh * 0.2, mastTop + bh * 0.12);
    ctx.lineTo(mx + bh * 0.2, mastTop + bh * 0.12);
    ctx.lineTo(mx + bh * 0.14, mastTop + bh * 0.38);
    ctx.lineTo(mx - bh * 0.14, mastTop + bh * 0.38);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 鞭状天线
    ctx.strokeStyle = 'rgba(190,245,255,0.45)';
    ctx.beginPath();
    ctx.moveTo(mx + bh * 0.5, mastTop + bh * 0.3);
    ctx.lineTo(mx + bh * 0.62, mastTop - bh * 0.12);
    ctx.stroke();

    // 桅顶航灯
    const navBlink = Math.sin(time * 4 + this.phase) > 0 ? 0.9 : 0.25;
    ctx.fillStyle = Utils.rgba(CFG.COLORS.dangerRGB, navBlink);
    ctx.beginPath();
    ctx.arc(mx, mastTop - 1.2, 1.6, 0, Math.PI * 2);
    ctx.fill();

    // 后桅
    if (!isPatrol) {
      const ax = -hl * 0.42;
      const atop = -bh * (isHeavy ? 3.05 : 2.82);
      ctx.strokeStyle = 'rgba(160,248,255,0.48)';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(ax, -bh * 1.5);
      ctx.lineTo(ax, atop);
      ctx.moveTo(ax - bh * 0.42, atop + bh * 0.18);
      ctx.lineTo(ax + bh * 0.42, atop + bh * 0.18);
      ctx.stroke();
      ctx.save();
      ctx.translate(ax, atop);
      ctx.fillStyle = '#16262f';
      ctx.strokeStyle = 'rgba(95,242,255,0.35)';
      Utils.roundRect(ctx, -bh * 0.22, -2, bh * 0.44, 3, 1.2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // 近防炮
    if (!isPatrol) {
      const cws = [[-hl * 0.62, -bh * 1.58]];
      if (isHeavy) cws.push([-hl * 0.34, -bh * 1.95]);
      for (const [cx, cy] of cws) {
        ctx.fillStyle = 'rgba(220,240,248,0.85)';
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(2.2, bh * 0.16), Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#16262f';
        ctx.fillRect(cx - 1.6, cy, 3.2, 3);
        ctx.strokeStyle = 'rgba(190,245,255,0.55)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx + 1.4, cy + 1);
        ctx.lineTo(cx + bh * 0.36, cy - 1.5);
        ctx.stroke();
      }
    }

    // 舷侧小艇
    ctx.fillStyle = 'rgba(6,18,24,0.9)';
    ctx.strokeStyle = 'rgba(95,242,255,0.22)';
    ctx.lineWidth = 0.7;
    Utils.roundRect(ctx, -hl * 0.02, deck - 1.5, hl * 0.14, 3.4, 1.6);
    ctx.fill();
    ctx.stroke();

    // 舰尾深弹架：位置与 sternX() 对齐
    const rackX = -hl * 0.9;
    ctx.strokeStyle = 'rgba(95,242,255,0.35)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(rackX, deck);
    ctx.lineTo(rackX - hl * 0.11, -bh * 0.05);
    ctx.stroke();
    for (let i = 0; i < 3; i++) {
      const px = rackX - hl * 0.025 - i * Math.max(2.8, bh * 0.2);
      const py = deck + 2 + i * Math.max(1.8, bh * 0.13);
      ctx.fillStyle = '#23343d';
      ctx.strokeStyle = 'rgba(95,242,255,0.25)';
      ctx.lineWidth = 0.6;
      Utils.roundRect(ctx, px - 1.6, py - 2.2, 3.2, 4.8, 1.4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,77,109,0.7)';
      ctx.fillRect(px - 1.6, py - 0.4, 3.2, 0.9);
    }
  }

  draw(ctx, time) {
    const hl = this.len / 2;
    const bh = this.beam / 2;
    const sinkRatio = this.sinking ? Utils.clamp(this.sinkT / 1.6, 0, 1) : 0;

    ctx.save();
    ctx.globalAlpha = this.sinking ? 1 - sinkRatio * 0.55 : 1;
    ctx.translate(this.x, this.y);
    if (this.sinking) ctx.rotate(sinkRatio * 0.22);
    ctx.scale(this.dir, 1);

    // 探照灯
    if (!this.sinking) {
      const cone = ctx.createLinearGradient(0, -bh * 1.6, 0, 330);
      cone.addColorStop(0, 'rgba(140,245,255,0.08)');
      cone.addColorStop(1, 'rgba(140,245,255,0)');
      ctx.fillStyle = cone;
      ctx.beginPath();
      ctx.moveTo(hl * 0.14, -bh * 1.7);
      ctx.lineTo(hl * 0.3, -bh * 1.7);
      ctx.lineTo(hl * 0.58, 300);
      ctx.lineTo(-hl * 0.32, 300);
      ctx.closePath();
      ctx.fill();
    }

    this.drawHull(ctx);
    this.drawSuperstructure(ctx, time);

    // 受击白闪
    if (this.hitFlash > 0) {
      ctx.save();
      ctx.globalAlpha = this.hitFlash * 1.5;
      this.hullPath(ctx);
      ctx.clip();
      ctx.fillStyle = '#e8fbff';
      ctx.fillRect(-hl * 1.02, -bh * 1.1, this.len * 1.04, bh * 2.2);
      ctx.restore();
    }

    // 血条
    if (this.hp < this.maxHp && !this.sinking) {
      const total = this.maxHp * 12 - 3;
      const sx = -total / 2;
      const sy = -bh * 3.9 - 8;
      for (let i = 0; i < this.maxHp; i++) {
        ctx.fillStyle = i < this.hp
          ? 'rgba(255,200,87,0.9)'
          : 'rgba(232,251,255,0.14)';
        ctx.fillRect(sx + i * 12, sy, 9, 3);
      }
    }

    ctx.restore();
  }
}
