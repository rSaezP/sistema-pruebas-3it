<template>
  <div class="question-editor">
    <form @submit.prevent="saveQuestion">
      <!-- Common Fields -->
      <div class="form-section">
        <h4>Información General</h4>
        
        <div class="form-group">
          <label for="title">Título de la Pregunta *</label>
          <input 
            id="title"
            v-model="questionData.title"
            type="text" 
            required
            placeholder="Ej: Implementar función de suma"
            class="input"
          >
        </div>

        <div class="form-group">
          <label for="description">Descripción *</label>
          <textarea 
            id="description"
            v-model="questionData.description"
            rows="4"
            required
            placeholder="Describe claramente qué debe hacer el candidato"
            class="input textarea"
          ></textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="difficulty">Dificultad *</label>
            <select id="difficulty" v-model="questionData.difficulty" class="input select">
              <option value="Fácil">Fácil</option>
              <option value="Medio">Medio</option>
              <option value="Difícil">Difícil</option>
            </select>
          </div>

          <div class="form-group">
            <label for="max_score">Puntuación Máxima *</label>
            <input 
              id="max_score"
              v-model.number="questionData.max_score"
              type="number" 
              min="1"
              required
              class="input"
            >
          </div>
        </div>
      </div>

      <!-- Programming Question -->
      <div v-if="questionData.type === 'programming'" class="form-section">
        <h4>Configuración de Programación</h4>
        
        <div class="form-group">
          <label for="language">Lenguaje de Programación *</label>
          <select id="language" v-model="questionData.language" class="input select">
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="csharp">C#</option>
            <option value="cpp">C++</option>
            <option value="typescript">TypeScript</option>
          </select>
        </div>

        <div class="form-group">
          <label for="initial_code">Código Inicial (opcional)</label>
          <CodeEditor
            ref="codeEditorRef"
            :language="questionData.language"
            v-model="questionData.initial_code"
            :height="200"
          />
          <small class="form-help">Código que aparecerá por defecto en el editor del candidato</small>
        </div>

        <!-- Test Cases -->
        <div class="test-cases-section">
          <div class="section-header">
            <h5>Casos de Prueba</h5>
            <button 
              type="button" 
              @click="addTestCase" 
              class="btn btn-secondary btn-sm"
            >
              + Agregar Caso
            </button>
          </div>

          <div 
            v-for="(testCase, index) in questionData.test_cases" 
            :key="index"
            class="test-case-card"
          >
            <div class="test-case-header">
              <span class="test-case-number">Caso {{ index + 1 }}</span>
              <button 
                type="button" 
                @click="removeTestCase(index)" 
                class="btn-icon delete"
                :disabled="questionData.test_cases.length <= 1"
              >
                🗑️
              </button>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label>Nombre del Caso</label>
                <input 
                  v-model="testCase.name"
                  type="text" 
                  placeholder="Ej: Caso básico"
                  class="input"
                >
              </div>
              
              <div class="form-group">
                <label>Peso</label>
                <input 
                  v-model.number="testCase.weight"
                  type="number" 
                  min="0.1"
                  step="0.1"
                  class="input"
                >
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Datos de Entrada</label>
                <textarea 
                  v-model="testCase.input_data"
                  rows="3"
                  placeholder="Datos de entrada (ej: [1, 2, 3])"
                  class="input textarea"
                ></textarea>
              </div>
              
              <div class="form-group">
                <label>Salida Esperada</label>
                <textarea 
                  v-model="testCase.expected_output"
                  rows="3"
                  placeholder="Resultado esperado (ej: 6)"
                  class="input textarea"
                ></textarea>
              </div>
            </div>

            <div class="form-group">
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  v-model="testCase.is_hidden"
                >
                Caso oculto (no visible para el candidato)
              </label>
            </div>
          </div>

          <div v-if="questionData.test_cases.length === 0" class="empty-state">
            <p>Aún no has agregado casos de prueba.</p>
            <button type="button" @click="addTestCase" class="btn btn-primary">
              Agregar Primer Caso
            </button>
          </div>
        </div>
      </div>

      <!-- SQL Question -->
      <div v-if="questionData.type === 'sql'" class="form-section">
        <h4>Configuración de SQL</h4>
        
        <div class="form-group">
          <label for="database_schema">Esquema de Base de Datos</label>
          <textarea 
            id="database_schema"
            v-model="questionData.database_schema"
            rows="8"
            placeholder="Describe las tablas y su estructura (ej: JSON o texto descriptivo)"
            class="input textarea"
          ></textarea>
          <small class="form-help">
            Describe las tablas disponibles, sus columnas y relaciones
          </small>
        </div>

        <div class="form-group">
          <label for="correct_answer">Consulta SQL Correcta</label>
          <CodeEditor
            ref="sqlEditorRef"
            language="sql"
            v-model="questionData.correct_answer"
            :height="150"
          />
          <small class="form-help">
            Consulta SQL que representa la respuesta correcta (para validación)
          </small>
        </div>
      </div>

      <!-- Multiple Choice Question -->
      <div v-if="questionData.type === 'multiple_choice'" class="form-section">
        <h4>Opciones de Respuesta</h4>
        
        <div 
          v-for="(option, index) in questionData.options" 
          :key="index"
          class="option-card"
        >
          <div class="option-header">
            <span class="option-label">Opción {{ String.fromCharCode(65 + index) }}</span>
            <label class="checkbox-label">
              <input 
                type="radio" 
                :name="'correct-option'"
                :value="index"
                @change="setCorrectOption(index)"
                :checked="option.correct"
              >
              Respuesta correcta
            </label>
          </div>
          
          <div class="form-group">
            <input 
              v-model="option.text"
              type="text" 
              :placeholder="`Texto de la opción ${String.fromCharCode(65 + index)}`"
              class="input"
              required
            >
          </div>
        </div>

        <div class="options-info">
          <small class="form-help">
            Selecciona cuál es la respuesta correcta marcando el radio button correspondiente
          </small>
        </div>
      </div>

      <!-- Actions -->
      <div class="form-actions">
        <button type="button" @click="$emit('cancel')" class="btn btn-secondary">
          Cancelar
        </button>
        <button type="submit" class="btn btn-primary" :disabled="!isValid">
          {{ isEditing ? 'Actualizar' : 'Guardar' }} Pregunta
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import CodeEditor from './CodeEditor.vue'

// Props
const props = defineProps<{
  modelValue: any
  isEditing?: boolean
}>()

// Emits
const emit = defineEmits(['update:modelValue', 'save', 'cancel'])

// Refs
const codeEditorRef = ref()
const sqlEditorRef = ref()

// Reactive data
const questionData = ref({
  tempId: '',
  type: 'programming',
  title: '',
  description: '',
  difficulty: 'Medio',
  max_score: 10,
  language: 'javascript',
  initial_code: '',
  database_schema: '',
  options: [
    { text: '', correct: false },
    { text: '', correct: false },
    { text: '', correct: false },
    { text: '', correct: false }
  ],
  correct_answer: '',
  test_cases: []
})

// Computed
const isValid = computed(() => {
  const base = questionData.value.title.trim() && questionData.value.description.trim()
  
  if (questionData.value.type === 'programming') {
    return base && questionData.value.test_cases.length > 0
  } else if (questionData.value.type === 'sql') {
    return base && questionData.value.correct_answer.trim()
  } else if (questionData.value.type === 'multiple_choice') {
    const hasAllOptions = questionData.value.options.every((opt: any) => opt.text.trim())
    const hasCorrectAnswer = questionData.value.options.some((opt: any) => opt.correct)
    return base && hasAllOptions && hasCorrectAnswer
  }
  
  return base
})

// Methods
const addTestCase = () => {
  questionData.value.test_cases.push({
    name: `Caso ${questionData.value.test_cases.length + 1}`,
    input_data: '',
    expected_output: '',
    is_hidden: false,
    weight: 1.0,
    timeout_ms: 5000
  })
}

const removeTestCase = (index: number) => {
  questionData.value.test_cases.splice(index, 1)
}

const setCorrectOption = (index: number) => {
  questionData.value.options.forEach((option: any, i: number) => {
    option.correct = i === index
  })
}

const saveQuestion = () => {
  if (!isValid.value) return
  
  // Prepare question data
  const questionToSave = { ...questionData.value }
  
  // Convert options to JSON string for storage
  if (questionToSave.type === 'multiple_choice') {
    questionToSave.options = JSON.stringify(questionToSave.options)
  }
  
  emit('save', questionToSave)
}

// Watchers
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    questionData.value = { ...newValue }
    
    // Parse options if it's a string
    if (questionData.value.type === 'multiple_choice' && typeof questionData.value.options === 'string') {
      try {
        questionData.value.options = JSON.parse(questionData.value.options)
      } catch {
        questionData.value.options = [
          { text: '', correct: false },
          { text: '', correct: false },
          { text: '', correct: false },
          { text: '', correct: false }
        ]
      }
    }
    
    // Ensure test_cases is an array
    if (!Array.isArray(questionData.value.test_cases)) {
      questionData.value.test_cases = []
    }
    
    // Add default test case for programming questions if none exist
    if (questionData.value.type === 'programming' && questionData.value.test_cases.length === 0) {
      addTestCase()
    }
  }
}, { immediate: true, deep: true })

// Lifecycle
onMounted(() => {
  // Initialize with default test case for programming questions
  if (questionData.value.type === 'programming' && questionData.value.test_cases.length === 0) {
    addTestCase()
  }
})
</script>

<style scoped>
.question-editor {
  max-width: 800px;
  margin: 0 auto;
}

.form-section {
  background: var(--gris);
  border-radius: var(--radius-lg);
  padding: var(--spacing-4);
  margin-bottom: var(--spacing-4);
}

.form-section h4 {
  color: var(--azul-tritiano);
  margin: 0 0 var(--spacing-3) 0;
  font-size: var(--font-size-lg);
  border-bottom: 1px solid #E5E7EB;
  padding-bottom: var(--spacing-2);
}

.form-group {
  margin-bottom: var(--spacing-3);
}

.form-group label {
  display: block;
  margin-bottom: var(--spacing-1);
  font-weight: 600;
  color: var(--azul-tritiano);
  font-size: var(--font-size-sm);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-3);
}

.form-help {
  display: block;
  margin-top: var(--spacing-1);
  font-size: var(--font-size-xs);
  color: #6B7280;
  font-style: italic;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  font-weight: normal;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"],
.checkbox-label input[type="radio"] {
  margin: 0;
}

/* Test Cases */
.test-cases-section {
  margin-top: var(--spacing-4);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-3);
}

.section-header h5 {
  color: var(--azul-tritiano);
  margin: 0;
  font-size: var(--font-size-base);
}

.test-case-card {
  background: var(--blanco);
  border: 1px solid #E5E7EB;
  border-radius: var(--radius-lg);
  padding: var(--spacing-3);
  margin-bottom: var(--spacing-3);
}

.test-case-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-3);
  padding-bottom: var(--spacing-2);
  border-bottom: 1px solid #E5E7EB;
}

.test-case-number {
  font-weight: 600;
  color: var(--azul-tritiano);
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  padding: var(--spacing-1);
  border-radius: var(--radius-sm);
  transition: all var(--transition-base);
}

.btn-icon:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.1);
}

.btn-icon.delete:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.1);
}

.btn-icon:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Options */
.option-card {
  background: var(--blanco);
  border: 1px solid #E5E7EB;
  border-radius: var(--radius-lg);
  padding: var(--spacing-3);
  margin-bottom: var(--spacing-3);
}

.option-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-2);
}

.option-label {
  font-weight: 600;
  color: var(--azul-tritiano);
}

.options-info {
  text-align: center;
  margin-top: var(--spacing-3);
  padding: var(--spacing-2);
  background: #EFF6FF;
  border-radius: var(--radius-md);
}

/* Empty States */
.empty-state {
  text-align: center;
  padding: var(--spacing-5);
  color: #6B7280;
}

.empty-state p {
  margin-bottom: var(--spacing-3);
}

/* Form Actions */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-2);
  margin-top: var(--spacing-4);
  padding-top: var(--spacing-3);
  border-top: 1px solid #E5E7EB;
}

/* Responsive */
@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .section-header {
    flex-direction: column;
    gap: var(--spacing-2);
    align-items: stretch;
  }
  
  .test-case-header,
  .option-header {
    flex-direction: column;
    gap: var(--spacing-2);
    align-items: stretch;
  }
  
  .form-actions {
    flex-direction: column;
  }
}
</style>