<template>
  <div class="jumping-man-game">
    <div class="game-header">
      <div class="score">得分: {{ score }}</div>
      <div class="lives">生命: {{ lives }}</div>
      <div class="level">关卡: {{ level }}</div>
    </div>
    
    <canvas 
      ref="gameCanvas" 
      :width="canvasWidth" 
      :height="canvasHeight"
      @click="handleJump"
      @touchstart.prevent="handleJump"
    ></canvas>
    
    <div class="game-controls">
      <button @click="handleJump" class="jump-btn">跳跃</button>
      <button @click="togglePause" class="pause-btn">{{ isPaused ? '继续' : '暂停' }}</button>
    </div>
    
    <div v-if="gameState === 'menu'" class="game-menu">
      <h2>跳跃小人</h2>
      <p>点击屏幕或按空格键让小人跳跃！</p>
      <p>躲避障碍物，收集金币获得高分！</p>
      <button @click="startGame" class="start-btn">开始游戏</button>
      <div class="high-score">最高分: {{ highScore }}</div>
    </div>
    
    <div v-if="gameState === 'gameOver'" class="game-over">
      <h2>游戏结束</h2>
      <p>最终得分: {{ score }}</p>
      <p v-if="score === highScore" class="new-record">🎉 新纪录！</p>
      <button @click="restartGame" class="restart-btn">重新开始</button>
      <button @click="backToMenu" class="menu-btn">返回菜单</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

// 游戏状态
const gameState = ref<'menu' | 'playing' | 'paused' | 'gameOver'>('menu')
const isPaused = ref(false)
const score = ref(0)
const lives = ref(3)
const level = ref(1)
const highScore = ref(0)

// Canvas 相关
const gameCanvas = ref<HTMLCanvasElement>()
const canvasWidth = 800
const canvasHeight = 400
let ctx: CanvasRenderingContext2D
let animationId: number

// 游戏对象
interface GameObject {
  x: number
  y: number
  width: number
  height: number
  color: string
}

interface Player extends GameObject {
  velocityY: number
  isJumping: boolean
  isOnGround: boolean
}

interface Obstacle extends GameObject {
  velocityX: number
}

interface Coin extends GameObject {
  velocityX: number
  collected: boolean
}

// 游戏变量
const player = ref<Player>({
  x: 100,
  y: 300,
  width: 40,
  height: 40,
  color: '#4CAF50',
  velocityY: 0,
  isJumping: false,
  isOnGround: true
})

const obstacles = ref<Obstacle[]>([])
const coins = ref<Coin[]>([])
const groundY = 340
const gravity = 0.8
const jumpPower = -15
const gameSpeed = ref(3)

// 游戏循环计数器
let frameCount = 0

// 音效相关
let audioContext: AudioContext | null = null

// 初始化音频
const initAudio = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
}

// 播放音效
const playSound = (frequency: number, duration: number, type: OscillatorType = 'square') => {
  if (!audioContext) return
  
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()
  
  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)
  
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)
  oscillator.type = type
  
  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration)
  
  oscillator.start(audioContext.currentTime)
  oscillator.stop(audioContext.currentTime + duration)
}

// 跳跃音效
const playJumpSound = () => playSound(400, 0.2, 'sine')

// 收集金币音效
const playCoinSound = () => playSound(800, 0.3, 'sine')

// 碰撞音效
const playHitSound = () => playSound(150, 0.5, 'sawtooth')

// 游戏初始化
const initGame = () => {
  if (!gameCanvas.value) return
  
  ctx = gameCanvas.value.getContext('2d')!
  
  // 重置游戏状态
  player.value = {
    x: 100,
    y: groundY - 40,
    width: 40,
    height: 40,
    color: '#4CAF50',
    velocityY: 0,
    isJumping: false,
    isOnGround: true
  }
  
  obstacles.value = []
  coins.value = []
  score.value = 0
  lives.value = 3
  level.value = 1
  gameSpeed.value = 3
  frameCount = 0
  
  // 加载最高分
  const savedHighScore = localStorage.getItem('jumpingman-highscore')
  if (savedHighScore) {
    highScore.value = parseInt(savedHighScore)
  }
}

// 开始游戏
const startGame = () => {
  initAudio()
  gameState.value = 'playing'
  isPaused.value = false
  gameLoop()
}

// 重新开始游戏
const restartGame = () => {
  initGame()
  startGame()
}

// 返回菜单
const backToMenu = () => {
  gameState.value = 'menu'
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
}

// 暂停/继续游戏
const togglePause = () => {
  if (gameState.value !== 'playing') return
  
  isPaused.value = !isPaused.value
  if (!isPaused.value) {
    gameLoop()
  }
}

// 跳跃处理
const handleJump = () => {
  if (gameState.value !== 'playing' || isPaused.value) return
  
  if (player.value.isOnGround) {
    player.value.velocityY = jumpPower
    player.value.isJumping = true
    player.value.isOnGround = false
    playJumpSound()
  }
}

// 更新玩家
const updatePlayer = () => {
  // 应用重力
  player.value.velocityY += gravity
  player.value.y += player.value.velocityY
  
  // 地面碰撞检测
  if (player.value.y >= groundY - player.value.height) {
    player.value.y = groundY - player.value.height
    player.value.velocityY = 0
    player.value.isJumping = false
    player.value.isOnGround = true
  }
}

// 生成障碍物
const spawnObstacle = () => {
  if (Math.random() < 0.02 + level.value * 0.005) {
    const height = 40 + Math.random() * 60
    obstacles.value.push({
      x: canvasWidth,
      y: groundY - height,
      width: 30,
      height: height,
      color: '#F44336',
      velocityX: -gameSpeed.value
    })
  }
}

// 生成金币
const spawnCoin = () => {
  if (Math.random() < 0.015) {
    coins.value.push({
      x: canvasWidth,
      y: groundY - 80 - Math.random() * 100,
      width: 20,
      height: 20,
      color: '#FFD700',
      velocityX: -gameSpeed.value,
      collected: false
    })
  }
}

// 更新障碍物
const updateObstacles = () => {
  obstacles.value = obstacles.value.filter(obstacle => {
    obstacle.x += obstacle.velocityX
    return obstacle.x + obstacle.width > 0
  })
}

// 更新金币
const updateCoins = () => {
  coins.value = coins.value.filter(coin => {
    if (!coin.collected) {
      coin.x += coin.velocityX
      return coin.x + coin.width > 0
    }
    return false
  })
}

// 碰撞检测
const checkCollisions = () => {
  const p = player.value
  
  // 检查障碍物碰撞
  for (const obstacle of obstacles.value) {
    if (p.x < obstacle.x + obstacle.width &&
        p.x + p.width > obstacle.x &&
        p.y < obstacle.y + obstacle.height &&
        p.y + p.height > obstacle.y) {
      
      lives.value--
      playHitSound()
      
      // 击退效果
      player.value.x -= 20
      if (player.value.x < 0) player.value.x = 0
      
      // 移除碰撞的障碍物
      obstacles.value = obstacles.value.filter(obs => obs !== obstacle)
      
      if (lives.value <= 0) {
        gameOver()
        return
      }
      break
    }
  }
  
  // 检查金币碰撞
  for (const coin of coins.value) {
    if (!coin.collected &&
        p.x < coin.x + coin.width &&
        p.x + p.width > coin.x &&
        p.y < coin.y + coin.height &&
        p.y + p.height > coin.y) {
      
      coin.collected = true
      score.value += 10
      playCoinSound()
    }
  }
}

// 更新游戏逻辑
const updateGame = () => {
  frameCount++
  
  updatePlayer()
  spawnObstacle()
  spawnCoin()
  updateObstacles()
  updateCoins()
  checkCollisions()
  
  // 增加难度
  if (frameCount % 1800 === 0) { // 每30秒
    level.value++
    gameSpeed.value += 0.5
    
    // 更新现有障碍物和金币的速度
    obstacles.value.forEach(obs => obs.velocityX = -gameSpeed.value)
    coins.value.forEach(coin => coin.velocityX = -gameSpeed.value)
  }
  
  // 距离分数
  if (frameCount % 10 === 0) {
    score.value++
  }
}

// 渲染游戏
const render = () => {
  // 清空画布
  ctx.fillStyle = '#87CEEB'
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)
  
  // 绘制地面
  ctx.fillStyle = '#8B4513'
  ctx.fillRect(0, groundY, canvasWidth, canvasHeight - groundY)
  
  // 绘制草地
  ctx.fillStyle = '#228B22'
  ctx.fillRect(0, groundY, canvasWidth, 10)
  
  // 绘制云朵
  drawClouds()
  
  // 绘制玩家
  ctx.fillStyle = player.value.color
  ctx.fillRect(player.value.x, player.value.y, player.value.width, player.value.height)
  
  // 绘制玩家眼睛
  ctx.fillStyle = '#000'
  ctx.fillRect(player.value.x + 8, player.value.y + 8, 4, 4)
  ctx.fillRect(player.value.x + 20, player.value.y + 8, 4, 4)
  
  // 绘制障碍物
  obstacles.value.forEach(obstacle => {
    ctx.fillStyle = obstacle.color
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height)
  })
  
  // 绘制金币
  coins.value.forEach(coin => {
    if (!coin.collected) {
      ctx.fillStyle = coin.color
      ctx.beginPath()
      ctx.arc(coin.x + coin.width/2, coin.y + coin.height/2, coin.width/2, 0, Math.PI * 2)
      ctx.fill()
      
      // 金币闪光效果
      ctx.fillStyle = '#FFF'
      ctx.beginPath()
      ctx.arc(coin.x + coin.width/2 - 3, coin.y + coin.height/2 - 3, 3, 0, Math.PI * 2)
      ctx.fill()
    }
  })
}

// 绘制云朵
const drawClouds = () => {
  const cloudOffset = (frameCount * 0.5) % (canvasWidth + 100)
  
  ctx.fillStyle = '#FFF'
  // 云朵1
  drawCloud(200 - cloudOffset, 50)
  drawCloud(500 - cloudOffset, 80)
  drawCloud(800 - cloudOffset, 60)
}

const drawCloud = (x: number, y: number) => {
  ctx.beginPath()
  ctx.arc(x, y, 20, 0, Math.PI * 2)
  ctx.arc(x + 25, y, 25, 0, Math.PI * 2)
  ctx.arc(x + 50, y, 20, 0, Math.PI * 2)
  ctx.arc(x + 15, y - 15, 15, 0, Math.PI * 2)
  ctx.arc(x + 35, y - 15, 15, 0, Math.PI * 2)
  ctx.fill()
}

// 游戏结束
const gameOver = () => {
  gameState.value = 'gameOver'
  
  // 更新最高分
  if (score.value > highScore.value) {
    highScore.value = score.value
    localStorage.setItem('jumpingman-highscore', highScore.value.toString())
  }
  
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
}

// 游戏主循环
const gameLoop = () => {
  if (gameState.value !== 'playing' || isPaused.value) return
  
  updateGame()
  render()
  
  animationId = requestAnimationFrame(gameLoop)
}

// 键盘事件处理
const handleKeyPress = (event: KeyboardEvent) => {
  if (event.code === 'Space') {
    event.preventDefault()
    if (gameState.value === 'playing') {
      handleJump()
    } else if (gameState.value === 'menu') {
      startGame()
    } else if (gameState.value === 'gameOver') {
      restartGame()
    }
  } else if (event.code === 'KeyP') {
    togglePause()
  }
}

// 组件挂载
onMounted(() => {
  initGame()
  window.addEventListener('keydown', handleKeyPress)
})

// 组件卸载
onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  window.removeEventListener('keydown', handleKeyPress)
})
</script>

<style scoped>
.jumping-man-game {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  font-family: 'Arial', sans-serif;
}

.game-header {
  display: flex;
  justify-content: space-between;
  width: 800px;
  margin-bottom: 10px;
  color: white;
  font-size: 18px;
  font-weight: bold;
}

canvas {
  border: 3px solid #fff;
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  cursor: pointer;
}

.game-controls {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.jump-btn, .pause-btn {
  padding: 12px 24px;
  font-size: 16px;
  font-weight: bold;
  border: none;
  border-radius: 25px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.jump-btn {
  background: linear-gradient(45deg, #4CAF50, #45a049);
  color: white;
}

.jump-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
}

.pause-btn {
  background: linear-gradient(45deg, #FF9800, #F57C00);
  color: white;
}

.pause-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 152, 0, 0.4);
}

.game-menu, .game-over {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255, 255, 255, 0.95);
  padding: 40px;
  border-radius: 20px;
  text-align: center;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
}

.game-menu h2, .game-over h2 {
  color: #333;
  margin-bottom: 20px;
  font-size: 32px;
}

.game-menu p, .game-over p {
  color: #666;
  margin-bottom: 15px;
  font-size: 16px;
}

.start-btn, .restart-btn, .menu-btn {
  padding: 15px 30px;
  font-size: 18px;
  font-weight: bold;
  border: none;
  border-radius: 25px;
  cursor: pointer;
  margin: 10px;
  transition: all 0.3s ease;
}

.start-btn, .restart-btn {
  background: linear-gradient(45deg, #4CAF50, #45a049);
  color: white;
}

.menu-btn {
  background: linear-gradient(45deg, #2196F3, #1976D2);
  color: white;
}

.start-btn:hover, .restart-btn:hover, .menu-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}

.high-score {
  margin-top: 20px;
  font-size: 18px;
  color: #FF9800;
  font-weight: bold;
}

.new-record {
  color: #4CAF50;
  font-weight: bold;
  font-size: 18px;
}

@media (max-width: 850px) {
  canvas {
    width: 100%;
    max-width: 800px;
    height: auto;
  }
  
  .game-header {
    width: 100%;
    max-width: 800px;
    font-size: 16px;
  }
  
  .game-menu, .game-over {
    width: 90%;
    max-width: 400px;
  }
}
</style>