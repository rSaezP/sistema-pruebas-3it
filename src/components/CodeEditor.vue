<template>
  <div class="code-editor-container">
    <div class="editor-header">
      <div class="language-selector">
        <label for="language">Lenguaje:</label>
        <select 
          id="language" 
          v-model="selectedLanguage"
          class="language-dropdown"
        >
          <option value="javascript">JavaScript</option>
          <option value="typescript">TypeScript</option>
          <option value="python">Python</option>
          <option value="java">Java</option>
          <option value="csharp">C#</option>
        </select>
      </div>
    </div>
    
    <div class="editor-wrapper">
      <textarea
        ref="editorEl"
        v-model="codeValue"
        :placeholder="`Escribe tu código ${selectedLanguage} aquí...`"
        class="code-editor"
        :style="{ height: editorHeight }"
        @input="handleInput"
        @keydown="handleKeydown"
        spellcheck="false"
      ></textarea>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  language: {
    type: String,
    default: 'javascript'
  },
  height: {
    type: [String, Number],
    default: '300px'
  }
});

const emit = defineEmits(['update:modelValue']);

const editorEl = ref<HTMLTextAreaElement | null>(null);
const selectedLanguage = ref(props.language);

const editorHeight = computed(() => {
  if (typeof props.height === 'number') {
    return `${props.height}px`;
  }
  return props.height;
});

const codeValue = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value)
});

const handleInput = (event: Event) => {
  const target = event.target as HTMLTextAreaElement;
  emit('update:modelValue', target.value);
};

const handleKeydown = (event: KeyboardEvent) => {
  // Añadir soporte para Tab
  if (event.key === 'Tab') {
    event.preventDefault();
    const textarea = event.target as HTMLTextAreaElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    // Insertar 2 espacios en lugar de tab
    const value = textarea.value;
    const newValue = value.substring(0, start) + '  ' + value.substring(end);
    
    emit('update:modelValue', newValue);
    
    // Mantener el cursor en la posición correcta
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + 2;
    }, 0);
  }
};

// Watch for language prop changes
watch(() => props.language, (newLanguage) => {
  selectedLanguage.value = newLanguage;
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
}

.editor-header {
  display: flex;
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
}

.language-dropdown:focus {
  border-color: var(--azul-tritiano, #007bff);
}

.editor-wrapper {
  position: relative;
  width: 100%;
  overflow: hidden;
}

.code-editor {
  width: 100%;
  min-height: 200px;
  border: none;
  outline: none;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.5;
  padding: 10px;
  resize: none;
  background-color: #fafafa;
  color: #333;
  tab-size: 2;
  white-space: pre;
  overflow-wrap: normal;
  overflow-x: auto;
}

.code-editor:focus {
  background-color: #fff;
}

.code-editor::placeholder {
  color: #999;
  font-style: italic;
}
</style>