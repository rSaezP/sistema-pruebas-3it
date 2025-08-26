<template>
  <div class="test-completed-container">
    <div class="test-completed-card">
      <div class="test-completed-header">
        <div class="success-icon">✅</div>
        <h1>¡Prueba Finalizada!</h1>
        <p>Tu prueba técnica ha sido enviada correctamente</p>
      </div>
      
      <div class="test-completed-content">
        <div class="message-section">
          <h2>¿Qué sigue ahora?</h2>
          <ul class="next-steps">
            <li>Nuestro equipo técnico revisará tus respuestas</li>
            <li>Te contactaremos en los próximos días con los resultados</li>

          </ul>
        </div>
        
        
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const token = ref(route.params.token as string);
const countdown = ref(10);
let intervalId: number | null = null;

onMounted(() => {
  // Auto-redirect después de 10 segundos
  intervalId = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) {
      window.close(); // Intentar cerrar la ventana
      // Fallback si no se puede cerrar
      setTimeout(() => {
        router.push('/');
      }, 1000);
    }
  }, 1000);
});

onUnmounted(() => {
  if (intervalId) {
    clearInterval(intervalId);
  }
});
</script>

<style scoped>
.test-completed-container {
  min-height: 100vh;
  background: linear-gradient(135deg, var(--azul-tritiano) 0%, var(--azul-electrico) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-3);
}

.test-completed-card {
  background: var(--blanco);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  padding: var(--spacing-6);
  max-width: 600px;
  width: 100%;
  text-align: center;
}

.test-completed-header {
  margin-bottom: var(--spacing-5);
}

.success-icon {
  font-size: 4rem;
  margin-bottom: var(--spacing-2);
}

.test-completed-header h1 {
  color: var(--azul-tritiano);
  font-size: var(--font-size-3xl);
  font-weight: 600;
  margin-bottom: var(--spacing-2);
}

.test-completed-header p {
  color: var(--azul-electrico);
  font-size: var(--font-size-lg);
}

.test-completed-content {
  text-align: left;
}

.message-section {
  margin-bottom: var(--spacing-5);
}

.message-section h2 {
  color: var(--azul-tritiano);
  font-size: var(--font-size-xl);
  margin-bottom: var(--spacing-3);
}

.next-steps {
  list-style: none;
  padding: 0;
}

.next-steps li {
  padding: var(--spacing-2);
  margin-bottom: var(--spacing-2);
  background: var(--gris);
  border-radius: var(--radius-md);
  border-left: 4px solid var(--turquesa);
}

.redirect-info {
  text-align: center;
  padding: var(--spacing-3);
  background: var(--gris);
  border-radius: var(--radius-md);
}

.countdown {
  font-weight: 600;
  color: var(--azul-electrico);
}

.small-text {
  font-size: var(--font-size-sm);
  color: #666;
  margin-top: var(--spacing-2);
}
</style>