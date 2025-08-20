<template>
  <div class="admin-layout">
    <!-- Sidebar -->
    <aside class="sidebar" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
      <div class="sidebar-header">
        <div class="logo">
          <h2>3IT Pruebas</h2>
        </div>
        <button @click="toggleSidebar" class="sidebar-toggle">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
      
      <nav class="sidebar-nav">
        <router-link to="/admin/dashboard" class="nav-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" stroke-width="2"/>
          </svg>
          <span>Dashboard</span>
        </router-link>
        
        <router-link to="/admin/tests" class="nav-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" stroke-width="2"/>
          </svg>
          <span>Pruebas</span>
        </router-link>
        
        <router-link to="/admin/candidates" class="nav-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" stroke-width="2"/>
            <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
          </svg>
          <span>Candidatos</span>
        </router-link>
        
        <div class="nav-item" @click="authStore.logout">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="currentColor" stroke-width="2"/>
            <path d="M16 17L21 12L16 7" stroke="currentColor" stroke-width="2"/>
            <path d="M21 12H9" stroke="currentColor" stroke-width="2"/>
          </svg>
          <span>Salir</span>
        </div>
      </nav>
    </aside>

    <!-- Main content -->
    <main class="main-content">
      <header class="main-header">
        <h1>Sistema de Pruebas Técnicas 3IT</h1>
        <div class="user-info">
          <span>Administrador</span>
        </div>
      </header>
      
      <div class="content">
        <router-view />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const sidebarCollapsed = ref(false);

const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value;
};
</script>

<style scoped>
.admin-layout {
  display: flex;
  height: 100vh;
  background-color: var(--gris);
}

.sidebar {
  width: 280px;
  background-color: var(--azul-tritiano);
  color: var(--blanco);
  display: flex;
  flex-direction: column;
  transition: width var(--transition-base);
  position: relative;
  z-index: 10;
}

.sidebar-collapsed {
  width: 80px;
}

.sidebar-header {
  padding: var(--spacing-4);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo h2 {
  font-size: var(--font-size-xl);
  font-weight: 600;
  margin: 0;
  transition: opacity var(--transition-base);
}

.sidebar-collapsed .logo h2 {
  opacity: 0;
}

.sidebar-toggle {
  background: none;
  border: none;
  color: var(--blanco);
  cursor: pointer;
  padding: var(--spacing-1);
  border-radius: var(--radius-sm);
  transition: background-color var(--transition-base);
}

.sidebar-toggle:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.sidebar-nav {
  flex: 1;
  padding: var(--spacing-3) 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-3) var(--spacing-4);
  color: var(--blanco);
  text-decoration: none;
  transition: all var(--transition-base);
  cursor: pointer;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
}

.nav-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
  padding-left: var(--spacing-5);
}

.nav-item.router-link-active {
  background-color: var(--turquesa);
  border-right: 4px solid var(--blanco);
}

.nav-item span {
  transition: opacity var(--transition-base);
}

.sidebar-collapsed .nav-item span {
  opacity: 0;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.main-header {
  background-color: var(--blanco);
  padding: var(--spacing-4);
  border-bottom: 1px solid #E5E7EB;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: var(--shadow-sm);
}

.main-header h1 {
  color: var(--azul-tritiano);
  font-size: var(--font-size-2xl);
  margin: 0;
}

.user-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  font-weight: 500;
  color: var(--azul-tritiano);
}

.content {
  flex: 1;
  padding: var(--spacing-4);
  overflow-y: auto;
  background-color: var(--gris);
}

/* Responsive */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    height: 100vh;
    z-index: 20;
    transform: translateX(-100%);
  }
  
  .sidebar.sidebar-open {
    transform: translateX(0);
  }
  
  .main-content {
    margin-left: 0;
  }
  
  .main-header h1 {
    font-size: var(--font-size-lg);
  }
}
</style>