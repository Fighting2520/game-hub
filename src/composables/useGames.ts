import { ref, computed } from 'vue';
import type { IGame } from '@/types/Game';
import { GAME_LIST } from '@/games/game-list';

export const useGames = () => {
  const games = ref<IGame[]>(GAME_LIST);

  const getGameById = (id: string) => {
    return games.value.find(game => game.id === id);
  };

  return {
    games: computed(() => games.value),
    getGameById
  };
};