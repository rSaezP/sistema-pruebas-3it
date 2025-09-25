<template>
  <div class="login-container">
    <!-- Patrón de fondo con logo sutil -->
    <div class="background-pattern"></div>
    
    <!-- Círculos decorativos -->
    <div class="decoration-circle circle-1"></div>
    <div class="decoration-circle circle-2"></div>
    <div class="decoration-circle circle-3"></div>
    
    <div class="login-card">
      <div class="login-header">
        <div class="logo">
          <img src="@/assets/logo-3it.png" alt="3IT Logo" class="logo-image">
        </div>
        <h1>Sistema de Pruebas Técnicas</h1>
      </div>
      
      <div class="login-form">
        <div v-if="error" class="alert alert-error">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          {{ error }}
        </div>
        
        <button @click="handleCognitoLogin" class="btn btn-primary btn-lg login-btn" :disabled="loading">
          <svg v-if="loading" class="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12,6 12,12 16,14"/>
          </svg>
          <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H15"/>
            <polyline points="10,17 15,12 10,7"/>
            <path d="M21 12H3"/>
          </svg>
          {{ loading ? 'Iniciando sesión...' : 'Iniciar Sesión' }}
        </button>
        
        <!-- Información adicional -->
        <div class="login-footer">
          <p>Powered by AWS Cognito</p>
          <div class="security-badges">
            <span class="security-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 1L3 5V11C3 16 6 20 12 23C18 20 21 16 21 11V5L12 1Z"/>
                <polyline points="9,12 11,14 15,10"/>
              </svg>
              Seguro
            </span>
            <span class="security-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <circle cx="12" cy="16" r="1"/>
                <path d="M7 11V7C7 5.67392 7.52678 4.40215 8.46447 3.46447C9.40215 2.52678 10.6739 2 12 2C13.3261 2 14.5979 2.52678 15.5355 3.46447C16.4732 4.40215 17 5.67392 17 7V11"/>
              </svg>
              Encriptado
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const loading = ref(false);
const error = ref('');

onMounted(() => {
  // Check if user is already authenticated
  if (authStore.isAuthenticated) {
    router.push('/admin/dashboard');
  }
});

const handleCognitoLogin = async () => {
  loading.value = true;
  error.value = '';
  
  try {
    await authStore.loginCognito();
  } catch (err) {
    console.error('Error iniciando login:', err);
    error.value = 'Error al iniciar sesión';
    loading.value = false;
  }
};

</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #000026 0%, #005AEE 50%, #2CD5C4 100%);
  padding: 20px;
  position: relative;
  overflow: hidden;
}

/* Patrón de fondo sutil */
.background-pattern {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  animation: backgroundMove 20s ease-in-out infinite;
}

/* Círculos decorativos flotantes */
.decoration-circle {
  position: absolute;
  border-radius: 50%;
  background: linear-gradient(45deg, rgba(255, 255, 255, 0.1), rgba(44, 213, 196, 0.2));
  animation: float 6s ease-in-out infinite;
}

.circle-1 {
  width: 80px;
  height: 80px;
  top: 10%;
  left: 10%;
  animation-delay: -2s;
}

.circle-2 {
  width: 120px;
  height: 120px;
  top: 70%;
  right: 10%;
  animation-delay: -4s;
}

.circle-3 {
  width: 60px;
  height: 60px;
  top: 30%;
  right: 20%;
  animation-delay: -1s;
}

/* Tarjeta de login mejorada */
.login-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 36px;
  box-shadow: 
    0 25px 50px rgba(0, 0, 0, 0.15),
    0 0 0 1px rgba(255, 255, 255, 0.2);
  width: 100%;
  max-width: 420px;
  position: relative;
  animation: cardSlideUp 0.8s ease-out;
}

.login-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #005AEE 0%, #2CD5C4 100%);
  border-radius: 24px 24px 0 0;
}

/* Logo */
.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
}

.logo-image {
  width: 200px;
  height: 100px;
  object-fit: contain;
  transition: all 0.2s ease;
}

/* Logo de texto temporal */
.company-logo-text {
  font-size: 48px !important;
  font-weight: 900 !important;
  color: #005AEE !important;
  transition: transform 0.3s ease;
  letter-spacing: 4px !important;
  cursor: pointer;
  margin-bottom: 24px !important;
  text-align: center !important;
  display: block !important;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3) !important;
}

.company-logo-text:hover {
  transform: scale(1.05);
  color: #2CD5C4 !important;
}

/* Header mejorado */
.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-header h1 {
  color: #005AEE;
  font-size: 24px;
  margin: 0 0 16px 0;
  font-weight: 400;
}

.login-header p {
  color: #64748b;
  font-size: 14px;
  margin: 0;
  font-weight: 500;
}

/* Formulario mejorado */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Botón de login mejorado */
.login-btn {
  width: 100%;
  height: 56px;
  background: linear-gradient(135deg, #005AEE 0%, #2CD5C4 100%);
  border: none;
  border-radius: 16px;
  color: white;
  font-size: 18px;
  font-weight: 400;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 16px rgba(0, 90, 238, 0.3);
  position: relative;
  overflow: hidden;
}

.login-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.login-btn:hover::before {
  left: 100%;
}

.login-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 90, 238, 0.4);
}

.login-btn:active {
  transform: translateY(0);
}

.login-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

/* Spinner animado */
.spinner {
  animation: spin 1s linear infinite;
}

/* Alert mejorado */
.alert {
  padding: 16px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 500;
}

.alert-error {
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
  color: #dc2626;
  border: 1px solid #fecaca;
}

/* Footer del login */
.login-footer {
  text-align: center;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e2e8f0;
}

.login-footer p {
  color: #64748b;
  font-size: 14px;
  margin-bottom: 12px;
}

.security-badges {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.security-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #1FA89A;
  font-size: 12px;
  font-weight: 500;
  padding: 4px 8px;
  background: rgba(44, 213, 196, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(44, 213, 196, 0.3);
}

/* Animaciones */
@keyframes backgroundMove {
  0%, 100% { transform: translateY(0px) translateX(0px); }
  50% { transform: translateY(-10px) translateX(-5px); }
}

@keyframes float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(180deg); }
}

@keyframes cardSlideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Responsive */
@media (max-width: 768px) {
  .login-card {
    margin: 20px;
    padding: 32px;
    max-width: none;
  }
  
  .company-logo {
    width: 100px;
  }
  
  .company-logo-text {
    font-size: 40px !important;
    letter-spacing: 2px !important;
  }
  
  .login-header h1 {
    font-size: 18px;
  }
  
  .decoration-circle {
    display: none;
  }
}

@media (max-width: 480px) {
  .security-badges {
    flex-direction: column;
    align-items: center;
  }
}
</style>