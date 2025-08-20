import apiClient from './base';

interface TestQuestion {
  id?: string;
  question: string;
  type: 'multiple_choice' | 'code' | 'text';
  options?: string[];
  correctAnswer?: string | number;
  points: number;
  codeTemplate?: string;
  language?: string;
}

interface Test {
  id?: string;
  title: string;
  description: string;
  duration: number; // en minutos
  isActive: boolean;
  questions: TestQuestion[];
  createdAt?: string;
  updatedAt?: string;
}

interface TestFilters {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export const testService = {
  // Obtener lista de pruebas con paginación y filtros
  async getTests(filters: TestFilters = {}): Promise<{ data: Test[], total: number }> {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.isActive !== undefined) params.append('isActive', String(filters.isActive));
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    
    const response = await apiClient.get(`/tests?${params.toString()}`);
    return response;
  },

  // Obtener una prueba por ID
  async getTestById(id: string): Promise<Test> {
    const response = await apiClient.get(`/tests/${id}`);
    return response;
  },

  // Crear una nueva prueba
  async createTest(testData: Omit<Test, 'id'>): Promise<Test> {
    const response = await apiClient.post('/tests', testData);
    return response;
  },

  // Actualizar una prueba existente
  async updateTest(id: string, testData: Partial<Test>): Promise<Test> {
    const response = await apiClient.put(`/tests/${id}`, testData);
    return response;
  },

  // Eliminar una prueba
  async deleteTest(id: string): Promise<void> {
    await apiClient.delete(`/tests/${id}`);
  },

  // Cambiar estado de una prueba (activo/inactivo)
  async toggleTestStatus(id: string, isActive: boolean): Promise<Test> {
    const response = await apiClient.patch(`/tests/${id}/status`, { isActive });
    return response;
  },

  // Obtener estadísticas de una prueba
  async getTestStats(id: string) {
    const response = await apiClient.get(`/tests/${id}/stats`);
    return response;
  },

  // Obtener pruebas activas para el selector
  async getActiveTests(): Promise<{ id: string; title: string }[]> {
    const response = await apiClient.get('/tests/active');
    return response;
  }
};

export type { Test, TestQuestion, TestFilters };
