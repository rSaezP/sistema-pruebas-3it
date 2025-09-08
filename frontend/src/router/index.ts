import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

// Layouts
const AdminLayout = () => import('@/layouts/AdminLayout.vue');
const TestLayout = () => import('@/layouts/TestLayout.vue');

// Admin Views
const DashboardView = () => import('@/views/admin/Dashboard.vue');
const TestsListView = () => import('@/views/admin/TestsList.vue');
const CreateTestView = () => import('@/views/admin/CreateTest.vue');
const EditTestView = () => import('@/views/admin/EditTest.vue');
const CandidatesView = () => import('@/views/admin/Candidates.vue');
const ReportsView = () => import('@/views/admin/Reports.vue');

// Auth Views
const LoginView = () => import('@/views/Login.vue');
const CallbackView = () => import('@/views/auth/CallbackView.vue');

// Public Views
const TestView = () => import('@/views/TestView.vue');
const TestCompletedView = () => import('@/views/TestCompleted.vue');

const routes: Array<RouteRecordRaw> = [
  {
    path: '/login',
    name: 'login',
    component: LoginView
  },
  {
    path: '/callback',
    name: 'callback',
    component: CallbackView
  },
  {
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/admin/dashboard'
      },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: DashboardView,
        meta: { requiresAuth: true }
      },
      {
        path: 'tests',
        name: 'tests',
        component: TestsListView,
        meta: { requiresAuth: true }
      },
      {
        path: 'tests/create',
        name: 'create-test',
        component: CreateTestView,
        meta: { requiresAuth: true }
      },
      {
        path: 'tests/:id/edit',
        name: 'edit-test',
        component: EditTestView,
        props: true,
        meta: { requiresAuth: true }
      },
      {
        path: 'candidates',
        name: 'candidates',
        component: CandidatesView,
        meta: { requiresAuth: true }
      },
      {
        path: 'reports',
        name: 'reports',
        component: ReportsView,
        meta: { requiresAuth: true }
      },
      {
        path: 'reports/:sessionId',
        name: 'session-report',
        component: ReportsView,
        props: true,
        meta: { requiresAuth: true }
      }
    ]
  },
  {
    path: '/test/:token',
    name: 'test',
    component: TestLayout,
    children: [
      {
        path: '',
        name: 'test-view',
        component: TestView,
        props: true
      },
      {
        path: 'completed',
        name: 'test-completed',
        component: TestCompletedView,
        props: true
      }
    ]
  },
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/login'
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 };
  }
});

// Import and configure auth guards
import { authGuard, guestGuard } from './guards';

// Add auth guard to router
router.beforeEach(authGuard);

// Add guest guard for login routes
router.beforeEach((to, from, next) => {
  if (to.name === 'login') {
    return guestGuard(to, from, next);
  }
  next();
});

export default router;