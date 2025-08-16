<template>
  <div class="code-editor-container">
    <div class="editor-header">
      <div class="language-selector">
        <label for="language">Lenguaje:</label>
        <select 
          id="language" 
          v-model="selectedLanguage"
          @change="handleLanguageChange"
          class="language-dropdown"
        >
          <option 
            v-for="lang in languageOptions" 
            :key="lang.value" 
            :value="lang.value"
          >
            {{ lang.label }}
          </option>
        </select>
      </div>
      
      <div class="editor-actions">
        <button 
          v-if="!isReadonly"
          @click="formatCode"
          class="action-button format-button"
          title="Formatear código"
        >
          <i class="icon-code"></i>
          <span>Formatear</span>
        </button>
        
        <button 
          @click="copyToClipboard"
          class="action-button copy-button"
          :title="copyButtonText"
        >
          <i :class="copyButtonIcon"></i>
          <span>{{ copyButtonText }}</span>
        </button>
      </div>
    </div>
    
    <div class="editor-wrapper">
      <div 
        ref="editorEl" 
        class="code-editor"
        :style="{ height: editorHeight }"
      ></div>
    </div>
    
    <div v-if="showLineNumbers" class="line-numbers">
      <div 
        v-for="line in lineCount" 
        :key="line" 
        class="line-number"
      >
        {{ line }}
      </div>
    </div>
    
    <div v-if="!isReadonly" class="character-count">
      {{ codeValue.length }} caracteres
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick, computed } from 'vue';
import * as monaco from 'monaco-editor';
import { language as getLanguage, highlight, getLanguage as getHighlightLanguage } from 'highlight.js';
import 'highlight.js/styles/github.css';

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  language: {
    type: String,
    default: 'javascript'
  },
  theme: {
    type: String,
    default: 'vs',
    validator: (value: string) => ['vs', 'vs-dark', 'hc-black'].includes(value)
  },
  readOnly: {
    type: Boolean,
    default: false
  },
  showLineNumbers: {
    type: Boolean,
    default: true
  },
  autoFormat: {
    type: Boolean,
    default: true
  },
  height: {
    type: [String, Number],
    default: '300px'
  },
  options: {
    type: Object,
    default: () => ({
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 14,
      wordWrap: 'on',
      automaticLayout: true,
      tabSize: 2,
      insertSpaces: true,
      autoIndent: 'full',
      formatOnType: true,
      formatOnPaste: true,
      renderWhitespace: 'selection',
      renderLineHighlight: 'all',
      scrollbar: {
        vertical: 'auto',
        horizontal: 'auto'
      }
    })
  }
});

const emit = defineEmits(['update:modelValue', 'language-change', 'editor-mounted']);

const editorEl = ref<HTMLElement | null>(null);
const editor = ref<monaco.editor.IStandaloneCodeEditor | null>(null);
const selectedLanguage = ref(props.language);
const copyButtonText = ref('Copiar');
const copyButtonIcon = ref('icon-copy');
const isReadonly = ref(props.readOnly);

const editorHeight = computed(() => {
  if (typeof props.height === 'number') {
    return `${props.height}px`;
  }
  return props.height;
});

const lineCount = computed(() => {
  if (!editor.value) return 0;
  return editor.value.getModel()?.getLineCount() || 0;
});

const codeValue = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value)
});

const languageOptions = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'csharp', label: 'C#' },
  { value: 'php', label: 'PHP' },
  { value: 'sql', label: 'SQL' },
  { value: 'xml', label: 'XML' },
  { value: 'yaml', label: 'YAML' },
  { value: 'markdown', label: 'Markdown' }
];

// Initialize Monaco Editor
const initEditor = () => {
  if (!editorEl.value) return;
  
  // Clean up existing editor instance if any
  if (editor.value) {
    editor.value.dispose();
  }
  
  // Create editor instance
  editor.value = monaco.editor.create(editorEl.value, {
    value: codeValue.value,
    language: selectedLanguage.value,
    theme: props.theme,
    readOnly: isReadonly.value,
    lineNumbers: props.showLineNumbers ? 'on' : 'off',
    ...props.options
  });
  
  // Set up model content change listener
  const model = editor.value.getModel();
  if (model) {
    model.onDidChangeContent(() => {
      const value = editor.value?.getValue() || '';
      codeValue.value = value;
    });
  }
  
  // Auto format on mount if enabled
  if (props.autoFormat && !isReadonly.value) {
    setTimeout(() => {
      formatCode();
    }, 300);
  }
  
  // Emit mounted event
  emit('editor-mounted', editor.value);
};

// Format code using Monaco's formatter
const formatCode = async () => {
  if (!editor.value || isReadonly.value) return;
  
  try {
    await editor.value.getAction('editor.action.formatDocument')?.run();
  } catch (error) {
    console.warn('Error formatting code:', error);
  }
};

// Copy code to clipboard
const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(codeValue.value);
    copyButtonText.value = '¡Copiado!';
    copyButtonIcon.value = 'icon-check';
    
    setTimeout(() => {
      copyButtonText.value = 'Copiar';
      copyButtonIcon.value = 'icon-copy';
    }, 2000);
  } catch (err) {
    console.error('Failed to copy text:', err);
    copyButtonText.value = 'Error al copiar';
    
    setTimeout(() => {
      copyButtonText.value = 'Copiar';
      copyButtonIcon.value = 'icon-copy';
    }, 2000);
  }
};

// Handle language change
const handleLanguageChange = () => {
  if (editor.value) {
    const model = editor.value.getModel();
    if (model) {
      monaco.editor.setModelLanguage(model, selectedLanguage.value);
      emit('language-change', selectedLanguage.value);
      
      if (props.autoFormat) {
        formatCode();
      }
    }
  }
};

// Watch for external modelValue changes
watch(() => props.modelValue, (newValue) => {
  if (editor.value && editor.value.getValue() !== newValue) {
    editor.value.setValue(newValue);
  }
});

// Watch for language prop changes
watch(() => props.language, (newLanguage) => {
  if (selectedLanguage.value !== newLanguage) {
    selectedLanguage.value = newLanguage;
    handleLanguageChange();
  }
});

// Watch for readOnly changes
watch(() => props.readOnly, (newReadOnly) => {
  isReadonly.value = newReadOnly;
  if (editor.value) {
    editor.value.updateOptions({ readOnly: newReadOnly });
  }
});

// Lifecycle hooks
onMounted(() => {
  // Ensure Monaco is loaded
  if (typeof window !== 'undefined') {
    // @ts-ignore
    if (window.monaco) {
      initEditor();
    } else {
      // @ts-ignore
      window.require(['vs/editor/editor.main'], () => {
        initEditor();
      });
    }
  }
});

onBeforeUnmount(() => {
  if (editor.value) {
    editor.value.dispose();
  }
});

// Expose editor instance and methods
defineExpose({
  getEditor: () => editor.value,
  format: formatCode,
  copy: copyToClipboard,
  setLanguage: (language: string) => {
    selectedLanguage.value = language;
    handleLanguageChange();
  }
});
</script>

<style scoped>
.code-editor-container {
  position: relative;
  width: 100%;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  overflow: hidden;
  background-color: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background-color: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
}

.language-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.language-selector label {
  font-size: 0.85rem;
  color: #555;
  font-weight: 500;
}

.language-dropdown {
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #ccc;
  background-color: white;
  font-size: 0.85rem;
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s;
}

.language-dropdown:focus {
  border-color: var(--azul-tritiano);
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.1);
}

.editor-actions {
  display: flex;
  gap: 8px;
}

.action-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background-color: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.8rem;
  color: #333;
  cursor: pointer;
  transition: all 0.2s;
}

.action-button:hover {
  background-color: #f0f0f0;
  border-color: #ccc;
}

.action-button i {
  font-size: 0.9em;
}

.format-button:hover {
  background-color: #e6f7ff;
  border-color: #91d5ff;
  color: var(--azul-tritiano);
}

.copy-button:hover {
  background-color: #f6ffed;
  border-color: #b7eb8f;
  color: #52c41a;
}

.editor-wrapper {
  position: relative;
  width: 100%;
  overflow: hidden;
}

.code-editor {
  width: 100%;
  min-height: 200px;
  text-align: left;
  font-family: 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace;
  line-height: 1.5;
}

.line-numbers {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  padding: 8px 4px;
  background-color: #f8f8f8;
  border-right: 1px solid #e0e0e0;
  font-family: 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  color: #999;
  text-align: right;
  user-select: none;
  overflow-y: auto;
}

.line-number {
  padding: 0 8px;
  height: 20px;
  line-height: 20px;
}

.character-count {
  padding: 4px 12px;
  font-size: 0.8rem;
  color: #777;
  text-align: right;
  background-color: #f9f9f9;
  border-top: 1px solid #eee;
}

/* Dark theme overrides */
:deep(.vs-dark) .editor-header,
:deep(.hc-black) .editor-header {
  background-color: #252526;
  border-bottom-color: #333;
}

:deep(.vs-dark) .action-button,
:deep(.hc-black) .action-button {
  background-color: #2d2d2d;
  border-color: #444;
  color: #ccc;
}

:deep(.vs-dark) .action-button:hover,
:deep(.hc-black) .action-button:hover {
  background-color: #383838;
}

:deep(.vs-dark) .format-button:hover,
:deep(.hc-black) .format-button:hover {
  background-color: #1a3b5a;
  border-color: #1a3b5a;
  color: #4fa3e7;
}

:deep(.vs-dark) .copy-button:hover,
:deep(.hc-black) .copy-button:hover {
  background-color: #1f3a1f;
  border-color: #1f3a1f;
  color: #73d13d;
}

:deep(.vs-dark) .line-numbers,
:deep(.hc-black) .line-numbers {
  background-color: #1e1e1e;
  border-right-color: #333;
  color: #666;
}

:deep(.vs-dark) .character-count,
:deep(.hc-black) .character-count {
  background-color: #1e1e1e;
  border-top-color: #333;
  color: #666;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .editor-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .editor-actions {
    width: 100%;
    justify-content: flex-end;
  }
  
  .code-editor {
    font-size: 13px;
  }
}
</style>
