/* ============ 游戏核心：状态机 / 关卡 / 战斗 / 主循环 ============ */

const Game = {
  canvas: null,
  ctx: null,
  frame: null,
  uiRoot: null,
  dpr: 1,
  last: 0,
  time: 0,

  state: 'menu',            // menu / intro / playing / paused / levelclear / dying / gameover / victory
  levelIndex: 0,
  level: null,

  score: 0,
  best: 0,
  lives: CFG.PLAYER.LIVES,
  totalSunk: 0,

  selectedType: 'diesel',
  ammo: CFG.MINE.MAGAZINE,
  reloadTimer: 0,
  fireCd: 0,

  sub: null,
  minesArr: [],
  missiles: [],
  destroyers: [],
  charges: [],

  spawnTimes: [],
  spawnIndex: 0,
  spawnTimer: 0,
  passed: 0,
  sunk: 0,
  levelScoreStart: 0,

  introTimer: 0,
  clearTimer: 0,
  dyingTimer: 0,
  pausedFrom: null,

  /* ================= 初始化 ================= */
  init() {
    this.canvas = document.getElementById('game-canvas');
    this.frame = document.getElementById('frame');
    this.uiRoot = document.getElementById('ui-root');
    this.ctx = this.canvas.getContext('2d');

    this.resize();
    window.addEventListener('resize', () => this.resize());

    World.init();
    FX.reset();
    this.best = this.loadBest();
    this.sub = new Submarine(CFG.PLAYER.START_X, CFG.PLAYER.START_Y, this.selectedType);

    Input.init(this.canvas, this);
    UI.init(this);
    UI.updateScore(0, this.best);

    requestAnimationFrame((ts) => this.loop(ts));
  },

  weaponCfg() {
    return this.sub && this.sub.spec.weapon === 'missile' ? CFG.MISSILE : CFG.MINE;
  },

  selectSub(type) {
    if (this.state !== 'menu' || !CFG.SUBMARINES[type]) return;
    this.selectedType = type;
    this.sub = new Submarine(CFG.PLAYER.START_X, CFG.PLAYER.START_Y, type);
    Input.mx = this.sub.x;
    Input.my = this.sub.y;
    UI.setSubPick(type);
  },

  toMenu() {
    if (this.state !== 'gameover' && this.state !== 'victory') return;
    this.state = 'menu';
    this.level = null;
    this.minesArr = [];
    this.destroyers = [];
    this.charges = [];
    this.missiles = [];
    FX.reset();
    Input.clear();

    this.sub = new Submarine(CFG.PLAYER.START_X, CFG.PLAYER.START_Y, this.selectedType);
    Input.mx = this.sub.x;
    Input.my = this.sub.y;

    UI.showHUD(false);
    UI.showScreen('menu');
    UI.setSubPick(this.selectedType);
  },

  nearestShip(fromX, range) {
    let best = null;
    let bestDist = Infinity;
    for (const ship of this.destroyers) {
      if (ship.sinking || ship.escaped) continue;
      const d = Math.abs(ship.x - fromX);
      if (d <= range && d < bestDist) {
        bestDist = d;
        best = ship;
      }
    }
    return best;
  },

  loadBest() {
    try {
      const v = parseInt(localStorage.getItem('submarine_best'), 10);
      return Number.isFinite(v) ? v : 0;
    } catch (e) {
      return 0;
    }
  },

  saveBest() {
    try {
      localStorage.setItem('submarine_best', String(this.best));
    } catch (e) {
      /* 本地存储不可用时仅保留内存值 */
    }
  },

  resize() {
    const scale = Math.min(window.innerWidth / CFG.W, window.innerHeight / CFG.H);
    const cw = Math.max(1, Math.floor(CFG.W * scale));
    const ch = Math.max(1, Math.floor(CFG.H * scale));

    this.frame.style.width = `${cw}px`;
    this.frame.style.height = `${ch}px`;
    this.uiRoot.style.transform = `scale(${scale})`;

    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(CFG.W * this.dpr);
    this.canvas.height = Math.floor(CFG.H * this.dpr);
  },

  /* ================= 流程 ================= */
  startNewGame() {
    this.score = 0;
    this.lives = CFG.PLAYER.LIVES;
    this.totalSunk = 0;
    this.best = Math.max(this.best, this.loadBest());

    this.sub = new Submarine(CFG.PLAYER.START_X, CFG.PLAYER.START_Y, this.selectedType);
    Input.mx = this.sub.x;
    Input.my = this.sub.y;
    Input.clear();

    FX.reset();
    UI.updateScore(0, this.best);
    UI.setLives(this.lives);
    this.startLevel(0);
  },

  startLevel(index) {
    const level = CFG.LEVELS[index];
    if (!level) {
      this.victory();
      return;
    }

    this.levelIndex = index;
    this.level = level;

    this.minesArr = [];
    this.missiles = [];
    this.destroyers = [];
    this.charges = [];

    this.spawnIndex = 0;
    this.spawnTimer = 0;
    this.passed = 0;
    this.sunk = 0;
    this.levelScoreStart = this.score;

    this.ammo = this.weaponCfg().MAGAZINE;
    this.reloadTimer = 0;
    this.fireCd = 0;

    this.introTimer = 1.3;
    this.clearTimer = 0;
    this.dyingTimer = 0;
    this.state = 'intro';

    this.sub.alive = true;
    this.sub.invuln = 0;
    this.sub.hitFlash = 0;

    this.spawnTimes = level.roster.map((_, i) => 0.7 + i * level.gap);

    UI.showScreen(null);
    UI.showHUD(true);
    UI.setLevel(index, level.name);
    UI.setLives(this.lives);
    UI.updateScore(this.score, this.best);
    UI.setProgress(0, level.roster.length, 0);
    UI.setAmmoSpec(this.sub.spec);
    UI.setAmmo(this.ammo, 1);
    UI.showBanner(
      `第 ${index + 1} 关 · ${level.name}`,
      `${level.desc} · 敌舰 ${level.roster.length} 艘`
    );

    Input.clear();
  },

  nextLevel() {
    if (this.state !== 'levelclear') return;
    this.startLevel(this.levelIndex + 1);
  },

  confirm() {
    if (this.state === 'menu') this.startNewGame();
    else if (this.state === 'levelclear') this.nextLevel();
    else if (this.state === 'gameover' || this.state === 'victory') this.startNewGame();
    else if (this.state === 'paused') this.togglePause();
  },

  togglePause() {
    if (this.state === 'playing' || this.state === 'intro') {
      this.pausedFrom = this.state;
      this.state = 'paused';
      UI.showScreen('pause');
      Input.clear();
    } else if (this.state === 'paused') {
      this.state = this.pausedFrom || 'playing';
      this.pausedFrom = null;
      UI.showScreen(null);
      Input.clear();
    }
  },

  autoPause() {
    if (this.state === 'playing' || this.state === 'intro') this.togglePause();
  },

  /* ================= 战斗 ================= */
  dropDepthCharge(x, aimed) {
    const C = CFG.CHARGE;
    x = Utils.clamp(x, C.DROP_MIN_X, C.DROP_MAX_X);

    let depth;
    if (aimed && this.sub && this.sub.alive) {
      depth = Utils.clamp(
        this.sub.y + Utils.rand(-C.AIM_Y_SPREAD, C.AIM_Y_SPREAD),
        C.DEPTH_MIN, C.DEPTH_MAX
      );
    } else {
      depth = Utils.rand(C.DEPTH_MIN, C.DEPTH_MAX);
    }

    this.charges.push(new DepthCharge(x, depth, this));
    FX.splash(x, CFG.SURFACE_Y);
    AudioSys.play('charge_splash');
  },

  fireWeapon() {
    if (this.state !== 'playing') return;
    if (this.fireCd > 0 || this.ammo <= 0) return;

    const W = this.weaponCfg();
    this.ammo--;
    this.fireCd = W.FIRE_CD;
    if (this.reloadTimer <= 0 && this.ammo < W.MAGAZINE) {
      this.reloadTimer = W.RELOAD;
    }

    if (this.sub.spec.weapon === 'missile') {
      this.missiles.push(new Missile(this.sub.x, this.sub.y - 26));
      FX.bubble(this.sub.x, this.sub.y - 26, 2, { spread: 4, speed: 22, size: 1.2 });
      AudioSys.play('missile_launch');
    } else {
      this.minesArr.push(new Mine(this.sub.x, this.sub.y - 26));
      FX.bubble(this.sub.x, this.sub.y - 26, 2, { spread: 4, speed: 22, size: 1.2 });
      AudioSys.play('mine_launch');
    }
  },

  updateReload(dt) {
    const W = this.weaponCfg();
    if (this.ammo >= W.MAGAZINE) {
      this.reloadTimer = 0;
      return;
    }
    if (this.reloadTimer <= 0) this.reloadTimer = W.RELOAD;
    this.reloadTimer -= dt;

    if (this.reloadTimer <= 0) {
      this.ammo++;
      AudioSys.play('reload');
      this.reloadTimer = this.ammo < W.MAGAZINE ? W.RELOAD : 0;
    }
  },

  reloadRatio() {
    const W = this.weaponCfg();
    if (this.ammo >= W.MAGAZINE) return 1;
    return Utils.clamp(1 - this.reloadTimer / W.RELOAD, 0, 1);
  },

  resolveMineHits() {
    for (let i = this.minesArr.length - 1; i >= 0; i--) {
      const mine = this.minesArr[i];
      if (!mine.isArmed()) continue;

      for (const ship of this.destroyers) {
        if (ship.sinking || ship.escaped) continue;
        const hit = Utils.circleRect(
          mine.x, CFG.SURFACE_Y, CFG.MINE.RADIUS + 4,
          ship.x, ship.y, ship.len / 2, ship.beam / 2 + 6
        );
        if (hit) {
          this.mineExplode(mine);
          break;
        }
      }

      if (mine.dead) this.minesArr.splice(i, 1);
    }
  },

  mineExplode(mine) {
    if (mine.dead) return;
    mine.dead = true;

    FX.explosion(mine.x, CFG.SURFACE_Y, CFG.MINE.BLAST_RADIUS, {
      underwater: false,
      shake: 9
    });
    AudioSys.play('mine_blast');

    const hits = this.destroyers.filter((ship) => {
      if (ship.sinking || ship.escaped) return false;
      return Utils.circleRect(
        mine.x, CFG.SURFACE_Y, CFG.MINE.BLAST_RADIUS,
        ship.x, ship.y, ship.len / 2, ship.beam / 2 + 6
      );
    });

    hits.forEach((ship, idx) => {
      if (idx > 0) {
        this.addScore(CFG.SCORE.EXTRA_HIT);
        FX.text(ship.x, ship.y - ship.beam - 28, `连锁 +${CFG.SCORE.EXTRA_HIT}`, CFG.COLORS.amberRGB, 15);
      }
      this.damageShip(ship, CFG.MINE.DAMAGE);
    });
  },

  missileExplode(missile) {
    if (missile.dead) return;
    missile.dead = true;
    missile.y = CFG.SURFACE_Y - 6;

    FX.explosion(missile.x, CFG.SURFACE_Y, CFG.MISSILE.BLAST_RADIUS, {
      underwater: false,
      shake: 14
    });
    AudioSys.play('missile_blast');

    const hits = this.destroyers.filter((ship) => {
      if (ship.sinking || ship.escaped) return false;
      return Utils.circleRect(
        missile.x, CFG.SURFACE_Y, CFG.MISSILE.BLAST_RADIUS,
        ship.x, ship.y, ship.len / 2, ship.beam / 2 + 6
      );
    });

    hits.forEach((ship, idx) => {
      if (idx > 0) {
        this.addScore(CFG.SCORE.EXTRA_HIT);
        FX.text(ship.x, ship.y - ship.beam - 28, `连锁 +${CFG.SCORE.EXTRA_HIT}`, CFG.COLORS.amberRGB, 15);
      }
      this.damageShip(ship, CFG.MISSILE.DAMAGE);
    });
  },

  damageShip(ship, dmg) {
    if (ship.sinking) return;

    const sunkNow = ship.hit(dmg);
    const gained = CFG.SCORE.DAMAGE * dmg;
    this.addScore(gained);
    FX.text(
      ship.x + Utils.rand(-14, 14),
      ship.y - ship.beam - 16,
      `+${gained}`,
      CFG.COLORS.whiteRGB,
      12
    );
    FX.spark(ship.x, ship.y - 4, 7, { rgb: CFG.COLORS.amberRGB, speed: 140 });

    if (sunkNow) {
      this.sunk++;
      this.totalSunk++;
      this.addScore(ship.cls.score);
      FX.text(ship.x, ship.y - ship.beam - 46, `击沉 +${ship.cls.score}`, CFG.COLORS.amberRGB, 18);
      FX.explosion(ship.x, ship.y, ship.len * 0.34, { underwater: false, shake: 12 });
      AudioSys.play('mine_blast');
    }
  },

  onChargeExplode(charge) {
    FX.explosion(charge.x, charge.y, CFG.CHARGE.BLAST_RADIUS, {
      underwater: true,
      shake: 7
    });
    AudioSys.play('charge_blast');

    if (this.state !== 'playing' || !this.sub || !this.sub.alive) return;
    if (this.sub.invuln > 0) return;

    const d = Utils.dist(this.sub.x, this.sub.y, charge.x, charge.y);
    if (d <= CFG.CHARGE.BLAST_RADIUS + this.sub.spec.radius * 0.4) {
      this.hitSub();
    }
  },

  hitSub() {
    if (this.lives <= 0) return;

    this.lives--;
    this.sub.invuln = CFG.PLAYER.INVULN;
    this.sub.hitFlash = 0.45;

    FX.hitFlash();
    FX.shake(16);
    FX.text(this.sub.x, this.sub.y - 48, '-1 船体', CFG.COLORS.dangerRGB, 18);
    AudioSys.play('hit');
    UI.setLives(this.lives);

    if (this.lives <= 0) this.beginDeath();
  },

  beginDeath() {
    this.state = 'dying';
    this.dyingTimer = 1.5;
    this.sub.alive = false;

    FX.explosion(this.sub.x, this.sub.y, 94, { underwater: true, shake: 20 });
    FX.flash(0.22, CFG.COLORS.dangerRGB);
    AudioSys.play('mine_blast');

    for (const charge of this.charges) charge.cancel();
    this.missiles = [];
    Input.clear();
  },

  addScore(n) {
    this.score += n;
    if (this.score > this.best) this.best = this.score;
    UI.updateScore(this.score, this.best);
  },

  /* ================= 关卡结算 ================= */
  checkLevelClear(dt) {
    if (this.spawnIndex < this.spawnTimes.length) return;
    if (this.destroyers.length > 0) return;

    this.clearTimer += dt;
    if (this.clearTimer >= 0.7) this.endLevel();
  },

  endLevel() {
    this.addScore(CFG.SCORE.LEVEL_CLEAR);
    const gained = this.score - this.levelScoreStart;
    this.saveBest();

    // 中和残余深弹
    for (const charge of this.charges) {
      charge.cancel();
      FX.bubble(charge.x, charge.y, 3, { spread: 6 });
    }
    this.charges = [];
    this.missiles = [];

    const isLast = this.levelIndex >= CFG.LEVELS.length - 1;
    if (isLast) {
      this.victory();
      return;
    }

    const livesBefore = this.lives;
    this.lives = Math.min(CFG.PLAYER.MAX_LIVES, this.lives + 1);
    const healed = this.lives > livesBefore;
    this.state = 'levelclear';

    UI.setLives(this.lives);
    UI.fillLevelClear({
      index: this.levelIndex,
      name: this.level.name,
      gained,
      sunk: this.sunk,
      passed: this.passed,
      lives: this.lives,
      healed
    });
    UI.showScreen('levelclear');
    AudioSys.play('level_clear');
  },

  gameOver() {
    this.state = 'gameover';
    this.saveBest();
    UI.showHUD(false);
    UI.fillGameOver({
      levelIndex: this.levelIndex,
      name: this.level ? this.level.name : '',
      score: this.score,
      sunk: this.totalSunk
    });
    UI.showScreen('gameover');
    AudioSys.play('game_over');
  },

  victory() {
    this.state = 'victory';
    this.saveBest();
    UI.showHUD(false);
    UI.fillVictory({
      score: this.score,
      best: this.best,
      sunk: this.totalSunk
    });
    UI.showScreen('victory');
    AudioSys.play('victory');
  },

  /* ================= 更新 ================= */
  update(dt) {
    this.time += dt;
    World.update(dt);

    if (this.state === 'paused') return;

    FX.update(dt);

    if (this.state === 'menu') {
      if (this.sub) this.sub.idle(dt);
      return;
    }

    if (this.state === 'intro') {
      this.sub.update(dt);
      Input.consumeFire();
      this.introTimer -= dt;
      if (this.introTimer <= 0) this.state = 'playing';
      return;
    }

    if (this.state === 'playing') {
      this.updatePlaying(dt);
    } else if (this.state === 'dying') {
      this.updateDying(dt);
    }
  },

  updatePlaying(dt) {
    this.sub.update(dt);

    if (this.fireCd > 0) this.fireCd -= dt;
    this.updateReload(dt);
    if (Input.consumeFire()) this.fireWeapon();

    // 水雷
    for (let i = this.minesArr.length - 1; i >= 0; i--) {
      const mine = this.minesArr[i];
      mine.update(dt);
      if (mine.dead) this.minesArr.splice(i, 1);
    }

    // 潜射导弹
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const missile = this.missiles[i];
      missile.update(dt, this);
      if (missile.dead) this.missiles.splice(i, 1);
    }

    // 敌舰生成
    this.spawnTimer += dt;
    while (
      this.spawnIndex < this.spawnTimes.length &&
      this.spawnTimer >= this.spawnTimes[this.spawnIndex]
    ) {
      const entry = this.level.roster[this.spawnIndex];
      this.destroyers.push(new Destroyer(entry, this.level));
      this.spawnIndex++;
    }

    // 敌舰
    for (let i = this.destroyers.length - 1; i >= 0; i--) {
      const ship = this.destroyers[i];
      ship.update(dt, this);

      if (ship.escaped) {
        this.passed++;
        this.destroyers.splice(i, 1);
      } else if (ship.dead) {
        this.destroyers.splice(i, 1);
      }
    }

    // 深水炸弹
    for (let i = this.charges.length - 1; i >= 0; i--) {
      const charge = this.charges[i];
      charge.update(dt);
      if (charge.dead) this.charges.splice(i, 1);
    }

    // 可能已被深弹击沉，停止本帧后续判定
    if (this.state !== 'playing') return;

    this.resolveMineHits();

    UI.setProgress(this.passed, this.level.roster.length, this.sunk);
    UI.setAmmo(this.ammo, this.reloadRatio());

    this.checkLevelClear(dt);
  },

  updateDying(dt) {
    this.dyingTimer -= dt;
    for (let i = this.charges.length - 1; i >= 0; i--) {
      const charge = this.charges[i];
      charge.update(dt);
      if (charge.dead) this.charges.splice(i, 1);
    }
    if (this.dyingTimer <= 0) this.gameOver();
  },

  /* ================= 绘制 ================= */
  draw() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, CFG.W, CFG.H);

    const shake = FX.getShake();
    ctx.save();
    ctx.translate(shake.x, shake.y);

    World.drawBack(ctx);

    for (const charge of this.charges) charge.draw(ctx, this.time);
    for (const mine of this.minesArr) mine.draw(ctx, this.time);

    if (this.sub) this.sub.draw(ctx, this.time);

    for (const ship of this.destroyers) ship.draw(ctx, this.time);
    for (const missile of this.missiles) missile.draw(ctx, this.time);

    World.drawSurface(ctx);
    FX.draw(ctx);

    if ((this.state === 'playing' || this.state === 'intro') && this.sub && this.sub.alive) {
      this.drawAimGuide(ctx);
    }

    World.drawOverlay(ctx);
    ctx.restore();

    FX.drawScreenOverlay(ctx);
  },

  drawAimGuide(ctx) {
    if (this.sub.spec.weapon === 'missile') {
      const target = this.nearestShip(this.sub.x, CFG.MISSILE.LOCK_RANGE);
      if (!target) return;

      const x = target.x;
      const y = target.y - target.beam * 0.6;
      const hw = Math.max(30, target.len * 0.16);
      const hh = Math.max(20, target.beam * 0.9);
      const pulse = 0.45 + 0.25 * Math.abs(Math.sin(this.time * 4));
      const c = 9;

      ctx.save();
      ctx.strokeStyle = Utils.rgba(CFG.COLORS.amberRGB, pulse);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x - hw, y - hh + c);
      ctx.lineTo(x - hw, y - hh);
      ctx.lineTo(x - hw + c, y - hh);
      ctx.moveTo(x + hw - c, y - hh);
      ctx.lineTo(x + hw, y - hh);
      ctx.lineTo(x + hw, y - hh + c);
      ctx.moveTo(x + hw, y + hh - c);
      ctx.lineTo(x + hw, y + hh);
      ctx.lineTo(x + hw - c, y + hh);
      ctx.moveTo(x - hw + c, y + hh);
      ctx.lineTo(x - hw, y + hh);
      ctx.lineTo(x - hw, y + hh - c);
      ctx.stroke();
      ctx.restore();
      return;
    }

    const sx = this.sub.x;
    const sy = this.sub.y - 24;

    ctx.save();
    ctx.setLineDash([3, 9]);
    ctx.strokeStyle = 'rgba(95,242,255,0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx, CFG.SURFACE_Y);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(95,242,255,0.36)';
    ctx.beginPath();
    ctx.ellipse(sx, CFG.SURFACE_Y, 15, 4.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },

  /* ================= 主循环 ================= */
  loop(ts) {
    if (!this.last) this.last = ts;
    let dt = (ts - this.last) / 1000;
    this.last = ts;
    dt = Math.min(dt, 0.033);

    this.update(dt);
    this.draw();

    requestAnimationFrame((t) => this.loop(t));
  }
};

Game.init();
window.Game = Game;
