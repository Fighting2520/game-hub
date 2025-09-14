<template>
  <div class="flappy-bee-game">
    <div class="game-container">
      <canvas 
        ref="canvas" 
        width="320" 
        height="480"
        @click="handleCanvasClick"
        class="game-canvas"
      />
      
      <!-- 分数显示 -->
      <div class="score-display">
        Score: <span>{{ score }}</span>
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
        <h1>Flappy Bee</h1>
        <p>点击或按空格键开始</p>
        <p class="hint">游戏包含音效和背景音乐</p>
        <button @click="startGame" class="game-btn">开始游戏</button>
      </div>
      
      <!-- 游戏结束界面 -->
      <div v-show="gameState === 'gameOver'" class="game-overlay game-over-screen">
        <h1>游戏结束!</h1>
        <p>最终得分: <span class="final-score">{{ score }}</span></p>
        <button @click="restartGame" class="game-btn">再玩一次</button>
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
const isMuted = ref(false);

// Canvas 相关
const canvas = ref<HTMLCanvasElement | null>(null);
let ctx: CanvasRenderingContext2D | null = null;
let gameLoop: number | null = null;
let frames = 0;

// 音频上下文
let audioCtx: AudioContext | null = null;
let bgMusic: HTMLAudioElement | null = null;

// 游戏对象
interface Bee {
  x: number;
  y: number;
  radius: number;
  gravity: number;
  velocity: number;
  jump: number;
}

interface Pipe {
  x: number;
  y: number;
}

interface PipeSystem {
  position: Pipe[];
  gap: number;
  maxYPos: number;
  width: number;
  speed: number;
}

const bee = ref<Bee>({
  x: 50,
  y: 240,
  radius: 15,
  gravity: 0.5,
  velocity: 0,
  jump: -8
});

const pipes = ref<PipeSystem>({
  position: [],
  gap: 150,
  maxYPos: 250,
  width: 50,
  speed: 2
});

// 初始化音频
const initAudio = () => {
  try {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // 创建背景音乐
    bgMusic = new Audio();
    // 使用public目录中的静态资源
    bgMusic.src = '/assets/games/flappy-bee/bgm.mp3';
    bgMusic.loop = true;
    bgMusic.volume = 0.3;
    
    // 读取用户之前的静音设置
    const savedMute = localStorage.getItem('flappyBeeMuted');
    if (savedMute === 'true') {
      isMuted.value = true;
      if (bgMusic) bgMusic.muted = true;
    }
  } catch (error) {
    console.warn('音频初始化失败:', error);
  }
};

// 音效生成函数
const createBuzzerSound = (frequency: number, duration: number) => {
  if (!audioCtx || isMuted.value) return;
  
  try {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'sawtooth';
    oscillator.frequency.value = frequency;
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
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
const playJumpSound = () => createBuzzerSound(400, 0.2);
const playHitSound = () => createBuzzerSound(150, 0.5);
const playScoreSound = () => {
  createBuzzerSound(600, 0.1);
  setTimeout(() => createBuzzerSound(800, 0.1), 100);
};

// 背景音乐控制
const startBackgroundMusic = async () => {
  if (bgMusic && !isMuted.value) {
    try {
      bgMusic.currentTime = 0;
      await bgMusic.play();
      console.log('背景音乐播放成功');
    } catch (error) {
      console.warn('背景音乐播放失败 - 这通常是由于浏览器的自动播放限制:', error);
      // 可以在这里添加用户提示，告知需要手动启用音乐
    }
  }
};

const stopBackgroundMusic = () => {
  if (bgMusic) {
    bgMusic.pause();
  }
};

const toggleMute = () => {
  isMuted.value = !isMuted.value;
  if (bgMusic) {
    bgMusic.muted = isMuted.value;
  }
  localStorage.setItem('flappyBeeMuted', isMuted.value.toString());
};

// 绘制蜜蜂
const drawBee = () => {
  if (!ctx) return;
  
  const beeObj = bee.value;
  ctx.save();
  ctx.translate(beeObj.x, beeObj.y);

  // 身体（椭圆，黄黑相间条纹）
  ctx.beginPath();
  ctx.ellipse(0, 0, beeObj.radius * 1.2, beeObj.radius, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#FFD93B';
  ctx.fill();

  // 黑色条纹
  ctx.fillStyle = '#333';
  for (let i = -0.6; i <= 0.6; i += 0.6) {
    ctx.beginPath();
    ctx.ellipse(0, 0, beeObj.radius * 1.2, beeObj.radius, 0, Math.PI * i, Math.PI * (i + 0.3));
    ctx.fill();
  }

  // 翅膀
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.ellipse(-beeObj.radius * 0.6, -beeObj.radius * 1.2, beeObj.radius * 0.9, beeObj.radius * 0.5, -Math.PI / 6, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.beginPath();
  ctx.ellipse(beeObj.radius * 0.6, -beeObj.radius * 1.2, beeObj.radius * 0.9, beeObj.radius * 0.5, Math.PI / 6, 0, Math.PI * 2);
  ctx.fill();

  // 头部
  ctx.beginPath();
  ctx.arc(beeObj.radius * 1.3, -beeObj.radius * 0.2, beeObj.radius * 0.6, 0, Math.PI * 2);
  ctx.fillStyle = '#333';
  ctx.fill();

  // 眼睛
  ctx.beginPath();
  ctx.arc(beeObj.radius * 1.5, -beeObj.radius * 0.3, beeObj.radius * 0.25, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  
  ctx.beginPath();
  ctx.arc(beeObj.radius * 1.5, -beeObj.radius * 0.3, beeObj.radius * 0.1, 0, Math.PI * 2);
  ctx.fillStyle = '#000';
  ctx.fill();

  // 触角
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(beeObj.radius * 1.3, -beeObj.radius * 0.6);
  ctx.quadraticCurveTo(beeObj.radius * 1.8, -beeObj.radius * 1.2, beeObj.radius * 2.0, -beeObj.radius * 1.5);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(beeObj.radius * 1.3, -beeObj.radius * 0.6);
  ctx.quadraticCurveTo(beeObj.radius * 1.0, -beeObj.radius * 1.2, beeObj.radius * 0.8, -beeObj.radius * 1.5);
  ctx.stroke();

  ctx.restore();
};

// 绘制管道
const drawPipes = () => {
  if (!ctx || !canvas.value) return;
  
  const pipeSystem = pipes.value;
  
  for (const pipe of pipeSystem.position) {
    // 上管道
    ctx.fillStyle = '#00b894';
    ctx.fillRect(pipe.x, 0, pipeSystem.width, pipe.y);

    // 下管道
    const bottomPipeY = pipe.y + pipeSystem.gap;
    ctx.fillRect(pipe.x, bottomPipeY, pipeSystem.width, canvas.value.height - bottomPipeY);

    // 管道边框
    ctx.strokeStyle = '#2d3436';
    ctx.lineWidth = 2;
    ctx.strokeRect(pipe.x, 0, pipeSystem.width, pipe.y);
    ctx.strokeRect(pipe.x, bottomPipeY, pipeSystem.width, canvas.value.height - bottomPipeY);
  }
};

// 更新蜜蜂
const updateBee = () => {
  if (!canvas.value) return;
  
  const beeObj = bee.value;
  beeObj.velocity += beeObj.gravity;
  beeObj.y += beeObj.velocity;

  // 防止蜜蜂飞出画布顶部
  if (beeObj.y - beeObj.radius < 0) {
    beeObj.y = beeObj.radius;
    beeObj.velocity = 0;
  }

  // 检查是否掉落到地面
  if (beeObj.y + beeObj.radius > canvas.value.height) {
    gameOver();
  }
};

// 更新管道
const updatePipes = () => {
  if (!canvas.value || gameState.value !== 'playing') return;
  
  const pipeSystem = pipes.value;
  const beeObj = bee.value;

  // 每150帧生成新管道
  if (frames % 150 === 0) {
    pipeSystem.position.push({
      x: canvas.value.width,
      y: Math.floor(Math.random() * pipeSystem.maxYPos) + 50
    });
  }

  for (let i = pipeSystem.position.length - 1; i >= 0; i--) {
    const pipe = pipeSystem.position[i];

    // 移动管道
    pipe.x -= pipeSystem.speed;

    // 检查碰撞
    if (checkCollision(pipe)) {
      gameOver();
      return;
    }

    // 检查得分
    if (pipe.x + pipeSystem.width === beeObj.x) {
      score.value++;
      playScoreSound();
    }

    // 移除屏幕外的管道
    if (pipe.x + pipeSystem.width < 0) {
      pipeSystem.position.splice(i, 1);
    }
  }
};

// 碰撞检测
const checkCollision = (pipe: Pipe): boolean => {
  const beeObj = bee.value;
  const pipeSystem = pipes.value;

  // 检查与上管道的碰撞
  if (beeObj.x + beeObj.radius > pipe.x &&
      beeObj.x - beeObj.radius < pipe.x + pipeSystem.width &&
      beeObj.y - beeObj.radius < pipe.y) {
    return true;
  }

  // 检查与下管道的碰撞
  const bottomPipeY = pipe.y + pipeSystem.gap;
  if (beeObj.x + beeObj.radius > pipe.x &&
      beeObj.x - beeObj.radius < pipe.x + pipeSystem.width &&
      beeObj.y + beeObj.radius > bottomPipeY) {
    return true;
  }

  return false;
};

// 游戏循环
const gameUpdate = () => {
  if (!ctx || !canvas.value || gameState.value !== 'playing') return;

  frames++;

  // 清空画布
  ctx.clearRect(0, 0, canvas.value.width, canvas.value.height);

  // 绘制背景
  ctx.fillStyle = '#74b9ff';
  ctx.fillRect(0, 0, canvas.value.width, canvas.value.height);

  // 绘制地面
  ctx.fillStyle = '#00b894';
  ctx.fillRect(0, canvas.value.height - 20, canvas.value.width, 20);

  // 更新和绘制对象
  updatePipes();
  drawPipes();
  updateBee();
  drawBee();
};

// 蜜蜂跳跃
const beeFlap = () => {
  bee.value.velocity = bee.value.jump;
  playJumpSound();
};

// 游戏控制
const startGame = async () => {
  // 先尝试激活音频上下文（如果需要的话）
  if (audioCtx && audioCtx.state === 'suspended') {
    try {
      await audioCtx.resume();
    } catch (error) {
      console.warn('音频上下文激活失败:', error);
    }
  }

  gameState.value = 'playing';
  score.value = 0;
  frames = 0;

  // 重置蜜蜂位置
  bee.value.y = canvas.value?.height ? canvas.value.height / 2 : 240;
  bee.value.velocity = 0;

  // 重置管道
  pipes.value.position = [];

  // 开始游戏循环
  if (gameLoop) {
    cancelAnimationFrame(gameLoop);
  }
  
  startBackgroundMusic();
  
  const loop = () => {
    gameUpdate();
    if (gameState.value === 'playing') {
      gameLoop = requestAnimationFrame(loop);
    }
  };
  gameLoop = requestAnimationFrame(loop);
};

const gameOver = () => {
  gameState.value = 'gameOver';
  if (gameLoop) {
    cancelAnimationFrame(gameLoop);
    gameLoop = null;
  }
  stopBackgroundMusic();
  playHitSound();
};

const restartGame = () => {
  startGame();
};

// 事件处理
const handleCanvasClick = () => {
  if (gameState.value === 'playing') {
    beeFlap();
  }
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.code === 'Space') {
    e.preventDefault();
    
    if (gameState.value === 'playing') {
      beeFlap();
    } else if (gameState.value === 'start') {
      startGame();
    } else if (gameState.value === 'gameOver') {
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
      ctx.fillStyle = '#74b9ff';
      ctx.fillRect(0, 0, canvas.value.width, canvas.value.height);
      drawBee();
    }
  }
  
  initAudio();
  document.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  if (gameLoop) {
    cancelAnimationFrame(gameLoop);
  }
  stopBackgroundMusic();
  document.removeEventListener('keydown', handleKeyDown);
});
</script>

<style scoped>
.flappy-bee-game {
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
  background-color: #74b9ff;
  border: 4px solid #00b894;
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  cursor: pointer;
}

.score-display {
  position: absolute;
  top: 20px;
  width: 100%;
  text-align: center;
  font-size: 24px;
  font-weight: bold;
  color: white;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  pointer-events: none;
}

.mute-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  cursor: pointer;
  font-size: 16px;
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
  background-color: rgba(0, 0, 0, 0.8);
  border-radius: 6px;
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
}
</style>