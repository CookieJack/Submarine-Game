/* ============ 输入：鼠标逻辑坐标 / 点击布雷 / 键盘快捷键 ============ */

const Input = {
  mx: CFG.PLAYER.START_X,
  my: CFG.PLAYER.START_Y,
  fireQueued: false,
  canvas: null,
  game: null,

  init(canvas, game) {
    this.canvas = canvas;
    this.game = game;

    canvas.addEventListener('mousemove', (e) => this.updateMouse(e));

    canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      AudioSys.init();
      this.updateMouse(e);
      this.fireQueued = true;
    });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('pointerdown', () => AudioSys.init(), { once: true });

    window.addEventListener('keydown', (e) => this.onKey(e));

    // 失焦自动暂停，避免切后台时潜艇挨炸
    window.addEventListener('blur', () => game.autoPause());
  },

  updateMouse(e) {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    this.mx = Utils.clamp((e.clientX - rect.left) / rect.width * CFG.W, 0, CFG.W);
    this.my = Utils.clamp((e.clientY - rect.top) / rect.height * CFG.H, 0, CFG.H);
  },

  onKey(e) {
    const key = e.key.toLowerCase();
    AudioSys.init();

    if (key === 'm') {
      e.preventDefault();
      AudioSys.init();
      AudioSys.toggleMute();
      UI.syncMute();
      return;
    }

    if (key === 'p' || key === 'escape') {
      e.preventDefault();
      this.game.togglePause();
      return;
    }

    if (key === 'enter' || key === ' ') {
      e.preventDefault();
      this.game.confirm();
    }
  },

  /* 每帧消费一次点击，避免同一次点击重复布雷 */
  consumeFire() {
    if (!this.fireQueued) return false;
    this.fireQueued = false;
    return true;
  },

  clear() {
    this.fireQueued = false;
  }
};
