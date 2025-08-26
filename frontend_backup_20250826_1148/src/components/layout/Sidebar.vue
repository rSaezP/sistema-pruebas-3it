<template>
  <aside 
    class="app-sidebar" 
    :class="{ 'collapsed': isCollapsed }"
  >
    <div class="sidebar-header">
      <div class="logo">
        <img 
          src="@/assets/logo-3it.svg" 
          alt="3IT Logo"
          class="logo-img"
        >
        <transition name="fade">
          <span v-if="!isCollapsed" class="app-name">Plataforma de Evaluación</span>
        </transition>
      </div>
    </div>
    
    <div class="sidebar-content">
      <nav class="sidebar-nav">
        <ul class="nav-menu">
          <li class="nav-item" v-for="(item, index) in mainMenu" :key="index">
            <router-link 
              v-if="!item.children" 
              :to="item.path" 
              class="nav-link"
              :class="{ 'active': isActive(item) }"
            >
              <i :class="['nav-icon', item.icon]"></i>
              <transition name="fade">
                <span v-if="!isCollapsed" class="nav-text">{{ item.title }}</span>
              </transition>
              <span 
                v-if="item.badge && !isCollapsed" 
                class="nav-badge"
                :class="item.badgeClass"
              >
                {{ item.badge }}
              </span>
            </router-link>
            
            <div v-else class="nav-group">
              <div 
                class="nav-link group-toggle"
                :class="{ 'active': isGroupActive(item) }"
                @click="toggleGroup(index)"
              >
                <i :class="['nav-icon', item.icon]"></i>
                <transition name="fade">
                  <span v-if="!isCollapsed" class="nav-text">{{ item.title }}</span>
                </transition>
                <i 
                  class="group-arrow"
                  :class="isGroupOpen(index) ? 'icon-chevron-up' : 'icon-chevron-down'"
                ></i>
              </div>
              
              <transition name="slide">
                <ul 
                  v-show="!isCollapsed && isGroupOpen(index)" 
                  class="submenu"
                >
                  <li 
                    v-for="(subItem, subIndex) in item.children" 
                    :key="subIndex"
                    class="submenu-item"
                  >
                    <router-link 
                      :to="subItem.path" 
                      class="submenu-link"
                      :class="{ 'active': $route.path.startsWith(subItem.path) }"
                    >
                      <i class="submenu-icon" :class="subItem.icon"></i>
                      <span class="submenu-text">{{ subItem.title }}</span>
                      <span 
                        v-if="subItem.badge" 
                        class="submenu-badge"
                        :class="subItem.badgeClass"
                      >
                        {{ subItem.badge }}
                      </span>
                    </router-link>
                  </li>
                </ul>
              </transition>
            </div>
          </li>
        </ul>
      </nav>
      
      <div class="sidebar-footer">
        <div class="user-profile">
          <div class="user-avatar">
            <img 
              v-if="user.avatar" 
              :src="user.avatar" 
              :alt="user.name"
            >
            <div v-else class="avatar-placeholder">
              {{ getUserInitials(user.name) }}
            </div>
          </div>
          <transition name="fade">
            <div v-if="!isCollapsed" class="user-info">
              <h4 class="user-name">{{ user.name }}</h4>
              <p class="user-email">{{ user.email }}</p>
            </div>
          </transition>
          <button 
            class="collapse-toggle"
            @click="toggleCollapse"
            :title="isCollapsed ? 'Expandir menú' : 'Colapsar menú'"
          >
            <i :class="isCollapsed ? 'icon-chevron-right' : 'icon-chevron-left'"></i>
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'

// Props
const props = defineProps({
  isCollapsed: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['toggle-collapse'])

// Router
const route = useRoute()

// User data (in a real app, this would come from a store)
const user = ref({
  name: 'Admin Usuario',
  email: 'admin@3it.cl',
  avatar: ''
})

// Menu state
const openGroups = ref<number[]>([])

// Menu items (in a real app, this could be fetched from an API)
const mainMenu = ref([
  {
    title: 'Dashboard',
    icon: 'icon-home',
    path: '/admin/dashboard',
    exact: true
  },
  {
    title: 'Pruebas',
    icon: 'icon-file-text',
    path: '/admin/tests',
    children: [
      { 
        title: 'Todas las pruebas', 
        icon: 'icon-list',
        path: '/admin/tests'
      },
      { 
        title: 'Crear nueva', 
        icon: 'icon-plus',
        path: '/admin/tests/create'
      },
      { 
        title: 'Categorías', 
        icon: 'icon-folder',
        path: '/admin/tests/categories'
      }
    ]
  },
  {
    title: 'Candidatos',
    icon: 'icon-users',
    path: '/admin/candidates',
    badge: '5',
    badgeClass: 'badge-primary'
  },
  {
    title: 'Reportes',
    icon: 'icon-bar-chart-2',
    path: '/admin/reports',
    children: [
      { 
        title: 'Resumen general', 
        icon: 'icon-pie-chart',
        path: '/admin/reports/overview'
      },
      { 
        title: 'Resultados por prueba', 
        icon: 'icon-trending-up',
        path: '/admin/reports/by-test'
      },
      { 
        title: 'Análisis de habilidades', 
        icon: 'icon-award',
        path: '/admin/reports/skills'
      },
      { 
        title: 'Exportar datos', 
        icon: 'icon-download',
        path: '/admin/reports/export'
      }
    ]
  },
  {
    title: 'Plantillas',
    icon: 'icon-layers',
    path: '/admin/templates'
  },
  {
    title: 'Configuración',
    icon: 'icon-settings',
    path: '/admin/settings',
    children: [
      { 
        title: 'General', 
        icon: 'icon-sliders',
        path: '/admin/settings/general'
      },
      { 
        title: 'Correos', 
        icon: 'icon-mail',
        path: '/admin/settings/email'
      },
      { 
        title: 'Integraciones', 
        icon: 'icon-link',
        path: '/admin/settings/integrations'
      },
      { 
        title: 'Usuarios y permisos', 
        icon: 'icon-users',
        path: '/admin/settings/users'
      }
    ]
  },
  {
    title: 'Ayuda y soporte',
    icon: 'icon-help-circle',
    path: '/admin/help',
    badge: 'Nuevo',
    badgeClass: 'badge-success'
  }
])

// Computed
const isGroupActive = (item: any) => {
  if (!item.children) return false
  return item.children.some((child: any) => route.path.startsWith(child.path))
}

// Methods
const toggleCollapse = () => {
  emit('toggle-collapse')
}

const toggleGroup = (index: number) => {
  const groupIndex = openGroups.value.indexOf(index)
  if (groupIndex === -1) {
    openGroups.value.push(index)
  } else {
    openGroups.value.splice(groupIndex, 1)
  }
  
  // Save to localStorage
  localStorage.setItem('sidebarOpenGroups', JSON.stringify(openGroups.value))
}

const isGroupOpen = (index: number) => {
  return openGroups.value.includes(index)
}

const isActive = (item: any) => {
  if (item.exact) {
    return route.path === item.path
  }
  return route.path.startsWith(item.path)
}

const getUserInitials = (name: string) => {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

// Initialize open groups from localStorage
const initOpenGroups = () => {
  const savedGroups = localStorage.getItem('sidebarOpenGroups')
  if (savedGroups) {
    try {
      openGroups.value = JSON.parse(savedGroups)
    } catch (e) {
      console.error('Error parsing sidebar state:', e)
    }
  }
  
  // Auto-expand active group on initial load
  if (!props.isCollapsed) {
    const activeGroupIndex = mainMenu.value.findIndex(item => 
      item.children && item.children.some(child => route.path.startsWith(child.path))
    )
    
    if (activeGroupIndex !== -1 && !openGroups.value.includes(activeGroupIndex)) {
      openGroups.value.push(activeGroupIndex)
    }
  }
}

// Lifecycle
onMounted(() => {
  initOpenGroups()
})

// Watch for route changes to auto-expand parent groups
watch(
  () => route.path,
  (newPath) => {
    if (props.isCollapsed) return
    
    mainMenu.value.forEach((item, index) => {
      if (item.children && item.children.some(child => newPath.startsWith(child.path))) {
        if (!openGroups.value.includes(index)) {
          openGroups.value.push(index)
        }
      }
    })
  },
  { immediate: true }
)
</script>

<style scoped>
/* Base Styles */
.app-sidebar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: 250px;
  background-color: var(--azul-tritiano);
  color: rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  z-index: 900;
  transition: all 0.3s ease;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.app-sidebar.collapsed {
  width: 70px;
}

/* Sidebar Header */
.sidebar-header {
  padding: 20px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  min-height: 64px;
  display: flex;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  color: white;
}

.logo-img {
  height: 32px;
  width: auto;
  flex-shrink: 0;
}

.app-name {
  font-size: 16px;
  font-weight: 600;
  color: white;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: opacity 0.2s;
}

/* Sidebar Content */
.sidebar-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Navigation */
.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  padding: 16px 0;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
}

.sidebar-nav::-webkit-scrollbar {
  width: 4px;
}

.sidebar-nav::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

.sidebar-nav::-webkit-scrollbar-track {
  background: transparent;
}

.nav-menu {
  list-style: none;
  padding: 0;
  margin: 0;
}

.nav-item {
  margin-bottom: 4px;
}

.nav-link {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  position: relative;
  border-left: 3px solid transparent;
}

.nav-link:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
}

.nav-link.active {
  background-color: rgba(0, 90, 238, 0.3);
  color: white;
  border-left-color: var(--azul-electrico);
}

.nav-icon {
  font-size: 18px;
  width: 24px;
  text-align: center;
  flex-shrink: 0;
  transition: all 0.3s;
}

.nav-text {
  margin-left: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: opacity 0.3s;
}

.nav-badge {
  margin-left: auto;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.4;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.badge-primary {
  background-color: var(--azul-electrico);
  color: white;
}

.badge-success {
  background-color: #28a745;
  color: white;
}

/* Submenu */
.nav-group {
  position: relative;
}

.group-toggle {
  cursor: pointer;
  padding-right: 40px;
}

.group-arrow {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 16px;
  transition: transform 0.3s;
}

.submenu {
  list-style: none;
  padding: 0;
  margin: 0;
  background-color: rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.submenu-item {
  margin: 0;
}

.submenu-link {
  display: flex;
  align-items: center;
  padding: 10px 16px 10px 52px;
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  font-size: 13px;
  font-weight: 400;
  transition: all 0.2s;
  position: relative;
}

.submenu-link:hover {
  background-color: rgba(255, 255, 255, 0.05);
  color: white;
}

.submenu-link.active {
  color: white;
  background-color: rgba(44, 213, 196, 0.2);
}

.submenu-link.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background-color: var(--turquesa);
}

.submenu-icon {
  font-size: 14px;
  width: 20px;
  text-align: center;
  margin-right: 8px;
  opacity: 0.7;
}

.submenu-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.submenu-badge {
  margin-left: auto;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 8px;
  background-color: rgba(0, 0, 0, 0.2);
}

/* Sidebar Footer */
.sidebar-footer {
  padding: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  background-color: rgba(0, 0, 0, 0.1);
}

.user-profile {
  display: flex;
  align-items: center;
  position: relative;
  padding-right: 30px;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: var(--azul-electrico);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 13px;
  flex-shrink: 0;
  overflow: hidden;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-info {
  margin-left: 12px;
  min-width: 0;
  transition: opacity 0.3s;
}

.user-name {
  font-size: 13px;
  font-weight: 600;
  color: white;
  margin: 0 0 2px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-email {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.collapse-toggle {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: rgba(255, 255, 255, 0.7);
  width: 24px;
  height: 24px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.collapse-toggle:hover {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
  max-height: 300px;
  overflow: hidden;
}

.slide-enter-from,
.slide-leave-to {
  max-height: 0;
  opacity: 0;
  transform: translateY(-10px);
}

/* Collapsed State */
.app-sidebar.collapsed .nav-text,
.app-sidebar.collapsed .app-name,
.app-sidebar.collapsed .user-info {
  opacity: 0;
  width: 0;
  padding: 0;
  margin: 0;
  visibility: hidden;
  display: none;
}

.app-sidebar.collapsed .nav-link {
  justify-content: center;
  padding: 12px 0;
}

.app-sidebar.collapsed .nav-icon {
  font-size: 20px;
  width: auto;
}

.app-sidebar.collapsed .nav-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  margin: 0;
  font-size: 9px;
  padding: 1px 4px;
  min-width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.app-sidebar.collapsed .user-profile {
  justify-content: center;
  padding: 0;
}

.app-sidebar.collapsed .user-avatar {
  width: 32px;
  height: 32px;
  font-size: 12px;
}

.app-sidebar.collapsed .collapse-toggle {
  right: 50%;
  transform: translate(50%, -50%);
  top: auto;
  bottom: 10px;
  background: rgba(255, 255, 255, 0.15);
}

/* Responsive */
@media (max-width: 992px) {
  .app-sidebar {
    transform: translateX(-100%);
  }
  
  .app-sidebar.collapsed {
    transform: translateX(-100%);
  }
  
  .app-sidebar.mobile-open {
    transform: translateX(0);
  }
}
</style>
