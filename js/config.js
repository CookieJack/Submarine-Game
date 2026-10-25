/* ============ 深海布雷 — 游戏数值配置 ============ */
/* 所有玩法数值集中在此，调参不需要改逻辑代码 */

const CFG = {
  W: 1280,
  H: 720,
  SURFACE_Y: 118,       // 海面高度
  FLOOR_Y: 690,         // 海床高度

  // ============ 玩家潜艇 ============
  PLAYER: {
    LIVES: 3,
    MAX_LIVES: 3,
    START_X: 640,
    START_Y: 540,
    MIN_X: 44,
    MAX_X: 1236,
    MIN_Y: 250,         // 不许浮出水面
    MAX_Y: 650,         // 不许撞海床
    MAX_SPEED: 360,     // 最大潜航速度
    ARRIVE_GAIN: 4.5,   // 距目标越近目标速度越低
    THRUST: 3.2,        // 推进响应率（越小越迟缓）
    CURRENT_X: 12,      // 水平洋流最大流速
    CURRENT_Y: 6,       // 垂直洋流最大流速
    CURRENT_PERIOD_X: 19,
    CURRENT_PERIOD_Y: 13,
    RADIUS: 18,         // 受击判定半径
    INVULN: 1.8,        // 受击无敌秒数
    LENGTH: 116
  },

  // ============ 水雷 ============
  MINE: {
    MAGAZINE: 5,        // 弹仓上限
    RELOAD: 1.6,        // 每枚回充秒数
    FIRE_CD: 0.16,      // 射击间隔
    RISE_SPEED: 420,    // 上浮速度
    ARM_TIME: 2.0,      // 海面待爆时间（用户指定 2 秒）
    RADIUS: 12,
    BOB_AMP: 3,
    BOB_SPEED: 2.4,
    BLAST_RADIUS: 72,
    DAMAGE: 1,
    SINK_TIME: 0.9      // 过期下沉淡出时长
  },

  // ============ 深水炸弹 ============
  CHARGE: {
    SINK_SPEED: 165,
    DEPTH_MIN: 320,
    DEPTH_MAX: 640,
    BLAST_RADIUS: 88,
    WARNING: 0.45,      // 引爆前预警秒数
    AIM_X_SPREAD: 190,  // 舰尾与潜艇水平距离小于该值视为“过顶”
    AIM_Y_SPREAD: 80,   // 过顶投弹时深度在潜艇前后偏移
    ATTACK_DELAY: 0.35, // 过顶后最多再等这么久就投弹
    ATTACK_MIN_ELAPSED: 0.45, // 距上次投弹至少经过间隔的该比例才允许提前投放
    DROP_MIN_X: 70,
    DROP_MAX_X: 1210
  },

  // ============ 舰船类型 ============
  SHIPS: {
    patrol: {
      name: '巡逻艇', len: 92, beam: 26, hp: 1,
      speed: 150, quota: 2, drop: 2.6, score: 120, fast: 1.65,
      hullNo: 'P-7'
    },
    destroyer: {
      name: '驱逐舰', len: 150, beam: 36, hp: 2,
      speed: 105, quota: 4, drop: 1.9, score: 260, fast: 1.65,
      hullNo: 'DDG-112'
    },
    heavy: {
      name: '重型驱逐舰', len: 200, beam: 46, hp: 3,
      speed: 78, quota: 6, drop: 1.5, score: 450, fast: 1.45,
      hullNo: 'DDG-1001'
    }
  },

  // ============ 关卡（生存计时：全部敌舰离场即过关） ============
  LEVELS: [
    {
      name: '近海巡逻',
      desc: '敌舰稀疏，先熟悉布雷节奏',
      gap: 5.0, speedMul: 1.00, intervalMul: 1.25,
      roster: [
        { type: 'patrol', dir: 1 },
        { type: 'destroyer', dir: -1 },
        { type: 'patrol', dir: 1 }
      ]
    },
    {
      name: '快速纵队',
      desc: '高速巡逻艇混入编队',
      gap: 4.2, speedMul: 1.05, intervalMul: 1.12,
      roster: [
        { type: 'patrol', fast: true, dir: -1 },
        { type: 'destroyer', dir: 1 },
        { type: 'patrol', dir: 1 },
        { type: 'destroyer', dir: -1 }
      ]
    },
    {
      name: '雷雨封锁',
      desc: '重型驱逐舰入场，深弹更密',
      gap: 3.6, speedMul: 1.10, intervalMul: 1.00,
      roster: [
        { type: 'destroyer', dir: 1 },
        { type: 'heavy', dir: -1 },
        { type: 'destroyer', fast: true, dir: 1 },
        { type: 'patrol', dir: -1 }
      ]
    },
    {
      name: '夜航猎杀',
      desc: '编队提速，海面几乎没有空隙',
      gap: 3.2, speedMul: 1.16, intervalMul: 0.88,
      roster: [
        { type: 'destroyer', fast: true, dir: -1 },
        { type: 'destroyer', dir: 1 },
        { type: 'heavy', dir: -1 },
        { type: 'patrol', fast: true, dir: 1 },
        { type: 'destroyer', dir: -1 }
      ]
    },
    {
      name: '钢铁洪流',
      desc: '整支封锁舰队压境，活下来',
      gap: 2.8, speedMul: 1.24, intervalMul: 0.78,
      roster: [
        { type: 'heavy', dir: 1 },
        { type: 'destroyer', fast: true, dir: -1 },
        { type: 'destroyer', dir: 1 },
        { type: 'heavy', dir: -1 },
        { type: 'patrol', fast: true, dir: 1 },
        { type: 'destroyer', fast: true, dir: -1 }
      ]
    }
  ],

  // ============ 计分 ============
  SCORE: {
    DAMAGE: 40,         // 水雷对舰船造成伤害
    EXTRA_HIT: 100,     // 一次爆炸波及多艘的额外奖励
    LEVEL_CLEAR: 500
  },

  // ============ 霓虹深海色板 ============
  COLORS: {
    bgTop: '#0a4a66',
    bgMid: '#04324a',
    bgBottom: '#010a14',
    cyan: '#5ff2ff',
    cyanRGB: [95, 242, 255],
    cyanSoft: 'rgba(95,242,255,0.55)',
    amber: '#ffc857',
    amberRGB: [255, 200, 87],
    danger: '#ff4d6d',
    dangerRGB: [255, 77, 109],
    white: '#e8fbff',
    whiteRGB: [232, 251, 255],
    hullDark: '#07141d',
    hullMid: '#123145',
    shipDark: '#081018',
    shipMid: '#1a2a34',
    seaFloor: '#02090f'
  },

  // ============ 特效 ============
  FX: {
    MAX_PARTICLES: 420,
    SHAKE_MAX: 22
  }
};
