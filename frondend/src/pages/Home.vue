<template>
  <div class="home-page">
    <header class="home-nav">
      <div class="brand">
        <div class="brand-mark">PC</div>
        <div class="brand-copy">
          <strong>{{ clinic.clinic_name || 'Pet Clinic' }}</strong>
          <span>Pet care management</span>
        </div>
      </div>

      <nav class="nav-actions">
        <router-link to="/login" class="nav-link">เข้าสู่ระบบ</router-link>
        <router-link to="/register" class="nav-button">สมัครสมาชิก</router-link>
      </nav>
    </header>

    <main class="home-main">
      <section class="hero-shell">
        <div class="hero-copy">
          <p class="eyebrow">Pet clinic platform</p>
          <h1>ดูแลข้อมูลสัตว์เลี้ยง นัดหมาย และประวัติการรักษาในหน้าจอเดียว</h1>
          <p class="hero-description">
            ระบบสำหรับคลินิกและเจ้าของสัตว์เลี้ยงที่ช่วยให้การติดตามข้อมูล การนัดหมาย
            การรักษา และใบเสร็จเป็นระเบียบ ใช้งานง่าย และมองภาพรวมได้ทันที
          </p>

          <div class="hero-actions">
            <router-link to="/login" class="primary-button">เริ่มใช้งาน</router-link>
            <router-link to="/register" class="secondary-button">สร้างบัญชีใหม่</router-link>
          </div>
        </div>

        <div class="hero-panel">
          <article class="info-card">
            <span>ชื่อคลินิก</span>
            <strong>{{ clinic.clinic_name || 'Pet Clinic' }}</strong>
          </article>
          <article class="info-card">
            <span>เบอร์โทร</span>
            <strong>{{ clinic.tel || 'ยังไม่ได้ระบุ' }}</strong>
          </article>
          <article class="info-card">
            <span>เวลาทำการ</span>
            <strong>{{ clinic.open_hours || 'ยังไม่ได้ระบุ' }}</strong>
          </article>
          <article class="info-card full-width">
            <span>ที่อยู่</span>
            <strong>{{ clinic.address || 'กรุณาแก้ไขข้อมูลคลินิก' }}</strong>
          </article>
        </div>
      </section>

      <section class="feature-grid">
        <article class="feature-card">
          <p class="feature-label">FOR OWNER</p>
          <h2>สำหรับเจ้าของสัตว์เลี้ยง</h2>
          <p>ดูข้อมูลส่วนตัว สัตว์เลี้ยง นัดหมาย และประวัติการชำระเงินได้ในที่เดียว</p>
        </article>

        <article class="feature-card">
          <p class="feature-label">FOR CLINIC</p>
          <h2>สำหรับคลินิก</h2>
          <p>จัดการคิว งานรักษา ใบเสร็จ รายงาน และงานหน้าบ้านจากระบบเดียวกัน</p>
        </article>

        <article class="feature-card">
          <p class="feature-label">CONNECTED DATA</p>
          <h2>ข้อมูลเชื่อมกันทั้งระบบ</h2>
          <p>ลดการกรอกข้อมูลซ้ำและช่วยให้การทำงานของคลินิกต่อเนื่องมากขึ้น</p>
        </article>
      </section>

      <section class="services-section">
        <div class="section-head">
          <div>
            <p class="eyebrow">Clinic services</p>
            <h2>บริการของคลินิก</h2>
            <p class="section-copy">
              รายการบริการที่เปิดให้ใช้งานในระบบ พร้อมราคาและรายละเอียดเบื้องต้น
            </p>
          </div>
        </div>

        <div v-if="services.length" class="services-grid">
          <article
            v-for="service in services"
            :key="service.service_id"
            class="service-card"
          >
            <div class="service-top">
              <span class="service-id">{{ service.service_id }}</span>
              <strong class="service-price">{{ formatPrice(service.service_price) }} บาท</strong>
            </div>

            <h3>{{ service.service_name }}</h3>
            <p>{{ service.service_desc || 'ไม่มีรายละเอียดเพิ่มเติม' }}</p>
          </article>
        </div>

        <div v-else class="service-empty">
          <strong>ยังไม่มีข้อมูลบริการ</strong>
          <p>เมื่อมีการเพิ่มบริการในระบบ รายการจะมาแสดงที่ส่วนนี้</p>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import axios from 'axios'
import { onMounted, ref } from 'vue'

const clinic = ref({})
const services = ref([])

function formatPrice(value) {
  const amount = Number(value || 0)
  return amount.toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

onMounted(async () => {
  try {
    const [clinicResponse, servicesResponse] = await Promise.all([
      axios.get('http://localhost:3000/api/clinic'),
      axios.get('http://localhost:3000/api/services/public')
    ])

    clinic.value = clinicResponse.data || {}
    services.value = Array.isArray(servicesResponse.data) ? servicesResponse.data : []
  } catch (error) {
    console.error('Error loading home page data:', error)
    clinic.value = {}
    services.value = []
  }
})
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(20, 184, 166, 0.12), transparent 30%),
    radial-gradient(circle at top right, rgba(14, 116, 144, 0.12), transparent 28%),
    linear-gradient(180deg, #f7fbff 0%, #eef6ff 100%);
  color: #0f172a;
}

.home-nav {
  width: min(1180px, calc(100% - 40px));
  margin: 0 auto;
  padding: 28px 0 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.brand-mark {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #14b8a6 0%, #0f766e 100%);
  color: #ffffff;
  font-size: 1.15rem;
  font-weight: 800;
  box-shadow: 0 18px 32px rgba(15, 118, 110, 0.2);
}

.brand-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.brand-copy strong {
  font-size: 1.1rem;
}

.brand-copy span {
  color: #4b5563;
  font-size: 0.95rem;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.nav-link,
.nav-button,
.primary-button,
.secondary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 46px;
  padding: 0 20px;
  border-radius: 14px;
  font-weight: 700;
  text-decoration: none;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease;
}

.nav-link,
.secondary-button {
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(255, 255, 255, 0.76);
  color: #0f172a;
}

.nav-button,
.primary-button {
  border: 1px solid transparent;
  background: linear-gradient(135deg, #14b8a6 0%, #0f766e 100%);
  color: #ffffff;
  box-shadow: 0 16px 30px rgba(15, 118, 110, 0.22);
}

.nav-link:hover,
.nav-button:hover,
.primary-button:hover,
.secondary-button:hover {
  transform: translateY(-1px);
}

.home-main {
  width: min(1180px, calc(100% - 40px));
  margin: 0 auto;
  padding: 12px 0 48px;
  display: grid;
  gap: 28px;
}

.hero-shell {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
  gap: 24px;
  padding: 32px;
  border: 1px solid rgba(226, 232, 240, 0.95);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 26px 60px rgba(148, 163, 184, 0.16);
}

.hero-copy {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 18px;
}

.eyebrow,
.feature-label {
  margin: 0;
  color: #0f766e;
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-copy h1,
.services-section h2,
.feature-card h2 {
  margin: 0;
  color: #0f172a;
}

.hero-copy h1 {
  font-size: clamp(2rem, 4vw, 3.25rem);
  line-height: 1.08;
  max-width: 12ch;
}

.hero-description,
.section-copy,
.feature-card p,
.service-card p {
  margin: 0;
  color: #475569;
  line-height: 1.7;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  padding-top: 6px;
}

.hero-panel {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.info-card {
  min-height: 122px;
  padding: 20px;
  border-radius: 22px;
  border: 1px solid rgba(203, 213, 225, 0.8);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.98));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.85);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.info-card span {
  color: #64748b;
  font-size: 0.92rem;
}

.info-card strong {
  font-size: 1.35rem;
  line-height: 1.35;
}

.full-width {
  grid-column: 1 / -1;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.feature-card,
.services-section {
  border: 1px solid rgba(226, 232, 240, 0.95);
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 22px 50px rgba(148, 163, 184, 0.12);
}

.feature-card {
  border-radius: 24px;
  padding: 24px;
  display: grid;
  gap: 12px;
}

.services-section {
  border-radius: 28px;
  padding: 28px;
  display: grid;
  gap: 24px;
}

.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
}

.section-head h2 {
  font-size: 2rem;
  margin-top: 6px;
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.service-card {
  min-height: 220px;
  padding: 22px;
  border-radius: 24px;
  border: 1px solid rgba(203, 213, 225, 0.8);
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  box-shadow: 0 18px 38px rgba(148, 163, 184, 0.12);
  display: grid;
  align-content: start;
  gap: 16px;
}

.service-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.service-id {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(20, 184, 166, 0.12);
  color: #0f766e;
  font-size: 0.82rem;
  font-weight: 800;
}

.service-price {
  color: #0f172a;
  font-size: 1rem;
}

.service-card h3 {
  margin: 0;
  font-size: 1.35rem;
  line-height: 1.3;
}

.service-empty {
  min-height: 220px;
  border: 1px dashed rgba(148, 163, 184, 0.45);
  border-radius: 24px;
  background: rgba(248, 250, 252, 0.75);
  display: grid;
  place-items: center;
  text-align: center;
  padding: 24px;
  color: #475569;
}

.service-empty strong {
  color: #0f172a;
  font-size: 1.05rem;
}

@media (max-width: 1080px) {
  .hero-shell,
  .feature-grid,
  .services-grid {
    grid-template-columns: 1fr;
  }

  .hero-copy h1 {
    max-width: none;
  }
}

@media (max-width: 780px) {
  .home-nav,
  .home-main {
    width: min(100% - 24px, 1180px);
  }

  .home-nav {
    flex-direction: column;
    align-items: flex-start;
  }

  .nav-actions,
  .hero-actions {
    width: 100%;
  }

  .nav-link,
  .nav-button,
  .primary-button,
  .secondary-button {
    flex: 1 1 0;
  }

  .hero-shell,
  .services-section {
    padding: 22px;
  }

  .hero-panel {
    grid-template-columns: 1fr;
  }

  .full-width {
    grid-column: auto;
  }

  .section-head h2 {
    font-size: 1.7rem;
  }
}
</style>
