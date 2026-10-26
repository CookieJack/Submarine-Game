/* ============ UI：HUD / 全屏界面 / 横幅 / 按钮 ============ */

const UI = {
  el: {},
  game: null,
  _bannerTimer: 0,
  _score: -1,
  _best: -1,
  _lives: -1,
  _progress: '',
  _ammoKey: '',
  _weapon: 'mine',
  _magMax: CFG.MINE.MAGAZINE,

  init(game) {
    this.game = game;

    const ids = [
      'hud', 'lives', 'level-name', 'progress', 'sunk', 'score', 'best',
      'btn-pause', 'btn-mute', 'ammo-label', 'ammo-count', 'ammo-slots',
      'reload-fill', 'ammo-hint', 'hint-bar',
      'banner', 'banner-title', 'banner-sub',
      'screen-menu', 'menu-best', 'btn-start', 'sub-pick',
      'screen-levelclear', 'lc-level', 'lc-score', 'lc-sunk', 'lc-passed',
      'lc-life', 'btn-next',
      'screen-gameover', 'go-level', 'go-score', 'go-sunk', 'btn-restart',
      'btn-menu-over',
      'screen-victory', 'vc-score', 'vc-best', 'vc-sunk', 'btn-restart-victory',
      'btn-menu-victory',
      'screen-pause', 'btn-resume', 'btn-restart-pause', 'btn-mute-pause'
    ];
    for (const id of ids) this.el[id] = document.getElementById(id);

    // 生命图标
    for (let i = 0; i < CFG.PLAYER.MAX_LIVES; i++) {
      const hull = document.createElement('span');
      hull.className = 'hull';
      this.el.lives.appendChild(hull);
    }

    // 潜艇选择卡
    this.el['sub-pick'].querySelectorAll('.sub-card').forEach((card) => {
      card.addEventListener('click', () => {
        AudioSys.init();
        AudioSys.play('ui');
        card.blur();
        this.game.selectSub(card.dataset.sub);
      });
    });

    const bind = (id, fn) => {
      const el = this.el[id];
      if (!el) return;
      el.addEventListener('click', () => {
        AudioSys.init();
        AudioSys.play('ui');
        el.blur();
        fn();
      });
    };

    bind('btn-start', () => this.game.startNewGame());
    bind('btn-next', () => this.game.nextLevel());
    bind('btn-restart', () => this.game.startNewGame());
    bind('btn-restart-victory', () => this.game.startNewGame());
    bind('btn-restart-pause', () => this.game.startNewGame());
    bind('btn-menu-over', () => this.game.toMenu());
    bind('btn-menu-victory', () => this.game.toMenu());
    bind('btn-resume', () => this.game.togglePause());
    bind('btn-pause', () => this.game.togglePause());
    bind('btn-mute', () => this.toggleMute());
    bind('btn-mute-pause', () => this.toggleMute());

    this.syncMute();
    this.setBest(game.best);
    this.setSubPick(game.selectedType);
    this.setAmmoSpec(CFG.SUBMARINES[game.selectedType]);
    this.showScreen('menu');
    this.showHUD(false);
  },

  setSubPick(type) {
    this.el['sub-pick'].querySelectorAll('.sub-card').forEach((card) => {
      const active = card.dataset.sub === type;
      card.classList.toggle('selected', active);
      card.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  },

  setAmmoSpec(spec) {
    const cfg = spec.weapon === 'missile' ? CFG.MISSILE : CFG.MINE;
    this._weapon = spec.weapon;
    this._magMax = cfg.MAGAZINE;

    this.el['ammo-label'].textContent =
      spec.weapon === 'missile' ? 'MISSILE RACK' : 'MINE RACK';
    this.el['ammo-hint'].textContent =
      spec.weapon === 'missile' ? '左键发射 · 自动锁定最近敌舰' : '左键布雷 · 海面待爆 2 秒';
    this.el['hint-bar'].textContent =
      spec.weapon === 'missile'
        ? '鼠标潜航 · 左键导弹 · P 暂停 · M 静音'
        : '鼠标潜航 · 左键布雷 · P 暂停 · M 静音';

    this.el['ammo-slots'].innerHTML = '';
    for (let i = 0; i < cfg.MAGAZINE; i++) {
      const slot = document.createElement('span');
      slot.className = 'mine-slot' + (spec.weapon === 'missile' ? ' missile' : '');
      this.el['ammo-slots'].appendChild(slot);
    }
    this._ammoKey = '';
  },

  toggleMute() {
    AudioSys.toggleMute();
    this.syncMute();
  },

  syncMute() {
    const muted = AudioSys.muted;
    this.el['btn-mute'].textContent = muted ? '声音：关' : '声音：开';
    this.el['btn-mute'].classList.toggle('active', muted);
    this.el['btn-mute-pause'].textContent = muted ? '声音：关' : '声音：开';
  },

  showHUD(visible) {
    this.el.hud.classList.toggle('hidden', !visible);
  },

  showScreen(name) {
    const map = {
      menu: 'screen-menu',
      levelclear: 'screen-levelclear',
      gameover: 'screen-gameover',
      victory: 'screen-victory',
      pause: 'screen-pause'
    };
    for (const key of Object.values(map)) {
      this.el[key].classList.add('hidden');
    }
    if (name && map[name]) {
      this.el[map[name]].classList.remove('hidden');
    }
  },

  showBanner(title, sub) {
    this.el['banner-title'].textContent = title;
    this.el['banner-sub'].textContent = sub;

    const banner = this.el.banner;
    banner.classList.remove('hidden', 'banner-in');
    // 强制回流以重启动画
    void banner.offsetWidth;
    banner.classList.add('banner-in');

    clearTimeout(this._bannerTimer);
    this._bannerTimer = setTimeout(() => {
      banner.classList.add('hidden');
    }, 1650);
  },

  setLives(lives) {
    if (this._lives === lives) return;
    this._lives = lives;
    const hulls = this.el.lives.children;
    for (let i = 0; i < hulls.length; i++) {
      hulls[i].classList.toggle('lost', i >= lives);
    }
  },

  setBest(best) {
    if (this._best === best) return;
    this._best = best;
    this.el['menu-best'].textContent = Utils.fmt(best);
    this.el.best.textContent = Utils.fmt(best);
  },

  updateScore(score, best) {
    if (this._score !== score) {
      this._score = score;
      this.el.score.textContent = Utils.fmt(score);
    }
    this.setBest(best);
  },

  setLevel(index, name) {
    this.el['level-name'].textContent = `第 ${index + 1} 关 · ${name}`;
  },

  setProgress(passed, total, sunk) {
    const key = `${passed}|${total}|${sunk}`;
    if (this._progress === key) return;
    this._progress = key;
    this.el.progress.textContent = `过境 ${passed}/${total}`;
    this.el.sunk.textContent = `击沉 ${sunk}`;
  },

  setAmmo(count, ratio) {
    const key = `${count}|${Math.round(Utils.clamp(ratio, 0, 1) * 40)}`;
    if (this._ammoKey === key) return;
    this._ammoKey = key;

    this.el['ammo-count'].textContent = `${count} / ${this._magMax}`;
    const slots = this.el['ammo-slots'].children;
    for (let i = 0; i < slots.length; i++) {
      slots[i].classList.toggle('on', i < count);
    }
    this.el['reload-fill'].style.width = `${Utils.clamp(ratio, 0, 1) * 100}%`;
  },

  fillLevelClear(d) {
    this.el['lc-level'].textContent = `第 ${d.index + 1} 关 · ${d.name}`;
    this.el['lc-score'].textContent = `+${Utils.fmt(d.gained)}`;
    this.el['lc-sunk'].textContent = String(d.sunk);
    this.el['lc-passed'].textContent = String(d.passed);
    this.el['lc-life'].textContent = d.healed
      ? `船体维修 +1 · 当前生命 ${d.lives}/${CFG.PLAYER.MAX_LIVES}`
      : `船体状态良好 · 当前生命 ${d.lives}/${CFG.PLAYER.MAX_LIVES}`;
  },

  fillGameOver(d) {
    this.el['go-level'].textContent = `第 ${d.levelIndex + 1} 关`;
    this.el['go-score'].textContent = Utils.fmt(d.score);
    this.el['go-sunk'].textContent = String(d.sunk);
  },

  fillVictory(d) {
    this.el['vc-score'].textContent = Utils.fmt(d.score);
    this.el['vc-best'].textContent = Utils.fmt(d.best);
    this.el['vc-sunk'].textContent = String(d.sunk);
  }
};
