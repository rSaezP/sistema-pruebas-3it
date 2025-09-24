<template>
  <div class="bulk-importer">
    <!-- Botón para abrir el modal -->
    <button 
      @click="showImporter = true" 
      class="btn btn-secondary bulk-import-btn"
      type="button"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline; margin-right: 4px;">
        <path d="M16 4H18C18.5304 4 19.0391 4.21071 19.4142 4.58579C19.7893 4.96086 20 5.46957 20 6V20C20 20.5304 19.7893 21.0391 19.4142 21.4142C19.0391 21.7893 18.5304 22 18 22H6C5.46957 22 5.04086 21.7893 4.58579 21.4142C4.21071 21.0391 4 20.5304 4 20V6C4 5.46957 4.21071 5.04086 4.58579 4.58579C4.96086 4.21071 5.46957 4 6 4H8"/>
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
      </svg>
      Importar Preguntas Masivamente
    </button>

    <!-- Modal de importación -->
    <div v-if="showImporter" class="modal-overlay" @click="closeImporter">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Importar Preguntas Masivamente</h3>
          <button @click="closeImporter" class="close-btn">&times;</button>
        </div>

        <div class="modal-body">
          <!-- Instrucciones -->
          <div class="instructions">
            <h4>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline; margin-right: 4px;">
                <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"/>
                <polyline points="14,2 14,8 20,8"/>
              </svg>
              Formato EvalArt
            </h4>
            <p>Pega aquí tus preguntas siguiendo el formato:</p>
            <div class="format-example">
              <pre>{{ sampleFormat }}</pre>
            </div>
          </div>

          <!-- Textarea para pegar preguntas -->
          <div class="form-group">
            <label>Pegar preguntas aquí:</label>
            <textarea
              v-model="importText"
              placeholder="Pega aquí las preguntas en formato EvalArt..."
              class="import-textarea"
              rows="12"
            ></textarea>
          </div>

          <!-- Botones de acción -->
          <div class="action-buttons">
            <button 
              @click="processQuestions" 
              :disabled="!importText.trim()"
              class="btn btn-primary"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline; margin-right: 4px;">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21L16.65 16.65"/>
              </svg>
              Procesar Preguntas
            </button>
            <button 
              @click="clearText" 
              class="btn btn-secondary"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline; margin-right: 4px;">
                <polyline points="3,6 5,6 21,6"/>
                <path d="M19 6V20C19 21 18 22 17 22H7C6 22 5 21 5 20V6M8 6V4C8 3 9 2 10 2H14C15 2 16 3 16 4V6"/>
              </svg>
              Limpiar
            </button>
          </div>

          <!-- Errores de procesamiento -->
          <div v-if="parseErrors.length > 0" class="errors-section">
            <h4>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline; margin-right: 4px;">
                <path d="M10.29 3.86L1.82 18C1.64486 18.3024 1.55625 18.6453 1.56518 18.9928C1.57411 19.3403 1.68043 19.6781 1.87086 19.9707C2.06129 20.2632 2.32851 20.4998 2.64365 20.6564C2.9588 20.813 3.31072 20.8838 3.66 20.86H20.34C20.6893 20.8838 21.0412 20.813 21.3564 20.6564C21.6715 20.4998 21.9387 20.2632 22.1291 19.9707C22.3196 19.6781 22.4259 19.3403 22.4348 18.9928C22.4437 18.6453 22.3551 18.3024 22.18 18L13.71 3.86C13.5317 3.56611 13.2807 3.32312 12.9812 3.15467C12.6817 2.98622 12.3438 2.89844 12 2.89844C11.6562 2.89844 11.3183 2.98622 11.0188 3.15467C10.7193 3.32312 10.4683 3.56611 10.29 3.86Z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <circle cx="12" cy="17" r="1"/>
              </svg>
              Errores encontrados:
            </h4>
            <ul class="error-list">
              <li v-for="error in parseErrors" :key="error" class="error-item">
                {{ error }}
              </li>
            </ul>
          </div>

          <!-- Vista previa de preguntas procesadas -->
          <div v-if="parsedQuestions.length > 0" class="preview-section">
            <h4>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline; margin-right: 4px;">
                <path d="M9 12L11 14L15 10"/>
                <circle cx="12" cy="12" r="10"/>
              </svg>
              Preguntas procesadas ({{ parsedQuestions.length }})
            </h4>
            
            <div class="questions-preview">
              <div 
                v-for="(question, index) in parsedQuestions" 
                :key="question.tempId"
                class="question-preview"
              >
                <div class="question-header">
                  <span class="question-number">Pregunta {{ index + 1 }}</span>
                  <span class="question-difficulty">{{ question.difficulty }}</span>
                  <span class="question-score">{{ question.max_score }}pts</span>
                  <span class="question-time">{{ question.time_limit_minutes }}min</span>
                </div>
                
                <div class="question-title">
                  {{ question.title }}
                </div>
                
                <div class="question-options">
                  <div 
                    v-for="(option, optIndex) in question.options" 
                    :key="optIndex"
                    class="option-preview"
                    :class="{ 'correct-option': option.correct }"
                  >
                    <span class="option-label">{{ String.fromCharCode(65 + optIndex) }})</span>
                    <span class="option-text">{{ option.text }}</span>
                    <svg v-if="option.correct" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="correct-mark">
                      <path d="M9 12L11 14L15 10"/>
                      <circle cx="12" cy="12" r="10"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <!-- Botones de confirmación -->
            <div class="confirmation-buttons">
              <button 
                @click="importQuestions" 
                class="btn btn-success"
              >
                ✅ Importar {{ parsedQuestions.length }} Preguntas
              </button>
              <button 
                @click="resetImporter" 
                class="btn btn-secondary"
              >
                🔄 Empezar de Nuevo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { QuestionParser, type ParsedQuestion } from '@/utils/questionParser';

const emit = defineEmits<{
  questionsImported: [questions: ParsedQuestion[]];
}>();

// Estado del componente
const showImporter = ref(false);
const importText = ref('');
const parsedQuestions = ref<ParsedQuestion[]>([]);
const parseErrors = ref<string[]>([]);

// Formato de ejemplo
const sampleFormat = `Q:
¿Cuál es la mejor práctica para manejar concurrencia en microservicios Golang?
A:
Usar sync.Mutex para todas las conexiones
Implementar connection pooling con context.Context *
Usar channels bloqueantes para cada query
Crear una conexión global compartida
T:
2
S:
10
D:
2`;

// Métodos
const closeImporter = () => {
  showImporter.value = false;
  resetImporter();
};

const clearText = () => {
  importText.value = '';
  parsedQuestions.value = [];
  parseErrors.value = [];
};

const resetImporter = () => {
  importText.value = '';
  parsedQuestions.value = [];
  parseErrors.value = [];
};

const processQuestions = () => {
  if (!importText.value.trim()) return;

  const result = QuestionParser.parseEvalArtFormat(importText.value);
  
  parsedQuestions.value = result.questions;
  parseErrors.value = result.errors;
  
  if (result.success && result.questions.length > 0) {
    console.log(`✅ Procesadas ${result.questions.length} preguntas correctamente`);
  } else if (result.errors.length > 0) {
    console.warn(`⚠️ Se encontraron ${result.errors.length} errores`);
  }
};

const importQuestions = () => {
  if (parsedQuestions.value.length > 0) {
    emit('questionsImported', parsedQuestions.value);
    showImporter.value = false;
    resetImporter();
  }
};
</script>

<style scoped>
.bulk-importer {
  margin-bottom: var(--spacing-4);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: var(--radius-lg);
  max-width: 1000px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-4);
  border-bottom: 1px solid #E5E7EB;
}

.modal-header h3 {
  margin: 0;
  color: var(--azul-electrico);
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #6B7280;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: var(--azul-electrico);
}

.modal-body {
  padding: var(--spacing-4);
}

.instructions {
  margin-bottom: var(--spacing-4);
  padding: var(--spacing-3);
  background: #F9FAFB;
  border-radius: var(--radius-md);
  border-left: 4px solid var(--azul-electrico);
}

.instructions h4 {
  margin: 0 0 var(--spacing-2) 0;
  color: var(--azul-electrico);
}

.format-example {
  background: #1F2937;
  border-radius: var(--radius-sm);
  padding: var(--spacing-3);
  margin-top: var(--spacing-2);
}

.format-example pre {
  color: #F3F4F6;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  margin: 0;
  white-space: pre-wrap;
}

.import-textarea {
  width: 100%;
  min-height: 200px;
  padding: var(--spacing-3);
  border: 2px solid #E5E7EB;
  border-radius: var(--radius-md);
  font-family: 'Courier New', monospace;
  font-size: 14px;
  resize: vertical;
}

.import-textarea:focus {
  border-color: var(--azul-electrico);
  outline: none;
}

.action-buttons {
  display: flex;
  gap: var(--spacing-2);
  margin: var(--spacing-4) 0;
}

.errors-section {
  background: #FEF2F2;
  border: 1px solid #FECACA;
  border-radius: var(--radius-md);
  padding: var(--spacing-3);
  margin: var(--spacing-4) 0;
}

.errors-section h4 {
  color: #DC2626;
  margin: 0 0 var(--spacing-2) 0;
}

.error-list {
  margin: 0;
  padding-left: var(--spacing-4);
}

.error-item {
  color: #DC2626;
  margin-bottom: var(--spacing-1);
}

.preview-section {
  margin-top: var(--spacing-4);
  padding-top: var(--spacing-4);
  border-top: 2px solid #E5E7EB;
}

.preview-section h4 {
  color: #059669;
  margin-bottom: var(--spacing-3);
}

.questions-preview {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #E5E7EB;
  border-radius: var(--radius-md);
}

.question-preview {
  padding: var(--spacing-3);
  border-bottom: 1px solid #F3F4F6;
}

.question-preview:last-child {
  border-bottom: none;
}

.question-header {
  display: flex;
  gap: var(--spacing-2);
  margin-bottom: var(--spacing-2);
  flex-wrap: wrap;
}

.question-number {
  font-weight: bold;
  color: var(--azul-electrico);
}

.question-difficulty,
.question-score,
.question-time {
  background: #F3F4F6;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  color: #6B7280;
}

.question-title {
  font-weight: 500;
  margin-bottom: var(--spacing-2);
  color: #1F2937;
}

.question-options {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.option-preview {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-1);
  border-radius: var(--radius-sm);
}

.correct-option {
  background: #ECFDF5;
  border: 1px solid #A7F3D0;
}

.option-label {
  font-weight: bold;
  color: var(--azul-electrico);
  min-width: 20px;
}

.option-text {
  flex: 1;
  color: #374151;
}

.correct-mark {
  color: #059669;
  font-weight: bold;
}

.confirmation-buttons {
  display: flex;
  gap: var(--spacing-2);
  margin-top: var(--spacing-4);
  justify-content: center;
}

/* Responsive */
@media (max-width: 768px) {
  .modal-overlay {
    padding: 10px;
  }
  
  .modal-content {
    max-height: 95vh;
  }
  
  .question-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .action-buttons,
  .confirmation-buttons {
    flex-direction: column;
  }
}

/* FORZAR ALINEACIÓN EXACTA */
.bulk-import-btn {
  height: 42px;
  padding: 8px 12px;
  border: 1px solid #005AEE;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  margin: 0;
  background: white;
  color: #005AEE;
  white-space: nowrap;
  cursor: pointer;
}

.bulk-import-btn:hover {
  background: #005AEE;
  color: white;
}
</style>