<template>
  <div class="min-h-screen bg-slate-50 flex font-sans overflow-hidden">
    
    <aside class="flex flex-col w-72 bg-white shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20 relative h-screen border-r border-slate-100">
      
      <div class="h-24 px-8 border-b border-slate-100 flex items-center gap-4">
        <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30 transform hover:scale-105 transition-all duration-300 text-2xl">
          🏥
        </div>
        <div>
          <h2 class="text-xl font-extrabold text-slate-800 tracking-tight leading-none">Pet Clinic<span class="text-blue-600">.</span></h2>
          <p class="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-1">Client Portal</p>
        </div>
      </div>

      <nav class="flex-1 px-5 py-8 space-y-2 overflow-y-auto custom-scrollbar">
        <p class="px-3 text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">เมนูหลัก</p>

        <router-link to="/user/profile" class="nav-item" active-class="active">
          <span class="text-xl icon">👤</span>
          <span class="font-bold">ข้อมูลส่วนตัว</span>
        </router-link>

        <router-link to="/user/pets" class="nav-item" active-class="active" :class="{ 'active': $route.path.startsWith('/user/pets') }">
          <span class="text-xl icon">🐾</span>
          <span class="font-bold">สัตว์เลี้ยงของฉัน</span>
        </router-link>

        <router-link to="/user/appointments" class="nav-item" active-class="active" :class="{ 'active': $route.path.startsWith('/user/appointments') }">
          <span class="text-xl icon">📅</span>
          <span class="font-bold">การนัดหมาย</span>
        </router-link>

        <router-link to="/user/receipts" class="nav-item" active-class="active" :class="{ 'active': $route.path.startsWith('/user/receipts') }">
          <span class="text-xl icon">🧾</span>
          <span class="font-bold">ประวัติการรักษา / ชำระเงิน</span>
        </router-link>
      </nav>

      <div class="p-6 border-t border-slate-100 bg-slate-50/50">
        <button @click="logout" class="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-white text-rose-500 border border-slate-200 font-bold shadow-sm hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all duration-200 group">
          <span class="text-xl group-hover:-translate-x-1 transition-transform">🚪</span>
          <span>ออกจากระบบ</span>
        </button>
      </div>
    </aside>

    <div class="flex-1 flex flex-col h-screen overflow-hidden relative">
      
      
      <main class="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 p-6 md:p-8 relative w-full">
        <div class="max-w-6xl mx-auto pb-10">
          <router-view v-slot="{ Component }">
            <transition name="fade-page" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </div>
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
  gap: 0.875rem;
  padding: 0.875rem 1.25rem;
  border-radius: 0.875rem;
  color: #64748b;
  transition: all 0.2s ease;
  margin-bottom: 0.5rem;
  font-size: 0.95rem;
}
.nav-item:hover {
  background-color: #f8fafc;
  color: #1e293b;
}
.nav-item.active {
  background: linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%);
  color: #2563eb;
  box-shadow: 0 4px 15px -3px rgba(37, 99, 235, 0.1);
}
.nav-item .icon {
  transition: transform 0.2s;
  opacity: 0.8;
}
.nav-item:hover .icon {
  opacity: 1;
}
.nav-item.active .icon {
  transform: scale(1.1);
  opacity: 1;
}

/* Page Transition */
.fade-page-enter-active,
.fade-page-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.fade-page-enter-from {
  opacity: 0;
  transform: translateY(15px);
}
.fade-page-leave-to {
  opacity: 0;
  transform: translateY(-15px);
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
.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  background: #94a3b8;
}
</style>