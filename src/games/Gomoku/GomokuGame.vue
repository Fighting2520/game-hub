<template>
  <div class="gomoku-game">
    <div class="game-container">
      <!-- 游戏标题 -->
      <div class="game-header">
        <h2>🔴⚫ 五子棋</h2>
        <div class="game-info">
          <div class="mode-display">
            {{ gameMode === 'ai' ? 'AI对战' : '双人对战' }}
            <span v-if="gameMode === 'ai'" class="difficulty">({{ aiDifficulty }})</span>
          </div>
          <div class="turn-display">
            当前回合: <span :class="{ black: currentPlayer === 'black', white: currentPlayer === 'white' }">
              {{ currentPlayer === 'black' ? '⚫ 黑棋' : '⚪ 白棋' }}
            </span>
          </div>
        </div>
      </div>

      <!-- 游戏控制 -->
      <div class="game-controls">
        <div class="control-group">
          <button @click="showModeSelect = true" class="mode-btn">
            🎮 游戏模式
          </button>
          <button @click="undoMove" class="undo-btn" :disabled="!canUndo">
            ↶ 悔棋
          </button>
          <button @click="resetGame" class="reset-btn">
            🔄 重新开始
          </button>
        </div>
        
        <div class="game-stats">
          <div class="stat-item">
            <span class="stat-label">步数:</span>
            <span class="stat-value">{{ moveCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">用时:</span>
            <span class="stat-value">{{ formatTime(gameTime) }}</span>
          </div>
        </div>
      </div>

      <!-- 游戏棋盘 -->
      <div class="board-container">
        <div class="board" ref="boardRef">
          <!-- 棋盘网格 -->
          <svg class="board-grid" :width="boardSize" :height="boardSize" viewBox="0 0 450 450">
            <!-- 网格线 -->
            <defs>
              <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#8B4513" stroke-width="1"/>
              </pattern>
            </defs>
            <rect width="450" height="450" fill="url(#grid)"/>
            
            <!-- 边框 -->
            <rect x="15" y="15" width="420" height="420" fill="none" stroke="#654321" stroke-width="2"/>
            
            <!-- 天元和星位 -->
            <circle cx="225" cy="225" r="3" fill="#654321"/>
            <circle cx="105" cy="105" r="2" fill="#654321"/>
            <circle cx="345" cy="105" r="2" fill="#654321"/>
            <circle cx="105" cy="345" r="2" fill="#654321"/>
            <circle cx="345" cy="345" r="2" fill="#654321"/>
          </svg>

          <!-- 棋子 -->
          <div class="pieces">
            <div
              v-for="(piece, index) in pieces"
              :key="index"
              class="piece"
              :class="{ black: piece.color === 'black', white: piece.color === 'white', latest: piece.isLatest }"
              :style="{ 
                left: (piece.x * 30 + 15) + 'px', 
                top: (piece.y * 30 + 15) + 'px' 
              }"
            >
              <div class="piece-inner">
                <span v-if="piece.isLatest" class="move-number">{{ piece.moveNumber }}</span>
              </div>
            </div>
          </div>

          <!-- 点击区域 -->
          <div class="click-areas">
            <div
              v-for="y in 15"
              :key="'row-' + y"
              class="board-row"
            >
              <div
                v-for="x in 15"
                :key="'cell-' + x + '-' + y"
                class="board-cell"
                :class="{ 
                  hover: hoveredCell.x === x-1 && hoveredCell.y === y-1,
                  disabled: gameState !== 'playing' || (gameMode === 'ai' && currentPlayer === 'white')
                }"
                @click="makeMove(x-1, y-1)"
                @mouseenter="hoveredCell = { x: x-1, y: y-1 }"
                @mouseleave="hoveredCell = { x: -1, y: -1 }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 游戏状态 -->
      <div v-if="gameState !== 'playing'" class="game-result">
        <div class="result-content">
          <h3 v-if="gameState === 'won'">
            🎉 {{ winner === 'black' ? '⚫ 黑棋' : '⚪ 白棋' }} 获胜！
          </h3>
          <h3 v-else-if="gameState === 'draw'">
            🤝 平局！
          </h3>
          <div class="result-stats">
            <p>总步数: {{ moveCount }}</p>
            <p>用时: {{ formatTime(gameTime) }}</p>
            <p v-if="gameMode === 'ai'">AI难度: {{ aiDifficulty }}</p>
          </div>
          <button @click="resetGame" class="play-again-btn">
            🔄 再来一局
          </button>
        </div>
      </div>

      <!-- 模式选择弹窗 -->
      <div v-if="showModeSelect" class="modal-overlay" @click="showModeSelect = false">
        <div class="modal-content" @click.stop>
          <h3>选择游戏模式</h3>
          
          <div class="mode-options">
            <div class="mode-option" @click="setGameMode('pvp')">
              <div class="mode-icon">👥</div>
              <div class="mode-info">
                <h4>双人对战</h4>
                <p>两个玩家轮流下棋</p>
              </div>
            </div>
            
            <div class="mode-option" @click="setGameMode('ai')">
              <div class="mode-icon">🤖</div>
              <div class="mode-info">
                <h4>AI对战</h4>
                <p>与电脑AI对战</p>
              </div>
            </div>
          </div>

          <div v-if="tempGameMode === 'ai'" class="difficulty-select">
            <h4>选择AI难度</h4>
            <div class="difficulty-options">
              <button 
                v-for="diff in difficulties" 
                :key="diff.name"
                @click="tempAiDifficulty = diff.name"
                :class="{ active: tempAiDifficulty === diff.name }"
                class="difficulty-btn"
              >
                {{ diff.name }}
                <small>{{ diff.description }}</small>
              </button>
            </div>
          </div>

          <div class="modal-actions">
            <button @click="showModeSelect = false" class="cancel-btn">取消</button>
            <button @click="confirmModeSelect" class="confirm-btn">确认</button>
          </div>
        </div>
      </div>

      <!-- 游戏说明 -->
      <div class="game-instructions">
        <h4>🎯 游戏规则</h4>
        <ul>
          <li>在15×15的棋盘上，黑棋先行</li>
          <li>轮流在交叉点上放置棋子</li>
          <li>率先在横、竖、斜任一方向连成五子者获胜</li>
          <li>支持悔棋功能，但AI对战中悔棋会同时撤销AI的上一步</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'

// 游戏状态类型
type GameState = 'playing' | 'won' | 'draw'
type Player = 'black' | 'white'
type GameMode = 'pvp' | 'ai'

// 棋子接口
interface Piece {
  x: number
  y: number
  color: Player
  moveNumber: number
  isLatest: boolean
}

// 移动历史接口
interface Move {
  x: number
  y: number
  color: Player
  moveNumber: number
}

// AI难度配置
interface Difficulty {
  name: string
  description: string
  depth: number
  randomness: number
}

// 游戏数据
const gameState = ref<GameState>('playing')
const currentPlayer = ref<Player>('black')
const gameMode = ref<GameMode>('pvp')
const aiDifficulty = ref('中等')
const winner = ref<Player | null>(null)
const moveCount = ref(0)
const gameTime = ref(0)
const boardSize = ref(450)

// 棋盘和棋子
const board = ref<(Player | null)[][]>(Array(15).fill(null).map(() => Array(15).fill(null)))
const pieces = ref<Piece[]>([])
const moveHistory = ref<Move[]>([])
const hoveredCell = ref({ x: -1, y: -1 })

// UI状态
const showModeSelect = ref(false)
const tempGameMode = ref<GameMode>('pvp')
const tempAiDifficulty = ref('中等')
const boardRef = ref<HTMLElement>()

// 计算属性
const canUndo = computed(() => moveHistory.value.length > 0 && gameState.value === 'playing')

// AI难度配置
const difficulties: Difficulty[] = [
  { name: '简单', description: '随机下棋', depth: 1, randomness: 0.7 },
  { name: '中等', description: '基础策略', depth: 3, randomness: 0.3 },
  { name: '困难', description: '高级AI', depth: 5, randomness: 0.1 }
]

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

// 播放下棋音效
const playMoveSound = () => {
  playSound(800, 0.1, 'sine')
}

// 播放获胜音效
const playWinSound = () => {
  playSound(523, 0.2, 'sine')
  setTimeout(() => playSound(659, 0.2, 'sine'), 200)
  setTimeout(() => playSound(784, 0.3, 'sine'), 400)
}

// 开始计时
const startTimer = () => {
  if (gameTimer) clearInterval(gameTimer)
  gameTimer = setInterval(() => {
    gameTime.value++
  }, 1000)
}

// 停止计时
const stopTimer = () => {
  if (gameTimer) {
    clearInterval(gameTimer)
    gameTimer = null
  }
}

// 格式化时间
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// 检查是否获胜
const checkWin = (x: number, y: number, color: Player): boolean => {
  const directions = [
    [1, 0],   // 水平
    [0, 1],   // 垂直
    [1, 1],   // 主对角线
    [1, -1]   // 副对角线
  ]

  for (const [dx, dy] of directions) {
    let count = 1 // 包含当前棋子

    // 向一个方向检查
    for (let i = 1; i < 5; i++) {
      const nx = x + dx * i
      const ny = y + dy * i
      if (nx < 0 || nx >= 15 || ny < 0 || ny >= 15 || board.value[ny][nx] !== color) {
        break
      }
      count++
    }

    // 向相反方向检查
    for (let i = 1; i < 5; i++) {
      const nx = x - dx * i
      const ny = y - dy * i
      if (nx < 0 || nx >= 15 || ny < 0 || ny >= 15 || board.value[ny][nx] !== color) {
        break
      }
      count++
    }

    if (count >= 5) {
      return true
    }
  }

  return false
}

// 检查是否平局
const checkDraw = (): boolean => {
  return pieces.value.length === 225 // 15x15 = 225
}

// 下棋
const makeMove = async (x: number, y: number, isAIMove: boolean = false) => {
  if (gameState.value !== 'playing' || board.value[y][x] !== null) return
  if (gameMode.value === 'ai' && currentPlayer.value === 'white' && !isAIMove) return

  // 放置棋子
  board.value[y][x] = currentPlayer.value
  moveCount.value++

  // 更新棋子显示
  pieces.value.forEach(piece => piece.isLatest = false)
  pieces.value.push({
    x,
    y,
    color: currentPlayer.value,
    moveNumber: moveCount.value,
    isLatest: true
  })

  // 记录移动历史
  moveHistory.value.push({
    x,
    y,
    color: currentPlayer.value,
    moveNumber: moveCount.value
  })

  playMoveSound()

  // 检查获胜
  if (checkWin(x, y, currentPlayer.value)) {
    gameState.value = 'won'
    winner.value = currentPlayer.value
    stopTimer()
    playWinSound()
    return
  }

  // 检查平局
  if (checkDraw()) {
    gameState.value = 'draw'
    stopTimer()
    return
  }

  // 切换玩家
  currentPlayer.value = currentPlayer.value === 'black' ? 'white' : 'black'

  // AI回合
  if (gameMode.value === 'ai' && currentPlayer.value === 'white') {
    console.log('触发AI回合', { gameMode: gameMode.value, currentPlayer: currentPlayer.value })
    await nextTick()
    setTimeout(() => {
      makeAIMove()
    }, 500) // 延迟500ms让AI思考
  }
}

// AI下棋
const makeAIMove = () => {
  console.log('AI开始思考...', { gameMode: gameMode.value, currentPlayer: currentPlayer.value })
  
  const difficulty = difficulties.find(d => d.name === aiDifficulty.value)!
  const move = getBestMove(difficulty)
  
  console.log('AI选择的位置:', move)
  
  if (move) {
    makeMove(move.x, move.y, true)
  } else {
    console.log('AI没有找到可用位置')
  }
}

// 获取最佳移动（AI算法）
const getBestMove = (difficulty: Difficulty): { x: number, y: number } | null => {
  const availableMoves = getAvailableMoves()
  console.log('可用位置数量:', availableMoves.length)
  
  if (availableMoves.length === 0) return null

  // 如果是第一步，AI下在中心附近
  if (pieces.value.length === 1) {
    const centerMoves = [
      { x: 7, y: 7 }, { x: 6, y: 7 }, { x: 8, y: 7 }, 
      { x: 7, y: 6 }, { x: 7, y: 8 }, { x: 6, y: 6 }, 
      { x: 8, y: 8 }, { x: 6, y: 8 }, { x: 8, y: 6 }
    ]
    for (const move of centerMoves) {
      if (board.value[move.y][move.x] === null) {
        return move
      }
    }
  }

  // 简单难度或随机选择
  if (difficulty.name === '简单' || Math.random() < difficulty.randomness) {
    return availableMoves[Math.floor(Math.random() * availableMoves.length)]
  }

  // 使用简化的策略算法
  let bestMove = availableMoves[0]
  let bestScore = -Infinity

  // 限制搜索范围以提高性能
  const searchMoves = availableMoves.slice(0, Math.min(15, availableMoves.length))
  
  for (const move of searchMoves) {
    board.value[move.y][move.x] = 'white'
    let score = 0
    
    // 简化评估：只检查直接威胁和机会
    if (checkWin(move.x, move.y, 'white')) {
      score = 10000 // 获胜
    } else {
      score = evaluatePosition(move.x, move.y, 'white')
      
      // 检查是否阻止对手获胜
      board.value[move.y][move.x] = 'black'
      if (checkWin(move.x, move.y, 'black')) {
        score += 5000 // 阻止对手获胜
      }
      board.value[move.y][move.x] = 'white'
    }
    
    board.value[move.y][move.x] = null

    if (score > bestScore) {
      bestScore = score
      bestMove = move
    }
  }

  return bestMove
}

// Minimax算法（带Alpha-Beta剪枝）
const minimax = (depth: number, isMaximizing: boolean, alpha: number, beta: number): number => {
  // 检查终止条件
  const evaluation = evaluateBoard()
  if (depth === 0 || Math.abs(evaluation) > 1000) {
    return evaluation
  }

  const availableMoves = getAvailableMoves()
  if (availableMoves.length === 0) return 0

  if (isMaximizing) {
    let maxEval = -Infinity
    for (const move of availableMoves.slice(0, Math.min(10, availableMoves.length))) {
      board.value[move.y][move.x] = 'white'
      const evaluation = minimax(depth - 1, false, alpha, beta)
      board.value[move.y][move.x] = null
      maxEval = Math.max(maxEval, evaluation)
      alpha = Math.max(alpha, evaluation)
      if (beta <= alpha) break // Alpha-Beta剪枝
    }
    return maxEval
  } else {
    let minEval = Infinity
    for (const move of availableMoves.slice(0, Math.min(10, availableMoves.length))) {
      board.value[move.y][move.x] = 'black'
      const evaluation = minimax(depth - 1, true, alpha, beta)
      board.value[move.y][move.x] = null
      minEval = Math.min(minEval, evaluation)
      beta = Math.min(beta, evaluation)
      if (beta <= alpha) break // Alpha-Beta剪枝
    }
    return minEval
  }
}

// 评估棋盘局势
const evaluateBoard = (): number => {
  let score = 0
  
  // 检查所有方向的连子情况
  for (let y = 0; y < 15; y++) {
    for (let x = 0; x < 15; x++) {
      if (board.value[y][x] !== null) {
        score += evaluatePosition(x, y, board.value[y][x]!)
      }
    }
  }
  
  return score
}

// 评估单个位置的价值
const evaluatePosition = (x: number, y: number, color: Player): number => {
  const directions = [[1, 0], [0, 1], [1, 1], [1, -1]]
  let totalScore = 0
  
  for (const [dx, dy] of directions) {
    const lineScore = evaluateLine(x, y, dx, dy, color)
    totalScore += lineScore
  }
  
  return color === 'white' ? totalScore : -totalScore
}

// 评估一条线的价值
const evaluateLine = (x: number, y: number, dx: number, dy: number, color: Player): number => {
  let count = 1
  let blocked = 0
  
  // 向前检查
  for (let i = 1; i < 5; i++) {
    const nx = x + dx * i
    const ny = y + dy * i
    if (nx < 0 || nx >= 15 || ny < 0 || ny >= 15) {
      blocked++
      break
    }
    if (board.value[ny][nx] === color) {
      count++
    } else if (board.value[ny][nx] !== null) {
      blocked++
      break
    } else {
      break
    }
  }
  
  // 向后检查
  for (let i = 1; i < 5; i++) {
    const nx = x - dx * i
    const ny = y - dy * i
    if (nx < 0 || nx >= 15 || ny < 0 || ny >= 15) {
      blocked++
      break
    }
    if (board.value[ny][nx] === color) {
      count++
    } else if (board.value[ny][nx] !== null) {
      blocked++
      break
    } else {
      break
    }
  }
  
  // 根据连子数量和阻挡情况评分
  if (count >= 5) return 10000
  if (count === 4 && blocked === 0) return 1000
  if (count === 4 && blocked === 1) return 100
  if (count === 3 && blocked === 0) return 100
  if (count === 3 && blocked === 1) return 10
  if (count === 2 && blocked === 0) return 10
  
  return 1
}

// 获取可用移动位置
const getAvailableMoves = (): { x: number, y: number }[] => {
  const moves: { x: number, y: number }[] = []
  const range = 2 // 只考虑已有棋子周围2格内的位置
  
  if (pieces.value.length === 0) {
    // 第一步下在中心附近
    return [{ x: 7, y: 7 }]
  }
  
  const considered = new Set<string>()
  
  for (const piece of pieces.value) {
    for (let dy = -range; dy <= range; dy++) {
      for (let dx = -range; dx <= range; dx++) {
        const nx = piece.x + dx
        const ny = piece.y + dy
        const key = `${nx},${ny}`
        
        if (nx >= 0 && nx < 15 && ny >= 0 && ny < 15 && 
            board.value[ny][nx] === null && !considered.has(key)) {
          moves.push({ x: nx, y: ny })
          considered.add(key)
        }
      }
    }
  }
  
  // 按照距离中心的远近排序，优先考虑中心位置
  moves.sort((a, b) => {
    const distA = Math.abs(a.x - 7) + Math.abs(a.y - 7)
    const distB = Math.abs(b.x - 7) + Math.abs(b.y - 7)
    return distA - distB
  })
  
  return moves
}

// 悔棋
const undoMove = () => {
  if (!canUndo.value) return

  const lastMove = moveHistory.value.pop()!
  board.value[lastMove.y][lastMove.x] = null
  pieces.value.pop()
  moveCount.value--

  // 如果是AI模式，还需要撤销AI的上一步
  if (gameMode.value === 'ai' && moveHistory.value.length > 0) {
    const aiMove = moveHistory.value.pop()!
    board.value[aiMove.y][aiMove.x] = null
    pieces.value.pop()
    moveCount.value--
  }

  // 更新最新棋子标记
  if (pieces.value.length > 0) {
    pieces.value[pieces.value.length - 1].isLatest = true
  }

  currentPlayer.value = 'black'
  gameState.value = 'playing'
  winner.value = null
}

// 设置游戏模式
const setGameMode = (mode: GameMode) => {
  tempGameMode.value = mode
  if (mode === 'pvp') {
    tempAiDifficulty.value = '中等'
  }
}

// 确认模式选择
const confirmModeSelect = () => {
  gameMode.value = tempGameMode.value
  aiDifficulty.value = tempAiDifficulty.value
  showModeSelect.value = false
  resetGame()
}

// 重置游戏
const resetGame = () => {
  gameState.value = 'playing'
  currentPlayer.value = 'black'
  winner.value = null
  moveCount.value = 0
  gameTime.value = 0
  board.value = Array(15).fill(null).map(() => Array(15).fill(null))
  pieces.value = []
  moveHistory.value = []
  hoveredCell.value = { x: -1, y: -1 }
  
  stopTimer()
  startTimer()
}

// 组件挂载
onMounted(() => {
  initAudio()
  startTimer()
})

// 组件卸载
onUnmounted(() => {
  stopTimer()
})
</script>

<style scoped>
.gomoku-game {
  min-height: 100vh;
  background: linear-gradient(135deg, #8B4513 0%, #D2691E 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: white;
}

.game-container {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(15px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  padding: 30px;
  max-width: 600px;
  width: 100%;
}

.game-header {
  text-align: center;
  margin-bottom: 20px;
}

.game-header h2 {
  margin: 0 0 15px 0;
  font-size: 2.5em;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.game-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 15px;
}

.mode-display {
  font-size: 1.1em;
  font-weight: bold;
}

.difficulty {
  color: #FFD700;
  font-size: 0.9em;
}

.turn-display {
  font-size: 1.1em;
  font-weight: bold;
}

.turn-display .black {
  color: #333;
  background: white;
  padding: 2px 8px;
  border-radius: 12px;
}

.turn-display .white {
  color: white;
  background: #333;
  padding: 2px 8px;
  border-radius: 12px;
}

.game-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;
}

.control-group {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.mode-btn,
.undo-btn,
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

.mode-btn {
  background: linear-gradient(135deg, #2196F3, #1976D2);
}

.undo-btn {
  background: linear-gradient(135deg, #FF9800, #F57C00);
}

.reset-btn {
  background: linear-gradient(135deg, #9E9E9E, #757575);
}

.mode-btn:hover:not(:disabled),
.undo-btn:hover:not(:disabled),
.reset-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.mode-btn:disabled,
.undo-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.game-stats {
  display: flex;
  gap: 20px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-label {
  font-size: 0.9em;
  opacity: 0.8;
}

.stat-value {
  font-size: 1.2em;
  font-weight: bold;
  color: #FFD700;
}

.board-container {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.board {
  position: relative;
  width: 450px;
  height: 450px;
  background: linear-gradient(135deg, #DEB887, #D2B48C);
  border-radius: 10px;
  box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.2);
}

.board-grid {
  position: absolute;
  top: 0;
  left: 0;
  border-radius: 10px;
}

.pieces {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.piece {
  position: absolute;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: all 0.3s ease;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.piece.black {
  background: radial-gradient(circle at 30% 30%, #666, #000);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
}

.piece.white {
  background: radial-gradient(circle at 30% 30%, #fff, #ddd);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  border: 1px solid #ccc;
}

.piece.latest {
  box-shadow: 0 0 15px rgba(255, 215, 0, 0.8);
  z-index: 10;
}

.piece-inner {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.move-number {
  font-size: 10px;
  font-weight: bold;
  color: #FFD700;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

.click-areas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.board-row {
  display: flex;
  height: 30px;
}

.board-cell {
  width: 30px;
  height: 30px;
  cursor: pointer;
  position: relative;
}

.board-cell.hover::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 20px;
  height: 20px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.board-cell.disabled {
  cursor: not-allowed;
}

.game-result {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.result-content {
  background: rgba(255, 255, 255, 0.95);
  color: #333;
  padding: 40px;
  border-radius: 20px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  max-width: 400px;
  width: 90%;
}

.result-content h3 {
  margin: 0 0 20px 0;
  font-size: 2em;
  color: #2196F3;
}

.result-stats {
  margin: 20px 0;
  font-size: 1.1em;
}

.result-stats p {
  margin: 5px 0;
}

.play-again-btn {
  padding: 15px 30px;
  background: linear-gradient(135deg, #4CAF50, #45a049);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 1.1em;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.play-again-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: rgba(255, 255, 255, 0.95);
  color: #333;
  padding: 30px;
  border-radius: 20px;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.modal-content h3 {
  margin: 0 0 20px 0;
  text-align: center;
  color: #2196F3;
}

.mode-options {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
}

.mode-option {
  flex: 1;
  padding: 20px;
  border: 2px solid #ddd;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
}

.mode-option:hover {
  border-color: #2196F3;
  background: rgba(33, 150, 243, 0.1);
}

.mode-icon {
  font-size: 2em;
  margin-bottom: 10px;
}

.mode-info h4 {
  margin: 0 0 5px 0;
  color: #333;
}

.mode-info p {
  margin: 0;
  font-size: 0.9em;
  color: #666;
}

.difficulty-select {
  margin-bottom: 20px;
}

.difficulty-select h4 {
  margin: 0 0 15px 0;
  color: #333;
}

.difficulty-options {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.difficulty-btn {
  flex: 1;
  min-width: 120px;
  padding: 15px 10px;
  border: 2px solid #ddd;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.difficulty-btn:hover {
  border-color: #2196F3;
  background: rgba(33, 150, 243, 0.1);
}

.difficulty-btn.active {
  border-color: #2196F3;
  background: #2196F3;
  color: white;
}

.difficulty-btn small {
  font-size: 0.8em;
  opacity: 0.8;
  margin-top: 5px;
}

.modal-actions {
  display: flex;
  gap: 15px;
  justify-content: flex-end;
}

.cancel-btn,
.confirm-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.cancel-btn {
  background: #9E9E9E;
  color: white;
}

.confirm-btn {
  background: #2196F3;
  color: white;
}

.cancel-btn:hover,
.confirm-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.game-instructions {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 20px;
  margin-top: 20px;
}

.game-instructions h4 {
  margin: 0 0 15px 0;
  color: #FFD700;
}

.game-instructions ul {
  margin: 0;
  padding-left: 20px;
}

.game-instructions li {
  margin-bottom: 8px;
  line-height: 1.4;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .gomoku-game {
    padding: 10px;
  }
  
  .game-container {
    padding: 20px;
  }
  
  .board {
    width: 300px;
    height: 300px;
  }
  
  .board-grid {
    width: 300px;
    height: 300px;
  }
  
  .board-row {
    height: 20px;
  }
  
  .board-cell {
    width: 20px;
    height: 20px;
  }
  
  .piece {
    width: 18px;
    height: 18px;
  }
  
  .game-info {
    flex-direction: column;
    gap: 10px;
  }
  
  .game-controls {
    flex-direction: column;
    align-items: stretch;
  }
  
  .control-group {
    justify-content: center;
  }
  
  .mode-options {
    flex-direction: column;
  }
  
  .difficulty-options {
    flex-direction: column;
  }
}
</style>