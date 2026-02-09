import { createRouter, createWebHistory } from 'vue-router'
import Home from '../pages/Home.vue'
import Login from '../pages/Login.vue'
import Register from '../pages/Register.vue'

// User Components
import UserLayout from '../pages/user/UserLayout.vue'
import Profile from '../pages/user/Profile.vue'
import Pets from '../pages/user/Pets.vue'
import AddPet from '../pages/user/Addpet.vue'

// Admin Components
import AdminLayout from '../pages/admin/AdminLayout.vue'
import AdminDashboard from '../pages/admin/Dashboard.vue'
import AdminUsers from '../pages/admin/Users.vue'

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
      { path: 'pets/add', component: AddPet }
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
      { path: 'users', component: AdminUsers}
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation Guard (แก้ไขแล้ว: ป้องกันจอขาว 100%)
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  let user = null
  
  try {
    const userStr = localStorage.getItem('user')
    user = userStr ? JSON.parse(userStr) : null
  } catch (e) {
    // ถ้าข้อมูล User พัง ให้เคลียร์ทิ้งเลย
    localStorage.clear()
    return next('/login')
  }

  // 1. เช็คว่าหน้านี้ต้องการ Login หรือไม่
  if (to.meta.requiresAuth) {
    // ถ้าไม่มี Token หรือ ไม่มีข้อมูล User หรือ User ไม่มี Role -> ไป Login ใหม่
    if (!token || !user || !user.role) {
      localStorage.clear()
      return next('/login')
    }
    
    // 2. เช็คสิทธิ์ (Role)
    if (to.meta.role && user.role !== to.meta.role) {
      // ถ้าเป็น Admin แต่จะเข้าหน้า User -> พาไปหน้า Admin
      if (user.role === 'admin') {
         if (to.path.startsWith('/admin')) return next() // ถ้ากำลังไปถูกทางแล้ว ให้ผ่าน
         return next('/admin')
      }
      
      // ถ้าเป็น User แต่จะเข้าหน้า Admin -> พาไปหน้า User
      if (user.role === 'user') {
         if (to.path.startsWith('/user')) return next() // ถ้ากำลังไปถูกทางแล้ว ให้ผ่าน
         return next('/user')
      }

      // ถ้า Role แปลกๆ (ไม่ใช่ admin/user) -> เคลียร์ทิ้งแล้วไป Login
      localStorage.clear()
      return next('/login')
    }
  }
  
  next()
})

export default router