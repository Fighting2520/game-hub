import type { IGame } from '@/types/Game';

export const GAME_LIST: IGame[] = [
  {
    id: 'flappy-bee',
    title: 'Flappy Bee',
    description: '挑战你的反应极限！操控小蜜蜂穿越障碍。',
    thumbnail: '/assets/games/flappy-bee/thumbnail.png',
    route: '/game/flappy-bee',
    component: () => import('@/games/FlappyBee/FlappyBeeGame.vue')
  }
];