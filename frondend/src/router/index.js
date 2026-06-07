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
import { comma } from 'postcss/lib/list'

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
        { path: 'receipts', component: Receipts }, // 📍 <--- เติมลูกน้ำ (,) ตรงนี้ครับ!
        { path: 'appointments', component: Appointments }
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
      { path: 'Appointments', component: AdminAppointments}
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