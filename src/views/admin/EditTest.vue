<template>
  <div class="edit-test">
    {{ console.log('🎯 EDITEST COMPONENTE CARGADO') }}
    <div class="header">
      <h1>Editar Prueba Técnica</h1>
      <button @click="goBack" class="btn-back">
        ← Volver a la lista
      </button>
    </div>

    <div v-if="loading" class="loading-container">
      <div class="spinner"></div>
      <p>Cargando información de la prueba...</p>
    </div>

    <div v-else-if="error" class="alert alert-error">
      <div class="alert-content">
        <i class="icon-alert-circle"></i>
        <span>{{ error }}</span>
      </div>
      <button @click="fetchTest" class="btn btn-sm">Reintentar</button>
    </div>

    <div v-else>
      <!-- Stepper -->
      <div class="stepper">
        <div class="step" :class="{ active: currentStep === 1, completed: currentStep > 1 }">
          <div class="step-number">1</div>
          <div class="step-label">Información Básica</div>
        </div>
        <div class="step" :class="{ active: currentStep === 2, completed: currentStep > 2 }">
          <div class="step-number">2</div>
          <div class="step-label">Editar Preguntas</div>
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
                  placeholder="60"
                >
              </div>
            </div>

            <div class="form-group">
              <label>Estado</label>
              <div class="switch-container">
                <label class="switch">
                  <input 
                    type="checkbox" 
                    v-model="testData.is_active"
                  >
                  <span class="slider"></span>
                </label>
                <span class="switch-label">{{ testData.is_active ? 'Activa' : 'Inactiva' }}</span>
              </div>
            </div>

            <div class="step-actions">
              <button type="submit" class="btn btn-primary">
                Siguiente: Editar Preguntas →
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Step 2: Edit Questions -->
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
              :key="question.tempId || question.id"
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
                    :class="isQuestionSaved(question.tempId || question.id) ? 'saved-indicator' : 'unsaved-indicator'"
                  >
                    {{ isQuestionSaved(question.tempId || question.id) ? '✅ Guardada' : '⏳ Sin guardar' }}
                  </span>
                </div>
                <button @click="deleteQuestion(question.tempId || question.id)" class="btn-icon delete">
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
                    :class="isQuestionSaved(question.tempId || question.id) ? 'btn-success' : 'btn-primary'"
                    :disabled="isQuestionSaved(question.tempId || question.id)"
                  >
                    <span v-if="isQuestionSaved(question.tempId || question.id)">✓ Pregunta Guardada</span>
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
          <h2>Revisar Prueba</h2>
          
          <div class="review-summary">
            <div class="summary-card">
              <h3>{{ testData.name }}</h3>
              <p class="test-description">{{ testData.description || 'Sin descripción' }}</p>
              
              <div class="test-stats">
                <div class="stat">
                  <strong>{{ testData.questions.length }}</strong>
                  <span>Preguntas</span>
                </div>
                <div class="stat">
                  <strong>{{ testData.time_limit }}</strong>
                  <span>Minutos</span>
                </div>
                <div class="stat">
                  <strong>{{ testData.passing_score || 60 }}%</strong>
                  <span>Puntaje Mínimo</span>
                </div>
                <div class="stat">
                  <strong>{{ testData.is_active ? 'Activa' : 'Inactiva' }}</strong>
                  <span>Estado</span>
                </div>
              </div>
            </div>
          </div>

          <div class="step-actions">
            <button @click="currentStep = 2" class="btn btn-secondary">
              ← Editar Preguntas
            </button>
            <button @click="handleSubmit" class="btn btn-success" :disabled="isSubmitting">
              <span v-if="!isSubmitting">Actualizar Prueba</span>
              <span v-else>Guardando...</span>
            </button>
            <button @click="confirmDelete" class="btn btn-danger">
              Eliminar Prueba
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="modal-overlay" @click="showDeleteModal = false">
      <div class="modal-content" @click.stop>
        <h3>Confirmar Eliminación</h3>
        <p>¿Estás seguro de que deseas eliminar esta prueba? Esta acción no se puede deshacer.</p>
        <div class="modal-actions">
          <button @click="showDeleteModal = false" class="btn btn-secondary">Cancelar</button>
          <button @click="deleteTest" class="btn btn-danger">Eliminar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useToast } from 'vue-toastification';
import QuestionEditor from '../../components/QuestionEditor.vue';

// Router and Toast
const router = useRouter();
const route = useRoute();
const toast = useToast();

// Get test ID from route
const testId = computed(() => route.params.id as string);

// State - EXACTO igual que CreateTest.vue
const currentStep = ref(1);
const loading = ref(false);
const newQuestionType = ref('');
const savedQuestionIds = ref([]);
const showDeleteModal = ref(false);
const isSubmitting = ref(false);

// Test data - EXACTO igual que CreateTest.vue
const testData = ref({
  name: '',
  description: '',
  time_limit: 60,
  passing_score: 60,
  is_active: true,
  questions: [] as any[]
});

// Computed properties - EXACTO igual que CreateTest.vue
const isQuestionSaved = (tempId: string) => {
  return savedQuestionIds.value.includes(tempId);
};

const savedQuestionsCount = computed(() => savedQuestionIds.value.length);

const allQuestionsAreSaved = computed(() => {
  return testData.value.questions.every(q => savedQuestionIds.value.includes(q.tempId || q.id));
});

const canProceedToReview = computed(() => {
  return testData.value.questions.length > 0 && 
         testData.value.questions.every((q: any) => q.title && q.description);
});

// Methods (not computed to avoid reactive loops) - EXACTO igual que CreateTest.vue
const getTotalMaxScore = () => {
  return testData.value.questions.reduce((total, q) => total + (q.max_score || 0), 0);
};

// Methods - EXACTO igual que CreateTest.vue  
const goBack = () => {
  router.push('/admin/tests');
};

// Question validation and saving functions - EXACTO igual que CreateTest.vue
const isQuestionValid = (question: any) => {
  if (!question.title?.trim()) return false;
  
  switch (question.type) {
    case 'programming':
      return question.test_cases?.length > 0 && question.expected_solution?.trim();
    case 'multiple_choice':
      const options = question.options || [];
      return options.length >= 2 && options.some((opt: any) => opt.correct && opt.text?.trim());
    case 'sql':
      return !!question.title?.trim();
    default:
      return true;
  }
};

const saveQuestion = (index: number) => {
  console.log('BOTÓN CLICKEADO - Index:', index);
  const question = testData.value.questions[index];
  
  if (!question) {
    console.log('ERROR: No se encontró pregunta en index', index);
    return;
  }
  
  console.log('Pregunta encontrada:', question.tempId || question.id, question.title);
  
  // Simplificar validación al mínimo
  if (question.title && question.title.trim()) {
    const questionId = question.tempId || question.id;
    if (!savedQuestionIds.value.includes(questionId)) {
      savedQuestionIds.value.push(questionId);
    }
    toast.success(`Pregunta ${index + 1} guardada`);
    console.log('Pregunta guardada exitosamente');
  } else {
    toast.error('El título es requerido');
    console.log('Título vacío');
  }
};

const nextStep = () => {
  if (currentStep.value === 2 && !allQuestionsAreSaved.value) {
    toast.error('Debes guardar todas las preguntas antes de continuar');
    return;
  }
  if (currentStep.value < 3) {
    currentStep.value++;
  }
};

const addQuestion = () => {
  if (!newQuestionType.value) return;
  
  const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
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
  };
  
  testData.value.questions.push(newQuestion);
  newQuestionType.value = '';
  toast.success('Pregunta agregada');
};

const updateQuestionData = (index: number, questionData: any) => {
  // Update without triggering reactive loops
  Object.assign(testData.value.questions[index], questionData);
};

const deleteQuestion = (tempId: string) => {
  if (confirm('¿Estás seguro de que quieres eliminar esta pregunta?')) {
    testData.value.questions = testData.value.questions.filter(q => (q.tempId || q.id) !== tempId);
    const index = savedQuestionIds.value.indexOf(tempId);
    if (index > -1) {
      savedQuestionIds.value.splice(index, 1);
    }
    toast.success('Pregunta eliminada');
  }
};

const getQuestionTypeLabel = (type: string) => {
  const labels = {
    'programming': 'Programación',
    'sql': 'SQL',
    'multiple_choice': 'Selección Múltiple'
  };
  return labels[type as keyof typeof labels] || type;
};

// Función específica para cargar datos de la prueba existente
const fetchTest = async () => {
  console.log('🚀 INICIANDO fetchTest');
  try {
    loading.value = true;
    
    const response = await fetch(`/api/tests/${testId.value}`);
    if (!response.ok) {
      throw new Error('No se pudo cargar la prueba');
    }
    
    const data = await response.json();
    
    // DEBUG: Ver exactamente qué llega de la API
    console.log('🔍 DATOS DE LA API:', JSON.stringify(data, null, 2));
    console.log('🔍 PREGUNTAS:', data.questions);
    if (data.questions && data.questions[0]) {
      console.log('🔍 PRIMERA PREGUNTA:', data.questions[0]);
      console.log('🔍 TEST CASES PRIMERA PREGUNTA:', data.questions[0].test_cases);
    }
    
    // Cargar datos básicos del test
    testData.value.name = data.name || '';
    testData.value.description = data.description || '';
    testData.value.time_limit = data.time_limit || 60;
    testData.value.passing_score = data.passing_score || 60;
    testData.value.is_active = data.is_active || true;
    
    // Cargar preguntas con EXACTAMENTE el mismo formato que CreateTest.vue
    testData.value.questions = data.questions.map((q: any) => ({
      tempId: q.id ? q.id.toString() : `temp_${Date.now()}`,
      id: q.id,
      type: q.type || 'programming',
      title: q.title || '',
      description: q.description || '',
      difficulty: q.difficulty || 'Medio',
      max_score: q.max_score || 10,
      language: q.language || 'javascript',
      initial_code: q.initial_code || '',
      expected_solution: q.correct_answer || '',
      database_schema: q.database_schema || '',
      options: (() => {
        if (q.options) {
          try {
            const parsed = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
            return Array.isArray(parsed) ? parsed : [
              { text: '', correct: false },
              { text: '', correct: false },
              { text: '', correct: false },
              { text: '', correct: false }
            ];
          } catch (e) {
            return [
              { text: '', correct: false },
              { text: '', correct: false },
              { text: '', correct: false },
              { text: '', correct: false }
            ];
          }
        }
        return [
          { text: '', correct: false },
          { text: '', correct: false },
          { text: '', correct: false },
          { text: '', correct: false }
        ];
      })(),
      correct_answer: q.correct_answer || '',
      test_cases: Array.isArray(q.test_cases) ? q.test_cases.map((tc: any) => ({
        id: tc.id || crypto.randomUUID(),
        name: tc.name || `Caso ${tc.id || 1}`,
        input_data: tc.input_data || tc.input || '',
        expected_output: tc.expected_output || '',
        is_hidden: tc.is_hidden || false,
        weight: tc.weight || 1.0,
        timeout_ms: tc.timeout_ms || 5000
      })) : []
    }));
    
    // DEBUG: Ver qué datos se mapearon
    console.log('🔍 DATOS MAPEADOS:', testData.value.questions);
    if (testData.value.questions[0]) {
      console.log('🔍 PRIMERA PREGUNTA MAPEADA:', testData.value.questions[0]);
      console.log('🔍 TEST CASES MAPEADOS:', testData.value.questions[0].test_cases);
    }
    
    // Marcar todas las preguntas como guardadas
    savedQuestionIds.value = data.questions.map((q: any) => q.id ? q.id.toString() : `temp_${Date.now()}`);
    
  } catch (err: any) {
    console.error('Error al cargar la prueba:', err);
    toast.error('No se pudo cargar la información de la prueba');
  } finally {
    loading.value = false;
  }
};

const removeQuestion = (index: number) => {
  if (testData.value.questions.length > 1) {
    testData.value.questions.splice(index, 1);
  }
};

const updateQuestion = (index: number, questionData: any) => {
  testData.value.questions[index] = { ...questionData };
};

const getQuestionTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    'multiple_choice': 'Selección Múltiple',
    'programming': 'Programación',
    'sql': 'SQL',
    'text': 'Texto Libre'
  };
  return labels[type] || type;
};

const handleSubmit = async () => {
  if (isSubmitting.value) return;

  try {
    isSubmitting.value = true;

    // Validate data
    if (!testData.value.name.trim()) {
      toast.error('El nombre de la prueba es requerido');
      currentStep.value = 1;
      return;
    }

    if (testData.value.questions.length === 0) {
      toast.error('Debe haber al menos una pregunta en la prueba');
      currentStep.value = 2;
      return;
    }

    // Prepare data for API
    const submitData = {
      name: testData.value.name,
      description: testData.value.description,
      time_limit: testData.value.time_limit,
      passing_score: testData.value.passing_score,
      is_active: testData.value.is_active,
      questions: testData.value.questions.map((q: any, index: number) => ({
        id: q.id || undefined,
        title: q.title,
        description: q.description,
        type: q.type,
        difficulty: q.difficulty,
        max_score: q.max_score,
        order_index: index + 1,
        language: q.language,
        initial_code: q.initial_code,
        correct_answer: q.expected_solution,
        database_schema: q.database_schema,
        options: q.type === 'multiple_choice' ? JSON.stringify(q.options) : null,
        test_cases: q.test_cases || []
      }))
    };

    const response = await fetch(`/api/tests/${testId.value}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(submitData)
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(errorData || 'Error al actualizar la prueba');
    }

    toast.success('Prueba actualizada correctamente');
    router.push('/admin/tests');

  } catch (err: any) {
    console.error('Error al actualizar la prueba:', err);
    toast.error(err.message || 'Error al actualizar la prueba');
  } finally {
    isSubmitting.value = false;
  }
};

const confirmDelete = () => {
  showDeleteModal.value = true;
};

const deleteTest = async () => {
  try {
    const response = await fetch(`/api/tests/${testId.value}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Error al eliminar la prueba');
    }

    toast.success('Prueba eliminada correctamente');
    router.push('/admin/tests');

  } catch (err: any) {
    console.error('Error al eliminar la prueba:', err);
    toast.error(err.message || 'Error al eliminar la prueba');
  } finally {
    showDeleteModal.value = false;
  }
};

const goBack = () => {
  router.push('/admin/tests');
};

// Lifecycle
onMounted(() => {
  console.log('🔥 onMounted ejecutándose, testId:', testId.value);
  fetchTest();
});
</script>

<style scoped>
.edit-test {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.header h1 {
  color: var(--azul-tritiano);
  margin: 0;
}

.btn-back {
  background: none;
  border: 1px solid var(--gris);
  color: var(--text-secondary);
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-back:hover {
  background: var(--gris);
  border-color: var(--azul-electrico);
  color: var(--azul-electrico);
}

.loading-container {
  text-align: center;
  padding: 4rem 2rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--gris);
  border-top: 4px solid var(--azul-electrico);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.alert {
  padding: 1rem;
  border-radius: 4px;
  margin: 2rem 0;
}

.alert-error {
  background: #FEE2E2;
  border: 1px solid #FECACA;
  color: #991B1B;
}

.alert-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.stepper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3rem;
  position: relative;
}

.stepper::before {
  content: '';
  position: absolute;
  top: 20px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--gris);
  z-index: 1;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 2;
  background: var(--blanco);
  padding: 0 1rem;
}

.step-number {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--gris);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  margin-bottom: 0.5rem;
  transition: all 0.3s;
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
  font-size: 0.875rem;
  color: var(--text-secondary);
  text-align: center;
}

.step.active .step-label {
  color: var(--azul-electrico);
  font-weight: 600;
}

.step-content {
  background: var(--blanco);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.form-container {
  padding: 2rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--text-primary);
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--gris);
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--azul-electrico);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.switch-container {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.switch {
  position: relative;
  width: 60px;
  height: 30px;
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
  background-color: var(--gris);
  transition: 0.4s;
  border-radius: 30px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 22px;
  width: 22px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: 0.4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: var(--turquesa);
}

input:checked + .slider:before {
  transform: translateX(30px);
}

.switch-label {
  font-weight: 500;
  color: var(--text-primary);
}

.questions-section {
  padding: 2rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.section-header h2 {
  color: var(--azul-tritiano);
  margin: 0;
}

.questions-list {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.question-form-card {
  border: 1px solid var(--gris);
  border-radius: 8px;
  overflow: hidden;
}

.question-form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #F8FAFC;
  border-bottom: 1px solid var(--gris);
}

.question-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.question-number {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--azul-electrico);
  color: var(--blanco);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
}

.question-type-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
}

.question-type-badge.multiple_choice {
  background: #E0F2FE;
  color: #0369A1;
}

.question-type-badge.programming {
  background: #F0FDF4;
  color: #166534;
}

.question-type-badge.sql {
  background: #FEF3C7;
  color: #92400E;
}

.btn-remove {
  background: none;
  border: none;
  color: #EF4444;
  padding: 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-remove:hover:not(:disabled) {
  background: #FEE2E2;
}

.btn-remove:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.question-form-content {
  padding: 0;
}

.review-section {
  padding: 2rem;
}

.review-section h2 {
  color: var(--azul-tritiano);
  margin-bottom: 2rem;
}

.summary-card {
  background: #F8FAFC;
  border: 1px solid var(--gris);
  border-radius: 8px;
  padding: 2rem;
  margin-bottom: 2rem;
}

.summary-card h3 {
  color: var(--azul-tritiano);
  margin: 0 0 1rem 0;
  font-size: 1.5rem;
}

.test-description {
  color: var(--text-secondary);
  margin-bottom: 2rem;
  line-height: 1.6;
}

.test-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 2rem;
}

.stat {
  text-align: center;
}

.stat strong {
  display: block;
  font-size: 1.5rem;
  color: var(--azul-electrico);
  margin-bottom: 0.25rem;
}

.stat span {
  font-size: 0.875rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  font-weight: 500;
}

.step-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2rem;
  background: #F8FAFC;
  border-top: 1px solid var(--gris);
  gap: 1rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-primary {
  background: var(--azul-electrico);
  color: var(--blanco);
}

.btn-primary:hover:not(:disabled) {
  background: var(--azul-tritiano);
}

.btn-secondary {
  background: none;
  border: 1px solid var(--gris);
  color: var(--text-secondary);
}

.btn-secondary:hover {
  background: var(--gris);
  color: var(--text-primary);
}

.btn-success {
  background: var(--turquesa);
  color: var(--blanco);
}

.btn-success:hover:not(:disabled) {
  background: #14B8A6;
}

.btn-danger {
  background: #EF4444;
  color: var(--blanco);
}

.btn-danger:hover {
  background: #DC2626;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

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
  z-index: 1000;
}

.modal-content {
  background: var(--blanco);
  border-radius: 8px;
  padding: 2rem;
  max-width: 400px;
  width: 90%;
  text-align: center;
}

.modal-content h3 {
  color: var(--azul-tritiano);
  margin: 0 0 1rem 0;
}

.modal-content p {
  color: var(--text-secondary);
  margin-bottom: 2rem;
  line-height: 1.6;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

/* Responsive */
@media (max-width: 768px) {
  .edit-test {
    padding: 1rem;
  }
  
  .header {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }
  
  .stepper {
    flex-direction: column;
    gap: 1rem;
  }
  
  .stepper::before {
    display: none;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .step-actions {
    flex-direction: column;
  }
  
  .test-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>