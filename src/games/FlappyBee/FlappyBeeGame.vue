<template>
  <div class="flappy-bee-game">
    <canvas ref="canvas"></canvas>
    <div class="placeholder">Flappy Bee Game Will Be Here</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const canvas = ref<HTMLCanvasElement | null>(null);

onMounted(() => {
  if (canvas.value) {
    const ctx = canvas.value.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#87CEEB';
      ctx.fillRect(0, 0, canvas.value.width, canvas.value.height);
    }
  }
});
</script>

<style scoped>
.flappy-bee-game {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

canvas {
  border: 1px solid #000;
}

.placeholder {
  position: absolute;
  font-size: 24px;
  font-weight: bold;
}
</style>