<template>
  <div class="number-guessing-game">
    <div class="game-header">
      <h1>🎯 猜数字游戏</h1>
      <div class="game-stats">
        <div class="stat-item">
          <span class="stat-label">难度</span>
          <span class="stat-value">{{ difficultyName }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">范围</span>
          <span class="stat-value">1-{{ maxNumber }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">剩余次数</span>
          <span class="stat-value">{{ attemptsLeft }}</span>
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
            <span class="rule-icon">🎯</span>
            <div class="rule-text">
              <strong>目标</strong>
              <p>猜出系统随机生成的数字</p>
            </div>
          </div>
          <div class="rule-item">
            <span class="rule-icon">📊</span>
            <div class="rule-text">
              <strong>提示系统</strong>
              <p>根据你的猜测给出"太大"或"太小"的提示</p>
            </div>
          </div>
          <div class="rule-item">
            <span class="rule-icon">⏱️</span>
            <div class="rule-text">
              <strong>次数限制</strong>
              <p>在有限次数内猜中数字</p>
            </div>
          </div>
          <div class="rule-item">
            <span class="rule-icon">🏆</span>
            <div class="rule-text">
              <strong>计分规则</strong>
              <p>用时越短、次数越少，得分越高</p>
            </div>
          </div>
        </div>
        
        <h3>🎲 难度选择</h3>
        <div class="difficulty-grid">
          <div class="difficulty-item">
            <strong>简单</strong>：1-50，15次机会
          </div>
          <div class="difficulty-item">
            <strong>中等</strong>：1-100，12次机会
          </div>
          <div class="difficulty-item">
            <strong>困难</strong>：1-500，15次机会
          </div>
          <div class="difficulty-item">
            <strong>专家</strong>：1-1000，18次机会
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
              <span>范围: 1-{{ diff.max }}</span>
              <span>次数: {{ diff.attempts }}</span>
            </div>
          </button>
        </div>
      </div>

      <!-- 游戏进行中 -->
      <div v-if="gameState === 'playing'" class="game-playing">
        <div class="target-display">
          <h2>猜一个 1 到 {{ maxNumber }} 之间的数字</h2>
          <div class="attempts-info">
            <span class="attempts-left">剩余 {{ attemptsLeft }} 次机会</span>
            <span class="time-elapsed">用时: {{ formatTime(elapsedTime) }}</span>
          </div>
        </div>

        <div class="input-section">
          <div class="number-input-container">
            <input 
              v-model.number="currentGuess" 
              type="number" 
              :min="1" 
              :max="maxNumber"
              placeholder="输入你的猜测"
              class="number-input"
              @keyup.enter="makeGuess"
              ref="guessInput"
            >
            <button @click="makeGuess" class="guess-btn" :disabled="!isValidGuess">
              猜测
            </button>
          </div>
          <div class="quick-buttons">
            <button 
              v-for="num in quickNumbers" 
              :key="num"
              @click="currentGuess = num"
              class="quick-btn"
            >
              {{ num }}
            </button>
          </div>
        </div>

        <div class="feedback-section">
          <div v-if="lastFeedback" class="feedback-message" :class="lastFeedback.type">
            <span class="feedback-icon">{{ lastFeedback.icon }}</span>
            <span class="feedback-text">{{ lastFeedback.message }}</span>
          </div>
        </div>

        <div class="history-section">
          <h3>猜测历史</h3>
          <div class="history-list">
            <div 
              v-for="(attempt, index) in guessHistory" 
              :key="index"
              class="history-item"
              :class="attempt.type"
            >
              <span class="history-number">{{ attempt.guess }}</span>
              <span class="history-feedback">{{ attempt.feedback }}</span>
              <span class="history-icon">{{ attempt.icon }}</span>
            </div>
          </div>
        </div>

        <div class="game-controls">
          <button @click="giveHint" class="hint-btn" :disabled="hintsUsed >= maxHints">
            💡 提示 ({{ hintsUsed }}/{{ maxHints }})
          </button>
          <button @click="resetGame" class="reset-btn">🔄 重新开始</button>
        </div>
      </div>

      <!-- 游戏结束 -->
      <div v-if="gameState === 'won'" class="game-result win-result">
        <div class="result-content">
          <h2>🎉 恭喜你猜对了！</h2>
          <div class="result-stats">
            <div class="result-item">
              <span class="result-label">答案</span>
              <span class="result-value">{{ targetNumber }}</span>
            </div>
            <div class="result-item">
              <span class="result-label">用时</span>
              <span class="result-value">{{ formatTime(elapsedTime) }}</span>
            </div>
            <div class="result-item">
              <span class="result-label">次数</span>
              <span class="result-value">{{ guessHistory.length }}</span>
            </div>
            <div class="result-item">
              <span class="result-label">得分</span>
              <span class="result-value">{{ score }}</span>
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
          <h2>😔 很遗憾，次数用完了</h2>
          <div class="result-stats">
            <div class="result-item">
              <span class="result-label">答案</span>
              <span class="result-value">{{ targetNumber }}</span>
            </div>
            <div class="result-item">
              <span class="result-label">用时</span>
              <span class="result-value">{{ formatTime(elapsedTime) }}</span>
            </div>
            <div class="result-item">
              <span class="result-label">最接近</span>
              <span class="result-value">{{ closestGuess }}</span>
            </div>
          </div>
          <div class="result-buttons">
            <button @click="resetGame" class="play-again-btn">再试一次</button>
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
const targetNumber = ref(0)
const currentGuess = ref<number | null>(null)
const maxNumber = ref(100)
const maxAttempts = ref(12)
const attemptsLeft = ref(12)
const score = ref(0)
const level = ref(1)
const hintsUsed = ref(0)
const maxHints = ref(3)
const startTime = ref(0)
const elapsedTime = ref(0)

// 游戏数据
const guessHistory = ref<Array<{
  guess: number
  feedback: string
  type: 'too-high' | 'too-low' | 'correct'
  icon: string
}>>([])

const lastFeedback = ref<{
  message: string
  type: 'too-high' | 'too-low' | 'correct' | 'hint'
  icon: string
} | null>(null)

// 难度配置
const difficulties = [
  { name: '简单', max: 50, attempts: 15 },
  { name: '中等', max: 100, attempts: 12 },
  { name: '困难', max: 500, attempts: 15 },
  { name: '专家', max: 1000, attempts: 18 }
]

// 计算属性
const difficultyName = computed(() => {
  const diff = difficulties.find(d => d.max === maxNumber.value)
  return diff ? diff.name : '自定义'
})

const isValidGuess = computed(() => {
  return currentGuess.value !== null && 
         currentGuess.value >= 1 && 
         currentGuess.value <= maxNumber.value
})

const quickNumbers = computed(() => {
  const numbers = []
  const step = Math.ceil(maxNumber.value / 8)
  for (let i = step; i <= maxNumber.value; i += step) {
    numbers.push(i)
  }
  return numbers.slice(0, 6)
})

const closestGuess = computed(() => {
  if (guessHistory.value.length === 0) return 0
  
  let closest = guessHistory.value[0].guess
  let minDiff = Math.abs(closest - targetNumber.value)
  
  guessHistory.value.forEach(attempt => {
    const diff = Math.abs(attempt.guess - targetNumber.value)
    if (diff < minDiff) {
      minDiff = diff
      closest = attempt.guess
    }
  })
  
  return closest
})

// 引用
const guessInput = ref<HTMLInputElement>()

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
const playCorrectSound = () => {
  playSound(523, 0.2, 'sine')
  setTimeout(() => playSound(659, 0.2, 'sine'), 100)
  setTimeout(() => playSound(784, 0.3, 'sine'), 200)
}

const playWrongSound = () => playSound(200, 0.3, 'sawtooth')
const playHintSound = () => playSound(400, 0.2, 'triangle')

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
  maxNumber.value = difficulty.max
  maxAttempts.value = difficulty.attempts
  attemptsLeft.value = difficulty.attempts
  targetNumber.value = Math.floor(Math.random() * maxNumber.value) + 1
  guessHistory.value = []
  lastFeedback.value = null
  hintsUsed.value = 0
  startTime.value = Date.now()
  elapsedTime.value = 0
  
  startTimer()
  
  nextTick(() => {
    guessInput.value?.focus()
  })
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

// 进行猜测
const makeGuess = () => {
  if (!isValidGuess.value || gameState.value !== 'playing') return
  
  const guess = currentGuess.value!
  attemptsLeft.value--
  
  let feedback = ''
  let type: 'too-high' | 'too-low' | 'correct' = 'correct'
  let icon = ''
  
  if (guess === targetNumber.value) {
    // 猜对了
    feedback = '🎉 恭喜你猜对了！'
    type = 'correct'
    icon = '🎯'
    
    guessHistory.value.push({ guess, feedback, type, icon })
    lastFeedback.value = { message: feedback, type, icon }
    
    // 计算得分
    const timeBonus = Math.max(0, 300 - elapsedTime.value) * 2
    const attemptBonus = attemptsLeft.value * 50
    const difficultyBonus = maxNumber.value / 10
    score.value += Math.floor(timeBonus + attemptBonus + difficultyBonus)
    
    gameState.value = 'won'
    stopTimer()
    playCorrectSound()
    
  } else if (guess > targetNumber.value) {
    // 太大了
    feedback = '太大了！试试更小的数字'
    type = 'too-high'
    icon = '⬇️'
    
  } else {
    // 太小了
    feedback = '太小了！试试更大的数字'
    type = 'too-low'
    icon = '⬆️'
  }
  
  if (type !== 'correct') {
    guessHistory.value.push({ guess, feedback, type, icon })
    lastFeedback.value = { message: feedback, type, icon }
    playWrongSound()
    
    // 检查是否用完次数
    if (attemptsLeft.value <= 0) {
      gameState.value = 'lost'
      stopTimer()
    }
  }
  
  currentGuess.value = null
  
  nextTick(() => {
    guessInput.value?.focus()
  })
}

// 给出提示
const giveHint = () => {
  if (hintsUsed.value >= maxHints || gameState.value !== 'playing') return
  
  hintsUsed.value++
  playHintSound()
  
  const target = targetNumber.value
  const range = maxNumber.value
  let hintMessage = ''
  
  if (hintsUsed.value === 1) {
    // 第一个提示：奇偶性
    hintMessage = target % 2 === 0 ? '💡 提示：这是一个偶数' : '💡 提示：这是一个奇数'
  } else if (hintsUsed.value === 2) {
    // 第二个提示：范围缩小
    const quarter = Math.floor(range / 4)
    if (target <= quarter) {
      hintMessage = `💡 提示：数字在 1-${quarter} 之间`
    } else if (target <= quarter * 2) {
      hintMessage = `💡 提示：数字在 ${quarter + 1}-${quarter * 2} 之间`
    } else if (target <= quarter * 3) {
      hintMessage = `💡 提示：数字在 ${quarter * 2 + 1}-${quarter * 3} 之间`
    } else {
      hintMessage = `💡 提示：数字在 ${quarter * 3 + 1}-${range} 之间`
    }
  } else {
    // 第三个提示：更精确的范围
    const margin = Math.floor(range / 10)
    const min = Math.max(1, target - margin)
    const max = Math.min(range, target + margin)
    hintMessage = `💡 提示：数字在 ${min}-${max} 之间`
  }
  
  lastFeedback.value = {
    message: hintMessage,
    type: 'hint',
    icon: '💡'
  }
}

// 下一关
const nextLevel = () => {
  level.value++
  // 增加难度
  const currentDiffIndex = difficulties.findIndex(d => d.max === maxNumber.value)
  const nextDiff = difficulties[Math.min(currentDiffIndex + 1, difficulties.length - 1)]
  startGame(nextDiff)
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
.number-guessing-game {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  color: white;
}

.game-header {
  text-align: center;
  margin-bottom: 30px;
}

.game-header h1 {
  font-size: 2.5rem;
  margin-bottom: 20px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.game-stats {
  display: flex;
  justify-content: center;
  gap: 20px;
  flex-wrap: wrap;
}

.stat-item {
  background: rgba(255, 255, 255, 0.2);
  padding: 10px 15px;
  border-radius: 10px;
  backdrop-filter: blur(10px);
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 0.9rem;
  opacity: 0.8;
  margin-bottom: 5px;
}

.stat-value {
  display: block;
  font-size: 1.2rem;
  font-weight: bold;
}

.game-container {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 30px;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
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

.target-display h2 {
  font-size: 1.8rem;
  margin-bottom: 15px;
}

.attempts-info {
  display: flex;
  justify-content: center;
  gap: 30px;
  margin-bottom: 30px;
  font-size: 1.1rem;
}

.attempts-left {
  color: #FFD700;
  font-weight: bold;
}

.time-elapsed {
  color: #87CEEB;
}

.input-section {
  margin-bottom: 30px;
}

.number-input-container {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-bottom: 20px;
}

.number-input {
  padding: 15px 20px;
  font-size: 1.2rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  text-align: center;
  width: 200px;
  backdrop-filter: blur(10px);
}

.number-input::placeholder {
  color: rgba(255, 255, 255, 0.7);
}

.number-input:focus {
  outline: none;
  border-color: #FFD700;
  box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
}

.guess-btn {
  padding: 15px 30px;
  font-size: 1.2rem;
  background: linear-gradient(135deg, #4CAF50, #45a049);
  border: none;
  border-radius: 10px;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: bold;
}

.guess-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #45a049, #4CAF50);
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
}

.guess-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.quick-buttons {
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
}

.quick-btn {
  padding: 8px 15px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.quick-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.feedback-section {
  margin-bottom: 30px;
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.feedback-message {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 15px 25px;
  border-radius: 10px;
  font-size: 1.1rem;
  font-weight: bold;
  backdrop-filter: blur(10px);
}

.feedback-message.too-high {
  background: rgba(244, 67, 54, 0.3);
  border: 2px solid rgba(244, 67, 54, 0.5);
}

.feedback-message.too-low {
  background: rgba(33, 150, 243, 0.3);
  border: 2px solid rgba(33, 150, 243, 0.5);
}

.feedback-message.correct {
  background: rgba(76, 175, 80, 0.3);
  border: 2px solid rgba(76, 175, 80, 0.5);
}

.feedback-message.hint {
  background: rgba(255, 193, 7, 0.3);
  border: 2px solid rgba(255, 193, 7, 0.5);
}

.feedback-icon {
  font-size: 1.3rem;
}

.history-section {
  margin-bottom: 30px;
}

.history-section h3 {
  font-size: 1.3rem;
  margin-bottom: 15px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  border-radius: 8px;
  backdrop-filter: blur(10px);
}

.history-item.too-high {
  background: rgba(244, 67, 54, 0.2);
  border-left: 4px solid #F44336;
}

.history-item.too-low {
  background: rgba(33, 150, 243, 0.2);
  border-left: 4px solid #2196F3;
}

.history-item.correct {
  background: rgba(76, 175, 80, 0.2);
  border-left: 4px solid #4CAF50;
}

.history-number {
  font-weight: bold;
  font-size: 1.1rem;
}

.history-feedback {
  flex: 1;
  text-align: center;
  font-size: 0.9rem;
}

.history-icon {
  font-size: 1.2rem;
}

.game-controls {
  display: flex;
  justify-content: center;
  gap: 15px;
  flex-wrap: wrap;
}

.hint-btn, .reset-btn {
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
  background: linear-gradient(135deg, #FF9800, #F57C00);
}

.hint-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #F57C00, #FF9800);
  transform: translateY(-2px);
}

.hint-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.reset-btn {
  background: linear-gradient(135deg, #9E9E9E, #757575);
}

.reset-btn:hover {
  background: linear-gradient(135deg, #757575, #9E9E9E);
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

.next-btn, .play-again-btn {
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

@media (max-width: 768px) {
  .number-guessing-game {
    padding: 15px;
  }
  
  .game-header h1 {
    font-size: 2rem;
  }
  
  .game-stats {
    gap: 10px;
  }
  
  .stat-item {
    padding: 8px 12px;
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
  
  .number-input-container {
    flex-direction: column;
    align-items: center;
  }
  
  .number-input {
    width: 100%;
    max-width: 250px;
  }
  
  .attempts-info {
    flex-direction: column;
    gap: 10px;
  }
  
  .result-stats {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .result-buttons {
    flex-direction: column;
  }
}
</style>