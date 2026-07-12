<template>
  <div class="workspace-shell user-theme">
    <aside class="workspace-sidebar user-sidebar">
      <div class="workspace-brand user-brand">
        <div class="brand-badge user-brand-badge">
          <AppIcon name="paw" :size="28" />
        </div>
        <div class="brand-copy">
          <span class="brand-kicker">Owner Portal</span>
          <h1>Pet Clinic</h1>
          <p>พื้นที่สำหรับเจ้าของสัตว์เลี้ยงเพื่อติดตามข้อมูลส่วนตัว สัตว์เลี้ยง นัดหมาย และใบเสร็จ</p>
        </div>
      </div>

      <nav class="workspace-nav">
        <router-link to="/user/profile" class="nav-link" active-class="active">
          <span class="nav-icon-wrap"><AppIcon name="user" :size="18" /></span>
          <span class="nav-text">
            <strong>ข้อมูลส่วนตัว</strong>
            <small>รายละเอียดเจ้าของสัตว์และข้อมูลติดต่อ</small>
          </span>
        </router-link>

        <router-link
          to="/user/pets"
          class="nav-link"
          :class="{ active: $route.path.startsWith('/user/pets') || $route.path.startsWith('/user/history/') }"
        >
          <span class="nav-icon-wrap"><AppIcon name="paw" :size="18" /></span>
          <span class="nav-text">
            <strong>สัตว์เลี้ยงของฉัน</strong>
            <small>ข้อมูลสัตว์เลี้ยง ประวัติรักษา และข้อมูลแพ้ยา</small>
          </span>
        </router-link>

        <router-link to="/user/appointments" class="nav-link" :class="{ active: $route.path.startsWith('/user/appointments') }">
          <span class="nav-icon-wrap"><AppIcon name="calendar" :size="18" /></span>
          <span class="nav-text">
            <strong>การนัดหมาย</strong>
            <small>ติดตามคิวที่จองไว้และสถานะการนัดหมาย</small>
          </span>
        </router-link>

        <router-link to="/user/receipts" class="nav-link" :class="{ active: $route.path.startsWith('/user/receipts') }">
          <span class="nav-icon-wrap"><AppIcon name="receipt" :size="18" /></span>
          <span class="nav-text">
            <strong>การชำระเงิน</strong>
            <small>ดูใบเสร็จ ยอดชำระ และสถานะการชำระเงิน</small>
          </span>
        </router-link>
      </nav>

      <div class="workspace-footer">
        <div class="workspace-note">
          <span class="note-dot"></span>
          <p>ดูข้อมูลสัตว์เลี้ยง นัดหมาย และการชำระเงินได้จากเมนูหลักเดียวกัน</p>
        </div>
        <button type="button" class="logout-button" @click="logout">
          <AppIcon name="logout" :size="18" />
          <span>ออกจากระบบ</span>
        </button>
      </div>
    </aside>

    <main class="workspace-main">
      <header class="workspace-header">
        <div>
          <p class="workspace-label">Pet Owner Space</p>
          <h2>{{ pageTitle }}</h2>
          <p class="workspace-subtitle">{{ pageSubtitle }}</p>
        </div>
        <div class="workspace-user">
          <span class="user-dot"></span>
          <span>{{ currentUserName }}</span>
        </div>
      </header>

      <div class="workspace-content user-content">
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
import AppIcon from '../../components/AppIcon.vue'

const router = useRouter()
const route = useRoute()

const titleMap = {
  '/user/profile': ['ข้อมูลส่วนตัว', 'จัดการรูปโปรไฟล์ ข้อมูลติดต่อ และรายละเอียดเจ้าของสัตว์เลี้ยง'],
  '/user/pets': ['สัตว์เลี้ยงของฉัน', 'ดูข้อมูลสัตว์เลี้ยงแต่ละตัวและเปิดดูประวัติการรักษา'],
  '/user/pets/add': ['เพิ่มสัตว์เลี้ยง', 'กรอกข้อมูลสัตว์เลี้ยงตัวใหม่เพื่อเริ่มต้นใช้งานระบบ'],
  '/user/receipts': ['การชำระเงิน', 'ติดตามใบเสร็จ ยอดค่าใช้จ่าย และสถานะการชำระเงิน'],
  '/user/appointments': ['การนัดหมาย', 'ตรวจสอบวันเวลาและสถานะของคิวที่จองไว้']
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
  return titleMap[route.path]?.[0] || 'Owner Portal'
})

const pageSubtitle = computed(() => {
  if (route.path.startsWith('/user/history/')) {
    return 'ดูข้อมูลการรักษาแบบเรียงตามเวลาเพื่อทบทวนการดูแลสัตว์เลี้ยง'
  }
  return titleMap[route.path]?.[1] || 'พื้นที่สำหรับเจ้าของสัตว์เลี้ยง'
})

const logout = () => {
  if (!window.confirm('ต้องการออกจากระบบใช่หรือไม่?')) return
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  router.push('/')
}
</script>

<style scoped>
.workspace-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 310px minmax(0, 1fr);
  background:
    radial-gradient(circle at top left, rgba(20, 184, 166, 0.12), transparent 30%),
    linear-gradient(180deg, #f5f8fb 0%, #eff6f9 100%);
}

.workspace-sidebar {
  padding: 22px 18px;
  border-right: 1px solid rgba(15, 23, 42, 0.06);
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: #f9fcfe;
}

.workspace-brand,
.workspace-nav,
.workspace-footer,
.workspace-header {
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(217, 226, 236, 0.88);
  border-radius: 18px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
}

.workspace-brand {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 14px;
  padding: 18px;
  align-items: center;
}

.brand-badge {
  width: 58px;
  height: 58px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
}

.user-brand-badge {
  background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);
}

.brand-kicker,
.workspace-label {
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.brand-kicker {
  display: block;
  margin-bottom: 6px;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.brand-copy h1 {
  margin: 0;
  color: #0f172a;
  font-size: 24px;
  line-height: 1.1;
}

.brand-copy p {
  margin: 8px 0 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.6;
}

.workspace-nav {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-link,
.logout-button {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 13px;
  border-radius: 14px;
  color: #334155;
  text-decoration: none;
  transition: background 0.18s ease, color 0.18s ease;
}

.nav-link:hover,
.logout-button:hover {
  background: #f3faf9;
  color: #0f172a;
}

.nav-link.active {
  background: linear-gradient(135deg, #ecfdf5 0%, #f0fdfa 100%);
  color: #0f766e;
  box-shadow: inset 0 0 0 1px rgba(20, 184, 166, 0.15);
}

.nav-icon-wrap {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  flex: none;
}

.nav-link.active .nav-icon-wrap {
  background: #ffffff;
}

.nav-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.nav-text strong {
  font-size: 14px;
  line-height: 1.3;
}

.nav-text small {
  color: #64748b;
  font-size: 11.5px;
  line-height: 1.45;
}

.workspace-footer {
  padding: 14px;
  margin-top: auto;
}

.workspace-note {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding-bottom: 14px;
  margin-bottom: 14px;
  border-bottom: 1px solid #edf2f7;
}

.note-dot,
.user-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  flex: none;
}

.note-dot {
  margin-top: 5px;
  background: #14b8a6;
}

.workspace-note p {
  margin: 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.55;
}

.logout-button {
  justify-content: center;
  border: 1px solid #d9e2ec;
  background: #f8fafc;
  color: #475569;
  font: inherit;
  font-weight: 700;
}

.workspace-main {
  min-width: 0;
  padding: 24px 28px;
}

.workspace-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 18px 22px;
  margin-bottom: 20px;
}

.workspace-label {
  margin: 0 0 4px;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.workspace-header h2 {
  margin: 0;
  color: #0f172a;
  font-size: 28px;
  line-height: 1.1;
}

.workspace-subtitle {
  margin: 8px 0 0;
  color: #64748b;
  font-size: 14px;
  line-height: 1.6;
}

.workspace-user {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 999px;
  background: #f8fafc;
  color: #334155;
  font-size: 14px;
  font-weight: 700;
}

.user-dot {
  background: #22c55e;
}

.user-content {
  max-width: 1240px;
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

@media (max-width: 1024px) {
  .workspace-shell {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .workspace-main {
    padding: 16px;
  }

  .workspace-header {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
