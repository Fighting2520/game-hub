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
  }
];