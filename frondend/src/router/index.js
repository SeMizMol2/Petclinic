import { createRouter, createWebHistory } from 'vue-router'
import Home from '../pages/Home.vue'
import Login from '../pages/Login.vue'
import Register from '../pages/Register.vue'

// User Components
import UserLayout from '../pages/user/UserLayout.vue'
import Profile from '../pages/user/Profile.vue'
import Pets from '../pages/user/Pets.vue'
import AddPet from '../pages/user/Addpet.vue'
import Receipts from '../pages/user/Receipts.vue'
import Appointments from '../pages/user/Appointments.vue'

// Admin Components
import AdminLayout from '../pages/admin/AdminLayout.vue'
import AdminDashboard from '../pages/admin/Dashboard.vue'
import AdminUsers from '../pages/admin/Users.vue'
import AdminAppointments from '../pages/admin/Appointments.vue'
import Services from '../pages/admin/Services.vue'
import Treatments from '../pages/admin/Treatments.vue'
import Expenses from '../pages/admin/Expenses.vue'
import AdminOwners from '../pages/admin/Owners.vue'
import AdminPets from '../pages/admin/Pets.vue'
import AdminReceipts from '../pages/admin/Receipts.vue'
import AdminVeterinarians from '../pages/admin/Veterinarians.vue'
import AdminClinic from '../pages/admin/Clinic.vue'
import AdminSurgeries from '../pages/admin/Surgeries.vue'
import AdminVaccines from '../pages/admin/Vaccines.vue'
import AdminReports from '../pages/admin/Reports.vue'
import History from '../pages/user/History.vue'

const routes = [
  { path: '/', component: Home },
  { path: '/login', component: Login },
  { path: '/register', component: Register },
  
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

// Navigation Guard (แก้ไขแล้ว: ป้องกันจอขาว 100%)
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  
  let user = null;
  try {
    user = userStr ? JSON.parse(userStr) : null;
    
    // 👈 บรรทัดนี้สำคัญ: ถ้ามีข้อมูล user แต่ไม่มี role ให้เติมให้ทันที!
    if (user && !user.role) {
      user.role = 'user'; 
      localStorage.setItem('user', JSON.stringify(user)); // อัปเดตข้อมูลที่เติม role ลงไปเลย
    }
  } catch (e) {
    localStorage.clear();
    return next('/login');
  }

  // --- ที่เหลือเหมือนเดิม ---
  if (to.meta.requiresAuth) {
    if (!token || !user) return next('/login');
    if (to.meta.role && user.role !== to.meta.role) return next(user.role === 'admin' ? '/admin' : '/user');
  }
  
  next();
})

export default router
