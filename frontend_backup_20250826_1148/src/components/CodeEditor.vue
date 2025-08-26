<template>
  <div class="code-editor-container">
    <div class="editor-wrapper">
      <textarea
        ref="editorEl"
        v-model="codeValue"
        :placeholder="`Escribe tu código ${language} aquí...`"
        class="code-editor"
        :style="{ height: editorHeight }"
        @input="handleInput"
        @keydown="handleKeydown"
        @contextmenu="handleContextMenu"
        @copy="handleCopy"
        @paste="handlePaste"
        @cut="handleCut"
        spellcheck="false"
        autocomplete="off"
      ></textarea>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

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
  // NUEVO: Prevenir copiar/pegar y atajos relacionados
  if (
    (event.ctrlKey || event.metaKey) && 
    (event.key === 'c' || event.key === 'v' || event.key === 'x' || event.key === 'a')
  ) {
    event.preventDefault();
    console.log('Operación de clipboard bloqueada');
    return false;
  }

  // NUEVO: Prevenir F12 y herramientas de desarrollador
  if (
    event.key === 'F12' || 
    (event.ctrlKey && event.shiftKey && event.key === 'I') ||
    (event.ctrlKey && event.shiftKey && event.key === 'C') ||
    (event.ctrlKey && event.key === 'u')
  ) {
    event.preventDefault();
    return false;
  }

  // EXISTENTE: Añadir soporte para Tab
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

// NUEVAS FUNCIONES DE SEGURIDAD
const handleContextMenu = (event: Event) => {
  event.preventDefault();
  return false;
};

const handleCopy = (event: ClipboardEvent) => {
  event.preventDefault();
  console.log('Copia bloqueada');
  return false;
};

const handlePaste = (event: ClipboardEvent) => {
  event.preventDefault();
  console.log('Pegado bloqueado');
  return false;
};

const handleCut = (event: ClipboardEvent) => {
  event.preventDefault();
  console.log('Corte bloqueado');
  return false;
};

onMounted(() => {
  console.log('Editor seguro activado - operaciones de clipboard deshabilitadas');
});

// NUEVO: Función expuesta para compatibilidad con TestView
const preventCopyPaste = () => {
  console.log('Prevención de copia/pegado ya está activa');
};

defineExpose({
  preventCopyPaste
});

// Language is now controlled by parent component
</script>

<style scoped>
.code-editor-container {
  position: relative;
  width: 100%;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  overflow: hidden;
  background-color: #ffffff;
  /* NUEVO: Prevenir selección del contenedor */
  user-select: none;
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
  /* NUEVO: Permitir selección solo en textarea para edición */
  user-select: text;
}

.code-editor:focus {
  background-color: #fff;
}

.code-editor::placeholder {
  color: #999;
  font-style: italic;
}

/* NUEVO: Indicador visual de editor seguro */
.code-editor-container::before {
  content: "🔒 Editor Seguro";
  position: absolute;
  top: 2px;
  right: 8px;
  font-size: 10px;
  color: #666;
  background: rgba(255, 255, 255, 0.9);
  padding: 2px 6px;
  border-radius: 3px;
  z-index: 10;
  pointer-events: none;
}
</style>