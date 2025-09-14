<template>
  <div class="minesweeper-game">
    <div class="game-header">
      <h1>💣 扫雷游戏</h1>
      <div class="game-stats">
        <div class="stat-item">
          <span class="stat-label">难度</span>
          <span class="stat-value">{{ difficultyName }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">剩余地雷</span>
          <span class="stat-value">{{ remainingMines }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">用时</span>
          <span class="stat-value">{{ formatTime(elapsedTime) }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">得分</span>
          <span class="stat-value">{{ score }}</span>
        </div>
      </div>
    </div>

    <div class="game-container">
      <!-- 游戏说明 -->
      <div class="game-instructions">
        <h3>🎮 游戏规则</h3>
        <div class="rules-grid">
          <div class="rule-item">
            <span class="rule-icon">💣</span>
            <div class="rule-text">
              <strong>找出地雷</strong>
              <p>在雷区中找出所有地雷的位置</p>
            </div>
          </div>
          <div class="rule-item">
            <span class="rule-icon">🔢</span>
            <div class="rule-text">
              <strong>数字提示</strong>
              <p>数字表示周围8格中地雷的数量</p>
            </div>
          </div>
          <div class="rule-item">
            <span class="rule-icon">🚩</span>
            <div class="rule-text">
              <strong>标记地雷</strong>
              <p>右键点击标记可疑的地雷位置</p>
            </div>
          </div>
          <div class="rule-item">
            <span class="rule-icon">🏆</span>
            <div class="rule-text">
              <strong>胜利条件</strong>
              <p>翻开所有非地雷格子即可获胜</p>
            </div>
          </div>
        </div>
        
        <h3>🎲 难度选择</h3>
        <div class="difficulty-grid">
          <div class="difficulty-item">
            <strong>初级</strong>：9×9，10个地雷
          </div>
          <div class="difficulty-item">
            <strong>中级</strong>：16×16，40个地雷
          </div>
          <div class="difficulty-item">
            <strong>高级</strong>：16×30，99个地雷
          </div>
          <div class="difficulty-item">
            <strong>专家</strong>：20×24，150个地雷
          </div>
        </div>
      </div>

      <!-- 难度选择 -->
      <div v-if="gameState === 'setup'" class="difficulty-selection">
        <h2>选择难度</h2>
        <div class="difficulty-buttons">
          <button 
            v-for="diff in difficulties" 
            :key="diff.name"
            @click="startGame(diff)"
            class="difficulty-btn"
            :class="diff.name.toLowerCase()"
          >
            <div class="difficulty-name">{{ diff.name }}</div>
            <div class="difficulty-info">
              <span>{{ diff.rows }}×{{ diff.cols }}</span>
              <span>{{ diff.mines }}个地雷</span>
            </div>
          </button>
        </div>
      </div>

      <!-- 游戏进行中 -->
      <div v-if="gameState === 'playing'" class="game-playing">
        <div class="game-info">
          <div class="mine-counter">
            <span class="counter-label">💣 剩余地雷</span>
            <span class="counter-value">{{ remainingMines }}</span>
          </div>
          <div class="game-face" @click="resetCurrentGame">
            <span class="face-emoji">{{ gameEmoji }}</span>
          </div>
          <div class="timer">
            <span class="timer-label">⏱️ 用时</span>
            <span class="timer-value">{{ formatTime(elapsedTime) }}</span>
          </div>
        </div>

        <div class="minefield" :style="minefieldStyle">
          <div
            v-for="(cell, index) in minefield"
            :key="index"
            :class="[
              'mine-cell',
              cell.isRevealed ? 'revealed' : '',
              cell.isFlagged ? 'flagged' : '',
              cell.isMine && cell.isRevealed ? 'mine-exploded' : '',
              cell.isRevealed && !cell.isMine && cell.neighborMines > 0 ? `number-${cell.neighborMines}` : ''
            ]"
            @click="revealCell(index)"
            @contextmenu.prevent="toggleFlag(index)"
            @mousedown="onCellMouseDown"
            @mouseup="onCellMouseUp"
          >
            <div class="cell-content">
              <span v-if="cell.isFlagged && !cell.isRevealed" class="flag">🚩</span>
              <span v-else-if="cell.isRevealed && cell.isMine" class="mine">💣</span>
              <span v-else-if="cell.isRevealed && !cell.isMine && cell.neighborMines > 0" class="number">
                {{ cell.neighborMines }}
              </span>
            </div>
          </div>
        </div>

        <div class="game-controls">
          <button @click="showHint" class="hint-btn" :disabled="hintsUsed >= maxHints">
            💡 提示 ({{ hintsUsed }}/{{ maxHints }})
          </button>
          <button @click="autoFlag" class="auto-flag-btn" :disabled="autoFlagsUsed >= maxAutoFlags">
            🚩 自动标记 ({{ autoFlagsUsed }}/{{ maxAutoFlags }})
          </button>
          <button @click="resetGame" class="reset-btn">🏠 重新开始</button>
        </div>

        <div class="progress-section">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
          </div>
          <div class="progress-text">
            进度: {{ revealedCells }}/{{ totalSafeCells }} ({{ Math.round(progressPercentage) }}%)
          </div>
        </div>
      </div>

      <!-- 游戏结束 -->
      <div v-if="gameState === 'won'" class="game-result win-result">
        <div class="result-content">
          <h2>🎉 恭喜扫雷成功！</h2>
          <div class="result-stats">
            <div class="result-item">
              <span class="result-label">难度</span>
              <span class="result-value">{{ difficultyName }}</span>
            </div>
            <div class="result-item">
              <span class="result-label">用时</span>
              <span class="result-value">{{ formatTime(elapsedTime) }}</span>
            </div>
            <div class="result-item">
              <span class="result-label">地雷数</span>
              <span class="result-value">{{ currentDifficulty.mines }}</span>
            </div>
            <div class="result-item">
              <span class="result-label">效率</span>
              <span class="result-value">{{ efficiency }}%</span>
            </div>
            <div class="result-item">
              <span class="result-label">得分</span>
              <span class="result-value">{{ score }}</span>
            </div>
            <div class="result-item">
              <span class="result-label">评级</span>
              <span class="result-value">{{ getRating() }}</span>
            </div>
          </div>
          <div class="result-buttons">
            <button @click="nextLevel" class="next-btn">下一关</button>
            <button @click="resetGame" class="play-again-btn">再玩一次</button>
          </div>
        </div>
      </div>

      <div v-if="gameState === 'lost'" class="game-result lose-result">
        <div class="result-content">
          <h2>💥 踩到地雷了！</h2>
          <div class="result-stats">
            <div class="result-item">
              <span class="result-label">难度</span>
              <span class="result-value">{{ difficultyName }}</span>
            </div>
            <div class="result-item">
              <span class="result-label">用时</span>
              <span class="result-value">{{ formatTime(elapsedTime) }}</span>
            </div>
            <div class="result-item">
              <span class="result-label">已翻开</span>
              <span class="result-value">{{ revealedCells }}/{{ totalSafeCells }}</span>
            </div>
            <div class="result-item">
              <span class="result-label">完成度</span>
              <span class="result-value">{{ Math.round(progressPercentage) }}%</span>
            </div>
          </div>
          <div class="result-buttons">
            <button @click="resetCurrentGame" class="play-again-btn">再试一次</button>
            <button @click="resetGame" class="change-difficulty-btn">更换难度</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'

// 游戏状态
const gameState = ref<'setup' | 'playing' | 'won' | 'lost'>('setup')
const score = ref(0)
const level = ref(1)
const hintsUsed = ref(0)
const autoFlagsUsed = ref(0)
const maxHints = ref(3)
const maxAutoFlags = ref(2)
const startTime = ref(0)
const elapsedTime = ref(0)
const revealedCells = ref(0)
const flaggedCells = ref(0)

// 格子接口
interface Cell {
  isMine: boolean
  isRevealed: boolean
  isFlagged: boolean
  neighborMines: number
}

// 游戏数据
const minefield = ref<Cell[]>([])
const currentDifficulty = ref({ name: '中级', rows: 16, cols: 16, mines: 40 })
const gameEmoji = ref('😊')

// 难度配置
const difficulties = [
  { name: '初级', rows: 9, cols: 9, mines: 10 },
  { name: '中级', rows: 16, cols: 16, mines: 40 },
  { name: '高级', rows: 16, cols: 30, mines: 99 },
  { name: '专家', rows: 20, cols: 24, mines: 150 }
]

// 计算属性
const difficultyName = computed(() => currentDifficulty.value.name)
const totalCells = computed(() => currentDifficulty.value.rows * currentDifficulty.value.cols)
const totalSafeCells = computed(() => totalCells.value - currentDifficulty.value.mines)
const remainingMines = computed(() => currentDifficulty.value.mines - flaggedCells.value)
const progressPercentage = computed(() => (revealedCells.value / totalSafeCells.value) * 100)
const efficiency = computed(() => {
  if (totalSafeCells.value === 0) return 100
  return Math.round((revealedCells.value / totalSafeCells.value) * 100)
})

const minefieldStyle = computed(() => ({
  gridTemplateColumns: `repeat(${currentDifficulty.value.cols}, 1fr)`,
  width: `${Math.min(currentDifficulty.value.cols * 25, 600)}px`
}))

// 定时器
let gameTimer: number | null = null

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

// 音效
const playClickSound = () => playSound(400, 0.1, 'square')
const playFlagSound = () => playSound(600, 0.1, 'triangle')
const playRevealSound = () => playSound(300, 0.1, 'sine')
const playWinSound = () => {
  playSound(523, 0.2, 'sine')
  setTimeout(() => playSound(659, 0.2, 'sine'), 100)
  setTimeout(() => playSound(784, 0.2, 'sine'), 200)
  setTimeout(() => playSound(1047, 0.3, 'sine'), 300)
}
const playLoseSound = () => {
  playSound(200, 0.5, 'sawtooth')
  setTimeout(() => playSound(150, 0.5, 'sawtooth'), 200)
}

// 格式化时间
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 开始游戏
const startGame = (difficulty: typeof difficulties[0]) => {
  initAudio()
  gameState.value = 'playing'
  currentDifficulty.value = difficulty
  revealedCells.value = 0
  flaggedCells.value = 0
  hintsUsed.value = 0
  autoFlagsUsed.value = 0
  startTime.value = Date.now()
  elapsedTime.value = 0
  gameEmoji.value = '😊'
  
  initializeMinefield()
  startTimer()
}

// 初始化雷区
const initializeMinefield = () => {
  const { rows, cols, mines } = currentDifficulty.value
  const totalCells = rows * cols
  
  // 创建空雷区
  minefield.value = Array(totalCells).fill(null).map(() => ({
    isMine: false,
    isRevealed: false,
    isFlagged: false,
    neighborMines: 0
  }))
  
  // 随机放置地雷
  const minePositions = new Set<number>()
  while (minePositions.size < mines) {
    const pos = Math.floor(Math.random() * totalCells)
    minePositions.add(pos)
  }
  
  // 设置地雷
  minePositions.forEach(pos => {
    minefield.value[pos].isMine = true
  })
  
  // 计算每个格子周围的地雷数量
  for (let i = 0; i < totalCells; i++) {
    if (!minefield.value[i].isMine) {
      minefield.value[i].neighborMines = countNeighborMines(i)
    }
  }
}

// 计算周围地雷数量
const countNeighborMines = (index: number): number => {
  const { rows, cols } = currentDifficulty.value
  const row = Math.floor(index / cols)
  const col = index % cols
  let count = 0
  
  for (let r = row - 1; r <= row + 1; r++) {
    for (let c = col - 1; c <= col + 1; c++) {
      if (r >= 0 && r < rows && c >= 0 && c < cols && !(r === row && c === col)) {
        const neighborIndex = r * cols + c
        if (minefield.value[neighborIndex].isMine) {
          count++
        }
      }
    }
  }
  
  return count
}

// 获取邻居格子索引
const getNeighbors = (index: number): number[] => {
  const { rows, cols } = currentDifficulty.value
  const row = Math.floor(index / cols)
  const col = index % cols
  const neighbors: number[] = []
  
  for (let r = row - 1; r <= row + 1; r++) {
    for (let c = col - 1; c <= col + 1; c++) {
      if (r >= 0 && r < rows && c >= 0 && c < cols && !(r === row && c === col)) {
        neighbors.push(r * cols + c)
      }
    }
  }
  
  return neighbors
}

// 开始计时器
const startTimer = () => {
  if (gameTimer) clearInterval(gameTimer)
  
  gameTimer = setInterval(() => {
    elapsedTime.value = Math.floor((Date.now() - startTime.value) / 1000)
  }, 1000)
}

// 停止计时器
const stopTimer = () => {
  if (gameTimer) {
    clearInterval(gameTimer)
    gameTimer = null
  }
}

// 翻开格子
const revealCell = (index: number) => {
  const cell = minefield.value[index]
  if (cell.isRevealed || cell.isFlagged || gameState.value !== 'playing') return
  
  playClickSound()
  
  if (cell.isMine) {
    // 踩到地雷
    cell.isRevealed = true
    gameState.value = 'lost'
    gameEmoji.value = '😵'
    stopTimer()
    playLoseSound()
    
    // 显示所有地雷
    minefield.value.forEach(c => {
      if (c.isMine) c.isRevealed = true
    })
    
  } else {
    // 安全格子
    revealSafeCell(index)
    playRevealSound()
    
    // 检查胜利条件
    if (revealedCells.value === totalSafeCells.value) {
      gameState.value = 'won'
      gameEmoji.value = '😎'
      stopTimer()
      calculateScore()
      playWinSound()
      
      // 自动标记所有地雷
      minefield.value.forEach(cell => {
        if (cell.isMine && !cell.isFlagged) {
          cell.isFlagged = true
          flaggedCells.value++
        }
      })
    }
  }
}

// 翻开安全格子（递归翻开空白区域）
const revealSafeCell = (index: number) => {
  const cell = minefield.value[index]
  if (cell.isRevealed || cell.isMine) return
  
  cell.isRevealed = true
  revealedCells.value++
  
  // 如果是空白格子（周围没有地雷），递归翻开周围格子
  if (cell.neighborMines === 0) {
    const neighbors = getNeighbors(index)
    neighbors.forEach(neighborIndex => {
      const neighborCell = minefield.value[neighborIndex]
      if (!neighborCell.isRevealed && !neighborCell.isFlagged) {
        revealSafeCell(neighborIndex)
      }
    })
  }
}

// 切换标记
const toggleFlag = (index: number) => {
  const cell = minefield.value[index]
  if (cell.isRevealed || gameState.value !== 'playing') return
  
  if (cell.isFlagged) {
    cell.isFlagged = false
    flaggedCells.value--
  } else {
    cell.isFlagged = true
    flaggedCells.value++
  }
  
  playFlagSound()
}

// 鼠标按下事件
const onCellMouseDown = () => {
  if (gameState.value === 'playing') {
    gameEmoji.value = '😮'
  }
}

// 鼠标抬起事件
const onCellMouseUp = () => {
  if (gameState.value === 'playing') {
    gameEmoji.value = '😊'
  }
}

// 显示提示
const showHint = () => {
  if (hintsUsed.value >= maxHints.value || gameState.value !== 'playing') return
  
  hintsUsed.value++
  
  // 找到一个安全的未翻开格子
  const safeCells = minefield.value
    .map((cell, index) => ({ cell, index }))
    .filter(({ cell }) => !cell.isMine && !cell.isRevealed && !cell.isFlagged)
  
  if (safeCells.length > 0) {
    const randomSafe = safeCells[Math.floor(Math.random() * safeCells.length)]
    
    // 高亮提示格子
    const hintCell = document.querySelectorAll('.mine-cell')[randomSafe.index]
    hintCell.classList.add('hint-highlight')
    
    setTimeout(() => {
      hintCell.classList.remove('hint-highlight')
    }, 2000)
  }
}

// 自动标记
const autoFlag = () => {
  if (autoFlagsUsed.value >= maxAutoFlags.value || gameState.value !== 'playing') return
  
  autoFlagsUsed.value++
  
  // 找到明显的地雷位置进行标记
  let flagged = 0
  
  minefield.value.forEach((cell, index) => {
    if (cell.isRevealed && cell.neighborMines > 0) {
      const neighbors = getNeighbors(index)
      const unrevealedNeighbors = neighbors.filter(ni => !minefield.value[ni].isRevealed)
      const flaggedNeighbors = neighbors.filter(ni => minefield.value[ni].isFlagged)
      
      // 如果未翻开的邻居数量等于剩余地雷数量，标记所有未翻开的邻居
      if (unrevealedNeighbors.length === cell.neighborMines - flaggedNeighbors.length) {
        unrevealedNeighbors.forEach(ni => {
          if (!minefield.value[ni].isFlagged && flagged < 3) {
            minefield.value[ni].isFlagged = true
            flaggedCells.value++
            flagged++
          }
        })
      }
    }
  })
  
  if (flagged > 0) {
    playFlagSound()
  }
}

// 计算得分
const calculateScore = () => {
  const baseScore = currentDifficulty.value.mines * 10
  const timeBonus = Math.max(0, 600 - elapsedTime.value) * 2
  const efficiencyBonus = efficiency.value * 5
  const difficultyMultiplier = currentDifficulty.value.mines / 40
  
  score.value = Math.floor((baseScore + timeBonus + efficiencyBonus) * difficultyMultiplier)
}

// 获取评级
const getRating = () => {
  if (elapsedTime.value <= 60) return '🏆 闪电'
  if (elapsedTime.value <= 120) return '🥇 优秀'
  if (elapsedTime.value <= 300) return '🥈 良好'
  if (elapsedTime.value <= 600) return '🥉 及格'
  return '📚 需要练习'
}

// 下一关
const nextLevel = () => {
  level.value++
  const currentIndex = difficulties.findIndex(d => d.name === currentDifficulty.value.name)
  const nextDiff = difficulties[Math.min(currentIndex + 1, difficulties.length - 1)]
  startGame(nextDiff)
}

// 重新开始当前难度
const resetCurrentGame = () => {
  startGame(currentDifficulty.value)
}

// 重置游戏
const resetGame = () => {
  gameState.value = 'setup'
  stopTimer()
  score.value = 0
  level.value = 1
}

// 生命周期钩子
onMounted(() => {
  // 游戏在setup状态，等待用户选择难度
})

onUnmounted(() => {
  stopTimer()
})
</script>

<style scoped>
.minesweeper-game {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.game-header {
  text-align: center;
  margin-bottom: 30px;
}

.game-header h1 {
  font-size: 2.5rem;
  margin-bottom: 20px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  color: white;
}

.game-stats {
  display: flex;
  justify-content: center;
  gap: 15px;
  flex-wrap: wrap;
}

.stat-item {
  background: rgba(255, 255, 255, 0.2);
  padding: 10px 15px;
  border-radius: 10px;
  backdrop-filter: blur(10px);
  text-align: center;
  min-width: 80px;
  color: white;
}

.stat-label {
  display: block;
  font-size: 0.8rem;
  opacity: 0.8;
  margin-bottom: 5px;
}

.stat-value {
  display: block;
  font-size: 1.1rem;
  font-weight: bold;
}

.game-container {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  padding: 30px;
  backdrop-filter: blur(15px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.2);
  max-width: 1000px;
  width: 100%;
  color: white;
}

.game-instructions {
  margin-bottom: 30px;
}

.game-instructions h3 {
  font-size: 1.5rem;
  margin-bottom: 15px;
  text-align: center;
}

.rules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
  margin-bottom: 25px;
}

.rule-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: rgba(255, 255, 255, 0.1);
  padding: 15px;
  border-radius: 10px;
}

.rule-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.rule-text strong {
  display: block;
  margin-bottom: 5px;
  font-size: 1.1rem;
}

.rule-text p {
  margin: 0;
  opacity: 0.9;
  font-size: 0.9rem;
}

.difficulty-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
}

.difficulty-item {
  background: rgba(255, 255, 255, 0.1);
  padding: 10px;
  border-radius: 8px;
  text-align: center;
  font-size: 0.9rem;
}

.difficulty-selection {
  text-align: center;
}

.difficulty-selection h2 {
  font-size: 2rem;
  margin-bottom: 30px;
}

.difficulty-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.difficulty-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 15px;
  padding: 20px;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.difficulty-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-2px);
}

.difficulty-btn.初级 { border-color: #4CAF50; }
.difficulty-btn.中级 { border-color: #FF9800; }
.difficulty-btn.高级 { border-color: #F44336; }
.difficulty-btn.专家 { border-color: #9C27B0; }

.difficulty-name {
  font-size: 1.3rem;
  font-weight: bold;
  margin-bottom: 10px;
}

.difficulty-info {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 0.9rem;
  opacity: 0.9;
}

.game-playing {
  text-align: center;
}

.game-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  backdrop-filter: blur(10px);
}

.mine-counter,
.timer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.counter-label,
.timer-label {
  font-size: 0.9rem;
  opacity: 0.8;
}

.counter-value,
.timer-value {
  font-size: 1.2rem;
  font-weight: bold;
}

.game-face {
  cursor: pointer;
  transition: transform 0.2s ease;
}

.game-face:hover {
  transform: scale(1.1);
}

.face-emoji {
  font-size: 2rem;
}

.minefield {
  display: grid;
  gap: 1px;
  margin: 20px auto;
  background: #333;
  padding: 2px;
  border-radius: 5px;
  justify-content: center;
}

.mine-cell {
  width: 25px;
  height: 25px;
  background: #c0c0c0;
  border: 2px outset #c0c0c0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 12px;
  font-weight: bold;
  user-select: none;
  transition: all 0.1s ease;
}

.mine-cell:hover:not(.revealed) {
  background: #d0d0d0;
}

.mine-cell.revealed {
  background: #e0e0e0;
  border: 1px inset #c0c0c0;
  cursor: default;
}

.mine-cell.flagged {
  background: #c0c0c0;
}

.mine-cell.mine-exploded {
  background: #ff4444;
  animation: explode 0.3s ease-in-out;
}

@keyframes explode {
  0% { transform: scale(1); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

.mine-cell.number-1 { color: #0000ff; }
.mine-cell.number-2 { color: #008000; }
.mine-cell.number-3 { color: #ff0000; }
.mine-cell.number-4 { color: #000080; }
.mine-cell.number-5 { color: #800000; }
.mine-cell.number-6 { color: #008080; }
.mine-cell.number-7 { color: #000000; }
.mine-cell.number-8 { color: #808080; }

.cell-content {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.flag,
.mine,
.number {
  font-size: 14px;
  line-height: 1;
}

.mine-cell.hint-highlight {
  animation: hintPulse 2s ease-in-out;
}

@keyframes hintPulse {
  0%, 100% { background: #c0c0c0; }
  50% { background: #ffff00; }
}

.game-controls {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin: 20px 0;
  flex-wrap: wrap;
}

.hint-btn,
.auto-flag-btn,
.reset-btn {
  padding: 12px 20px;
  border: none;
  border-radius: 10px;
  color: white;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.hint-btn {
  background: linear-gradient(135deg, #2196F3, #1976D2);
}

.hint-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #1976D2, #2196F3);
  transform: translateY(-2px);
}

.auto-flag-btn {
  background: linear-gradient(135deg, #FF9800, #F57C00);
}

.auto-flag-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #F57C00, #FF9800);
  transform: translateY(-2px);
}

.reset-btn {
  background: linear-gradient(135deg, #9E9E9E, #757575);
}

.reset-btn:hover {
  background: linear-gradient(135deg, #757575, #9E9E9E);
  transform: translateY(-2px);
}

.hint-btn:disabled,
.auto-flag-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.progress-section {
  margin: 20px 0;
}

.progress-bar {
  width: 100%;
  height: 20px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 10px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(135deg, #4CAF50, #45a049);
  transition: width 0.3s ease;
  border-radius: 10px;
}

.progress-text {
  text-align: center;
  font-weight: bold;
  opacity: 0.9;
}

.game-result {
  text-align: center;
}

.result-content {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  padding: 30px;
  backdrop-filter: blur(10px);
}

.win-result .result-content {
  border: 2px solid rgba(76, 175, 80, 0.5);
}

.lose-result .result-content {
  border: 2px solid rgba(244, 67, 54, 0.5);
}

.result-content h2 {
  font-size: 2rem;
  margin-bottom: 25px;
}

.result-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
  margin-bottom: 25px;
}

.result-item {
  background: rgba(255, 255, 255, 0.1);
  padding: 15px;
  border-radius: 10px;
  backdrop-filter: blur(10px);
}

.result-label {
  display: block;
  font-size: 0.9rem;
  opacity: 0.8;
  margin-bottom: 5px;
}

.result-value {
  display: block;
  font-size: 1.3rem;
  font-weight: bold;
}

.result-buttons {
  display: flex;
  justify-content: center;
  gap: 15px;
  flex-wrap: wrap;
}

.next-btn,
.play-again-btn,
.change-difficulty-btn {
  padding: 15px 25px;
  border: none;
  border-radius: 10px;
  color: white;
  cursor: pointer;
  font-weight: bold;
  font-size: 1.1rem;
  transition: all 0.3s ease;
}

.next-btn {
  background: linear-gradient(135deg, #4CAF50, #45a049);
}

.next-btn:hover {
  background: linear-gradient(135deg, #45a049, #4CAF50);
  transform: translateY(-2px);
}

.play-again-btn {
  background: linear-gradient(135deg, #2196F3, #1976D2);
}

.play-again-btn:hover {
  background: linear-gradient(135deg, #1976D2, #2196F3);
  transform: translateY(-2px);
}

.change-difficulty-btn {
  background: linear-gradient(135deg, #FF9800, #F57C00);
}

.change-difficulty-btn:hover {
  background: linear-gradient(135deg, #F57C00, #FF9800);
  transform: translateY(-2px);
}

@media (max-width: 768px) {
  .minesweeper-game {
    padding: 15px;
  }
  
  .game-header h1 {
    font-size: 2rem;
  }
  
  .game-stats {
    gap: 8px;
  }
  
  .stat-item {
    padding: 8px 10px;
    min-width: 70px;
  }
  
  .game-container {
    padding: 20px;
  }
  
  .rules-grid {
    grid-template-columns: 1fr;
  }
  
  .difficulty-buttons {
    grid-template-columns: 1fr;
  }
  
  .game-info {
    flex-direction: column;
    gap: 15px;
  }
  
  .minefield {
    max-width: 100%;
    overflow-x: auto;
  }
  
  .mine-cell {
    width: 20px;
    height: 20px;
    font-size: 10px;
  }
  
  .game-controls {
    flex-direction: column;
    align-items: center;
  }
  
  .result-stats {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .result-buttons {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .mine-cell {
    width: 18px;
    height: 18px;
    font-size: 9px;
  }
  
  .flag,
  .mine,
  .number {
    font-size: 10px;
  }
}
</style>