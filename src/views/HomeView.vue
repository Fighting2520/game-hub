<template>
  <div class="home-view">
    <AppHeader />
    <main class="game-grid">
      <GameCard
        v-for="game in games"
        :key="game.id"
        :game="game"
      />
    </main>
    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import AppHeader from '@/components/layout/AppHeader.vue';
import AppFooter from '@/components/layout/AppFooter.vue';
import GameCard from '@/components/games/GameCard.vue';
import { useGames } from '@/composables/useGames';

const { games } = useGames();
</script>

<style scoped>
.game-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 2rem;
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}
</style>