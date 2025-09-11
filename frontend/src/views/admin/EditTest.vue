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

          <div v-for="(question, index) in formData.questions" :key="index" class="question-form-card">
            <div class="question-form-header">
              <span class="question-number">{{ index + 1 }}</span>
              <span class="question-type-badge">{{ question.type }}</span>
              <button type="button" @click="removeQuestion(index)" class="btn-icon delete">Eliminar</button>
            </div>
            <QuestionEditor
              :modelValue="question"
              :isEditing="true"
              :hideActions="true"
              @update:modelValue="updateQuestionData(index, $event)"
            />
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
        </div>
      </form>
    </div>
  </template>

  <script setup lang="ts">
  import { ref, onMounted, nextTick } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import { useToast } from 'vue-toastification';
  import AdminCodeEditor from '../../components/AdminCodeEditor.vue'
  import QuestionEditor from '../../components/QuestionEditor.vue';

  // Definir interfaces para TypeScript
  interface TestCase {
    id: string;
    name: string;
    input_data: string;
    expected_output: string;
    is_hidden: boolean;
    weight: number;
    timeout_ms: number;
  }

  interface Option {
    text: string;
    correct: boolean;
  }

  interface Question {
    title: string;
    description: string;
    type: string;
    difficulty: string;
    max_score: number;
    language: string;
    initial_code: string;
    expected_solution: string;
    database_schema: string;
    correct_answer: string;
    test_cases: TestCase[];
    options: Option[];
  }

  interface FormData {
    name: string;
    description: string;
    timeLimit: number;
    isActive: boolean;
    questions: Question[];
  }

  const route = useRoute();
  const router = useRouter();
  const toast = useToast();

  const testId = route.params.id;
  const loading = ref(true);
  const error = ref('');
  const isSubmitting = ref(false);

  // Datos del formulario con tipado correcto
  const formData = ref<FormData>({
    name: '',
    description: '',
    timeLimit: 60,
    isActive: true,
    questions: []
  });

  // Funciones API
  const fetchTestById = async (id: any) => {
    const response = await fetch(`http://localhost:4000/api/tests/${id}`);
    if (!response.ok) throw new Error('Error al cargar la prueba');
    return response.json();
  };

  const updateTest = async (id: any, data: any) => {
    const response = await fetch(`/api/tests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Error al actualizar la prueba');
    return response.json();
  };

  const deleteTest = async (id: any) => {
    const response = await fetch(`/api/tests/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Error al eliminar la prueba');
    return response.json();
  };

  // Función para generar UUID simple
  const generateId = () => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  };

  // ÚNICA función fetchTest
  let isLoadingData = false;
  const fetchTest = async () => {
    if (isLoadingData) return;
    isLoadingData = true;

    try {
      loading.value = true;
      error.value = '';
      const test = await fetchTestById(testId);

      const mappedData: FormData = {
        name: test.name || '',
        description: test.description || '',
        timeLimit: test.time_limit || 60,
        isActive: Boolean(test.is_active),
        questions: (test.questions || []).map((q: any): Question => {
          const baseQuestion: Question = {
            // Campos que QuestionEditor espera
            title: q.title || '',
            description: q.description || '',
            difficulty: q.difficulty || 'Fácil',
            max_score: q.max_score || 10,
            type: q.type || 'programming',
            language: q.language || 'javascript',

            // MAPEO CORREGIDO: Backend → Frontend
            initial_code: q.initial_code || '',
            expected_solution: q.type === 'sql' ? q.correct_answer : q.initial_code || '', // CORREGIDO
            database_schema: q.database_schema || '',
            correct_answer: q.correct_answer || '', // Para referencia

            // Test cases con estructura completa
            test_cases: (q.test_cases || []).map((tc: any, index: number): TestCase => ({
              id: tc.id || generateId(),
              name: tc.name || `Caso ${index + 1}`,
              input_data: tc.input_data || '',
              expected_output: tc.expected_output || '',
              is_hidden: Boolean(tc.is_hidden),
              weight: tc.weight || 1.0,
              timeout_ms: tc.timeout_ms || 5000
            })),

            // Multiple choice options
            options: q.type === 'multiple_choice' ? (
              typeof q.options === 'string' && q.options.trim() ?
              JSON.parse(q.options).map((opt: any, idx: number): Option => ({
                text: opt.text || '',
                correct: opt.correct || (q.correct_option_index === idx)
              })) :
              [
                { text: '', correct: false },
                { text: '', correct: false },
                { text: '', correct: false },
                { text: '', correct: false }
              ]
            ) : []
          };

          // Si no hay test_cases para programación/SQL, crear uno por defecto
          if ((baseQuestion.type === 'programming' || baseQuestion.type === 'sql') && 
              baseQuestion.test_cases.length === 0) {
            baseQuestion.test_cases = [{
              id: generateId(),
              name: 'Caso 1',
              input_data: '',
              expected_output: '',
              is_hidden: false,
              weight: 1.0,
              timeout_ms: 5000
            }];
          }

          return baseQuestion;
        })
      };

      formData.value = mappedData;
      
      console.log('Prueba cargada:', {
        preguntas: formData.value.questions.length,
        primeraPregunta: {
          titulo: formData.value.questions[0]?.title,
          tieneSolucion: Boolean(formData.value.questions[0]?.expected_solution),
          testCases: formData.value.questions[0]?.test_cases?.length || 0,
          solucionContent: formData.value.questions[0]?.expected_solution?.substring(0, 50) + '...'
        }
      });

    } catch (err) {
      console.error('Error cargando prueba:', err);
      error.value = 'No se pudo cargar la información de la prueba.';
    } finally {
      loading.value = false;
      isLoadingData = false;
    }
  };

  // ÚNICA función handleSubmit
  const handleSubmit = async () => {
    if (isSubmitting.value) return;

    try {
      isSubmitting.value = true;

      // Validaciones
      if (formData.value.questions.length === 0) {
        toast.error('Debe haber al menos una pregunta en la prueba');
        return;
      }

      for (const [index, question] of formData.value.questions.entries()) {
        if (!question.title?.trim()) {
          toast.error(`La pregunta ${index + 1} debe tener un título`);
          return;
        }

        if (!question.description?.trim()) {
          toast.error(`La pregunta ${index + 1} debe tener una descripción`);
          return;
        }

        if (question.type === 'multiple_choice') {
          const hasEmptyOption = question.options?.some(opt => !opt.text?.trim());
          if (hasEmptyOption) {
            toast.error(`Todas las opciones de la pregunta ${index + 1} deben tener texto`);
            return;
          }

          const hasCorrectAnswer = question.options?.some(opt => opt.correct);
          if (!hasCorrectAnswer) {
            toast.error(`Debe seleccionar la respuesta correcta para la pregunta ${index + 1}`);
            return;
          }
        }

        // Validación para preguntas de programación y SQL
        if ((question.type === 'programming' || question.type === 'sql') && 
            !question.expected_solution?.trim()) {
          toast.error(`Debe proporcionar una solución para la pregunta ${index + 1}`);
          return;
        }

        // Validación de test cases para programación y SQL
        if ((question.type === 'programming' || question.type === 'sql')) {
          if (!question.test_cases || question.test_cases.length === 0) {
            toast.error(`La pregunta ${index + 1} debe tener al menos un caso de prueba`);
            return;
          }

          // Validar que los test cases tengan datos
          for (const [tcIndex, testCase] of question.test_cases.entries()) {
            if (!testCase.expected_output?.trim()) {
              toast.error(`El caso de prueba ${tcIndex + 1} de la pregunta ${index + 1} debe tener un resultado esperado`);
              return;
            }
          }
        }
      }

      // Preparar datos para enviar al backend
      const testData = {
        name: formData.value.name,
        description: formData.value.description,
        time_limit: formData.value.timeLimit,
        passing_score: 60,
        is_active: formData.value.isActive,
        questions: formData.value.questions.map((q, index) => {
          const baseQuestion = {
            id: q.id || undefined, // Pasar ID si existe para actualización
            title: q.title,
            description: q.description,
            type: q.type,
            difficulty: q.difficulty || 'Medio',
            max_score: q.max_score || 10,
            language: q.language || 'javascript',
            initial_code: q.initial_code || '',
            database_schema: q.database_schema || '',
            // MAPEO CORRECTO: Frontend → Backend
            expected_solution: q.expected_solution || '', // Enviar lo que el usuario editó
            execution_timeout: 5000,
            // Test cases - asegurar formato correcto
            test_cases: (q.test_cases || []).map(tc => ({
              id: tc.id, // Mantener ID si existe
              name: tc.name || 'Caso de prueba',
              input_data: tc.input_data || '',
              expected_output: tc.expected_output || '',
              is_hidden: Boolean(tc.is_hidden),
              weight: tc.weight || 1.0,
              timeout_ms: tc.timeout_ms || 5000
            }))
          };

          // Para multiple choice, agregar opciones
          if (q.type === 'multiple_choice') {
            (baseQuestion as any).options = (q.options || []).map(opt => ({
              text: opt.text || '',
              correct: Boolean(opt.correct)
            }));
          }

          return baseQuestion;
        })
      };

      console.log('Enviando datos al backend:', JSON.stringify(testData, null, 2));

      // Enviar al servidor
      await updateTest(testId, testData);

      toast.success('La prueba se ha actualizado correctamente');
      router.push('/admin/tests');

    } catch (err) {
      console.error('Error al actualizar la prueba:', err);
      toast.error('Ocurrió un error al actualizar la prueba. Por favor, inténtalo de nuevo.');
    } finally {
      isSubmitting.value = false;
    }
  };

  // Confirmar eliminación de la prueba
  const confirmDelete = async () => {
    if (confirm('¿Estás seguro de que quieres eliminar esta prueba? Esta acción no se puede deshacer.')) {
      try {
        await deleteTest(testId);
        toast.success('Prueba eliminada correctamente');
        router.push('/admin/tests');
      } catch (err) {
        console.error('Error al eliminar la prueba:', err);
        toast.error('Error al eliminar la prueba');
      }
    }
  };

  // Volver a la lista
  const goBack = () => {
    router.push('/admin/tests');
  };

  // Añadir nueva pregunta - ESTRUCTURA CORREGIDA con tipos
  const addQuestion = () => {
    const newQuestion: Question = {
      title: '',
      description: '',
      type: 'programming',
      difficulty: 'Fácil',
      max_score: 10,
      language: 'javascript',
      initial_code: '',
      expected_solution: '',
      database_schema: '',
      correct_answer: '',
      test_cases: [{
        id: generateId(),
        name: 'Caso 1',
        input_data: '',
        expected_output: '',
        is_hidden: false,
        weight: 1.0,
        timeout_ms: 5000
      }],
      options: [
        { text: '', correct: false },
        { text: '', correct: false },
        { text: '', correct: false },
        { text: '', correct: false }
      ]
    };

    formData.value.questions.push(newQuestion);
  };

  // Eliminar pregunta
  const removeQuestion = (index: number) => {
    if (formData.value.questions.length > 1) {
      formData.value.questions.splice(index, 1);
    }
  };

  const updateQuestionData = (index: number, questionData: Question) => {
    formData.value.questions[index] = questionData;
  };

  // Cargar los datos de la prueba al montar el componente
  onMounted(async () => {
    await nextTick();
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

  .form-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid #e5e7eb;
  }

  .right-actions {
    display: flex;
    gap: 1rem;
  }

  .btn-danger {
    background-color: var(--error);
    color: var(--blanco);
  }

  .btn-danger:hover {
    background-color: #dc2626;
  }

  .mt-1 {
    margin-top: 0.5rem;
  }

  .question-form-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .question-form-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid #e2e8f0;
  }

  .question-number {
    background: var(--azul-tritiano);
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.875rem;
    font-weight: 600;
  }

  .question-type-badge {
    background: #f1f5f9;
    color: #475569;
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: capitalize;
  }

  .btn-icon.delete {
    background: #fee2e2;
    color: #dc2626;
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    font-size: 0.75rem;
    border: 1px solid #fecaca;
  }

  .btn-icon.delete:hover {
    background: #fecaca;
    border-color: #f87171;
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

    .form-actions {
      flex-direction: column;
      gap: 1rem;
    }

    .right-actions {
      flex-direction: column;
      width: 100%;
    }

    .btn {
      width: 100%;
    }
  }
  </style>
