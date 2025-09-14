<template>
  <div class="sudoku-game">
    <div class="game-header">
      <h1>🧩 数独游戏</h1>
      <div class="game-stats">
        <div class="stat-item">
          <span class="stat-label">难度</span>
          <span class="stat-value">{{ difficultyName }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">已填入</span>
          <span class="stat-value">{{ filledCells }}/81</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">错误</span>
          <span class="stat-value">{{ mistakes }}/{{ maxMistakes }}</span>
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
            <span class="rule-icon">🔢</span>
            <div class="rule-text">
              <strong>填入数字</strong>
              <p>在9×9网格中填入1-9的数字</p>
            </div>
          </div>
          <div class="rule-item">
            <span class="rule-icon">📏</span>
            <div class="rule-text">
              <strong>行列规则</strong>
              <p>每行每列都必须包含1-9所有数字</p>
            </div>
          </div>
          <div class="rule-item">
            <span class="rule-icon">⬜</span>
            <div class="rule-text">
              <strong>九宫格规则</strong>
              <p>每个3×3小方格也必须包含1-9所有数字</p>
            </div>
          </div>
          <div class="rule-item">
            <span class="rule-icon">🧠</span>
            <div class="rule-text">
              <strong>逻辑推理</strong>
              <p>运用逻辑推理找出唯一解</p>
            </div>
          </div>
        </div>
        
        <h3>🎲 难度选择</h3>
        <div class="difficulty-grid">
          <div class="difficulty-item">
            <strong>简单</strong>：45-50个提示数字
          </div>
          <div class="difficulty-item">
            <strong>中等</strong>：35-40个提示数字
          </div>
          <div class="difficulty-item">
            <strong>困难</strong>：25-30个提示数字
          </div>
          <div class="difficulty-item">
            <strong>专家</strong>：17-22个提示数字
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
              <span>{{ diff.clues }}个提示</span>
              <span>{{ diff.maxMistakes }}次容错</span>
            </div>
          </button>
        </div>
      </div>

      <!-- 游戏进行中 -->
      <div v-if="gameState === 'playing'" class="game-playing">
        <div class="sudoku-board">
          <div
            v-for="(cell, index) in sudokuGrid"
            :key="index"
            :class="[
              'sudoku-cell',
              cell.isGiven ? 'given' : 'user-input',
              cell.isSelected ? 'selected' : '',
              cell.isHighlighted ? 'highlighted' : '',
              cell.isError ? 'error' : '',
              cell.isConflict ? 'conflict' : '',
              `region-${getRegion(index)}`
            ]"
            @click="selectCell(index)"
          >
            <div class="cell-content">
              <span v-if="cell.value" class="cell-number">{{ cell.value }}</span>
              <div v-else-if="cell.notes.length > 0 && showNotes" class="cell-notes">
                <span
                  v-for="note in cell.notes"
                  :key="note"
                  class="note-number"
                >
                  {{ note }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="number-pad">
          <button
            v-for="num in [1, 2, 3, 4, 5, 6, 7, 8, 9]"
            :key="num"
            @click="inputNumber(num)"
            class="number-btn"
            :class="{ active: selectedNumber === num }"
          >
            {{ num }}
          </button>
          <button @click="clearCell" class="clear-btn">清除</button>
        </div>

        <div class="game-controls">
          <div class="control-group">
            <button @click="toggleNotes" class="notes-btn" :class="{ active: notesMode }">
              📝 笔记模式
            </button>
            <button @click="toggleShowNotes" class="show-notes-btn" :class="{ active: showNotes }">
              👁️ 显示笔记
            </button>
          </div>
          
          <div class="control-group">
            <button @click="getHint" class="hint-btn" :disabled="hintsUsed >= maxHints">
              💡 提示 ({{ hintsUsed }}/{{ maxHints }})
            </button>
            <button @click="checkErrors" class="check-btn">
              ✅ 检查错误
            </button>
          </div>
          
          <div class="control-group">
            <button @click="undoMove" class="undo-btn" :disabled="moveHistory.length === 0">
              ↶ 撤销
            </button>
            <button @click="redoMove" class="redo-btn" :disabled="redoHistory.length === 0">
              ↷ 重做
            </button>
          </div>
          
          <div class="control-group">
            <button @click="pauseGame" class="pause-btn" v-if="!isPaused">
              ⏸️ 暂停
            </button>
            <button @click="resumeGame" class="resume-btn" v-if="isPaused">
              ▶️ 继续
            </button>
            <button @click="resetGame" class="reset-btn">🏠 重新开始</button>
          </div>
        </div>

        <div class="progress-section">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
          </div>
          <div class="progress-text">
            进度: {{ filledCells }}/81 ({{ Math.round(progressPercentage) }}%)
          </div>
        </div>
      </div>

      <!-- 暂停界面 -->
      <div v-if="isPaused" class="pause-overlay">
        <div class="pause-content">
          <h2>⏸️ 游戏已暂停</h2>
          <p>点击继续按钮恢复游戏</p>
          <button @click="resumeGame" class="resume-btn-large">▶️ 继续游戏</button>
        </div>
      </div>

      <!-- 游戏结束 -->
      <div v-if="gameState === 'won'" class="game-result win-result">
        <div class="result-content">
          <h2>🎉 恭喜完成数独！</h2>
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
              <span class="result-label">错误次数</span>
              <span class="result-value">{{ mistakes }}</span>
            </div>
            <div class="result-item">
              <span class="result-label">使用提示</span>
              <span class="result-value">{{ hintsUsed }}</span>
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
          <h2>😔 游戏结束</h2>
          <p>错误次数已达上限</p>
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
              <span class="result-label">已完成</span>
              <span class="result-value">{{ Math.round(progressPercentage) }}%</span>
            </div>
          </div>
          <div class="result-buttons">
            <button @click="resetCurrentGame" class="play-again-btn">重试</button>
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
const mistakes = ref(0)
const hintsUsed = ref(0)
const maxHints = ref(3)
const startTime = ref(0)
const elapsedTime = ref(0)
const isPaused = ref(false)
const pausedTime = ref(0)

// 数独相关状态
const selectedCell = ref(-1)
const selectedNumber = ref(0)
const notesMode = ref(false)
const showNotes = ref(true)
const moveHistory = ref<Array<{
  index: number
  oldValue: number
  newValue: number
  oldNotes: number[]
  newNotes: number[]
}>>([])
const redoHistory = ref<Array<{
  index: number
  oldValue: number
  newValue: number
  oldNotes: number[]
  newNotes: number[]
}>>([])

// 格子接口
interface SudokuCell {
  value: number
  isGiven: boolean
  isSelected: boolean
  isHighlighted: boolean
  isError: boolean
  isConflict: boolean
  notes: number[]
}

// 游戏数据
const sudokuGrid = ref<SudokuCell[]>([])
const solution = ref<number[]>([])
const currentDifficulty = ref({ name: '中等', clues: 40, maxMistakes: 3 })

// 难度配置
const difficulties = [
  { name: '简单', clues: 50, maxMistakes: 5 },
  { name: '中等', clues: 40, maxMistakes: 3 },
  { name: '困难', clues: 30, maxMistakes: 2 },
  { name: '专家', clues: 22, maxMistakes: 1 }
]

// 计算属性
const difficultyName = computed(() => currentDifficulty.value.name)
const maxMistakes = computed(() => currentDifficulty.value.maxMistakes)
const filledCells = computed(() => sudokuGrid.value.filter(cell => cell.value > 0).length)
const progressPercentage = computed(() => (filledCells.value / 81) * 100)

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
const playInputSound = () => playSound(400, 0.1, 'square')
const playErrorSound = () => playSound(200, 0.3, 'sawtooth')
const playSuccessSound = () => playSound(600, 0.2, 'sine')
const playWinSound = () => {
  playSound(523, 0.2, 'sine')
  setTimeout(() => playSound(659, 0.2, 'sine'), 100)
  setTimeout(() => playSound(784, 0.2, 'sine'), 200)
  setTimeout(() => playSound(1047, 0.3, 'sine'), 300)
}

// 格式化时间
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 获取区域索引（0-8）
const getRegion = (index: number): number => {
  const row = Math.floor(index / 9)
  const col = index % 9
  return Math.floor(row / 3) * 3 + Math.floor(col / 3)
}

// 获取行索引
const getRow = (index: number): number => Math.floor(index / 9)

// 获取列索引
const getCol = (index: number): number => index % 9

// 检查数字是否在行中重复
const isInRow = (grid: number[], row: number, num: number): boolean => {
  for (let col = 0; col < 9; col++) {
    if (grid[row * 9 + col] === num) return true
  }
  return false
}

// 检查数字是否在列中重复
const isInCol = (grid: number[], col: number, num: number): boolean => {
  for (let row = 0; row < 9; row++) {
    if (grid[row * 9 + col] === num) return true
  }
  return false
}

// 检查数字是否在3x3区域中重复
const isInRegion = (grid: number[], startRow: number, startCol: number, num: number): boolean => {
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      if (grid[(startRow + row) * 9 + (startCol + col)] === num) return true
    }
  }
  return false
}

// 检查数字放置是否安全
const isSafe = (grid: number[], index: number, num: number): boolean => {
  const row = Math.floor(index / 9)
  const col = index % 9
  
  return !isInRow(grid, row, num) &&
         !isInCol(grid, col, num) &&
         !isInRegion(grid, Math.floor(row / 3) * 3, Math.floor(col / 3) * 3, num)
}

// 解数独（回溯算法）
const solveSudoku = (grid: number[]): boolean => {
  for (let i = 0; i < 81; i++) {
    if (grid[i] === 0) {
      for (let num = 1; num <= 9; num++) {
        if (isSafe(grid, i, num)) {
          grid[i] = num
          if (solveSudoku(grid)) return true
          grid[i] = 0
        }
      }
      return false
    }
  }
  return true
}

// 生成完整的数独解
const generateSolution = (): number[] => {
  const grid = new Array(81).fill(0)
  
  // 填充对角线的3x3方格
  for (let i = 0; i < 9; i += 3) {
    fillRegion(grid, i, i)
  }
  
  // 解决剩余的格子
  solveSudoku(grid)
  
  return grid
}

// 填充3x3区域
const fillRegion = (grid: number[], row: number, col: number) => {
  const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9]
  
  // 打乱数字顺序
  for (let i = nums.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[nums[i], nums[j]] = [nums[j], nums[i]]
  }
  
  let numIndex = 0
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      grid[(row + r) * 9 + (col + c)] = nums[numIndex++]
    }
  }
}

// 生成数独谜题
const generatePuzzle = (clues: number): { puzzle: number[], solution: number[] } => {
  const solutionGrid = generateSolution()
  const puzzleGrid = [...solutionGrid]
  
  // 随机移除数字直到达到指定的提示数量
  const positions = Array.from({ length: 81 }, (_, i) => i)
  
  // 打乱位置
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[positions[i], positions[j]] = [positions[j], positions[i]]
  }
  
  // 移除数字
  const toRemove = 81 - clues
  for (let i = 0; i < toRemove; i++) {
    puzzleGrid[positions[i]] = 0
  }
  
  return { puzzle: puzzleGrid, solution: solutionGrid }
}

// 开始游戏
const startGame = (difficulty: typeof difficulties[0]) => {
  initAudio()
  gameState.value = 'playing'
  currentDifficulty.value = difficulty
  mistakes.value = 0
  hintsUsed.value = 0
  selectedCell.value = -1
  selectedNumber.value = 0
  notesMode.value = false
  moveHistory.value = []
  redoHistory.value = []
  startTime.value = Date.now()
  elapsedTime.value = 0
  isPaused.value = false
  
  // 生成数独谜题
  const { puzzle, solution: sol } = generatePuzzle(difficulty.clues)
  solution.value = sol
  
  // 初始化网格
  sudokuGrid.value = puzzle.map((value, index) => ({
    value,
    isGiven: value > 0,
    isSelected: false,
    isHighlighted: false,
    isError: false,
    isConflict: false,
    notes: []
  }))
  
  startTimer()
}

// 开始计时器
const startTimer = () => {
  if (gameTimer) clearInterval(gameTimer)
  
  gameTimer = setInterval(() => {
    if (!isPaused.value) {
      elapsedTime.value = Math.floor((Date.now() - startTime.value - pausedTime.value) / 1000)
    }
  }, 1000)
}

// 停止计时器
const stopTimer = () => {
  if (gameTimer) {
    clearInterval(gameTimer)
    gameTimer = null
  }
}

// 暂停游戏
const pauseGame = () => {
  isPaused.value = true
  pausedTime.value += Date.now() - startTime.value - elapsedTime.value * 1000
}

// 恢复游戏
const resumeGame = () => {
  isPaused.value = false
  startTime.value = Date.now() - elapsedTime.value * 1000
}

// 选择格子
const selectCell = (index: number) => {
  if (isPaused.value || gameState.value !== 'playing') return
  
  // 清除之前的高亮
  sudokuGrid.value.forEach(cell => {
    cell.isSelected = false
    cell.isHighlighted = false
  })
  
  selectedCell.value = index
  const cell = sudokuGrid.value[index]
  cell.isSelected = true
  
  // 高亮相关格子
  const row = getRow(index)
  const col = getCol(index)
  const region = getRegion(index)
  
  sudokuGrid.value.forEach((c, i) => {
    if (getRow(i) === row || getCol(i) === col || getRegion(i) === region) {
      c.isHighlighted = true
    }
    // 高亮相同数字
    if (cell.value > 0 && c.value === cell.value) {
      c.isHighlighted = true
    }
  })
}

// 输入数字
const inputNumber = (num: number) => {
  if (isPaused.value || selectedCell.value === -1 || gameState.value !== 'playing') return
  
  const cell = sudokuGrid.value[selectedCell.value]
  if (cell.isGiven) return
  
  selectedNumber.value = num
  
  if (notesMode.value) {
    // 笔记模式
    const noteIndex = cell.notes.indexOf(num)
    if (noteIndex > -1) {
      cell.notes.splice(noteIndex, 1)
    } else {
      cell.notes.push(num)
      cell.notes.sort()
    }
  } else {
    // 正常输入模式
    const oldValue = cell.value
    const oldNotes = [...cell.notes]
    
    // 记录移动历史
    moveHistory.value.push({
      index: selectedCell.value,
      oldValue,
      newValue: num,
      oldNotes,
      newNotes: []
    })
    redoHistory.value = []
    
    cell.value = num
    cell.notes = []
    
    playInputSound()
    
    // 检查是否正确
    if (solution.value[selectedCell.value] !== num) {
      mistakes.value++
      cell.isError = true
      playErrorSound()
      
      setTimeout(() => {
        cell.isError = false
      }, 1000)
      
      if (mistakes.value >= maxMistakes.value) {
        gameState.value = 'lost'
        stopTimer()
        return
      }
    } else {
      playSuccessSound()
    }
    
    // 检查是否完成
    if (filledCells.value === 81 && checkSolution()) {
      gameState.value = 'won'
      stopTimer()
      calculateScore()
      playWinSound()
    }
  }
  
  // 更新冲突高亮
  updateConflicts()
}

// 清除格子
const clearCell = () => {
  if (isPaused.value || selectedCell.value === -1 || gameState.value !== 'playing') return
  
  const cell = sudokuGrid.value[selectedCell.value]
  if (cell.isGiven) return
  
  const oldValue = cell.value
  const oldNotes = [...cell.notes]
  
  if (oldValue > 0 || oldNotes.length > 0) {
    // 记录移动历史
    moveHistory.value.push({
      index: selectedCell.value,
      oldValue,
      newValue: 0,
      oldNotes,
      newNotes: []
    })
    redoHistory.value = []
    
    cell.value = 0
    cell.notes = []
    
    updateConflicts()
  }
}

// 更新冲突高亮
const updateConflicts = () => {
  sudokuGrid.value.forEach((cell, index) => {
    cell.isConflict = false
    
    if (cell.value > 0) {
      const row = getRow(index)
      const col = getCol(index)
      const region = getRegion(index)
      
      // 检查行冲突
      for (let c = 0; c < 9; c++) {
        const otherIndex = row * 9 + c
        if (otherIndex !== index && sudokuGrid.value[otherIndex].value === cell.value) {
          cell.isConflict = true
          sudokuGrid.value[otherIndex].isConflict = true
        }
      }
      
      // 检查列冲突
      for (let r = 0; r < 9; r++) {
        const otherIndex = r * 9 + col
        if (otherIndex !== index && sudokuGrid.value[otherIndex].value === cell.value) {
          cell.isConflict = true
          sudokuGrid.value[otherIndex].isConflict = true
        }
      }
      
      // 检查区域冲突
      const startRow = Math.floor(row / 3) * 3
      const startCol = Math.floor(col / 3) * 3
      for (let r = startRow; r < startRow + 3; r++) {
        for (let c = startCol; c < startCol + 3; c++) {
          const otherIndex = r * 9 + c
          if (otherIndex !== index && sudokuGrid.value[otherIndex].value === cell.value) {
            cell.isConflict = true
            sudokuGrid.value[otherIndex].isConflict = true
          }
        }
      }
    }
  })
}

// 切换笔记模式
const toggleNotes = () => {
  notesMode.value = !notesMode.value
}

// 切换显示笔记
const toggleShowNotes = () => {
  showNotes.value = !showNotes.value
}

// 获取提示
const getHint = () => {
  if (hintsUsed.value >= maxHints.value || selectedCell.value === -1 || gameState.value !== 'playing') return
  
  const cell = sudokuGrid.value[selectedCell.value]
  if (cell.isGiven || cell.value > 0) return
  
  hintsUsed.value++
  
  const correctValue = solution.value[selectedCell.value]
  
  // 记录移动历史
  moveHistory.value.push({
    index: selectedCell.value,
    oldValue: cell.value,
    newValue: correctValue,
    oldNotes: [...cell.notes],
    newNotes: []
  })
  redoHistory.value = []
  
  cell.value = correctValue
  cell.notes = []
  
  playSuccessSound()
  
  // 检查是否完成
  if (filledCells.value === 81 && checkSolution()) {
    gameState.value = 'won'
    stopTimer()
    calculateScore()
    playWinSound()
  }
  
  updateConflicts()
}

// 检查错误
const checkErrors = () => {
  updateConflicts()
  
  let hasErrors = false
  sudokuGrid.value.forEach(cell => {
    if (cell.isConflict) {
      hasErrors = true
      cell.isError = true
      setTimeout(() => {
        cell.isError = false
      }, 2000)
    }
  })
  
  if (hasErrors) {
    playErrorSound()
  } else {
    playSuccessSound()
  }
}

// 撤销移动
const undoMove = () => {
  if (moveHistory.value.length === 0) return
  
  const move = moveHistory.value.pop()!
  const cell = sudokuGrid.value[move.index]
  
  redoHistory.value.push({
    index: move.index,
    oldValue: move.newValue,
    newValue: move.oldValue,
    oldNotes: [...move.newNotes],
    newNotes: [...move.oldNotes]
  })
  
  cell.value = move.oldValue
  cell.notes = [...move.oldNotes]
  
  updateConflicts()
}

// 重做移动
const redoMove = () => {
  if (redoHistory.value.length === 0) return
  
  const move = redoHistory.value.pop()!
  const cell = sudokuGrid.value[move.index]
  
  moveHistory.value.push({
    index: move.index,
    oldValue: move.newValue,
    newValue: move.oldValue,
    oldNotes: [...move.newNotes],
    newNotes: [...move.oldNotes]
  })
  
  cell.value = move.oldValue
  cell.notes = [...move.oldNotes]
  
  updateConflicts()
}

// 检查解答是否正确
const checkSolution = (): boolean => {
  for (let i = 0; i < 81; i++) {
    if (sudokuGrid.value[i].value !== solution.value[i]) {
      return false
    }
  }
  return true
}

// 计算得分
const calculateScore = () => {
  const baseScore = 1000
  const timeBonus = Math.max(0, 1800 - elapsedTime.value) * 2
  const mistakesPenalty = mistakes.value * 100
  const hintsPenalty = hintsUsed.value * 50
  const difficultyMultiplier = currentDifficulty.value.clues <= 25 ? 2 : currentDifficulty.value.clues <= 35 ? 1.5 : 1
  
  score.value = Math.floor((baseScore + timeBonus - mistakesPenalty - hintsPenalty) * difficultyMultiplier)
}

// 获取评级
const getRating = () => {
  if (mistakes.value === 0 && hintsUsed.value === 0) return '🏆 完美'
  if (mistakes.value <= 1 && hintsUsed.value <= 1) return '🥇 优秀'
  if (mistakes.value <= 2 && hintsUsed.value <= 2) return '🥈 良好'
  if (mistakes.value <= 3 && hintsUsed.value <= 3) return '🥉 及格'
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
.sudoku-game {
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

.difficulty-btn.简单 { border-color: #4CAF50; }
.difficulty-btn.中等 { border-color: #FF9800; }
.difficulty-btn.困难 { border-color: #F44336; }
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

.sudoku-board {
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  gap: 1px;
  background: #333;
  padding: 2px;
  border-radius: 10px;
  margin: 20px auto;
  width: 450px;
  height: 450px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.sudoku-cell {
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 20px;
  font-weight: bold;
  transition: all 0.2s ease;
  position: relative;
}

.sudoku-cell:nth-child(3n):not(:nth-child(9n)) {
  border-right: 2px solid #333;
}

.sudoku-cell:nth-child(n+19):nth-child(-n+27),
.sudoku-cell:nth-child(n+46):nth-child(-n+54) {
  border-bottom: 2px solid #333;
}

.sudoku-cell.given {
  background: #f0f0f0;
  color: #000;
  font-weight: bold;
}

.sudoku-cell.user-input {
  background: #fff;
  color: #2196F3;
}

.sudoku-cell.selected {
  background: #2196F3 !important;
  color: white;
}

.sudoku-cell.highlighted {
  background: #E3F2FD;
}

.sudoku-cell.error {
  background: #ffebee !important;
  color: #f44336;
  animation: shake 0.5s ease-in-out;
}

.sudoku-cell.conflict {
  background: #fff3e0 !important;
  color: #ff9800;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-2px); }
  75% { transform: translateX(2px); }
}

.cell-content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.cell-number {
  font-size: 24px;
  font-weight: bold;
}

.cell-notes {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  width: 100%;
  height: 100%;
  padding: 2px;
}

.note-number {
  font-size: 10px;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
}

.number-pad {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
  margin: 20px auto;
  max-width: 400px;
}

.number-btn,
.clear-btn {
  padding: 15px;
  font-size: 18px;
  font-weight: bold;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  backdrop-filter: blur(10px);
}

.number-btn:hover,
.clear-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.number-btn.active {
  background: #2196F3;
  color: white;
}

.clear-btn {
  grid-column: span 2;
  background: linear-gradient(135deg, #f44336, #d32f2f);
}

.game-controls {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin: 20px 0;
}

.control-group {
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
}

.notes-btn,
.show-notes-btn,
.hint-btn,
.check-btn,
.undo-btn,
.redo-btn,
.pause-btn,
.resume-btn,
.reset-btn {
  padding: 10px 15px;
  border: none;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.notes-btn,
.show-notes-btn {
  background: linear-gradient(135deg, #9C27B0, #7B1FA2);
}

.notes-btn.active,
.show-notes-btn.active {
  background: linear-gradient(135deg, #7B1FA2, #9C27B0);
}

.hint-btn {
  background: linear-gradient(135deg, #FF9800, #F57C00);
}

.check-btn {
  background: linear-gradient(135deg, #4CAF50, #45a049);
}

.undo-btn,
.redo-btn {
  background: linear-gradient(135deg, #607D8B, #455A64);
}

.pause-btn,
.resume-btn {
  background: linear-gradient(135deg, #2196F3, #1976D2);
}

.reset-btn {
  background: linear-gradient(135deg, #9E9E9E, #757575);
}

.notes-btn:hover,
.show-notes-btn:hover,
.hint-btn:hover:not(:disabled),
.check-btn:hover,
.undo-btn:hover:not(:disabled),
.redo-btn:hover:not(:disabled),
.pause-btn:hover,
.resume-btn:hover,
.reset-btn:hover {
  transform: translateY(-2px);
}

.hint-btn:disabled,
.undo-btn:disabled,
.redo-btn:disabled {
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

.pause-overlay {
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

.pause-content {
  background: rgba(255, 255, 255, 0.2);
  padding: 40px;
  border-radius: 20px;
  text-align: center;
  backdrop-filter: blur(15px);
  color: white;
}

.pause-content h2 {
  font-size: 2rem;
  margin-bottom: 20px;
}

.resume-btn-large {
  padding: 15px 30px;
  font-size: 1.2rem;
  background: linear-gradient(135deg, #4CAF50, #45a049);
  border: none;
  border-radius: 10px;
  color: white;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.3s ease;
}

.resume-btn-large:hover {
  transform: translateY(-2px);
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
  .sudoku-game {
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
  
  .sudoku-board {
    width: 320px;
    height: 320px;
  }
  
  .cell-number {
    font-size: 18px;
  }
  
  .number-pad {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .control-group {
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
  .sudoku-board {
    width: 280px;
    height: 280px;
  }
  
  .cell-number {
    font-size: 16px;
  }
  
  .note-number {
    font-size: 8px;
  }
}
</style>