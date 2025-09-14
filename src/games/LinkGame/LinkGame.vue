<template>
  <div class="link-game">
    <div class="game-header">
      <div class="score-container">
        <div class="score-box">
          <div class="score-label">得分</div>
          <div class="score-value">{{ score }}</div>
        </div>
        <div class="score-box">
          <div class="score-label">时间</div>
          <div class="score-value">{{ formatTime(timeLeft) }}</div>
        </div>
        <div class="score-box">
          <div class="score-label">剩余</div>
          <div class="score-value">{{ remainingPairs }}</div>
        </div>
      </div>
      <div class="game-controls">
        <button @click="newGame" class="new-game-btn">新游戏</button>
        <button @click="shuffleBoard" class="shuffle-btn" :disabled="shuffleCount <= 0">
          重排 ({{ shuffleCount }})
        </button>
        <button @click="showHint" class="hint-btn" :disabled="hintCount <= 0">
          提示 ({{ hintCount }})
        </button>
      </div>
    </div>
    
    <div class="game-container">
      <div class="game-board" ref="gameBoard">
        <div
          v-for="(row, rowIndex) in (board || [])"
          :key="rowIndex"
          class="board-row"
        >
          <div
            v-for="(cell, colIndex) in (row || [])"
            :key="colIndex"
            :class="[
              'board-cell',
              cell?.isEmpty ? 'empty' : '',
              cell?.isSelected ? 'selected' : '',
              cell?.isHint ? 'hint' : '',
              cell?.isMatched ? 'matched' : ''
            ]"
            @click="selectCell(rowIndex, colIndex)"
          >
            <div v-if="cell && !cell.isEmpty" class="cell-content">
              {{ cell.symbol }}
            </div>
          </div>
        </div>
        
        <!-- 连接线 -->
        <svg class="connection-lines" :width="boardWidth" :height="boardHeight">
          <path
            v-for="(line, index) in connectionLines"
            :key="index"
            :d="line.path"
            stroke="#4CAF50"
            stroke-width="3"
            fill="none"
            class="connection-line"
          />
        </svg>
      </div>
    </div>
    
    <div class="game-instructions">
      <div class="instruction-section">
        <h3>🎮 游戏玩法</h3>
        <div class="gameplay-rules">
          <div class="rule-item">
            <strong>1. 选择配对：</strong>点击两个相同的图案方块进行配对
          </div>
          <div class="rule-item">
            <strong>2. 连接规则：</strong>两个方块之间的连线不能超过3条直线，且不能穿过其他方块
          </div>
          <div class="rule-item">
            <strong>3. 消除得分：</strong>成功连接的方块会消失，获得分数
          </div>
          <div class="rule-item">
            <strong>4. 时间限制：</strong>在规定时间内消除所有方块即可获胜
          </div>
          <div class="rule-item">
            <strong>5. 道具使用：</strong>可使用重排和提示道具帮助通关
          </div>
        </div>
      </div>
      
      <div class="controls-hint">
        <span>🖱️ 点击选择</span>
        <span>🔄 重排道具</span>
        <span>💡 提示道具</span>
        <span>⏰ 时间挑战</span>
      </div>
    </div>
    
    <div v-if="gameState === 'won'" class="game-overlay win-overlay">
      <div class="overlay-content">
        <h2>🎉 恭喜通关！</h2>
        <p>用时: {{ formatTime(totalTime - timeLeft) }}</p>
        <p>最终得分: {{ score }}</p>
        <div class="overlay-buttons">
          <button @click="nextLevel" class="continue-btn">下一关</button>
          <button @click="newGame" class="new-game-btn">重新开始</button>
        </div>
      </div>
    </div>
    
    <div v-if="gameState === 'lost'" class="game-overlay lose-overlay">
      <div class="overlay-content">
        <h2>⏰ 时间到！</h2>
        <p>最终得分: {{ score }}</p>
        <p>已消除: {{ totalPairs - remainingPairs }} 对</p>
        <div class="overlay-buttons">
          <button @click="newGame" class="new-game-btn">重新开始</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'

// 游戏状态
const gameState = ref<'playing' | 'won' | 'lost'>('playing')
const score = ref(0)
const timeLeft = ref(300) // 5分钟
const totalTime = ref(300)
const level = ref(1)
const shuffleCount = ref(3)
const hintCount = ref(3)

// 游戏板相关
const gameBoard = ref<HTMLElement>()
const boardWidth = ref(600)
const boardHeight = ref(400)
const rows = 8
const cols = 12

// 方块接口
interface Cell {
  symbol: string
  isEmpty: boolean
  isSelected: boolean
  isHint: boolean
  isMatched: boolean
  row: number
  col: number
}

// 连接线接口
interface ConnectionLine {
  path: string
}

// 游戏数据
const board = ref<Cell[][]>([])
const selectedCells = ref<Cell[]>([])
const connectionLines = ref<ConnectionLine[]>([])
const totalPairs = ref(0)

// 游戏符号
const symbols = ['🍎', '🍌', '🍇', '🍊', '🍓', '🥝', '🍑', '🍒', '🥭', '🍍', '🥥', '🍈', '🍉', '🍋', '🥑', '🍅']

// 计算剩余配对数
const remainingPairs = computed(() => {
  if (!board.value || board.value.length === 0) return 0
  
  let count = 0
  for (let row = 0; row < rows; row++) {
    if (!board.value[row]) continue
    for (let col = 0; col < cols; col++) {
      if (board.value[row][col] && !board.value[row][col].isEmpty) {
        count++
      }
    }
  }
  return Math.floor(count / 2)
})

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
const playSelectSound = () => playSound(400, 0.1, 'square')
const playMatchSound = () => playSound(600, 0.3, 'sine')
const playErrorSound = () => playSound(200, 0.2, 'sawtooth')
const playWinSound = () => {
  playSound(523, 0.2, 'sine')
  setTimeout(() => playSound(659, 0.2, 'sine'), 100)
  setTimeout(() => playSound(784, 0.3, 'sine'), 200)
}

// 格式化时间
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 初始化游戏板
const initBoard = () => {
  // 创建空白游戏板
  board.value = Array(rows).fill(null).map((_, row) => 
    Array(cols).fill(null).map((_, col) => ({
      symbol: '',
      isEmpty: true,
      isSelected: false,
      isHint: false,
      isMatched: false,
      row,
      col
    }))
  )
  
  // 计算需要的符号对数
  const totalCells = (rows - 2) * (cols - 2) // 去掉边界
  const pairsNeeded = Math.floor(totalCells / 2)
  totalPairs.value = pairsNeeded
  
  // 生成符号对
  const symbolPairs: string[] = []
  for (let i = 0; i < pairsNeeded; i++) {
    const symbol = symbols[i % symbols.length]
    symbolPairs.push(symbol, symbol)
  }
  
  // 打乱符号
  for (let i = symbolPairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[symbolPairs[i], symbolPairs[j]] = [symbolPairs[j], symbolPairs[i]]
  }
  
  // 填充游戏板（避开边界）
  let symbolIndex = 0
  for (let row = 1; row < rows - 1; row++) {
    for (let col = 1; col < cols - 1; col++) {
      if (symbolIndex < symbolPairs.length) {
        board.value[row][col] = {
          symbol: symbolPairs[symbolIndex],
          isEmpty: false,
          isSelected: false,
          isHint: false,
          isMatched: false,
          row,
          col
        }
        symbolIndex++
      }
    }
  }
}

// 新游戏
const newGame = () => {
  initAudio()
  gameState.value = 'playing'
  score.value = 0
  level.value = 1
  timeLeft.value = 300
  totalTime.value = 300
  shuffleCount.value = 3
  hintCount.value = 3
  selectedCells.value = []
  connectionLines.value = []
  
  initBoard()
  startTimer()
}

// 下一关
const nextLevel = () => {
  level.value++
  timeLeft.value = Math.max(180, 300 - level.value * 30) // 时间逐渐减少
  totalTime.value = timeLeft.value
  shuffleCount.value = Math.max(1, 4 - Math.floor(level.value / 2))
  hintCount.value = Math.max(1, 4 - Math.floor(level.value / 2))
  selectedCells.value = []
  connectionLines.value = []
  
  initBoard()
  gameState.value = 'playing'
  startTimer()
}

// 开始计时器
const startTimer = () => {
  if (gameTimer) clearInterval(gameTimer)
  
  gameTimer = setInterval(() => {
    timeLeft.value--
    if (timeLeft.value <= 0) {
      gameState.value = 'lost'
      clearInterval(gameTimer!)
    }
  }, 1000)
}

// 选择方块
const selectCell = (row: number, col: number) => {
  if (gameState.value !== 'playing') return
  
  const cell = board.value[row][col]
  if (cell.isEmpty || cell.isMatched) return
  
  // 清除提示
  clearHints()
  
  if (cell.isSelected) {
    // 取消选择
    cell.isSelected = false
    selectedCells.value = selectedCells.value.filter(c => c !== cell)
    return
  }
  
  if (selectedCells.value.length >= 2) {
    // 清除之前的选择
    selectedCells.value.forEach(c => c.isSelected = false)
    selectedCells.value = []
  }
  
  cell.isSelected = true
  selectedCells.value.push(cell)
  playSelectSound()
  
  if (selectedCells.value.length === 2) {
    checkMatch()
  }
}

// 检查匹配
const checkMatch = () => {
  const [cell1, cell2] = selectedCells.value
  
  if (cell1.symbol === cell2.symbol) {
    const path = findPath(cell1, cell2)
    if (path) {
      // 匹配成功
      matchCells(cell1, cell2, path)
    } else {
      // 无法连接
      playErrorSound()
      setTimeout(() => {
        cell1.isSelected = false
        cell2.isSelected = false
        selectedCells.value = []
      }, 500)
    }
  } else {
    // 符号不匹配
    playErrorSound()
    setTimeout(() => {
      cell1.isSelected = false
      cell2.isSelected = false
      selectedCells.value = []
    }, 500)
  }
}

// 匹配方块
const matchCells = (cell1: Cell, cell2: Cell, path: {x: number, y: number}[]) => {
  cell1.isMatched = true
  cell2.isMatched = true
  cell1.isSelected = false
  cell2.isSelected = false
  
  // 显示连接线
  showConnectionLine(path)
  
  playMatchSound()
  score.value += 100
  
  setTimeout(() => {
    cell1.isEmpty = true
    cell2.isEmpty = true
    selectedCells.value = []
    connectionLines.value = []
    
    // 检查游戏状态
    if (remainingPairs.value === 0) {
      gameState.value = 'won'
      if (gameTimer) clearInterval(gameTimer)
      playWinSound()
    }
  }, 800)
}

// 显示连接线
const showConnectionLine = (path: {x: number, y: number}[]) => {
  const cellSize = 40
  const pathString = path.map((point, index) => {
    const x = point.x * cellSize + cellSize / 2
    const y = point.y * cellSize + cellSize / 2
    return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`
  }).join(' ')
  
  connectionLines.value = [{ path: pathString }]
}

// 寻找路径（连连看算法）
const findPath = (cell1: Cell, cell2: Cell): {x: number, y: number}[] | null => {
  // 直线连接
  if (canConnectDirectly(cell1, cell2)) {
    return [
      { x: cell1.col, y: cell1.row },
      { x: cell2.col, y: cell2.row }
    ]
  }
  
  // 一个转角连接
  const oneCornerPath = findOneCornerPath(cell1, cell2)
  if (oneCornerPath) return oneCornerPath
  
  // 两个转角连接
  const twoCornerPath = findTwoCornerPath(cell1, cell2)
  if (twoCornerPath) return twoCornerPath
  
  return null
}

// 检查是否可以直线连接
const canConnectDirectly = (cell1: Cell, cell2: Cell): boolean => {
  if (cell1.row === cell2.row) {
    // 水平连接
    const minCol = Math.min(cell1.col, cell2.col)
    const maxCol = Math.max(cell1.col, cell2.col)
    for (let col = minCol + 1; col < maxCol; col++) {
      if (!board.value[cell1.row][col].isEmpty) return false
    }
    return true
  } else if (cell1.col === cell2.col) {
    // 垂直连接
    const minRow = Math.min(cell1.row, cell2.row)
    const maxRow = Math.max(cell1.row, cell2.row)
    for (let row = minRow + 1; row < maxRow; row++) {
      if (!board.value[row][cell1.col].isEmpty) return false
    }
    return true
  }
  return false
}

// 寻找一个转角的路径
const findOneCornerPath = (cell1: Cell, cell2: Cell): {x: number, y: number}[] | null => {
  // 尝试转角点 (cell1.row, cell2.col)
  const corner1 = { row: cell1.row, col: cell2.col }
  if (isValidCorner(corner1) && 
      canConnectDirectly(cell1, { ...corner1, symbol: '', isEmpty: true, isSelected: false, isHint: false, isMatched: false }) &&
      canConnectDirectly({ ...corner1, symbol: '', isEmpty: true, isSelected: false, isHint: false, isMatched: false }, cell2)) {
    return [
      { x: cell1.col, y: cell1.row },
      { x: corner1.col, y: corner1.row },
      { x: cell2.col, y: cell2.row }
    ]
  }
  
  // 尝试转角点 (cell2.row, cell1.col)
  const corner2 = { row: cell2.row, col: cell1.col }
  if (isValidCorner(corner2) && 
      canConnectDirectly(cell1, { ...corner2, symbol: '', isEmpty: true, isSelected: false, isHint: false, isMatched: false }) &&
      canConnectDirectly({ ...corner2, symbol: '', isEmpty: true, isSelected: false, isHint: false, isMatched: false }, cell2)) {
    return [
      { x: cell1.col, y: cell1.row },
      { x: corner2.col, y: corner2.row },
      { x: cell2.col, y: cell2.row }
    ]
  }
  
  return null
}

// 寻找两个转角的路径
const findTwoCornerPath = (cell1: Cell, cell2: Cell): {x: number, y: number}[] | null => {
  // 尝试水平延伸
  for (let col = 0; col < cols; col++) {
    if (col === cell1.col) continue
    
    const corner1 = { row: cell1.row, col }
    const corner2 = { row: cell2.row, col }
    
    if (isValidCorner(corner1) && isValidCorner(corner2) &&
        canConnectDirectly(cell1, { ...corner1, symbol: '', isEmpty: true, isSelected: false, isHint: false, isMatched: false }) &&
        canConnectDirectly({ ...corner1, symbol: '', isEmpty: true, isSelected: false, isHint: false, isMatched: false }, { ...corner2, symbol: '', isEmpty: true, isSelected: false, isHint: false, isMatched: false }) &&
        canConnectDirectly({ ...corner2, symbol: '', isEmpty: true, isSelected: false, isHint: false, isMatched: false }, cell2)) {
      return [
        { x: cell1.col, y: cell1.row },
        { x: corner1.col, y: corner1.row },
        { x: corner2.col, y: corner2.row },
        { x: cell2.col, y: cell2.row }
      ]
    }
  }
  
  // 尝试垂直延伸
  for (let row = 0; row < rows; row++) {
    if (row === cell1.row) continue
    
    const corner1 = { row, col: cell1.col }
    const corner2 = { row, col: cell2.col }
    
    if (isValidCorner(corner1) && isValidCorner(corner2) &&
        canConnectDirectly(cell1, { ...corner1, symbol: '', isEmpty: true, isSelected: false, isHint: false, isMatched: false }) &&
        canConnectDirectly({ ...corner1, symbol: '', isEmpty: true, isSelected: false, isHint: false, isMatched: false }, { ...corner2, symbol: '', isEmpty: true, isSelected: false, isHint: false, isMatched: false }) &&
        canConnectDirectly({ ...corner2, symbol: '', isEmpty: true, isSelected: false, isHint: false, isMatched: false }, cell2)) {
      return [
        { x: cell1.col, y: cell1.row },
        { x: corner1.col, y: corner1.row },
        { x: corner2.col, y: corner2.row },
        { x: cell2.col, y: cell2.row }
      ]
    }
  }
  
  return null
}

// 检查转角点是否有效
const isValidCorner = (corner: { row: number, col: number }): boolean => {
  if (corner.row < 0 || corner.row >= rows || corner.col < 0 || corner.col >= cols) {
    return true // 边界外的点可以作为转角
  }
  return board.value[corner.row][corner.col].isEmpty
}

// 重排游戏板
const shuffleBoard = () => {
  if (shuffleCount.value <= 0) return
  
  shuffleCount.value--
  
  // 收集所有非空方块的符号
  const symbols: string[] = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (!board.value[row][col].isEmpty) {
        symbols.push(board.value[row][col].symbol)
        board.value[row][col].isEmpty = true
      }
    }
  }
  
  // 打乱符号
  for (let i = symbols.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[symbols[i], symbols[j]] = [symbols[j], symbols[i]]
  }
  
  // 重新填充
  let symbolIndex = 0
  for (let row = 1; row < rows - 1; row++) {
    for (let col = 1; col < cols - 1; col++) {
      if (symbolIndex < symbols.length) {
        board.value[row][col] = {
          symbol: symbols[symbolIndex],
          isEmpty: false,
          isSelected: false,
          isHint: false,
          isMatched: false,
          row,
          col
        }
        symbolIndex++
      }
    }
  }
  
  selectedCells.value = []
  clearHints()
}

// 显示提示
const showHint = () => {
  if (hintCount.value <= 0) return
  
  hintCount.value--
  clearHints()
  
  // 寻找可以匹配的一对
  for (let row1 = 0; row1 < rows; row1++) {
    for (let col1 = 0; col1 < cols; col1++) {
      const cell1 = board.value[row1][col1]
      if (cell1.isEmpty) continue
      
      for (let row2 = row1; row2 < rows; row2++) {
        for (let col2 = (row2 === row1 ? col1 + 1 : 0); col2 < cols; col2++) {
          const cell2 = board.value[row2][col2]
          if (cell2.isEmpty || cell1.symbol !== cell2.symbol) continue
          
          if (findPath(cell1, cell2)) {
            cell1.isHint = true
            cell2.isHint = true
            
            setTimeout(() => {
              clearHints()
            }, 2000)
            
            return
          }
        }
      }
    }
  }
}

// 清除提示
const clearHints = () => {
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      board.value[row][col].isHint = false
    }
  }
}

// 组件挂载
onMounted(() => {
  newGame()
  
  nextTick(() => {
    if (gameBoard.value) {
      boardWidth.value = gameBoard.value.offsetWidth
      boardHeight.value = gameBoard.value.offsetHeight
    }
  })
})

// 组件卸载
// 生命周期钩子
onMounted(() => {
  newGame()
})

onUnmounted(() => {
  if (gameTimer) clearInterval(gameTimer)
})
</script>

<style scoped>
.link-game {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  font-family: 'Arial', sans-serif;
  user-select: none;
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 800px;
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
  font-size: 18px;
  font-weight: bold;
  color: #2d3436;
}

.game-controls {
  display: flex;
  gap: 10px;
}

.new-game-btn, .shuffle-btn, .hint-btn, .continue-btn {
  padding: 10px 15px;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;
}

.new-game-btn, .continue-btn {
  background: linear-gradient(45deg, #00b894, #00a085);
  color: white;
}

.shuffle-btn {
  background: linear-gradient(45deg, #fdcb6e, #e17055);
  color: white;
}

.hint-btn {
  background: linear-gradient(45deg, #74b9ff, #0984e3);
  color: white;
}

.new-game-btn:hover, .continue-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 184, 148, 0.4);
}

.shuffle-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(253, 203, 110, 0.4);
}

.hint-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(116, 185, 255, 0.4);
}

.shuffle-btn:disabled, .hint-btn:disabled {
  background: #ddd;
  color: #999;
  cursor: not-allowed;
}

.game-container {
  position: relative;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  padding: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);
}

.game-board {
  position: relative;
  display: inline-block;
}

.board-row {
  display: flex;
}

.board-cell {
  width: 40px;
  height: 40px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.board-cell.empty {
  background: transparent;
  cursor: default;
}

.board-cell:not(.empty) {
  background: rgba(255, 255, 255, 0.8);
}

.board-cell:not(.empty):hover {
  background: rgba(255, 255, 255, 0.9);
  transform: scale(1.05);
}

.board-cell.selected {
  background: rgba(76, 175, 80, 0.8) !important;
  transform: scale(1.1);
  box-shadow: 0 0 10px rgba(76, 175, 80, 0.6);
}

.board-cell.hint {
  background: rgba(255, 193, 7, 0.8) !important;
  animation: pulse 1s infinite;
}

.board-cell.matched {
  background: rgba(244, 67, 54, 0.8) !important;
  animation: fadeOut 0.8s ease-out forwards;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

@keyframes fadeOut {
  0% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.2); }
  100% { opacity: 0; transform: scale(0); }
}

.cell-content {
  font-size: 24px;
  font-weight: bold;
}

.connection-lines {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 10;
}

.connection-line {
  animation: drawLine 0.5s ease-out;
}

@keyframes drawLine {
  0% { stroke-dasharray: 1000; stroke-dashoffset: 1000; }
  100% { stroke-dasharray: 1000; stroke-dashoffset: 0; }
}

.game-instructions {
  margin-top: 20px;
  max-width: 800px;
  background: rgba(255, 255, 255, 0.1);
  padding: 20px;
  border-radius: 15px;
  backdrop-filter: blur(10px);
}

.instruction-section {
  margin-bottom: 20px;
}

.instruction-section h3 {
  color: white;
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
  color: white;
  font-size: 14px;
  line-height: 1.4;
  backdrop-filter: blur(5px);
}

.rule-item strong {
  color: #FFD700;
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
  color: white;
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

@media (max-width: 900px) {
  .game-header {
    flex-direction: column;
    gap: 15px;
  }
  
  .score-container {
    justify-content: center;
  }
  
  .board-cell {
    width: 35px;
    height: 35px;
  }
  
  .cell-content {
    font-size: 20px;
  }
  
  .game-instructions {
    margin: 15px;
    padding: 15px;
  }
  
  .rule-item {
    font-size: 12px;
    padding: 8px;
  }
}

@media (max-width: 600px) {
  .board-cell {
    width: 30px;
    height: 30px;
  }
  
  .cell-content {
    font-size: 16px;
  }
  
  .game-controls {
    flex-direction: column;
    gap: 8px;
  }
  
  .new-game-btn, .shuffle-btn, .hint-btn {
    padding: 8px 12px;
    font-size: 12px;
  }
}
</style>

