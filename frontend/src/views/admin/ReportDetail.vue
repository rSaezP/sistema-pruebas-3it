<template>
  <div class="report-detail-container">
    <div class="header">
      <button @click="goBack" class="btn-back">
        ← Volver a Reportes
      </button>
      <h1>Detalle de Evaluación</h1>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Cargando detalles...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <h3>Error al cargar datos</h3>
      <p>{{ error }}</p>
      <button @click="fetchReportDetail" class="btn-primary">Reintentar</button>
    </div>

    <div v-else-if="sessionData" class="report-content">
      <!-- Información del Candidato -->
      <div class="candidate-info card">
        <div class="card-header">
          <h2>👤 Información del Candidato</h2>
        </div>
        <div class="card-content">
          <div class="info-grid">
            <div class="info-item">
              <label>Nombre:</label>
              <span>{{ sessionData.session.candidate_name }} {{ sessionData.session.lastname || '' }}</span>
            </div>
            <div class="info-item">
              <label>Email:</label>
              <span>{{ sessionData.session.email }}</span>
            </div>
            <div class="info-item">
              <label>Posición:</label>
              <span>{{ sessionData.session.position_applied || 'No especificada' }}</span>
            </div>
            <div class="info-item">
              <label>Fecha:</label>
              <span>{{ formatDate(sessionData.session.started_at) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Resumen de la Evaluación -->
      <div class="evaluation-summary card">
        <div class="card-header">
          <h2>📊 Resumen de la Evaluación</h2>
        </div>
        <div class="card-content">
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-icon" style="background: rgba(0, 90, 238, 0.1);">
                <span style="color: var(--azul-electrico);">🎯</span>
              </div>
              <div class="summary-content">
                <h3>Puntuación Total</h3>
                <p class="number">{{ sessionData.summary.totalScore }}/{{ sessionData.summary.maxPossibleScore }}</p>
                <p class="percentage">{{ sessionData.summary.percentageScore }}%</p>
              </div>
            </div>
            
            <div class="summary-item">
              <div class="summary-icon" style="background: rgba(44, 213, 196, 0.1);">
                <span style="color: var(--turquesa);">⏱️</span>
              </div>
              <div class="summary-content">
                <h3>Tiempo Utilizado</h3>
                <p class="number">{{ Math.round(sessionData.summary.timeSpent / 60) }} min</p>
                <p class="subtext">de {{ sessionData.session.time_limit || 60 }} min disponibles</p>
              </div>
            </div>
            
            <div class="summary-item">
              <div class="summary-icon" style="background: rgba(255, 193, 7, 0.1);">
                <span style="color: #ffc107;">📝</span>
              </div>
              <div class="summary-content">
                <h3>Preguntas</h3>
                <p class="number">{{ sessionData.summary.questionsAnswered }}</p>
                <p class="subtext">respondidas</p>
              </div>
            </div>

            <div class="summary-item">
              <div class="summary-icon" style="background: rgba(40, 167, 69, 0.1);">
                <span style="color: #28a745;">📈</span>
              </div>
              <div class="summary-content">
                <h3>Percentil</h3>
                <p class="number">{{ sessionData.summary.percentile || 0 }}%</p>
                <p class="subtext">vs otros candidatos</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Respuestas Detalladas -->
      <div class="answers-section card">
        <div class="card-header">
          <h2>📋 Respuestas Detalladas</h2>
        </div>
        <div class="card-content">
          <div v-for="(answer, index) in sessionData.answers" :key="answer.id" class="answer-item">
            <div class="answer-header">
              <div class="question-info">
                <h3>{{ index + 1 }}. {{ answer.title }}</h3>
                <div class="question-meta">
                  <span class="difficulty" :class="answer.difficulty">{{ formatDifficulty(answer.difficulty) }}</span>
                  <span class="category" v-if="answer.category_name">{{ answer.category_name }}</span>
                  <span class="type">{{ formatQuestionType(answer.type) }}</span>
                </div>
              </div>
              <div class="score-info">
                <div class="score" :class="getScoreClass(answer.percentage_score || 0)">
                  {{ answer.score || 0 }}/{{ answer.max_score || answer.question_max_score }} pts
                </div>
                <div class="percentage">{{ answer.percentage_score || 0 }}%</div>
              </div>
            </div>
            
            <div class="question-content">
              <div class="question-description">
                <h4>Descripción:</h4>
                <p>{{ answer.description || 'Sin descripción' }}</p>
              </div>
              
              <div class="answer-content">
                <h4>Respuesta del Candidato:</h4>
                
                <!-- Programming/Code questions -->
                <div class="code-block" v-if="answer.type === 'programming' || answer.type === 'code'">
                  <pre><code>{{ answer.answer_text || 'No respondió' }}</code></pre>
                </div>
                
                <!-- Multiple Choice questions -->
                <div v-else-if="answer.type === 'multiple_choice'" class="multiple-choice-answer">
                  <div class="selected-answer" :class="{ 'correct': answer.is_correct, 'incorrect': !answer.is_correct }">
                    <strong>Seleccionada:</strong> {{ answer.formatted_answer || 'No respondió' }}
                    <span class="result-icon">{{ answer.is_correct ? '✅' : '❌' }}</span>
                  </div>
                  
                  <div v-if="!answer.is_correct && answer.correct_option_text" class="correct-answer">
                    <strong>Respuesta correcta:</strong> {{ answer.correct_option_text }}
                  </div>
                  
                  <!-- Show all options for context -->
                  <div v-if="answer.all_options" class="all-options">
                    <h5>Todas las opciones:</h5>
                    <ul class="options-list">
                      <li 
                        v-for="(option, index) in answer.all_options" 
                        :key="index"
                        :class="{ 
                          'selected': answer.answer_text === index.toString(),
                          'correct': answer.correct_answer === index.toString() 
                        }"
                      >
                        {{ String.fromCharCode(65 + index) }}) {{ option.text }}
                        <span v-if="answer.correct_answer === index.toString()" class="correct-mark">✓</span>
                        <span v-if="answer.answer_text === index.toString()" class="selected-mark">← Seleccionada</span>
                      </li>
                    </ul>
                  </div>
                </div>
                
                <!-- Other question types -->
                <div class="text-answer" v-else>
                  <p>{{ answer.formatted_answer || answer.answer_text || 'No respondió' }}</p>
                </div>
              </div>

              <div v-if="answer.compilation_successful === 0" class="compilation-error">
                <h4>❌ Error de Compilación:</h4>
                <p class="error-text">El código no compiló correctamente</p>
              </div>

              <div v-if="answer.test_cases_passed !== undefined" class="test-results">
                <h4>Casos de Prueba:</h4>
                <div class="test-cases-summary">
                  <span class="passed">✅ {{ answer.test_cases_passed || 0 }} pasaron</span>
                  <span class="total">de {{ answer.test_cases_total || 0 }} totales</span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="sessionData.answers.length === 0" class="empty-state">
            <p>No se encontraron respuestas para esta sesión.</p>
          </div>
        </div>
      </div>

      <!-- Análisis por Categoría -->
      <div v-if="Object.keys(sessionData.scoresByCategory).length > 0" class="category-analysis card">
        <div class="card-header">
          <h2>📈 Análisis por Categoría</h2>
        </div>
        <div class="card-content">
          <div class="categories-grid">
            <div 
              v-for="(category, name) in sessionData.scoresByCategory" 
              :key="name"
              class="category-item"
            >
              <div class="category-header">
                <h4>{{ name }}</h4>
                <span class="category-score">{{ category.total }}/{{ category.max }} pts</span>
              </div>
              <div class="category-progress">
                <div 
                  class="progress-bar"
                  :style="{ 
                    width: (category.total / Math.max(category.max, 1)) * 100 + '%',
                    backgroundColor: category.color || '#005AEE'
                  }"
                ></div>
              </div>
              <div class="category-percentage">
                {{ Math.round((category.total / Math.max(category.max, 1)) * 100) }}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'

interface SessionData {
  session: any
  answers: any[]
  scoresByCategory: Record<string, any>
  summary: any
}

const route = useRoute()
const router = useRouter()
const toast = useToast()

const sessionId = route.params.sessionId as string
const sessionData = ref<SessionData | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const fetchReportDetail = async () => {
  if (!sessionId) {
    error.value = 'ID de sesión no válido'
    loading.value = false
    return
  }

  try {
    loading.value = true
    error.value = null
    
    const response = await fetch(`http://localhost:4000/api/reports/session/${sessionId}`)
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    sessionData.value = data
    
  } catch (err: any) {
    console.error('Error fetching session detail:', err)
    error.value = err.message || 'Error al cargar los datos de la sesión'
    toast.error('Error al cargar el detalle de la sesión')
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.push('/admin/reports')
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDifficulty = (difficulty: string) => {
  const difficultyMap: Record<string, string> = {
    easy: 'Fácil',
    medium: 'Medio',
    hard: 'Difícil'
  }
  return difficultyMap[difficulty] || difficulty
}

const formatQuestionType = (type: string) => {
  const typeMap: Record<string, string> = {
    code: 'Código',
    programming: 'Programación', 
    multiple_choice: 'Opción Múltiple',
    text: 'Texto Libre'
  }
  return typeMap[type] || type
}

const getScoreClass = (score: number) => {
  if (score >= 90) return 'excellent'
  if (score >= 70) return 'good'
  if (score >= 50) return 'average'
  return 'poor'
}

onMounted(() => {
  fetchReportDetail()
})
</script>

<style scoped>
.report-detail-container {
  padding: var(--spacing-4);
  background: var(--gris);
  min-height: 100vh;
}

.header {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-4);
}

.btn-back {
  background: var(--azul-electrico);
  color: var(--blanco);
  border: none;
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: var(--font-size-sm);
  transition: all var(--transition-base);
}

.btn-back:hover {
  background: #0056d6;
  transform: translateX(-2px);
}

.header h1 {
  color: var(--azul-tritiano);
  font-size: var(--font-size-3xl);
  margin: 0;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-8);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid var(--azul-electrico);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-state {
  text-align: center;
  padding: var(--spacing-8);
  background: var(--blanco);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.card {
  background: var(--blanco);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  margin-bottom: var(--spacing-4);
  overflow: hidden;
}

.card-header {
  background: var(--azul-tritiano);
  color: var(--blanco);
  padding: var(--spacing-3);
}

.card-header h2 {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: 600;
}

.card-content {
  padding: var(--spacing-4);
}

/* Candidate Info */
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-3);
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.info-item label {
  font-weight: 600;
  color: var(--azul-tritiano);
  font-size: var(--font-size-sm);
}

.info-item span {
  color: var(--negro);
}

/* Evaluation Summary */
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-4);
}

.summary-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-3);
  border-radius: var(--radius-md);
  background: var(--gris);
}

.summary-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.summary-content h3 {
  margin: 0 0 var(--spacing-1) 0;
  font-size: var(--font-size-sm);
  color: var(--azul-tritiano);
  font-weight: 500;
}

.summary-content .number {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--azul-tritiano);
  margin: 0;
}

.summary-content .percentage {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--azul-electrico);
  margin: 0;
}

.summary-content .subtext {
  font-size: var(--font-size-xs);
  color: var(--negro);
  opacity: 0.7;
  margin: var(--spacing-1) 0 0 0;
}

/* Answers Section */
.answer-item {
  border: 1px solid #e5e7eb;
  border-radius: var(--radius-lg);
  margin-bottom: var(--spacing-4);
  overflow: hidden;
}

.answer-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: var(--spacing-3);
  background: var(--gris);
  border-bottom: 1px solid #e5e7eb;
}

.question-info h3 {
  margin: 0 0 var(--spacing-2) 0;
  color: var(--azul-tritiano);
  font-size: var(--font-size-base);
}

.question-meta {
  display: flex;
  gap: var(--spacing-2);
  flex-wrap: wrap;
}

.difficulty, .category, .type {
  padding: 2px var(--spacing-2);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: 500;
}

.difficulty.easy { background: #d4edda; color: #155724; }
.difficulty.medium { background: #fff3cd; color: #856404; }
.difficulty.hard { background: #f8d7da; color: #721c24; }

.category {
  background: rgba(0, 90, 238, 0.1);
  color: var(--azul-electrico);
}

.type {
  background: rgba(0, 90, 238, 0.1);
  color: var(--azul-electrico);
}

.score-info {
  text-align: right;
}

.score {
  font-weight: 700;
  padding: var(--spacing-1) var(--spacing-2);
  border-radius: var(--radius-sm);
  margin-bottom: var(--spacing-1);
}

.score.excellent { background: #d4edda; color: #155724; }
.score.good { background: #cce5ff; color: #0056b3; }
.score.average { background: #fff3cd; color: #856404; }
.score.poor { background: #f8d7da; color: #721c24; }

.percentage {
  font-size: var(--font-size-sm);
  color: var(--azul-tritiano);
  font-weight: 600;
}

.question-content {
  padding: var(--spacing-4);
}

.question-content h4 {
  margin: 0 0 var(--spacing-2) 0;
  color: var(--azul-tritiano);
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.question-description p {
  margin: 0;
  color: var(--negro);
  line-height: 1.5;
}

.code-block {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: var(--radius-md);
  padding: var(--spacing-3);
  margin: var(--spacing-2) 0;
}

.code-block pre {
  margin: 0;
  white-space: pre-wrap;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: var(--font-size-sm);
  color: #2d3748;
}

.text-answer p {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: var(--radius-md);
  padding: var(--spacing-3);
  margin: var(--spacing-2) 0;
  color: var(--negro);
}

.compilation-error {
  margin: var(--spacing-3) 0;
  padding: var(--spacing-3);
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: var(--radius-md);
}

.error-text {
  color: #721c24;
  margin: 0;
}

.test-results {
  margin: var(--spacing-3) 0;
}

.test-cases-summary {
  display: flex;
  gap: var(--spacing-2);
  margin: var(--spacing-2) 0;
}

.passed {
  background: #d4edda;
  color: #155724;
  padding: 2px var(--spacing-2);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
}

.total {
  color: var(--negro);
  font-size: var(--font-size-sm);
}

/* Category Analysis */
.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-3);
}

.category-item {
  padding: var(--spacing-3);
  background: var(--gris);
  border-radius: var(--radius-lg);
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-2);
}

.category-header h4 {
  margin: 0;
  color: var(--azul-tritiano);
  font-size: var(--font-size-base);
}

.category-score {
  font-weight: 600;
  color: var(--azul-tritiano);
  font-size: var(--font-size-sm);
}

.category-progress {
  height: 8px;
  background: #e9ecef;
  border-radius: var(--radius-sm);
  margin-bottom: var(--spacing-2);
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  border-radius: var(--radius-sm);
  transition: width 0.6s ease;
}

.category-percentage {
  text-align: center;
  font-weight: 600;
  color: var(--azul-tritiano);
}

.empty-state {
  text-align: center;
  padding: var(--spacing-8);
  color: #6B7280;
}

.btn-primary {
  background: var(--azul-electrico);
  color: var(--blanco);
  border: none;
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-base);
}

.btn-primary:hover {
  background: #0056d6;
  transform: translateY(-1px);
}

/* Responsive */
@media (max-width: 768px) {
  .summary-grid, .categories-grid {
    grid-template-columns: 1fr;
  }
  
  .answer-header {
    flex-direction: column;
    gap: var(--spacing-2);
    align-items: flex-start;
  }
  
  .score-info {
    text-align: left;
  }
}

/* Estilos para respuestas de selección múltiple */
.multiple-choice-answer {
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  padding: 16px;
  background: #F9FAFB;
}

.selected-answer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 12px;
}

.selected-answer.correct {
  background: #ECFDF5;
  border: 1px solid #A7F3D0;
  color: #065F46;
}

.selected-answer.incorrect {
  background: #FEF2F2;
  border: 1px solid #FECACA;
  color: #991B1B;
}

.result-icon {
  font-size: 18px;
  font-weight: bold;
}

.correct-answer {
  padding: 10px;
  background: #ECFDF5;
  border: 1px solid #A7F3D0;
  border-radius: 6px;
  color: #065F46;
  margin-bottom: 12px;
}

.all-options {
  margin-top: 12px;
}

.all-options h5 {
  margin: 0 0 8px 0;
  color: #374151;
  font-size: 14px;
}

.options-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.options-list li {
  padding: 8px 12px;
  margin-bottom: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
}

.options-list li.selected {
  background: #FEF3C7;
  border-color: #F59E0B;
}

.options-list li.correct {
  background: #ECFDF5;
  border-color: #10B981;
}

.options-list li.selected.correct {
  background: #D1FAE5;
  border-color: #059669;
}

.correct-mark {
  color: #059669;
  font-weight: bold;
}

.selected-mark {
  color: #F59E0B;
  font-weight: bold;
  font-size: 12px;
}
</style>