<template>
  <div class="portal-shell">
    <aside class="portal-sidebar">
      <div class="brand-panel">
        <div class="brand-mark-wrap">
          <div class="brand-mark">🐾</div>
        </div>
        <div class="brand-copy">
          <span class="brand-kicker">Pet care</span>
          <h1>Pet Clinic</h1>
          <p>พื้นที่สำหรับเจ้าของสัตว์เลี้ยง</p>
        </div>
      </div>

      <nav class="nav-list">
        <router-link to="/user/profile" class="nav-item" active-class="active">
          <span class="nav-icon">👤</span>
          <span>ข้อมูลส่วนตัว</span>
        </router-link>

        <router-link to="/user/pets" class="nav-item" :class="{ active: $route.path.startsWith('/user/pets') || $route.path.startsWith('/user/history/') }">
          <span class="nav-icon">🐶</span>
          <span>สัตว์เลี้ยงของฉัน</span>
        </router-link>

        <router-link to="/user/receipts" class="nav-item" :class="{ active: $route.path.startsWith('/user/receipts') }">
          <span class="nav-icon">🧾</span>
          <span>การชำระเงิน</span>
        </router-link>

        <router-link to="/user/appointments" class="nav-item" :class="{ active: $route.path.startsWith('/user/appointments') }">
          <span class="nav-icon">📅</span>
          <span>การนัดหมาย</span>
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <div class="footer-note">
          <span class="footer-dot"></span>
          <p>ดูแลข้อมูลสัตว์เลี้ยง นัดหมาย และการชำระเงินได้จากที่เดียว</p>
        </div>
        <button type="button" class="logout-btn" @click="logout">
          <span class="nav-icon">↩</span>
          <span>ออกจากระบบ</span>
        </button>
      </div>
    </aside>

    <main class="portal-content">
      <header class="content-header">
        <div>
          <p class="header-label">Owner portal</p>
          <h2>{{ pageTitle }}</h2>
        </div>
        <div class="header-chip">
          <span class="chip-dot"></span>
          <span>{{ currentUserName }}</span>
        </div>
      </header>

      <div class="content-shell">
        <router-view v-slot="{ Component }">
          <transition name="fade-page" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()

const titleMap = {
  '/user/profile': 'ข้อมูลส่วนตัว',
  '/user/pets': 'สัตว์เลี้ยงของฉัน',
  '/user/pets/add': 'เพิ่มสัตว์เลี้ยง',
  '/user/receipts': 'การชำระเงิน',
  '/user/appointments': 'การนัดหมาย'
}

const currentUserName = computed(() => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    return user.owner_name || user.username || 'ผู้ใช้งาน'
  } catch {
    return 'ผู้ใช้งาน'
  }
})

const pageTitle = computed(() => {
  if (route.path.startsWith('/user/history/')) return 'ประวัติการรักษา'
  return titleMap[route.path] || 'Owner Portal'
})

const logout = () => {
  if (!window.confirm('ต้องการออกจากระบบใช่หรือไม่?')) return
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  router.push('/')
}
</script>

<style scoped>
.portal-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 280px 1fr;
  background:
    radial-gradient(circle at top left, rgba(99, 102, 241, 0.08), transparent 26%),
    linear-gradient(180deg, #f8f8fc 0%, #f3f6fb 100%);
  font-family: Inter, sans-serif;
}

.portal-sidebar {
  padding: 22px 18px;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  gap: 14px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, rgba(248, 250, 252, 0.96) 100%);
}

.brand-panel,
.nav-list,
.sidebar-footer,
.content-header {
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(229, 231, 235, 0.92);
  border-radius: 14px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
}

.brand-panel {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 14px;
  padding: 18px 18px 20px;
}

.brand-mark-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: linear-gradient(135deg, #eef2ff, #f5f3ff);
}

.brand-mark {
  width: 50px;
  height: 50px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: #ffffff;
  font-size: 24px;
}

.brand-kicker {
  display: block;
  margin-bottom: 6px;
  color: #6b7280;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.brand-panel h1 {
  margin: 0;
  font-size: 24px;
  color: #111827;
  line-height: 1.1;
}

.brand-copy p {
  margin: 7px 0 0;
  color: #4b5563;
  font-size: 13px;
  line-height: 1.5;
}

.nav-list {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-item,
.logout-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 13px 14px;
  border-radius: 12px;
  text-decoration: none;
  color: #475569;
  font-size: 15px;
  font-weight: 600;
  transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.nav-item:hover,
.logout-btn:hover {
  background: #f8fafc;
  color: #111827;
}

.nav-item.active {
  background: linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%);
  color: #4338ca;
  box-shadow: inset 0 0 0 1px rgba(129, 140, 248, 0.22);
}

.nav-icon {
  width: 20px;
  text-align: center;
  line-height: 1;
}

.sidebar-footer {
  padding: 14px;
  margin-top: auto;
}

.footer-note {
  display: flex;
  gap: 10px;
  align-items: start;
  padding: 0 2px 14px;
  margin-bottom: 12px;
  border-bottom: 1px solid #eef2f7;
}

.footer-dot {
  width: 10px;
  height: 10px;
  margin-top: 4px;
  border-radius: 999px;
  background: #c4b5fd;
  flex: none;
}

.footer-note p {
  margin: 0;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.55;
}

.logout-btn {
  justify-content: center;
  border: 1px solid #ebeef3;
  background: #fafafa;
  cursor: pointer;
  color: #475569;
}

.portal-content {
  min-width: 0;
  padding: 24px 26px;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 18px 22px;
  margin-bottom: 20px;
}

.header-label {
  margin: 0 0 4px;
  color: #6b7280;
  font-size: 13px;
}

.content-header h2 {
  margin: 0;
  font-size: 26px;
  color: #111827;
}

.header-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border-radius: 999px;
  background: #f8fafc;
  color: #475569;
  font-size: 14px;
  font-weight: 600;
}

.chip-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #22c55e;
}

.content-shell {
  max-width: 1180px;
  margin: 0 auto;
}

.fade-page-enter-active,
.fade-page-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.fade-page-enter-from,
.fade-page-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@media (max-width: 980px) {
  .portal-shell {
    grid-template-columns: 1fr;
  }

  .portal-sidebar {
    padding-bottom: 0;
  }

  .portal-content {
    padding-top: 16px;
  }
}

@media (max-width: 720px) {
  .content-header {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
