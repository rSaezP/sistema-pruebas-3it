import apiClient from './base';

interface Candidate {
  id?: string;
  name: string;
  email: string;
  testId: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'expired';
  invitedAt?: string;
  expiresAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  score?: number | null;
  sessionId?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface CandidateFilters {
  search?: string;
  status?: string;
  testId?: string;
  page?: number;
  limit?: number;
}

export const candidateService = {
  // Obtener lista de candidatos con paginación y filtros
  async getCandidates(filters: CandidateFilters = {}): Promise<PaginatedResponse<Candidate>> {
    const params = new URLSearchParams();
    
    // Añadir filtros a los parámetros de la URL
    if (filters.search) params.append('search', filters.search);
    if (filters.status) params.append('status', filters.status);
    if (filters.testId) params.append('testId', filters.testId);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    
    const response = await apiClient.get(`/candidates?${params.toString()}`);
    return response;
  },

  // Obtener un candidato por ID
  async getCandidateById(id: string): Promise<Candidate> {
    const response = await apiClient.get(`/candidates/${id}`);
    return response;
  },

  // Crear un nuevo candidato
  async createCandidate(candidateData: Omit<Candidate, 'id'>): Promise<Candidate> {
    const response = await apiClient.post('/candidates', candidateData);
    return response;
  },

  // Actualizar un candidato existente
  async updateCandidate(id: string, candidateData: Partial<Candidate>): Promise<Candidate> {
    const response = await apiClient.put(`/candidates/${id}`, candidateData);
    return response;
  },

  // Eliminar un candidato
  async deleteCandidate(id: string): Promise<void> {
    await apiClient.delete(`/candidates/${id}`);
  },

  // Reenviar invitación a un candidato
  async resendInvitation(id: string): Promise<{ message: string }> {
    const response = await apiClient.post(`/candidates/${id}/resend-invitation`);
    return response;
  },

  // Obtener estadísticas de candidatos
  async getCandidateStats() {
    const response = await apiClient.get('/candidates/stats');
    return response;
  }
};

export type { Candidate, CandidateFilters };
