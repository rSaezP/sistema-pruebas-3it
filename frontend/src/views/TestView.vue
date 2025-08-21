<template>
  <div class="test-container">
    <!-- Header con información de la prueba -->
    <header class="test-header">
      <div class="test-header-content">
        <div class="test-info">
          <h1 class="test-title">{{ session?.test?.name || 'Cargando...' }}</h1>
          <p class="candidate-name">{{ session?.candidate?.name }} {{ session?.candidate?.lastname }}</p>
        </div>
        
        <div class="test-status">
          <div class="timer-container">
            <Timer
              ref="timerRef"
              :duration="timeRemaining"
              :autostart="true"
              :show-controls="false"
              @time-up="handleTimeUp"
              @time-update="handleTimeUpdate"
            />
          </div>
          
          <div class="progress-container">
            <div class="progress-text">
              Pregunta {{ currentQuestionIndex + 1 }} de {{ questions.length }}
            </div>
            <div class="progress-bar">
              <div 
                class="progress-fill" 
                :style="{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Contenido principal -->
    <main class="test-main" v-if="session && questions.length > 0">
      <div class="question-container">
        <div class="question-header">
          <div class="question-meta">
            <span class="question-type">{{ getQuestionTypeLabel(currentQuestion.type) }}</span>
            <span class="question-difficulty" :class="currentQuestion.difficulty">
              {{ currentQuestion.difficulty }}
            </span>
            <span class="question-points">{{ currentQuestion.max_score }} puntos</span>
          </div>
          <h2 class="question-title">{{ currentQuestion.title }}</h2>
        </div>

        <div class="question-content">
          <div class="question-description" v-html="formatDescription(currentQuestion.description)"></div>
          
          <!-- Respuesta según tipo de pregunta -->
          <div class="answer-section">
            <!-- Pregunta de programación -->
            <div v-if="currentQuestion.type === 'programming'" class="programming-question">
              <div class="code-section">
                <div class="code-header">
                  <span class="language-badge">{{ currentQuestion.language || 'javascript' }}</span>
                  <button @click="runCode" class="btn btn-secondary btn-sm" :disabled="isRunning">
                    <span v-if="!isRunning">▶ Ejecutar</span>
                    <span v-else>⏳ Ejecutando...</span>
                  </button>
                </div>
                
                <CodeEditor
                  :key="`editor-${currentQuestion.id}`"
                  ref="codeEditorRef"
                  :language="currentQuestion.language || 'javascript'"
                  v-model="answers[currentQuestion.id]"
                  @update:modelValue="updateAnswer" 
                  :height="400"
                />
              </div>
              
              <div v-if="codeOutput" class="code-output">
                <h4>Resultado:</h4>
                <pre class="output-content" :class="{ 'error': codeOutput.error }">{{ codeOutput.output }}</pre>
              </div>
            </div>

            <!-- Pregunta SQL -->
            <div v-else-if="currentQuestion.type === 'sql'" class="sql-question">
              <div v-if="currentQuestion.database_schema" class="schema-info">
                <h4>Esquema de la base de datos:</h4>
                <pre class="schema-content">{{ formatSchema(currentQuestion.database_schema) }}</pre>
              </div>
              
              <div class="sql-editor">
                <CodeEditor
                  :key="`sql-editor-${currentQuestion.id}`"
                  ref="sqlEditorRef"
                  language="sql"
                  v-model="answers[currentQuestion.id]"
                  @update:modelValue="updateAnswer"
                  :height="200"
                />
              </div>
              
              <button @click="validateSQL" class="btn btn-secondary btn-sm" :disabled="isValidating">
                <span v-if="!isValidating">🔍 Validar SQL</span>
                <span v-else>⏳ Validando...</span>
              </button>
              
              <div v-if="sqlResult" class="sql-result">
                <h4>Resultado:</h4>
                <div v-if="sqlResult.error" class="error">{{ sqlResult.error }}</div>
                <div v-else>
                  <p class="success">✅ Consulta válida</p>
                  <div v-if="sqlResult.rows" class="result-table">
                    <!-- Mostrar resultados de la consulta -->
                  </div>
                </div>
              </div>
            </div>

            <!-- Pregunta de selección múltiple -->
            <div v-else-if="currentQuestion.type === 'multiple_choice'" class="multiple-choice-question">
              <div class="options-list">
                <label 
                  v-for="(option, index) in getQuestionOptions(currentQuestion)" 
                  :key="index"
                  class="option-item"
                >
                  <input
                    type="radio"
                    :name="`question-${currentQuestion.id}`"
                    :value="option.value"
                    v-model="answers[currentQuestion.id]"
                    @change="updateAnswer(option.value)"
                  />
                  <span class="option-text">{{ option.text }}</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Footer con navegación -->
    <footer class="test-footer">
      <div class="navigation-buttons">
        <button 
          @click="previousQuestion" 
          :disabled="currentQuestionIndex === 0"
          class="btn btn-secondary"
        >
          ← Anterior
        </button>
        
        <div class="question-nav">
          <button
            v-for="(question, index) in questions"
            :key="question.id"
            @click="goToQuestion(index)"
            class="question-nav-btn"
            :class="{
              'active': index === currentQuestionIndex,
              'answered': answers[question.id] && answers[question.id].trim() !== ''
            }"
          >
            {{ index + 1 }}
          </button>
        </div>

        <button 
          v-if="currentQuestionIndex < questions.length - 1"
          @click="nextQuestion" 
          class="btn btn-primary"
        >
          Siguiente →
        </button>
        
        <button 
          v-else
          @click="finishTest" 
          class="btn btn-success"
          :disabled="!canFinishTest"
        >
          Finalizar Prueba
        </button>
      </div>
    </footer>

    <!-- Modal de confirmación -->
    <div v-if="showFinishModal" class="modal-overlay" @click="showFinishModal = false">
      <div class="modal-content" @click.stop>
        <h3>¿Finalizar la prueba?</h3>
        <p>Una vez finalizada no podrás hacer cambios. ¿Estás seguro?</p>
        <div class="modal-actions">
          <button @click="showFinishModal = false" class="btn btn-secondary">Cancelar</button>
          <button @click="confirmFinishTest" class="btn btn-primary">Finalizar</button>
        </div>
      </div>
    </div>

    <!-- Loading overlay -->
    <div v-if="loading" class="loading-overlay">
      <div class="spinner"></div>
      <p>Cargando prueba...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import CodeEditor from '@/components/CodeEditor.vue';
import Timer from '@/components/Timer.vue';
import { useToast } from 'vue-toastification';
import { apiClient } from '@/services/api';

// Props
const props = defineProps<{
  token: string;
}>();

// Composition API
const route = useRoute();
const router = useRouter();
const toast = useToast();

// Reactive state
const loading = ref(true);
const session = ref<any>(null);
const questions = ref<any[]>([]);
const answers = ref<Record<number, string>>({});
const currentQuestionIndex = ref(0);
const timeRemaining = ref(3600);
const showFinishModal = ref(false);
const isRunning = ref(false);
const isValidating = ref(false);
const codeOutput = ref<any>(null);
const sqlResult = ref<any>(null);

// Refs
const timerRef = ref<any>(null);
const codeEditorRef = ref<any>(null);
const sqlEditorRef = ref<any>(null);

// Computed
const currentQuestion = computed(() => questions.value[currentQuestionIndex.value] || {});
const canFinishTest = computed(() => {
  console.log('=== EVALUANDO canFinishTest ===');
  console.log('Answers object:', answers.value);
  console.log('Total questions:', questions.value.length);
  
  const answeredCount = Object.values(answers.value).filter(answer => {
    const isValid = answer && answer.trim() !== '';
    return isValid;
  }).length;
  
  const required = Math.ceil(questions.value.length * 0.5);
  const canFinish = answeredCount >= required;
  
  console.log(`Respondidas: ${answeredCount}, Requeridas: ${required}, Puede finalizar: ${canFinish}`);
  
  return canFinish;
});

// Methods
const loadTestSession = async () => {
  try {
    loading.value = true;
    const data = await apiClient.get(`/sessions/token/${props.token}`);
    session.value = data.session;
    questions.value = data.questions;
    
    // Calcular tiempo restante
    if (session.value.started_at) {
      const startTime = new Date(session.value.started_at).getTime();
      const currentTime = new Date().getTime();
      const elapsed = Math.floor((currentTime - startTime) / 1000);
      const totalTime = session.value.time_limit_minutes * 60;
      timeRemaining.value = Math.max(0, totalTime - elapsed);
    } else {
      timeRemaining.value = session.value.time_limit_minutes * 60;
      // Marcar sesión como iniciada
      await startSession();
    }
    
    // Cargar respuestas existentes
    await loadExistingAnswers();
    
  } catch (error: any) {
    toast.error(error.message || 'Error al cargar la prueba');
    router.push('/');
  } finally {
    loading.value = false;
  }
};

const startSession = async () => {
  try {
    await apiClient.post(`/sessions/${props.token}/start`);
  } catch (error) {
    console.error('Error starting session:', error);
  }
};

const loadExistingAnswers = async () => {
  console.log('=== CARGANDO RESPUESTAS EXISTENTES ===');
  try {
    const existingAnswers = await apiClient.get(`/sessions/${props.token}/answers`);
    console.log('Respuestas del servidor:', existingAnswers);
    
    // Limpiar answers object primero
    answers.value = {};
    
    existingAnswers.forEach((answer: any) => {
      console.log(`Cargando: Question ${answer.question_id} = "${answer.answer_text}"`);
      answers.value[answer.question_id] = answer.answer_text;
    });
    
    console.log('Estado final answers:', answers.value);
  } catch (error) {
    console.error('Error cargando respuestas:', error);
  }
};

const updateAnswer = async (value: string) => {
  console.log('=== updateAnswer LLAMADO ===');
  console.log('Valor recibido:', value);
  console.log('Question ID:', currentQuestion.value.id);
  
  answers.value[currentQuestion.value.id] = value;
  await saveAnswer(value);
};

const saveAnswer = async (answerText: string) => {
  console.log('=== saveAnswer LLAMADO ===');
  console.log('Enviando al servidor:', answerText);
  
  try {
    await apiClient.post(`/sessions/${props.token}/answer`, {
      questionId: currentQuestion.value.id,
      answer: answerText
    });
    console.log('✅ Guardado exitoso');
  } catch (error) {
    console.error('❌ Error guardando:', error);
  }
};

const runCode = async () => {
  if (!answers.value[currentQuestion.value.id]) {
    toast.error('Escribe algo de código primero');
    return;
  }
  
  isRunning.value = true;
  codeOutput.value = null;
  
  try {
    const result = await apiClient.post('/evaluation/run-code', {
      code: answers.value[currentQuestion.value.id],
      language: currentQuestion.value.language || 'javascript',
      question_id: currentQuestion.value.id
    });
    codeOutput.value = result;
    
  } catch (error: any) {
    codeOutput.value = {
      error: true,
      output: 'Error al ejecutar el código: ' + error.message
    };
  } finally {
    isRunning.value = false;
  }
};

const validateSQL = async () => {
  if (!answers.value[currentQuestion.value.id]) {
    toast.error('Escribe una consulta SQL primero');
    return;
  }
  
  isValidating.value = true;
  sqlResult.value = null;
  
  try {
    const result = await apiClient.post('/evaluation/validate-sql', {
      sql: answers.value[currentQuestion.value.id],
      question_id: currentQuestion.value.id
    });
    sqlResult.value = result;
    
  } catch (error: any) {
    sqlResult.value = {
      error: 'Error al validar SQL: ' + error.message
    };
  } finally {
    isValidating.value = false;
  }
};

const previousQuestion = () => {
  if (currentQuestionIndex.value > 0) {
    currentQuestionIndex.value--;
    resetOutputs();
  }
};

const nextQuestion = () => {
  if (currentQuestionIndex.value < questions.value.length - 1) {
    currentQuestionIndex.value++;
    resetOutputs();
  }
};

const goToQuestion = (index: number) => {
  currentQuestionIndex.value = index;
  resetOutputs();
};

const resetOutputs = () => {
  codeOutput.value = null;
  sqlResult.value = null;
};

const finishTest = () => {
  console.log('finishTest llamado');
  console.log('canFinishTest:', canFinishTest.value);
  console.log('answers:', answers.value);
  showFinishModal.value = true;
  console.log('showFinishModal:', showFinishModal.value);
};

const confirmFinishTest = async () => {
  try {
    loading.value = true;
    
    // Finalizar sesión
    await apiClient.post(`/sessions/${props.token}/finish`);
    
    toast.success('Prueba finalizada correctamente');
    
    // Mostrar página de confirmación
    router.push(`/test/${props.token}/completed`);
    
  } catch (error: any) {
    toast.error('Error al finalizar la prueba: ' + error.message);
  } finally {
    loading.value = false;
    showFinishModal.value = false;
  }
};

const handleTimeUp = async () => {
  toast.warning('Se agotó el tiempo. La prueba se enviará automáticamente.');
  await confirmFinishTest();
};

const handleTimeUpdate = (timeLeft: number) => {
  timeRemaining.value = timeLeft;
  
  // Advertencias de tiempo
  if (timeLeft === 600) { // 10 minutos
    toast.warning('⚠️ Quedan 10 minutos para finalizar la prueba');
  } else if (timeLeft === 300) { // 5 minutos
    toast.warning('⚠️ Quedan 5 minutos para finalizar la prueba');
  }
};

const getQuestionTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    'programming': 'Programación',
    'sql': 'SQL',
    'multiple_choice': 'Selección Múltiple',
    'true_false': 'Verdadero/Falso'
  };
  return labels[type] || type;
};

const formatDescription = (description: string) => {
  return description.replace(/\n/g, '<br>');
};

const formatSchema = (schema: string) => {
  try {
    const parsed = JSON.parse(schema);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return schema;
  }
};

const getQuestionOptions = (question: any) => {
  try {
    return JSON.parse(question.options || '[]');
  } catch {
    return [];
  }
};

// Prevent cheating behaviors
const handleVisibilityChange = () => {
  // Comentado temporalmente para debugging
  // if (document.hidden) {
  //   apiClient.post(`/sessions/${props.token}/log-activity`, {
  //     action: 'tab_switch',
  //     timestamp: new Date().toISOString()
  //   }).catch(() => {});
  // }
};

const handleContextMenu = (e: Event) => {
  e.preventDefault();
};

const handleKeyDown = (e: KeyboardEvent) => {
  // Prevent F12, Ctrl+Shift+I, etc.
  if (e.key === 'F12' || 
      (e.ctrlKey && e.shiftKey && e.key === 'I') ||
      (e.ctrlKey && e.shiftKey && e.key === 'C') ||
      (e.ctrlKey && e.key === 'u')) {
    e.preventDefault();
  }
};

// Lifecycle
onMounted(async () => {
  await loadTestSession();
  
  // Anti-cheating measures
  document.addEventListener('visibilitychange', handleVisibilityChange);
  document.addEventListener('contextmenu', handleContextMenu);
  document.addEventListener('keydown', handleKeyDown);
  
  // Prevent copy/paste in code editors
  nextTick(() => {
    if (codeEditorRef.value && typeof codeEditorRef.value.preventCopyPaste === 'function') {
      codeEditorRef.value.preventCopyPaste();
    }
  });
});

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  document.removeEventListener('contextmenu', handleContextMenu);
  document.removeEventListener('keydown', handleKeyDown);
});
</script>

<style scoped>
.test-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--blanco);
}

.test-header {
  background-color: var(--azul-tritiano);
  color: var(--blanco);
  padding: var(--spacing-3);
  box-shadow: var(--shadow-md);
}

.test-header-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-4);
}

.test-info h1 {
  margin: 0 0 var(--spacing-1) 0;
  font-size: var(--font-size-2xl);
}

.candidate-name {
  margin: 0;
  opacity: 0.9;
  font-size: var(--font-size-base);
}

.test-status {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
}

.timer-container {
  text-align: center;
}

.progress-container {
  text-align: center;
}

.progress-text {
  font-size: var(--font-size-sm);
  margin-bottom: var(--spacing-1);
}

.progress-bar {
  width: 200px;
  height: 8px;
  background-color: rgba(255, 255, 255, 0.3);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: var(--turquesa);
  transition: width var(--transition-base);
}

.test-main {
  flex: 1;
  padding: var(--spacing-4);
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.question-container {
  background-color: var(--blanco);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}

.question-header {
  padding: var(--spacing-4);
  border-bottom: 1px solid #E5E7EB;
}

.question-meta {
  display: flex;
  gap: var(--spacing-2);
  margin-bottom: var(--spacing-2);
}

.question-type {
  background-color: var(--azul-electrico);
  color: var(--blanco);
  padding: 4px var(--spacing-2);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: 500;
}

.question-difficulty {
  padding: 4px var(--spacing-2);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: 500;
}

.question-difficulty.Fácil {
  background-color: #D1FAE5;
  color: #065F46;
}

.question-difficulty.Medio {
  background-color: #FEF3C7;
  color: #92400E;
}

.question-difficulty.Difícil {
  background-color: #FEE2E2;
  color: #991B1B;
}

.question-points {
  background-color: var(--gris);
  color: var(--negro);
  padding: 4px var(--spacing-2);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: 500;
}

.question-title {
  margin: 0;
  font-size: var(--font-size-xl);
  color: var(--azul-tritiano);
}

.question-content {
  padding: var(--spacing-4);
}

.question-description {
  margin-bottom: var(--spacing-4);
  line-height: 1.6;
  font-size: var(--font-size-base);
}

.answer-section {
  margin-top: var(--spacing-4);
}

.programming-question .code-section {
  margin-bottom: var(--spacing-3);
}

.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-2);
}

.language-badge {
  background-color: var(--azul-tritiano);
  color: var(--blanco);
  padding: 4px var(--spacing-2);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: 500;
}

.code-output, .sql-result {
  margin-top: var(--spacing-3);
  padding: var(--spacing-3);
  background-color: var(--gris);
  border-radius: var(--radius-md);
  border-left: 4px solid var(--azul-electrico);
}

.output-content {
  margin: var(--spacing-2) 0 0 0;
  font-family: 'Courier New', monospace;
  font-size: var(--font-size-sm);
  white-space: pre-wrap;
  max-height: 200px;
  overflow-y: auto;
}

.output-content.error {
  color: var(--error);
}

.schema-info {
  margin-bottom: var(--spacing-3);
  padding: var(--spacing-3);
  background-color: var(--gris);
  border-radius: var(--radius-md);
}

.schema-content {
  font-family: 'Courier New', monospace;
  font-size: var(--font-size-sm);
  margin: var(--spacing-2) 0 0 0;
}

.sql-editor {
  margin-bottom: var(--spacing-3);
}

.multiple-choice-question .options-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.option-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-3);
  border: 1px solid #E5E7EB;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-base);
}

.option-item:hover {
  background-color: var(--gris);
  border-color: var(--azul-electrico);
}

.option-item input[type="radio"] {
  margin: 0;
}

.option-text {
  flex: 1;
  font-size: var(--font-size-base);
}

.test-footer {
  background-color: var(--blanco);
  border-top: 1px solid #E5E7EB;
  padding: var(--spacing-3);
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
}

.navigation-buttons {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-3);
}

.question-nav {
  display: flex;
  gap: var(--spacing-1);
  flex-wrap: wrap;
}

.question-nav-btn {
  width: 40px;
  height: 40px;
  border: 2px solid #E5E7EB;
  background-color: var(--blanco);
  color: var(--negro);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 500;
  transition: all var(--transition-base);
}

.question-nav-btn:hover {
  border-color: var(--azul-electrico);
}

.question-nav-btn.active {
  background-color: var(--azul-electrico);
  color: var(--blanco);
  border-color: var(--azul-electrico);
}

.question-nav-btn.answered {
  background-color: var(--turquesa);
  color: var(--blanco);
  border-color: var(--turquesa);
}

.question-nav-btn.answered.active {
  background-color: var(--azul-tritiano);
  border-color: var(--azul-tritiano);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-content {
  background-color: var(--blanco);
  padding: var(--spacing-4);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  max-width: 400px;
  width: 90%;
  text-align: center;
}

.modal-content h3 {
  margin-bottom: var(--spacing-3);
  color: var(--azul-tritiano);
}

.modal-content p {
  margin-bottom: var(--spacing-4);
  color: #6B7280;
}

.modal-actions {
  display: flex;
  gap: var(--spacing-2);
  justify-content: center;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.loading-overlay p {
  margin-top: var(--spacing-3);
  font-size: var(--font-size-lg);
  color: var(--azul-tritiano);
}

.success {
  color: var(--success);
  font-weight: 500;
}

.error {
  color: var(--error);
  font-weight: 500;
}

/* Responsive */
@media (max-width: 768px) {
  .test-header-content {
    flex-direction: column;
    gap: var(--spacing-3);
  }
  
  .test-status {
    flex-direction: column;
    gap: var(--spacing-2);
  }
  
  .navigation-buttons {
    flex-direction: column;
    gap: var(--spacing-2);
  }
  
  .question-nav {
    order: -1;
  }
}
</style>