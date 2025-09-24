<template>
  <div class="tests-list-container">
    <div class="header">
      <h1>Gestión de Pruebas</h1>
      <router-link to="/admin/tests/create" class="btn btn-primary">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Nueva Prueba
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13"/>
                <path d="M18.5 2.50001C18.8978 2.10219 19.4374 1.87869 20 1.87869C20.5626 1.87869 21.1022 2.10219 21.5 2.50001C21.8978 2.89784 22.1213 3.4374 22.1213 4.00001C22.1213 4.56262 21.8978 5.10219 21.5 5.50001L12 15L8 16L9 12L18.5 2.50001Z"/>
              </svg>
            </button>
            <button 
              @click="duplicateTest(test.id)"
              class="btn-icon"
              title="Duplicar"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4C3.46957 15 2.96086 14.7893 2.58579 14.4142C2.21071 14.0391 2 13.5304 2 13V4C2 3.46957 2.21071 2.96086 2.58579 2.58579C2.96086 2.21071 3.46957 2 4 2H13C13.5304 2 14.0391 2.21071 14.4142 2.58579C14.7893 2.96086 15 3.46957 15 4V5"/>
              </svg>
            </button>
            <button 
              @click="deleteTest(test.id)"
              class="btn-icon btn-danger"
              title="Eliminar"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3,6 5,6 21,6"/>
                <path d="M19 6V20C19 21 18 22 17 22H7C6 22 5 21 5 20V6M8 6V4C8 3 9 2 10 2H14C15 2 16 3 16 4V6"/>
                <line x1="10" y1="11" x2="10" y2="17"/>
                <line x1="14" y1="11" x2="14" y2="17"/>
              </svg>
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
      <div class="empty-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"/>
          <polyline points="14,2 14,8 20,8"/>
        </svg>
      </div>
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
    const response = await fetch(`http://localhost:4000/api/tests/${testId}`)
    if (response.ok) {
      const testData = await response.json()
      // Create duplicate with modified name
      const duplicateData = {
        ...testData,
        name: `${testData.name} (Copia)`,
        id: undefined
      }
      
      const createResponse = await fetch('http://localhost:4000/api/tests', {
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
      const response = await fetch(`http://localhost:4000/api/tests/${testId}`, {
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
  background: var(--blanco);
  border: 1px solid var(--primary);
  color: var(--primary);
  padding: var(--spacing-1);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-base);
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:hover {
  background: var(--primary);
  color: var(--blanco);
}

.btn-icon.btn-danger {
  border-color: var(--primary);
  color: var(--primary);
}

.btn-icon.btn-danger:hover {
  background: var(--primary);
  color: var(--blanco);
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