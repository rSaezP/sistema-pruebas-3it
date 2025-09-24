<template>
  <div class="redirect-container">
    <div class="redirect-message">
      <div class="spinner"></div>
      <h2>Redirigiendo al Dashboard...</h2>
      <p>Los reportes ahora están integrados en el Dashboard principal</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// Redirigir inmediatamente al dashboard fusionado
onMounted(() => {
  router.replace('/admin/dashboard')
})

// Componente redirigido - toda la funcionalidad ahora está en Dashboard

// Toda la funcionalidad se movió al Dashboard
</script>

<style scoped>
.redirect-container {
  padding: var(--spacing-6);
  background: var(--gris);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.redirect-message {
  text-align: center;
  background: var(--blanco);
  padding: var(--spacing-8);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  max-width: 500px;
}

.redirect-message h2 {
  color: var(--azul-tritiano);
  margin: var(--spacing-4) 0 var(--spacing-2) 0;
}

.redirect-message p {
  color: var(--text-muted);
  margin: 0;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid var(--azul-tritiano);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto var(--spacing-4) auto;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Estilos eliminados - componente redirigido */

</style>