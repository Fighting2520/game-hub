<template>
  <div class="tetris-game">
    <div class="game-container">
      <div class="game-board">
        <!-- 主游戏区域 -->
        <canvas 
          ref="canvas" 
          width="300" 
          height="600"
          class="game-canvas"
        />
        
        <!-- 侧边信息面板 -->
        <div class="info-panel">
          <!-- 下一个方块预览 -->
          <div class="next-piece">
            <h3>下一个</h3>
            <canvas ref="nextCanvas" width="80" height="80" class="next-canvas"></canvas>
          </div>
          
          <!-- 分数信息 -->
          <div class="score-info">
            <div class="score-item">
              <span class="label">分数</span>
              <span class="value">{{ score }}</span>
            </div>
            <div class="score-item">
              <span class="label">等级</span>
              <span class="value">{{ level }}</span>
            </div>
            <div class="score-item">
              <span class="label">行数</span>
              <span class="value">{{ lines }}</span>
            </div>
          </div>
          
          <!-- 控制说明 -->
          <div class="controls-info">
            <h4>控制</h4>
            <div class="control-item">
              <span class="key">←→</span>
              <span>移动</span>
            </div>
            <div class="control-item">
              <span class="key">↓</span>
              <span>加速</span>
            </div>
            <div class="control-item">
              <span class="key">↑</span>
              <span>旋转</span>
            </div>
            <div class="control-item">
              <span class="key">空格</span>
              <span>暂停</span>
            </div>
          </div>
        </div>
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
        <h1>🧩 俄罗斯方块</h1>
        <p>使用方向键控制方块</p>
        <p class="hint">消除整行获得分数，等级越高速度越快</p>
        <button @click="startGame" class="game-btn">开始游戏</button>
      </div>
      
      <!-- 暂停界面 -->
      <div v-show="gameState === 'paused'" class="game-overlay pause-screen">
        <h1>游戏暂停</h1>
        <p>按空格键继续游戏</p>
        <button @click="resumeGame" class="game-btn">继续游戏</button>
        <button @click="restartGame" class="game-btn secondary">重新开始</button>
      </div>
      
      <!-- 游戏结束界面 -->
      <div v-show="gameState === 'gameOver'" class="game-overlay game-over-screen">
        <h1>游戏结束!</h1>
        <div class="final-stats">
          <p>最终分数: <span class="final-score">{{ score }}</span></p>
          <p>消除行数: <span class="final-lines">{{ lines }}</span></p>
          <p>达到等级: <span class="final-level">{{ level }}</span></p>
        </div>
        <p v-if="isNewRecord" class="new-record">🎉 新纪录！</p>
        <button @click="restartGame" class="game-btn">再玩一次</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';

// 游戏状态
type GameState = 'start' | 'playing' | 'paused' | 'gameOver';
const gameState = ref<GameState>('start');
const score = ref(0);
const level = ref(1);
const lines = ref(0);
const isMuted = ref(false);
const isNewRecord = ref(false);

// Canvas 相关
const canvas = ref<HTMLCanvasElement | null>(null);
const nextCanvas = ref<HTMLCanvasElement | null>(null);
let ctx: CanvasRenderingContext2D | null = null;
let nextCtx: CanvasRenderingContext2D | null = null;
let gameLoop: number | null = null;
let lastTime = 0;
let dropTime = 0;

// 游戏配置
const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const BLOCK_SIZE = 30;

// 方块类型和颜色
const TETROMINOS = {
  I: {
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    color: '#74b9ff'
  },
  O: {
    shape: [
      [1, 1],
      [1, 1]
    ],
    color: '#fdcb6e'
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: '#fd79a8'
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0]
    ],
    color: '#55efc4'
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0]
    ],
    color: '#e17055'
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: '#a29bfe'
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: '#00b894'
  }
};

type TetrominoType = keyof typeof TETROMINOS;

interface Piece {
  type: TetrominoType;
  shape: number[][];
  x: number;
  y: number;
  color: string;
}

// 游戏状态
const board = ref<string[][]>([]);
const currentPiece = ref<Piece | null>(null);
const nextPiece = ref<Piece | null>(null);
const dropInterval = ref(1000); // 下落间隔（毫秒）

// 音频相关
let audioCtx: AudioContext | null = null;

// 初始化游戏板
const initBoard = () => {
  board.value = Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(''));
};

// 初始化音频
const initAudio = () => {
  try {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // 读取用户设置
    const savedMute = localStorage.getItem('tetrisMuted');
    if (savedMute === 'true') {
      isMuted.value = true;
    }
  } catch (error) {
    console.warn('音频初始化失败:', error);
  }
};

// 音效函数
const createTone = (frequency: number, duration: number, type: OscillatorType = 'square') => {
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

const playMoveSound = () => createTone(200, 0.1, 'sine');
const playRotateSound = () => createTone(300, 0.1, 'sine');
const playDropSound = () => createTone(150, 0.2, 'sawtooth');
const playLineClearSound = () => {
  createTone(400, 0.1, 'sine');
  setTimeout(() => createTone(500, 0.1, 'sine'), 100);
  setTimeout(() => createTone(600, 0.1, 'sine'), 200);
};
const playGameOverSound = () => {
  createTone(200, 0.3, 'sawtooth');
  setTimeout(() => createTone(150, 0.5, 'sawtooth'), 300);
};

const toggleMute = () => {
  isMuted.value = !isMuted.value;
  localStorage.setItem('tetrisMuted', isMuted.value.toString());
};

// 生成随机方块
const getRandomPiece = (): Piece => {
  const types = Object.keys(TETROMINOS) as TetrominoType[];
  const type = types[Math.floor(Math.random() * types.length)];
  const tetromino = TETROMINOS[type];
  
  return {
    type,
    shape: tetromino.shape.map(row => [...row]),
    x: Math.floor(BOARD_WIDTH / 2) - Math.floor(tetromino.shape[0].length / 2),
    y: 0,
    color: tetromino.color
  };
};

// 旋转方块
const rotatePiece = (piece: Piece): number[][] => {
  const rotated = piece.shape[0].map((_, index) =>
    piece.shape.map(row => row[index]).reverse()
  );
  return rotated;
};

// 检查碰撞
const isValidPosition = (piece: Piece, newX: number, newY: number, newShape?: number[][]): boolean => {
  const shape = newShape || piece.shape;
  
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (shape[y][x]) {
        const boardX = newX + x;
        const boardY = newY + y;
        
        // 检查边界
        if (boardX < 0 || boardX >= BOARD_WIDTH || boardY >= BOARD_HEIGHT) {
          return false;
        }
        
        // 检查是否与已放置的方块重叠
        if (boardY >= 0 && board.value[boardY][boardX]) {
          return false;
        }
      }
    }
  }
  
  return true;
};

// 放置方块到游戏板
const placePiece = (piece: Piece) => {
  for (let y = 0; y < piece.shape.length; y++) {
    for (let x = 0; x < piece.shape[y].length; x++) {
      if (piece.shape[y][x]) {
        const boardY = piece.y + y;
        const boardX = piece.x + x;
        if (boardY >= 0) {
          board.value[boardY][boardX] = piece.color;
        }
      }
    }
  }
};

// 检查并清除完整的行
const clearLines = (): number => {
  let linesCleared = 0;
  
  for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
    if (board.value[y].every(cell => cell !== '')) {
      // 移除这一行
      board.value.splice(y, 1);
      // 在顶部添加新的空行
      board.value.unshift(Array(BOARD_WIDTH).fill(''));
      linesCleared++;
      y++; // 重新检查这一行
    }
  }
  
  if (linesCleared > 0) {
    playLineClearSound();
    
    // 更新分数和等级
    const points = [0, 100, 300, 500, 800][linesCleared] * level.value;
    score.value += points;
    lines.value += linesCleared;
    
    // 每10行提升一个等级
    const newLevel = Math.floor(lines.value / 10) + 1;
    if (newLevel > level.value) {
      level.value = newLevel;
      // 提高下落速度
      dropInterval.value = Math.max(100, 1000 - (level.value - 1) * 100);
    }
  }
  
  return linesCleared;
};

// 生成新方块
const spawnNewPiece = () => {
  currentPiece.value = nextPiece.value || getRandomPiece();
  nextPiece.value = getRandomPiece();
  
  // 检查游戏是否结束
  if (!isValidPosition(currentPiece.value, currentPiece.value.x, currentPiece.value.y)) {
    gameOver();
  }
};

// 移动方块
const movePiece = (dx: number, dy: number): boolean => {
  if (!currentPiece.value) return false;
  
  const newX = currentPiece.value.x + dx;
  const newY = currentPiece.value.y + dy;
  
  if (isValidPosition(currentPiece.value, newX, newY)) {
    currentPiece.value.x = newX;
    currentPiece.value.y = newY;
    return true;
  }
  
  return false;
};

// 旋转当前方块
const rotateCurrentPiece = () => {
  if (!currentPiece.value) return;
  
  const rotatedShape = rotatePiece(currentPiece.value);
  
  if (isValidPosition(currentPiece.value, currentPiece.value.x, currentPiece.value.y, rotatedShape)) {
    currentPiece.value.shape = rotatedShape;
    playRotateSound();
  }
};

// 硬降（直接落到底部）
const hardDrop = () => {
  if (!currentPiece.value) return;
  
  while (movePiece(0, 1)) {
    // 继续下落直到不能移动
  }
  
  // 立即放置方块
  placePiece(currentPiece.value);
  clearLines();
  spawnNewPiece();
  playDropSound();
};

// 绘制方块
const drawBlock = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string) => {
  ctx.fillStyle = color;
  ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
  
  // 绘制边框
  ctx.strokeStyle = '#2d3436';
  ctx.lineWidth = 1;
  ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
  
  // 添加高光效果
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.fillRect(x * BLOCK_SIZE + 1, y * BLOCK_SIZE + 1, BLOCK_SIZE - 2, 2);
  ctx.fillRect(x * BLOCK_SIZE + 1, y * BLOCK_SIZE + 1, 2, BLOCK_SIZE - 2);
};

// 绘制游戏板
const drawBoard = () => {
  if (!ctx || !canvas.value) return;
  
  // 清空画布
  ctx.fillStyle = '#2d3436';
  ctx.fillRect(0, 0, canvas.value.width, canvas.value.height);
  
  // 绘制网格
  ctx.strokeStyle = '#636e72';
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= BOARD_WIDTH; x++) {
    ctx.beginPath();
    ctx.moveTo(x * BLOCK_SIZE, 0);
    ctx.lineTo(x * BLOCK_SIZE, BOARD_HEIGHT * BLOCK_SIZE);
    ctx.stroke();
  }
  for (let y = 0; y <= BOARD_HEIGHT; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * BLOCK_SIZE);
    ctx.lineTo(BOARD_WIDTH * BLOCK_SIZE, y * BLOCK_SIZE);
    ctx.stroke();
  }
  
  // 绘制已放置的方块
  for (let y = 0; y < BOARD_HEIGHT; y++) {
    for (let x = 0; x < BOARD_WIDTH; x++) {
      if (board.value[y][x]) {
        drawBlock(ctx, x, y, board.value[y][x]);
      }
    }
  }
  
  // 绘制当前方块
  if (currentPiece.value) {
    for (let y = 0; y < currentPiece.value.shape.length; y++) {
      for (let x = 0; x < currentPiece.value.shape[y].length; x++) {
        if (currentPiece.value.shape[y][x]) {
          const boardX = currentPiece.value.x + x;
          const boardY = currentPiece.value.y + y;
          if (boardY >= 0) {
            drawBlock(ctx, boardX, boardY, currentPiece.value.color);
          }
        }
      }
    }
  }
};

// 绘制下一个方块
const drawNextPiece = () => {
  if (!nextCtx || !nextCanvas.value || !nextPiece.value) return;
  
  // 清空画布
  nextCtx.fillStyle = '#2d3436';
  nextCtx.fillRect(0, 0, nextCanvas.value.width, nextCanvas.value.height);
  
  // 计算居中位置
  const shape = nextPiece.value.shape;
  const blockSize = 16;
  const offsetX = (nextCanvas.value.width - shape[0].length * blockSize) / 2;
  const offsetY = (nextCanvas.value.height - shape.length * blockSize) / 2;
  
  // 绘制方块
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (shape[y][x]) {
        nextCtx.fillStyle = nextPiece.value.color;
        nextCtx.fillRect(
          offsetX + x * blockSize,
          offsetY + y * blockSize,
          blockSize,
          blockSize
        );
        
        // 边框
        nextCtx.strokeStyle = '#2d3436';
        nextCtx.lineWidth = 1;
        nextCtx.strokeRect(
          offsetX + x * blockSize,
          offsetY + y * blockSize,
          blockSize,
          blockSize
        );
      }
    }
  }
};

// 游戏循环
const gameUpdate = (currentTime: number) => {
  if (gameState.value !== 'playing') return;
  
  const deltaTime = currentTime - lastTime;
  dropTime += deltaTime;
  
  // 方块自动下落
  if (dropTime >= dropInterval.value) {
    if (currentPiece.value) {
      if (!movePiece(0, 1)) {
        // 无法继续下落，放置方块
        placePiece(currentPiece.value);
        clearLines();
        spawnNewPiece();
      }
    }
    dropTime = 0;
  }
  
  drawBoard();
  drawNextPiece();
  
  lastTime = currentTime;
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
  level.value = 1;
  lines.value = 0;
  dropInterval.value = 1000;
  isNewRecord.value = false;

  initBoard();
  nextPiece.value = getRandomPiece();
  spawnNewPiece();

  // 开始游戏循环
  if (gameLoop) {
    cancelAnimationFrame(gameLoop);
  }
  
  lastTime = performance.now();
  dropTime = 0;
  
  const loop = (currentTime: number) => {
    gameUpdate(currentTime);
    if (gameState.value === 'playing') {
      gameLoop = requestAnimationFrame(loop);
    }
  };
  gameLoop = requestAnimationFrame(loop);
};

const pauseGame = () => {
  if (gameState.value === 'playing') {
    gameState.value = 'paused';
    if (gameLoop) {
      cancelAnimationFrame(gameLoop);
      gameLoop = null;
    }
  }
};

const resumeGame = () => {
  if (gameState.value === 'paused') {
    gameState.value = 'playing';
    lastTime = performance.now();
    
    const loop = (currentTime: number) => {
      gameUpdate(currentTime);
      if (gameState.value === 'playing') {
        gameLoop = requestAnimationFrame(loop);
      }
    };
    gameLoop = requestAnimationFrame(loop);
  }
};

const gameOver = () => {
  gameState.value = 'gameOver';
  if (gameLoop) {
    cancelAnimationFrame(gameLoop);
    gameLoop = null;
  }
  
  // 检查最高分
  const savedBestScore = localStorage.getItem('tetrisBestScore');
  const bestScore = savedBestScore ? parseInt(savedBestScore, 10) : 0;
  
  if (score.value > bestScore) {
    isNewRecord.value = true;
    localStorage.setItem('tetrisBestScore', score.value.toString());
  }
  
  playGameOverSound();
};

const restartGame = () => {
  startGame();
};

// 事件处理
const handleKeyDown = (e: KeyboardEvent) => {
  if (gameState.value === 'playing') {
    switch (e.key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        e.preventDefault();
        if (movePiece(-1, 0)) {
          playMoveSound();
        }
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        e.preventDefault();
        if (movePiece(1, 0)) {
          playMoveSound();
        }
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        e.preventDefault();
        if (movePiece(0, 1)) {
          score.value += 1; // 软降奖励分数
        }
        break;
      case 'ArrowUp':
      case 'w':
      case 'W':
        e.preventDefault();
        rotateCurrentPiece();
        break;
      case ' ':
        e.preventDefault();
        pauseGame();
        break;
    }
  } else if (gameState.value === 'paused') {
    if (e.key === ' ') {
      e.preventDefault();
      resumeGame();
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
  }
  
  if (nextCanvas.value) {
    nextCtx = nextCanvas.value.getContext('2d');
  }
  
  initAudio();
  initBoard();
  
  // 初始绘制
  if (ctx) {
    drawBoard();
  }
  
  document.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  if (gameLoop) {
    cancelAnimationFrame(gameLoop);
  }
  document.removeEventListener('keydown', handleKeyDown);
});
</script>

<style scoped>
.tetris-game {
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

.game-board {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.game-canvas {
  background-color: #2d3436;
  border: 4px solid #00b894;
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.info-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 150px;
}

.next-piece {
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid #636e72;
  border-radius: 8px;
  padding: 15px;
  text-align: center;
}

.next-piece h3 {
  margin: 0 0 10px 0;
  color: #00b894;
  font-size: 14px;
}

.next-canvas {
  background-color: #2d3436;
  border: 1px solid #636e72;
  border-radius: 4px;
}

.score-info {
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid #636e72;
  border-radius: 8px;
  padding: 15px;
}

.score-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
}

.score-item:last-child {
  margin-bottom: 0;
}

.label {
  color: #ddd;
}

.value {
  color: #00b894;
  font-weight: bold;
}

.controls-info {
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid #636e72;
  border-radius: 8px;
  padding: 15px;
}

.controls-info h4 {
  margin: 0 0 10px 0;
  color: #00b894;
  font-size: 14px;
}

.control-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  font-size: 12px;
}

.control-item:last-child {
  margin-bottom: 0;
}

.key {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  padding: 2px 6px;
  font-size: 10px;
  color: #ddd;
}

.mute-btn {
  position: absolute;
  top: -50px;
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
  border-radius: 8px;
  color: white;
  text-align: center;
  z-index: 10;
}

.start-screen h1,
.pause-screen h1,
.game-over-screen h1 {
  color: #00b894;
  margin-bottom: 20px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  font-size: 2.5rem;
}

.start-screen p,
.pause-screen p,
.game-over-screen p {
  margin: 10px 0;
  font-size: 1.1rem;
}

.hint {
  font-size: 0.9rem !important;
  color: #ddd !important;
  margin-top: 10px !important;
}

.final-stats {
  margin: 20px 0;
}

.final-stats p {
  margin: 8px 0;
}

.final-score,
.final-lines,
.final-level {
  color: #00b894;
  font-weight: bold;
  font-size: 1.2em;
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
  margin: 10px;
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

.game-btn.secondary {
  background: linear-gradient(to bottom, #636e72, #2d3436);
}

.game-btn.secondary:hover {
  background: linear-gradient(to bottom, #2d3436, #636e72);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .game-board {
    flex-direction: column;
    align-items: center;
  }
  
  .info-panel {
    flex-direction: row;
    width: auto;
    gap: 10px;
  }
  
  .next-piece,
  .score-info,
  .controls-info {
    flex: 1;
    min-width: 120px;
  }
  
  .game-canvas {
    border-width: 2px;
  }
  
  .start-screen h1,
  .pause-screen h1,
  .game-over-screen h1 {
    font-size: 2rem;
  }
  
  .game-btn {
    padding: 12px 24px;
    font-size: 16px;
  }
}
</style>