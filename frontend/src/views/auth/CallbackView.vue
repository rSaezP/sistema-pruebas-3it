<template>
  <div class="callback-container">
    <div class="callback-card">
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <p>Procesando autenticación...</p>
      </div>
      <div v-else-if="error" class="error">
        <h2>Error de Autenticación</h2>
        <p>{{ error }}</p>
        <button @click="goToLogin" class="btn btn-primary">
          Volver al Login
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

const loading = ref(true);
const error = ref('');

onMounted(async () => {
  try {
    const result = await authStore.handleAuthCallback();
    
    if (result.success) {
      // Redirect to dashboard after successful authentication
      router.push('/admin/dashboard');
    } else {
      error.value = result.error || 'Error en la autenticación';
      loading.value = false;
    }
  } catch (err) {
    console.error('Error en callback:', err);
    error.value = 'Error procesando la autenticación';
    loading.value = false;
  }
});

const goToLogin = () => {
  router.push('/login');
};
</script>

<style scoped>
.callback-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--azul-tritiano) 0%, var(--azul-electrico) 100%);
  padding: var(--spacing-4);
}

.callback-card {
  background-color: var(--blanco);
  border-radius: var(--radius-xl);
  padding: var(--spacing-6);
  box-shadow: var(--shadow-lg);
  text-align: center;
  max-width: 400px;
  width: 100%;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-3);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid var(--azul-tritiano);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error {
  text-align: center;
}

.error h2 {
  color: var(--rojo);
  margin-bottom: var(--spacing-2);
}

.error p {
  color: #666;
  margin-bottom: var(--spacing-4);
}
</style>