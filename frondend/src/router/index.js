import { createRouter, createWebHistory } from 'vue-router'
import Home from '../pages/Home.vue'
import Login from '../pages/Login.vue'
import Register from '../pages/Register.vue'
import VerifyEmail from '../pages/VerifyEmail.vue'

const UserLayout = () => import('../pages/user/UserLayout.vue')
const Profile = () => import('../pages/user/Profile.vue')
const Pets = () => import('../pages/user/Pets.vue')
const AddPet = () => import('../pages/user/Addpet.vue')
const Receipts = () => import('../pages/user/Receipts.vue')
const Appointments = () => import('../pages/user/Appointments.vue')
const History = () => import('../pages/user/History.vue')

const AdminLayout = () => import('../pages/admin/AdminLayout.vue')
const AdminDashboard = () => import('../pages/admin/Dashboard.vue')
const AdminUsers = () => import('../pages/admin/Users.vue')
const AdminAppointments = () => import('../pages/admin/Appointments.vue')
const Services = () => import('../pages/admin/Services.vue')
const Treatments = () => import('../pages/admin/Treatments.vue')
const Expenses = () => import('../pages/admin/Expenses.vue')
const AdminOwners = () => import('../pages/admin/Owners.vue')
const AdminPets = () => import('../pages/admin/Pets.vue')
const AdminReceipts = () => import('../pages/admin/Receipts.vue')
const AdminVeterinarians = () => import('../pages/admin/Veterinarians.vue')
const AdminClinic = () => import('../pages/admin/Clinic.vue')
const AdminSurgeries = () => import('../pages/admin/Surgeries.vue')
const AdminVaccines = () => import('../pages/admin/Vaccines.vue')
const AdminReports = () => import('../pages/admin/Reports.vue')

const routes = [
  { path: '/', component: Home },
  { path: '/login', component: Login },
  { path: '/register', component: Register },
  { path: '/verify-email', component: VerifyEmail },
  
  // User Routes
  {
    path: '/user',
    component: UserLayout,
    meta: { requiresAuth: true, role: 'user' },
    children: [
        { path: '', redirect: '/user/profile' },
        { path: 'profile', component: Profile },
        { path: 'pets', component: Pets },
        { path: 'pets/add', component: AddPet },
        { path: 'receipts', component: Receipts },
        { path: 'appointments', component: Appointments },
        { path: 'history/:petId', component: History }
      ]
  },

  // Admin Routes
  {
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAuth: true, role: 'admin' },
    children: [
      { path: '', redirect: '/admin/dashboard' },
      { path: 'dashboard', component: AdminDashboard },
      { path: 'users', component: AdminUsers},
      { path: 'owners', component: AdminOwners },
      { path: 'pets', component: AdminPets },
      { path: 'history/:petId', component: History },
      { path: 'veterinarians', component: AdminVeterinarians },
      { path: 'clinic', component: AdminClinic },
      { path: 'surgeries', component: AdminSurgeries },
      { path: 'vaccines', component: AdminVaccines },
      { path: 'appointments', component: AdminAppointments},
      { path: 'services', component: Services},
      { path: 'treatments', component: Treatments },
      { path: 'receipts', component: AdminReceipts },
      { path: 'expenses', component: Expenses },
      { path: 'reports', component: AdminReports }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  
  let user = null;
  try {
    user = userStr ? JSON.parse(userStr) : null;
    
    if (user && !user.role) {
      user.role = 'user'; 
      localStorage.setItem('user', JSON.stringify(user));
    }
  } catch (e) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return next('/login');
  }

  if (to.meta.requiresAuth) {
    if (!token || !user) return next('/login');
    if (to.meta.role && user.role !== to.meta.role) return next(user.role === 'admin' ? '/admin' : '/user');
  }
  
  next();
})

export default router
