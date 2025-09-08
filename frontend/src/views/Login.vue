<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h1>Sistema de Pruebas 3IT</h1>
        <p>Acceso de administrador</p>
      </div>
      
      <div class="login-form">
        <div v-if="error" class="alert alert-error">
          {{ error }}
        </div>
        
        <button @click="handleCognitoLogin" class="btn btn-primary btn-lg" :disabled="loading">
          <span v-if="loading" class="spinner"></span>
          {{ loading ? 'Redirigiendo...' : 'Iniciar Sesión con AWS Cognito' }}
        </button>
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
  background: linear-gradient(135deg, var(--azul-tritiano) 0%, var(--azul-electrico) 100%);
  padding: var(--spacing-4);
}

.login-card {
  background-color: var(--blanco);
  border-radius: var(--radius-xl);
  padding: var(--spacing-6);
  box-shadow: var(--shadow-lg);
  width: 100%;
  max-width: 400px;
}

.login-header {
  text-align: center;
  margin-bottom: var(--spacing-6);
}

.login-header h1 {
  color: var(--azul-tritiano);
  font-size: var(--font-size-2xl);
  margin-bottom: var(--spacing-1);
}

.login-header p {
  color: #6B7280;
  font-size: var(--font-size-base);
  margin: 0;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.btn-lg {
  width: 100%;
  margin-top: var(--spacing-2);
}
</style>