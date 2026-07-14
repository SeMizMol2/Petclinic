<template>
  <div class="workspace-shell admin-theme">
    <aside class="workspace-sidebar">
      <div class="workspace-brand">
        <div class="brand-badge">PC</div>
        <div class="brand-copy">
          <span class="brand-kicker">Clinic Admin</span>
          <h1>โรงพยาบาลสัตว์เมืองเลย</h1>
          <p>พื้นที่จัดการข้อมูลลูกค้า สัตว์เลี้ยง การรักษา การเงิน และงานประจำของคลินิกในมุมมองเดียว</p>
        </div>
      </div>

      <button
        type="button"
        class="mobile-menu-button"
        :aria-expanded="isMobileMenuOpen"
        @click="isMobileMenuOpen = !isMobileMenuOpen"
      >
        <span>{{ isMobileMenuOpen ? 'ซ่อนเมนู' : 'เมนู' }}</span>
        <span class="menu-count">{{ navItemCount }}</span>
      </button>

      <nav class="workspace-nav" :class="{ open: isMobileMenuOpen }">
        <section class="nav-group">
          <p class="nav-title">Overview</p>
          <router-link v-for="item in overviewItems" :key="item.to" :to="item.to" class="nav-link" active-class="active">
            <span class="nav-icon-wrap"><AppIcon :name="item.icon" :size="18" /></span>
            <span class="nav-text">
              <strong>{{ item.label }}</strong>
              <small>{{ item.description }}</small>
            </span>
          </router-link>
        </section>

        <section class="nav-group">
          <p class="nav-title">Master Data</p>
          <router-link v-for="item in masterItems" :key="item.to" :to="item.to" class="nav-link" active-class="active">
            <span class="nav-icon-wrap"><AppIcon :name="item.icon" :size="18" /></span>
            <span class="nav-text">
              <strong>{{ item.label }}</strong>
              <small>{{ item.description }}</small>
            </span>
          </router-link>
        </section>

        <section class="nav-group">
          <p class="nav-title">Operations</p>
          <router-link v-for="item in operationsItems" :key="item.to" :to="item.to" class="nav-link" active-class="active">
            <span class="nav-icon-wrap"><AppIcon :name="item.icon" :size="18" /></span>
            <span class="nav-text">
              <strong>{{ item.label }}</strong>
              <small>{{ item.description }}</small>
            </span>
          </router-link>
        </section>
      </nav>

      <div class="workspace-footer">
        <div class="workspace-note">
          <span class="note-dot"></span>
          <p>ตรวจสอบคิวนัด งานรักษา การเงิน และฐานข้อมูลเจ้าของสัตว์ได้จากพื้นที่เดียว</p>
        </div>
        <button @click="logout" type="button" class="logout-button">
          <AppIcon name="logout" :size="18" />
          <span>ออกจากระบบ</span>
        </button>
      </div>
    </aside>

    <main class="workspace-main">
      <header class="workspace-header">
        <div>
          <p class="workspace-label">Clinic Workspace</p>
          <h2>{{ pageTitle }}</h2>
          <p class="workspace-subtitle">{{ pageSubtitle }}</p>
        </div>
        <div class="workspace-user">
          <span class="user-dot"></span>
          <span>{{ currentUserName }}</span>
          <button @click="logout" type="button" class="header-logout-button" aria-label="ออกจากระบบ">
            <AppIcon name="logout" :size="16" />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </header>

      <div class="workspace-content">
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
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '../../components/AppIcon.vue'

const route = useRoute()
const router = useRouter()
const isMobileMenuOpen = ref(false)

const overviewItems = [
  { to: '/admin/dashboard', icon: 'dashboard', label: 'Dashboard', description: 'ภาพรวมรายได้ รายจ่าย และปริมาณงาน' },
  { to: '/admin/reports', icon: 'reports', label: 'Reports', description: 'สรุปผลการดำเนินงานและตัวเลขสำคัญ' }
]

const masterItems = [
  { to: '/admin/users', icon: 'users', label: 'สมาชิก', description: 'จัดการบัญชีผู้ใช้งานและสิทธิ์' },
  { to: '/admin/owners', icon: 'user', label: 'เจ้าของสัตว์', description: 'ข้อมูลลูกค้าและช่องทางติดต่อ' },
  { to: '/admin/pets', icon: 'paw', label: 'สัตว์เลี้ยง', description: 'ข้อมูลสัตว์เลี้ยงทั้งหมดในระบบ' },
  { to: '/admin/veterinarians', icon: 'stethoscope', label: 'สัตวแพทย์', description: 'ทีมแพทย์และผู้ดูแลการรักษา' },
  { to: '/admin/clinic', icon: 'clinic', label: 'ข้อมูลคลินิก', description: 'เบอร์ติดต่อ อีเมล และรายละเอียดคลินิก' }
]

const operationsItems = [
  { to: '/admin/appointments', icon: 'calendar', label: 'การนัดหมาย', description: 'จัดคิวเข้ารับบริการและติดตามสถานะ' },
  { to: '/admin/services', icon: 'services', label: 'บริการและราคา', description: 'รายการรักษาและค่าบริการมาตรฐาน' },
  { to: '/admin/treatments', icon: 'treatment', label: 'การรักษา', description: 'บันทึกอาการ วินิจฉัย และค่ารักษา' },
  { to: '/admin/surgeries', icon: 'surgery', label: 'การผ่าตัด', description: 'ติดตามเคสผ่าตัดและสัตวแพทย์ผู้ดูแล' },
  { to: '/admin/vaccines', icon: 'vaccine', label: 'วัคซีน', description: 'ประวัติการฉีดและการติดตามครั้งถัดไป' },
  { to: '/admin/receipts', icon: 'receipt', label: 'ใบเสร็จรับเงิน', description: 'ออกบิล ติดตามการชำระ และพิมพ์เอกสาร' },
  { to: '/admin/expenses', icon: 'expense', label: 'รายจ่ายคลินิก', description: 'ต้นทุนและค่าใช้จ่ายในแต่ละวัน' }
]

const navItemCount = computed(() => overviewItems.length + masterItems.length + operationsItems.length)

const pageMeta = {
  '/admin/dashboard': ['Dashboard', 'ภาพรวมของคลินิก รายรับ รายจ่าย และจำนวนงานในช่วงเวลาที่เลือก'],
  '/admin/users': ['จัดการสมาชิก', 'กำหนดสิทธิ์ผู้ใช้งานและดูสถานะบัญชีภายในระบบ'],
  '/admin/owners': ['เจ้าของสัตว์', 'จัดการข้อมูลลูกค้าเพื่อเชื่อมกับสัตว์เลี้ยงและประวัติรักษา'],
  '/admin/pets': ['สัตว์เลี้ยง', 'ดูข้อมูลสัตว์เลี้ยงแต่ละตัวและเจ้าของที่เกี่ยวข้อง'],
  '/admin/veterinarians': ['สัตวแพทย์', 'ข้อมูลทีมสัตวแพทย์และบทบาทภายในคลินิก'],
  '/admin/clinic': ['ข้อมูลคลินิก', 'แก้ไขรายละเอียดพื้นฐานและช่องทางติดต่อของคลินิก'],
  '/admin/appointments': ['การนัดหมาย', 'จัดคิว ตรวจสอบเวลา และติดตามสถานะการเข้ารับบริการ'],
  '/admin/services': ['บริการและราคา', 'ปรับรายการบริการมาตรฐานให้พร้อมใช้กับการรักษาและใบเสร็จ'],
  '/admin/treatments': ['การรักษา', 'บันทึกอาการ วินิจฉัย รายการรักษา และยอดค่าใช้จ่าย'],
  '/admin/surgeries': ['การผ่าตัด', 'ติดตามเคสผ่าตัด แพทย์ผู้รับผิดชอบ และหมายเหตุสำคัญ'],
  '/admin/vaccines': ['วัคซีน', 'บันทึกประวัติการฉีดวัคซีนและนัดติดตามครั้งถัดไป'],
  '/admin/receipts': ['ใบเสร็จรับเงิน', 'จัดการการออกใบเสร็จ การชำระเงิน และการพิมพ์เอกสาร'],
  '/admin/expenses': ['รายจ่ายคลินิก', 'ดูแลต้นทุนและบันทึกรายจ่ายที่เกิดขึ้นในแต่ละวัน'],
  '/admin/reports': ['รายงาน', 'สรุปภาพรวมเชิงบริหารเพื่อดูแนวโน้มและสถานะของคลินิก']
}

const currentUserName = computed(() => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    return user.username || user.owner_name || 'Admin'
  } catch {
    return 'Admin'
  }
})

const pageTitle = computed(() => {
  if (route.path.startsWith('/admin/history/')) return 'สรุปประวัติสัตว์เลี้ยง'
  return pageMeta[route.path]?.[0] || 'Clinic Admin'
})

const pageSubtitle = computed(() => {
  if (route.path.startsWith('/admin/history/')) {
    return 'รายงานสรุปข้อมูลสัตว์เลี้ยง เจ้าของ นัดหมาย การรักษา วัคซีน ผ่าตัด และใบเสร็จจากข้อมูลเดิมในระบบ'
  }
  return pageMeta[route.path]?.[1] || 'ระบบจัดการคลินิกสัตว์เลี้ยง'
})

const logout = () => {
  if (!window.confirm('ต้องการออกจากระบบใช่หรือไม่?')) return
  localStorage.clear()
  router.push('/login')
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
    radial-gradient(circle at top left, rgba(15, 118, 110, 0.12), transparent 28%),
    linear-gradient(180deg, #f4f7fb 0%, #eef4f8 100%);
}

.workspace-sidebar {
  padding: 22px 18px;
  border-right: 1px solid rgba(15, 23, 42, 0.06);
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: #fbfdff;
}

.workspace-brand,
.nav-group,
.workspace-footer,
.workspace-header {
  background: rgba(255, 255, 255, 0.92);
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
  background: linear-gradient(135deg, #0f766e 0%, #115e59 100%);
  color: #ffffff;
  font-size: 24px;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.brand-kicker,
.nav-title,
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
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mobile-menu-button {
  display: none;
}

.nav-group {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-title {
  margin: 4px 6px 8px;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 700;
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
  transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.nav-link:hover,
.logout-button:hover {
  background: #f5f9fc;
  color: #0f172a;
}

.nav-link.active {
  background: linear-gradient(135deg, #ecfdf5 0%, #f0fdfa 100%);
  color: #0f766e;
  box-shadow: inset 0 0 0 1px rgba(15, 118, 110, 0.15);
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

.workspace-content {
  max-width: 1320px;
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

@media (max-width: 1120px) {
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
    padding: 2px;
  }

  .nav-group {
    display: contents;
  }

  .nav-title {
    display: none;
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
    font-size: 18px;
  }

  .brand-copy h1 {
    font-size: 1.08rem;
  }

  .brand-copy p,
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
