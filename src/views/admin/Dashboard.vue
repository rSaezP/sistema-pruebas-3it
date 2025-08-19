<template>
  <div class="dashboard-container">
    <div class="dashboard-header">
      <h1>Dashboard Administrativo</h1>
      <p>Sistema de Pruebas Técnicas 3IT</p>
    </div>

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
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const totalTests = ref(0);
const totalCandidates = ref(0);
const completedSessions = ref(0);
const averageScore = ref(0);

const loadDashboardStats = async () => {
  try {
    // Cargar pruebas
    const testsResponse = await fetch('/api/tests');
    const tests = await testsResponse.json();
    totalTests.value = tests.length;
    
    // Cargar candidatos
    const candidatesResponse = await fetch('/api/candidates');
    const candidates = await candidatesResponse.json();
    totalCandidates.value = candidates.length;
    
    // Cargar sesiones
    const sessionsResponse = await fetch('/api/sessions');
    const sessions = await sessionsResponse.json();
    const completed = sessions.filter((s: any) => s.status === 'completed');
    completedSessions.value = completed.length;
    
    // Calcular promedio
    if (completed.length > 0) {
      const total = completed.reduce((sum: number, s: any) => sum + (s.percentage_score || 0), 0);
      averageScore.value = Math.round(total / completed.length);
    }
    
    console.log('Dashboard cargado con datos reales');
  } catch (error) {
    console.error('Error cargando estadísticas:', error);
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