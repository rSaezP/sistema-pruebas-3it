<template>
  <div class="create-test">
    <div class="header">
      <h1>Nueva Prueba Técnica</h1>
      <button @click="goBack" class="btn-back">
        ← Volver a la lista
      </button>
    </div>

    <!-- Stepper -->
    <div class="stepper">
      <div class="step" :class="{ active: currentStep === 1, completed: currentStep > 1 }">
        <div class="step-number">1</div>
        <div class="step-label">Información Básica</div>
      </div>
      <div class="step" :class="{ active: currentStep === 2, completed: currentStep > 2 }">
        <div class="step-number">2</div>
        <div class="step-label">Agregar Preguntas</div>
      </div>
      <div class="step" :class="{ active: currentStep === 3 }">
        <div class="step-number">3</div>
        <div class="step-label">Revisar y Guardar</div>
      </div>
    </div>

    <!-- Step 1: Basic Information -->
    <div v-if="currentStep === 1" class="step-content">
      <div class="form-container">
        <form @submit.prevent="nextStep" class="test-form">
          <div class="form-group">
            <label for="name">Nombre de la Prueba *</label>
            <input 
              id="name"
              v-model="testData.name"
              type="text" 
              required
              placeholder="Ej: Prueba de JavaScript Avanzado"
            >
          </div>

          <div class="form-group">
            <label for="description">Descripción</label>
            <textarea 
              id="description"
              v-model="testData.description"
              rows="3"
              placeholder="Describe el propósito y alcance de la prueba"
            ></textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="time_limit">Tiempo Límite (minutos) *</label>
              <input 
                id="time_limit"
                v-model.number="testData.time_limit"
                type="number" 
                min="1"
                required
              >
            </div>

            <div class="form-group">
              <label for="passing_score">Puntaje Mínimo (%)</label>
              <input 
                id="passing_score"
                v-model.number="testData.passing_score"
                type="number" 
                min="0"
                max="100"
              >
            </div>
          </div>

          <div class="form-group">
            <label>Estado</label>
            <div class="switch-container">
              <label class="switch">
                <input 
                  v-model="testData.is_active"
                  type="checkbox"
                >
                <span class="slider round"></span>
              </label>
              <span class="switch-label">
                {{ testData.is_active ? 'Activa' : 'Inactiva' }}
              </span>
            </div>
          </div>

          <div class="step-actions">
            <button type="button" class="btn btn-secondary" @click="goBack">
              Cancelar
            </button>
            <button type="submit" class="btn btn-primary">
              Siguiente: Agregar Preguntas →
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Step 2: Add Questions -->
    <div v-if="currentStep === 2" class="step-content">
      <div class="questions-section">
        <div class="questions-header">
          <div class="questions-header-left">
            <h2>Preguntas de la Prueba</h2>
            <div v-if="testData.questions.length > 0" class="questions-progress">
              {{ savedQuestionsCount }} de {{ testData.questions.length }} preguntas guardadas
            </div>
          </div>
          <div class="questions-actions">
            <!-- Componente de importación masiva -->
            <BulkQuestionImporter
              @questionsImported="handleBulkImport"
              style="margin-right: var(--spacing-2);"
            />
            
            <select v-model="newQuestionType" class="question-type-select">
              <option value="">Seleccionar tipo de pregunta</option>
              <option value="programming">Programación</option>
              <option value="sql">SQL</option>
              <option value="multiple_choice">Selección Múltiple</option>
            </select>
            <button 
              @click="addQuestion" 
              class="btn btn-primary btn-sm"
              :disabled="!newQuestionType"
            >
              + Agregar Pregunta
            </button>
          </div>
        </div>

        <!-- Questions List - Inline Editing -->
        <div class="questions-list">
          <div 
            v-for="(question, index) in testData.questions" 
            :key="question.tempId"
            class="question-form-card"
          >
            <div class="question-form-header">
              <div class="question-info">
                <span class="question-number">{{ index + 1 }}</span>
                <span class="question-type-badge" :class="question.type">
                  {{ getQuestionTypeLabel(question.type) }}
                </span>
                <span 
                  class="question-status-indicator"
                  :class="isQuestionSaved(question.tempId) ? 'saved-indicator' : 'unsaved-indicator'"
                >
                  <svg v-if="isQuestionSaved(question.tempId)" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 12L11 14L15 10"/>
                    <circle cx="12" cy="12" r="10"/>
                  </svg>
                  <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12,6 12,12 16,14"/>
                  </svg>
                  {{ isQuestionSaved(question.tempId) ? ' Guardada' : ' Sin guardar' }}
                </span>
              </div>
              <button @click="deleteQuestion(question.tempId)" class="btn-icon delete">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
              </button>
            </div>
            
            <!-- Inline Question Editor -->
            <div class="question-form-content">
              <QuestionEditor
                :modelValue="testData.questions[index]"
                :isEditing="true"
                :hideActions="true"
                @update:modelValue="updateQuestionData(index, $event)"
              />
              
              <!-- Save Question Actions -->
              <div class="question-save-actions">
                <button 
                  @click="saveQuestion(index)"
                  class="btn btn-sm"
                  :class="isQuestionSaved(question.tempId) ? 'btn-success' : 'btn-primary'"
                  :disabled="isQuestionSaved(question.tempId)"
                >
                  <span v-if="isQuestionSaved(question.tempId)">✓ Pregunta Guardada</span>
                  <span v-else>✓ Guardar Pregunta</span>
                </button>
              </div>
            </div>
          </div>

          <div v-if="testData.questions.length === 0" class="empty-questions">
            <p>Aún no has agregado preguntas a esta prueba.</p>
            <p>Selecciona un tipo de pregunta y haz clic en "Agregar Pregunta" para comenzar.</p>
          </div>
        </div>

        <div class="step-actions">
          <button @click="currentStep = 1" class="btn btn-secondary">
            ← Volver a Información Básica
          </button>
          <button 
            @click="nextStep" 
            class="btn btn-primary"
            :disabled="testData.questions.length === 0 || !allQuestionsAreSaved"
          >
            Siguiente: Revisar →
          </button>
        </div>
      </div>
    </div>

    <!-- Step 3: Review and Save -->
    <div v-if="currentStep === 3" class="step-content">
      <div class="review-section">
        <h2>Revisar Prueba Técnica</h2>
        
        <div class="review-card">
          <h3>Información General</h3>
          <div class="review-item">
            <strong>Nombre:</strong> {{ testData.name }}
          </div>
          <div class="review-item">
            <strong>Descripción:</strong> {{ testData.description || 'Sin descripción' }}
          </div>
          <div class="review-item">
            <strong>Tiempo límite:</strong> {{ testData.time_limit }} minutos
          </div>
          <div class="review-item">
            <strong>Puntaje mínimo:</strong> {{ testData.passing_score }}%
          </div>
          <div class="review-item">
            <strong>Estado:</strong> {{ testData.is_active ? 'Activa' : 'Inactiva' }}
          </div>
        </div>

        <div class="review-card">
          <h3>Preguntas ({{ testData.questions.length }})</h3>
          <div class="questions-summary">
            <div 
              v-for="(question, index) in testData.questions" 
              :key="question.tempId"
              class="question-summary"
            >
              <div class="summary-header">
                <span class="question-number">{{ index + 1 }}.</span>
                <span class="question-title">{{ question.title }}</span>
                <span class="question-type-badge" :class="question.type">
                  {{ getQuestionTypeLabel(question.type) }}
                </span>
                <span class="question-points">{{ question.max_score }} pts</span>
              </div>
            </div>
          </div>
          
          <div class="total-score">
            <strong>Puntaje total: {{ getTotalMaxScore() }} puntos</strong>
          </div>
        </div>

        <div class="step-actions">
          <button @click="currentStep = 2" class="btn btn-secondary">
            ← Volver a Preguntas
          </button>
          <button 
            @click="saveTest" 
            class="btn btn-success"
            :disabled="loading"
          >
            <span v-if="loading">Guardando...</span>
            <span v-else>✓ Guardar Prueba</span>
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import QuestionEditor from '../../components/QuestionEditor.vue'
import BulkQuestionImporter from '../../components/BulkQuestionImporter.vue'
import type { ParsedQuestion } from '@/utils/questionParser'

// Router and Toast
const router = useRouter()
const toast = useToast()

// State
const currentStep = ref(1)
const loading = ref(false)
const newQuestionType = ref('')
const savedQuestionIds = ref([])

// Test data
const testData = ref({
  name: '',
  description: '',
  time_limit: 60,
  passing_score: 60,
  is_active: true,
  questions: [] as any[]
})

// Computed properties for reactivity
const isQuestionSaved = (tempId: string) => {
  return savedQuestionIds.value.includes(tempId)
}

const savedQuestionsCount = computed(() => savedQuestionIds.value.length)

const allQuestionsAreSaved = computed(() => {
  return testData.value.questions.every(q => savedQuestionIds.value.includes(q.tempId))
})

// Methods (not computed to avoid reactive loops)
const getTotalMaxScore = () => {
  return testData.value.questions.reduce((total, q) => total + (q.max_score || 0), 0)
}

// Methods
const goBack = () => {
  router.push('/admin/tests')
}

// Question validation and saving functions
const isQuestionValid = (question: any) => {
  if (!question.title?.trim()) return false
  
  switch (question.type) {
    case 'programming':
      return question.test_cases?.length > 0 && question.expected_solution?.trim()
    case 'multiple_choice':
      const options = question.options || []
      return options.length >= 2 && options.some((opt: any) => opt.correct && opt.text?.trim())
    case 'sql':
      return !!question.title?.trim()
    default:
      return true
  }
}

const saveQuestion = (index: number) => {
  console.log('BOTÓN CLICKEADO - Index:', index)
  const question = testData.value.questions[index]
  
  if (!question) {
    console.log('ERROR: No se encontró pregunta en index', index)
    return
  }
  
  console.log('Pregunta encontrada:', question.tempId, question.title)
  
  // Simplificar validación al mínimo
  if (question.title && question.title.trim()) {
    savedQuestionIds.value.push(question.tempId)
    toast.success(`Pregunta ${index + 1} guardada`)
    console.log('Pregunta guardada exitosamente')
  } else {
    toast.error('El título es requerido')
    console.log('Título vacío')
  }
}

const nextStep = () => {
  if (currentStep.value === 2 && !allQuestionsAreSaved.value) {
    toast.error('Debes guardar todas las preguntas antes de continuar')
    return
  }
  if (currentStep.value < 3) {
    currentStep.value++
  }
}

const addQuestion = () => {
  if (!newQuestionType.value) return
  
  const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  const newQuestion = {
    tempId,
    type: newQuestionType.value,
    title: '',
    description: '',
    difficulty: 'Medio',
    max_score: 10,
    language: 'javascript',
    initial_code: '',
    expected_solution: '',
    database_schema: '',
    options: newQuestionType.value === 'multiple_choice' ? [
      { text: '', correct: false },
      { text: '', correct: false },
      { text: '', correct: false },
      { text: '', correct: false }
    ] : [],
    correct_answer: '',
    test_cases: newQuestionType.value === 'programming' ? [{
      id: crypto.randomUUID(),
      name: 'Caso 1',
      input_data: '',
      expected_output: '',
      is_hidden: false,
      weight: 1.0,
      timeout_ms: 5000
    }] : []
  }
  
  testData.value.questions.push(newQuestion)
  newQuestionType.value = ''
  toast.success('Pregunta agregada')
}

const updateQuestionData = (index: number, questionData: any) => {
  // Update without triggering reactive loops
  Object.assign(testData.value.questions[index], questionData)
}

const deleteQuestion = (tempId: string) => {
  if (confirm('¿Estás seguro de que quieres eliminar esta pregunta?')) {
    testData.value.questions = testData.value.questions.filter(q => q.tempId !== tempId)
    const index = savedQuestionIds.value.indexOf(tempId)
    if (index > -1) {
      savedQuestionIds.value.splice(index, 1)
    }
    toast.success('Pregunta eliminada')
  }
}

// Manejar importación masiva de preguntas
const handleBulkImport = (importedQuestions: ParsedQuestion[]) => {
  // Convertir las preguntas importadas al formato interno
  const convertedQuestions = importedQuestions.map(q => ({
    tempId: `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: q.type,
    title: q.title,
    description: q.description,
    difficulty: q.difficulty,
    max_score: q.max_score,
    language: q.language,
    initial_code: '',
    expected_solution: '',
    database_schema: '',
    execution_timeout: q.time_limit_minutes * 60 * 1000, // Convertir minutos a milisegundos
    allow_partial_credit: true,
    show_expected_output: false,
    options: q.options,
    correct_answer: q.correct_answer,
    test_cases: []
  }))

  // Agregar las preguntas al test
  testData.value.questions.push(...convertedQuestions)
  
  toast.success(`Se importaron ${importedQuestions.length} preguntas correctamente`)
}


const saveTest = async () => {
  if (loading.value) return
  
  loading.value = true
  
  try {
    // Prepare test data
    const testPayload = {
      ...testData.value,
      created_by: 'admin' // TODO: Get from auth store
    }
    
    // Create test
    const testResponse = await fetch('/api/tests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    })
    
    if (!testResponse.ok) {
      const errorData = await testResponse.json()
      throw new Error(errorData.message || 'Error al crear la prueba')
    }
    
    const createdTest = await testResponse.json()
    
    // Save questions
    for (const question of testData.value.questions) {
      const questionPayload = {
        ...question,
        test_id: createdTest.test.id,
        category_id: 1, // Default category
        family_id: 1,   // Default family
        order_index: testData.value.questions.indexOf(question)
      }
      
      // Remove temp fields
      delete questionPayload.tempId
      
      const questionResponse = await fetch('/api/tests/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(questionPayload)
      })
      
      if (!questionResponse.ok) {
        console.error('Error saving question:', question.title)
      } else {
        const savedQuestion = await questionResponse.json()
        
        // Save test cases for programming questions
        if (question.test_cases && question.test_cases.length > 0) {
          for (const testCase of question.test_cases) {
            await fetch('/api/tests/test-cases', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                ...testCase,
                question_id: savedQuestion.question.id
              })
            })
          }
        }
      }
    }
    
    // Success
    
    toast.success('Prueba creada exitosamente')
    router.push('/admin/tests')
    
  } catch (error: any) {
    toast.error(error.message || 'Error al guardar la prueba')
    console.error('Error saving test:', error)
  } finally {
    loading.value = false
  }
}

const getQuestionTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    'programming': 'Programación',
    'sql': 'SQL',
    'multiple_choice': 'Selección Múltiple',
    'true_false': 'Verdadero/Falso'
  }
  return labels[type] || type
}

const getQuestionOptions = (question: any) => {
  try {
    return typeof question.options === 'string' 
      ? JSON.parse(question.options) 
      : question.options || []
  } catch {
    return []
  }
}

// No autosave to prevent conflicts
// onMounted(() => {
//   // Autosave disabled temporarily
// })
</script>

<style scoped>
.create-test {
  padding: var(--spacing-4);
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-4);
  padding-bottom: var(--spacing-3);
  border-bottom: 2px solid var(--gris);
}

.header h1 {
  color: var(--azul-tritiano);
  font-size: var(--font-size-3xl);
  margin: 0;
}

.btn-back {
  background: transparent;
  color: var(--azul-electrico);
  border: 1px solid var(--azul-electrico);
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: var(--radius-md);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-base);
}

.btn-back:hover {
  background: var(--azul-electrico);
  color: var(--blanco);
}

/* Stepper */
.stepper {
  display: flex;
  justify-content: center;
  margin-bottom: var(--spacing-5);
  position: relative;
}

.stepper::before {
  content: '';
  position: absolute;
  top: 20px;
  left: 20%;
  right: 20%;
  height: 2px;
  background: #E5E7EB;
  z-index: 1;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  max-width: 200px;
  position: relative;
  z-index: 2;
}

.step-number {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #E5E7EB;
  color: #6B7280;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  margin-bottom: var(--spacing-2);
  transition: all var(--transition-base);
}

.step.active .step-number {
  background: var(--azul-electrico);
  color: var(--blanco);
}

.step.completed .step-number {
  background: var(--turquesa);
  color: var(--blanco);
}

.step-label {
  font-size: var(--font-size-sm);
  color: #6B7280;
  font-weight: 500;
  text-align: center;
}

.step.active .step-label {
  color: var(--azul-electrico);
  font-weight: 600;
}

/* Step Content */
.step-content {
  min-height: 500px;
}

.form-container {
  background: var(--blanco);
  border-radius: var(--radius-lg);
  padding: var(--spacing-5);
  box-shadow: var(--shadow-md);
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

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: var(--spacing-2);
  border: 1px solid #D1D5DB;
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  transition: border-color var(--transition-base);
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--azul-electrico);
  box-shadow: 0 0 0 3px rgba(0, 90, 238, 0.1);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-3);
}

.switch-container {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  margin-top: var(--spacing-1);
}

.switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 26px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
  border-radius: 34px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: var(--azul-electrico);
}

input:checked + .slider:before {
  transform: translateX(24px);
}

.switch-label {
  font-weight: 500;
  color: var(--negro);
}

/* Questions Section */
.questions-section {
  background: var(--blanco);
  border-radius: var(--radius-lg);
  padding: var(--spacing-5);
  box-shadow: var(--shadow-md);
}

/* Question Form Cards */
.question-form-card {
  border: 2px solid #E5E7EB;
  border-radius: var(--radius-lg);
  margin-bottom: var(--spacing-4);
  overflow: hidden;
  transition: all var(--transition-base);
}

.question-form-card:hover {
  box-shadow: var(--shadow-lg);
  border-color: var(--azul-electrico);
}

.question-form-header {
  background: var(--gris);
  padding: var(--spacing-3);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #E5E7EB;
}

.question-form-content {
  padding: var(--spacing-4);
  background: var(--blanco);
}


.questions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-4);
  padding-bottom: var(--spacing-3);
  border-bottom: 1px solid #E5E7EB;
}

.questions-header h2 {
  color: var(--azul-tritiano);
  margin: 0;
}

.questions-actions {
  display: flex;
  gap: var(--spacing-2);
  align-items: center;
}

.question-type-select {
  min-width: 200px;
}

.questions-list {
  margin-bottom: var(--spacing-4);
}

.question-card {
  border: 1px solid #E5E7EB;
  border-radius: var(--radius-lg);
  margin-bottom: var(--spacing-3);
  overflow: hidden;
  transition: all var(--transition-base);
}

.question-card:hover {
  box-shadow: var(--shadow-md);
}

.question-header {
  background: var(--gris);
  padding: var(--spacing-3);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.question-info {
  display: flex;
  gap: var(--spacing-2);
  align-items: center;
}

.question-number {
  background: var(--azul-tritiano);
  color: var(--blanco);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.question-type-badge {
  padding: 4px var(--spacing-2);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: 500;
  color: var(--blanco);
}

.question-type-badge.programming {
  background: var(--azul-electrico);
}

.question-type-badge.sql {
  background: var(--turquesa);
}

.question-type-badge.multiple_choice {
  background: #10B981;
}

.question-difficulty {
  padding: 4px var(--spacing-2);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: 500;
}

.question-difficulty.Fácil {
  background: #D1FAE5;
  color: #065F46;
}

.question-difficulty.Medio {
  background: #FEF3C7;
  color: #92400E;
}

.question-difficulty.Difícil {
  background: #FEE2E2;
  color: #991B1B;
}

.question-points {
  background: var(--blanco);
  color: var(--azul-tritiano);
  padding: 4px var(--spacing-2);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: 500;
  border: 1px solid #E5E7EB;
}

.question-actions {
  display: flex;
  gap: var(--spacing-1);
}

.btn-icon {
  background: none;
  border: none;
  padding: var(--spacing-1);
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: #6B7280;
  transition: all var(--transition-base);
}

.btn-icon:hover {
  background: rgba(0, 0, 0, 0.1);
  color: var(--azul-tritiano);
}

.btn-icon.delete:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #EF4444;
}

.question-content {
  padding: var(--spacing-3);
}

.question-content h4 {
  margin: 0 0 var(--spacing-2) 0;
  color: var(--azul-tritiano);
}

.question-description {
  color: #6B7280;
  margin-bottom: var(--spacing-3);
}

.code-preview,
.sql-preview {
  background: var(--gris);
  padding: var(--spacing-3);
  border-radius: var(--radius-md);
  margin-top: var(--spacing-2);
}

.language-badge {
  background: var(--azul-tritiano);
  color: var(--blanco);
  padding: 2px var(--spacing-1);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: 500;
  margin-bottom: var(--spacing-2);
  display: inline-block;
}

.initial-code {
  background: var(--blanco);
  padding: var(--spacing-2);
  border-radius: var(--radius-sm);
  font-family: 'Courier New', monospace;
  font-size: var(--font-size-sm);
  border: 1px solid #E5E7EB;
  margin: var(--spacing-2) 0;
}

.options-preview {
  margin-top: var(--spacing-2);
}

.option-item {
  padding: var(--spacing-2);
  margin-bottom: var(--spacing-1);
  background: var(--gris);
  border-radius: var(--radius-sm);
}

.option-item.correct {
  background: #D1FAE5;
  color: #065F46;
  font-weight: 500;
}

.empty-questions {
  text-align: center;
  padding: var(--spacing-5);
  color: #6B7280;
}

/* Review Section */
.review-section {
  background: var(--blanco);
  border-radius: var(--radius-lg);
  padding: var(--spacing-5);
  box-shadow: var(--shadow-md);
}

.review-section h2 {
  color: var(--azul-tritiano);
  margin-bottom: var(--spacing-4);
}

.review-card {
  background: var(--gris);
  border-radius: var(--radius-lg);
  padding: var(--spacing-4);
  margin-bottom: var(--spacing-4);
}

.review-card h3 {
  color: var(--azul-tritiano);
  margin-bottom: var(--spacing-3);
}

.review-item {
  margin-bottom: var(--spacing-2);
  padding-bottom: var(--spacing-2);
  border-bottom: 1px solid #E5E7EB;
}

.review-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.questions-summary {
  margin-bottom: var(--spacing-3);
}

.question-summary {
  padding: var(--spacing-2);
  background: var(--blanco);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-2);
}

.summary-header {
  display: flex;
  gap: var(--spacing-2);
  align-items: center;
}

.question-title {
  flex: 1;
  font-weight: 500;
}

.total-score {
  text-align: center;
  padding: var(--spacing-3);
  background: var(--azul-electrico);
  color: var(--blanco);
  border-radius: var(--radius-md);
  font-size: var(--font-size-lg);
}

/* Step Actions */
.step-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--spacing-4);
  padding-top: var(--spacing-3);
  border-top: 1px solid #E5E7EB;
}


/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-content {
  background: var(--blanco);
  border-radius: var(--radius-lg);
  max-width: 90vw;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: var(--shadow-lg);
}

.modal-header {
  background: var(--azul-tritiano);
  color: var(--blanco);
  padding: var(--spacing-3);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
}

.btn-close {
  background: none;
  border: none;
  color: var(--blanco);
  font-size: var(--font-size-2xl);
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-body {
  padding: var(--spacing-4);
  max-height: calc(90vh - 80px);
  overflow-y: auto;
}

/* Responsive */
@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .questions-header {
    flex-direction: column;
    gap: var(--spacing-3);
    align-items: stretch;
  }
  
  .questions-actions {
    flex-direction: column;
  }
  
  .question-type-select {
    min-width: auto;
  }
  
  .step-actions {
    flex-direction: column;
    gap: var(--spacing-2);
  }
  
  .stepper::before {
    display: none;
  }
  
  .stepper {
    flex-direction: column;
    gap: var(--spacing-2);
  }
  
  .step {
    flex-direction: row;
    gap: var(--spacing-2);
    max-width: none;
  }
}

/* Question Save Actions */
.question-save-actions {
  margin-top: var(--spacing-3);
  padding-top: var(--spacing-3);
  border-top: 1px solid #E5E7EB;
  text-align: right;
}

.question-save-actions .btn {
  min-width: 140px;
}

/* Question Status Indicators */
.question-status-indicator {
  padding: 4px var(--spacing-2);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: 500;
}

.saved-indicator {
  background: #D1FAE5;
  color: #065F46;
}

.unsaved-indicator {
  background: #FEF3C7;
  color: #92400E;
}

/* Questions Header Layout */
.questions-header-left {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.questions-progress {
  font-size: var(--font-size-sm);
  color: #6B7280;
  font-weight: 500;
}
</style>
