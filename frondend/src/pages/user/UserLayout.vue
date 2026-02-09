<template>
  <div class="min-h-screen bg-gray-50 flex font-sans">
    
    <aside class="hidden md:flex flex-col w-64 bg-white shadow-xl z-20 relative">
      <div class="p-6 border-b border-gray-100 flex items-center gap-3">
        <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-blue-200 transform hover:scale-105 transition-transform duration-300">
          P
        </div>
        <div>
          <h2 class="text-lg font-extrabold text-gray-800 tracking-tight leading-tight">Pet Clinic</h2>
          <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Management System</p>
        </div>
      </div>

      <nav class="flex-1 p-6 space-y-3 overflow-y-auto custom-scrollbar">
        <router-link
          to="/user/profile"
          class="nav-item"
          active-class="active"
        >
          <span class="text-xl icon">👤</span> 
          <span class="font-bold">ข้อมูลส่วนตัว</span>
        </router-link>

        <router-link
          to="/user/pets"
          class="nav-item"
          active-class="active"
          :class="{ 'active': $route.path.startsWith('/user/pets') }"
        >
          <span class="text-xl icon">🐾</span> 
          <span class="font-bold">สัตว์เลี้ยงของฉัน</span>
        </router-link>
      </nav>

      <div class="p-8 border-t border-gray-100 bg-gray-50/50">
        <button
          @click="logout"
          class="w-full flex items-center justify-center gap-3 py-5 rounded-2xl bg-white text-[#5a72ea] font-bold shadow-[0_4px_6px_rgba(0,0,0,0.08)] hover:shadow-[0_10px_15px_rgba(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-200"
        >
          <span class="text-2xl">🚪</span> 
          <span class="text-xl">ออกจากระบบ</span>
        </button>
      </div>
    </aside>

    <div class="flex-1 flex flex-col h-screen overflow-hidden relative">
      
      <header class="bg-white/90 backdrop-blur-md shadow-sm p-6 flex items-center justify-between md:hidden z-30 sticky top-0">
        <div class="flex items-center gap-3">
           <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-md shadow-blue-200">
             
           </div>
           <h1 class="font-extrabold text-gray-800 tracking-tight text-lg">Pet Clinic</h1>
        </div>

        <button 
          @click="logout" 
          class="flex items-center gap-2 px-5 py-3 bg-white text-[#5a72ea] rounded-xl font-bold text-base shadow-[0_2px_4px_rgba(0,0,0,0.08)] hover:shadow-[0_6px_10px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 transition-all duration-200"
        >
          <span class="text-lg">🚪</span> ออกจากระบบ
        </button>
      </header>

      <main class="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 relative w-full">
        <router-view v-slot="{ Component }">
          <transition name="fade-page" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>

    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const logout = () => {
  if(confirm("ต้องการออกจากระบบใช่หรือไม่?")) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/')
  }
}
</script>

<style scoped>
/* Sidebar Link Style */
.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.2rem;
  border-radius: 1rem;
  color: #64748b; /* slate-500 */
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  margin-bottom: 0.5rem;
}
.nav-item:hover {
  background-color: #f8fafc;
  color: #1e293b;
  transform: translateX(4px);
}
.nav-item.active {
  background: linear-gradient(to right, #eff6ff, #fff);
  color: #2563eb;
  box-shadow: 0 4px 15px -3px rgba(37, 99, 235, 0.15);
  border-right: 4px solid #2563eb;
}
.nav-item .icon {
  transition: transform 0.2s;
}
.nav-item.active .icon {
  transform: scale(1.1);
}

/* Page Transition */
.fade-page-enter-active,
.fade-page-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.fade-page-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.fade-page-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Scrollbar Sidebar */
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}
</style>