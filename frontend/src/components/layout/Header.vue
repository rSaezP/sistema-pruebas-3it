<template>
  <header class="app-header">
    <div class="header-left">
      <button 
        class="menu-toggle" 
        @click="toggleSidebar"
        aria-label="Toggle menu"
      >
        <i class="icon-menu"></i>
      </button>
      <div class="logo">
        <img 
          src="@/assets/logo-3it.svg" 
          alt="3IT Logo"
          class="logo-img"
        >
        <span class="app-name">Plataforma de Evaluación</span>
      </div>
    </div>

    <div class="header-right">
      <div class="notifications">
        <button 
          class="icon-button"
          @click="toggleNotifications"
          aria-label="Notificaciones"
        >
          <i class="icon-bell"></i>
          <span 
            v-if="unreadNotifications > 0" 
            class="notification-badge"
          >
            {{ unreadNotifications }}
          </span>
        </button>
        
        <div 
          v-if="showNotifications" 
          class="notifications-dropdown"
        >
          <div class="notifications-header">
            <h3>Notificaciones</h3>
            <button 
              class="mark-all-read"
              @click="markAllAsRead"
            >
              Marcar todo como leído
            </button>
          </div>
          
          <div class="notifications-list">
            <div 
              v-for="notification in notifications" 
              :key="notification.id"
              class="notification-item"
              :class="{ 'unread': !notification.read }"
              @click="handleNotificationClick(notification)"
            >
              <div class="notification-icon">
                <i :class="getNotificationIcon(notification.type)"></i>
              </div>
              <div class="notification-content">
                <p class="notification-message">{{ notification.message }}</p>
                <span class="notification-time">{{ formatTime(notification.time) }}</span>
              </div>
            </div>
            
            <div 
              v-if="notifications.length === 0" 
              class="empty-notifications"
            >
              No hay notificaciones
            </div>
          </div>
          
          <div class="notifications-footer">
            <router-link to="/admin/notifications">Ver todas las notificaciones</router-link>
          </div>
        </div>
      </div>
      
      <div class="user-menu">
        <button 
          class="user-button"
          @click="toggleUserMenu"
          aria-label="Menú de usuario"
        >
          <div class="user-avatar">
            <img 
              v-if="user.avatar" 
              :src="user.avatar" 
              :alt="user.name"
            >
            <div 
              v-else 
              class="avatar-placeholder"
            >
              {{ getUserInitials(user.name) }}
            </div>
          </div>
          <span class="user-name">{{ user.name }}</span>
          <i class="icon-chevron-down"></i>
        </button>
        
        <div 
          v-if="showUserMenu" 
          class="user-dropdown"
        >
          <div class="user-info">
            <div class="user-avatar large">
              <img 
                v-if="user.avatar" 
                :src="user.avatar" 
                :alt="user.name"
              >
              <div 
                v-else 
                class="avatar-placeholder"
              >
                {{ getUserInitials(user.name) }}
              </div>
            </div>
            <div class="user-details">
              <h4>{{ user.name }}</h4>
              <p>{{ user.email }}</p>
              <span class="user-role">{{ user.role }}</span>
            </div>
          </div>
          
          <div class="menu-divider"></div>
          
          <ul class="menu-list">
            <li>
              <router-link to="/admin/profile">
                <i class="icon-user"></i>
                Mi perfil
              </router-link>
            </li>
            <li>
              <router-link to="/admin/settings">
                <i class="icon-settings"></i>
                Configuración
              </router-link>
            </li>
            <li>
              <a href="#" @click.prevent="showHelp">
                <i class="icon-help-circle"></i>
                Ayuda y soporte
              </a>
            </li>
          </ul>
          
          <div class="menu-divider"></div>
          
          <button 
            class="logout-button"
            @click="logout"
          >
            <i class="icon-log-out"></i>
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
    
    <div 
      v-if="showNotifications || showUserMenu"
      class="overlay"
      @click="closeAllMenus"
    ></div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Props
const props = defineProps({
  isSidebarCollapsed: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['toggle-sidebar'])

// Router
const router = useRouter()

// Auth store
const authStore = useAuthStore()

// User data from Cognito - Reactive to auth changes
const user = computed(() => {
  // Force reactivity by checking auth state
  const isAuth = authStore.isAuthenticated;
  if (!isAuth) {
    return {
      name: 'Usuario',
      email: 'usuario@email.com', 
      role: 'Administrador',
      avatar: ''
    };
  }

  // Get fresh user data
  const userName = authStore.getUserName();
  const userInfo = authStore.user as any;
  
  return {
    name: userName || userInfo?.name || userInfo?.email || 'Usuario Cognito',
    email: userInfo?.email || userInfo?.username || 'cognito@usuario.com',
    role: 'Administrador',
    avatar: userInfo?.picture || ''
  };
})

// UI State
const showUserMenu = ref(false)
const showNotifications = ref(false)
const notifications = ref([
  {
    id: 1,
    type: 'test_completed',
    message: 'Juan Pérez ha completado la prueba de JavaScript',
    time: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
    read: false,
    link: '/admin/candidates/1'
  },
  {
    id: 2,
    type: 'new_candidate',
    message: 'Nuevo candidato registrado: María González',
    time: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    read: false,
    link: '/admin/candidates'
  },
  {
    id: 3,
    type: 'system',
    message: 'Actualización del sistema programada para hoy a las 2:00 AM',
    time: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    read: true,
    link: '/admin/notifications/3'
  }
])

// Computed
const unreadNotifications = computed(() => {
  return notifications.value.filter(n => !n.read).length
})

// Methods
const toggleSidebar = () => {
  emit('toggle-sidebar')
}

const toggleUserMenu = () => {
  showUserMenu.value = !showUserMenu.value
  if (showUserMenu.value) {
    showNotifications.value = false
  }
}

const toggleNotifications = () => {
  showNotifications.value = !showNotifications.value
  if (showNotifications.value) {
    showUserMenu.value = false
    // Mark notifications as read when opened
    markAllAsRead()
  }
}

const closeAllMenus = () => {
  showUserMenu.value = false
  showNotifications.value = false
}

const markAllAsRead = () => {
  notifications.value = notifications.value.map(notification => ({
    ...notification,
    read: true
  }))
}

const handleNotificationClick = (notification: any) => {
  if (notification.link) {
    router.push(notification.link)
    closeAllMenus()
  }
}

const getUserInitials = (name: string) => {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

const getNotificationIcon = (type: string) => {
  const icons: Record<string, string> = {
    test_completed: 'icon-check-circle',
    new_candidate: 'icon-user-plus',
    system: 'icon-alert-circle'
  }
  return icons[type] || 'icon-bell'
}

const formatTime = (date: Date) => {
  const now = new Date()
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
  
  if (diffInMinutes < 1) return 'Ahora mismo'
  if (diffInMinutes < 60) return `Hace ${diffInMinutes} min`
  
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `Hace ${diffInHours} h`
  
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays === 1) return 'Ayer'
  if (diffInDays < 7) return `Hace ${diffInDays} días`
  
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

const showHelp = () => {
  closeAllMenus()
  // In a real app, this would open a help modal or redirect to help center
  alert('Redirigiendo al centro de ayuda...')
}

const logout = () => {
  closeAllMenus()
  authStore.logout()
}

// Close menus when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  const headerElement = document.querySelector('.app-header')
  
  if (headerElement && !headerElement.contains(target)) {
    closeAllMenus()
  }
}

// Lifecycle
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
/* Base Styles */
.app-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 64px;
  background-color: var(--blanco);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  z-index: 1000;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.menu-toggle {
  background: none;
  border: none;
  color: var(--azul-tritiano);
  font-size: 20px;
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.menu-toggle:hover {
  background-color: rgba(0, 0, 38, 0.05);
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-img {
  height: 32px;
  width: auto;
}

.app-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--azul-tritiano);
  margin: 0;
  display: none;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
}

/* Notifications */
.notifications {
  position: relative;
}

.icon-button {
  background: none;
  border: none;
  color: var(--azul-tritiano);
  font-size: 20px;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  position: relative;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
}

.icon-button:hover {
  background-color: rgba(0, 0, 38, 0.05);
}

.notification-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  background-color: #dc3545;
  color: white;
  border-radius: 10px;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 600;
  min-width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--blanco);
}

.notifications-dropdown {
  position: absolute;
  top: 56px;
  right: 0;
  width: 380px;
  max-height: 500px;
  background-color: var(--blanco);
  border-radius: 8px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
  z-index: 1100;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transform-origin: top right;
  animation: scaleIn 0.2s ease-out;
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.notifications-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--gris);
}

.notifications-header h3 {
  margin: 0;
  font-size: 16px;
  color: var(--azul-tritiano);
}

.mark-all-read {
  background: none;
  border: none;
  color: var(--azul-electrico);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.mark-all-read:hover {
  background-color: rgba(0, 90, 238, 0.05);
}

.notifications-list {
  flex: 1;
  overflow-y: auto;
  max-height: 400px;
}

.notification-item {
  display: flex;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s;
  border-left: 3px solid transparent;
}

.notification-item:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

.notification-item.unread {
  background-color: #f8f9fa;
  border-left-color: var(--azul-electrico);
}

.notification-icon {
  margin-right: 12px;
  color: var(--azul-tritiano);
  font-size: 18px;
  display: flex;
  align-items: flex-start;
  padding-top: 2px;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-message {
  margin: 0 0 4px 0;
  font-size: 14px;
  color: var(--negro);
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.notification-time {
  font-size: 12px;
  color: #6c757d;
}

.empty-notifications {
  padding: 24px 16px;
  text-align: center;
  color: #6c757d;
  font-size: 14px;
}

.notifications-footer {
  padding: 12px 16px;
  text-align: center;
  border-top: 1px solid var(--gris);
}

.notifications-footer a {
  color: var(--azul-electrico);
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s;
}

.notifications-footer a:hover {
  text-decoration: underline;
}

/* User Menu */
.user-menu {
  position: relative;
}

.user-button {
  display: flex;
  align-items: center;
  background: none;
  border: none;
  padding: 4px 8px 4px 4px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
  gap: 8px;
}

.user-button:hover {
  background-color: rgba(0, 0, 38, 0.05);
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--azul-electrico);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 12px;
  overflow: hidden;
}

.user-avatar.large {
  width: 48px;
  height: 48px;
  font-size: 18px;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--azul-tritiano);
  margin-right: 4px;
  max-width: 120px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-dropdown {
  position: absolute;
  top: 56px;
  right: 0;
  width: 300px;
  background-color: var(--blanco);
  border-radius: 8px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
  z-index: 1100;
  overflow: hidden;
  transform-origin: top right;
  animation: scaleIn 0.2s ease-out;
}

.user-info {
  display: flex;
  padding: 20px;
  gap: 16px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
}

.user-details {
  flex: 1;
  min-width: 0;
}

.user-details h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  color: var(--azul-tritiano);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-details p {
  margin: 0 0 4px 0;
  font-size: 13px;
  color: #6c757d;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-role {
  display: inline-block;
  background-color: rgba(0, 90, 238, 0.1);
  color: var(--azul-electrico);
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.menu-divider {
  height: 1px;
  background-color: var(--gris);
  margin: 8px 0;
}

.menu-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.menu-list li a {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  color: var(--negro);
  text-decoration: none;
  font-size: 14px;
  transition: all 0.2s;
  gap: 12px;
}

.menu-list li a:hover {
  background-color: rgba(0, 0, 0, 0.02);
  color: var(--azul-electrico);
}

.menu-list li i {
  font-size: 18px;
  width: 24px;
  text-align: center;
}

.logout-button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  background: none;
  border: none;
  padding: 12px 20px;
  color: #dc3545;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  gap: 12px;
}

.logout-button:hover {
  background-color: rgba(220, 53, 69, 0.05);
}

.logout-button i {
  font-size: 18px;
  width: 24px;
  text-align: center;
}

/* Overlay */
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: transparent;
  z-index: 1000;
}

/* Responsive */
@media (min-width: 992px) {
  .app-name {
    display: block;
  }
}

@media (max-width: 768px) {
  .app-header {
    padding: 0 16px;
  }
  
  .notifications-dropdown {
    width: 320px;
    right: -80px;
  }
  
  .user-dropdown {
    width: 280px;
    right: -60px;
  }
}

@media (max-width: 576px) {
  .notifications-dropdown,
  .user-dropdown {
    position: fixed;
    top: 64px;
    left: 16px;
    right: 16px;
    width: auto;
    max-height: calc(100vh - 80px);
  }
  
  .user-name {
    display: none;
  }
  
  .user-button i {
    display: none;
  }
}
</style>
