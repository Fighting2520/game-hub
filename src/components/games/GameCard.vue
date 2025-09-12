<template>
  <router-link :to="game.route" class="game-card">
    <img :src="game.thumbnail" :alt="game.title" class="thumbnail" />
    <div class="card-content">
      <h3>{{ game.title }}</h3>
      <p>{{ game.description }}</p>
    </div>
  </router-link>
</template>

<script lang="ts">
import type { IGame } from '@/types/Game';

export default {
  props: {
    game: {
      type: Object as () => IGame,
      required: true
    }
  }
};
</script>

<style scoped>
.game-card {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
}

.game-card:hover {
  transform: translateY(-4px);
}

.thumbnail {
  width: 100%;
  height: 160px;
  object-fit: cover;
}

.card-content {
  padding: 1rem;
}
</style>