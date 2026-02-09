<template>
  <div class="min-h-screen bg-gray-100 flex font-sans">
    
    <aside class="hidden md:flex flex-col w-64 bg-slate-900 text-white shadow-xl z-20 relative">
      <div class="p-6 border-b border-gray-700 flex items-center gap-3">
        <div class="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-emerald-900/50">
          
        </div>
        <div>
          <h2 class="text-lg font-extrabold tracking-wide">Admin Panel</h2>
          <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wider">System Control</p>
        </div>
      </div>

      <nav class="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
        <router-link
          to="/admin/dashboard"
          class="nav-item"
          active-class="active"
        >
          <span class="text-xl">📊</span> 
          <span class="font-bold">Dashboard</span>
        </router-link>

        </nav>

      <div class="p-6 border-t border-gray-700 bg-slate-800/50">
        <button
          @click="logout"
          class="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-red-600 text-white font-bold shadow-lg hover:bg-red-500 hover:shadow-red-500/30 hover:-translate-y-1 transition-all duration-200"
        >
          <span class="text-xl">🚪</span> 
          <span class="text-lg">ออกจากระบบ</span>
        </button>
      </div>
    </aside>

    <div class="flex-1 flex flex-col h-screen overflow-hidden relative">
      
      <header class="bg-white shadow-sm p-4 flex items-center justify-between md:hidden z-30 sticky top-0">
        <div class="flex items-center gap-3">
           <div class="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-bold shadow-md">
             
           </div>
           <h1 class="font-extrabold text-gray-800 text-lg">Admin Panel</h1>
        </div>

        <button 
          @click="logout" 
          class="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition font-bold text-sm"
        >
          🚪 ออกระบบ
        </button>
      </header>

      <main class="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6 relative w-full">
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
  if(confirm("ต้องการออกจากระบบผู้ดูแลหรือไม่?")) {
    localStorage.clear() // ล้างข้อมูลทั้งหมด (Token, User)
    router.push('/login') // กลับไปหน้า Login
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
  border-radius: 0.75rem;
  color: #94a3b8; /* slate-400 */
  transition: all 0.2s;
  text-decoration: none;
  margin-bottom: 0.5rem;
}

.nav-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
  transform: translateX(4px);
}

.nav-item.active {
  background: linear-gradient(to right, #10b981, #059669); /* Emerald Gradient */
  color: white;
  box-shadow: 0 4px 15px -3px rgba(16, 185, 129, 0.4);
}

/* Page Transition */
.fade-page-enter-active,
.fade-page-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-page-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.fade-page-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>