<template>
  <div class="space-invaders-game">
    <div class="game-container">
      <!-- 游戏标题和状态 -->
      <div class="game-header">
        <h2>🚀 太空入侵者</h2>
        <div class="game-stats">
          <div class="stat-item">
            <span class="stat-label">得分:</span>
            <span class="stat-value">{{ score }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">生命:</span>
            <span class="stat-value">{{ '❤️'.repeat(lives) }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">关卡:</span>
            <span class="stat-value">{{ level }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">最高分:</span>
            <span class="stat-value">{{ highScore }}</span>
          </div>
        </div>
      </div>

      <!-- 游戏控制按钮 -->
      <div class="game-controls">
        <button v-if="!gameRunning && !gameOver" @click="startGame" class="start-btn">
          🚀 开始游戏
        </button>
        <button v-if="gameRunning" @click="pauseGame" class="pause-btn">
          {{ paused ? '▶️ 继续' : '⏸️ 暂停' }}
        </button>
        <button v-if="gameOver" @click="restartGame" class="restart-btn">
          🔄 重新开始
        </button>
      </div>

      <!-- 游戏画布 -->
      <div class="game-area">
        <canvas
          ref="gameCanvas"
          :width="canvasWidth"
          :height="canvasHeight"
          @click="handleCanvasClick"
        ></canvas>
        
        <!-- 游戏结束覆盖层 -->
        <div v-if="gameOver" class="game-over-overlay">
          <div class="game-over-content">
            <h3>🎮 游戏结束</h3>
            <div class="final-stats">
              <p><strong>最终得分:</strong> {{ score }}</p>
              <p><strong>到达关卡:</strong> {{ level }}</p>
              <p><strong>消灭敌人:</strong> {{ enemiesKilled }}</p>
              <p v-if="score === highScore" class="new-record">🏆 新纪录！</p>
            </div>
            <div class="game-over-actions">
              <button @click="restartGame" class="restart-btn">🔄 再来一局</button>
            </div>
          </div>
        </div>

        <!-- 暂停覆盖层 -->
        <div v-if="paused && gameRunning" class="pause-overlay">
          <div class="pause-content">
            <h3>⏸️ 游戏暂停</h3>
            <p>按空格键或点击继续按钮恢复游戏</p>
          </div>
        </div>
      </div>

      <!-- 移动端控制按钮 -->
      <div class="mobile-controls" v-if="isMobile">
        <div class="control-row">
          <button @mousedown="startMove('left')" @mouseup="stopMove" @touchstart="startMove('left')" @touchend="stopMove" class="move-btn">
            ⬅️
          </button>
          <button @click="shoot" class="shoot-btn">
            🔥 射击
          </button>
          <button @mousedown="startMove('right')" @mouseup="stopMove" @touchstart="startMove('right')" @touchend="stopMove" class="move-btn">
            ➡️
          </button>
        </div>
      </div>

      <!-- 游戏说明 -->
      <div class="game-instructions">
        <h4>🎯 游戏说明</h4>
        <div class="instructions-grid">
          <div class="instruction-item">
            <span class="key">A/D 或 ←/→</span>
            <span class="desc">移动飞船</span>
          </div>
          <div class="instruction-item">
            <span class="key">空格键</span>
            <span class="desc">发射子弹</span>
          </div>
          <div class="instruction-item">
            <span class="key">P</span>
            <span class="desc">暂停游戏</span>
          </div>
        </div>
        <div class="game-tips">
          <p>💡 <strong>游戏技巧:</strong></p>
          <ul>
            <li>消灭所有外星人进入下一关</li>
            <li>外星人会逐渐加速并向下移动</li>
            <li>躲避外星人的攻击保护生命</li>
            <li>利用掩体阻挡敌人子弹</li>
            <li>不同外星人有不同分值</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

// 游戏状态
const gameRunning = ref(false)
const gameOver = ref(false)
const paused = ref(false)
const score = ref(0)
const highScore = ref(0)
const lives = ref(3)
const level = ref(1)
const enemiesKilled = ref(0)

// 画布相关
const gameCanvas = ref<HTMLCanvasElement>()
const canvasWidth = 800
const canvasHeight = 600
let ctx: CanvasRenderingContext2D | null = null

// 移动端检测
const isMobile = ref(false)

// 游戏对象
interface GameObject {
  x: number
  y: number
  width: number
  height: number
  color: string
  active: boolean
}

interface Player extends GameObject {
  speed: number
}

interface Bullet extends GameObject {
  speed: number
  direction: number // 1 for up, -1 for down
}

interface Enemy extends GameObject {
  speed: number
  points: number
  type: number
  shootChance: number
}

interface Barrier extends GameObject {
  hits: number
  maxHits: number
}

// 游戏对象实例
const player = ref<Player>({
  x: canvasWidth / 2 - 25,
  y: canvasHeight - 60,
  width: 50,
  height: 30,
  color: '#00ff00',
  speed: 5,
  active: true
})

const bullets = ref<Bullet[]>([])
const enemies = ref<Enemy[]>([])
const enemyBullets = ref<Bullet[]>([])
const barriers = ref<Barrier[]>([])

// 游戏设置
const bulletSpeed = 7
const enemyBulletSpeed = 3
const maxBullets = 3
let enemyDirection = 1
let enemySpeed = 1
let enemyDropDistance = 20
let lastEnemyShot = 0
const enemyShootInterval = 1000

// 输入状态
const keys = ref<{ [key: string]: boolean }>({})
const moveState = ref<{ left: boolean; right: boolean }>({ left: false, right: false })

// 音效相关
let audioContext: AudioContext | null = null

// 初始化音频
const initAudio = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
}

// 播放音效
const playSound = (frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.1) => {
  if (!audioContext) return
  
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()
  
  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)
  
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)
  oscillator.type = type
  
  gainNode.gain.setValueAtTime(volume, audioContext.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration)
  
  oscillator.start(audioContext.currentTime)
  oscillator.stop(audioContext.currentTime + duration)
}

// 播放射击音效
const playShootSound = () => {
  playSound(800, 0.1, 'square', 0.05)
}

// 播放爆炸音效
const playExplosionSound = () => {
  playSound(200, 0.3, 'sawtooth', 0.1)
}

// 播放敌人死亡音效
const playEnemyDeathSound = () => {
  playSound(150, 0.2, 'triangle', 0.08)
}

// 播放关卡完成音效
const playLevelCompleteSound = () => {
  playSound(523, 0.2, 'sine', 0.1)
  setTimeout(() => playSound(659, 0.2, 'sine', 0.1), 200)
  setTimeout(() => playSound(784, 0.3, 'sine', 0.1), 400)
}

// 检测移动端
const detectMobile = () => {
  isMobile.value = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

// 初始化游戏
const initGame = () => {
  if (!gameCanvas.value) return
  
  ctx = gameCanvas.value.getContext('2d')
  if (!ctx) return

  // 重置游戏状态
  score.value = 0
  lives.value = 3
  level.value = 1
  enemiesKilled.value = 0
  gameOver.value = false
  paused.value = false

  // 重置玩家位置
  player.value.x = canvasWidth / 2 - 25
  player.value.y = canvasHeight - 60
  player.value.active = true

  // 清空数组
  bullets.value = []
  enemyBullets.value = []

  // 创建敌人
  createEnemies()
  
  // 创建掩体
  createBarriers()

  // 加载最高分
  const savedHighScore = localStorage.getItem('space-invaders-high-score')
  if (savedHighScore) {
    highScore.value = parseInt(savedHighScore)
  }
}

// 创建敌人
const createEnemies = () => {
  enemies.value = []
  const rows = 5
  const cols = 10
  const enemyWidth = 40
  const enemyHeight = 30
  const spacing = 50
  const startX = (canvasWidth - (cols * spacing)) / 2
  const startY = 50

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const enemyType = row < 1 ? 3 : row < 3 ? 2 : 1
      const points = enemyType === 3 ? 30 : enemyType === 2 ? 20 : 10
      
      enemies.value.push({
        x: startX + col * spacing,
        y: startY + row * spacing,
        width: enemyWidth,
        height: enemyHeight,
        color: enemyType === 3 ? '#ff0000' : enemyType === 2 ? '#ffff00' : '#00ffff',
        speed: enemySpeed,
        points: points,
        type: enemyType,
        shootChance: 0.001 + (level.value - 1) * 0.0005,
        active: true
      })
    }
  }
}

// 创建掩体
const createBarriers = () => {
  barriers.value = []
  const barrierCount = 4
  const barrierWidth = 80
  const barrierHeight = 60
  const spacing = (canvasWidth - barrierCount * barrierWidth) / (barrierCount + 1)

  for (let i = 0; i < barrierCount; i++) {
    barriers.value.push({
      x: spacing + i * (barrierWidth + spacing),
      y: canvasHeight - 200,
      width: barrierWidth,
      height: barrierHeight,
      color: '#00ff00',
      hits: 0,
      maxHits: 3,
      active: true
    })
  }
}

// 开始游戏
const startGame = () => {
  initGame()
  gameRunning.value = true
  gameLoop()
}

// 暂停游戏
const pauseGame = () => {
  paused.value = !paused.value
}

// 重新开始游戏
const restartGame = () => {
  gameRunning.value = false
  gameOver.value = false
  startGame()
}

// 移动玩家
const movePlayer = () => {
  if (!player.value.active) return

  if ((keys.value['a'] || keys.value['ArrowLeft'] || moveState.value.left) && player.value.x > 0) {
    player.value.x -= player.value.speed
  }
  if ((keys.value['d'] || keys.value['ArrowRight'] || moveState.value.right) && player.value.x < canvasWidth - player.value.width) {
    player.value.x += player.value.speed
  }
}

// 射击
const shoot = () => {
  if (!player.value.active || bullets.value.length >= maxBullets) return

  bullets.value.push({
    x: player.value.x + player.value.width / 2 - 2,
    y: player.value.y,
    width: 4,
    height: 10,
    color: '#ffff00',
    speed: bulletSpeed,
    direction: 1,
    active: true
  })

  playShootSound()
}

// 敌人射击
const enemyShoot = () => {
  const now = Date.now()
  if (now - lastEnemyShot < enemyShootInterval) return

  const activeEnemies = enemies.value.filter(enemy => enemy.active)
  if (activeEnemies.length === 0) return

  // 随机选择一个敌人射击
  const shootingEnemy = activeEnemies[Math.floor(Math.random() * activeEnemies.length)]
  
  if (Math.random() < shootingEnemy.shootChance) {
    enemyBullets.value.push({
      x: shootingEnemy.x + shootingEnemy.width / 2 - 2,
      y: shootingEnemy.y + shootingEnemy.height,
      width: 4,
      height: 10,
      color: '#ff0000',
      speed: enemyBulletSpeed,
      direction: -1,
      active: true
    })
    
    lastEnemyShot = now
  }
}

// 更新子弹
const updateBullets = () => {
  // 更新玩家子弹
  bullets.value = bullets.value.filter(bullet => {
    if (!bullet.active) return false
    
    bullet.y -= bullet.speed
    
    if (bullet.y < 0) {
      bullet.active = false
      return false
    }
    
    return true
  })

  // 更新敌人子弹
  enemyBullets.value = enemyBullets.value.filter(bullet => {
    if (!bullet.active) return false
    
    bullet.y += bullet.speed
    
    if (bullet.y > canvasHeight) {
      bullet.active = false
      return false
    }
    
    return true
  })
}

// 移动敌人
const moveEnemies = () => {
  let shouldDrop = false
  
  for (const enemy of enemies.value) {
    if (!enemy.active) continue
    
    enemy.x += enemyDirection * enemy.speed
    
    if (enemy.x <= 0 || enemy.x >= canvasWidth - enemy.width) {
      shouldDrop = true
    }
  }
  
  if (shouldDrop) {
    enemyDirection *= -1
    for (const enemy of enemies.value) {
      if (enemy.active) {
        enemy.y += enemyDropDistance
      }
    }
    
    // 增加敌人速度
    enemySpeed += 0.2
    for (const enemy of enemies.value) {
      enemy.speed = enemySpeed
    }
  }
}

// 碰撞检测
const checkCollisions = () => {
  // 玩家子弹与敌人碰撞
  for (const bullet of bullets.value) {
    if (!bullet.active) continue
    
    for (const enemy of enemies.value) {
      if (!enemy.active) continue
      
      if (isColliding(bullet, enemy)) {
        bullet.active = false
        enemy.active = false
        score.value += enemy.points
        enemiesKilled.value++
        playEnemyDeathSound()
        break
      }
    }
  }

  // 玩家子弹与掩体碰撞
  for (const bullet of bullets.value) {
    if (!bullet.active) continue
    
    for (const barrier of barriers.value) {
      if (!barrier.active) continue
      
      if (isColliding(bullet, barrier)) {
        bullet.active = false
        barrier.hits++
        if (barrier.hits >= barrier.maxHits) {
          barrier.active = false
        }
        break
      }
    }
  }

  // 敌人子弹与玩家碰撞
  for (const bullet of enemyBullets.value) {
    if (!bullet.active || !player.value.active) continue
    
    if (isColliding(bullet, player.value)) {
      bullet.active = false
      lives.value--
      playExplosionSound()
      
      if (lives.value <= 0) {
        gameOver.value = true
        gameRunning.value = false
        
        // 更新最高分
        if (score.value > highScore.value) {
          highScore.value = score.value
          localStorage.setItem('space-invaders-high-score', highScore.value.toString())
        }
      }
      break
    }
  }

  // 敌人子弹与掩体碰撞
  for (const bullet of enemyBullets.value) {
    if (!bullet.active) continue
    
    for (const barrier of barriers.value) {
      if (!barrier.active) continue
      
      if (isColliding(bullet, barrier)) {
        bullet.active = false
        barrier.hits++
        if (barrier.hits >= barrier.maxHits) {
          barrier.active = false
        }
        break
      }
    }
  }

  // 敌人与玩家碰撞
  for (const enemy of enemies.value) {
    if (!enemy.active || !player.value.active) continue
    
    if (isColliding(enemy, player.value) || enemy.y + enemy.height >= player.value.y) {
      gameOver.value = true
      gameRunning.value = false
      playExplosionSound()
      
      // 更新最高分
      if (score.value > highScore.value) {
        highScore.value = score.value
        localStorage.setItem('space-invaders-high-score', highScore.value.toString())
      }
      break
    }
  }
}

// 碰撞检测函数
const isColliding = (obj1: GameObject, obj2: GameObject): boolean => {
  return obj1.x < obj2.x + obj2.width &&
         obj1.x + obj1.width > obj2.x &&
         obj1.y < obj2.y + obj2.height &&
         obj1.y + obj1.height > obj2.y
}

// 检查关卡完成
const checkLevelComplete = () => {
  const activeEnemies = enemies.value.filter(enemy => enemy.active)
  if (activeEnemies.length === 0) {
    level.value++
    enemySpeed = 1 + (level.value - 1) * 0.5
    playLevelCompleteSound()
    
    // 创建新的敌人
    setTimeout(() => {
      createEnemies()
    }, 1000)
  }
}

// 渲染游戏
const render = () => {
  if (!ctx) return

  // 清空画布
  ctx.fillStyle = '#000011'
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  // 绘制星空背景
  drawStars()

  // 绘制玩家
  if (player.value.active) {
    ctx.fillStyle = player.value.color
    ctx.fillRect(player.value.x, player.value.y, player.value.width, player.value.height)
    
    // 绘制飞船细节
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(player.value.x + 20, player.value.y - 5, 10, 5)
  }

  // 绘制敌人
  for (const enemy of enemies.value) {
    if (!enemy.active) continue
    
    ctx.fillStyle = enemy.color
    ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height)
    
    // 绘制敌人细节
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(enemy.x + 5, enemy.y + 5, 5, 5)
    ctx.fillRect(enemy.x + enemy.width - 10, enemy.y + 5, 5, 5)
  }

  // 绘制子弹
  for (const bullet of bullets.value) {
    if (bullet.active) {
      ctx.fillStyle = bullet.color
      ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height)
    }
  }

  for (const bullet of enemyBullets.value) {
    if (bullet.active) {
      ctx.fillStyle = bullet.color
      ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height)
    }
  }

  // 绘制掩体
  for (const barrier of barriers.value) {
    if (!barrier.active) continue
    
    const alpha = 1 - (barrier.hits / barrier.maxHits) * 0.7
    ctx.fillStyle = `rgba(0, 255, 0, ${alpha})`
    ctx.fillRect(barrier.x, barrier.y, barrier.width, barrier.height)
  }
}

// 绘制星空背景
const drawStars = () => {
  if (!ctx) return
  
  ctx.fillStyle = '#ffffff'
  for (let i = 0; i < 50; i++) {
    const x = (i * 137) % canvasWidth
    const y = (i * 211) % canvasHeight
    const size = (i % 3) + 1
    ctx.fillRect(x, y, size, size)
  }
}

// 游戏主循环
const gameLoop = () => {
  if (!gameRunning.value || gameOver.value) return
  
  if (!paused.value) {
    movePlayer()
    updateBullets()
    moveEnemies()
    enemyShoot()
    checkCollisions()
    checkLevelComplete()
  }
  
  render()
  
  requestAnimationFrame(gameLoop)
}

// 键盘事件处理
const handleKeyDown = (event: KeyboardEvent) => {
  keys.value[event.key.toLowerCase()] = true
  
  if (event.key === ' ') {
    event.preventDefault()
    if (gameRunning.value && !paused.value) {
      shoot()
    }
  }
  
  if (event.key.toLowerCase() === 'p') {
    event.preventDefault()
    if (gameRunning.value) {
      pauseGame()
    }
  }
}

const handleKeyUp = (event: KeyboardEvent) => {
  keys.value[event.key.toLowerCase()] = false
}

// 移动端控制
const startMove = (direction: 'left' | 'right') => {
  moveState.value[direction] = true
}

const stopMove = () => {
  moveState.value.left = false
  moveState.value.right = false
}

// 画布点击事件
const handleCanvasClick = () => {
  if (gameRunning.value && !paused.value) {
    shoot()
  }
}

// 组件挂载
onMounted(() => {
  detectMobile()
  initAudio()
  initGame()
  
  // 添加键盘事件监听
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
})

// 组件卸载
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
})
</script>

<style scoped>
.space-invaders-game {
  min-height: 100vh;
  background: linear-gradient(135deg, #0a0a2e 0%, #16213e 50%, #0f3460 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: white;
}

.game-container {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(15px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  padding: 30px;
  max-width: 900px;
  width: 100%;
}

.game-header {
  text-align: center;
  margin-bottom: 20px;
}

.game-header h2 {
  margin: 0 0 15px 0;
  font-size: 2.5em;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  background: linear-gradient(45deg, #00ffff, #ff00ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.game-stats {
  display: flex;
  justify-content: space-around;
  flex-wrap: wrap;
  gap: 15px;
  margin-bottom: 15px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.stat-label {
  font-size: 0.9em;
  color: #cccccc;
}

.stat-value {
  font-size: 1.2em;
  font-weight: bold;
  color: #00ffff;
}

.game-controls {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.start-btn,
.pause-btn,
.restart-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 25px;
  background: linear-gradient(45deg, #00ff88, #00ccff);
  color: white;
  font-size: 1.1em;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 255, 136, 0.3);
}

.start-btn:hover,
.pause-btn:hover,
.restart-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 255, 136, 0.4);
}

.game-area {
  position: relative;
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

canvas {
  border: 2px solid #00ffff;
  border-radius: 10px;
  background: #000011;
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
}

.game-over-overlay,
.pause-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
}

.game-over-content,
.pause-content {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(15px);
  border-radius: 15px;
  padding: 30px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.game-over-content h3,
.pause-content h3 {
  margin: 0 0 20px 0;
  font-size: 2em;
  color: #00ffff;
}

.final-stats {
  margin-bottom: 20px;
}

.final-stats p {
  margin: 10px 0;
  font-size: 1.1em;
}

.new-record {
  color: #ffd700;
  font-weight: bold;
  animation: glow 1s ease-in-out infinite alternate;
}

@keyframes glow {
  from { text-shadow: 0 0 5px #ffd700; }
  to { text-shadow: 0 0 20px #ffd700, 0 0 30px #ffd700; }
}

.game-over-actions {
  display: flex;
  gap: 15px;
  justify-content: center;
}

.mobile-controls {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.control-row {
  display: flex;
  gap: 20px;
  align-items: center;
}

.move-btn,
.shoot-btn {
  padding: 15px 20px;
  border: none;
  border-radius: 50%;
  background: linear-gradient(45deg, #ff6b6b, #ff8e53);
  color: white;
  font-size: 1.2em;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
  user-select: none;
}

.shoot-btn {
  background: linear-gradient(45deg, #4ecdc4, #44a08d);
  border-radius: 15px;
  padding: 15px 25px;
}

.move-btn:active,
.shoot-btn:active {
  transform: scale(0.95);
}

.game-instructions {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 15px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.game-instructions h4 {
  margin: 0 0 15px 0;
  color: #00ffff;
  font-size: 1.3em;
}

.instructions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
  margin-bottom: 15px;
}

.instruction-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.key {
  background: linear-gradient(45deg, #667eea, #764ba2);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.9em;
  font-weight: bold;
}

.desc {
  color: #cccccc;
  font-size: 0.9em;
}

.game-tips {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.game-tips p {
  margin: 0 0 10px 0;
  color: #00ffff;
  font-weight: bold;
}

.game-tips ul {
  margin: 0;
  padding-left: 20px;
}

.game-tips li {
  margin: 5px 0;
  color: #cccccc;
  font-size: 0.9em;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .game-container {
    padding: 20px;
  }
  
  .game-header h2 {
    font-size: 2em;
  }
  
  .game-stats {
    justify-content: center;
  }
  
  canvas {
    max-width: 100%;
    height: auto;
  }
  
  .instructions-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .game-container {
    padding: 15px;
  }
  
  .game-header h2 {
    font-size: 1.8em;
  }
  
  .stat-item {
    font-size: 0.9em;
  }
}
</style>