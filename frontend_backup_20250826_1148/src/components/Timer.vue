<template>
  <div class="timer-container">
    <div class="timer-display" :class="{ 'time-warning': timeLeft <= 300 && timeLeft > 60, 'time-critical': timeLeft <= 60 }">
      {{ formattedTime }}
    </div>
    <!-- Solo mostrar controles si showControls es true -->
    <div v-if="showControls" class="timer-controls">
      <button 
        v-if="!isRunning" 
        @click="startTimer" 
        class="timer-button start"
        :disabled="timeLeft <= 0"
      >
        <i class="icon-play"></i>
        <span>Iniciar</span>
      </button>
      <button 
        v-else 
        @click="pauseTimer" 
        class="timer-button pause"
      >
        <i class="icon-pause"></i>
        <span>Pausar</span>
      </button>
      <button 
        @click="resetTimer" 
        class="timer-button reset"
        :disabled="!isRunning && timeLeft === duration"
      >
        <i class="icon-rotate-ccw"></i>
        <span>Reiniciar</span>
      </button>
    </div>
    <div v-if="showComplete" class="timer-complete">
      <i class="icon-alert-circle"></i>
      <span>¡Tiempo finalizado!</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';

const props = defineProps({
  duration: {
    type: Number,
    default: 3600, // 1 hour in seconds
    validator: (value: number) => value > 0
  },
  autostart: {
    type: Boolean,
    default: false
  },
  showControls: {
    type: Boolean,
    default: true
  },
  warningThreshold: {
    type: Number,
    default: 300 // 5 minutes
  },
  criticalThreshold: {
    type: Number,
    default: 60 // 1 minute
  }
});

const emit = defineEmits(['time-update', 'time-up', 'timer-started', 'timer-paused', 'timer-reset']);

const timeLeft = ref(props.duration);
const isRunning = ref(false);
const showComplete = ref(false);
let timer: number | null = null;

const formattedTime = computed(() => {
  const hours = Math.floor(timeLeft.value / 3600);
  const minutes = Math.floor((timeLeft.value % 3600) / 60);
  const seconds = timeLeft.value % 60;
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
});

const startTimer = () => {
  if (timeLeft.value <= 0) return;
  
  isRunning.value = true;
  showComplete.value = false;
  emit('timer-started');
  
  timer = window.setInterval(() => {
    if (timeLeft.value > 0) {
      timeLeft.value--;
      emit('time-update', timeLeft.value);
      
      if (timeLeft.value === 0) {
        timerComplete();
      }
    }
  }, 1000);
};

const pauseTimer = () => {
  if (timer) {
    clearInterval(timer);
    timer = null;
    isRunning.value = false;
    emit('timer-paused');
  }
};

const resetTimer = () => {
  pauseTimer();
  timeLeft.value = props.duration;
  showComplete.value = false;
  emit('time-update', timeLeft.value);
  emit('timer-reset');
};

const timerComplete = () => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  isRunning.value = false;
  showComplete.value = true;
  emit('time-up');
};

// Watch for duration changes
watch(() => props.duration, (newDuration) => {
  if (!isRunning.value) {
    timeLeft.value = newDuration;
  }
});

// Auto-start timer if autostart is true
onMounted(() => {
  if (props.autostart) {
    startTimer();
  }
});

// Clean up timer on component unmount
onUnmounted(() => {
  if (timer) {
    clearInterval(timer);
  }
});

// Expose methods to parent component
defineExpose({
  start: startTimer,
  pause: pauseTimer,
  reset: resetTimer,
  getTimeLeft: () => timeLeft.value,
  isRunning: () => isRunning.value
});
</script>

<style scoped>
.timer-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  padding: 1rem;
  border-radius: 8px;
  background-color: #f8f9fa;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-width: 300px;
  margin: 0 auto;
}

.timer-display {
  font-size: 2.5rem;
  font-weight: 700;
  font-family: 'Courier New', monospace;
  color: var(--azul-tritiano);
  margin-bottom: 1rem;
  text-align: center;
  min-width: 140px;
}

.time-warning {
  color: #ff9800;
  animation: pulse 1.5s infinite;
}

.time-critical {
  color: #f44336;
  animation: pulse 0.8s infinite;
}

.timer-controls {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.timer-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
}

.timer-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.start {
  background-color: var(--verde);
  color: white;
}

.start:hover:not(:disabled) {
  background-color: #1a7f4b;
  transform: translateY(-1px);
}

.pause {
  background-color: #ff9800;
  color: white;
}

.pause:hover {
  background-color: #e68a00;
  transform: translateY(-1px);
}

.reset {
  background-color: #f0f0f0;
  color: #333;
  border: 1px solid #ddd;
}

.reset:hover:not(:disabled) {
  background-color: #e0e0e0;
  transform: translateY(-1px);
}

.timer-complete {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #f44336;
  font-weight: 500;
  margin-top: 0.5rem;
  animation: bounce 0.5s ease infinite alternate;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.7; }
  100% { opacity: 1; }
}

@keyframes bounce {
  from { transform: translateY(0); }
  to { transform: translateY(-3px); }
}

/* Responsive adjustments */
@media (max-width: 480px) {
  .timer-display {
    font-size: 2rem;
  }
  
  .timer-button {
    padding: 0.4rem 0.8rem;
    font-size: 0.85rem;
  }

}
</style>