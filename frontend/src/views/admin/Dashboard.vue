<template>
  <div class="dashboard-container">
    <div class="dashboard-header">
      <h1>Dashboard Administrativo</h1>
      <p>Sistema de Pruebas Técnicas 3IT</p>
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
          <div class="stat-icon">📝</div>
          <div class="stat-content">
            <h3>{{ totalTests }}</h3>
            <p>Pruebas Creadas</p>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">👥</div>
          <div class="stat-content">
            <h3>{{ totalCandidates }}</h3>
            <p>Candidatos Registrados</p>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">✅</div>
          <div class="stat-content">
            <h3>{{ completedSessions }}</h3>
            <p>Sesiones Completadas</p>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">📊</div>
          <div class="stat-content">
            <h3>{{ averageScore }}%</h3>
            <p>Promedio General</p>
          </div>
        </div>
      </div>

      <div class="dashboard-actions">
        <router-link to="/admin/tests/create" class="action-btn primary">
          ➕ Nueva Prueba
        </router-link>
        <router-link to="/admin/candidates" class="action-btn secondary">
          👥 Ver Candidatos
        </router-link>
        <router-link to="/admin/reports" class="action-btn secondary">
          📊 Reportes
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const totalTests = ref(0);
const totalCandidates = ref(0);
const completedSessions = ref(0);
const averageScore = ref(0);
const loading = ref(false);
const error = ref('');

const safeFetch = async (url: string): Promise<any[]> => {
  try {
    console.log(`Fetching: ${url}`);
    const response = await fetch(url);
    
    console.log(`Response status for ${url}:`, response.status);
    console.log(`Response headers for ${url}:`, response.headers.get('content-type'));
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const text = await response.text();
    console.log(`Raw response for ${url}:`, text);
    
    if (!text || text.trim() === '') {
      console.warn(`Empty response from ${url}, returning empty array`);
      return [];
    }
    
    try {
      const data = JSON.parse(text);
      return Array.isArray(data) ? data : [];
    } catch (parseError) {
      console.error(`JSON parse error for ${url}:`, parseError);
      console.error(`Invalid JSON text:`, text);
      throw new Error(`Respuesta inválida del servidor: ${url}`);
    }
  } catch (fetchError) {
    console.error(`Fetch error for ${url}:`, fetchError);
    throw fetchError;
  }
};

const loadDashboardStats = async () => {
  loading.value = true;
  error.value = '';
  
  try {
    console.log('Iniciando carga de estadísticas del dashboard...');
    
    // Cargar pruebas
    const tests = await safeFetch('/api/tests');
    totalTests.value = tests.length;
    console.log(`Pruebas cargadas: ${tests.length}`);
    
    // Cargar candidatos
    const candidates = await safeFetch('/api/candidates');
    totalCandidates.value = candidates.length;
    console.log(`Candidatos cargados: ${candidates.length}`);
    
    // Cargar sesiones
    const sessions = await safeFetch('/api/sessions');
    const completed = sessions.filter((s: any) => s.status === 'completed');
    completedSessions.value = completed.length;
    console.log(`Sesiones completadas: ${completed.length}`);
    
    // Calcular promedio
    if (completed.length > 0) {
      const total = completed.reduce((sum: number, s: any) => sum + (s.percentage_score || 0), 0);
      averageScore.value = Math.round(total / completed.length);
    } else {
      averageScore.value = 0;
    }
    
    console.log('Dashboard cargado exitosamente');
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
    error.value = errorMessage;
    console.error('Error cargando estadísticas del dashboard:', errorMessage);
    
    // Resetear valores en caso de error
    totalTests.value = 0;
    totalCandidates.value = 0;
    completedSessions.value = 0;
    averageScore.value = 0;
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadDashboardStats();
});
</script>

<style scoped>
.dashboard-container {
  padding: var(--spacing-6);
  max-width: 1200px;
  margin: 0 auto;
}

.dashboard-header {
  text-align: center;
  margin-bottom: var(--spacing-8);
}

.dashboard-header h1 {
  color: var(--azul-tritiano);
  font-size: var(--font-size-3xl);
  margin-bottom: var(--spacing-2);
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
  font-weight: 600;
  transition: background-color var(--transition-base);
}

.retry-btn:hover {
  background: #1e40af;
}

/* Stats grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-6);
  margin-bottom: var(--spacing-8);
}

.stat-card {
  background: var(--blanco);
  border-radius: var(--radius-lg);
  padding: var(--spacing-6);
  box-shadow: var(--shadow-md);
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  border-left: 4px solid var(--turquesa);
  transition: transform var(--transition-base);
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.stat-icon {
  font-size: 2.5rem;
  background: linear-gradient(135deg, var(--azul-tritiano), var(--turquesa));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-content h3 {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--azul-tritiano);
  margin: 0;
}

.stat-content p {
  color: var(--text-muted);
  margin: 0;
  font-size: var(--font-size-sm);
}

/* Actions */
.dashboard-actions {
  display: flex;
  gap: var(--spacing-4);
  justify-content: center;
  flex-wrap: wrap;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-3) var(--spacing-6);
  border-radius: var(--radius-md);
  text-decoration: none;
  font-weight: 600;
  transition: all var(--transition-base);
  box-shadow: var(--shadow-sm);
}

.action-btn.primary {
  background: linear-gradient(135deg, var(--azul-tritiano), var(--turquesa));
  color: var(--blanco);
}

.action-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.action-btn.secondary {
  background: var(--blanco);
  color: var(--azul-tritiano);
  border: 2px solid var(--azul-tritiano);
}

.action-btn.secondary:hover {
  background: var(--azul-tritiano);
  color: var(--blanco);
}
</style>