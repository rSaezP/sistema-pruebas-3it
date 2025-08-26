import { type RouteLocationNormalized, type NavigationGuardNext } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

export const authGuard = async (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
) => {
  const authStore = useAuthStore();
  
  // Check if the route requires authentication
  if (to.meta.requiresAuth) {
    // Check if user is authenticated
    const isAuthenticated = await authStore.checkAuth();
    
    if (!isAuthenticated) {
      // Redirect to login if not authenticated
      return next({
        name: 'login',
        query: { redirect: to.fullPath }
      });
    }
    
    // Check for role-based access if required
    if (to.meta.roles && to.meta.roles.length > 0) {
      const userRole = authStore.user?.role;
      if (!userRole || !to.meta.roles.includes(userRole)) {
        // User doesn't have required role, redirect to dashboard or 403
        return next({ name: 'dashboard' });
      }
    }
  }
  
  // Continue with the navigation
  next();
};

export const guestGuard = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
) => {
  const authStore = useAuthStore();
  
  if (authStore.isAuthenticated) {
    // If user is authenticated and trying to access a guest route (like login)
    return next({ name: 'dashboard' });
  }
  
  next();
};
