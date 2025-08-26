<template>
  <div class="reports-container">
    <div class="header">
      <h1>Reportes y Análisis</h1>
      <div class="header-actions">
        <div class="date-range-picker">
          <label>Rango de fechas:</label>
          <div class="date-inputs">
            <input 
              type="date" 
              v-model="dateRange.start" 
              class="date-input"
            >
            <span>a</span>
            <input 
              type="date" 
              v-model="dateRange.end" 
              class="date-input"
            >
            <button 
              @click="applyDateRange"
              class="btn-secondary"
            >
              Aplicar
            </button>
          </div>
        </div>
        <button 
          class="btn-primary"
          @click="exportReport"
        >
          📥 Exportar PDF
        </button>
      </div>
    </div>

    <div class="dashboard-cards">
      <div class="card">
        <div class="card-icon" style="background: rgba(0, 90, 238, 0.1);">
          <span style="color: var(--azul-electrico);">👥</span>
        </div>
        <div class="card-content">
          <h3>Total Candidatos</h3>
          <p class="number">{{ stats.totalCandidates }}</p>
          <p class="subtext">+{{ stats.newCandidatesThisMonth }} este mes</p>
        </div>
      </div>

      <div class="card">
        <div class="card-icon" style="background: rgba(44, 213, 196, 0.1);">
          <span style="color: var(--turquesa);">✅</span>
        </div>
        <div class="card-content">
          <h3>Pruebas Completadas</h3>
          <p class="number">{{ stats.completedTests }}</p>
          <p class="subtext">{{ stats.completionRate }}% tasa de finalización</p>
        </div>
      </div>

      <div class="card">
        <div class="card-icon" style="background: rgba(255, 193, 7, 0.1);">
          <span style="color: #ffc107;">⭐</span>
        </div>
        <div class="card-content">
          <h3>Puntuación Promedio</h3>
          <p class="number">{{ stats.averageScore }}/100</p>
          <p class="subtext">{{ stats.improvement >= 0 ? '+' : '' }}{{ stats.improvement }}% vs período anterior</p>
        </div>
      </div>

      <div class="card">
        <div class="card-icon" style="background: rgba(40, 167, 69, 0.1);">
          <span style="color: #28a745;">⏱️</span>
        </div>
        <div class="card-content">
          <h3>Tiempo Promedio</h3>
          <p class="number">{{ stats.averageTime }} min</p>
          <p class="subtext">de {{ stats.averageTestDuration }} min asignados</p>
        </div>
      </div>
    </div>

    <div class="charts-row">
      <div class="chart-container">
        <h3>Desempeño por Prueba</h3>
        <div class="chart-wrapper">
          <canvas ref="performanceChart"></canvas>
        </div>
      </div>
      
      <div class="chart-container">
        <h3>Distribución de Puntuaciones</h3>
        <div class="chart-wrapper">
          <canvas ref="scoreDistributionChart"></canvas>
        </div>
      </div>
    </div>

    <div class="recent-tests">
      <div class="section-header">
        <h2>Últimas Pruebas Completadas</h2>
        <button 
          class="btn-text"
          @click="viewAllTests"
        >
          Ver todas →
        </button>
      </div>
      
      <div class="tests-table-container">
        <table class="tests-table">
          <thead>
            <tr>
              <th>Candidato</th>
              <th>Prueba</th>
              <th>Fecha</th>
              <th>Puntuación</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="test in recentTests" :key="test.id">
              <td>{{ test.candidateName }}</td>
              <td>{{ test.testName }}</td>
              <td>{{ formatDate(test.completedAt) }}</td>
              <td>
                <div class="score-container">
                  <span class="score">{{ test.score }}/100</span>
                  <div class="score-bar">
                    <div 
                      class="score-fill"
                      :style="{ width: test.score + '%' }"
                      :class="getScoreClass(test.score)"
                    ></div>
                  </div>
                </div>
              </td>
              <td>
                <span :class="['status', test.status]">
                  {{ formatStatus(test.status) }}
                </span>
              </td>
              <td>
                <button 
                  class="btn-icon"
                  @click="viewTestDetails(test.id)"
                  title="Ver detalles"
                >
                  👁️
                </button>
              </td>
            </tr>
            <tr v-if="recentTests.length === 0">
              <td colspan="6" class="empty-state">
                No hay pruebas recientes para mostrar
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="skills-analysis">
      <h2>Análisis de Habilidades</h2>
      <div class="skills-grid">
        <div 
          v-for="(skill, index) in skillsAnalysis" 
          :key="index"
          class="skill-card"
        >
          <div class="skill-header">
            <h4>{{ skill.name }}</h4>
            <span class="skill-score">{{ skill.averageScore }}%</span>
          </div>
          <div class="skill-progress">
            <div 
              class="skill-progress-bar"
              :style="{ width: skill.averageScore + '%' }"
              :class="getScoreClass(skill.averageScore)"
            ></div>
          </div>
          <div class="skill-stats">
            <span>{{ skill.testedCount }} candidatos evaluados</span>
            <span>{{ getSkillLevel(skill.averageScore) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'

interface TestResult {
  id: number
  candidateName: string
  testName: string
  completedAt: string
  score: number
  status: 'evaluated' | 'pending_review' | 'expired'
}

interface Skill {
  name: string
  averageScore: number
  testedCount: number
}

// Router
const router = useRouter()
const toast = useToast()

// Refs
const performanceChart = ref<HTMLCanvasElement>()
const scoreDistributionChart = ref<HTMLCanvasElement>()

// Data
const dateRange = ref({
  start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
  end: new Date().toISOString().split('T')[0]
})

const stats = ref({
  totalCandidates: 124,
  newCandidatesThisMonth: 12,
  completedTests: 89,
  completionRate: 72,
  averageScore: 76,
  improvement: 5.2,
  averageTime: 42,
  averageTestDuration: 60
})

const recentTests = ref<TestResult[]>([])
const skillsAnalysis = ref<Skill[]>([])

// Chart instances
let performanceChartInstance: any = null
let scoreDistributionChartInstance: any = null

// Computed
const formattedDateRange = computed(() => {
  const start = new Date(dateRange.value.start).toLocaleDateString('es-ES')
  const end = new Date(dateRange.value.end).toLocaleDateString('es-ES')
  return `${start} - ${end}`
})

// Methods
const applyDateRange = () => {
  console.log('Applying date range:', dateRange.value)
  fetchReportData()
}

const fetchReportData = async () => {
  try {
    // Fetch dashboard stats
    const response = await fetch('/api/reports/dashboard')
    if (response.ok) {
      const data = await response.json()
      stats.value = {
        totalCandidates: data.totalCandidates || 0,
        newCandidatesThisMonth: 12, // Mock data
        completedTests: data.completedSessions || 0,
        completionRate: Math.round((data.completedSessions / (data.totalCandidates || 1)) * 100),
        averageScore: Math.round(data.averageScore || 0),
        improvement: 5.2, // Mock data
        averageTime: 42, // Mock data
        averageTestDuration: 60
      }
      
      // Set recent tests from API data
      recentTests.value = (data.recentSessions || []).map((session: any) => ({
        id: session.id,
        candidateName: session.candidate_name,
        testName: session.test_name,
        completedAt: session.created_at,
        score: Math.round(session.percentage_score || 0),
        status: session.status === 'completed' ? 'evaluated' : 'pending_review'
      }))
    }
    
    // Mock skills analysis data
    skillsAnalysis.value = [
      { name: 'JavaScript', averageScore: 78, testedCount: 45 },
      { name: 'React', averageScore: 72, testedCount: 38 },
      { name: 'Node.js', averageScore: 65, testedCount: 32 },
      { name: 'HTML/CSS', averageScore: 82, testedCount: 41 },
      { name: 'Base de Datos', averageScore: 68, testedCount: 29 },
      { name: 'Algoritmos', averageScore: 71, testedCount: 36 }
    ]

    // Initialize charts after data is loaded
    setTimeout(() => {
      initCharts()
    }, 100)
  } catch (error) {
    console.error('Error fetching report data:', error)
    toast.error('Error al cargar los datos del reporte')
  }
}

const initCharts = async () => {
  // Import Chart.js dynamically
  try {
    const { Chart, registerables } = await import('chart.js')
    Chart.register(...registerables)
    
    // Make Chart available globally for chart instances
    window.Chart = Chart

    // Performance by Test Chart
    if (performanceChart.value) {
      const ctx = performanceChart.value.getContext('2d')
      if (ctx) {
        performanceChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['JavaScript', 'React', 'Node.js', 'HTML/CSS', 'Base de Datos', 'Algoritmos'],
          datasets: [{
            label: 'Puntuación Promedio',
            data: [78, 72, 65, 82, 68, 71],
            backgroundColor: 'rgba(0, 90, 238, 0.7)',
            borderColor: 'rgba(0, 90, 238, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              title: {
                display: true,
                text: 'Puntuación (%)'
              }
            }
          },
          plugins: {
            legend: {
              display: false
            }
          }
        }
      })
    }
  }

    // Score Distribution Chart
    if (scoreDistributionChart.value) {
      const ctx = scoreDistributionChart.value.getContext('2d')
      if (ctx) {
        scoreDistributionChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Excelente (90-100)', 'Bueno (75-89)', 'Promedio (60-74)', 'Debajo del promedio (<60)'],
          datasets: [{
            data: [15, 35, 30, 20],
            backgroundColor: [
              'rgba(40, 167, 69, 0.8)',
              'rgba(0, 90, 238, 0.8)',
              'rgba(255, 193, 7, 0.8)',
              'rgba(220, 53, 69, 0.8)'
            ],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right'
            }
          }
        }
        })
      }
    }
  } catch (error) {
    console.error('Error loading Chart.js:', error)
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

const formatStatus = (status: string) => {
  const statusMap: Record<string, string> = {
    evaluated: 'Evaluado',
    pending_review: 'Pendiente de revisión',
    expired: 'Expirado'
  }
  return statusMap[status] || status
}

const getScoreClass = (score: number) => {
  if (score >= 90) return 'excellent'
  if (score >= 75) return 'good'
  if (score >= 60) return 'average'
  return 'poor'
}

const getSkillLevel = (score: number) => {
  if (score >= 90) return 'Avanzado'
  if (score >= 70) return 'Intermedio-Alto'
  if (score >= 50) return 'Intermedio'
  if (score >= 30) return 'Básico'
  return 'Principiante'
}

const viewTestDetails = (testId: number) => {
  router.push(`/admin/reports/${testId}`)
}

const viewAllTests = () => {
  router.push('/admin/tests')
}

const exportReport = () => {
  toast.info('Función de exportación a PDF en desarrollo')
  // In a real app, this would generate and download a PDF report
}

// Lifecycle
onMounted(() => {
  fetchReportData()
})

onBeforeUnmount(() => {
  // Clean up charts to prevent memory leaks
  if (performanceChartInstance) {
    performanceChartInstance.destroy()
  }
  if (scoreDistributionChartInstance) {
    scoreDistributionChartInstance.destroy()
  }
})
</script>

<style scoped>
.reports-container {
  padding: var(--spacing-4);
  background: var(--gris);
  min-height: 100vh;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-4);
  flex-wrap: wrap;
  gap: var(--spacing-3);
}

.header h1 {
  color: var(--azul-tritiano);
  font-size: var(--font-size-3xl);
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  flex-wrap: wrap;
}

.date-range-picker {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.date-range-picker label {
  font-size: var(--font-size-sm);
  color: var(--azul-tritiano);
  font-weight: 500;
}

.date-inputs {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.date-input {
  padding: var(--spacing-2);
  border: 1px solid #D1D5DB;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
}

.date-input:focus {
  outline: none;
  border-color: var(--azul-electrico);
}

/* Dashboard Cards */
.dashboard-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-4);
}

.card {
  background: var(--blanco);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  padding: var(--spacing-4);
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-3);
  transition: transform var(--transition-base), box-shadow var(--transition-base);
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.card-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.card-content {
  flex: 1;
}

.card-content h3 {
  font-size: var(--font-size-sm);
  color: var(--azul-tritiano);
  margin: 0 0 var(--spacing-1) 0;
  font-weight: 500;
  opacity: 0.9;
}

.card-content .number {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--azul-tritiano);
  margin: 0 0 var(--spacing-1) 0;
}

.card-content .subtext {
  font-size: var(--font-size-xs);
  color: var(--negro);
  opacity: 0.7;
  margin: 0;
}

/* Charts */
.charts-row {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-5);
}

.chart-container {
  background: var(--blanco);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  padding: var(--spacing-4);
}

.chart-container h3 {
  color: var(--azul-tritiano);
  font-size: var(--font-size-lg);
  margin: 0 0 var(--spacing-3) 0;
  font-weight: 600;
}

.chart-wrapper {
  position: relative;
  height: 300px;
  width: 100%;
}

/* Recent Tests */
.recent-tests {
  background: var(--blanco);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  padding: var(--spacing-4);
  margin-bottom: var(--spacing-4);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-3);
}

.section-header h2 {
  color: var(--azul-tritiano);
  font-size: var(--font-size-xl);
  margin: 0;
}

.btn-text {
  background: none;
  border: none;
  color: var(--azul-electrico);
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  padding: var(--spacing-1) 0;
  transition: all var(--transition-base);
}

.btn-text:hover {
  text-decoration: underline;
}

.tests-table {
  width: 100%;
  border-collapse: collapse;
}

.tests-table th,
.tests-table td {
  padding: var(--spacing-3);
  text-align: left;
  border-bottom: 1px solid #E5E7EB;
}

.tests-table th {
  background-color: var(--azul-tritiano);
  color: var(--blanco);
  font-weight: 600;
  font-size: var(--font-size-xs);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tests-table tbody tr:hover {
  background-color: var(--gris);
}

.score-container {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.score {
  min-width: 50px;
  font-weight: 500;
}

.score-bar {
  flex: 1;
  height: 6px;
  background-color: #e9ecef;
  border-radius: 3px;
  overflow: hidden;
}

.score-fill {
  height: 100%;
  border-radius: 3px;
  transition: width var(--transition-base);
}

.score-fill.excellent {
  background-color: #28a745;
}

.score-fill.good {
  background-color: var(--azul-electrico);
}

.score-fill.average {
  background-color: #ffc107;
}

.score-fill.poor {
  background-color: #dc3545;
}

.status {
  display: inline-block;
  padding: 4px var(--spacing-2);
  border-radius: var(--radius-xl);
  font-size: var(--font-size-xs);
  font-weight: 500;
}

.status.evaluated {
  background-color: #d4edda;
  color: #155724;
}

.status.pending_review {
  background-color: #fff3cd;
  color: #856404;
}

.status.expired {
  background-color: #f8d7da;
  color: #721c24;
}

.btn-icon {
  background: none;
  border: none;
  color: var(--azul-tritiano);
  cursor: pointer;
  padding: var(--spacing-1);
  border-radius: var(--radius-sm);
  transition: all var(--transition-base);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:hover {
  background-color: rgba(0, 0, 0, 0.05);
  color: var(--azul-electrico);
}

.empty-state {
  text-align: center;
  padding: var(--spacing-5);
  color: #6B7280;
}

/* Skills Analysis */
.skills-analysis {
  background: var(--blanco);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  padding: var(--spacing-4);
}

.skills-analysis h2 {
  color: var(--azul-tritiano);
  font-size: var(--font-size-xl);
  margin: 0 0 var(--spacing-3) 0;
}

.skills-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--spacing-3);
}

.skill-card {
  background: var(--gris);
  border-radius: var(--radius-lg);
  padding: var(--spacing-3);
  transition: all var(--transition-base);
}

.skill-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.skill-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-2);
}

.skill-header h4 {
  margin: 0;
  color: var(--azul-tritiano);
  font-size: var(--font-size-base);
}

.skill-score {
  font-weight: 700;
  color: var(--azul-tritiano);
}

.skill-progress {
  height: 8px;
  background-color: #e9ecef;
  border-radius: var(--radius-sm);
  margin-bottom: var(--spacing-2);
  overflow: hidden;
}

.skill-progress-bar {
  height: 100%;
  border-radius: var(--radius-sm);
  transition: width 0.6s ease;
}

.skill-progress-bar.excellent {
  background-color: #28a745;
}

.skill-progress-bar.good {
  background-color: var(--azul-electrico);
}

.skill-progress-bar.average {
  background-color: #ffc107;
}

.skill-progress-bar.poor {
  background-color: #dc3545;
}

.skill-stats {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-xs);
  color: #6B7280;
}

/* Button Styles */
.btn-primary {
  background: var(--azul-electrico);
  color: var(--blanco);
  border: none;
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-base);
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
  font-size: var(--font-size-sm);
}

.btn-primary:hover {
  background: var(--turquesa);
  transform: translateY(-1px);
}

.btn-secondary {
  background: transparent;
  color: var(--azul-electrico);
  border: 1px solid var(--azul-electrico);
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: var(--radius-md);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-base);
  font-size: var(--font-size-sm);
}

.btn-secondary:hover {
  background: rgba(0, 90, 238, 0.05);
}

/* Responsive */
@media (max-width: 1200px) {
  .charts-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 992px) {
  .header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .header-actions {
    width: 100%;
    flex-direction: column;
    align-items: flex-start;
  }
  
  .date-range-picker {
    width: 100%;
    flex-direction: column;
    align-items: flex-start;
  }
  
  .date-inputs {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 24px 1fr auto;
    align-items: center;
  }
  
  .date-inputs span {
    text-align: center;
  }
  
  .btn-primary {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 768px) {
  .dashboard-cards {
    grid-template-columns: 1fr 1fr;
  }
  
  .skills-grid {
    grid-template-columns: 1fr;
  }
  
  .tests-table {
    display: block;
    overflow-x: auto;
  }
}

@media (max-width: 576px) {
  .dashboard-cards {
    grid-template-columns: 1fr;
  }
  
  .date-inputs {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto auto;
    gap: var(--spacing-2);
  }
  
  .date-inputs span {
    display: none;
  }
  
  .date-inputs button {
    grid-column: 1 / -1;
  }
}
</style>