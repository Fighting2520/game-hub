<template>
  <div class="sokoban-game">
    <div class="game-container">
      <!-- 游戏标题 -->
      <div class="game-header">
        <h2>📦 推箱子</h2>
        <div class="game-info">
          <div class="level-info">
            关卡 {{ currentLevel + 1 }} / {{ levels.length }}
            <span class="level-name">{{ levels[currentLevel]?.name || '' }}</span>
          </div>
          <div class="stats">
            <span class="stat">步数: {{ moves }}</span>
            <span class="stat">推箱: {{ pushes }}</span>
          </div>
        </div>
      </div>

      <!-- 游戏控制 -->
      <div class="game-controls">
        <div class="control-group">
          <button @click="showLevelSelect = true" class="level-btn">
            🎯 选择关卡
          </button>
          <button @click="undoMove" class="undo-btn" :disabled="!canUndo">
            ↶ 撤销
          </button>
          <button @click="redoMove" class="redo-btn" :disabled="!canRedo">
            ↷ 重做
          </button>
          <button @click="resetLevel" class="reset-btn">
            🔄 重置
          </button>
        </div>
        
        <div class="progress-info">
          <div class="boxes-info">
            已完成: {{ completedBoxes }} / {{ totalBoxes }}
          </div>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
          </div>
        </div>
      </div>

      <!-- 游戏区域 -->
      <div class="game-area">
        <div class="game-board" ref="gameBoard">
          <div 
            v-for="(row, y) in gameGrid" 
            :key="y" 
            class="board-row"
          >
            <div
              v-for="(cell, x) in row"
              :key="x"
              class="board-cell"
              :class="getCellClass(cell, x, y)"
            >
              <!-- 地板和目标点 -->
              <div v-if="cell === FLOOR || cell === TARGET" class="floor">
                <div v-if="cell === TARGET" class="target">🎯</div>
              </div>
              
              <!-- 墙壁 -->
              <div v-if="cell === WALL" class="wall">🧱</div>
              
              <!-- 箱子 -->
              <div v-if="cell === BOX" class="box">📦</div>
              
              <!-- 完成的箱子 -->
              <div v-if="cell === BOX_ON_TARGET" class="box completed">✅</div>
              
              <!-- 玩家 -->
              <div v-if="cell === PLAYER" class="player">🤖</div>
              
              <!-- 在目标点上的玩家 -->
              <div v-if="cell === PLAYER_ON_TARGET" class="player-container">
                <div class="target">🎯</div>
                <div class="player">🤖</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 移动提示 -->
      <div class="move-hints">
        <div class="hint-item">
          <span class="hint-key">WASD</span>
          <span class="hint-text">移动</span>
        </div>
        <div class="hint-item">
          <span class="hint-key">方向键</span>
          <span class="hint-text">移动</span>
        </div>
        <div class="hint-item">
          <span class="hint-key">Z</span>
          <span class="hint-text">撤销</span>
        </div>
        <div class="hint-item">
          <span class="hint-key">R</span>
          <span class="hint-text">重置</span>
        </div>
      </div>

      <!-- 关卡完成弹窗 -->
      <div v-if="levelCompleted" class="completion-modal">
        <div class="modal-content">
          <h3>🎉 关卡完成！</h3>
          <div class="completion-stats">
            <p><strong>{{ levels[currentLevel].name }}</strong></p>
            <p>步数: {{ moves }}</p>
            <p>推箱次数: {{ pushes }}</p>
            <p>评级: {{ getRating() }}</p>
          </div>
          <div class="modal-actions">
            <button @click="resetLevel" class="retry-btn">🔄 重试</button>
            <button @click="nextLevel" class="next-btn" :disabled="currentLevel >= levels.length - 1">
              ➡️ 下一关
            </button>
            <button @click="showLevelSelect = true; levelCompleted = false" class="select-btn">
              🎯 选择关卡
            </button>
          </div>
        </div>
      </div>

      <!-- 关卡选择弹窗 -->
      <div v-if="showLevelSelect" class="modal-overlay" @click="showLevelSelect = false">
        <div class="modal-content level-select" @click.stop>
          <h3>选择关卡</h3>
          <div class="levels-grid">
            <div
              v-for="(level, index) in levels"
              :key="index"
              class="level-item"
              :class="{ 
                current: index === currentLevel,
                completed: completedLevels.includes(index)
              }"
              @click="selectLevel(index)"
            >
              <div class="level-number">{{ index + 1 }}</div>
              <div class="level-name">{{ level.name }}</div>
              <div class="level-size">{{ level.width }}×{{ level.height }}</div>
              <div v-if="completedLevels.includes(index)" class="completed-mark">✅</div>
            </div>
          </div>
          <div class="modal-actions">
            <button @click="showLevelSelect = false" class="close-btn">关闭</button>
          </div>
        </div>
      </div>

      <!-- 游戏说明 -->
      <div class="game-instructions">
        <h4>🎯 游戏规则</h4>
        <ul>
          <li>推动所有箱子到目标位置（🎯）</li>
          <li>只能推箱子，不能拉箱子</li>
          <li>一次只能推一个箱子</li>
          <li>箱子不能推到墙上或其他箱子上</li>
          <li>所有箱子都到达目标位置即可过关</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'

// 游戏元素常量
const WALL = '#'
const FLOOR = ' '
const TARGET = '.'
const BOX = '$'
const PLAYER = '@'
const BOX_ON_TARGET = '*'
const PLAYER_ON_TARGET = '+'

// 游戏状态
const currentLevel = ref(0)
const gameGrid = ref<string[][]>([])
const playerPos = ref({ x: 0, y: 0 })
const moves = ref(0)
const pushes = ref(0)
const levelCompleted = ref(false)
const showLevelSelect = ref(false)

// 历史记录
const moveHistory = ref<Array<{
  grid: string[][]
  playerPos: { x: number, y: number }
  moves: number
  pushes: number
}>>([])
const redoHistory = ref<Array<{
  grid: string[][]
  playerPos: { x: number, y: number }
  moves: number
  pushes: number
}>>([])

// 已完成关卡
const completedLevels = ref<number[]>([])

// 计算属性
const canUndo = computed(() => moveHistory.value.length > 0)
const canRedo = computed(() => redoHistory.value.length > 0)
const totalBoxes = computed(() => {
  let count = 0
  for (const row of gameGrid.value) {
    for (const cell of row) {
      if (cell === BOX || cell === BOX_ON_TARGET) {
        count++
      }
    }
  }
  return count
})
const completedBoxes = computed(() => {
  let count = 0
  for (const row of gameGrid.value) {
    for (const cell of row) {
      if (cell === BOX_ON_TARGET) {
        count++
      }
    }
  }
  return count
})
const progressPercentage = computed(() => {
  return totalBoxes.value > 0 ? (completedBoxes.value / totalBoxes.value) * 100 : 0
})

// 关卡数据
const levels = [
  {
    name: "入门",
    width: 8,
    height: 6,
    data: [
      "########",
      "#      #",
      "#  $@  #",
      "#  .   #",
      "#      #",
      "########"
    ]
  },
  {
    name: "简单推动",
    width: 9,
    height: 7,
    data: [
      "#########",
      "#       #",
      "#  $$$  #",
      "#  .@.  #",
      "#   .   #",
      "#       #",
      "#########"
    ]
  },
  {
    name: "转角",
    width: 10,
    height: 8,
    data: [
      "##########",
      "#        #",
      "#  ####  #",
      "#  #  #  #",
      "#  # $#  #",
      "#  #. #  #",
      "#  #@ #  #",
      "##########"
    ]
  },
  {
    name: "双箱子",
    width: 11,
    height: 9,
    data: [
      "###########",
      "#         #",
      "#  #####  #",
      "#  #   #  #",
      "#  # $$#  #",
      "#  # ..#  #",
      "#  #  @#  #",
      "#  #####  #",
      "###########"
    ]
  },
  {
    name: "迷宫",
    width: 12,
    height: 10,
    data: [
      "############",
      "#          #",
      "#  ######  #",
      "#  #    #  #",
      "#  # $$ #  #",
      "#  # .. #  #",
      "#  #  @ #  #",
      "#  #    #  #",
      "#  ######  #",
      "############"
    ]
  },
  {
    name: "三箱排列",
    width: 13,
    height: 11,
    data: [
      "#############",
      "#           #",
      "#  #######  #",
      "#  #     #  #",
      "#  # $$$ #  #",
      "#  # ... #  #",
      "#  #  @  #  #",
      "#  #     #  #",
      "#  #######  #",
      "#           #",
      "#############"
    ]
  },
  {
    name: "复杂路径",
    width: 14,
    height: 12,
    data: [
      "##############",
      "#            #",
      "#  ########  #",
      "#  #      #  #",
      "#  # #### #  #",
      "#  # #$$# #  #",
      "#  # #..# #  #",
      "#  # #@ # #  #",
      "#  # #### #  #",
      "#  #      #  #",
      "#  ########  #",
      "##############"
    ]
  },
  {
    name: "四箱挑战",
    width: 15,
    height: 13,
    data: [
      "###############",
      "#             #",
      "#  #########  #",
      "#  #       #  #",
      "#  # ##### #  #",
      "#  # #$$$# #  #",
      "#  # #.$.# #  #",
      "#  # #$@$# #  #",
      "#  # ##### #  #",
      "#  #       #  #",
      "#  #########  #",
      "#             #",
      "###############"
    ]
  }
]

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

// 播放移动音效
const playMoveSound = () => {
  playSound(400, 0.1, 'sine')
}

// 播放推箱音效
const playPushSound = () => {
  playSound(300, 0.2, 'square')
}

// 播放完成音效
const playCompleteSound = () => {
  playSound(523, 0.2, 'sine')
  setTimeout(() => playSound(659, 0.2, 'sine'), 200)
  setTimeout(() => playSound(784, 0.3, 'sine'), 400)
}

// 获取单元格样式类
const getCellClass = (cell: string, x: number, y: number): string => {
  const classes = []
  
  if (x === playerPos.value.x && y === playerPos.value.y) {
    classes.push('player-cell')
  }
  
  return classes.join(' ')
}

// 初始化关卡
const initLevel = (levelIndex: number) => {
  const level = levels[levelIndex]
  if (!level) return
  
  gameGrid.value = level.data.map(row => row.split(''))
  moves.value = 0
  pushes.value = 0
  levelCompleted.value = false
  moveHistory.value = []
  redoHistory.value = []
  
  // 找到玩家位置
  for (let y = 0; y < gameGrid.value.length; y++) {
    for (let x = 0; x < gameGrid.value[y].length; x++) {
      if (gameGrid.value[y][x] === PLAYER || gameGrid.value[y][x] === PLAYER_ON_TARGET) {
        playerPos.value = { x, y }
        break
      }
    }
  }
  
  saveState()
}

// 保存状态
const saveState = () => {
  moveHistory.value.push({
    grid: gameGrid.value.map(row => [...row]),
    playerPos: { ...playerPos.value },
    moves: moves.value,
    pushes: pushes.value
  })
  
  // 限制历史记录数量
  if (moveHistory.value.length > 100) {
    moveHistory.value.shift()
  }
  
  redoHistory.value = []
}

// 移动玩家
const movePlayer = (dx: number, dy: number) => {
  if (levelCompleted.value) return
  
  const newX = playerPos.value.x + dx
  const newY = playerPos.value.y + dy
  
  // 检查边界
  if (newX < 0 || newX >= gameGrid.value[0].length || 
      newY < 0 || newY >= gameGrid.value.length) {
    return
  }
  
  const targetCell = gameGrid.value[newY][newX]
  
  // 检查是否撞墙
  if (targetCell === WALL) {
    return
  }
  
  // 检查是否推箱子
  if (targetCell === BOX || targetCell === BOX_ON_TARGET) {
    const boxNewX = newX + dx
    const boxNewY = newY + dy
    
    // 检查箱子新位置
    if (boxNewX < 0 || boxNewX >= gameGrid.value[0].length || 
        boxNewY < 0 || boxNewY >= gameGrid.value.length) {
      return
    }
    
    const boxTargetCell = gameGrid.value[boxNewY][boxNewX]
    
    // 箱子不能推到墙上或其他箱子上
    if (boxTargetCell === WALL || boxTargetCell === BOX || boxTargetCell === BOX_ON_TARGET) {
      return
    }
    
    // 推箱子
    saveState()
    
    // 移动箱子
    const isBoxOnTarget = targetCell === BOX_ON_TARGET
    const isNewPosTarget = boxTargetCell === TARGET
    
    gameGrid.value[boxNewY][boxNewX] = isNewPosTarget ? BOX_ON_TARGET : BOX
    gameGrid.value[newY][newX] = isBoxOnTarget ? TARGET : FLOOR
    
    pushes.value++
    playPushSound()
  } else {
    // 普通移动
    saveState()
    playMoveSound()
  }
  
  // 移动玩家
  const currentCell = gameGrid.value[playerPos.value.y][playerPos.value.x]
  const isPlayerOnTarget = currentCell === PLAYER_ON_TARGET
  
  gameGrid.value[playerPos.value.y][playerPos.value.x] = isPlayerOnTarget ? TARGET : FLOOR
  
  const isNewPosTarget = gameGrid.value[newY][newX] === TARGET
  gameGrid.value[newY][newX] = isNewPosTarget ? PLAYER_ON_TARGET : PLAYER
  
  playerPos.value = { x: newX, y: newY }
  moves.value++
  
  // 检查是否完成关卡
  checkLevelComplete()
}

// 检查关卡是否完成
const checkLevelComplete = () => {
  let allBoxesOnTarget = true
  
  for (const row of gameGrid.value) {
    for (const cell of row) {
      if (cell === BOX) {
        allBoxesOnTarget = false
        break
      }
    }
    if (!allBoxesOnTarget) break
  }
  
  if (allBoxesOnTarget && totalBoxes.value > 0) {
    levelCompleted.value = true
    
    // 记录完成的关卡
    if (!completedLevels.value.includes(currentLevel.value)) {
      completedLevels.value.push(currentLevel.value)
      // 保存到本地存储
      localStorage.setItem('sokoban-completed', JSON.stringify(completedLevels.value))
    }
    
    playCompleteSound()
  }
}

// 撤销移动
const undoMove = () => {
  if (!canUndo.value) return
  
  const currentState = {
    grid: gameGrid.value.map(row => [...row]),
    playerPos: { ...playerPos.value },
    moves: moves.value,
    pushes: pushes.value
  }
  
  redoHistory.value.push(currentState)
  
  const lastState = moveHistory.value.pop()!
  gameGrid.value = lastState.grid
  playerPos.value = lastState.playerPos
  moves.value = lastState.moves
  pushes.value = lastState.pushes
  
  levelCompleted.value = false
}

// 重做移动
const redoMove = () => {
  if (!canRedo.value) return
  
  const currentState = {
    grid: gameGrid.value.map(row => [...row]),
    playerPos: { ...playerPos.value },
    moves: moves.value,
    pushes: pushes.value
  }
  
  moveHistory.value.push(currentState)
  
  const nextState = redoHistory.value.pop()!
  gameGrid.value = nextState.grid
  playerPos.value = nextState.playerPos
  moves.value = nextState.moves
  pushes.value = nextState.pushes
  
  checkLevelComplete()
}

// 重置关卡
const resetLevel = () => {
  levelCompleted.value = false
  initLevel(currentLevel.value)
}

// 下一关
const nextLevel = () => {
  if (currentLevel.value < levels.length - 1) {
    currentLevel.value++
    initLevel(currentLevel.value)
    levelCompleted.value = false
  }
}

// 选择关卡
const selectLevel = (levelIndex: number) => {
  currentLevel.value = levelIndex
  initLevel(levelIndex)
  showLevelSelect.value = false
}

// 获取评级
const getRating = (): string => {
  const level = levels[currentLevel.value]
  const optimalMoves = level.width * level.height * 0.3 // 估算最优步数
  
  if (moves.value <= optimalMoves) {
    return "完美 ⭐⭐⭐"
  } else if (moves.value <= optimalMoves * 1.5) {
    return "优秀 ⭐⭐"
  } else if (moves.value <= optimalMoves * 2) {
    return "良好 ⭐"
  } else {
    return "完成"
  }
}

// 键盘事件处理
const handleKeyPress = (event: KeyboardEvent) => {
  switch (event.key.toLowerCase()) {
    case 'w':
    case 'arrowup':
      event.preventDefault()
      movePlayer(0, -1)
      break
    case 's':
    case 'arrowdown':
      event.preventDefault()
      movePlayer(0, 1)
      break
    case 'a':
    case 'arrowleft':
      event.preventDefault()
      movePlayer(-1, 0)
      break
    case 'd':
    case 'arrowright':
      event.preventDefault()
      movePlayer(1, 0)
      break
    case 'z':
      event.preventDefault()
      undoMove()
      break
    case 'y':
      event.preventDefault()
      redoMove()
      break
    case 'r':
      event.preventDefault()
      resetLevel()
      break
  }
}

// 组件挂载
onMounted(() => {
  initAudio()
  
  // 加载已完成关卡
  const saved = localStorage.getItem('sokoban-completed')
  if (saved) {
    completedLevels.value = JSON.parse(saved)
  }
  
  initLevel(0)
  
  // 添加键盘事件监听
  window.addEventListener('keydown', handleKeyPress)
})

// 组件卸载
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyPress)
})
</script>

<style scoped>
.sokoban-game {
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
  max-width: 800px;
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

.level-info {
  font-size: 1.2em;
  font-weight: bold;
}

.level-name {
  color: #FFD700;
  font-size: 0.9em;
  margin-left: 10px;
}

.stats {
  display: flex;
  gap: 20px;
}

.stat {
  font-size: 1.1em;
  font-weight: bold;
  color: #FFD700;
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

.level-btn,
.undo-btn,
.redo-btn,
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

.level-btn {
  background: linear-gradient(135deg, #2196F3, #1976D2);
}

.undo-btn,
.redo-btn {
  background: linear-gradient(135deg, #FF9800, #F57C00);
}

.reset-btn {
  background: linear-gradient(135deg, #9E9E9E, #757575);
}

.level-btn:hover,
.undo-btn:hover:not(:disabled),
.redo-btn:hover:not(:disabled),
.reset-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.undo-btn:disabled,
.redo-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.progress-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 5px;
}

.boxes-info {
  font-size: 0.9em;
  color: #FFD700;
}

.progress-bar {
  width: 120px;
  height: 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4CAF50, #8BC34A);
  transition: width 0.3s ease;
}

.game-area {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.game-board {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
  padding: 10px;
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.board-row {
  display: flex;
}

.board-cell {
  width: 32px;
  height: 32px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.floor {
  width: 100%;
  height: 100%;
  background: #DEB887;
  border: 1px solid #D2B48C;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.target {
  position: absolute;
  font-size: 16px;
  z-index: 1;
}

.wall {
  width: 100%;
  height: 100%;
  background: #8B4513;
  border: 1px solid #654321;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.box {
  width: 100%;
  height: 100%;
  background: #CD853F;
  border: 2px solid #A0522D;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  position: relative;
  z-index: 2;
}

.box.completed {
  background: #32CD32;
  border-color: #228B22;
  animation: pulse 1s ease-in-out infinite alternate;
}

.player {
  font-size: 20px;
  position: relative;
  z-index: 3;
  animation: bounce 2s ease-in-out infinite;
}

.player-container {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.player-cell {
  background: rgba(255, 255, 0, 0.3);
  border-radius: 4px;
}

.move-hints {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.hint-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9em;
}

.hint-key {
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: bold;
  min-width: 60px;
  text-align: center;
}

.hint-text {
  color: rgba(255, 255, 255, 0.8);
}

.completion-modal {
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
  text-align: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-content h3 {
  margin: 0 0 20px 0;
  font-size: 2em;
  color: #2196F3;
}

.completion-stats {
  margin: 20px 0;
  font-size: 1.1em;
}

.completion-stats p {
  margin: 10px 0;
}

.modal-actions {
  display: flex;
  gap: 15px;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 20px;
}

.retry-btn,
.next-btn,
.select-btn,
.close-btn {
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.retry-btn {
  background: #FF9800;
  color: white;
}

.next-btn {
  background: #4CAF50;
  color: white;
}

.select-btn,
.close-btn {
  background: #2196F3;
  color: white;
}

.retry-btn:hover,
.next-btn:hover:not(:disabled),
.select-btn:hover,
.close-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.next-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
  transform: none;
}

.level-select {
  max-width: 600px;
}

.levels-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 15px;
  margin: 20px 0;
}

.level-item {
  padding: 15px;
  border: 2px solid #ddd;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  text-align: center;
}

.level-item:hover {
  border-color: #2196F3;
  background: rgba(33, 150, 243, 0.1);
}

.level-item.current {
  border-color: #FF9800;
  background: rgba(255, 152, 0, 0.1);
}

.level-item.completed {
  border-color: #4CAF50;
  background: rgba(76, 175, 80, 0.1);
}

.level-number {
  font-size: 1.5em;
  font-weight: bold;
  color: #2196F3;
}

.level-name {
  font-size: 0.9em;
  margin: 5px 0;
  color: #666;
}

.level-size {
  font-size: 0.8em;
  color: #999;
}

.completed-mark {
  position: absolute;
  top: 5px;
  right: 5px;
  font-size: 1.2em;
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

/* 动画效果 */
@keyframes pulse {
  0% { transform: scale(1); }
  100% { transform: scale(1.05); }
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-2px); }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .sokoban-game {
    padding: 10px;
  }
  
  .game-container {
    padding: 20px;
  }
  
  .board-cell {
    width: 24px;
    height: 24px;
  }
  
  .wall,
  .box,
  .target {
    font-size: 12px;
  }
  
  .player {
    font-size: 16px;
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
  
  .progress-info {
    align-items: center;
  }
  
  .move-hints {
    gap: 10px;
  }
  
  .hint-key {
    min-width: 50px;
    font-size: 0.8em;
  }
  
  .levels-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 10px;
  }
}
</style>