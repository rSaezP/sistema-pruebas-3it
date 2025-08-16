<template>
  <div class="candidates-container">
    <div class="header">
      <h1>Gestión de Candidatos</h1>
      <div class="header-actions">
        <button @click="showInviteModal = true" class="btn btn-primary">
          <i class="icon-plus"></i>
          Invitar Candidato
        </button>
      </div>
    </div>

    <!-- Filtros -->
    <div class="filters">
      <div class="search-box">
        <input 
          type="text" 
          v-model="searchQuery" 
          placeholder="Buscar por nombre o email..."
          class="input"
        >
        <i class="icon-search"></i>
      </div>
      
      <div class="filter-group">
        <label class="input-label">Filtrar por estado:</label>
        <select v-model="statusFilter" class="input select">
          <option value="all">Todos</option>
          <option value="pending">Pendientes</option>
          <option value="in_progress">En Progreso</option>
          <option value="completed">Completados</option>
          <option value="expired">Expirados</option>
        </select>
      </div>
      
      <div class="filter-group">
        <label class="input-label">Prueba:</label>
        <select v-model="testFilter" class="input select">
          <option value="">Todas las pruebas</option>
          <option v-for="test in tests" :key="test.id" :value="test.id">
            {{ test.name }}
          </option>
        </select>
      </div>
      
      <button @click="resetFilters" class="btn btn-secondary">
        <i class="icon-refresh-cw"></i>
        Restablecer
      </button>
    </div>
    
    <!-- Estado de carga -->
    <div v-if="loading" class="loading-container">
      <div class="spinner"></div>
      <p>Cargando candidatos...</p>
    </div>
    
    <!-- Mensaje de error -->
    <div v-else-if="error" class="alert alert-error">
      <div class="alert-content">
        <i class="icon-alert-circle"></i>
        <span>{{ error }}</span>
      </div>
      <button @click="fetchCandidates" class="btn btn-sm">Reintentar</button>
    </div>
    
    <!-- Tabla de candidatos -->
    <div v-else>
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Prueba Asignada</th>
              <th>Estado</th>
              <th>Invitado el</th>
              <th>Vencimiento</th>
              <th>Puntuación</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="candidate in filteredCandidates" :key="candidate.id">
              <td>{{ candidate.name }}</td>
              <td>{{ candidate.email }}</td>
              <td>{{ getTestName(candidate.testId) }}</td>
              <td>
                <span :class="['status-badge', getStatusClass(candidate.status)]">
                  {{ getStatusText(candidate.status) }}
                </span>
              </td>
              <td>{{ formatDate(candidate.invitedAt) }}</td>
              <td :class="{ 'text-warning': isExpiringSoon(candidate.expiresAt) }">
                {{ formatDate(candidate.expiresAt) }}
              </td>
              <td>
                <span v-if="candidate.score !== null">
                  {{ candidate.score }}%
                </span>
                <span v-else class="text-muted">-</span>
              </td>
              <td class="actions">
                <button 
                  v-if="candidate.status === 'pending'" 
                  @click="resendInvitation(candidate.id)"
                  class="btn-icon"
                  title="Reenviar invitación"
                >
                  <i class="icon-send"></i>
                </button>
                
                <router-link 
                  v-if="candidate.status === 'completed'"
                  :to="`/admin/reports/${candidate.sessionId}`"
                  class="btn-icon"
                  title="Ver resultados"
                >
                  <i class="icon-file-text"></i>
                </router-link>
                
                <button 
                  @click="confirmDelete(candidate)"
                  class="btn-icon text-error"
                  title="Eliminar candidato"
                >
                  <i class="icon-trash-2"></i>
                </button>
              </td>
            </tr>
            
            <tr v-if="filteredCandidates.length === 0">
              <td colspan="8" class="text-center py-4">
                No se encontraron candidatos que coincidan con los filtros seleccionados.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Paginación -->
      <div class="pagination">
        <button 
          @click="currentPage--" 
          :disabled="currentPage === 1"
          class="btn btn-sm btn-secondary"
        >
          Anterior
        </button>
        
        <span class="page-info">
          Página {{ currentPage }} de {{ totalPages }}
        </span>
        
        <button 
          @click="currentPage++" 
          :disabled="currentPage >= totalPages"
          class="btn btn-sm btn-secondary"
        >
          Siguiente
        </button>
      </div>
    </div>
    
    <!-- Modal de Invitación -->
    <div v-if="showInviteModal" class="modal-overlay" @click.self="showInviteModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>Invitar Candidato</h3>
          <button @click="showInviteModal = false" class="btn-icon">
            <i class="icon-x"></i>
          </button>
        </div>
        
        <div class="modal-body">
          <div class="form-group">
            <label class="input-label">Nombre del Candidato</label>
            <input 
              v-model="newCandidate.name" 
              type="text" 
              class="input" 
              placeholder="Nombre completo"
              required
            >
          </div>
          
          <div class="form-group">
            <label class="input-label">Correo Electrónico</label>
            <input 
              v-model="newCandidate.email" 
              type="email" 
              class="input" 
              placeholder="correo@ejemplo.com"
              required
            >
          </div>
          
          <div class="form-group">
            <label class="input-label">Prueba a Asignar</label>
            <select v-model="newCandidate.testId" class="input select" required>
              <option value="" disabled>Selecciona una prueba</option>
              <option v-for="test in activeTests" :key="test.id" :value="test.id">
                {{ test.name }} ({{ test.timeLimit }} min)
              </option>
            </select>
          </div>
          
          <div class="form-group">
            <label class="input-label">Fecha de Vencimiento</label>
            <input 
              v-model="newCandidate.expiresAt" 
              type="date" 
              class="input" 
              :min="minExpirationDate"
              required
            >
            <small class="text-muted">La prueba expirará a la medianoche (hora local) de la fecha seleccionada.</small>
          </div>
          
          <div class="form-group">
            <label class="input-label">Mensaje Personalizado (Opcional)</label>
            <textarea 
              v-model="newCandidate.customMessage" 
              class="input textarea" 
              rows="3"
              placeholder="Escribe un mensaje personalizado para el candidato..."
            ></textarea>
          </div>
        </div>
        
        <div class="modal-footer">
          <button @click="showInviteModal = false" class="btn btn-secondary">
            Cancelar
          </button>
          
          <button 
            @click="sendInvitation" 
            class="btn btn-primary"
            :disabled="!isFormValid || isSendingInvitation"
          >
            <span v-if="isSendingInvitation" class="spinner"></span>
            <span v-else>Enviar Invitación</span>
          </button>
        </div>
      </div>
    </div>
    
    <!-- Modal de Confirmación de Eliminación -->
    <div v-if="showDeleteModal" class="modal-overlay" @click.self="showDeleteModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>Confirmar Eliminación</h3>
          <button @click="showDeleteModal = false" class="btn-icon">
            <i class="icon-x"></i>
          </button>
        </div>
        
        <div class="modal-body">
          <p>¿Estás seguro de que deseas eliminar al candidato <strong>{{ candidateToDelete?.name }}</strong>?</p>
          <p class="text-muted">Esta acción no se puede deshacer y eliminará todos los datos asociados a este candidato.</p>
        </div>
        
        <div class="modal-footer">
          <button @click="showDeleteModal = false" class="btn btn-secondary">
            Cancelar
          </button>
          
          <button 
            @click="deleteCandidate" 
            class="btn btn-error"
            :disabled="isDeleting"
          >
            <span v-if="isDeleting" class="spinner"></span>
            <span v-else>Eliminar</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useToast } from 'vue-toastification';

// Tipos de datos
type CandidateStatus = 'pending' | 'in_progress' | 'completed' | 'expired';

interface Candidate {
  id: string;
  name: string;
  email: string;
  testId: string;
  testName?: string;
  status: CandidateStatus;
  invitedAt: string;
  expiresAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  score?: number | null;
  sessionId?: string;
}

interface Test {
  id: string;
  name: string;
  isActive: boolean;
  timeLimit: number;
}

// Estado del componente
const loading = ref(true);
const error = ref('');
const candidates = ref<Candidate[]>([]);
const tests = ref<Test[]>([]);
const searchQuery = ref('');
const statusFilter = ref('all');
const testFilter = ref('');
const currentPage = ref(1);
const itemsPerPage = 10;
const totalItems = ref(0);

// Estado para el modal de invitación
const showInviteModal = ref(false);
const isSendingInvitation = ref(false);
const newCandidate = ref({
  name: '',
  email: '',
  testId: '',
  expiresAt: '',
  customMessage: ''
});

// Estado para el modal de confirmación de eliminación
const showDeleteModal = ref(false);
const isDeleting = ref(false);
const candidateToDelete = ref<Candidate | null>(null);

// Inicializar el toast
const toast = useToast();

// Computed properties
const activeTests = computed(() => {
  return tests.value.filter(test => test.isActive);
});

const filteredCandidates = computed(() => {
  return candidates.value.filter(candidate => {
    // Filtrar por búsqueda
    const matchesSearch = searchQuery.value === '' || 
      candidate.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      candidate.email.toLowerCase().includes(searchQuery.value.toLowerCase());
    
    // Filtrar por estado
    const matchesStatus = statusFilter.value === 'all' || 
      candidate.status === statusFilter.value;
    
    // Filtrar por prueba
    const matchesTest = !testFilter.value || 
      candidate.testId === testFilter.value;
    
    return matchesSearch && matchesStatus && matchesTest;
  });
});

const totalPages = computed(() => {
  return Math.ceil(filteredCandidates.value.length / itemsPerPage);
});

// Usamos directamente filteredCandidates en la plantilla con v-for

const isFormValid = computed(() => {
  return (
    newCandidate.value.name.trim() !== '' &&
    newCandidate.value.email.trim() !== '' &&
    newCandidate.value.testId !== '' &&
    newCandidate.value.expiresAt !== ''
  );
});

const minExpirationDate = computed(() => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
});

// Métodos
const fetchCandidates = async () => {
  try {
    loading.value = true;
    error.value = '';
    
    // Simular una llamada a la API
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Datos de ejemplo para simular la respuesta de la API
    const mockCandidates: Candidate[] = [
      {
        id: '1',
        name: 'Juan Pérez',
        email: 'juan.perez@ejemplo.com',
        testId: '1',
        status: 'pending',
        invitedAt: '2023-06-15T10:30:00Z',
        expiresAt: '2023-07-15T23:59:59Z',
        score: null
      },
      {
        id: '2',
        name: 'María García',
        email: 'maria.garcia@ejemplo.com',
        testId: '2',
        status: 'in_progress',
        invitedAt: '2023-06-10T14:15:00Z',
        startedAt: '2023-06-12T09:30:00Z',
        expiresAt: '2023-06-25T23:59:59Z',
        score: null
      },
      {
        id: '3',
        name: 'Carlos López',
        email: 'carlos.lopez@ejemplo.com',
        testId: '1',
        status: 'completed',
        invitedAt: '2023-06-01T08:00:00Z',
        startedAt: '2023-06-02T10:15:00Z',
        completedAt: '2023-06-02T11:45:00Z',
        expiresAt: '2023-06-08T23:59:59Z',
        score: 85,
        sessionId: 'sess_12345'
      },
      {
        id: '4',
        name: 'Ana Martínez',
        email: 'ana.martinez@ejemplo.com',
        testId: '3',
        status: 'expired',
        invitedAt: '2023-05-20T16:45:00Z',
        expiresAt: '2023-06-05T23:59:59Z',
        score: null
      },
      {
        id: '5',
        name: 'Luis Rodríguez',
        email: 'luis.rodriguez@ejemplo.com',
        testId: '2',
        status: 'completed',
        invitedAt: '2023-06-05T11:20:00Z',
        startedAt: '2023-06-06T14:30:00Z',
        completedAt: '2023-06-06T16:15:00Z',
        expiresAt: '2023-06-12T23:59:59Z',
        score: 92,
        sessionId: 'sess_67890'
      }
    ];
    
    const mockTests: Test[] = [
      { id: '1', name: 'Prueba de JavaScript', isActive: true, timeLimit: 60 },
      { id: '2', name: 'Prueba de React', isActive: true, timeLimit: 90 },
      { id: '3', name: 'Prueba de Node.js', isActive: true, timeLimit: 75 },
      { id: '4', name: 'Prueba de Vue.js', isActive: false, timeLimit: 60 }
    ];
    
    // Asignar nombres de prueba a los candidatos
    const candidatesWithTestNames = mockCandidates.map(candidate => {
      const test = mockTests.find(t => t.id === candidate.testId);
      return {
        ...candidate,
        testName: test ? test.name : 'Prueba no encontrada'
      };
    });
    
    candidates.value = candidatesWithTestNames;
    tests.value = mockTests;
    totalItems.value = mockCandidates.length;
    
  } catch (err) {
    console.error('Error al cargar los candidatos:', err);
    error.value = 'No se pudieron cargar los candidatos. Por favor, inténtalo de nuevo más tarde.';
  } finally {
    loading.value = false;
  }
};

const fetchTests = async () => {
  try {
    // En una implementación real, esto sería una llamada HTTP
    // const response = await fetch('/api/tests');
    // const data = await response.json();
    // tests.value = data;
    
    // Para la demo, usamos los datos mockeados en fetchCandidates
  } catch (err) {
    console.error('Error al cargar las pruebas:', err);
    toast.error('No se pudieron cargar las pruebas disponibles');
  }
};

const sendInvitation = async () => {
  if (!isFormValid.value) return;
  
  try {
    isSendingInvitation.value = true;
    
    // Simular una llamada a la API
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mostrar mensaje de éxito
    toast.success('Invitación enviada correctamente');
    
    // Cerrar el modal y reiniciar el formulario
    showInviteModal.value = false;
    resetNewCandidateForm();
    
    // Recargar la lista de candidatos
    await fetchCandidates();
    
  } catch (err) {
    console.error('Error al enviar la invitación:', err);
    toast.error('Ocurrió un error al enviar la invitación');
  } finally {
    isSendingInvitation.value = false;
  }
};

const resendInvitation = async (candidateId: string) => {
  try {
    const candidate = candidates.value.find(c => c.id === candidateId);
    if (!candidate) {
      toast.error('No se encontró el candidato');
      return;
    }
    
    // Simular una llamada a la API
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Actualizar la fecha de invitación
    candidate.invitedAt = new Date().toISOString();
    
    toast.success(`Invitación reenviada a ${candidate.name} (${candidate.email})`);
    
  } catch (err) {
    console.error('Error al reenviar la invitación:', err);
    toast.error('Ocurrió un error al reenviar la invitación');
  }
};

const confirmDelete = (candidate: Candidate) => {
  candidateToDelete.value = candidate;
  showDeleteModal.value = true;
};

const deleteCandidate = async () => {
  if (!candidateToDelete.value) return;
  
  try {
    isDeleting.value = true;
    
    // Simular una llamada a la API
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast.success('Candidato eliminado correctamente');
    
    // Cerrar el modal y recargar la lista
    showDeleteModal.value = false;
    await fetchCandidates();
    
  } catch (err) {
    console.error('Error al eliminar el candidato:', err);
    toast.error('Ocurrió un error al eliminar el candidato');
  } finally {
    isDeleting.value = false;
    candidateToDelete.value = null;
  }
};

const resetFilters = () => {
  searchQuery.value = '';
  statusFilter.value = 'all';
  testFilter.value = '';
  currentPage.value = 1;
};

const resetNewCandidateForm = () => {
  newCandidate.value = {
    name: '',
    email: '',
    testId: '',
    expiresAt: '',
    customMessage: ''
  };
};

const getTestName = (testId: string) => {
  const test = tests.value.find(t => t.id === testId);
  return test ? test.name : 'Prueba no encontrada';
};

const getStatusText = (status: CandidateStatus) => {
  const statusMap: Record<CandidateStatus, string> = {
    pending: 'Pendiente',
    in_progress: 'En Progreso',
    completed: 'Completado',
    expired: 'Expirado'
  };
  return statusMap[status] || status;
};

const getStatusClass = (status: CandidateStatus) => {
  const statusClasses: Record<CandidateStatus, string> = {
    pending: 'status-pending',
    in_progress: 'status-in-progress',
    completed: 'status-completed',
    expired: 'status-expired'
  };
  return statusClasses[status] || '';
};

const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const isExpiringSoon = (expiresAt: string) => {
  if (!expiresAt) return false;
  
  const now = new Date();
  const expiryDate = new Date(expiresAt);
  const diffInDays = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  return diffInDays <= 2 && diffInDays >= 0; // Expira en 2 días o menos
};

// Ciclo de vida
onMounted(() => {
  fetchCandidates();
  fetchTests();
});
</script>

<style scoped>
.candidates-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.5rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--gris);
}

.header h1 {
  color: var(--azul-tritiano);
  margin: 0;
  font-size: 1.75rem;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: var(--blanco);
  border-radius: 8px;
  box-shadow: var(--shadow-sm);
}

.search-box {
  position: relative;
  flex: 1;
  min-width: 250px;
}

.search-box input {
  padding-left: 2.5rem;
  width: 100%;
}

.search-box i {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #6b7280;
}

.filter-group {
  display: flex;
  flex-direction: column;
  min-width: 200px;
}

.filter-group label {
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--azul-tritiano);
}

.table-container {
  background-color: var(--blanco);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  margin-bottom: 1.5rem;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid var(--gris);
}

th {
  background-color: var(--azul-tritiano);
  color: var(--blanco);
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

tr:hover {
  background-color: #f9fafb;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: capitalize;
}

.status-pending {
  background-color: #fef3c7;
  color: #92400e;
}

.status-in-progress {
  background-color: #dbeafe;
  color: #1e40af;
}

.status-completed {
  background-color: #d1fae5;
  color: #065f46;
}

.status-expired {
  background-color: #fee2e2;
  color: #991b1b;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.btn-icon {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-icon:hover {
  background-color: #f3f4f6;
  color: var(--azul-electrico);
}

.btn-icon.text-error:hover {
  color: #ef4444;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 1.5rem;
}

.page-info {
  font-size: 0.875rem;
  color: #4b5563;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal {
  background-color: var(--blanco);
  border-radius: 8px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--gris);
}

.modal-header h3 {
  margin: 0;
  color: var(--azul-tritiano);
  font-size: 1.25rem;
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  border-top: 1px solid var(--gris);
  background-color: #f9fafb;
}

/* Loading state */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 0;
  color: var(--azul-tritiano);
}

.loading-container .spinner {
  width: 40px;
  height: 40px;
  border-width: 3px;
  margin-bottom: 1rem;
}

/* Responsive */
@media (max-width: 768px) {
  .candidates-container {
    padding: 1rem;
  }
  
  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .filters {
    flex-direction: column;
    gap: 1rem;
  }
  
  .filter-group {
    width: 100%;
  }
  
  .search-box {
    width: 100%;
  }
  
  .table-container {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  table {
    min-width: 800px;
  }
  
  .modal {
    width: 100%;
    margin: 0 1rem;
  }
}

/* Utility classes */
.text-center { text-align: center; }
.text-muted { color: #6b7280; }
.text-warning { color: #b45309; }
.text-error { color: #b91c1c; }
.mb-0 { margin-bottom: 0; }
.mb-1 { margin-bottom: 0.25rem; }
.mb-2 { margin-bottom: 0.5rem; }
.mb-3 { margin-bottom: 0.75rem; }
</style>
