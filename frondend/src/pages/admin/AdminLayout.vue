<template>
  <div class="admin-shell">
    <aside class="admin-sidebar">
      <div class="brand-panel">
        <div class="brand-mark-wrap">
          <div class="brand-mark">PC</div>
        </div>
        <div class="brand-copy">
          <span class="brand-kicker">Clinic admin</span>
          <h1>Pet Clinic</h1>
          <p>พื้นที่จัดการลูกค้า สัตว์เลี้ยง การรักษา รายรับรายจ่าย และงานหน้าคลินิกในหน้าจอเดียว</p>
        </div>
      </div>

      <nav class="nav-stack">
        <section class="nav-section">
          <p class="nav-caption">ภาพรวม</p>
          <router-link to="/admin/dashboard" class="nav-item" active-class="active">
            <span class="nav-code">DB</span>
            <span class="nav-copy">
              <strong>Dashboard</strong>
              <small>ดูภาพรวมคลินิกแบบรายเดือน</small>
            </span>
          </router-link>
          <router-link to="/admin/reports" class="nav-item" active-class="active">
            <span class="nav-code">RP</span>
            <span class="nav-copy">
              <strong>รายงาน</strong>
              <small>สรุปผลการดำเนินงานและตัวเลขสำคัญ</small>
            </span>
          </router-link>
        </section>

        <section class="nav-section">
          <p class="nav-caption">ข้อมูลหลัก</p>
          <router-link to="/admin/users" class="nav-item" active-class="active">
            <span class="nav-code">US</span>
            <span class="nav-copy">
              <strong>สมาชิก</strong>
              <small>ดูแลสิทธิ์การใช้งานของผู้ใช้</small>
            </span>
          </router-link>
          <router-link to="/admin/owners" class="nav-item" active-class="active">
            <span class="nav-code">OW</span>
            <span class="nav-copy">
              <strong>เจ้าของสัตว์</strong>
              <small>ข้อมูลลูกค้าและช่องทางติดต่อ</small>
            </span>
          </router-link>
          <router-link to="/admin/pets" class="nav-item" active-class="active">
            <span class="nav-code">PT</span>
            <span class="nav-copy">
              <strong>สัตว์เลี้ยง</strong>
              <small>ข้อมูลสัตว์เลี้ยงทั้งหมดในระบบ</small>
            </span>
          </router-link>
          <router-link to="/admin/veterinarians" class="nav-item" active-class="active">
            <span class="nav-code">VT</span>
            <span class="nav-copy">
              <strong>สัตวแพทย์</strong>
              <small>รายชื่อและข้อมูลทีมแพทย์</small>
            </span>
          </router-link>
          <router-link to="/admin/clinic" class="nav-item" active-class="active">
            <span class="nav-code">CL</span>
            <span class="nav-copy">
              <strong>ข้อมูลคลินิก</strong>
              <small>โทรศัพท์ อีเมล และที่อยู่คลินิก</small>
            </span>
          </router-link>
        </section>

        <section class="nav-section">
          <p class="nav-caption">งานบริการ</p>
          <router-link to="/admin/appointments" class="nav-item" active-class="active">
            <span class="nav-code">AP</span>
            <span class="nav-copy">
              <strong>การนัดหมาย</strong>
              <small>จัดคิวเข้ารับบริการและติดตามสถานะ</small>
            </span>
          </router-link>
          <router-link to="/admin/services" class="nav-item" active-class="active">
            <span class="nav-code">SV</span>
            <span class="nav-copy">
              <strong>บริการและราคา</strong>
              <small>จัดการรายการรักษาและค่าบริการ</small>
            </span>
          </router-link>
          <router-link to="/admin/treatments" class="nav-item" active-class="active">
            <span class="nav-code">TR</span>
            <span class="nav-copy">
              <strong>การรักษา</strong>
              <small>บันทึกอาการ การวินิจฉัย และค่าใช้จ่าย</small>
            </span>
          </router-link>
          <router-link to="/admin/surgeries" class="nav-item" active-class="active">
            <span class="nav-code">SG</span>
            <span class="nav-copy">
              <strong>การผ่าตัด</strong>
              <small>ติดตามเคสผ่าตัดและสัตวแพทย์ผู้ดูแล</small>
            </span>
          </router-link>
          <router-link to="/admin/vaccines" class="nav-item" active-class="active">
            <span class="nav-code">VC</span>
            <span class="nav-copy">
              <strong>วัคซีน</strong>
              <small>ประวัติการฉีดวัคซีนและการติดตาม</small>
            </span>
          </router-link>
          <router-link to="/admin/receipts" class="nav-item" active-class="active">
            <span class="nav-code">RC</span>
            <span class="nav-copy">
              <strong>ใบเสร็จรับเงิน</strong>
              <small>ออกบิลและติดตามสถานะการชำระเงิน</small>
            </span>
          </router-link>
          <router-link to="/admin/expenses" class="nav-item" active-class="active">
            <span class="nav-code">EX</span>
            <span class="nav-copy">
              <strong>รายจ่ายคลินิก</strong>
              <small>ติดตามต้นทุนและค่าใช้จ่ายทั้งหมด</small>
            </span>
          </router-link>
        </section>
      </nav>

      <div class="sidebar-footer">
        <div class="footer-note">
          <span class="footer-dot"></span>
          <p>ตรวจสอบงานหน้าร้าน รายการรักษา รายงานการเงิน และข้อมูลลูกค้าได้จากที่เดียว</p>
        </div>
        <button @click="logout" type="button" class="logout-btn">
          <span class="logout-icon">↩</span>
          <span>ออกจากระบบ</span>
        </button>
      </div>
    </aside>

    <main class="admin-content">
      <header class="content-header">
        <div>
          <p class="header-label">Clinic workspace</p>
          <h2>{{ pageTitle }}</h2>
          <p class="header-subtitle">{{ pageSubtitle }}</p>
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

const route = useRoute()
const router = useRouter()

const pageMeta = {
  '/admin/dashboard': ['Dashboard', 'ภาพรวมคลินิก รายได้ รายจ่าย และจำนวนงานที่เกิดขึ้นในช่วงเวลาที่เลือก'],
  '/admin/users': ['จัดการสมาชิก', 'กำหนดสิทธิ์ผู้ใช้งานและดูสถานะบัญชีในระบบ'],
  '/admin/owners': ['เจ้าของสัตว์', 'จัดการข้อมูลลูกค้าเพื่อเชื่อมกับสัตว์เลี้ยงและการรักษา'],
  '/admin/pets': ['สัตว์เลี้ยง', 'ดูข้อมูลสัตว์เลี้ยงแต่ละตัวและเจ้าของที่เกี่ยวข้อง'],
  '/admin/veterinarians': ['สัตวแพทย์', 'ดูแลข้อมูลทีมสัตวแพทย์และบทบาทในคลินิก'],
  '/admin/clinic': ['ข้อมูลคลินิก', 'แก้ไขข้อมูลติดต่อและรายละเอียดพื้นฐานของคลินิก'],
  '/admin/appointments': ['การนัดหมาย', 'จัดคิวนัดหมาย ตรวจสอบวันเวลา และสถานะการเข้ารับบริการ'],
  '/admin/services': ['บริการและราคา', 'ปรับรายการบริการให้พร้อมใช้กับใบเสร็จและการรักษา'],
  '/admin/treatments': ['การรักษา', 'บันทึกอาการ วินิจฉัย รายการรักษา และยอดค่าใช้จ่าย'],
  '/admin/surgeries': ['การผ่าตัด', 'ติดตามเคสผ่าตัด แพทย์ผู้รับผิดชอบ และหมายเหตุสำคัญ'],
  '/admin/vaccines': ['วัคซีน', 'บันทึกประวัติการฉีดวัคซีนและการนัดติดตามครั้งถัดไป'],
  '/admin/receipts': ['ใบเสร็จรับเงิน', 'จัดการการออกใบเสร็จ การชำระเงิน และการพิมพ์เอกสาร'],
  '/admin/expenses': ['รายจ่ายคลินิก', 'ดูแลต้นทุนและบันทึกรายจ่ายที่เกิดขึ้นในแต่ละวัน'],
  '/admin/reports': ['รายงาน', 'สรุปภาพรวมเชิงบริหารเพื่อใช้ตรวจสอบแนวโน้มของคลินิก']
}

const currentUserName = computed(() => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    return user.username || user.owner_name || 'Admin'
  } catch {
    return 'Admin'
  }
})

const pageTitle = computed(() => pageMeta[route.path]?.[0] || 'Clinic Admin')
const pageSubtitle = computed(() => pageMeta[route.path]?.[1] || 'ระบบจัดการคลินิกสัตว์เลี้ยง')

const logout = () => {
  if (!window.confirm('ต้องการออกจากระบบใช่หรือไม่?')) return
  localStorage.clear()
  router.push('/login')
}
</script>

<style scoped>
.admin-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 280px 1fr;
  background:
    radial-gradient(circle at top left, rgba(99, 102, 241, 0.08), transparent 26%),
    linear-gradient(180deg, #f8f8fc 0%, #f3f6fb 100%);
  font-family: Inter, sans-serif;
}

.admin-sidebar {
  padding: 22px 18px;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, rgba(248, 250, 252, 0.96) 100%);
}

.brand-panel,
.nav-section,
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
  font-size: 22px;
  font-weight: 800;
}

.brand-kicker,
.nav-caption,
.header-label {
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.brand-kicker {
  display: block;
  margin-bottom: 6px;
  color: #6b7280;
  font-size: 12px;
  font-weight: 700;
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

.nav-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.nav-section {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-caption {
  margin: 2px 4px 6px;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 700;
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

.nav-code {
  width: 36px;
  height: 36px;
  border-radius: 11px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  color: inherit;
  font-size: 11px;
  font-weight: 800;
  flex: none;
}

.nav-item.active .nav-code {
  background: rgba(255, 255, 255, 0.76);
}

.nav-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.nav-copy strong {
  font-size: 14px;
  line-height: 1.25;
}

.nav-copy small {
  color: #64748b;
  font-size: 11.5px;
  line-height: 1.45;
}

.nav-item.active .nav-copy small {
  color: #5b5fc7;
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

.footer-dot,
.chip-dot {
  width: 10px;
  height: 10px;
  margin-top: 4px;
  border-radius: 999px;
  flex: none;
}

.footer-dot {
  background: #c4b5fd;
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
  color: #475569;
}

.logout-icon {
  width: 18px;
  text-align: center;
}

.admin-content {
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
  font-weight: 700;
}

.content-header h2 {
  margin: 0;
  font-size: 26px;
  color: #111827;
}

.header-subtitle {
  margin: 8px 0 0;
  color: #64748b;
  font-size: 14px;
  line-height: 1.6;
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
  background: #22c55e;
}

.content-shell {
  max-width: 1260px;
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
  .admin-shell {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .admin-content {
    padding: 16px;
  }

  .content-header {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
