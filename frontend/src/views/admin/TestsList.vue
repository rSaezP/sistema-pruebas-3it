<template>
  <div class="tests-list-container">
    <div class="header">
      <h1>Gestión de Pruebas</h1>
      <router-link to="/admin/tests/create" class="btn btn-primary">
        ➕ Nueva Prueba
      </router-link>
    </div>

    <div class="filters">
      <div class="search-box">
        <input 
          type="text" 
          v-model="searchTerm" 
          placeholder="Buscar pruebas..."
          class="search-input"
        >
      </div>
      <div class="filter-options">
        <select v-model="statusFilter" class="filter-select">
          <option value="">Todos los estados</option>
          <option value="active">Activas</option>
          <option value="inactive">Inactivas</option>
        </select>
      </div>
    </div>

    <div class="tests-grid" v-if="filteredTests.length > 0">
      <div 
        v-for="test in filteredTests" 
        :key="test.id"
        class="test-card"
      >
        <div class="test-header">
          <h3>{{ test.name }}</h3>
          <div class="test-actions">
            <button 
              @click="editTest(test.id)"
              class="btn-icon"
              title="Editar"
            >
              ✏️
            </button>
            <button 
              @click="duplicateTest(test.id)"
              class="btn-icon"
              title="Duplicar"
            >
              📋
            </button>
            <button 
              @click="deleteTest(test.id)"
              class="btn-icon btn-danger"
              title="Eliminar"
            >
              🗑️
            </button>
          </div>
        </div>
        
        <div class="test-info">
          <p class="test-description">{{ test.description }}</p>
          
          <div class="test-stats">
            <div class="stat">
              <span class="stat-label">Preguntas:</span>
              <span class="stat-value">{{ test.questions_count || 0 }}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Tiempo:</span>
              <span class="stat-value">{{ test.time_limit }} min</span>
            </div>
            <div class="stat">
              <span class="stat-label">Completadas:</span>
              <span class="stat-value">{{ test.completed_sessions || 0 }}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Promedio:</span>
              <span class="stat-value">{{ Math.round(test.avg_score || 0) }}%</span>
            </div>
          </div>
        </div>

        <div class="test-footer">
          <div class="test-status">
            <span 
              :class="['status-badge', test.is_active ? 'active' : 'inactive']"
            >
              {{ test.is_active ? 'Activa' : 'Inactiva' }}
            </span>
          </div>
          <div class="test-date">
            Creada: {{ formatDate(test.created_at) }}
          </div>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <div class="empty-icon">📝</div>
      <h3>No hay pruebas disponibles</h3>
      <p>Comienza creando tu primera prueba técnica</p>
      <router-link to="/admin/tests/create" class="btn btn-primary">
        Crear Primera Prueba
      </router-link>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Cargando pruebas...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

interface Test {
  id: number
  name: string
  description: string
  time_limit: number
  is_active: boolean
  questions_count?: number
  completed_sessions?: number
  total_sessions?: number
  avg_score?: number
  created_at: string
}

const router = useRouter()

// Reactive state
const tests = ref<Test[]>([])
const loading = ref(false)
const searchTerm = ref('')
const statusFilter = ref('')

// Computed
const filteredTests = computed(() => {
  let filtered = tests.value

  // Filter by search term
  if (searchTerm.value) {
    const term = searchTerm.value.toLowerCase()
    filtered = filtered.filter(test => 
      test.name.toLowerCase().includes(term) ||
      test.description.toLowerCase().includes(term)
    )
  }

  // Filter by status
  if (statusFilter.value) {
    filtered = filtered.filter(test => {
      if (statusFilter.value === 'active') return test.is_active
      if (statusFilter.value === 'inactive') return !test.is_active
      return true
    })
  }

  return filtered
})

// Methods
const fetchTests = async () => {
  loading.value = true
  try {
    const response = await fetch('/api/tests')
    if (response.ok) {
      tests.value = await response.json()
    } else {
      console.error('Error fetching tests:', response.statusText)
    }
  } catch (error) {
    console.error('Error fetching tests:', error)
  } finally {
    loading.value = false
  }
}

const editTest = (testId: number) => {
  router.push(`/admin/tests/${testId}/edit`)
}

const duplicateTest = async (testId: number) => {
  try {
    const response = await fetch(`http://localhost:3001/api/tests/${testId}`)
    if (response.ok) {
      const testData = await response.json()
      // Create duplicate with modified name
      const duplicateData = {
        ...testData,
        name: `${testData.name} (Copia)`,
        id: undefined
      }
      
      const createResponse = await fetch('http://localhost:3001/api/tests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(duplicateData)
      })
      
      if (createResponse.ok) {
        fetchTests() // Refresh list
        console.log('Prueba duplicada exitosamente')
      }
    }
  } catch (error) {
    console.error('Error duplicating test:', error)
  }
}

const deleteTest = async (testId: number) => {
  if (confirm('¿Estás seguro de que quieres eliminar esta prueba?')) {
    try {
      const response = await fetch(`http://localhost:3001/api/tests/${testId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        fetchTests() // Refresh list
        console.log('Prueba eliminada exitosamente')
      }
    } catch (error) {
      console.error('Error deleting test:', error)
    }
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric'
  })
}

// Lifecycle
onMounted(() => {
  fetchTests()
})
</script>

<style scoped>
.tests-list-container {
  padding: var(--spacing-4);
  background: var(--gris);
  min-height: 100vh;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-4);
}

.header h1 {
  color: var(--azul-tritiano);
  font-size: var(--font-size-3xl);
  margin: 0;
}

.filters {
  display: flex;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-4);
  flex-wrap: wrap;
}

.search-box {
  flex: 1;
  min-width: 300px;
}

.search-input {
  width: 100%;
  padding: var(--spacing-2);
  border: 1px solid #D1D5DB;
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
}

.search-input:focus {
  outline: none;
  border-color: var(--azul-electrico);
  box-shadow: 0 0 0 3px rgba(0, 90, 238, 0.1);
}

.filter-select {
  padding: var(--spacing-2);
  border: 1px solid #D1D5DB;
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  background: var(--blanco);
}

.tests-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: var(--spacing-4);
}

.test-card {
  background: var(--blanco);
  border-radius: var(--radius-lg);
  padding: var(--spacing-4);
  box-shadow: var(--shadow-sm);
  border: 1px solid #E5E7EB;
  transition: all var(--transition-base);
}

.test-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.test-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-3);
}

.test-header h3 {
  color: var(--azul-tritiano);
  font-size: var(--font-size-lg);
  margin: 0;
  flex: 1;
}

.test-actions {
  display: flex;
  gap: var(--spacing-1);
}

.btn-icon {
  background: none;
  border: none;
  padding: var(--spacing-1);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-base);
  font-size: 14px;
}

.btn-icon:hover {
  background: rgba(0, 0, 0, 0.1);
}

.btn-icon.btn-danger:hover {
  background: rgba(239, 68, 68, 0.1);
}

.test-description {
  color: #6B7280;
  font-size: var(--font-size-sm);
  margin-bottom: var(--spacing-3);
  line-height: 1.5;
}

.test-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-2);
  margin-bottom: var(--spacing-3);
}

.stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-label {
  font-size: var(--font-size-xs);
  color: #6B7280;
}

.stat-value {
  font-weight: 600;
  color: var(--azul-tritiano);
  font-size: var(--font-size-sm);
}

.test-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: var(--spacing-2);
  border-top: 1px solid #E5E7EB;
}

.status-badge {
  display: inline-block;
  padding: 4px var(--spacing-2);
  border-radius: var(--radius-xl);
  font-size: var(--font-size-xs);
  font-weight: 500;
}

.status-badge.active {
  background: #D1FAE5;
  color: #065F46;
}

.status-badge.inactive {
  background: #FEE2E2;
  color: #991B1B;
}

.test-date {
  font-size: var(--font-size-xs);
  color: #6B7280;
}

.empty-state {
  text-align: center;
  padding: var(--spacing-6);
  background: var(--blanco);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: var(--spacing-3);
}

.empty-state h3 {
  color: var(--azul-tritiano);
  margin-bottom: var(--spacing-2);
}

.empty-state p {
  color: #6B7280;
  margin-bottom: var(--spacing-4);
}

.loading-state {
  text-align: center;
  padding: var(--spacing-6);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid var(--azul-electrico);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto var(--spacing-3);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Button styles */
.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
  padding: var(--spacing-2) var(--spacing-3);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: all var(--transition-base);
}

.btn-primary {
  background: var(--azul-electrico);
  color: var(--blanco);
}

.btn-primary:hover {
  background: var(--turquesa);
  transform: translateY(-1px);
}

/* Responsive */
@media (max-width: 768px) {
  .tests-grid {
    grid-template-columns: 1fr;
  }
  
  .header {
    flex-direction: column;
    align-items: stretch;
    gap: var(--spacing-3);
  }
  
  .filters {
    flex-direction: column;
  }
  
  .search-box {
    min-width: auto;
  }
  
  .test-stats {
    grid-template-columns: 1fr;
  }
}
</style>