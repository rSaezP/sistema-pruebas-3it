import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { loginWithCognito } from '@/auth/authService';
import { logoutFromCognito } from '@/auth/logout';
import { handleCallback } from '@/auth/handleCallback';
import { getUserInfo, getUserName as getCognitoUserName, isAuthenticated as isCognitoAuthenticated } from '@/auth/getUserInfo';

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null);
  const accessToken = ref(localStorage.getItem('access_token'));

  const isAuthenticated = computed(() => isCognitoAuthenticated());

  const initializeAuth = () => {
    if (isCognitoAuthenticated()) {
      user.value = getUserInfo();
      accessToken.value = localStorage.getItem('access_token');
    }
  };

  const loginCognito = async () => {
    await loginWithCognito();
  };

  const handleAuthCallback = async () => {
    try {
      const tokens = await handleCallback();
      if (tokens) {
        accessToken.value = tokens.access_token;
        user.value = getUserInfo();
        return { success: true };
      }
      return { success: false, error: 'No se pudieron obtener los tokens' };
    } catch (error) {
      console.error('Error en callback:', error);
      return { success: false, error: 'Error en autenticación' };
    }
  };

  const logout = () => {
    logoutFromCognito();
  };

  const checkAuthStatus = async () => {
    return isCognitoAuthenticated();
  };

  const getUserName = () => {
    return getCognitoUserName();
  };

  // Initialize auth on store creation
  initializeAuth();

  return {
    user,
    accessToken,
    isAuthenticated,
    loginCognito,
    handleAuthCallback,
    logout,
    checkAuth: checkAuthStatus,
    getUserName,
    initializeAuth
  };
});