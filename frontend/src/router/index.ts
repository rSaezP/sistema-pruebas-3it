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

// Public Views
const TestView = () => import('@/views/TestView.vue');

const routes: Array<RouteRecordRaw> = [
  {
    path: '/admin',
    component: AdminLayout,
    children: [
      {
        path: '',
        redirect: '/admin/dashboard'
      },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: DashboardView
      },
      {
        path: 'tests',
        name: 'tests',
        component: TestsListView
      },
      {
        path: 'tests/create',
        name: 'create-test',
        component: CreateTestView
      },
      {
        path: 'tests/:id/edit',
        name: 'edit-test',
        component: EditTestView,
        props: true
      },
      {
        path: 'candidates',
        name: 'candidates',
        component: CandidatesView
      },
      {
        path: 'reports',
        name: 'reports',
        component: ReportsView
      },
      {
        path: 'reports/:sessionId',
        name: 'session-report',
        component: ReportsView,
        props: true
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
      }
    ]
  },
  {
    path: '/',
    redirect: '/admin/dashboard'
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/admin/dashboard'
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 };
  }
});

// Removed auth guard since we're not using authentication

export default router;