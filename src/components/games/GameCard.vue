<template>
  <router-link :to="game.route" class="game-card">
    <img :src="game.thumbnail" :alt="game.title" class="thumbnail" />
    <div class="card-content">
      <h3 class="title">{{ game.title }}</h3>
      <p class="description">{{ game.description }}</p>
      <div class="tags">
        <span v-for="tag in game.tags" :key="tag" class="tag">{{ tag }}</span>
      </div>
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
  width: 200px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
  margin: 16px;
  color: inherit;
  text-decoration: none;
}

.game-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
}

.thumbnail {
  width: 100%;
  max-height: 160px;
  object-fit: contain;
}

.card-content {
  padding: 1rem;
}

.title {
  margin: 0;
  font-size: 1rem;
  color: #333;
}

.description {
  margin: 0.5rem 0;
  font-size: 0.875rem;
  color: #666;
  max-height: 3rem;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 0.5rem;
}

.tag {
  background: #f0f0f0;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  color: #555;
}
</style>