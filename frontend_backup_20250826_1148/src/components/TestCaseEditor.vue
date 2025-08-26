<template>
  <div class="test-cases-section">
    <div class="section-header">
      <h5>Casos de Prueba</h5>
      <button 
        type="button" 
        @click="addTestCase" 
        class="btn btn-secondary btn-sm"
      >
        + Agregar Caso
      </button>
    </div>

    <div 
      v-for="(testCase, index) in localTestCases" 
      :key="testCase.id"
      class="test-case-card"
    >
      <div class="test-case-header">
        <span class="test-case-number">Caso {{ index + 1 }}</span>
        <button 
          type="button" 
          @click="removeTestCase(testCase.id)" 
          class="btn-icon delete"
          :disabled="localTestCases.length <= 1"
        >
          🗑️
        </button>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label>Nombre del Caso</label>
          <input 
            :value="testCase.name"
            @input="updateTestCase(testCase.id, 'name', $event.target.value)"
            type="text" 
            placeholder="Ej: Caso básico"
            class="input"
          >
        </div>
        
        <div class="form-group">
          <label>Peso</label>
          <input 
            :value="testCase.weight"
            @input="updateTestCase(testCase.id, 'weight', parseFloat($event.target.value))"
            type="number" 
            min="0.1"
            step="0.1"
            class="input"
          >
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Datos de Entrada</label>
          <textarea 
            :value="testCase.input_data"
            @input="updateTestCase(testCase.id, 'input_data', $event.target.value)"
            rows="3"
            placeholder="Datos de entrada (ej: [1, 2, 3])"
            class="input textarea"
          ></textarea>
        </div>
        
        <div class="form-group">
          <label>Salida Esperada</label>
          <textarea 
            :value="testCase.expected_output"
            @input="updateTestCase(testCase.id, 'expected_output', $event.target.value)"
            rows="3"
            placeholder="Resultado esperado (ej: 6)"
            class="input textarea"
          ></textarea>
        </div>
      </div>

      <div class="form-group">
        <label class="checkbox-label">
          <input 
            type="checkbox" 
            :checked="testCase.is_hidden"
            @change="updateTestCase(testCase.id, 'is_hidden', $event.target.checked)"
          >
          Caso oculto (no visible para el candidato)
        </label>
      </div>
    </div>

    <div v-if="localTestCases.length === 0" class="empty-state">
      <p>Aún no has agregado casos de prueba.</p>
      <button type="button" @click="addTestCase" class="btn btn-primary">
        Agregar Primer Caso
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface TestCase {
  id: string
  name: string
  input_data: string
  expected_output: string
  is_hidden: boolean
  weight: number
  timeout_ms: number
}

// Props
const props = defineProps<{
  testCases: TestCase[]
}>()

// Emits
const emit = defineEmits<{
  'update:testCases': [testCases: TestCase[]]
}>()

// Local state with unique IDs
const localTestCases = ref<TestCase[]>([])

// Watch props and sync with local state
watch(() => props.testCases, (newCases) => {
  localTestCases.value = newCases.map(tc => ({
    ...tc,
    id: tc.id || crypto.randomUUID()
  }))
}, { immediate: true, deep: true })

// Methods
const addTestCase = () => {
  const newCase: TestCase = {
    id: crypto.randomUUID(),
    name: `Caso ${localTestCases.value.length + 1}`,
    input_data: '',
    expected_output: '',
    is_hidden: false,
    weight: 1.0,
    timeout_ms: 5000
  }
  
  const updatedCases = [...localTestCases.value, newCase]
  localTestCases.value = updatedCases
  emit('update:testCases', updatedCases)
}

const removeTestCase = (id: string) => {
  const updatedCases = localTestCases.value.filter(tc => tc.id !== id)
  localTestCases.value = updatedCases
  emit('update:testCases', updatedCases)
}

const updateTestCase = (id: string, field: keyof TestCase, value: any) => {
  const updatedCases = localTestCases.value.map(tc => 
    tc.id === id ? { ...tc, [field]: value } : tc
  )
  localTestCases.value = updatedCases
  emit('update:testCases', updatedCases)
}
</script>

<style scoped>
.test-cases-section {
  margin-top: var(--spacing-4);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-3);
}

.section-header h5 {
  color: var(--azul-tritiano);
  margin: 0;
  font-size: var(--font-size-base);
}

.test-case-card {
  background: var(--blanco);
  border: 1px solid #E5E7EB;
  border-radius: var(--radius-lg);
  padding: var(--spacing-3);
  margin-bottom: var(--spacing-3);
}

.test-case-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-3);
  padding-bottom: var(--spacing-2);
  border-bottom: 1px solid #E5E7EB;
}

.test-case-number {
  font-weight: 600;
  color: var(--azul-tritiano);
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  padding: var(--spacing-1);
  border-radius: var(--radius-sm);
  transition: all var(--transition-base);
}

.btn-icon:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.1);
}

.btn-icon.delete:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.1);
}

.btn-icon:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-3);
}

.form-group {
  margin-bottom: var(--spacing-3);
}

.form-group label {
  display: block;
  margin-bottom: var(--spacing-1);
  font-weight: 600;
  color: var(--azul-tritiano);
  font-size: var(--font-size-sm);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  font-weight: normal;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  margin: 0;
}

.empty-state {
  text-align: center;
  padding: var(--spacing-5);
  color: #6B7280;
}

.empty-state p {
  margin-bottom: var(--spacing-3);
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>