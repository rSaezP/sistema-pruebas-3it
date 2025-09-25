<template>
  <div class="dashboard-container">
    <div class="dashboard-header">
      <h1>Dashboard Administrativo</h1>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>Cargando estadísticas...</p>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="error-container">
      <div class="error-icon">⚠️</div>
      <h3>Error al cargar datos</h3>
      <p>{{ error }}</p>
      <button @click="loadDashboardStats" class="retry-btn">
        Reintentar
      </button>
    </div>

    <!-- Success state -->
    <div v-else>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"/>
              <polyline points="14,2 14,8 20,8"/>
            </svg>
          </div>
          <div class="stat-content">
            <h3>{{ totalTests }}</h3>
            <p>Pruebas Creadas</p>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div class="stat-content">
            <h3>{{ totalCandidates }}</h3>
            <p>Candidatos Registrados</p>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 12L11 14L15 10"/>
              <circle cx="12" cy="12" r="10"/>
            </svg>
          </div>
          <div class="stat-content">
            <h3>{{ completedSessions }}</h3>
            <p>Sesiones Completadas</p>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
            </svg>
          </div>
          <div class="stat-content">
            <h3>{{ averageScore }}%</h3>
            <p>Promedio General</p>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12,6 12,12 16,14"/>
            </svg>
          </div>
          <div class="stat-content">
            <h3>{{ averageTime }} min</h3>
            <p>Tiempo Promedio</p>
          </div>
        </div>
        
      </div>
      
      <!-- Gráficos -->
      <div class="charts-row">
        <div class="chart-container">
          <h3>Desempeño por Prueba</h3>
          <div class="chart-wrapper">
            <canvas ref="performanceChart"></canvas>
          </div>
        </div>
        
        <div class="chart-container">
          <h3>Pruebas Favoritas</h3>
          <div class="chart-wrapper">
            <canvas ref="scoreDistributionChart"></canvas>
          </div>
        </div>
      </div>
      
      <!-- Sesiones recientes -->
      <div class="recent-sessions">
        <div class="section-header">
          <h2>Últimas Sesiones Completadas</h2>
          <router-link to="/admin/candidates" class="btn-text">
            Ver todas →
          </router-link>
        </div>
        
        <div class="sessions-table-container">
          <table class="sessions-table">
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
              <tr v-for="session in recentSessions" :key="session.id">
                <td>{{ session.candidateName }}</td>
                <td>{{ session.testName }}</td>
                <td>{{ formatDate(session.completedAt) }}</td>
                <td>
                  <div class="score-container">
                    <span class="score">{{ session.score }}/100</span>
                    <div class="score-bar">
                      <div 
                        class="score-fill"
                        :style="{ width: session.score + '%' }"
                        :class="getScoreClass(session.score)"
                      ></div>
                    </div>
                  </div>
                </td>
                <td>
                  <span :class="['status', session.status]">
                    {{ formatStatus(session.status) }}
                  </span>
                </td>
                <td>
                  <button 
                    class="btn-icon"
                    @click="viewSessionDetails(session.id)"
                    title="Ver detalles"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12S5 4 12 4S23 12 23 12S19 20 12 20S1 12 1 12Z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  </button>
                </td>
              </tr>
              <tr v-if="recentSessions.length === 0">
                <td colspan="6" class="empty-state">
                  No hay sesiones recientes para mostrar
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <!-- Análisis de habilidades -->
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'

interface SessionResult {
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

// Router y toast
const router = useRouter()
const toast = useToast()

// Refs para gráficos
const performanceChart = ref<HTMLCanvasElement>()
const scoreDistributionChart = ref<HTMLCanvasElement>()

// Data existente
const totalTests = ref(0);
const totalCandidates = ref(0);
const completedSessions = ref(0);
const averageScore = ref(0);
const loading = ref(false);
const error = ref('');

// Nueva data
const averageTime = ref(0);
const completionRate = ref(0);
const recentSessions = ref<SessionResult[]>([]);
const skillsAnalysis = ref<Skill[]>([]);

// Filtros de fecha removidos

// Instancias de gráficos
let performanceChartInstance: any = null
let scoreDistributionChartInstance: any = null

// Función safeFetch eliminada - ahora usamos fetch directo al endpoint unificado

const loadDashboardStats = async () => {
  loading.value = true;
  error.value = '';
  
  try {
    console.log('Cargando dashboard con datos reales...');
    
    // Usar SOLO el endpoint /api/reports/dashboard que tiene todos los datos reales
    const response = await fetch('/api/reports/dashboard');
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Datos recibidos del backend:', data);
    
    // Stats principales con datos 100% reales
    totalTests.value = data.totalTests || 0;
    totalCandidates.value = data.totalCandidates || 0;
    completedSessions.value = data.completedSessions || 0;
    averageScore.value = Math.round(data.averageScore || 0);
    
    // Tiempo promedio real del backend
    averageTime.value = data.averageTime || 0;
    
    // Sesiones recientes con datos reales
    recentSessions.value = (data.recentSessions || []).map((session: any) => ({
      id: session.id,
      candidateName: session.candidate_name,
      testName: session.test_name,
      completedAt: session.finished_at || session.created_at,
      score: Math.round(session.percentage_score || 0),
      status: 'evaluated' // Las sesiones completadas están evaluadas
    }));
    
    // Skills analysis con datos reales
    skillsAnalysis.value = (data.skillsAnalysis || []).map((skill: any) => ({
      name: skill.skill_name,
      averageScore: Math.round(skill.avg_score || 0),
      testedCount: skill.tested_count || 0
    }));
    
    // Datos para gráficos
    window.performanceData = data.performanceByTest || [];
    
    // Inicializar gráficos después de cargar datos
    setTimeout(() => {
      initCharts();
    }, 100);
    
    console.log('Dashboard cargado exitosamente con datos reales');
    
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
    error.value = errorMessage;
    console.error('Error cargando dashboard:', errorMessage);
    
    // Resetear valores en caso de error
    totalTests.value = 0;
    totalCandidates.value = 0;
    completedSessions.value = 0;
    averageScore.value = 0;
    averageTime.value = 0;
    recentSessions.value = [];
    skillsAnalysis.value = [];
  } finally {
    loading.value = false;
  }
};

// Función eliminada - ahora todo se carga en loadDashboardStats

const initCharts = async () => {
  try {
    const { Chart, registerables } = await import('chart.js')
    Chart.register(...registerables)
    
    window.Chart = Chart

    // Performance by Test Chart
    if (performanceChart.value) {
      const ctx = performanceChart.value.getContext('2d')
      if (ctx) {
        const performanceData = window.performanceData || []
        const labels = performanceData.map(item => item.test_name || 'Sin nombre')
        const scores = performanceData.map(item => Math.round(item.avg_score || 0))
        
        performanceChartInstance = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: labels.length > 0 ? labels : ['Sin datos'],
            datasets: [{
              label: 'Puntuación Promedio',
              data: scores.length > 0 ? scores : [0],
              backgroundColor: function(context) {
                const chart = context.chart;
                const {ctx, chartArea} = chart;
                if (!chartArea) {
                  return null;
                }
                const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                gradient.addColorStop(0, '#005AEE');    // Blue Electric arriba
                gradient.addColorStop(1, '#2CD5C4');    // Turquesa abajo
                return gradient;
              },
              borderColor: '#005AEE',
              borderWidth: 0,
              borderRadius: 8,
              borderSkipped: false,
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              },
              tooltip: {
                backgroundColor: '#005AEE',
                titleColor: '#ffffff',
                bodyColor: '#ffffff',
                cornerRadius: 8,
                displayColors: false,
                callbacks: {
                  title: function(context) {
                    return context[0].label;
                  },
                  label: function(context) {
                    return `Promedio: ${context.parsed.y}%`;
                  }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                max: 100,
                title: {
                  display: true,
                  text: 'Puntuación (%)',
                  color: '#64748b',
                  font: {
                    size: 12,
                    weight: 500
                  }
                },
                grid: {
                  color: '#f1f5f9',
                  drawBorder: false
                },
                ticks: {
                  color: '#64748b',
                  font: {
                    size: 11
                  }
                }
              },
              x: {
                grid: {
                  display: false
                },
                ticks: {
                  color: '#64748b',
                  font: {
                    size: 11
                  },
                  maxRotation: 45
                }
              }
            },
            elements: {
              bar: {
                borderRadius: 4
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
        // Obtener las pruebas más populares basado en datos reales
        const performanceData = window.performanceData || [];
        console.log('Performance data for favorites:', performanceData);
        
        let testLabels = [];
        let testCounts = [];
        
        if (performanceData.length > 0) {
          // Ordenar por número de sesiones completadas y tomar las top 5
          const sortedTests = performanceData
            .filter(test => test.completed_sessions > 0)
            .sort((a, b) => (b.completed_sessions || 0) - (a.completed_sessions || 0))
            .slice(0, 5);
          
          if (sortedTests.length > 0) {
            testLabels = sortedTests.map(test => test.test_name || 'Sin nombre');
            testCounts = sortedTests.map(test => test.completed_sessions || 0);
          } else {
            // Si no hay datos con sesiones completadas, usar los primeros 5
            testLabels = performanceData.slice(0, 5).map(test => test.test_name || 'Sin nombre');
            testCounts = performanceData.slice(0, 5).map(test => test.total_sessions || 1);
          }
        } else {
          // Datos de ejemplo si no hay datos reales
          testLabels = ['JavaScript Básico', 'Python Intermedio', 'SQL Avanzado', 'React Frontend', 'Node.js Backend'];
          testCounts = [15, 12, 8, 6, 4];
        }
        
        console.log('Chart labels:', testLabels);
        console.log('Chart counts:', testCounts);
        
        // Gradientes corporativos: Blue Electric y Turquesa
        const corporateShades = [
          '#005AEE',  // Blue Electric principal
          '#2CD5C4',  // Turquesa PANTONE 3255 C
          '#1E6FFF',  // Blue Electric claro
          '#26C4B3',  // Turquesa hover
          '#4A85FF'   // Blue Electric medio
        ];
        
        // Asegurarse de que hay datos para mostrar
        if (testCounts.reduce((a, b) => a + b, 0) > 0) {
          scoreDistributionChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
              labels: testLabels,
              datasets: [{
                data: testCounts,
                backgroundColor: corporateShades.slice(0, testLabels.length),
                borderColor: '#ffffff',
                borderWidth: 2,
                hoverBorderWidth: 3,
                hoverBorderColor: '#005AEE'
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              cutout: '50%',
              plugins: {
                legend: {
                  position: 'bottom',
                  labels: {
                    padding: 20,
                    usePointStyle: true,
                    pointStyle: 'circle',
                    font: {
                      size: 11,
                      weight: 500
                    },
                    color: '#64748b',
                    generateLabels: function(chart) {
                      const data = chart.data;
                      if (data.labels.length && data.datasets.length) {
                        return data.labels.map((label, i) => ({
                          text: label,
                          fillStyle: data.datasets[0].backgroundColor[i],
                          strokeStyle: data.datasets[0].backgroundColor[i],
                          lineWidth: 0,
                          pointStyle: 'circle',
                          hidden: false,
                          index: i
                        }));
                      }
                      return [];
                    }
                  }
                },
                tooltip: {
                  backgroundColor: '#005AEE',
                  titleColor: '#ffffff',
                  bodyColor: '#ffffff',
                  cornerRadius: 8,
                  displayColors: true,
                  callbacks: {
                    label: function(context) {
                      const total = context.dataset.data.reduce((a, b) => a + b, 0);
                      const percentage = total > 0 ? ((context.parsed * 100) / total).toFixed(1) : '0';
                      return `${context.label}: ${context.parsed} sesiones (${percentage}%)`;
                    }
                  }
                }
              },
              interaction: {
                intersect: false
              },
              animation: {
                animateRotate: true,
                animateScale: false
              }
            }
          });
        } else {
          // Si no hay datos, mostrar mensaje
          ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
          ctx.font = '16px Arial';
          ctx.fillStyle = '#64748b';
          ctx.textAlign = 'center';
          ctx.fillText('No hay datos de pruebas disponibles', ctx.canvas.width / 2, ctx.canvas.height / 2);
        }
      }
    }
  } catch (error) {
    console.error('Error loading Chart.js:', error)
  }
}

// Métodos adicionales

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

const viewSessionDetails = (sessionId: number) => {
  router.push(`/admin/reports/${sessionId}`)
}

onMounted(() => {
  loadDashboardStats();
});

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
.dashboard-container {
  padding: 40px 20px;
  max-width: 1200px;
  margin: 0 auto;
  background: #f8fafc;
  min-height: 100vh;
}

.dashboard-header {
  text-align: center;
  margin-bottom: 60px;
}

.dashboard-header h1 {
  color: var(--azul-tritiano);
  font-size: var(--font-size-3xl);
  margin: 0;
}

.dashboard-header p {
  color: var(--text-muted);
  font-size: var(--font-size-lg);
}

/* Loading state */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-12);
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid var(--azul-tritiano);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: var(--spacing-4);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Error state */
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-12);
  text-align: center;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: var(--radius-lg);
  margin: var(--spacing-6) 0;
}

.error-icon {
  font-size: 3rem;
  margin-bottom: var(--spacing-4);
}

.error-container h3 {
  color: #dc2626;
  margin-bottom: var(--spacing-2);
}

.error-container p {
  color: #7f1d1d;
  margin-bottom: var(--spacing-4);
}

.retry-btn {
  background: var(--azul-tritiano);
  color: white;
  border: none;
  padding: var(--spacing-3) var(--spacing-6);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 400;
  transition: background-color var(--transition-base);
}

.retry-btn:hover {
  background: #1e40af;
}

/* Stats grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 30px;
  margin-bottom: 80px;
}

.stat-card {
  background: white;
  border-radius: 16px;
  padding: 30px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
  display: flex;
  align-items: center;
  gap: 24px;
  transition: transform 0.2s ease;
  border: none;
  min-height: 120px;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(0,0,0,0.12);
}

.stat-icon {
  color: var(--primary);
  background-color: var(--blanco);
  border: 2px solid var(--primary);
  border-radius: var(--radius-xl);
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 80px;
}

.stat-icon svg {
  width: 32px;
  height: 32px;
  stroke: var(--primary);
  fill: none;
  stroke-width: 2;
}

.stat-content h3 {
  font-size: var(--font-size-2xl);
  font-weight: 400;
  color: var(--azul-tritiano);
  margin: 0;
}

.stat-content p {
  color: var(--text-muted);
  margin: 0;
  font-size: var(--font-size-sm);
}

/* Actions */


/* Header actions */

/* Charts */
.charts-row {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 40px;
  margin-bottom: 100px;
}

.chart-container {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
  border: 1px solid #f1f5f9;
  transition: all 0.2s ease;
}

.chart-container:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0,0,0,0.12);
}

.chart-container h3 {
  color: #005AEE;
  font-size: 20px;
  margin: 0 0 24px 0;
  font-weight: 400;
  display: flex;
  align-items: center;
  gap: 8px;
}

.chart-container h3::before {
  content: '';
  width: 4px;
  height: 20px;
  background: linear-gradient(135deg, #005AEE 0%, #2CD5C4 100%);
  border-radius: 2px;
}

.chart-wrapper {
  position: relative;
  height: 320px;
  width: 100%;
}

/* Recent sessions */
.recent-sessions {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
  padding: 32px;
  margin-bottom: 100px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.section-header h2 {
  color: #1e293b;
  font-size: 24px;
  font-weight: 400;
  margin: 0;
}

.btn-text {
  background: none;
  border: none;
  color: var(--primary);
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  padding: var(--spacing-1) 0;
  transition: all var(--transition-base);
  text-decoration: none;
}

.btn-text:hover {
  text-decoration: underline;
}

.sessions-table {
  width: 100%;
  border-collapse: collapse;
}

.sessions-table th,
.sessions-table td {
  padding: 16px;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
}

.sessions-table th {
  background-color: #f8fafc;
  color: #475569;
  font-weight: 400;
  font-size: 14px;
  border-bottom: 2px solid #e2e8f0;
}

.sessions-table tbody tr:hover {
  background-color: #f1f5f9;
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
  background: linear-gradient(90deg, var(--turquesa) 0%, var(--turquesa-hover) 100%);
}

.score-fill.good {
  background: linear-gradient(90deg, var(--primary) 0%, var(--turquesa) 100%);
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
  background: linear-gradient(135deg, var(--turquesa-light) 0%, rgba(44, 213, 196, 0.2) 100%);
  color: var(--turquesa-dark);
  border: 1px solid var(--turquesa);
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
  background: var(--blanco);
  border: 1px solid var(--primary);
  color: var(--primary);
  cursor: pointer;
  padding: var(--spacing-1);
  border-radius: var(--radius-md);
  transition: all var(--transition-base);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:hover {
  background-color: var(--primary);
  color: var(--blanco);
}

.empty-state {
  text-align: center;
  padding: var(--spacing-5);
  color: #6B7280;
}

/* Skills Analysis */
.skills-analysis {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
  padding: 32px;
}

.skills-analysis h2 {
  color: #1e293b;
  font-size: 24px;
  font-weight: 400;
  margin: 0 0 32px 0;
}

.skills-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}

.skill-card {
  background: #f8fafc;
  border-radius: 12px;
  padding: 24px;
  transition: all 0.2s ease;
  border: 1px solid #e2e8f0;
}

.skill-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.1);
}

.skill-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-2);
}

.skill-header h4 {
  margin: 0;
  color: #1e293b;
  font-size: 16px;
  font-weight: 400;
}

.skill-score {
  font-weight: 400;
  color: #3b82f6;
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
  background: linear-gradient(90deg, var(--turquesa) 0%, var(--turquesa-dark) 100%);
}

.skill-progress-bar.good {
  background: linear-gradient(90deg, var(--primary) 0%, var(--turquesa) 100%);
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

/* Stat card content */
.stat-content {
  flex: 1;
}

.stat-content h3 {
  font-size: 32px;
  font-weight: 400;
  color: #1e293b;
  margin: 0 0 8px 0;
}

.stat-content p {
  color: #64748b;
  margin: 0;
  font-size: 14px;
  font-weight: 500;
}

.stat-icon {
  color: var(--primary);
  background-color: var(--blanco);
  border: 2px solid var(--primary);
  border-radius: var(--radius-xl);
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 80px;
}

.stat-icon svg {
  width: 32px;
  height: 32px;
  stroke: var(--primary);
  fill: none;
  stroke-width: 2;
}

/* Table container */
.sessions-table-container {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

.sessions-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}

/* Responsive */
@media (max-width: 1200px) {
  .charts-row {
    grid-template-columns: 1fr;
    gap: 30px;
  }
}

@media (max-width: 992px) {
  .stats-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .skills-grid {
    grid-template-columns: 1fr;
  }
  
  .sessions-table {
    display: block;
    overflow-x: auto;
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}
</style>