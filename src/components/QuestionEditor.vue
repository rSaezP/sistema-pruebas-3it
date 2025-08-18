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
          <LanguageSelector
            id="language"
            v-model="questionData.language"
            :required="true"
          />
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
        <TestCaseEditor
          :test-cases="questionData.test_cases"
          @update:test-cases="updateTestCases"
        />
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
import LanguageSelector from './LanguageSelector.vue'
import TestCaseEditor from './TestCaseEditor.vue'

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
const updateTestCases = (newTestCases: any[]) => {
  questionData.value.test_cases = newTestCases
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
    
    // Add default test case ONLY for new programming questions
    if (questionData.value.type === 'programming' && questionData.value.test_cases.length === 0 && !props.isEditing) {
      questionData.value.test_cases = [{
        id: crypto.randomUUID(),
        name: 'Caso 1',
        input_data: '',
        expected_output: '',
        is_hidden: false,
        weight: 1.0,
        timeout_ms: 5000
      }]
    }
  }
}, { immediate: true })

// Lifecycle
onMounted(() => {
  // Initialize with default test case for programming questions ONLY on mount
  if (questionData.value.type === 'programming' && questionData.value.test_cases.length === 0) {
    questionData.value.test_cases = [{
      id: crypto.randomUUID(),
      name: 'Caso 1',
      input_data: '',
      expected_output: '',
      is_hidden: false,
      weight: 1.0,
      timeout_ms: 5000
    }]
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

/* Test Cases - Now handled by TestCaseEditor component */

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

/* Empty States - Now handled by TestCaseEditor component */

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