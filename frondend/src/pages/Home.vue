<template>
  <div class="home-page">
    <header class="home-nav">
      <div class="brand">
        <div class="brand-mark">PC</div>
        <div>
          <strong>{{ clinic.clinic_name || 'Pet Clinic' }}</strong>
          <span>Pet care management</span>
        </div>
      </div>
      <div class="nav-actions">
        <router-link to="/login" class="ghost-link">เข้าสู่ระบบ</router-link>
        <router-link to="/register" class="primary-link">สมัครสมาชิก</router-link>
      </div>
    </header>

    <main class="home-main">
      <section class="hero">
        <div class="hero-copy">
          <p class="eyebrow">Trusted pet care</p>
          <h1>ดูแลสัตว์เลี้ยงของคุณในระบบเดียว</h1>
          <p>
            ติดตามข้อมูลสัตว์เลี้ยง ประวัติการรักษา นัดหมาย และใบเสร็จได้อย่างเป็นระเบียบ
            พร้อมพื้นที่ทำงานสำหรับคลินิกในมุมมองเดียว
          </p>
          <div class="hero-actions">
            <router-link to="/login" class="primary-link">เริ่มใช้งาน</router-link>
            <router-link to="/register" class="ghost-link">สร้างบัญชีใหม่</router-link>
          </div>
        </div>

        <div class="hero-panel">
          <div class="clinic-card">
            <span>ชื่อคลินิก</span>
            <strong>{{ clinic.clinic_name || 'Pet Clinic' }}</strong>
          </div>
          <div class="clinic-card">
            <span>เบอร์โทร</span>
            <strong>{{ clinic.tel || '-' }}</strong>
          </div>
          <div class="clinic-card">
            <span>เวลาทำการ</span>
            <strong>{{ clinic.open_hours || '-' }}</strong>
          </div>
          <div class="clinic-card full-card">
            <span>ที่อยู่</span>
            <strong>{{ clinic.address || '-' }}</strong>
          </div>
        </div>
      </section>

      <section class="feature-grid">
        <article class="feature-card">
          <h2>สำหรับเจ้าของสัตว์เลี้ยง</h2>
          <p>ดูข้อมูลส่วนตัว สัตว์เลี้ยง นัดหมาย และประวัติการชำระเงินได้ง่าย</p>
        </article>
        <article class="feature-card">
          <h2>สำหรับคลินิก</h2>
          <p>จัดการคิว งานรักษา ใบเสร็จ รายงาน และรายจ่ายจากหน้าจอเดียว</p>
        </article>
        <article class="feature-card">
          <h2>ข้อมูลเชื่อมกันทั้งระบบ</h2>
          <p>ลดการค้นหาข้อมูลซ้ำและช่วยให้ workflow ของคลินิกเป็นระเบียบมากขึ้น</p>
        </article>
      </section>
    </main>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import axios from 'axios'

const clinic = ref({
  clinic_name: 'Pet Clinic',
  address: '',
  tel: '',
  open_hours: ''
})

onMounted(async () => {
  try {
    const response = await axios.get('http://localhost:3000/api/clinic')
    if (response.data) {
      clinic.value = {
        clinic_name: response.data.clinic_name || 'Pet Clinic',
        address: response.data.address || '',
        tel: response.data.tel || '',
        open_hours: response.data.open_hours || ''
      }
    }
  } catch (error) {
    console.error('โหลดข้อมูลคลินิกไม่สำเร็จ:', error)
  }
})
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(15, 118, 110, 0.12), transparent 28%),
    linear-gradient(180deg, #f4f7fb 0%, #eef4f8 100%);
  color: #0f172a;
  padding: 24px;
}

.home-nav,
.hero,
.feature-card {
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(217, 226, 236, 0.92);
  border-radius: 20px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.05);
}

.home-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 22px;
  margin-bottom: 20px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-mark {
  width: 50px;
  height: 50px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);
  color: #ffffff;
  font-weight: 800;
  font-size: 22px;
}

.brand strong,
.brand span {
  display: block;
}

.brand span {
  color: #64748b;
  font-size: 13px;
}

.nav-actions,
.hero-actions {
  display: flex;
  gap: 12px;
}

.primary-link,
.ghost-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 18px;
  border-radius: 14px;
  text-decoration: none;
  font-weight: 700;
}

.primary-link {
  background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);
  color: #ffffff;
}

.ghost-link {
  background: #f8fafc;
  color: #334155;
  border: 1px solid #d9e2ec;
}

.hero {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 24px;
  padding: 34px;
}

.eyebrow {
  margin: 0 0 10px;
  color: #0f766e;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-copy h1 {
  margin: 0;
  font-size: 46px;
  line-height: 1.05;
}

.hero-copy p:not(.eyebrow) {
  margin: 16px 0 0;
  color: #64748b;
  font-size: 16px;
  line-height: 1.8;
  max-width: 680px;
}

.hero-panel {
  display: grid;
  gap: 14px;
}

.clinic-card {
  background: #f8fafc;
  border: 1px solid #e8eef5;
  border-radius: 18px;
  padding: 18px;
}

.clinic-card span,
.clinic-card strong {
  display: block;
}

.clinic-card span {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.clinic-card strong {
  margin-top: 8px;
  color: #0f172a;
  font-size: 18px;
  line-height: 1.5;
}

.full-card strong {
  font-size: 16px;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
  margin-top: 20px;
}

.feature-card {
  padding: 24px;
}

.feature-card h2 {
  margin: 0;
  color: #0f172a;
  font-size: 20px;
}

.feature-card p {
  margin: 10px 0 0;
  color: #64748b;
  line-height: 1.7;
}

@media (max-width: 980px) {
  .hero,
  .feature-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .home-page {
    padding: 16px;
  }

  .home-nav,
  .nav-actions,
  .hero-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .hero-copy h1 {
    font-size: 34px;
  }
}
</style>
