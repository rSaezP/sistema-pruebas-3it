<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h1>Sistema de Pruebas 3IT</h1>
        <p>Acceso de administrador</p>
      </div>
      
      <form @submit.prevent="handleLogin" class="login-form">
        <div class="input-group">
          <label for="username" class="input-label">Usuario</label>
          <input
            id="username"
            v-model="username"
            type="text"
            class="input"
            placeholder="Ingrese su usuario"
            required
          />
        </div>
        
        <div class="input-group">
          <label for="password" class="input-label">Contraseña</label>
          <input
            id="password"
            v-model="password"
            type="password"
            class="input"
            placeholder="Ingrese su contraseña"
            required
          />
        </div>
        
        <div v-if="error" class="alert alert-error">
          {{ error }}
        </div>
        
        <button type="submit" class="btn btn-primary btn-lg" :disabled="loading">
          <span v-if="loading" class="spinner"></span>
          {{ loading ? 'Iniciando sesión...' : 'Iniciar Sesión' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const username = ref('admin');
const password = ref('admin123');
const loading = ref(false);
const error = ref('');

const handleLogin = async () => {
  loading.value = true;
  error.value = '';
  
  try {
    const result = await authStore.login(username.value, password.value);
    
    if (result.success) {
      router.push('/admin/dashboard');
    } else {
      error.value = result.error || 'Error al iniciar sesión';
    }
  } catch (err) {
    error.value = 'Error de conexión';
  } finally {
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