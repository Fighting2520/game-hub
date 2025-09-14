<template>
  <div class="game-2048">
    <div class="game-header">
      <div class="score-container">
        <div class="score-box">
          <div class="score-label">得分</div>
          <div class="score-value">{{ score }}</div>
        </div>
        <div class="score-box">
          <div class="score-label">最佳</div>
          <div class="score-value">{{ bestScore }}</div>
        </div>
      </div>
      <div class="game-controls">
        <button @click="newGame" class="new-game-btn">新游戏</button>
        <button @click="undoMove" class="undo-btn" :disabled="!canUndo">撤销</button>
      </div>
    </div>
    
    <div class="game-container">
      <div class="grid-container">
        <div class="grid-row" v-for="row in 4" :key="row">
          <div class="grid-cell" v-for="col in 4" :key="col"></div>
        </div>
      </div>
      
      <div class="tile-container">
        <div
          v-for="tile in tiles"
          :key="tile.id"
          :class="['tile', `tile-${tile.value}`, tile.isNew ? 'tile-new' : '', tile.isMerged ? 'tile-merged' : '']"
          :style="getTileStyle(tile)"
        >
          {{ tile.value }}
        </div>
      </div>
    </div>
    
    <div class="game-instructions">
      <div class="instruction-section">
        <h3>🎮 游戏玩法</h3>
        <div class="gameplay-rules">
          <div class="rule-item">
            <strong>1. 移动方块：</strong>使用方向键或滑动手势，所有方块会向该方向移动到底
          </div>
          <div class="rule-item">
            <strong>2. 合并数字：</strong>相同数字的方块碰撞时会合并成一个更大的数字（如：2+2=4，4+4=8）
          </div>
          <div class="rule-item">
            <strong>3. 新方块生成：</strong>每次移动后会随机生成一个新的2或4方块
          </div>
          <div class="rule-item">
            <strong>4. 获得分数：</strong>每次合并都会获得对应数值的分数
          </div>
          <div class="rule-item">
            <strong>5. 胜利条件：</strong>合并出2048方块即可获胜，也可继续挑战更高数字
          </div>
          <div class="rule-item">
            <strong>6. 失败条件：</strong>棋盘填满且无法进行任何移动时游戏结束
          </div>
        </div>
      </div>
      
      <div class="instruction-section">
        <h3>🎯 游戏技巧</h3>
        <div class="tips-list">
          <div class="tip-item">💡 尽量将大数字放在角落，避免被小数字包围</div>
          <div class="tip-item">💡 保持一个方向的移动策略，不要频繁改变方向</div>
          <div class="tip-item">💡 优先合并较大的数字，获得更高分数</div>
          <div class="tip-item">💡 善用撤销功能，在关键时刻挽回局面</div>
        </div>
      </div>
      
      <div class="controls-hint">
        <span>⌨️ 方向键移动</span>
        <span>👆 滑动手势</span>
        <span>🔄 撤销功能</span>
        <span>🎯 目标：2048</span>
      </div>
    </div>
    
    <div v-if="gameState === 'won'" class="game-overlay win-overlay">
      <div class="overlay-content">
        <h2>🎉 恭喜！</h2>
        <p>你达到了 2048！</p>
        <div class="overlay-buttons">
          <button @click="continueGame" class="continue-btn">继续游戏</button>
          <button @click="newGame" class="new-game-btn">重新开始</button>
        </div>
      </div>
    </div>
    
    <div v-if="gameState === 'lost'" class="game-overlay lose-overlay">
      <div class="overlay-content">
        <h2>😢 游戏结束</h2>
        <p>没有更多移动了！</p>
        <p>最终得分: {{ score }}</p>
        <div class="overlay-buttons">
          <button @click="newGame" class="new-game-btn">重新开始</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'

// 游戏状态
const gameState = ref<'playing' | 'won' | 'lost'>('playing')
const score = ref(0)
const bestScore = ref(0)
const canUndo = ref(false)

// 方块接口
interface Tile {
  id: number
  value: number
  row: number
  col: number
  isNew?: boolean
  isMerged?: boolean
  previousPosition?: { row: number; col: number }
}

// 游戏数据
const tiles = ref<Tile[]>([])
const grid = ref<(Tile | null)[][]>([])
const previousState = ref<{
  tiles: Tile[]
  score: number
  grid: (Tile | null)[][]
} | null>(null)

let tileIdCounter = 0
let hasWon = false

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
const playMoveSound = () => playSound(300, 0.1, 'square')
const playMergeSound = () => playSound(500, 0.2, 'sine')
const playWinSound = () => {
  playSound(523, 0.2, 'sine') // C
  setTimeout(() => playSound(659, 0.2, 'sine'), 100) // E
  setTimeout(() => playSound(784, 0.3, 'sine'), 200) // G
}
const playLoseSound = () => playSound(200, 0.5, 'sawtooth')

// 初始化游戏
const initGame = () => {
  initAudio()
  
  // 初始化网格
  grid.value = Array(4).fill(null).map(() => Array(4).fill(null))
  tiles.value = []
  score.value = 0
  gameState.value = 'playing'
  hasWon = false
  canUndo.value = false
  previousState.value = null
  tileIdCounter = 0
  
  // 添加两个初始方块
  addRandomTile()
  addRandomTile()
  
  // 加载最佳分数
  const savedBestScore = localStorage.getItem('2048-best-score')
  if (savedBestScore) {
    bestScore.value = parseInt(savedBestScore)
  }
}

// 新游戏
const newGame = () => {
  initGame()
}

// 继续游戏
const continueGame = () => {
  gameState.value = 'playing'
}

// 撤销移动
const undoMove = () => {
  if (!previousState.value) return
  
  tiles.value = [...previousState.value.tiles]
  score.value = previousState.value.score
  grid.value = previousState.value.grid.map(row => [...row])
  canUndo.value = false
  previousState.value = null
}

// 保存当前状态
const saveState = () => {
  previousState.value = {
    tiles: tiles.value.map(tile => ({ ...tile })),
    score: score.value,
    grid: grid.value.map(row => [...row])
  }
  canUndo.value = true
}

// 添加随机方块
const addRandomTile = () => {
  const emptyCells: { row: number; col: number }[] = []
  
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      if (!grid.value[row][col]) {
        emptyCells.push({ row, col })
      }
    }
  }
  
  if (emptyCells.length === 0) return false
  
  const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)]
  const value = Math.random() < 0.9 ? 2 : 4
  
  const newTile: Tile = {
    id: tileIdCounter++,
    value,
    row: randomCell.row,
    col: randomCell.col,
    isNew: true
  }
  
  tiles.value.push(newTile)
  grid.value[randomCell.row][randomCell.col] = newTile
  
  // 移除新方块标记
  setTimeout(() => {
    newTile.isNew = false
  }, 200)
  
  return true
}

// 获取方块样式
const getTileStyle = (tile: Tile) => {
  const cellSize = 70
  const cellGap = 10
  
  return {
    transform: `translate(${tile.col * (cellSize + cellGap) + cellGap}px, ${tile.row * (cellSize + cellGap) + cellGap}px)`
  }
}

// 移动方块
const move = (direction: 'up' | 'down' | 'left' | 'right') => {
  if (gameState.value !== 'playing') return
  
  saveState()
  
  let moved = false
  let merged = false
  const newGrid: (Tile | null)[][] = Array(4).fill(null).map(() => Array(4).fill(null))
  const tilesToRemove: number[] = []
  
  // 清除合并标记
  tiles.value.forEach(tile => {
    tile.isMerged = false
  })
  
  // 根据方向处理移动
  const processLine = (line: (Tile | null)[], reverse = false) => {
    const nonEmptyTiles = line.filter(tile => tile !== null) as Tile[]
    if (reverse) nonEmptyTiles.reverse()
    
    const result: (Tile | null)[] = []
    let i = 0
    
    while (i < nonEmptyTiles.length) {
      const currentTile = nonEmptyTiles[i]
      const nextTile = nonEmptyTiles[i + 1]
      
      if (nextTile && currentTile.value === nextTile.value) {
        // 合并方块
        currentTile.value *= 2
        currentTile.isMerged = true
        score.value += currentTile.value
        tilesToRemove.push(nextTile.id)
        result.push(currentTile)
        merged = true
        i += 2
      } else {
        result.push(currentTile)
        i += 1
      }
    }
    
    // 填充空位
    while (result.length < 4) {
      result.push(null)
    }
    
    if (reverse) result.reverse()
    return result
  }
  
  if (direction === 'left' || direction === 'right') {
    for (let row = 0; row < 4; row++) {
      const line = grid.value[row]
      const newLine = processLine(line, direction === 'right')
      
      for (let col = 0; col < 4; col++) {
        if (line[col] !== newLine[col]) moved = true
        newGrid[row][col] = newLine[col]
        if (newLine[col]) {
          newLine[col]!.row = row
          newLine[col]!.col = col
        }
      }
    }
  } else {
    for (let col = 0; col < 4; col++) {
      const line = [grid.value[0][col], grid.value[1][col], grid.value[2][col], grid.value[3][col]]
      const newLine = processLine(line, direction === 'down')
      
      for (let row = 0; row < 4; row++) {
        if (line[row] !== newLine[row]) moved = true
        newGrid[row][col] = newLine[row]
        if (newLine[row]) {
          newLine[row]!.row = row
          newLine[row]!.col = col
        }
      }
    }
  }
  
  if (!moved) {
    canUndo.value = false
    previousState.value = null
    return
  }
  
  // 移除被合并的方块
  tiles.value = tiles.value.filter(tile => !tilesToRemove.includes(tile.id))
  
  // 更新网格
  grid.value = newGrid
  
  // 播放音效
  if (merged) {
    playMergeSound()
  } else {
    playMoveSound()
  }
  
  // 移除合并标记
  setTimeout(() => {
    tiles.value.forEach(tile => {
      tile.isMerged = false
    })
  }, 200)
  
  // 添加新方块
  setTimeout(() => {
    addRandomTile()
    checkGameState()
  }, 150)
}

// 检查游戏状态
const checkGameState = () => {
  // 检查是否获胜
  if (!hasWon) {
    for (const tile of tiles.value) {
      if (tile.value === 2048) {
        hasWon = true
        gameState.value = 'won'
        playWinSound()
        return
      }
    }
  }
  
  // 检查是否还能移动
  if (!canMove()) {
    gameState.value = 'lost'
    playLoseSound()
  }
  
  // 更新最佳分数
  if (score.value > bestScore.value) {
    bestScore.value = score.value
    localStorage.setItem('2048-best-score', bestScore.value.toString())
  }
}

// 检查是否还能移动
const canMove = () => {
  // 检查是否有空格
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      if (!grid.value[row][col]) return true
    }
  }
  
  // 检查是否有相邻的相同方块
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const currentTile = grid.value[row][col]
      if (!currentTile) continue
      
      // 检查右边
      if (col < 3 && grid.value[row][col + 1]?.value === currentTile.value) return true
      // 检查下面
      if (row < 3 && grid.value[row + 1][col]?.value === currentTile.value) return true
    }
  }
  
  return false
}

// 键盘事件处理
const handleKeyPress = (event: KeyboardEvent) => {
  if (gameState.value === 'won' || gameState.value === 'lost') return
  
  switch (event.key) {
    case 'ArrowUp':
      event.preventDefault()
      move('up')
      break
    case 'ArrowDown':
      event.preventDefault()
      move('down')
      break
    case 'ArrowLeft':
      event.preventDefault()
      move('left')
      break
    case 'ArrowRight':
      event.preventDefault()
      move('right')
      break
  }
}

// 触摸事件处理
let touchStartX = 0
let touchStartY = 0

const handleTouchStart = (event: TouchEvent) => {
  touchStartX = event.touches[0].clientX
  touchStartY = event.touches[0].clientY
}

const handleTouchEnd = (event: TouchEvent) => {
  if (!touchStartX || !touchStartY) return
  
  const touchEndX = event.changedTouches[0].clientX
  const touchEndY = event.changedTouches[0].clientY
  
  const deltaX = touchEndX - touchStartX
  const deltaY = touchEndY - touchStartY
  
  const minSwipeDistance = 30
  
  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    // 水平滑动
    if (Math.abs(deltaX) > minSwipeDistance) {
      if (deltaX > 0) {
        move('right')
      } else {
        move('left')
      }
    }
  } else {
    // 垂直滑动
    if (Math.abs(deltaY) > minSwipeDistance) {
      if (deltaY > 0) {
        move('down')
      } else {
        move('up')
      }
    }
  }
  
  touchStartX = 0
  touchStartY = 0
}

// 组件挂载
onMounted(() => {
  initGame()
  window.addEventListener('keydown', handleKeyPress)
  document.addEventListener('touchstart', handleTouchStart, { passive: true })
  document.addEventListener('touchend', handleTouchEnd, { passive: true })
})

// 组件卸载
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyPress)
  document.removeEventListener('touchstart', handleTouchStart)
  document.removeEventListener('touchend', handleTouchEnd)
})
</script>

<style scoped>
.game-2048 {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background: linear-gradient(135deg, #ffeaa7 0%, #fab1a0 100%);
  min-height: 100vh;
  font-family: 'Arial', sans-serif;
  user-select: none;
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 500px;
  margin-bottom: 20px;
}

.score-container {
  display: flex;
  gap: 10px;
}

.score-box {
  background: rgba(255, 255, 255, 0.3);
  padding: 10px 15px;
  border-radius: 10px;
  text-align: center;
  backdrop-filter: blur(10px);
}

.score-label {
  font-size: 12px;
  color: #333;
  font-weight: bold;
  text-transform: uppercase;
}

.score-value {
  font-size: 20px;
  font-weight: bold;
  color: #2d3436;
}

.game-controls {
  display: flex;
  gap: 10px;
}

.new-game-btn, .undo-btn, .continue-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.new-game-btn, .continue-btn {
  background: linear-gradient(45deg, #00b894, #00a085);
  color: white;
}

.undo-btn {
  background: linear-gradient(45deg, #fdcb6e, #e17055);
  color: white;
}

.undo-btn:disabled {
  background: #ddd;
  color: #999;
  cursor: not-allowed;
}

.new-game-btn:hover, .continue-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 184, 148, 0.4);
}

.undo-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(253, 203, 110, 0.4);
}

.game-container {
  position: relative;
  background: rgba(187, 173, 160, 0.8);
  border-radius: 10px;
  padding: 10px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.grid-container {
  position: relative;
  z-index: 1;
}

.grid-row {
  display: flex;
}

.grid-cell {
  width: 70px;
  height: 70px;
  background: rgba(238, 228, 218, 0.35);
  border-radius: 6px;
  margin: 5px;
}

.tile-container {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 2;
}

.tile {
  position: absolute;
  width: 70px;
  height: 70px;
  border-radius: 6px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease-in-out;
  font-size: 32px;
}

.tile-new {
  animation: appear 0.2s ease-in-out;
}

.tile-merged {
  animation: pop 0.2s ease-in-out;
}

@keyframes appear {
  0% {
    opacity: 0;
    transform: scale(0);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes pop {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}

/* 方块颜色 */
.tile-2 { background: #eee4da; color: #776e65; }
.tile-4 { background: #ede0c8; color: #776e65; }
.tile-8 { background: #f2b179; color: #f9f6f2; }
.tile-16 { background: #f59563; color: #f9f6f2; }
.tile-32 { background: #f67c5f; color: #f9f6f2; }
.tile-64 { background: #f65e3b; color: #f9f6f2; }
.tile-128 { background: #edcf72; color: #f9f6f2; font-size: 28px; }
.tile-256 { background: #edcc61; color: #f9f6f2; font-size: 28px; }
.tile-512 { background: #edc850; color: #f9f6f2; font-size: 28px; }
.tile-1024 { background: #edc53f; color: #f9f6f2; font-size: 24px; }
.tile-2048 { background: #edc22e; color: #f9f6f2; font-size: 24px; box-shadow: 0 0 20px rgba(237, 194, 46, 0.5); }

/* 更高数字的方块 */
.tile-4096 { background: #3c3a32; color: #f9f6f2; font-size: 20px; }
.tile-8192 { background: #3c3a32; color: #f9f6f2; font-size: 18px; }

.game-instructions {
  margin-top: 20px;
  max-width: 600px;
  background: rgba(255, 255, 255, 0.1);
  padding: 20px;
  border-radius: 15px;
  backdrop-filter: blur(10px);
}

.instruction-section {
  margin-bottom: 20px;
}

.instruction-section h3 {
  color: #2d3436;
  margin-bottom: 15px;
  font-size: 18px;
  text-align: center;
}

.gameplay-rules {
  display: grid;
  gap: 10px;
}

.rule-item {
  background: rgba(255, 255, 255, 0.2);
  padding: 12px;
  border-radius: 8px;
  color: #2d3436;
  font-size: 14px;
  line-height: 1.4;
  backdrop-filter: blur(5px);
}

.rule-item strong {
  color: #2d3436;
}

.tips-list {
  display: grid;
  gap: 8px;
}

.tip-item {
  background: rgba(255, 255, 255, 0.15);
  padding: 10px;
  border-radius: 8px;
  color: #2d3436;
  font-size: 13px;
  line-height: 1.3;
  backdrop-filter: blur(5px);
}

.controls-hint {
  display: flex;
  justify-content: center;
  gap: 15px;
  flex-wrap: wrap;
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.controls-hint span {
  background: rgba(255, 255, 255, 0.3);
  padding: 8px 12px;
  border-radius: 15px;
  font-size: 12px;
  color: #2d3436;
  backdrop-filter: blur(10px);
  font-weight: 500;
}

.game-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.overlay-content {
  background: white;
  padding: 40px;
  border-radius: 20px;
  text-align: center;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  max-width: 400px;
}

.overlay-content h2 {
  margin-bottom: 20px;
  font-size: 32px;
}

.overlay-content p {
  margin-bottom: 15px;
  color: #666;
  font-size: 16px;
}

.overlay-buttons {
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-top: 20px;
}

.win-overlay .overlay-content {
  background: linear-gradient(135deg, #00b894, #00a085);
  color: white;
}

.win-overlay .overlay-content p {
  color: rgba(255, 255, 255, 0.9);
}

.lose-overlay .overlay-content {
  background: linear-gradient(135deg, #e17055, #d63031);
  color: white;
}

.lose-overlay .overlay-content p {
  color: rgba(255, 255, 255, 0.9);
}

@media (max-width: 600px) {
  .game-header {
    flex-direction: column;
    gap: 15px;
  }
  
  .grid-cell, .tile {
    width: 60px;
    height: 60px;
  }
  
  .tile {
    font-size: 28px;
  }
  
  .tile-128, .tile-256, .tile-512 {
    font-size: 24px;
  }
  
  .tile-1024, .tile-2048 {
    font-size: 20px;
  }
  
  .game-instructions {
    margin: 15px;
    padding: 15px;
  }
  
  .instruction-section h3 {
    font-size: 16px;
  }
  
  .rule-item, .tip-item {
    font-size: 12px;
    padding: 8px;
  }
  
  .controls-hint {
    gap: 8px;
  }
  
  .controls-hint span {
    font-size: 11px;
    padding: 6px 8px;
  }
}
</style>