<template>
  <div class="h-screen w-full flex bg-slate-50 font-sans overflow-hidden">
    
    <aside class="w-72 bg-slate-900 text-white flex flex-col shadow-2xl z-20">
      
      <div class="p-6 border-b border-slate-800 flex items-center gap-4">
        <div class="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-2xl shadow-lg shadow-emerald-900/50">
          
        </div>
        <div>
          <h2 class="text-xl font-bold tracking-tight">Clinic Admin</h2>
        </div>
      </div>

      <nav class="flex-1 px-4 py-8 space-y-2 overflow-y-auto custom-scrollbar">
        <p class="px-4 text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Menu</p>
        
        <router-link to="/admin/dashboard" class="nav-item" active-class="active">
          <span class="icon">📊</span>
          <span class="label">Dashboard</span>
        </router-link>

        <router-link to="/admin/users" class="nav-item" active-class="active">
          <span class="icon">👥</span>
          <span class="label">จัดการสมาชิก</span>
        </router-link>

        <router-link to="/admin/appointments" class="nav-item" active-class="active">
          <span class="icon">📅</span>
          <span class="label">การนัดหมาย</span>
        </router-link>

        <router-link to="/admin/services" class="nav-item" active-class="active">
          <span class="icon">📋</span>
          <span class="label">บริการและค่ารักษา</span>
        </router-link>
        <router-link to="/admin/treatments" class="nav-item" active-class="active">
          <span class="icon">🩺</span>
          <span class="label">การรักษา</span>
        </router-link>

        <router-link to="/admin/expenses" class="nav-item" active-class="active">
          <span class="icon">💸</span>
          <span class="label">รายจ่ายคลินิก</span>
        </router-link>

      </nav>
        

      <div class="p-6 border-t border-slate-800">
        <button @click="logout" class="logout-btn">
          <span>🚪</span>
          <span>ออกจากระบบ</span>
        </button>
      </div>
    </aside>

    <div class="flex-1 flex flex-col min-w-0">
      
      

      <main class="flex-1 overflow-y-auto bg-slate-50 p-8">
        <div class="max-w-6xl mx-auto">
          <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
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
  if(confirm("คุณต้องการออกจากระบบใช่หรือไม่?")) {
    localStorage.clear()
    router.push('/login')
  }
}
</script>

<style scoped>
/* ลบ Padding ส่วนเกินที่อาจค้างมาจากโค้ดเก่า */
.h-screen {
  height: 100vh;
}

/* พื้นฐานของเมนู Sidebar */
.nav-item {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  color: #94a3b8;
  text-decoration: none;
  transition: all 0.2s ease;
  font-weight: 500;
  font-size: 0.95rem;
}

.nav-item .icon {
  color: #64748b;
  transition: color 0.2s ease;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.04);
  color: #f8fafc;
}

.nav-item:hover .icon {
  color: #cbd5e1;
}

/* สไตล์เมื่อเมนูถูกเลือก (Active) */
.nav-item.active {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  font-weight: 600;
  box-shadow: 0 4px 12px -3px rgba(16, 185, 129, 0.3);
}

.nav-item.active .icon {
  color: white;
}

/* ปุ่ม Logout */
.logout-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: transparent;
  color: #ef4444;
  border: 1px solid #334155;
  border-radius: 0.75rem;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
}

.logout-btn:hover {
  background: #ef4444;
  color: white;
  border-color: #ef4444;
  box-shadow: 0 4px 12px -3px rgba(239, 68, 68, 0.4);
}

/* Scrollbar แบบบางๆ เนียนตา */
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #334155;
  border-radius: 10px;
}
.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  background: #475569;
}

/* แอนิเมชันตอนเปลี่ยนหน้า */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.fade-enter-from {
  opacity: 0;
  transform: translateY(15px);
}
.fade-leave-to {
  opacity: 0;
  transform: translateY(-15px);
}
</style>