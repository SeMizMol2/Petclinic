import { createRouter, createWebHistory } from 'vue-router'

import Home from '../pages/Home.vue'
import Login from '../pages/Login.vue'

import UserLayout from '../pages/user/UserLayout.vue'
import Profile from '../pages/user/Profile.vue'
import Pets from '../pages/user/Pets.vue'
import Register from '../pages/Register.vue'
import Addpet from '../pages/user/Addpet.vue'

const routes = [
  { path: '/', component: Home },
  { path: '/login', component: Login },

  {
    path: '/user',
    component: UserLayout,
    children: [
      { path: '',redirect: '/user/profile'}, 
      { path: 'profile', component: Profile },
      { path: 'pets', component: Pets },
      { path: 'pets/add', component: Addpet},
    ]
  },
  {
    path: "/register",
    name: "Register",
    component: Register,
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
