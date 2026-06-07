<template>
  <div class="min-h-screen bg-gray-50 flex font-sans">
    
    <aside class="flex flex-col w-64 bg-white shadow-xl z-20 relative h-screen border-r border-gray-100">
      <div class="p-6 border-b border-gray-50 flex items-center gap-3">
        <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-blue-200">
          P
        </div>
        <div>
          <h2 class="text-lg font-extrabold text-gray-800 tracking-tight leading-tight">Pet Clinic</h2>
          <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Management System</p>
        </div>
      </div>

      <nav class="flex-1 p-6 space-y-2 overflow-y-auto custom-scrollbar">
        <router-link to="/user/profile" class="nav-item" active-class="active">
          <span class="text-xl icon">👤</span> 
          <span class="font-bold">ข้อมูลส่วนตัว</span>
        </router-link>

        <router-link to="/user/pets" class="nav-item" active-class="active" :class="{ 'active': $route.path.startsWith('/user/pets') }">
          <span class="text-xl icon">🐾</span> 
          <span class="font-bold">สัตว์เลี้ยงของฉัน</span>
        </router-link>

        <router-link to="/user/receipts" class="nav-item" active-class="active" :class="{ 'active': $route.path.startsWith('/user/receipts') }">
          <span class="text-xl icon">🧾</span> 
          <span class="font-bold">ประวัติการชำระเงิน</span>
        </router-link>

        <router-link to="/user/appointments" class="nav-item" active-class="active" :class="{ 'active': $route.path.startsWith('/user/appointments') }">
          <span class="text-xl icon">📅</span> 
          <span class="font-bold">การนัดหมาย</span>
        </router-link>
      </nav>

      <div class="p-6 border-t border-gray-100 bg-gray-50/50">
        <button @click="logout" class="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-white border border-gray-200 text-gray-500 font-bold shadow-sm hover:border-red-200 hover:text-red-500 hover:bg-red-50 transition-all duration-300">
          <span class="text-xl">🚪</span> 
          <span>ออกจากระบบ</span>
        </button>
      </div>
    </aside>

    <div class="flex-1 flex flex-col h-screen overflow-hidden relative">
      <main class="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-8">
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
/* ปุ่มเมนู */
.nav-item {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.85rem 1.1rem;
  border-radius: 12px;
  color: #64748b;
  transition: all 0.25s ease;
  text-decoration: none;
}
.nav-item:hover {
  background-color: #f1f5f9;
  color: #1e293b;
}

/* ปุ่ม Active จะดูเด่นและพรีเมียมขึ้น */
.nav-item.active {
  background-color: #eef2ff !important;
  color: #4f46e5 !important;
  box-shadow: inset 0 0 0 1px #e0e7ff;
}

.icon {
  transition: transform 0.2s;
}
.nav-item:hover .icon {
  transform: scale(1.1);
}

/* Transition */
.fade-page-enter-active, .fade-page-leave-active { transition: opacity 0.2s; }
.fade-page-enter-from, .fade-page-leave-to { opacity: 0; }

/* Scrollbar */
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
</style>