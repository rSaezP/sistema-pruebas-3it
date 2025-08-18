import { ref, watch, nextTick } from 'vue'

interface AutoSaveOptions {
  key: string
  delay?: number
}

export const useAutoSave = <T>(data: any, options: AutoSaveOptions) => {
  const { key, delay = 2000 } = options
  const isRestored = ref(false)
  let saveTimeout: NodeJS.Timeout | null = null

  // Save to localStorage with debounce
  const saveToStorage = () => {
    if (saveTimeout) {
      clearTimeout(saveTimeout)
    }
    
    saveTimeout = setTimeout(() => {
      try {
        const dataToSave = typeof data.value === 'object' ? data.value : data
        // Only save if there's meaningful content and no modal is open
        if (dataToSave && (dataToSave.title || dataToSave.description) && !document.querySelector('.modal-overlay')) {
          localStorage.setItem(key, JSON.stringify(dataToSave))
        }
      } catch (error) {
        console.warn('AutoSave: Failed to save to localStorage', error)
      }
    }, delay)
  }

  // Load from localStorage
  const loadFromStorage = (): T | null => {
    try {
      const saved = localStorage.getItem(key)
      if (saved) {
        return JSON.parse(saved) as T
      }
    } catch (error) {
      console.warn('AutoSave: Failed to load from localStorage', error)
    }
    return null
  }

  // Clear saved data
  const clearStorage = () => {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.warn('AutoSave: Failed to clear localStorage', error)
    }
  }

  // Auto-save watcher
  const startAutoSave = () => {
    watch(data, saveToStorage, { deep: true })
  }

  // Restore data
  const restoreData = () => {
    const saved = loadFromStorage()
    if (saved) {
      // Merge saved data with current data
      if (typeof data.value === 'object' && data.value !== null) {
        Object.assign(data.value, saved)
      } else {
        data.value = saved
      }
      isRestored.value = true
      return true
    }
    return false
  }

  return {
    startAutoSave,
    restoreData,
    clearStorage,
    isRestored: isRestored.value,
    saveToStorage
  }
}