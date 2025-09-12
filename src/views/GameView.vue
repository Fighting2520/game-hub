<template>
  <div class="game-view">
    <div class="game-header">
      <button @click="router.back()">← Back to Home</button>
      <h1>{{ currentGame?.title }}</h1>
    </div>
    <div class="game-container">
      <Suspense>
        <component :is="GameComponent" v-if="GameComponent" />
        <template #fallback>
          <div>Loading Game...</div>
        </template>
      </Suspense>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useGames } from '@/composables/useGames';

const props = defineProps<{ id: string }>();
const router = useRouter();
const { getGameById } = useGames();

const currentGame = computed(() => getGameById(props.id));
const GameComponent = ref<Component | null>(null);

onMounted(async () => {
  if (currentGame.value) {
    const module = await currentGame.value.component();
    GameComponent.value = module.default;
  } else {
    router.replace('/');
  }
});
</script>