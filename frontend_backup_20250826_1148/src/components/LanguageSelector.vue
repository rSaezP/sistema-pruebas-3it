<template>
  <select
    :id="id"
    :value="modelValue"
    @change="handleChange"
    :class="selectClass"
    :required="required"
    :disabled="disabled"
  >
    <option value="" v-if="placeholder">{{ placeholder }}</option>
    <optgroup 
      v-for="group in languageGroups" 
      :key="group.label"
      :label="group.label"
    >
      <option 
        v-for="option in group.options" 
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </optgroup>
  </select>
</template>

<script setup lang="ts">
import { useLanguages } from '@/composables/useLanguages';

interface Props {
  modelValue: string;
  id?: string;
  placeholder?: string;
  selectClass?: string;
  required?: boolean;
  disabled?: boolean;
}

interface Emits {
  (e: 'update:modelValue', value: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  id: 'language-select',
  placeholder: 'Selecciona un lenguaje',
  selectClass: 'input select',
  required: false,
  disabled: false
});

const emit = defineEmits<Emits>();

const { languageGroups } = useLanguages();

const handleChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  emit('update:modelValue', target.value);
};
</script>