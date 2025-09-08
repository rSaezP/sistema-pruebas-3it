import { type RouteLocationNormalized, type NavigationGuardNext } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

export const authGuard = async (
  to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext
) => {
  const authStore = useAuthStore();
  
  // Check if the route requires authentication
  if (to.meta.requiresAuth) {
    // Check if user is authenticated with Cognito
    const isAuthenticated = authStore.isAuthenticated;
    
    if (!isAuthenticated) {
      // Redirect to login if not authenticated
      return next({
        name: 'login',
        query: { redirect: to.fullPath }
      });
    }
  }
  
  // Continue with the navigation
  next();
};

export const guestGuard = (
  _to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext
) => {
  const authStore = useAuthStore();
  
  if (authStore.isAuthenticated) {
    // If user is authenticated and trying to access a guest route (like login)
    return next({ name: 'dashboard' });
  }
  
  next();
};
