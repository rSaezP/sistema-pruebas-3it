<template>
  <div class="edit-test-container">
    <div class="header">
      <h1>Editar Prueba Técnica</h1>
      <router-link to="/admin/tests" class="btn btn-secondary">
        <i class="icon-arrow-left"></i>
        Volver a la lista
      </router-link>
    </div>

    <div v-if="loading" class="loading-container">
      <div class="spinner"></div>
      <p>Cargando información de la prueba...</p>
    </div>

    <div v-else-if="error" class="alert alert-error">
      <div class="alert-content">
        <i class="icon-alert-circle"></i>
        <span>{{ error }}</span>
      </div>
      <button @click="fetchTest" class="btn btn-sm">Reintentar</button>
    </div>

    <form v-else @submit.prevent="handleSubmit" class="test-form">
      <div class="form-section">
        <h2>Información Básica</h2>
        
        <div class="form-group">
          <label for="name" class="input-label">Nombre de la Prueba</label>
          <input
            id="name"
            v-model="formData.name"
            type="text"
            class="input"
            required
            placeholder="Ej: Prueba de JavaScript Avanzado"
          >
        </div>

        <div class="form-group">
          <label for="description" class="input-label">Descripción</label>
          <textarea
            id="description"
            v-model="formData.description"
            class="input textarea"
            rows="3"
            placeholder="Describe el propósito y alcance de esta prueba"
          ></textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="timeLimit" class="input-label">Tiempo Límite (minutos)</label>
            <input
              id="timeLimit"
              v-model.number="formData.timeLimit"
              type="number"
              min="1"
              class="input"
              required
            >
          </div>

          <div class="form-group">
            <label for="status" class="input-label">Estado</label>
            <select id="status" v-model="formData.isActive" class="input select">
              <option :value="true">Activa</option>
              <option :value="false">Inactiva</option>
            </select>
          </div>
        </div>
      </div>

      <div class="form-section">
        <h2>Preguntas</h2>
        
        <div v-for="(question, index) in formData.questions" :key="index" class="question-card">
          <div class="question-header">
            <h3>Pregunta {{ index + 1 }}</h3>
            <button 
              type="button" 
              class="btn btn-sm btn-error"
              @click="removeQuestion(index)"
              :disabled="formData.questions.length <= 1"
            >
              <i class="icon-trash-2"></i>
              Eliminar
            </button>
          </div>
          
          <div class="form-group">
            <label :for="'question-' + index" class="input-label">Enunciado</label>
            <input
              :id="'question-' + index"
              v-model="question.text"
              type="text"
              class="input"
              required
              :placeholder="'Ingrese el texto de la pregunta ' + (index + 1)"
            >
          </div>

          <div class="form-group">
            <label class="input-label">Tipo de Pregunta</label>
            <select v-model="question.type" class="input select" required>
              <option value="multiple_choice">Selección Múltiple</option>
              <option value="code">Código</option>
              <option value="text">Respuesta Abierta</option>
            </select>
          </div>

          <div v-if="question.type === 'multiple_choice'" class="options-container">
            <label class="input-label">Opciones de Respuesta</label>
            <div v-for="(option, optIndex) in question.options" :key="optIndex" class="option-item">
              <input
                type="radio"
                :name="'correct-answer-' + index"
                :checked="option.isCorrect"
                @change="setCorrectAnswer(index, optIndex)"
              >
              <input
                type="text"
                v-model="option.text"
                class="input input-sm"
                :placeholder="'Opción ' + (optIndex + 1)"
                required
              >
              <button 
                type="button" 
                class="btn-icon"
                @click="removeOption(index, optIndex)"
                :disabled="question.options.length <= 2"
              >
                <i class="icon-x"></i>
              </button>
            </div>
            <button 
              type="button" 
              class="btn btn-sm btn-secondary mt-1"
              @click="addOption(index)"
              :disabled="question.options.length >= 6"
            >
              <i class="icon-plus"></i>
              Añadir Opción
            </button>
          </div>

          <div v-if="question.type === 'code'" class="form-group">
            <label class="input-label">Lenguaje de Programación</label>
            <select v-model="question.language" class="input select" required>
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="csharp">C#</option>
            </select>
          </div>

          <div v-if="question.type === 'code'" class="form-group">
            <label class="input-label">Solución Esperada</label>
            <CodeEditor
              v-model="question.solution"
              :language="question.language || 'javascript'"
              height="200px"
            />
          </div>

          <div v-if="question.type === 'text'" class="form-group">
            <label class="input-label">Respuesta de Ejemplo</label>
            <textarea
              v-model="question.sampleAnswer"
              class="input textarea"
              rows="3"
              placeholder="Proporciona un ejemplo de respuesta esperada"
            ></textarea>
          </div>
        </div>

        <div class="actions">
          <button 
            type="button" 
            class="btn btn-secondary"
            @click="addQuestion"
          >
            <i class="icon-plus"></i>
            Añadir Pregunta
          </button>
          
        </div>

        <div class="form-actions">
          <button type="button" @click="confirmDelete" class="btn btn-danger">
            Eliminar Prueba
          </button>
          <div class="right-actions">
            <button type="button" @click="goBack" class="btn btn-secondary">
              Cancelar
            </button>
            <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
              <span v-if="isSubmitting">Guardando...</span>
              <span v-else>Guardar Cambios</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const testId = route.params.id;
const loading = ref(true);
const error = ref('');
const isSubmitting = ref(false);

// Datos del formulario
const formData = ref({
  name: '',
  description: '',
  timeLimit: 60,
  isActive: true,
  questions: [
    {
      text: '',
      type: 'multiple_choice',
      options: [
        { text: '', isCorrect: true },
        { text: '', isCorrect: false }
      ],
      language: 'javascript',
      solution: '',
      sampleAnswer: ''
    }
  ]
});

// Cargar los datos de la prueba
const fetchTest = async () => {
  try {
    loading.value = true;
    error.value = '';
    const test = await fetchTestById(testId);
    
    // Mapear los datos de la API al formato del formulario
    formData.value = {
      name: test.name,
      description: test.description || '',
      timeLimit: test.time_limit,
      isActive: test.is_active,
      questions: test.questions.map(q => {
        const baseQuestion = {
          text: q.text,
          type: q.type,
          language: q.language || 'javascript',
          solution: q.solution || '',
          sampleAnswer: q.sample_answer || ''
        };

        if (q.type === 'multiple_choice') {
          return {
            ...baseQuestion,
            options: q.options?.map((opt, idx) => ({
              text: opt.text,
              isCorrect: idx === q.correct_option_index
            })) || [{ text: '', isCorrect: true }, { text: '', isCorrect: false }]
          };
        }

        return baseQuestion;
      })
    };
  } catch (err) {
    console.error('Error al cargar la prueba:', err);
    error.value = 'No se pudo cargar la información de la prueba. Inténtalo de nuevo más tarde.';
  } finally {
    loading.value = false;
  }
};

// Manejar el envío del formulario
const handleSubmit = async () => {
  if (isSubmitting.value) return;
  
  try {
    isSubmitting.value = true;
    
    // Validar que al menos haya una pregunta
    if (formData.value.questions.length === 0) {
      toast.error('Debe haber al menos una pregunta en la prueba');
      return;
    }
    
    // Validar cada pregunta
    for (const [index, question] of formData.value.questions.entries()) {
      if (!question.text.trim()) {
        toast.error(`La pregunta ${index + 1} no puede estar vacía`);
        return;
      }
      
      if (question.type === 'multiple_choice') {
        const hasEmptyOption = question.options.some(opt => !opt.text.trim());
        if (hasEmptyOption) {
          toast.error(`Todas las opciones de la pregunta ${index + 1} deben tener texto`);
          return;
        }
        
        const hasCorrectAnswer = question.options.some(opt => opt.isCorrect);
        if (!hasCorrectAnswer) {
          toast.error(`Debe seleccionar la respuesta correcta para la pregunta ${index + 1}`);
          return;
        }
      }
      
      if (question.type === 'code' && !question.solution.trim()) {
        toast.error(`Debe proporcionar una solución para la pregunta de código ${index + 1}`);
        return;
      }
    }
    
    // Preparar datos para la API
    const testData = {
      name: formData.value.name,
      description: formData.value.description,
      time_limit: formData.value.timeLimit,
      is_active: formData.value.isActive,
      questions: formData.value.questions.map(q => {
        const baseQuestion = {
          text: q.text,
          type: q.type,
          language: q.language,
          solution: q.solution,
          sample_answer: q.sampleAnswer
        };
        
        if (q.type === 'multiple_choice') {
          return {
            ...baseQuestion,
            options: q.options.map(opt => opt.text),
            correct_option_index: q.options.findIndex(opt => opt.isCorrect)
          };
        }
        
        return baseQuestion;
      })
    };
    
    // Enviar datos al servidor
    await updateTest(testId, testData);
    
    // Mostrar mensaje de éxito y redirigir
    toast.success('La prueba se ha actualizado correctamente');
    router.push('/admin/tests');
    
  } catch (err) {
    console.error('Error al actualizar la prueba:', err);
    toast.error('Ocurrió un error al actualizar la prueba. Por favor, inténtalo de nuevo.');
  } finally {
    isSubmitting.value = false;
  }
};

// Añadir nueva pregunta
const addQuestion = () => {
  formData.value.questions.push({
    text: '',
    type: 'multiple_choice',
    options: [
      { text: '', isCorrect: true },
      { text: '', isCorrect: false }
    ],
    language: 'javascript',
    solution: '',
    sampleAnswer: ''
  });
};

// Eliminar pregunta
const removeQuestion = (index: number) => {
  if (formData.value.questions.length > 1) {
    formData.value.questions.splice(index, 1);
  }
};

// Añadir opción a una pregunta de selección múltiple
const addOption = (questionIndex: number) => {
  const question = formData.value.questions[questionIndex];
  if (question.options.length < 6) {
    question.options.push({ text: '', isCorrect: false });
  }
};

// Eliminar opción de una pregunta de selección múltiple
const removeOption = (questionIndex: number, optionIndex: number) => {
  const question = formData.value.questions[questionIndex];
  if (question.options.length > 2) {
    question.options.splice(optionIndex, 1);
    
    // Si se eliminó la opción correcta, marcar la primera opción como correcta
    const hasCorrectAnswer = question.options.some(opt => opt.isCorrect);
    if (!hasCorrectAnswer && question.options.length > 0) {
      question.options[0].isCorrect = true;
    }
  }
};

// Establecer la respuesta correcta para una pregunta de selección múltiple
const setCorrectAnswer = (questionIndex: number, optionIndex: number) => {
  const question = formData.value.questions[questionIndex];
  question.options.forEach((opt, idx) => {
    opt.isCorrect = idx === optionIndex;
  });
};

// Cargar los datos de la prueba al montar el componente
onMounted(() => {
  fetchTest();
});
</script>

<style scoped>
.edit-test-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--gris);
}

.header h1 {
  color: var(--azul-tritiano);
  margin: 0;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 0;
  color: var(--azul-tritiano);
}

.loading-container .spinner {
  width: 40px;
  height: 40px;
  border-width: 3px;
  margin-bottom: 1rem;
}

.form-section {
  background: var(--blanco);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.form-section h2 {
  color: var(--azul-tritiano);
  font-size: 1.25rem;
  margin-top: 0;
  margin-bottom: 1.5rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--gris);
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.question-card {
  background: #f9fafb;
  border-radius: 6px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  border: 1px solid #e5e7eb;
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.question-header h3 {
  font-size: 1rem;
  color: var(--azul-tritiano);
  margin: 0;
}

.options-container {
  margin-top: 1rem;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.option-item input[type="radio"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.option-item .input-sm {
  flex: 1;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--gris);
}

.btn-icon {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: #f3f4f6;
  color: #ef4444;
}

.alert {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-radius: 6px;
  margin-bottom: 1.5rem;
}

.alert-error {
  background-color: #fef2f2;
  color: #991b1b;
  border-left: 4px solid #ef4444;
}

.alert-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.alert i {
  font-size: 1.25rem;
}

@media (max-width: 768px) {
  .edit-test-container {
    padding: 1rem;
  }
  
  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .actions {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
  }
}
</style>
