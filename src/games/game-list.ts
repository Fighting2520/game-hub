import type { IGame } from '@/types/Game';
export const GAME_LIST: IGame[] = [
  {
    id: 'flappy-bee',
    title: 'Flappy Bee',
    description: '挑战你的反应极限！操控小蜜蜂穿越障碍。',
    tags: ['h5game', '反应'],
    thumbnail: '/src/assets/games/flappy-bee/thumbnail.svg',
    route: '/game/flappy-bee',
    component: () => import('@/games/FlappyBee/FlappyBeeGame.vue')
  },
  {
    id: 'snake',
    title: '贪吃蛇',
    description: '经典贪吃蛇游戏！吃掉食物让蛇变长，避免撞墙。',
    tags: ['h5game', '经典', '策略'],
    thumbnail: '/src/assets/games/snake/thumbnail.svg',
    route: '/game/snake',
    component: () => import('@/games/Snake/SnakeGame.vue')
  },
  {
    id: 'tetris',
    title: '俄罗斯方块',
    description: '经典俄罗斯方块！旋转和移动方块，消除整行获得高分。',
    tags: ['h5game', '经典', '益智', '策略'],
    thumbnail: '/src/assets/games/tetris/thumbnail.svg',
    route: '/game/tetris',
    component: () => import('@/games/Tetris/TetrisGame.vue')
  },
  {
    id: 'breakout',
    title: '打砖块',
    description: '经典打砖块游戏！控制挡板反弹球，打破所有砖块。',
    tags: ['h5game', '经典', '反应', '技巧'],
    thumbnail: '/src/assets/games/breakout/thumbnail.svg',
    route: '/game/breakout',
    component: () => import('@/games/Breakout/BreakoutGame.vue')
  },
  {
    id: 'jumping-man',
    title: '跳跃小人',
    description: '控制小人跳跃躲避障碍物，收集金币获得高分！',
    tags: ['h5game', '跳跃', '反应', '技巧'],
    thumbnail: '/src/assets/games/jumping-man/thumbnail.svg',
    route: '/game/jumping-man',
    component: () => import('@/games/JumpingMan/JumpingManGame.vue')
  },
  {
    id: 'catch-game',
    title: '接物游戏',
    description: '移动篮子接住好物品，避开危险物品，挑战高分和连击！',
    tags: ['h5game', '接物', '反应', '技巧'],
    thumbnail: '/src/assets/games/catch-game/thumbnail.svg',
    route: '/game/catch-game',
    component: () => import('@/games/CatchGame/CatchGame.vue')
  },
  {
    id: '2048',
    title: '2048',
    description: '经典数字合并游戏！滑动方块合并相同数字，挑战2048！',
    tags: ['h5game', '益智', '策略', '经典'],
    thumbnail: '/src/assets/games/2048/thumbnail.svg',
    route: '/game/2048',
    component: () => import('@/games/Game2048/Game2048.vue')
  },
  {
    id: 'link-game',
    title: '连连看',
    description: '经典连连看游戏！找到相同图案，用不超过3条直线连接消除！',
    tags: ['h5game', '益智', '消除', '经典'],
    thumbnail: '/src/assets/games/link-game/thumbnail.svg',
    route: '/game/link-game',
    component: () => import('@/games/LinkGame/LinkGame.vue')
  },
  {
    id: 'number-guessing',
    title: '猜数字',
    description: '经典猜数字游戏！在有限次数内猜出神秘数字，挑战你的逻辑思维！',
    tags: ['h5game', '益智', '逻辑', '经典'],
    thumbnail: '/src/assets/games/number-guessing/thumbnail.svg',
    route: '/game/number-guessing',
    component: () => import('@/games/NumberGuessing/NumberGuessingGame.vue')
  },
  {
    id: 'memory-card',
    title: '记忆翻牌',
    description: '经典记忆翻牌游戏！翻开卡牌找到相同配对，挑战你的记忆力！',
    tags: ['h5game', '记忆', '益智', '经典'],
    thumbnail: '/src/assets/games/memory-card/thumbnail.svg',
    route: '/game/memory-card',
    component: () => import('@/games/MemoryCard/MemoryCardGame.vue')
  },
  {
    id: 'minesweeper',
    title: '扫雷游戏',
    description: '经典扫雷游戏！通过数字提示找出所有地雷位置，挑战你的逻辑推理！',
    tags: ['h5game', '益智', '逻辑', '经典'],
    thumbnail: '/src/assets/games/minesweeper/thumbnail.svg',
    route: '/game/minesweeper',
    component: () => import('@/games/Minesweeper/MinesweeperGame.vue')
  },
  {
    id: 'sudoku',
    title: '数独游戏',
    description: '经典数独游戏！在9×9网格中填入数字，挑战你的逻辑推理能力！',
    tags: ['h5game', '益智', '逻辑', '经典'],
    thumbnail: '/src/assets/games/sudoku/thumbnail.svg',
    route: '/game/sudoku',
    component: () => import('@/games/Sudoku/SudokuGame.vue')
  },
  {
    id: 'gomoku',
    title: '五子棋',
    description: '经典五子棋游戏！支持人机对战和双人对战，挑战你的策略思维！',
    tags: ['h5game', '策略', '对战', '经典'],
    thumbnail: '/src/assets/games/gomoku/thumbnail.svg',
    route: '/game/gomoku',
    component: () => import('@/games/Gomoku/GomokuGame.vue')
  }
];