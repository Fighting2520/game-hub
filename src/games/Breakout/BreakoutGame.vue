<template>
  <div class="breakout-game">
    <div class="game-container">
      <canvas 
        ref="canvas" 
        width="480" 
        height="640"
        @mousemove="handleMouseMove"
        @click="handleCanvasClick"
        class="game-canvas"
      />
      
      <!-- 分数和生命显示 -->
      <div class="game-info">
        <div class="info-item">
          <span class="label">分数:</span>
          <span class="value">{{ score }}</span>
        </div>
        <div class="info-item">
          <span class="label">生命:</span>
          <span class="value">{{ lives }}</span>
        </div>
        <div class="info-item">
          <span class="label">等级:</span>
          <span class="value">{{ level }}</span>
        </div>
        <div class="info-item">
          <span class="label">最高分:</span>
          <span class="value">{{ bestScore }}</span>
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
        <h1>🧱 打砖块</h1>
        <p>移动鼠标控制挡板，点击发射球</p>
        <p class="hint">打破所有砖块进入下一关，小心别让球掉落！</p>
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
          <p>达到等级: <span class="final-level">{{ level }}</span></p>
        </div>
        <p v-if="isNewRecord" class="new-record">🎉 新纪录！</p>
        <button @click="restartGame" class="game-btn">再玩一次</button>
      </div>
      
      <!-- 过关界面 -->
      <div v-show="gameState === 'levelComplete'" class="game-overlay level-complete-screen">
        <h1>🎉 过关了!</h1>
        <div class="level-stats">
          <p>等级: <span class="level-number">{{ level }}</span></p>
          <p>奖励分数: <span class="bonus-score">{{ levelBonus }}</span></p>
        </div>
        <button @click="nextLevel" class="game-btn">下一关</button>
      </div>
      
      <!-- 控制提示 -->
      <div v-show="gameState === 'playing'" class="controls-hint">
        <div class="hint-item">
          <span class="key">鼠标</span>
          <span>移动挡板</span>
        </div>
        <div class="hint-item">
          <span class="key">空格</span>
          <span>暂停</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';

// 游戏状态
type GameState = 'start' | 'playing' | 'paused' | 'gameOver' | 'levelComplete';
const gameState = ref<GameState>('start');
const score = ref(0);
const lives = ref(3);
const level = ref(1);
const bestScore = ref(0);
const levelBonus = ref(0);
const isMuted = ref(false);
const isNewRecord = ref(false);

// Canvas 相关
const canvas = ref<HTMLCanvasElement | null>(null);
let ctx: CanvasRenderingContext2D | null = null;
let gameLoop: number | null = null;

// 游戏配置
const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 640;
const PADDLE_WIDTH = 80;
const PADDLE_HEIGHT = 12;
const BALL_RADIUS = 8;
const BRICK_WIDTH = 48;
const BRICK_HEIGHT = 20;
const BRICK_ROWS = 8;
const BRICK_COLS = 9;
const BRICK_PADDING = 4;
const BRICK_OFFSET_TOP = 60;
const BRICK_OFFSET_LEFT = 24;

// 游戏对象接口
interface Ball {
  x: number;
  y: number;
  dx: number;
  dy: number;
  radius: number;
  speed: number;
}

interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Brick {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  points: number;
  visible: boolean;
}

// 游戏状态
const ball = ref<Ball>({
  x: CANVAS_WIDTH / 2,
  y: CANVAS_HEIGHT - 100,
  dx: 0,
  dy: 0,
  radius: BALL_RADIUS,
  speed: 4
});

const paddle = ref<Paddle>({
  x: CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2,
  y: CANVAS_HEIGHT - 30,
  width: PADDLE_WIDTH,
  height: PADDLE_HEIGHT
});

const bricks = ref<Brick[]>([]);
const ballLaunched = ref(false);

// 砖块颜色和分数配置
const BRICK_COLORS = [
  { color: '#e17055', points: 70 }, // 红色 - 最高分
  { color: '#fdcb6e', points: 60 }, // 橙色
  { color: '#00b894', points: 50 }, // 绿色
  { color: '#74b9ff', points: 40 }, // 蓝色
  { color: '#a29bfe', points: 30 }, // 紫色
  { color: '#fd79a8', points: 20 }, // 粉色
  { color: '#55efc4', points: 10 }, // 青色
  { color: '#636e72', points: 5 }   // 灰色 - 最低分
];

// 音频相关
let audioCtx: AudioContext | null = null;

// 初始化音频
const initAudio = () => {
  try {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // 读取用户设置
    const savedMute = localStorage.getItem('breakoutMuted');
    if (savedMute === 'true') {
      isMuted.value = true;
    }
    
    // 读取最高分
    const savedBestScore = localStorage.getItem('breakoutBestScore');
    if (savedBestScore) {
      bestScore.value = parseInt(savedBestScore, 10);
    }
  } catch (error) {
    console.warn('音频初始化失败:', error);
  }
};

// 音效函数
const createTone = (frequency: number, duration: number, type: OscillatorType = 'sine') => {
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

const playPaddleHitSound = () => createTone(200, 0.1, 'square');
const playBrickHitSound = () => createTone(400, 0.1, 'sine');
const playWallHitSound = () => createTone(150, 0.1, 'sawtooth');
const playLifeLostSound = () => createTone(100, 0.3, 'sawtooth');
const playLevelCompleteSound = () => {
  createTone(500, 0.2, 'sine');
  setTimeout(() => createTone(600, 0.2, 'sine'), 200);
  setTimeout(() => createTone(700, 0.3, 'sine'), 400);
};
const playGameOverSound = () => {
  createTone(200, 0.3, 'sawtooth');
  setTimeout(() => createTone(150, 0.5, 'sawtooth'), 300);
};

const toggleMute = () => {
  isMuted.value = !isMuted.value;
  localStorage.setItem('breakoutMuted', isMuted.value.toString());
};

// 初始化砖块
const initBricks = () => {
  bricks.value = [];
  
  for (let row = 0; row < BRICK_ROWS; row++) {
    for (let col = 0; col < BRICK_COLS; col++) {
      const colorIndex = Math.min(row, BRICK_COLORS.length - 1);
      const brick: Brick = {
        x: col * (BRICK_WIDTH + BRICK_PADDING) + BRICK_OFFSET_LEFT,
        y: row * (BRICK_HEIGHT + BRICK_PADDING) + BRICK_OFFSET_TOP,
        width: BRICK_WIDTH,
        height: BRICK_HEIGHT,
        color: BRICK_COLORS[colorIndex].color,
        points: BRICK_COLORS[colorIndex].points,
        visible: true
      };
      bricks.value.push(brick);
    }
  }
};

// 重置球的位置
const resetBall = () => {
  ball.value.x = paddle.value.x + paddle.value.width / 2;
  ball.value.y = paddle.value.y - ball.value.radius - 5;
  ball.value.dx = 0;
  ball.value.dy = 0;
  ballLaunched.value = false;
};

// 发射球
const launchBall = () => {
  if (!ballLaunched.value) {
    const angle = (Math.random() - 0.5) * Math.PI / 3; // -30° 到 30° 之间
    ball.value.dx = Math.sin(angle) * ball.value.speed;
    ball.value.dy = -Math.cos(angle) * ball.value.speed;
    ballLaunched.value = true;
  }
};

// 碰撞检测
const checkBallPaddleCollision = (): boolean => {
  const ballObj = ball.value;
  const paddleObj = paddle.value;
  
  return ballObj.x + ballObj.radius > paddleObj.x &&
         ballObj.x - ballObj.radius < paddleObj.x + paddleObj.width &&
         ballObj.y + ballObj.radius > paddleObj.y &&
         ballObj.y - ballObj.radius < paddleObj.y + paddleObj.height;
};

const checkBallBrickCollision = (brick: Brick): boolean => {
  const ballObj = ball.value;
  
  return ballObj.x + ballObj.radius > brick.x &&
         ballObj.x - ballObj.radius < brick.x + brick.width &&
         ballObj.y + ballObj.radius > brick.y &&
         ballObj.y - ballObj.radius < brick.y + brick.height;
};

// 更新球的位置
const updateBall = () => {
  if (!ballLaunched.value) {
    // 球跟随挡板移动
    ball.value.x = paddle.value.x + paddle.value.width / 2;
    return;
  }
  
  const ballObj = ball.value;
  
  // 移动球
  ballObj.x += ballObj.dx;
  ballObj.y += ballObj.dy;
  
  // 墙壁碰撞检测
  if (ballObj.x - ballObj.radius <= 0 || ballObj.x + ballObj.radius >= CANVAS_WIDTH) {
    ballObj.dx = -ballObj.dx;
    playWallHitSound();
  }
  
  if (ballObj.y - ballObj.radius <= 0) {
    ballObj.dy = -ballObj.dy;
    playWallHitSound();
  }
  
  // 挡板碰撞检测
  if (checkBallPaddleCollision()) {
    // 计算球相对于挡板中心的位置
    const paddleCenter = paddle.value.x + paddle.value.width / 2;
    const hitPos = (ballObj.x - paddleCenter) / (paddle.value.width / 2);
    
    // 根据击中位置调整反弹角度
    const angle = hitPos * Math.PI / 3; // 最大60度角
    ballObj.dx = Math.sin(angle) * ballObj.speed;
    ballObj.dy = -Math.abs(Math.cos(angle) * ballObj.speed); // 确保向上
    
    playPaddleHitSound();
  }
  
  // 砖块碰撞检测
  for (const brick of bricks.value) {
    if (brick.visible && checkBallBrickCollision(brick)) {
      brick.visible = false;
      score.value += brick.points;
      
      // 简单的反弹逻辑
      ballObj.dy = -ballObj.dy;
      
      playBrickHitSound();
      break; // 一次只处理一个砖块碰撞
    }
  }
  
  // 检查球是否掉落
  if (ballObj.y > CANVAS_HEIGHT) {
    lives.value--;
    playLifeLostSound();
    
    if (lives.value <= 0) {
      gameOver();
    } else {
      resetBall();
    }
  }
  
  // 检查是否所有砖块都被打破
  const remainingBricks = bricks.value.filter(brick => brick.visible).length;
  if (remainingBricks === 0) {
    levelComplete();
  }
};

// 绘制游戏
const draw = () => {
  if (!ctx || !canvas.value) return;
  
  // 清空画布
  ctx.fillStyle = '#2d3436';
  ctx.fillRect(0, 0, canvas.value.width, canvas.value.height);
  
  // 绘制边框
  ctx.strokeStyle = '#00b894';
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, canvas.value.width, canvas.value.height);
  
  // 绘制砖块
  for (const brick of bricks.value) {
    if (brick.visible) {
      // 砖块主体
      ctx.fillStyle = brick.color;
      ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
      
      // 砖块边框
      ctx.strokeStyle = '#2d3436';
      ctx.lineWidth = 1;
      ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);
      
      // 高光效果
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(brick.x + 1, brick.y + 1, brick.width - 2, 2);
      ctx.fillRect(brick.x + 1, brick.y + 1, 2, brick.height - 2);
    }
  }
  
  // 绘制挡板
  ctx.fillStyle = '#55efc4';
  ctx.fillRect(paddle.value.x, paddle.value.y, paddle.value.width, paddle.value.height);
  
  // 挡板边框和高光
  ctx.strokeStyle = '#2d3436';
  ctx.lineWidth = 1;
  ctx.strokeRect(paddle.value.x, paddle.value.y, paddle.value.width, paddle.value.height);
  
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.fillRect(paddle.value.x + 1, paddle.value.y + 1, paddle.value.width - 2, 2);
  
  // 绘制球
  ctx.beginPath();
  ctx.arc(ball.value.x, ball.value.y, ball.value.radius, 0, Math.PI * 2);
  ctx.fillStyle = 'white';
  ctx.fill();
  ctx.strokeStyle = '#636e72';
  ctx.lineWidth = 1;
  ctx.stroke();
  
  // 球的高光
  ctx.beginPath();
  ctx.arc(ball.value.x - 2, ball.value.y - 2, ball.value.radius / 3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.fill();
  
  // 如果球还没发射，显示瞄准线
  if (!ballLaunched.value) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(ball.value.x, ball.value.y);
    ctx.lineTo(ball.value.x, ball.value.y - 100);
    ctx.stroke();
    ctx.setLineDash([]);
  }
};

// 游戏循环
const gameUpdate = () => {
  if (gameState.value !== 'playing') return;
  
  updateBall();
  draw();
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
  lives.value = 3;
  level.value = 1;
  isNewRecord.value = false;

  initBricks();
  resetBall();

  // 开始游戏循环
  if (gameLoop) {
    cancelAnimationFrame(gameLoop);
  }
  
  const loop = () => {
    gameUpdate();
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
    
    const loop = () => {
      gameUpdate();
      if (gameState.value === 'playing') {
        gameLoop = requestAnimationFrame(loop);
      }
    };
    gameLoop = requestAnimationFrame(loop);
  }
};

const levelComplete = () => {
  gameState.value = 'levelComplete';
  if (gameLoop) {
    cancelAnimationFrame(gameLoop);
    gameLoop = null;
  }
  
  // 计算奖励分数
  levelBonus.value = level.value * 100 + lives.value * 50;
  score.value += levelBonus.value;
  
  playLevelCompleteSound();
};

const nextLevel = () => {
  level.value++;
  lives.value = Math.min(lives.value + 1, 5); // 每关奖励一条生命，最多5条
  
  // 增加球的速度
  ball.value.speed = Math.min(ball.value.speed + 0.5, 8);
  
  initBricks();
  resetBall();
  
  gameState.value = 'playing';
  
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
  
  // 检查最高分
  if (score.value > bestScore.value) {
    bestScore.value = score.value;
    isNewRecord.value = true;
    localStorage.setItem('breakoutBestScore', bestScore.value.toString());
  }
  
  playGameOverSound();
};

const restartGame = () => {
  startGame();
};

// 事件处理
const handleMouseMove = (e: MouseEvent) => {
  if (gameState.value === 'playing' && canvas.value) {
    const rect = canvas.value.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    
    // 限制挡板在画布内
    paddle.value.x = Math.max(0, Math.min(mouseX - paddle.value.width / 2, CANVAS_WIDTH - paddle.value.width));
  }
};

const handleCanvasClick = () => {
  if (gameState.value === 'playing' && !ballLaunched.value) {
    launchBall();
  }
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (gameState.value === 'playing') {
    switch (e.key) {
      case ' ':
        e.preventDefault();
        pauseGame();
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        e.preventDefault();
        paddle.value.x = Math.max(0, paddle.value.x - 20);
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        e.preventDefault();
        paddle.value.x = Math.min(CANVAS_WIDTH - paddle.value.width, paddle.value.x + 20);
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
  } else if (gameState.value === 'levelComplete') {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      nextLevel();
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
      initBricks();
      resetBall();
      draw();
    }
  }
  
  initAudio();
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
.breakout-game {
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
  display: flex;
  flex-direction: column;
  align-items: center;
}

.game-canvas {
  background-color: #2d3436;
  border: 4px solid #00b894;
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  cursor: crosshair;
}

.game-info {
  display: flex;
  gap: 30px;
  margin-top: 15px;
  padding: 10px 20px;
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid #636e72;
  border-radius: 8px;
}

.info-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.label {
  color: #ddd;
  font-size: 12px;
}

.value {
  color: #00b894;
  font-weight: bold;
  font-size: 16px;
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
.game-over-screen h1,
.level-complete-screen h1 {
  color: #00b894;
  margin-bottom: 20px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  font-size: 2.5rem;
}

.start-screen p,
.pause-screen p,
.game-over-screen p,
.level-complete-screen p {
  margin: 10px 0;
  font-size: 1.1rem;
}

.hint {
  font-size: 0.9rem !important;
  color: #ddd !important;
  margin-top: 10px !important;
}

.final-stats,
.level-stats {
  margin: 20px 0;
}

.final-stats p,
.level-stats p {
  margin: 8px 0;
}

.final-score,
.final-level,
.level-number,
.bonus-score {
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

.controls-hint {
  position: absolute;
  bottom: -80px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 20px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
}

.hint-item {
  display: flex;
  flex-direction: column;
  align-items: center;
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
    transform: scale(0.8);
  }
  
  .game-info {
    gap: 15px;
    margin-top: 10px;
    padding: 8px 15px;
  }
  
  .info-item {
    gap: 3px;
  }
  
  .label {
    font-size: 10px;
  }
  
  .value {
    font-size: 14px;
  }
  
  .start-screen h1,
  .pause-screen h1,
  .game-over-screen h1,
  .level-complete-screen h1 {
    font-size: 2rem;
  }
  
  .game-btn {
    padding: 12px 24px;
    font-size: 16px;
  }
  
  .controls-hint {
    bottom: -60px;
    gap: 15px;
  }
}
</style>