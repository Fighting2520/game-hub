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
  type: 'cactus' | 'spike' | 'rock' | 'fire'
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
let lastObstacleX = 0 // 记录最后一个障碍物的位置

// 碰撞反馈相关
let isHit = false
let hitTimer = 0
let invulnerableTimer = 0
const hitDuration = 60 // 碰撞效果持续帧数
const invulnerableDuration = 120 // 无敌时间帧数

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
  lastObstacleX = 0
  
  // 重置碰撞效果
  isHit = false
  hitTimer = 0
  invulnerableTimer = 0
  
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
  // 确保障碍物之间有足够的间距
  const minDistance = 200 + Math.random() * 150 // 200-350像素的间距
  
  if (obstacles.value.length === 0 || 
      (canvasWidth - lastObstacleX) >= minDistance) {
    
    // 降低生成频率，让游戏更公平
    if (Math.random() < 0.6) {
      const obstacleTypes: Array<'cactus' | 'spike' | 'rock' | 'fire'> = ['cactus', 'spike', 'rock', 'fire']
      const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)]
      
      let width = 30
      let height = 40
      
      // 根据类型调整尺寸
      switch (type) {
        case 'cactus':
          width = 25
          height = 50 + Math.random() * 30
          break
        case 'spike':
          width = 40
          height = 30
          break
        case 'rock':
          width = 35
          height = 35 + Math.random() * 20
          break
        case 'fire':
          width = 30
          height = 35
          break
      }
      
      obstacles.value.push({
        x: canvasWidth,
        y: groundY - height,
        width: width,
        height: height,
        color: '#F44336',
        velocityX: -gameSpeed.value,
        type: type
      })
      
      lastObstacleX = canvasWidth
    }
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
    
    // 当障碍物完全离开屏幕时，更新lastObstacleX
    if (obstacle.x + obstacle.width < 0) {
      lastObstacleX = Math.min(lastObstacleX, obstacle.x)
      return false
    }
    return true
  })
  
  // 重置lastObstacleX如果没有障碍物了
  if (obstacles.value.length === 0) {
    lastObstacleX = 0
  }
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
  
  // 如果在无敌时间内，跳过障碍物碰撞检测
  if (invulnerableTimer <= 0) {
    // 检查障碍物碰撞
    for (const obstacle of obstacles.value) {
      if (p.x < obstacle.x + obstacle.width &&
          p.x + p.width > obstacle.x &&
          p.y < obstacle.y + obstacle.height &&
          p.y + p.height > obstacle.y) {
        
        // 触发碰撞效果
        triggerHit()
        
        // 移除碰撞的障碍物
        obstacles.value = obstacles.value.filter(obs => obs !== obstacle)
        
        if (lives.value <= 0) {
          // 延迟游戏结束，让玩家看到死亡效果
          setTimeout(() => {
            gameOver()
          }, 1000)
          return
        }
        break
      }
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

// 触发碰撞效果
const triggerHit = () => {
  lives.value--
  isHit = true
  hitTimer = hitDuration
  invulnerableTimer = invulnerableDuration
  
  // 播放碰撞音效
  playHitSound()
  
  // 击退效果
  player.value.x -= 30
  if (player.value.x < 0) player.value.x = 0
  
  // 向上弹跳效果
  if (player.value.isOnGround) {
    player.value.velocityY = jumpPower * 0.7
    player.value.isOnGround = false
  }
  
  // 屏幕震动效果
  if (navigator.vibrate) {
    navigator.vibrate(200)
  }
}

// 更新游戏逻辑
const updateGame = () => {
  frameCount++
  
  // 更新碰撞效果计时器
  if (hitTimer > 0) {
    hitTimer--
    if (hitTimer <= 0) {
      isHit = false
    }
  }
  
  if (invulnerableTimer > 0) {
    invulnerableTimer--
  }
  
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
  // 碰撞时的屏幕效果
  if (isHit) {
    // 红色闪烁效果
    const flashIntensity = Math.sin(hitTimer * 0.5) * 0.3 + 0.3
    ctx.fillStyle = `rgba(255, 0, 0, ${flashIntensity})`
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)
  }
  
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
  drawPlayer()
  
  // 绘制障碍物
  obstacles.value.forEach(obstacle => {
    drawObstacle(obstacle)
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
  
  // 绘制碰撞效果
  if (isHit) {
    drawHitEffect()
  }
  
  // 绘制生命值损失提示
  if (hitTimer > hitDuration - 30) {
    drawLifeLossIndicator()
  }
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

// 绘制玩家角色
const drawPlayer = () => {
  const p = player.value
  const centerX = p.x + p.width / 2
  const centerY = p.y + p.height / 2
  
  // 根据跳跃状态调整姿势
  const isJumping = !p.isOnGround
  const armAngle = isJumping ? -30 : 0
  const legAngle = isJumping ? 20 : 0
  
  ctx.save()
  
  // 无敌时间闪烁效果
  if (invulnerableTimer > 0 && Math.floor(invulnerableTimer / 5) % 2 === 0) {
    ctx.globalAlpha = 0.5
  }
  
  // 碰撞时的震动效果
  let offsetX = 0
  let offsetY = 0
  if (isHit) {
    offsetX = (Math.random() - 0.5) * 4
    offsetY = (Math.random() - 0.5) * 4
  }
  
  // 身体颜色根据状态改变
  let bodyColor = '#4CAF50'
  if (isHit) {
    bodyColor = '#F44336' // 碰撞时变红
  } else if (invulnerableTimer > 0) {
    bodyColor = '#FF9800' // 无敌时变橙
  }
  
  // 身体
  ctx.fillStyle = bodyColor
  ctx.fillRect(p.x + 10 + offsetX, p.y + 15 + offsetY, 20, 20)
  
  // 头部
  ctx.beginPath()
  ctx.arc(centerX + offsetX, p.y + 12 + offsetY, 12, 0, Math.PI * 2)
  ctx.fill()
  
  // 眼睛
  ctx.fillStyle = '#000'
  ctx.beginPath()
  ctx.arc(centerX - 4 + offsetX, p.y + 9 + offsetY, 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(centerX + 4 + offsetX, p.y + 9 + offsetY, 2, 0, Math.PI * 2)
  ctx.fill()
  
  // 嘴巴 (根据状态改变表情)
  ctx.strokeStyle = '#000'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  if (isHit) {
    // 碰撞时痛苦表情
    ctx.arc(centerX + offsetX, p.y + 16 + offsetY, 3, Math.PI, 0)
  } else if (isJumping) {
    // 跳跃时开心的表情
    ctx.arc(centerX + offsetX, p.y + 14 + offsetY, 4, 0, Math.PI)
  } else {
    // 正常表情
    ctx.moveTo(centerX - 3 + offsetX, p.y + 15 + offsetY)
    ctx.quadraticCurveTo(centerX + offsetX, p.y + 17 + offsetY, centerX + 3 + offsetX, p.y + 15 + offsetY)
  }
  ctx.stroke()
  
  // 左手臂
  ctx.fillStyle = bodyColor
  ctx.save()
  ctx.translate(p.x + 8 + offsetX, p.y + 20 + offsetY)
  ctx.rotate((armAngle * Math.PI) / 180)
  ctx.fillRect(-2, -2, 12, 4)
  ctx.restore()
  
  // 右手臂
  ctx.save()
  ctx.translate(p.x + 32 + offsetX, p.y + 20 + offsetY)
  ctx.rotate((-armAngle * Math.PI) / 180)
  ctx.fillRect(-10, -2, 12, 4)
  ctx.restore()
  
  // 左腿
  ctx.save()
  ctx.translate(p.x + 15 + offsetX, p.y + 35 + offsetY)
  ctx.rotate((-legAngle * Math.PI) / 180)
  ctx.fillRect(-3, 0, 6, 12)
  ctx.restore()
  
  // 右腿
  ctx.save()
  ctx.translate(p.x + 25 + offsetX, p.y + 35 + offsetY)
  ctx.rotate((legAngle * Math.PI) / 180)
  ctx.fillRect(-3, 0, 6, 12)
  ctx.restore()
  
  // 如果在跳跃，添加一些动态效果线条
  if (isJumping) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(p.x - 5 + offsetX, centerY + offsetY)
    ctx.quadraticCurveTo(p.x - 10 + offsetX, centerY - 10 + offsetY, p.x - 5 + offsetX, centerY - 20 + offsetY)
    ctx.moveTo(p.x - 8 + offsetX, centerY + 5 + offsetY)
    ctx.quadraticCurveTo(p.x - 13 + offsetX, centerY - 5 + offsetY, p.x - 8 + offsetX, centerY - 15 + offsetY)
    ctx.stroke()
  }
  
  ctx.restore()
}

// 绘制碰撞效果
const drawHitEffect = () => {
  const p = player.value
  const centerX = p.x + p.width / 2
  const centerY = p.y + p.height / 2
  
  // 爆炸效果
  ctx.save()
  ctx.globalAlpha = 0.8
  
  const explosionRadius = (hitDuration - hitTimer) * 2
  const particleCount = 8
  
  for (let i = 0; i < particleCount; i++) {
    const angle = (i / particleCount) * Math.PI * 2
    const x = centerX + Math.cos(angle) * explosionRadius
    const y = centerY + Math.sin(angle) * explosionRadius
    
    ctx.fillStyle = i % 2 === 0 ? '#FF4444' : '#FFAA00'
    ctx.beginPath()
    ctx.arc(x, y, 3, 0, Math.PI * 2)
    ctx.fill()
  }
  
  ctx.restore()
}

// 绘制生命值损失提示
const drawLifeLossIndicator = () => {
  const p = player.value
  const alpha = (hitDuration - hitTimer + 30) / 30
  
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = '#FF0000'
  ctx.font = 'bold 24px Arial'
  ctx.textAlign = 'center'
  ctx.fillText('-1', p.x + p.width/2, p.y - 20)
  
  // 添加白色描边
  ctx.strokeStyle = '#FFFFFF'
  ctx.lineWidth = 2
  ctx.strokeText('-1', p.x + p.width/2, p.y - 20)
  ctx.restore()
}

// 绘制不同类型的障碍物
const drawObstacle = (obstacle: Obstacle) => {
  ctx.save()
  
  switch (obstacle.type) {
    case 'cactus':
      drawCactus(obstacle)
      break
    case 'spike':
      drawSpike(obstacle)
      break
    case 'rock':
      drawRock(obstacle)
      break
    case 'fire':
      drawFire(obstacle)
      break
  }
  
  ctx.restore()
}

// 绘制仙人掌
const drawCactus = (obstacle: Obstacle) => {
  const x = obstacle.x
  const y = obstacle.y
  const w = obstacle.width
  const h = obstacle.height
  
  // 主干
  ctx.fillStyle = '#2E7D32'
  ctx.fillRect(x + w/3, y, w/3, h)
  
  // 左侧分支
  if (h > 40) {
    ctx.fillRect(x, y + h/3, w/2, w/4)
    ctx.fillRect(x, y + h/3, w/4, h/3)
  }
  
  // 右侧分支
  if (h > 50) {
    ctx.fillRect(x + w/2, y + h/2, w/2, w/4)
    ctx.fillRect(x + 3*w/4, y + h/2, w/4, h/4)
  }
  
  // 刺
  ctx.fillStyle = '#1B5E20'
  for (let i = 0; i < h; i += 8) {
    // 左侧刺
    ctx.fillRect(x + w/3 - 2, y + i, 4, 2)
    // 右侧刺
    ctx.fillRect(x + 2*w/3 - 2, y + i, 4, 2)
  }
  
  // 顶部花朵
  ctx.fillStyle = '#E91E63'
  ctx.beginPath()
  ctx.arc(x + w/2, y - 3, 4, 0, Math.PI * 2)
  ctx.fill()
}

// 绘制尖刺陷阱
const drawSpike = (obstacle: Obstacle) => {
  const x = obstacle.x
  const y = obstacle.y
  const w = obstacle.width
  const h = obstacle.height
  
  // 底座
  ctx.fillStyle = '#424242'
  ctx.fillRect(x, y + h - 8, w, 8)
  
  // 尖刺
  ctx.fillStyle = '#616161'
  const spikeCount = Math.floor(w / 8)
  for (let i = 0; i < spikeCount; i++) {
    const spikeX = x + i * (w / spikeCount)
    const spikeW = w / spikeCount
    
    ctx.beginPath()
    ctx.moveTo(spikeX, y + h - 8)
    ctx.lineTo(spikeX + spikeW/2, y)
    ctx.lineTo(spikeX + spikeW, y + h - 8)
    ctx.closePath()
    ctx.fill()
    
    // 尖刺高光
    ctx.fillStyle = '#9E9E9E'
    ctx.beginPath()
    ctx.moveTo(spikeX + 2, y + h - 8)
    ctx.lineTo(spikeX + spikeW/2, y + 3)
    ctx.lineTo(spikeX + spikeW/2 + 1, y + 5)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#616161'
  }
}

// 绘制岩石
const drawRock = (obstacle: Obstacle) => {
  const x = obstacle.x
  const y = obstacle.y
  const w = obstacle.width
  const h = obstacle.height
  
  // 主体
  ctx.fillStyle = '#5D4037'
  ctx.beginPath()
  ctx.ellipse(x + w/2, y + h/2, w/2, h/2, 0, 0, Math.PI * 2)
  ctx.fill()
  
  // 阴影
  ctx.fillStyle = '#3E2723'
  ctx.beginPath()
  ctx.ellipse(x + w/2 + 2, y + h/2 + 2, w/2 - 2, h/2 - 2, 0, 0, Math.PI * 2)
  ctx.fill()
  
  // 高光
  ctx.fillStyle = '#8D6E63'
  ctx.beginPath()
  ctx.ellipse(x + w/2 - 5, y + h/2 - 5, w/4, h/4, 0, 0, Math.PI * 2)
  ctx.fill()
  
  // 裂纹
  ctx.strokeStyle = '#3E2723'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x + w/4, y + h/3)
  ctx.lineTo(x + 3*w/4, y + 2*h/3)
  ctx.moveTo(x + 2*w/3, y + h/4)
  ctx.lineTo(x + w/3, y + 3*h/4)
  ctx.stroke()
}

// 绘制火焰
const drawFire = (obstacle: Obstacle) => {
  const x = obstacle.x
  const y = obstacle.y
  const w = obstacle.width
  const h = obstacle.height
  
  // 火焰动画效果
  const flameOffset = Math.sin(frameCount * 0.2) * 3
  
  // 底部
  ctx.fillStyle = '#D84315'
  ctx.fillRect(x + w/4, y + h - 8, w/2, 8)
  
  // 外层火焰
  ctx.fillStyle = '#FF5722'
  ctx.beginPath()
  ctx.moveTo(x + w/2, y)
  ctx.quadraticCurveTo(x + w + flameOffset, y + h/3, x + 3*w/4, y + 2*h/3)
  ctx.quadraticCurveTo(x + w/2, y + h, x + w/4, y + 2*h/3)
  ctx.quadraticCurveTo(x - flameOffset, y + h/3, x + w/2, y)
  ctx.fill()
  
  // 中层火焰
  ctx.fillStyle = '#FF9800'
  ctx.beginPath()
  ctx.moveTo(x + w/2, y + 5)
  ctx.quadraticCurveTo(x + 3*w/4 + flameOffset/2, y + h/2, x + 2*w/3, y + 2*h/3)
  ctx.quadraticCurveTo(x + w/2, y + h - 5, x + w/3, y + 2*h/3)
  ctx.quadraticCurveTo(x + w/4 - flameOffset/2, y + h/2, x + w/2, y + 5)
  ctx.fill()
  
  // 内层火焰
  ctx.fillStyle = '#FFC107'
  ctx.beginPath()
  ctx.moveTo(x + w/2, y + 10)
  ctx.quadraticCurveTo(x + 3*w/5, y + h/2, x + w/2, y + h - 10)
  ctx.quadraticCurveTo(x + 2*w/5, y + h/2, x + w/2, y + 10)
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