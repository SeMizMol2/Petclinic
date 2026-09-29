<template>
  <div class="workspace-shell user-theme">
    <aside class="workspace-sidebar user-sidebar">
      <div class="workspace-brand user-brand">
        <div class="brand-badge user-brand-badge">
          <AppIcon name="paw" :size="28" />
        </div>
        <div class="brand-copy">
          <span class="brand-kicker">Owner Portal</span>
          <h1>โรงพยาบาลสัตว์เมืองเลย</h1>
        </div>
      </div>

      <button
        type="button"
        class="mobile-menu-button"
        :aria-expanded="isMobileMenuOpen"
        @click="isMobileMenuOpen = !isMobileMenuOpen"
      >
        <span>{{ isMobileMenuOpen ? 'ซ่อนเมนู' : 'เมนู' }}</span>
        <span class="menu-count">4</span>
      </button>

      <nav class="workspace-nav" :class="{ open: isMobileMenuOpen }">
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
            <small>ขอนัดหมายและติดตามสถานะจากคลินิก</small>
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
          <button type="button" class="header-logout-button" aria-label="ออกจากระบบ" @click="logout">
            <AppIcon name="logout" :size="16" />
            <span>ออกจากระบบ</span>
          </button>
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
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '../../components/AppIcon.vue'

const router = useRouter()
const route = useRoute()
const isMobileMenuOpen = ref(false)

const titleMap = {
  '/user/profile': ['ข้อมูลส่วนตัว', 'จัดการรูปโปรไฟล์ ข้อมูลติดต่อ และรายละเอียดเจ้าของสัตว์เลี้ยง'],
  '/user/pets': ['สัตว์เลี้ยงของฉัน', 'ดูข้อมูลสัตว์เลี้ยงแต่ละตัวและเปิดดูประวัติการรักษา'],
  '/user/pets/add': ['เพิ่มสัตว์เลี้ยง', 'กรอกข้อมูลสัตว์เลี้ยงตัวใหม่เพื่อเริ่มต้นใช้งานระบบ'],
  '/user/receipts': ['ค่าใช้จ่ายและการชำระเงิน', 'ตรวจสอบค่าใช้จ่ายและสถานะการชำระกับคลินิก'],
  '/user/appointments': ['การนัดหมายของฉัน', 'ขอนัดหมาย ตรวจสอบสถานะ และดูประวัตินัดหมายของสัตว์เลี้ยง']
}

const readSessionUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}')
  } catch {
    return {}
  }
}
const sessionUser = ref(readSessionUser())
const refreshSessionUser = () => { sessionUser.value = readSessionUser() }
const currentUserName = computed(() => sessionUser.value.owner_name || sessionUser.value.username || 'ผู้ใช้งาน')
onMounted(() => window.addEventListener('petclinic:profile-updated', refreshSessionUser))
onUnmounted(() => window.removeEventListener('petclinic:profile-updated', refreshSessionUser))

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

watch(
  () => route.fullPath,
  () => {
    isMobileMenuOpen.value = false
  }
)
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

.workspace-nav {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mobile-menu-button {
  display: none;
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

  .workspace-sidebar {
    position: sticky;
    top: 0;
    z-index: 30;
    padding: 14px;
    border-right: 0;
    border-bottom: 1px solid rgba(15, 23, 42, 0.08);
    background: rgba(248, 250, 252, 0.98);
    backdrop-filter: blur(14px);
  }

  .workspace-nav {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    overflow: visible;
    padding: 8px;
  }

  .nav-link {
    width: 100%;
    min-width: 0;
    background: #ffffff;
    border: 1px solid rgba(217, 226, 236, 0.88);
  }

  .workspace-footer {
    display: none;
  }
}

@media (max-width: 760px) {
  .mobile-menu-button {
    min-height: 46px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 0 14px;
    border: 1px solid rgba(217, 226, 236, 0.94);
    border-radius: 16px;
    background: #ffffff;
    color: #0f172a;
    font: inherit;
    font-weight: 800;
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
  }

  .menu-count {
    min-width: 30px;
    min-height: 30px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: #ecfdf5;
    color: #0f766e;
    font-size: 12px;
  }

  .workspace-nav {
    display: none;
  }

  .workspace-nav.open {
    display: grid;
  }

  .workspace-brand {
    padding: 14px;
    border-radius: 16px;
  }

  .brand-badge {
    width: 46px;
    height: 46px;
    border-radius: 14px;
  }

  .brand-copy h1 {
    font-size: 1.08rem;
  }

.nav-text small,
.workspace-label {
    display: none;
  }

  .nav-link {
    padding: 10px 12px;
  }

  .nav-icon-wrap {
    width: 34px;
    height: 34px;
  }

  .workspace-main {
    padding: 16px;
  }

  .workspace-header {
    flex-direction: column;
    align-items: stretch;
  }

  .workspace-user {
    justify-content: space-between;
    width: 100%;
    border-radius: 16px;
  }
}

@media (max-width: 420px) {
  .workspace-nav {
    grid-template-columns: 1fr;
  }
}
</style>

<style scoped>
/* Clinical Calm workspace layer */
.workspace-shell {
  grid-template-columns: 284px minmax(0, 1fr);
  background: var(--pc-surface-alt);
}

.workspace-sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  padding: 22px 16px;
  gap: 18px;
  border-right: 0;
  background: var(--pc-navy);
}

.workspace-brand,
.workspace-nav,
.workspace-footer {
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}

.workspace-brand {
  grid-template-columns: 44px 1fr;
  gap: 12px;
  padding: 4px 6px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.11);
}

.brand-badge {
  width: 44px;
  height: 44px;
  border-radius: 12px;
}

.user-brand-badge {
  background: var(--pc-primary);
}

.brand-kicker {
  margin-bottom: 2px;
  color: #8dd8cf;
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: none;
}

.brand-copy h1 {
  color: #fff;
  font-size: 16px;
  line-height: 1.35;
}

.workspace-nav {
  padding: 0;
  gap: 5px;
}

.nav-link,
.logout-button {
  min-height: 52px;
  padding: 9px 10px;
  border-radius: 10px;
  color: #cbd8df;
}

.nav-link:hover,
.logout-button:hover {
  background: rgba(255, 255, 255, 0.075);
  color: #fff;
}

.nav-link.active {
  background: var(--pc-primary);
  color: #fff;
  box-shadow: none;
}

.nav-icon-wrap,
.nav-link.active .nav-icon-wrap {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
}

.nav-link.active .nav-icon-wrap {
  background: rgba(255, 255, 255, 0.15);
}

.nav-text strong {
  font-size: 13.5px;
}

.nav-text small {
  color: #8ea5b2;
  font-size: 10.5px;
}

.nav-link.active .nav-text small {
  color: #d4f5f0;
}

.workspace-footer {
  padding: 14px 6px 0;
  margin-top: auto;
  border-top: 1px solid rgba(255, 255, 255, 0.11);
}

.workspace-note {
  display: none;
}

.logout-button {
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: transparent;
}

.workspace-main {
  padding: 22px 26px 40px;
}

.workspace-header {
  position: sticky;
  top: 0;
  z-index: 20;
  padding: 14px 0 16px;
  margin-bottom: 18px;
  border: 0;
  border-bottom: 1px solid var(--pc-border);
  border-radius: 0;
  background: rgba(243, 246, 248, 0.94);
  box-shadow: none;
  backdrop-filter: blur(12px);
}

.workspace-label {
  margin-bottom: 3px;
  color: var(--pc-primary);
  font-size: 11px;
  letter-spacing: 0.02em;
  text-transform: none;
}

.workspace-header h2 {
  font-size: 24px;
}

.workspace-subtitle {
  margin-top: 5px;
  color: var(--pc-text-sub);
  font-size: 13px;
}

.workspace-user {
  padding: 6px 6px 6px 12px;
  border: 1px solid var(--pc-border);
  border-radius: 10px;
  background: #fff;
}

.header-logout-button {
  min-height: 34px;
  padding-inline: 10px;
  border-radius: 8px;
  box-shadow: none;
}

.user-content {
  max-width: 1320px;
}

@media (max-width: 1024px) {
  .workspace-shell {
    grid-template-columns: 1fr;
  }

  .workspace-sidebar {
    position: sticky;
    height: auto;
    overflow: visible;
    padding: 12px 16px;
    border-bottom: 0;
    background: var(--pc-navy);
    backdrop-filter: none;
  }

  .workspace-brand {
    padding-bottom: 10px;
  }

  .workspace-nav {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 7px;
    padding: 0;
  }

  .nav-link {
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.04);
  }
}

@media (max-width: 760px) {
  .mobile-menu-button {
    min-height: 42px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.07);
    color: #fff;
    box-shadow: none;
  }

  .menu-count {
    background: rgba(20, 184, 166, 0.2);
    color: #c7f4ed;
  }

  .workspace-main {
    padding: 0 14px 28px;
  }

  .workspace-header {
    padding: 14px 0;
  }

  .workspace-user {
    border-radius: 10px;
  }
}

@media (max-width: 480px) {
  .workspace-nav.open {
    grid-template-columns: 1fr;
  }
}
</style>
