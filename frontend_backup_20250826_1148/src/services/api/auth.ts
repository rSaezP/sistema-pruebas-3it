import apiClient from './base';

interface LoginCredentials {
  email: string;
  password: string;
}

interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export const authService = {
  // Iniciar sesión
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return response;
  },

  // Cerrar sesión
  async logout(): Promise<void> {
    // Nota: Este endpoint podría no ser necesario dependiendo de la implementación del backend
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.warn('Error al cerrar sesión en el servidor:', error);
    }
  },

  // Verificar token de autenticación
  async verifyToken(token: string): Promise<{ valid: boolean; user?: any }> {
    try {
      const response = await apiClient.get('/auth/verify-token', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return { valid: true, user: response.user };
    } catch (error) {
      return { valid: false };
    }
  },

  // Solicitar restablecimiento de contraseña
  async forgotPassword(email: string): Promise<{ message: string }> {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response;
  },

  // Restablecer contraseña
  async resetPassword(
    token: string,
    password: string,
    passwordConfirmation: string
  ): Promise<{ message: string }> {
    const response = await apiClient.post('/auth/reset-password', {
      token,
      password,
      password_confirmation: passwordConfirmation,
    });
    return response;
  },
};
