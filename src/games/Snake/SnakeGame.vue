<template>
  <div class="snake-game">
    <div class="game-container">
      <canvas 
        ref="canvas" 
        width="400" 
        height="400"
        @click="handleCanvasClick"
        class="game-canvas"
      />
      
      <!-- 分数显示 -->
      <div class="score-display">
        Score: <span>{{ score }}</span> | Best: <span>{{ bestScore }}</span>
      </div>
      
      <!-- 音乐控制按钮 -->
      <button 
        @click="toggleMute" 
        class="mute-btn"
        :class="{ muted: isMuted }"
      >
        {{ isMuted ? '🔇' : '🔊' }}
      </button>
      
      <!-- 开始界面 -->
      <div v-show="gameState === 'start'" class="game-overlay start-screen">
        <h1>🐍 贪吃蛇</h1>
        <p>使用方向键或WASD控制</p>
        <p class="hint">吃掉食物让蛇变长，避免撞墙和自己</p>
        <button @click="startGame" class="game-btn">开始游戏</button>
      </div>
      
      <!-- 游戏结束界面 -->
      <div v-show="gameState === 'gameOver'" class="game-overlay game-over-screen">
        <h1>游戏结束!</h1>
        <p>最终得分: <span class="final-score">{{ score }}</span></p>
        <p v-if="isNewRecord" class="new-record">🎉 新纪录！</p>
        <button @click="restartGame" class="game-btn">再玩一次</button>
      </div>
      
      <!-- 游戏中的控制提示 -->
      <div v-show="gameState === 'playing'" class="controls-hint">
        <div class="control-keys">
          <div class="key-row">
            <span class="key">↑</span>
          </div>
          <div class="key-row">
            <span class="key">←</span>
            <span class="key">↓</span>
            <span class="key">→</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';

// 游戏状态
type GameState = 'start' | 'playing' | 'gameOver';
const gameState = ref<GameState>('start');
const score = ref(0);
const bestScore = ref(0);
const isMuted = ref(false);
const isNewRecord = ref(false);

// Canvas 相关
const canvas = ref<HTMLCanvasElement | null>(null);
let ctx: CanvasRenderingContext2D | null = null;
let gameLoop: number | null = null;

// 游戏配置
const GRID_SIZE = 20;
const GRID_WIDTH = 20;
const GRID_HEIGHT = 20;

// 方向枚举
enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT'
}

// 游戏对象接口
interface Position {
  x: number;
  y: number;
}

interface Snake {
  body: Position[];
  direction: Direction;
  nextDirection: Direction;
}

interface Food {
  position: Position;
  type: 'normal' | 'bonus';
}

// 游戏状态
const snake = ref<Snake>({
  body: [{ x: 10, y: 10 }],
  direction: Direction.RIGHT,
  nextDirection: Direction.RIGHT
});

const food = ref<Food>({
  position: { x: 15, y: 15 },
  type: 'normal'
});

// 音频相关
let audioCtx: AudioContext | null = null;

// 初始化音频
const initAudio = () => {
  try {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // 读取用户之前的静音设置
    const savedMute = localStorage.getItem('snakeMuted');
    if (savedMute === 'true') {
      isMuted.value = true;
    }
    
    // 读取最佳分数
    const savedBestScore = localStorage.getItem('snakeBestScore');
    if (savedBestScore) {
      bestScore.value = parseInt(savedBestScore, 10);
    }
  } catch (error) {
    console.warn('音频初始化失败:', error);
  }
};

// 音效生成函数
const createBeepSound = (frequency: number, duration: number, type: OscillatorType = 'square') => {
  if (!audioCtx || isMuted.value) return;
  
  try {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration);
  } catch (error) {
    console.warn('音效播放失败:', error);
  }
};

// 音效函数
const playEatSound = () => createBeepSound(800, 0.1, 'sine');
const playGameOverSound = () => {
  createBeepSound(200, 0.2, 'sawtooth');
  setTimeout(() => createBeepSound(150, 0.3, 'sawtooth'), 200);
};
const playBonusSound = () => {
  createBeepSound(1000, 0.1, 'sine');
  setTimeout(() => createBeepSound(1200, 0.1, 'sine'), 100);
};

const toggleMute = () => {
  isMuted.value = !isMuted.value;
  localStorage.setItem('snakeMuted', isMuted.value.toString());
};

// 生成随机食物位置
const generateFood = (): Position => {
  let newPosition: Position;
  do {
    newPosition = {
      x: Math.floor(Math.random() * GRID_WIDTH),
      y: Math.floor(Math.random() * GRID_HEIGHT)
    };
  } while (snake.value.body.some(segment => 
    segment.x === newPosition.x && segment.y === newPosition.y
  ));
  
  return newPosition;
};

// 检查碰撞
const checkCollision = (): boolean => {
  const head = snake.value.body[0];
  
  // 检查墙壁碰撞
  if (head.x < 0 || head.x >= GRID_WIDTH || head.y < 0 || head.y >= GRID_HEIGHT) {
    return true;
  }
  
  // 检查自身碰撞
  for (let i = 1; i < snake.value.body.length; i++) {
    if (head.x === snake.value.body[i].x && head.y === snake.value.body[i].y) {
      return true;
    }
  }
  
  return false;
};

// 检查食物碰撞
const checkFoodCollision = (): boolean => {
  const head = snake.value.body[0];
  return head.x === food.value.position.x && head.y === food.value.position.y;
};

// 移动蛇
const moveSnake = () => {
  const snakeObj = snake.value;
  snakeObj.direction = snakeObj.nextDirection;
  
  const head = { ...snakeObj.body[0] };
  
  switch (snakeObj.direction) {
    case Direction.UP:
      head.y--;
      break;
    case Direction.DOWN:
      head.y++;
      break;
    case Direction.LEFT:
      head.x--;
      break;
    case Direction.RIGHT:
      head.x++;
      break;
  }
  
  snakeObj.body.unshift(head);
  
  // 检查是否吃到食物
  if (checkFoodCollision()) {
    score.value += food.value.type === 'bonus' ? 20 : 10;
    
    if (food.value.type === 'bonus') {
      playBonusSound();
    } else {
      playEatSound();
    }
    
    // 生成新食物
    food.value.position = generateFood();
    // 10% 概率生成奖励食物
    food.value.type = Math.random() < 0.1 ? 'bonus' : 'normal';
  } else {
    // 没吃到食物，移除尾部
    snakeObj.body.pop();
  }
};

// 绘制游戏
const draw = () => {
  if (!ctx || !canvas.value) return;
  
  // 清空画布
  ctx.fillStyle = '#2d3436';
  ctx.fillRect(0, 0, canvas.value.width, canvas.value.height);
  
  // 绘制网格
  ctx.strokeStyle = '#636e72';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= GRID_WIDTH; i++) {
    ctx.beginPath();
    ctx.moveTo(i * GRID_SIZE, 0);
    ctx.lineTo(i * GRID_SIZE, canvas.value.height);
    ctx.stroke();
  }
  for (let i = 0; i <= GRID_HEIGHT; i++) {
    ctx.beginPath();
    ctx.moveTo(0, i * GRID_SIZE);
    ctx.lineTo(canvas.value.width, i * GRID_SIZE);
    ctx.stroke();
  }
  
  // 绘制蛇
  snake.value.body.forEach((segment, index) => {
    if (!ctx) return;
    
    ctx.fillStyle = index === 0 ? '#00b894' : '#55efc4'; // 头部深绿，身体浅绿
    ctx.fillRect(
      segment.x * GRID_SIZE + 1,
      segment.y * GRID_SIZE + 1,
      GRID_SIZE - 2,
      GRID_SIZE - 2
    );
    
    // 蛇头眼睛
    if (index === 0) {
      ctx.fillStyle = '#2d3436';
      const eyeSize = 3;
      const eyeOffset = 5;
      
      switch (snake.value.direction) {
        case Direction.UP:
          ctx.fillRect(segment.x * GRID_SIZE + eyeOffset, segment.y * GRID_SIZE + 3, eyeSize, eyeSize);
          ctx.fillRect(segment.x * GRID_SIZE + GRID_SIZE - eyeOffset - eyeSize, segment.y * GRID_SIZE + 3, eyeSize, eyeSize);
          break;
        case Direction.DOWN:
          ctx.fillRect(segment.x * GRID_SIZE + eyeOffset, segment.y * GRID_SIZE + GRID_SIZE - 6, eyeSize, eyeSize);
          ctx.fillRect(segment.x * GRID_SIZE + GRID_SIZE - eyeOffset - eyeSize, segment.y * GRID_SIZE + GRID_SIZE - 6, eyeSize, eyeSize);
          break;
        case Direction.LEFT:
          ctx.fillRect(segment.x * GRID_SIZE + 3, segment.y * GRID_SIZE + eyeOffset, eyeSize, eyeSize);
          ctx.fillRect(segment.x * GRID_SIZE + 3, segment.y * GRID_SIZE + GRID_SIZE - eyeOffset - eyeSize, eyeSize, eyeSize);
          break;
        case Direction.RIGHT:
          ctx.fillRect(segment.x * GRID_SIZE + GRID_SIZE - 6, segment.y * GRID_SIZE + eyeOffset, eyeSize, eyeSize);
          ctx.fillRect(segment.x * GRID_SIZE + GRID_SIZE - 6, segment.y * GRID_SIZE + GRID_SIZE - eyeOffset - eyeSize, eyeSize, eyeSize);
          break;
      }
    }
  });
  
  // 绘制食物
  if (ctx) {
    const foodColor = food.value.type === 'bonus' ? '#fdcb6e' : '#e17055';
    ctx.fillStyle = foodColor;
    ctx.fillRect(
      food.value.position.x * GRID_SIZE + 2,
      food.value.position.y * GRID_SIZE + 2,
      GRID_SIZE - 4,
      GRID_SIZE - 4
    );
    
    // 奖励食物特效
    if (food.value.type === 'bonus') {
      ctx.strokeStyle = '#fdcb6e';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        food.value.position.x * GRID_SIZE + 1,
        food.value.position.y * GRID_SIZE + 1,
        GRID_SIZE - 2,
        GRID_SIZE - 2
      );
    }
  }
};

// 游戏循环
const gameUpdate = () => {
  if (gameState.value !== 'playing') return;
  
  moveSnake();
  
  if (checkCollision()) {
    gameOver();
    return;
  }
  
  draw();
};

// 改变方向
const changeDirection = (newDirection: Direction) => {
  const currentDirection = snake.value.direction;
  
  // 防止反向移动
  if (
    (newDirection === Direction.UP && currentDirection === Direction.DOWN) ||
    (newDirection === Direction.DOWN && currentDirection === Direction.UP) ||
    (newDirection === Direction.LEFT && currentDirection === Direction.RIGHT) ||
    (newDirection === Direction.RIGHT && currentDirection === Direction.LEFT)
  ) {
    return;
  }
  
  snake.value.nextDirection = newDirection;
};

// 游戏控制
const startGame = async () => {
  // 激活音频上下文
  if (audioCtx && audioCtx.state === 'suspended') {
    try {
      await audioCtx.resume();
    } catch (error) {
      console.warn('音频上下文激活失败:', error);
    }
  }

  gameState.value = 'playing';
  score.value = 0;
  isNewRecord.value = false;

  // 重置蛇
  snake.value = {
    body: [{ x: 10, y: 10 }],
    direction: Direction.RIGHT,
    nextDirection: Direction.RIGHT
  };

  // 重置食物
  food.value = {
    position: generateFood(),
    type: 'normal'
  };

  // 开始游戏循环
  if (gameLoop) {
    clearInterval(gameLoop);
  }
  
  gameLoop = setInterval(gameUpdate, 150); // 150ms间隔，控制游戏速度
};

const gameOver = () => {
  gameState.value = 'gameOver';
  if (gameLoop) {
    clearInterval(gameLoop);
    gameLoop = null;
  }
  
  // 检查是否创造新纪录
  if (score.value > bestScore.value) {
    bestScore.value = score.value;
    isNewRecord.value = true;
    localStorage.setItem('snakeBestScore', bestScore.value.toString());
  }
  
  playGameOverSound();
};

const restartGame = () => {
  startGame();
};

// 事件处理
const handleCanvasClick = () => {
  if (gameState.value === 'playing') {
    // 可以添加暂停功能
  }
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (gameState.value === 'playing') {
    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        e.preventDefault();
        changeDirection(Direction.UP);
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        e.preventDefault();
        changeDirection(Direction.DOWN);
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        e.preventDefault();
        changeDirection(Direction.LEFT);
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        e.preventDefault();
        changeDirection(Direction.RIGHT);
        break;
    }
  } else if (gameState.value === 'start') {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      startGame();
    }
  } else if (gameState.value === 'gameOver') {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      restartGame();
    }
  }
};

// 生命周期
onMounted(async () => {
  await nextTick();
  
  if (canvas.value) {
    ctx = canvas.value.getContext('2d');
    
    // 初始绘制
    if (ctx) {
      draw();
    }
  }
  
  initAudio();
  document.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  if (gameLoop) {
    clearInterval(gameLoop);
  }
  document.removeEventListener('keydown', handleKeyDown);
});
</script>

<style scoped>
.snake-game {
  width: 100%;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #2d3436 0%, #636e72 100%);
  font-family: 'Arial', sans-serif;
  overflow: hidden;
}

.game-container {
  position: relative;
}

.game-canvas {
  background-color: #2d3436;
  border: 4px solid #00b894;
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.score-display {
  position: absolute;
  top: -50px;
  width: 100%;
  text-align: center;
  font-size: 20px;
  font-weight: bold;
  color: white;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  pointer-events: none;
}

.mute-btn {
  position: absolute;
  top: -45px;
  right: 0;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  border-radius: 50%;
  width: 35px;
  height: 35px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.mute-btn:hover {
  background: rgba(0, 0, 0, 0.7);
  transform: scale(1.1);
}

.game-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.85);
  border-radius: 4px;
  color: white;
  text-align: center;
}

.start-screen h1,
.game-over-screen h1 {
  color: #00b894;
  margin-bottom: 20px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  font-size: 2.5rem;
}

.start-screen p,
.game-over-screen p {
  margin: 10px 0;
  font-size: 1.1rem;
}

.hint {
  font-size: 0.9rem !important;
  color: #ddd !important;
  margin-top: 10px !important;
}

.final-score {
  color: #00b894;
  font-weight: bold;
  font-size: 1.3em;
}

.new-record {
  color: #fdcb6e !important;
  font-weight: bold !important;
  font-size: 1.2rem !important;
  animation: glow 1s ease-in-out infinite alternate;
}

@keyframes glow {
  from { text-shadow: 0 0 5px #fdcb6e; }
  to { text-shadow: 0 0 20px #fdcb6e, 0 0 30px #fdcb6e; }
}

.game-btn {
  background: linear-gradient(to bottom, #00b894, #00a085);
  border: none;
  border-radius: 25px;
  padding: 15px 30px;
  font-size: 18px;
  font-weight: bold;
  color: white;
  cursor: pointer;
  margin: 20px 10px 10px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease;
}

.game-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
  background: linear-gradient(to bottom, #00a085, #00b894);
}

.game-btn:active {
  transform: translateY(0);
}

.controls-hint {
  position: absolute;
  bottom: -80px;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
}

.control-keys {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.key-row {
  display: flex;
  gap: 5px;
}

.key {
  display: inline-block;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  font-size: 10px;
  min-width: 20px;
  text-align: center;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .game-canvas {
    border-width: 2px;
  }
  
  .start-screen h1,
  .game-over-screen h1 {
    font-size: 2rem;
  }
  
  .game-btn {
    padding: 12px 24px;
    font-size: 16px;
  }
  
  .score-display {
    font-size: 16px;
    top: -40px;
  }
  
  .controls-hint {
    bottom: -60px;
  }
}
</style>