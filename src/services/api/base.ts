import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { useAuthStore } from '@/stores/auth';
import { ElMessage } from 'element-plus';

// Configuración base de Axios
const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para añadir el token de autenticación
apiClient.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore();
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas y errores
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response.data;
  },
  (error) => {
    // Manejo de errores HTTP
    if (error.response) {
      const { status, data } = error.response;
      
      // Manejo de errores específicos
      switch (status) {
        case 401:
          // Redirigir a login si no está autenticado
          const authStore = useAuthStore();
          authStore.logout();
          window.location.href = '/login';
          break;
        case 403:
          ElMessage.error('No tiene permisos para realizar esta acción');
          break;
        case 404:
          ElMessage.error('Recurso no encontrado');
          break;
        case 500:
          ElMessage.error('Error interno del servidor');
          break;
        default:
          ElMessage.error(data.message || 'Ha ocurrido un error');
      }
    } else if (error.request) {
      // Error de red
      ElMessage.error('Error de conexión con el servidor');
    } else {
      // Error en la configuración de la petición
      ElMessage.error('Error en la configuración de la petición');
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
