/* ============ 数学 / 几何 / 绘制工具 ============ */

const Utils = {
  rand(a, b) { return a + Math.random() * (b - a); },

  randInt(a, b) { return Math.floor(this.rand(a, b + 1)); },

  pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },

  clamp(v, a, b) { return Math.max(a, Math.min(b, v)); },

  lerp(a, b, t) { return a + (b - a) * t; },

  /* 指数趋近：帧率无关的平滑跟随 */
  damp(current, target, lambda, dt) {
    return target + (current - target) * Math.exp(-lambda * dt);
  },

  dist(ax, ay, bx, by) {
    const dx = ax - bx, dy = ay - by;
    return Math.sqrt(dx * dx + dy * dy);
  },

  /* 圆心 vs 轴对齐矩形（rx/ry 为矩形中心） */
  circleRect(cx, cy, r, rx, ry, hw, hh) {
    const dx = Math.abs(cx - rx) - hw;
    const dy = Math.abs(cy - ry) - hh;
    if (dx <= 0 && dy <= 0) return true;
    const nx = Math.max(dx, 0);
    const ny = Math.max(dy, 0);
    return nx * nx + ny * ny <= r * r;
  },

  easeOutCubic(t) {
    const p = 1 - this.clamp(t, 0, 1);
    return 1 - p * p * p;
  },

  /* 数字千分位：123456 → 123,456 */
  fmt(n) {
    return String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  },

  /* [r,g,b] + alpha → rgba 字符串 */
  rgba(rgb, a) {
    return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
  },

  /* 圆角矩形路径（兼容旧浏览器，不依赖 ctx.roundRect） */
  roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
  }
};
