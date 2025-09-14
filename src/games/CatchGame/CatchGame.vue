<template>
  <div class="catch-game">
    <div class="game-header">
      <div class="score">得分: {{ score }}</div>
      <div class="lives">生命: {{ lives }}</div>
      <div class="level">关卡: {{ level }}</div>
      <div class="combo">连击: {{ combo }}</div>
    </div>
    
    <canvas 
      ref="gameCanvas" 
      :width="canvasWidth" 
      :height="canvasHeight"
      @mousemove="handleMouseMove"
      @touchmove.prevent="handleTouchMove"
    ></canvas>
    
    <div class="game-controls">
      <div class="control-hint">
        <span>🖱️ 鼠标移动 / 👆 触摸移动控制篮子</span>
      </div>
      <button @click="togglePause" class="pause-btn">{{ isPaused ? '继续' : '暂停' }}</button>
    </div>
    
    <div v-if="gameState === 'menu'" class="game-menu">
      <h2>接物游戏</h2>
      <p>移动篮子接住掉落的好物品！</p>
      <p>🍎 水果 +10分 | 💎 宝石 +20分 | ⭐ 星星 +30分</p>
      <p>⚠️ 避开炸弹和垃圾，否则会失去生命！</p>
      <button @click="startGame" class="start-btn">开始游戏</button>
      <div class="high-score">最高分: {{ highScore }}</div>
    </div>
    
    <div v-if="gameState === 'gameOver'" class="game-over">
      <h2>游戏结束</h2>
      <p>最终得分: {{ score }}</p>
      <p>最高连击: {{ maxCombo }}</p>
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
const combo = ref(0)
const maxCombo = ref(0)
const highScore = ref(0)

// Canvas 相关
const gameCanvas = ref<HTMLCanvasElement>()
const canvasWidth = 800
const canvasHeight = 600
let ctx: CanvasRenderingContext2D
let animationId: number

// 游戏对象接口
interface GameObject {
  x: number
  y: number
  width: number
  height: number
  velocityY: number
}

interface Basket extends GameObject {
  color: string
}

interface FallingItem extends GameObject {
  type: 'apple' | 'gem' | 'star' | 'bomb' | 'trash'
  color: string
  points: number
  rotation: number
  rotationSpeed: number
}

// 游戏变量
const basket = ref<Basket>({
  x: canvasWidth / 2 - 40,
  y: canvasHeight - 80,
  width: 80,
  height: 40,
  velocityY: 0,
  color: '#8B4513'
})

const fallingItems = ref<FallingItem[]>([])
const gameSpeed = ref(2)
let mouseX = canvasWidth / 2

// 游戏循环计数器
let frameCount = 0

// 碰撞反馈相关
let isHit = false
let hitTimer = 0
const hitDuration = 30

// 音效相关
let audioContext: AudioContext | null = null

// 初始化音频
const initAudio = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
}

// 播放音效
const playSound = (frequency: number, duration: number, type: OscillatorType = 'sine') => {
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

// 各种音效
const playCatchSound = () => playSound(600, 0.2, 'sine')
const playGemSound = () => playSound(800, 0.3, 'triangle')
const playStarSound = () => playSound(1000, 0.4, 'sine')
const playBombSound = () => playSound(150, 0.6, 'sawtooth')
const playComboSound = () => playSound(400 + combo.value * 50, 0.3, 'square')

// 游戏初始化
const initGame = () => {
  if (!gameCanvas.value) return
  
  ctx = gameCanvas.value.getContext('2d')!
  
  // 重置游戏状态
  basket.value = {
    x: canvasWidth / 2 - 40,
    y: canvasHeight - 80,
    width: 80,
    height: 40,
    velocityY: 0,
    color: '#8B4513'
  }
  
  fallingItems.value = []
  score.value = 0
  lives.value = 3
  level.value = 1
  combo.value = 0
  maxCombo.value = 0
  gameSpeed.value = 2
  frameCount = 0
  mouseX = canvasWidth / 2
  
  // 重置碰撞效果
  isHit = false
  hitTimer = 0
  
  // 加载最高分
  const savedHighScore = localStorage.getItem('catchgame-highscore')
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

// 鼠标移动处理
const handleMouseMove = (event: MouseEvent) => {
  if (gameState.value !== 'playing' || isPaused.value) return
  
  const rect = gameCanvas.value!.getBoundingClientRect()
  mouseX = event.clientX - rect.left
}

// 触摸移动处理
const handleTouchMove = (event: TouchEvent) => {
  if (gameState.value !== 'playing' || isPaused.value) return
  
  const rect = gameCanvas.value!.getBoundingClientRect()
  mouseX = event.touches[0].clientX - rect.left
}

// 更新篮子位置
const updateBasket = () => {
  // 平滑移动到鼠标位置
  const targetX = mouseX - basket.value.width / 2
  basket.value.x += (targetX - basket.value.x) * 0.15
  
  // 限制在画布范围内
  if (basket.value.x < 0) basket.value.x = 0
  if (basket.value.x > canvasWidth - basket.value.width) {
    basket.value.x = canvasWidth - basket.value.width
  }
}

// 生成掉落物品
const spawnFallingItem = () => {
  if (Math.random() < 0.02 + level.value * 0.005) {
    const itemTypes: Array<{type: FallingItem['type'], weight: number, points: number, color: string}> = [
      { type: 'apple', weight: 30, points: 10, color: '#FF4444' },
      { type: 'gem', weight: 20, points: 20, color: '#44FF44' },
      { type: 'star', weight: 10, points: 30, color: '#FFFF44' },
      { type: 'bomb', weight: 15, points: -1, color: '#333333' },
      { type: 'trash', weight: 25, points: -1, color: '#8B4513' }
    ]
    
    // 根据权重随机选择物品类型
    const totalWeight = itemTypes.reduce((sum, item) => sum + item.weight, 0)
    let random = Math.random() * totalWeight
    let selectedType = itemTypes[0]
    
    for (const itemType of itemTypes) {
      random -= itemType.weight
      if (random <= 0) {
        selectedType = itemType
        break
      }
    }
    
    fallingItems.value.push({
      x: Math.random() * (canvasWidth - 30),
      y: -30,
      width: 30,
      height: 30,
      velocityY: gameSpeed.value + Math.random() * 2,
      type: selectedType.type,
      color: selectedType.color,
      points: selectedType.points,
      rotation: 0,
      rotationSpeed: (Math.random() - 0.5) * 0.2
    })
  }
}

// 更新掉落物品
const updateFallingItems = () => {
  fallingItems.value = fallingItems.value.filter(item => {
    item.y += item.velocityY
    item.rotation += item.rotationSpeed
    
    // 移除超出屏幕的物品
    if (item.y > canvasHeight) {
      // 如果是好物品掉落，减少连击
      if (item.points > 0) {
        combo.value = 0
      }
      return false
    }
    return true
  })
}

// 碰撞检测
const checkCollisions = () => {
  const b = basket.value
  
  for (let i = fallingItems.value.length - 1; i >= 0; i--) {
    const item = fallingItems.value[i]
    
    // 检查篮子和物品的碰撞
    if (b.x < item.x + item.width &&
        b.x + b.width > item.x &&
        b.y < item.y + item.height &&
        b.y + b.height > item.y) {
      
      // 移除碰撞的物品
      fallingItems.value.splice(i, 1)
      
      if (item.points > 0) {
        // 好物品
        score.value += item.points
        combo.value++
        
        // 更新最高连击
        if (combo.value > maxCombo.value) {
          maxCombo.value = combo.value
        }
        
        // 连击奖励
        if (combo.value > 1) {
          score.value += combo.value
          playComboSound()
        }
        
        // 播放对应音效
        switch (item.type) {
          case 'apple':
            playCatchSound()
            break
          case 'gem':
            playGemSound()
            break
          case 'star':
            playStarSound()
            break
        }
      } else {
        // 坏物品
        lives.value--
        combo.value = 0
        triggerHit()
        
        if (lives.value <= 0) {
          setTimeout(() => {
            gameOver()
          }, 1000)
          return
        }
      }
    }
  }
}

// 触发碰撞效果
const triggerHit = () => {
  isHit = true
  hitTimer = hitDuration
  playBombSound()
  
  // 手机震动
  if (navigator.vibrate) {
    navigator.vibrate(300)
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
  
  updateBasket()
  spawnFallingItem()
  updateFallingItems()
  checkCollisions()
  
  // 增加难度
  if (frameCount % 1800 === 0) { // 每30秒
    level.value++
    gameSpeed.value += 0.3
  }
}

// 渲染游戏
const render = () => {
  // 碰撞时的屏幕效果
  if (isHit) {
    const flashIntensity = Math.sin(hitTimer * 0.8) * 0.4 + 0.4
    ctx.fillStyle = `rgba(255, 0, 0, ${flashIntensity})`
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)
  }
  
  // 清空画布 - 渐变背景
  const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight)
  gradient.addColorStop(0, '#87CEEB')
  gradient.addColorStop(1, '#E0F6FF')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)
  
  // 绘制云朵
  drawClouds()
  
  // 绘制篮子
  drawBasket()
  
  // 绘制掉落物品
  fallingItems.value.forEach(item => {
    drawFallingItem(item)
  })
  
  // 绘制连击效果
  if (combo.value > 1) {
    drawComboEffect()
  }
  
  // 绘制碰撞效果
  if (isHit) {
    drawHitEffect()
  }
}

// 绘制云朵
const drawClouds = () => {
  const cloudOffset = (frameCount * 0.3) % (canvasWidth + 100)
  
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
  drawCloud(150 - cloudOffset, 80)
  drawCloud(400 - cloudOffset, 60)
  drawCloud(650 - cloudOffset, 100)
}

const drawCloud = (x: number, y: number) => {
  ctx.beginPath()
  ctx.arc(x, y, 25, 0, Math.PI * 2)
  ctx.arc(x + 30, y, 30, 0, Math.PI * 2)
  ctx.arc(x + 60, y, 25, 0, Math.PI * 2)
  ctx.arc(x + 20, y - 20, 20, 0, Math.PI * 2)
  ctx.arc(x + 40, y - 20, 20, 0, Math.PI * 2)
  ctx.fill()
}

// 绘制篮子
const drawBasket = () => {
  const b = basket.value
  
  // 篮子震动效果
  let offsetX = 0
  let offsetY = 0
  if (isHit) {
    offsetX = (Math.random() - 0.5) * 3
    offsetY = (Math.random() - 0.5) * 3
  }
  
  ctx.save()
  
  // 篮子主体
  ctx.fillStyle = isHit ? '#FF4444' : b.color
  ctx.fillRect(b.x + offsetX, b.y + offsetY, b.width, b.height)
  
  // 篮子边框
  ctx.strokeStyle = '#654321'
  ctx.lineWidth = 3
  ctx.strokeRect(b.x + offsetX, b.y + offsetY, b.width, b.height)
  
  // 篮子纹理
  ctx.strokeStyle = '#A0522D'
  ctx.lineWidth = 1
  for (let i = 0; i < 4; i++) {
    const lineX = b.x + (i + 1) * (b.width / 5) + offsetX
    ctx.beginPath()
    ctx.moveTo(lineX, b.y + offsetY)
    ctx.lineTo(lineX, b.y + b.height + offsetY)
    ctx.stroke()
  }
  
  // 篮子把手
  ctx.strokeStyle = '#654321'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.arc(b.x + b.width/2 + offsetX, b.y + offsetY, b.width/2 + 5, Math.PI, 0)
  ctx.stroke()
  
  ctx.restore()
}

// 绘制掉落物品
const drawFallingItem = (item: FallingItem) => {
  ctx.save()
  ctx.translate(item.x + item.width/2, item.y + item.height/2)
  ctx.rotate(item.rotation)
  
  switch (item.type) {
    case 'apple':
      drawApple(item)
      break
    case 'gem':
      drawGem(item)
      break
    case 'star':
      drawStar(item)
      break
    case 'bomb':
      drawBomb(item)
      break
    case 'trash':
      drawTrash(item)
      break
  }
  
  ctx.restore()
}

// 绘制苹果
const drawApple = (item: FallingItem) => {
  const size = item.width / 2
  
  // 苹果主体
  ctx.fillStyle = item.color
  ctx.beginPath()
  ctx.arc(0, 2, size - 2, 0, Math.PI * 2)
  ctx.fill()
  
  // 苹果凹陷
  ctx.fillStyle = '#CC3333'
  ctx.beginPath()
  ctx.arc(0, -size + 5, size - 8, 0, Math.PI)
  ctx.fill()
  
  // 苹果茎
  ctx.fillStyle = '#8B4513'
  ctx.fillRect(-1, -size, 2, 6)
  
  // 苹果叶子
  ctx.fillStyle = '#228B22'
  ctx.beginPath()
  ctx.ellipse(3, -size + 2, 4, 2, Math.PI/4, 0, Math.PI * 2)
  ctx.fill()
}

// 绘制宝石
const drawGem = (item: FallingItem) => {
  const size = item.width / 2
  
  // 宝石主体
  ctx.fillStyle = item.color
  ctx.beginPath()
  ctx.moveTo(0, -size)
  ctx.lineTo(size - 3, -size/2)
  ctx.lineTo(size - 3, size/2)
  ctx.lineTo(0, size)
  ctx.lineTo(-size + 3, size/2)
  ctx.lineTo(-size + 3, -size/2)
  ctx.closePath()
  ctx.fill()
  
  // 宝石高光
  ctx.fillStyle = '#AAFFAA'
  ctx.beginPath()
  ctx.moveTo(0, -size)
  ctx.lineTo(size/2, -size/2)
  ctx.lineTo(0, 0)
  ctx.lineTo(-size/2, -size/2)
  ctx.closePath()
  ctx.fill()
}

// 绘制星星
const drawStar = (item: FallingItem) => {
  const size = item.width / 2
  
  ctx.fillStyle = item.color
  ctx.beginPath()
  
  for (let i = 0; i < 5; i++) {
    const angle = (i * 4 * Math.PI) / 5
    const x = Math.cos(angle) * size
    const y = Math.sin(angle) * size
    
    if (i === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  }
  
  ctx.closePath()
  ctx.fill()
  
  // 星星中心
  ctx.fillStyle = '#FFFFAA'
  ctx.beginPath()
  ctx.arc(0, 0, size/3, 0, Math.PI * 2)
  ctx.fill()
}

// 绘制炸弹
const drawBomb = (item: FallingItem) => {
  const size = item.width / 2
  
  // 炸弹主体
  ctx.fillStyle = item.color
  ctx.beginPath()
  ctx.arc(0, 2, size - 2, 0, Math.PI * 2)
  ctx.fill()
  
  // 炸弹引线
  ctx.strokeStyle = '#8B4513'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, -size + 2)
  ctx.lineTo(-3, -size - 3)
  ctx.stroke()
  
  // 火花效果
  const sparkle = Math.sin(frameCount * 0.3) * 0.5 + 0.5
  ctx.fillStyle = `rgba(255, 165, 0, ${sparkle})`
  ctx.beginPath()
  ctx.arc(-3, -size - 3, 3, 0, Math.PI * 2)
  ctx.fill()
  
  // 骷髅标志
  ctx.fillStyle = '#FFFFFF'
  ctx.beginPath()
  ctx.arc(-3, -2, 3, 0, Math.PI * 2)
  ctx.arc(3, -2, 3, 0, Math.PI * 2)
  ctx.fill()
  
  ctx.fillStyle = '#000000'
  ctx.beginPath()
  ctx.arc(-3, -2, 1, 0, Math.PI * 2)
  ctx.arc(3, -2, 1, 0, Math.PI * 2)
  ctx.fill()
}

// 绘制垃圾
const drawTrash = (item: FallingItem) => {
  const size = item.width / 2
  
  // 垃圾桶主体
  ctx.fillStyle = item.color
  ctx.fillRect(-size + 2, -size/2, size * 2 - 4, size * 1.5)
  
  // 垃圾桶盖子
  ctx.fillStyle = '#654321'
  ctx.fillRect(-size, -size, size * 2, size/2)
  
  // 垃圾桶把手
  ctx.strokeStyle = '#654321'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(-size/2, -size + 2, 3, Math.PI, 0)
  ctx.arc(size/2, -size + 2, 3, Math.PI, 0)
  ctx.stroke()
}

// 绘制连击效果
const drawComboEffect = () => {
  ctx.save()
  ctx.font = 'bold 24px Arial'
  ctx.textAlign = 'center'
  
  const alpha = Math.sin(frameCount * 0.2) * 0.3 + 0.7
  ctx.globalAlpha = alpha
  
  // 连击文字
  ctx.fillStyle = '#FFD700'
  ctx.strokeStyle = '#FF4500'
  ctx.lineWidth = 2
  
  const text = `${combo.value}x COMBO!`
  ctx.strokeText(text, canvasWidth/2, 100)
  ctx.fillText(text, canvasWidth/2, 100)
  
  ctx.restore()
}

// 绘制碰撞效果
const drawHitEffect = () => {
  const explosionRadius = (hitDuration - hitTimer) * 3
  const particleCount = 12
  
  ctx.save()
  ctx.globalAlpha = 0.8
  
  for (let i = 0; i < particleCount; i++) {
    const angle = (i / particleCount) * Math.PI * 2
    const x = basket.value.x + basket.value.width/2 + Math.cos(angle) * explosionRadius
    const y = basket.value.y + basket.value.height/2 + Math.sin(angle) * explosionRadius
    
    ctx.fillStyle = i % 2 === 0 ? '#FF4444' : '#FFAA00'
    ctx.beginPath()
    ctx.arc(x, y, 4, 0, Math.PI * 2)
    ctx.fill()
  }
  
  ctx.restore()
}

// 游戏结束
const gameOver = () => {
  gameState.value = 'gameOver'
  
  // 更新最高分
  if (score.value > highScore.value) {
    highScore.value = score.value
    localStorage.setItem('catchgame-highscore', highScore.value.toString())
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
    if (gameState.value === 'menu') {
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
.catch-game {
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
  cursor: none;
}

.game-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-top: 20px;
}

.control-hint {
  color: white;
  font-size: 14px;
  text-align: center;
}

.pause-btn {
  padding: 12px 24px;
  font-size: 16px;
  font-weight: bold;
  border: none;
  border-radius: 25px;
  cursor: pointer;
  transition: all 0.3s ease;
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