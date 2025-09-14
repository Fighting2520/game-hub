<template>
  <div class="memory-card-game">
    <div class="game-header">
      <h1>🧠 记忆翻牌</h1>
      <div class="game-stats">
        <div class="stat-item">
          <span class="stat-label">难度</span>
          <span class="stat-value">{{ difficultyName }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">翻牌次数</span>
          <span class="stat-value">{{ flipCount }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">配对数</span>
          <span class="stat-value">{{ matchedPairs }}/{{ totalPairs }}</span>
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
            <span class="rule-icon">🃏</span>
            <div class="rule-text">
              <strong>翻牌配对</strong>
              <p>点击卡牌翻开，找到相同图案的配对</p>
            </div>
          </div>
          <div class="rule-item">
            <span class="rule-icon">🧠</span>
            <div class="rule-text">
              <strong>记忆挑战</strong>
              <p>记住每张卡牌的位置，减少翻牌次数</p>
            </div>
          </div>
          <div class="rule-item">
            <span class="rule-icon">⏱️</span>
            <div class="rule-text">
              <strong>时间计分</strong>
              <p>用时越短、翻牌越少，得分越高</p>
            </div>
          </div>
          <div class="rule-item">
            <span class="rule-icon">🏆</span>
            <div class="rule-text">
              <strong>完美挑战</strong>
              <p>挑战完美记忆，获得最高分数</p>
            </div>
          </div>
        </div>
        
        <h3>🎲 难度选择</h3>
        <div class="difficulty-grid">
          <div class="difficulty-item">
            <strong>简单</strong>：4×3，6对卡牌
          </div>
          <div class="difficulty-item">
            <strong>中等</strong>：4×4，8对卡牌
          </div>
          <div class="difficulty-item">
            <strong>困难</strong>：6×4，12对卡牌
          </div>
          <div class="difficulty-item">
            <strong>专家</strong>：6×6，18对卡牌
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
              <span>{{ diff.pairs }}对卡牌</span>
            </div>
          </button>
        </div>
      </div>

      <!-- 游戏进行中 -->
      <div v-if="gameState === 'playing'" class="game-playing">
        <div class="game-board" :class="`grid-${currentDifficulty.rows}x${currentDifficulty.cols}`">
          <div
            v-for="(card, index) in cards"
            :key="index"
            :class="[
              'memory-card',
              card.isFlipped ? 'flipped' : '',
              card.isMatched ? 'matched' : '',
              card.isWrong ? 'wrong' : '',
              isCardClickable(card) ? 'clickable' : 'disabled'
            ]"
            @click="flipCard(index)"
          >
            <div class="card-inner">
              <div class="card-front">
                <div class="card-pattern">❓</div>
              </div>
              <div class="card-back">
                <div class="card-symbol">{{ card.symbol }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="game-controls">
          <button @click="showPreview" class="preview-btn" :disabled="previewUsed >= maxPreviews">
            👁️ 预览 ({{ previewUsed }}/{{ maxPreviews }})
          </button>
          <button @click="shuffleCards" class="shuffle-btn" :disabled="shuffleUsed >= maxShuffles">
            🔄 重排 ({{ shuffleUsed }}/{{ maxShuffles }})
          </button>
          <button @click="resetGame" class="reset-btn">🏠 重新开始</button>
        </div>

        <div class="progress-section">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
          </div>
          <div class="progress-text">
            进度: {{ matchedPairs }}/{{ totalPairs }} ({{ Math.round(progressPercentage) }}%)
          </div>
        </div>
      </div>

      <!-- 游戏结束 -->
      <div v-if="gameState === 'won'" class="game-result win-result">
        <div class="result-content">
          <h2>🎉 恭喜完成挑战！</h2>
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
              <span class="result-label">翻牌次数</span>
              <span class="result-value">{{ flipCount }}</span>
            </div>
            <div class="result-item">
              <span class="result-label">准确率</span>
              <span class="result-value">{{ accuracy }}%</span>
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'

// 游戏状态
const gameState = ref<'setup' | 'playing' | 'won'>('setup')
const flipCount = ref(0)
const matchedPairs = ref(0)
const score = ref(0)
const level = ref(1)
const previewUsed = ref(0)
const shuffleUsed = ref(0)
const maxPreviews = ref(2)
const maxShuffles = ref(1)
const startTime = ref(0)
const elapsedTime = ref(0)

// 卡牌接口
interface Card {
  id: number
  symbol: string
  isFlipped: boolean
  isMatched: boolean
  isWrong: boolean
}

// 游戏数据
const cards = ref<Card[]>([])
const flippedCards = ref<number[]>([])
const currentDifficulty = ref({ name: '中等', rows: 4, cols: 4, pairs: 8 })

// 难度配置
const difficulties = [
  { name: '简单', rows: 3, cols: 4, pairs: 6 },
  { name: '中等', rows: 4, cols: 4, pairs: 8 },
  { name: '困难', rows: 4, cols: 6, pairs: 12 },
  { name: '专家', rows: 6, cols: 6, pairs: 18 }
]

// 卡牌符号
const symbols = [
  '🍎', '🍌', '🍇', '🍊', '🍓', '🥝', '🍑', '🍒', '🥭', '🍍', 
  '🥥', '🍈', '🍉', '🍋', '🥑', '🍅', '🌶️', '🥕', '🌽', '🥒',
  '🥦', '🍄', '🥜', '🌰', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳',
  '🥓', '🥞', '🧇', '🍖', '🍗', '🥩'
]

// 计算属性
const difficultyName = computed(() => currentDifficulty.value.name)
const totalPairs = computed(() => currentDifficulty.value.pairs)
const progressPercentage = computed(() => (matchedPairs.value / totalPairs.value) * 100)
const accuracy = computed(() => {
  if (flipCount.value === 0) return 100
  const perfectFlips = totalPairs.value * 2
  return Math.round((perfectFlips / flipCount.value) * 100)
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
const playFlipSound = () => playSound(400, 0.1, 'square')
const playMatchSound = () => {
  playSound(523, 0.2, 'sine')
  setTimeout(() => playSound(659, 0.2, 'sine'), 100)
}
const playWrongSound = () => playSound(200, 0.3, 'sawtooth')
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

// 开始游戏
const startGame = (difficulty: typeof difficulties[0]) => {
  initAudio()
  gameState.value = 'playing'
  currentDifficulty.value = difficulty
  flipCount.value = 0
  matchedPairs.value = 0
  previewUsed.value = 0
  shuffleUsed.value = 0
  flippedCards.value = []
  startTime.value = Date.now()
  elapsedTime.value = 0
  
  initializeCards()
  startTimer()
}

// 初始化卡牌
const initializeCards = () => {
  const { pairs } = currentDifficulty.value
  const selectedSymbols = symbols.slice(0, pairs)
  
  // 创建配对的卡牌
  const cardPairs: Card[] = []
  selectedSymbols.forEach((symbol, index) => {
    cardPairs.push(
      { id: index * 2, symbol, isFlipped: false, isMatched: false, isWrong: false },
      { id: index * 2 + 1, symbol, isFlipped: false, isMatched: false, isWrong: false }
    )
  })
  
  // 打乱卡牌
  for (let i = cardPairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[cardPairs[i], cardPairs[j]] = [cardPairs[j], cardPairs[i]]
  }
  
  cards.value = cardPairs
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

// 检查卡牌是否可点击
const isCardClickable = (card: Card) => {
  return !card.isFlipped && !card.isMatched && flippedCards.value.length < 2
}

// 翻牌
const flipCard = (index: number) => {
  const card = cards.value[index]
  if (!isCardClickable(card)) return
  
  card.isFlipped = true
  flippedCards.value.push(index)
  flipCount.value++
  playFlipSound()
  
  if (flippedCards.value.length === 2) {
    checkMatch()
  }
}

// 检查配对
const checkMatch = () => {
  const [firstIndex, secondIndex] = flippedCards.value
  const firstCard = cards.value[firstIndex]
  const secondCard = cards.value[secondIndex]
  
  setTimeout(() => {
    if (firstCard.symbol === secondCard.symbol) {
      // 配对成功
      firstCard.isMatched = true
      secondCard.isMatched = true
      matchedPairs.value++
      playMatchSound()
      
      // 检查是否完成游戏
      if (matchedPairs.value === totalPairs.value) {
        gameState.value = 'won'
        stopTimer()
        calculateScore()
        playWinSound()
      }
    } else {
      // 配对失败
      firstCard.isWrong = true
      secondCard.isWrong = true
      playWrongSound()
      
      setTimeout(() => {
        firstCard.isFlipped = false
        secondCard.isFlipped = false
        firstCard.isWrong = false
        secondCard.isWrong = false
      }, 1000)
    }
    
    flippedCards.value = []
  }, 1000)
}

// 计算得分
const calculateScore = () => {
  const baseScore = totalPairs.value * 100
  const timeBonus = Math.max(0, 300 - elapsedTime.value) * 5
  const flipBonus = Math.max(0, (totalPairs.value * 3 - flipCount.value)) * 10
  const accuracyBonus = accuracy.value * 2
  const difficultyMultiplier = currentDifficulty.value.pairs / 6
  
  score.value = Math.floor((baseScore + timeBonus + flipBonus + accuracyBonus) * difficultyMultiplier)
}

// 获取评级
const getRating = () => {
  if (accuracy.value >= 95) return '🏆 完美'
  if (accuracy.value >= 85) return '🥇 优秀'
  if (accuracy.value >= 75) return '🥈 良好'
  if (accuracy.value >= 65) return '🥉 及格'
  return '📚 需要练习'
}

// 预览所有卡牌
const showPreview = () => {
  if (previewUsed.value >= maxPreviews.value) return
  
  previewUsed.value++
  
  // 翻开所有未配对的卡牌
  cards.value.forEach(card => {
    if (!card.isMatched) {
      card.isFlipped = true
    }
  })
  
  // 3秒后翻回去
  setTimeout(() => {
    cards.value.forEach(card => {
      if (!card.isMatched && flippedCards.value.indexOf(cards.value.indexOf(card)) === -1) {
        card.isFlipped = false
      }
    })
  }, 3000)
}

// 重新排列卡牌
const shuffleCards = () => {
  if (shuffleUsed.value >= maxShuffles.value) return
  
  shuffleUsed.value++
  
  // 只重排未配对的卡牌
  const unmatchedCards = cards.value.filter(card => !card.isMatched)
  const matchedCards = cards.value.filter(card => card.isMatched)
  
  // 打乱未配对的卡牌
  for (let i = unmatchedCards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[unmatchedCards[i], unmatchedCards[j]] = [unmatchedCards[j], unmatchedCards[i]]
  }
  
  // 重新组合卡牌数组
  let unmatchedIndex = 0
  let matchedIndex = 0
  
  cards.value = cards.value.map(card => {
    if (card.isMatched) {
      return matchedCards[matchedIndex++]
    } else {
      const newCard = unmatchedCards[unmatchedIndex++]
      newCard.isFlipped = false
      newCard.isWrong = false
      return newCard
    }
  })
  
  flippedCards.value = []
}

// 下一关
const nextLevel = () => {
  level.value++
  const currentIndex = difficulties.findIndex(d => d.name === currentDifficulty.value.name)
  const nextDiff = difficulties[Math.min(currentIndex + 1, difficulties.length - 1)]
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
.memory-card-game {
  max-width: 1200px;
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

.game-board {
  display: grid;
  gap: 10px;
  margin: 30px auto;
  justify-content: center;
  max-width: 100%;
}

.grid-3x4 { grid-template-columns: repeat(4, 80px); }
.grid-4x4 { grid-template-columns: repeat(4, 80px); }
.grid-4x6 { grid-template-columns: repeat(6, 70px); }
.grid-6x6 { grid-template-columns: repeat(6, 65px); }

.memory-card {
  width: 80px;
  height: 80px;
  perspective: 1000px;
  cursor: pointer;
}

.grid-4x6 .memory-card,
.grid-6x6 .memory-card {
  width: 70px;
  height: 70px;
}

.memory-card.disabled {
  cursor: not-allowed;
}

.card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  text-align: center;
  transition: transform 0.6s;
  transform-style: preserve-3d;
}

.memory-card.flipped .card-inner {
  transform: rotateY(180deg);
}

.card-front,
.card-back {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: bold;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.card-front {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.card-back {
  background: linear-gradient(135deg, #f093fb, #f5576c);
  color: white;
  transform: rotateY(180deg);
}

.memory-card.matched .card-back {
  background: linear-gradient(135deg, #4CAF50, #45a049);
  animation: matchPulse 0.6s ease-in-out;
}

.memory-card.wrong .card-back {
  background: linear-gradient(135deg, #F44336, #d32f2f);
  animation: wrongShake 0.6s ease-in-out;
}

@keyframes matchPulse {
  0%, 100% { transform: rotateY(180deg) scale(1); }
  50% { transform: rotateY(180deg) scale(1.1); }
}

@keyframes wrongShake {
  0%, 100% { transform: rotateY(180deg) translateX(0); }
  25% { transform: rotateY(180deg) translateX(-5px); }
  75% { transform: rotateY(180deg) translateX(5px); }
}

.card-pattern {
  font-size: 2rem;
  opacity: 0.8;
}

.card-symbol {
  font-size: 2rem;
}

.grid-4x6 .card-symbol,
.grid-6x6 .card-symbol {
  font-size: 1.5rem;
}

.game-controls {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin: 30px 0;
  flex-wrap: wrap;
}

.preview-btn,
.shuffle-btn,
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

.preview-btn {
  background: linear-gradient(135deg, #2196F3, #1976D2);
}

.preview-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #1976D2, #2196F3);
  transform: translateY(-2px);
}

.shuffle-btn {
  background: linear-gradient(135deg, #FF9800, #F57C00);
}

.shuffle-btn:hover:not(:disabled) {
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

.preview-btn:disabled,
.shuffle-btn:disabled {
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
  border: 2px solid rgba(76, 175, 80, 0.5);
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
.play-again-btn {
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
  .memory-card-game {
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
  
  .grid-3x4 { grid-template-columns: repeat(4, 60px); }
  .grid-4x4 { grid-template-columns: repeat(4, 60px); }
  .grid-4x6 { grid-template-columns: repeat(6, 50px); }
  .grid-6x6 { grid-template-columns: repeat(6, 45px); }
  
  .memory-card {
    width: 60px;
    height: 60px;
  }
  
  .grid-4x6 .memory-card,
  .grid-6x6 .memory-card {
    width: 50px;
    height: 50px;
  }
  
  .grid-6x6 .memory-card {
    width: 45px;
    height: 45px;
  }
  
  .card-symbol {
    font-size: 1.2rem;
  }
  
  .grid-4x6 .card-symbol,
  .grid-6x6 .card-symbol {
    font-size: 1rem;
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
  .grid-6x6 { grid-template-columns: repeat(6, 40px); }
  .grid-6x6 .memory-card {
    width: 40px;
    height: 40px;
  }
  .grid-6x6 .card-symbol {
    font-size: 0.8rem;
  }
}
</style>