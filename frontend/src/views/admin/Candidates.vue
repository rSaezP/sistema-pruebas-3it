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
        <label class="input-label">Buscar candidatos:</label>
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
            <tr v-for="candidate in paginatedCandidates" :key="candidate.id">
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
                {{ formatExpiryDate(candidate.expiresAt) }}
              </td>
              <td>
                <span v-if="candidate.score !== null">
                  {{ candidate.score }}/100
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
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                </button>
                
               
                
                <button 
                  v-if="candidate.status === 'completed'"
                  @click="downloadReport(candidate.id, candidate.name)"
                  class="btn-icon"
                  title="Descargar reporte PDF"
                  :disabled="downloadingReports.has(candidate.id)"
                >
                  <span v-if="downloadingReports.has(candidate.id)" class="spinner-sm"></span>
                  <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"/>
                    <polyline points="14,2 14,8 20,8"/>
                  </svg>
                </button>
                
                <button 
                  @click="confirmDelete(candidate)"
                  class="btn-icon text-error"
                  title="Eliminar candidato"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3,6 5,6 21,6"/>
                    <path d="M19 6V20C19 21 18 22 17 22H7C6 22 5 21 5 20V6M8 6V4C8 3 9 2 10 2H14C15 2 16 3 16 4V6"/>
                    <line x1="10" y1="11" x2="10" y2="17"/>
                    <line x1="14" y1="11" x2="14" y2="17"/>
                  </svg>
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
          ({{ filteredCandidates.length }} candidato{{ filteredCandidates.length !== 1 ? 's' : '' }})
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
import { ref, computed, onMounted, watch } from 'vue';
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
  sessionToken?: string;
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

// Estado para la descarga de reportes PDF
const downloadingReports = ref(new Set<string>());

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

const paginatedCandidates = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return filteredCandidates.value.slice(start, end);
});

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

// Watchers para resetear página cuando cambien los filtros
watch([searchQuery, statusFilter, testFilter], () => {
  currentPage.value = 1;
});

// Watcher para ajustar la página actual si queda fuera del rango
watch(totalPages, (newTotalPages) => {
  if (currentPage.value > newTotalPages && newTotalPages > 0) {
    currentPage.value = newTotalPages;
  }
});

// Métodos
const fetchCandidates = async () => {
  try {
    loading.value = true;
    error.value = '';
    
    const response = await fetch('http://localhost:4000/api/candidates');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    
    // Mapear los datos de la API al formato esperado por la interfaz
    candidates.value = data.map(candidate => ({
      id: candidate.id.toString(),
      name: candidate.name,
      email: candidate.email,
      testId: candidate.test_id ? candidate.test_id.toString() : '',
      status: candidate.status || 'pending',
      invitedAt: candidate.created_at,
      expiresAt: candidate.expires_at,
      startedAt: candidate.started_at || null,
      completedAt: candidate.completed_at || null,
      score: candidate.avg_score || null,
      sessionId: candidate.session_id || null,
      sessionToken: candidate.session_token || null
    }));
    
    totalItems.value = candidates.value.length;
    
  } catch (err) {
    console.error('Error al cargar los candidatos:', err);
    error.value = 'No se pudieron cargar los candidatos. Por favor, inténtalo de nuevo más tarde.';
  } finally {
    loading.value = false;
  }
};

const fetchTests = async () => {
  try {
    const response = await fetch('http://localhost:4000/api/tests');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    tests.value = data.filter(test => test.is_active).map(test => ({
      id: test.id.toString(),
      name: test.name,
      isActive: test.is_active,
      timeLimit: test.time_limit
    }));
  } catch (err) {
    console.error('Error al cargar las pruebas:', err);
    toast.error('No se pudieron cargar las pruebas disponibles');
  }
};

const sendInvitation = async () => {
  if (!isFormValid.value) return;
  
  try {
    isSendingInvitation.value = true;
    
    // Convertir testId a número
    const testId = parseInt(newCandidate.value.testId, 10);
    
    if (isNaN(testId)) {
      throw new Error('ID de prueba no válido');
    }

    // DEBUGGING: Ver exactamente qué datos se envían
    console.log('=== DEBUGGING CANDIDATO ===');
    console.log('testId original:', newCandidate.value.testId);
    console.log('testId convertido:', testId);
    const requestBody = {
      name: newCandidate.value.name,
      email: newCandidate.value.email,
      test_id: testId,
      expires_at: newCandidate.value.expiresAt,
      custom_message: newCandidate.value.customMessage
    };
    console.log('Objeto completo a enviar:', requestBody);
    console.log('Tipo de test_id:', typeof testId);

    // Crear el candidato
    const candidateResponse = await fetch('http://localhost:4000/api/candidates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: newCandidate.value.name,
        email: newCandidate.value.email,
        test_id: testId, // Ahora es un número
        expires_at: newCandidate.value.expiresAt,
        custom_message: newCandidate.value.customMessage
      }),
    });

    if (!candidateResponse.ok) {
      const errorData = await candidateResponse.json().catch(() => ({}));
      console.log('Error response:', { status: candidateResponse.status, errorData });
      
      if (errorData.error === 'candidate_exists') {
        // Si el candidato ya existe, ofrecer opciones
        const shouldResend = confirm(`${errorData.message}. ¿Deseas reenviar la invitación?`);
        if (shouldResend && errorData.candidateId) {
          await resendInvitation(errorData.candidateId);
          return; // Salir después de reenviar
        }
        throw new Error(errorData.message);
      }
      
      throw new Error(errorData.message || `Error al crear candidato: ${candidateResponse.status}`);
    }

    const candidateData = await candidateResponse.json();
    
    // Enviar email de invitación
    const emailResponse = await fetch('http://localhost:4000/api/email/send-invitation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        candidateId: candidateData.id,
        testId: newCandidate.value.testId,
        sessionToken: candidateData.sessionToken
      }),
    });

    if (!emailResponse.ok) {
      console.warn('Error al enviar email, pero candidato creado exitosamente');
      toast.warning('Candidato creado, pero hubo un error al enviar el email');
    } else {
      toast.success('Invitación enviada correctamente');
    }
    
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

const resendInvitation = async (candidateId: string | number) => {
  try {
    const candidate = candidates.value.find(c => c.id === candidateId);
    if (!candidate) {
      toast.error('No se encontró el candidato');
      return;
    }
    
    // Reenviar email de invitación
    const response = await fetch('http://localhost:4000/api/email/send-invitation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        candidateId: candidateId,
        testId: candidate.testId,
        sessionToken: candidate.sessionToken
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
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
    
    const response = await fetch(`http://localhost:4000/api/candidates/session/${candidateToDelete.value.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Error ${response.status}: No se pudo eliminar el candidato`);
    }
    
    toast.success('Prueba eliminada correctamente');
    
    // Cerrar el modal y recargar la lista
    showDeleteModal.value = false;
    await fetchCandidates();
    
  } catch (err: unknown) {
    console.error('Error al eliminar el candidato:', err);
    const errorMessage = err instanceof Error ? err.message : 'Ocurrió un error al eliminar el candidato';
    toast.error(errorMessage);
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

// Función específica para fechas de expiración (solo fecha, sin hora)
const formatExpiryDate = (dateString: string) => {
  if (!dateString) return '-';
  
  // Para fechas en formato YYYY-MM-DD, mantener solo la fecha sin conversión de zona horaria
  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
  
  // Para otros formatos, usar formatDate normal
  return formatDate(dateString);
};

const isExpiringSoon = (expiresAt: string) => {
  if (!expiresAt) return false;
  
  const now = new Date();
  const expiryDate = new Date(expiresAt);
  const diffInDays = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  return diffInDays <= 2 && diffInDays >= 0; // Expira en 2 días o menos
};

const downloadReport = async (candidateId: string, candidateName: string) => {
  try {
    // Agregar el candidato al set de descargas en progreso
    downloadingReports.value.add(candidateId);
    
    // Realizar la petición al endpoint PDF
    const response = await fetch(`http://localhost:4000/api/candidates/${candidateId}/reports/pdf`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Error ${response.status}: No se pudo generar el reporte PDF`);
    }
    
    // Obtener el blob del PDF
    const blob = await response.blob();
    
    // Crear un enlace temporal para descargar el archivo
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Formato del nombre del archivo: "Reporte_NombreCandidato_YYYYMMDD.pdf"
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const sanitizedName = candidateName.replace(/[^a-zA-Z0-9]/g, '_');
    link.download = `Reporte_${sanitizedName}_${dateStr}.pdf`;
    
    // Simular clic para descargar
    document.body.appendChild(link);
    link.click();
    
    // Limpiar
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    toast.success(`Reporte PDF descargado correctamente para ${candidateName}`);
    
  } catch (err: unknown) {
    console.error('Error al descargar el reporte PDF:', err);
    const errorMessage = err instanceof Error ? err.message : 'Ocurrió un error al descargar el reporte PDF';
    toast.error(errorMessage);
  } finally {
    // Remover el candidato del set de descargas en progreso
    downloadingReports.value.delete(candidateId);
  }
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
  display: grid;
  grid-template-columns: 2fr 1fr 1fr auto;
  gap: 1rem;
  align-items: end;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: var(--blanco);
  border-radius: 8px;
  box-shadow: var(--shadow-sm);
}

.search-box {
  position: relative;
  display: flex;
  flex-direction: column;
}

.search-box .input-label {
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--azul-tritiano);
}

.search-box input {
  padding-left: 2.5rem;
  width: 100%;
}

.search-box i {
  position: absolute;
  left: 1rem;
  bottom: 50%;
  transform: translateY(50%);
  color: #6b7280;
}

.filter-group {
  display: flex;
  flex-direction: column;
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
  background: var(--blanco);
  border: 1px solid var(--primary);
  color: var(--primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  border-radius: var(--radius-md);
  transition: all 0.2s;
}

.btn-icon:hover {
  background-color: var(--primary);
  color: var(--blanco);
}

.btn-icon.text-error {
  border-color: var(--primary);
  color: var(--primary);
}

.btn-icon.text-error:hover {
  background-color: var(--primary);
  color: var(--blanco);
}

.btn-icon:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner-sm {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid var(--azul-electrico);
  border-radius: 50%;
  animation: spin 1s linear infinite;
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
    grid-template-columns: 1fr;
    gap: 1rem;
    align-items: stretch;
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
