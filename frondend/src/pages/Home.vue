<template>
  <div class="home-page">
    <header class="top-nav">
      <div class="brand">
        <div class="brand-mark">
          <AppIcon name="paw" :size="24" />
        </div>
        <div class="brand-copy">
          <strong>โรงพยาบาลสัตว์เมืองเลย</strong>
          <span>ระบบจัดการข้อมูลการรักษาและบริการสัตว์เลี้ยง</span>
        </div>
      </div>

      <nav class="nav-links">
        <a href="#services">บริการ</a>
        <a href="#clinic-info">ข้อมูลคลินิก</a>
        <a href="#trust">เกี่ยวกับระบบ</a>
      </nav>

      <router-link to="/login" class="nav-solid-button">เข้าสู่ระบบ</router-link>
    </header>

    <main class="home-main">
      <section class="hero-section">
        <div class="hero-copy">
          <p class="hero-label">โรงพยาบาลสัตว์เมืองเลย</p>
          <h2>ดูแลข้อมูลสัตว์เลี้ยงและงานรักษาในระบบเดียว</h2>
          <p class="hero-description">
            ระบบสำหรับคลินิกและเจ้าของสัตว์เลี้ยงที่ช่วยเชื่อมข้อมูลสัตว์เลี้ยง นัดหมาย การรักษา วัคซีน
            ผ่าตัด และใบเสร็จให้อยู่ในลำดับการทำงานเดียวกัน
          </p>

          <div class="hero-actions">
            <router-link to="/login" class="primary-button">เข้าสู่ระบบ</router-link>
          </div>

          <div class="hero-trust-row">
            <div class="trust-item">
              <span class="trust-icon"><AppIcon name="clinic" :size="18" /></span>
              <div>
                <strong>{{ clinic.clinic_name || 'โรงพยาบาลสัตว์เมืองเลย' }}</strong>
                <p>ข้อมูลคลินิกและบริการเชื่อมกับระบบจริง</p>
              </div>
            </div>

            <div class="trust-item">
              <span class="trust-icon"><AppIcon name="calendar" :size="18" /></span>
              <div>
                <strong>ติดตามนัดหมายและการรักษา</strong>
                <p>จัดการข้อมูลต่อเนื่องตั้งแต่รับเคสจนถึงออกใบเสร็จ</p>
              </div>
            </div>
          </div>
        </div>

        <div class="hero-gallery">
          <article class="hero-photo large">
            <img
              src="https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=1200&q=80"
              alt="สุนัขในโรงพยาบาลสัตว์"
            />
          </article>
          <article class="hero-photo small">
            <img
              src="https://images.unsplash.com/photo-1519052537078-e6302a4968d4?auto=format&fit=crop&w=900&q=80"
              alt="แมวสำหรับการดูแลและรักษา"
            />
          </article>
        </div>
      </section>

      <section class="gallery-showcase">
        <div class="gallery-copy">
          <p class="section-kicker">Clinic gallery</p>
          <h2>บรรยากาศและเคสบริการของโรงพยาบาล</h2>
          <p class="section-description">
            ใช้สำหรับแสดงภาพสถานที่จริง การดูแลสัตว์เลี้ยง และเคสที่สะท้อนรูปแบบการให้บริการของโรงพยาบาลสัตว์เมืองเลย
          </p>
        </div>

        <div class="gallery-board" aria-label="ภาพตัวอย่างโรงพยาบาลสัตว์เมืองเลย">
          <div
            v-for="(column, columnIndex) in clinicGalleryColumns"
            :key="`gallery-col-${columnIndex}`"
            class="gallery-column"
            :class="columnIndex % 2 === 1 ? 'reverse' : ''"
          >
            <div class="gallery-track">
              <article
                v-for="(item, itemIndex) in [...column, ...column]"
                :key="`${columnIndex}-${item.id}-${itemIndex}`"
                class="gallery-tile"
                :class="item.tall ? 'tall' : ''"
              >
                <img :src="item.src" :alt="item.title">
                <div class="gallery-overlay">
                  <strong>{{ item.title }}</strong>
                  <span>{{ item.note }}</span>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section id="services" class="content-section">
        <div class="section-head">
          <div>
            <p class="section-kicker">บริการของทางร้านและคลินิก</p>
            <h2>บริการที่เปิดใช้งานในระบบ</h2>
          </div>
          <p class="section-description">
            แสดงรายการบริการหลักพร้อมภาพประกอบและคำอธิบาย เพื่อให้เข้าใจภาพรวมการให้บริการได้ทันที
          </p>
        </div>

        <div v-if="services.length" class="service-scroll">
          <article v-for="service in serviceCards" :key="service.service_id" class="service-card">
            <div class="service-media">
              <img :src="service.image" :alt="service.service_name" />
              <span class="service-id">{{ service.service_id }}</span>
            </div>

            <div class="service-body">
              <div class="service-card-top">
                <h3>{{ service.service_name }}</h3>
                <strong class="service-price">{{ formatPrice(service.service_price) }} บาท</strong>
              </div>
              <p>{{ service.service_desc || 'ไม่มีรายละเอียดเพิ่มเติม' }}</p>
            </div>
          </article>
        </div>

        <div v-else class="empty-state">
          <strong>ยังไม่มีข้อมูลบริการ</strong>
          <p>เมื่อเพิ่มบริการในระบบ รายการจะถูกแสดงที่ส่วนนี้ทันที</p>
        </div>
      </section>

      <section id="clinic-info" class="content-section clinic-section">
        <div class="section-head">
          <div>
            <p class="section-kicker">ข้อมูลคลินิก</p>
            <h2>ข้อมูลสำหรับการติดต่อและเข้าใช้บริการ</h2>
          </div>
          <p class="section-description">
            แสดงข้อมูลจริงจากฐานข้อมูลคลินิกเพื่อใช้เป็นข้อมูลอ้างอิงบนหน้าแรก
          </p>
        </div>

        <div class="clinic-grid">
          <article class="clinic-card">
            <span class="clinic-icon"><AppIcon name="phone" :size="18" /></span>
            <div>
              <small>เบอร์โทรศัพท์</small>
              <strong>{{ clinic.tel || 'ยังไม่ได้ระบุ' }}</strong>
            </div>
          </article>

          <article class="clinic-card">
            <span class="clinic-icon"><AppIcon name="history" :size="18" /></span>
            <div>
              <small>เวลาเปิดทำการ</small>
              <strong>{{ clinic.open_hours || 'ยังไม่ได้ระบุ' }}</strong>
            </div>
          </article>

          <article class="clinic-card wide">
            <span class="clinic-icon"><AppIcon name="clinic" :size="18" /></span>
            <div>
              <small>ที่อยู่</small>
              <strong>{{ clinic.address || 'กรุณาแก้ไขข้อมูลคลินิกในระบบ' }}</strong>
            </div>
          </article>
        </div>
      </section>

      <section id="trust" class="trust-section">
        <div class="trust-panel">
          <p class="section-kicker">System trust</p>
          <h2>รองรับการจัดการข้อมูลเจ้าของ สัตว์เลี้ยง การรักษา และการเงินในระบบเดียว</h2>
          <p>
            ช่วยให้ข้อมูลตั้งแต่นัดหมาย การรักษา วัคซีน ผ่าตัด ไปจนถึงใบเสร็จและการชำระเงินเชื่อมโยงกัน
            ลดการค้นหาข้อมูลซ้ำ และทำให้การตรวจสอบย้อนหลังเป็นระเบียบมากขึ้น
          </p>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import axios from 'axios'
import { computed, onMounted, ref } from 'vue'
import AppIcon from '../components/AppIcon.vue'

const clinic = ref({})
const services = ref([])

const clinicGallery = [
  {
    id: 'cg-01',
    src: '/images/clinic-gallery/clinic-01.png',
    title: 'เคสบริการจริง',
    note: 'ภาพตัวอย่างจากโรงพยาบาลสัตว์',
    tall: true
  },
  {
    id: 'cg-02',
    src: '/images/clinic-gallery/clinic-02.png',
    title: 'ภาพการวินิจฉัย',
    note: 'สื่อสารรูปแบบการรักษาในระบบ',
    tall: false
  },
  {
    id: 'cg-03',
    src: '/images/clinic-gallery/clinic-03.png',
    title: 'เคสเฉพาะทาง',
    note: 'ตัวอย่างงานบริการและผลการรักษา',
    tall: false
  },
  {
    id: 'cg-04',
    src: '/images/clinic-gallery/clinic-04.png',
    title: 'ภาพการดูแลหลังรักษา',
    note: 'ใช้โชว์บรรยากาศบริการจริงของคลินิก',
    tall: true
  },
  {
    id: 'cg-05',
    src: '/images/clinic-gallery/clinic-05.png',
    title: 'ตัวอย่างเคสเพิ่มเติม',
    note: 'รองรับการเปลี่ยนเป็นรูปใหม่ได้ภายหลัง',
    tall: false
  },
  {
    id: 'cg-06',
    src: '/images/clinic-gallery/clinic-01.png',
    title: 'งานบริการของโรงพยาบาล',
    note: 'เลื่อนแสดงอัตโนมัติบนหน้าแรก',
    tall: false
  }
]

const imageLibrary = {
  treatment: 'https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?auto=format&fit=crop&w=1200&q=80',
  vaccine: 'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?auto=format&fit=crop&w=1200&q=80',
  surgery: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&w=1200&q=80',
  appointment: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=1200&q=80',
  default: 'https://images.unsplash.com/photo-1548681528-6a5c45b66b42?auto=format&fit=crop&w=1200&q=80'
}

const serviceCards = computed(() =>
  services.value.map((service) => ({
    ...service,
    image: resolveServiceImage(service)
  }))
)

const clinicGalleryColumns = computed(() => [
  clinicGallery.filter((_, index) => index % 3 === 0),
  clinicGallery.filter((_, index) => index % 3 === 1),
  clinicGallery.filter((_, index) => index % 3 === 2)
])

function resolveServiceImage(service) {
  if (service.service_image) {
    if (/^https?:\/\//i.test(service.service_image) || service.service_image.startsWith('/')) {
      return service.service_image
    }

    return `/${String(service.service_image).replace(/^\/+/, '')}`
  }

  const name = String(service.service_name || '').toLowerCase()

  if (name.includes('วัคซีน') || name.includes('vaccine')) return imageLibrary.vaccine
  if (name.includes('ผ่าตัด') || name.includes('surgery')) return imageLibrary.surgery
  if (name.includes('นัด') || name.includes('appointment')) return imageLibrary.appointment
  if (name.includes('รักษา') || name.includes('treat')) return imageLibrary.treatment

  return imageLibrary.default
}

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
  overflow-x: hidden;
  background:
    radial-gradient(circle at top left, rgba(20, 184, 166, 0.08), transparent 24%),
    linear-gradient(180deg, #f5f8fb 0%, #edf3f6 100%);
  color: #0f172a;
}

.top-nav,
.home-main {
  width: min(1180px, calc(100% - 40px));
  margin: 0 auto;
}

.top-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 24px 0 14px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.brand-mark {
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  border-radius: 16px;
  background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);
  color: #ffffff;
  box-shadow: 0 8px 14px rgba(15, 118, 110, 0.14);
}

.brand-copy {
  display: grid;
  gap: 4px;
}

.brand-copy strong {
  font-size: 1.08rem;
}

.brand-copy span {
  color: #526071;
  font-size: 0.94rem;
}

.nav-links,
.hero-actions {
  display: flex;
  align-items: center;
}

.nav-links {
  gap: 28px;
}

.nav-links a {
  color: #334155;
  text-decoration: none;
  font-weight: 600;
}

.nav-solid-button,
.primary-button {
  min-height: 46px;
  padding: 0 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  text-decoration: none;
  font-weight: 700;
  color: #ffffff;
  background: #0f766e;
  box-shadow: 0 10px 18px rgba(15, 118, 110, 0.14);
  transition: transform 0.18s ease, background 0.18s ease;
}

.nav-solid-button:hover,
.primary-button:hover {
  transform: translateY(-1px);
}

.home-main {
  display: grid;
  gap: 20px;
  padding-bottom: 44px;
}

.hero-section,
.content-section,
.trust-panel {
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(214, 225, 235, 0.96);
  border-radius: 18px;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.04);
  overflow: hidden;
}

.hero-section {
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(320px, 0.92fr);
  gap: 26px;
  padding: 28px;
  align-items: center;
}

.hero-copy {
  display: grid;
  gap: 16px;
}

.hero-label,
.section-kicker {
  margin: 0;
  color: #0f766e;
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-copy h1,
.hero-copy h2,
.section-head h2,
.service-card h3,
.trust-panel h2 {
  margin: 0;
  color: #0f172a;
}

.hero-copy h1,
.hero-copy h2 {
  max-width: 10ch;
  font-size: 3.5rem;
  line-height: 1.03;
  text-wrap: balance;
}

.hero-description,
.section-description,
.service-card p,
.trust-panel p,
.hero-trust-row p {
  margin: 0;
  color: #526071;
  line-height: 1.65;
}

.hero-actions {
  gap: 12px;
}

.hero-trust-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 4px;
}

.trust-item {
  display: grid;
  grid-template-columns: 40px 1fr;
  gap: 12px;
  align-items: start;
  padding: 14px;
  border-radius: 16px;
  background: #f5fafb;
  border: 1px solid #dfebf1;
}

.trust-icon,
.clinic-icon {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: #ecfdf5;
  color: #0f766e;
}

.trust-item strong {
  display: block;
  margin-bottom: 4px;
}

.hero-gallery {
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: 16px;
  align-items: stretch;
  min-width: 0;
}

.hero-photo {
  overflow: hidden;
  border-radius: 22px;
  min-height: 340px;
  background: #e2e8f0;
  aspect-ratio: 4 / 5;
}

.hero-photo.small {
  min-height: 340px;
  aspect-ratio: 3 / 5;
}

.hero-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  display: block;
}

.hero-photo.large img {
  object-position: center 38%;
}

.hero-photo.small img {
  object-position: center 28%;
}

.content-section {
  padding: 22px;
}

.section-head {
  display: grid;
  gap: 8px;
  margin-bottom: 18px;
}

.gallery-showcase {
  display: grid;
  grid-template-columns: minmax(260px, 0.78fr) minmax(0, 1.22fr);
  gap: 20px;
  padding: 22px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(214, 225, 235, 0.96);
  border-radius: 18px;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.04);
  overflow: hidden;
}

.gallery-copy {
  display: grid;
  align-content: start;
  gap: 10px;
  padding-top: 8px;
}

.gallery-copy h2 {
  margin: 0;
  color: #0f172a;
  max-width: 12ch;
  line-height: 1.08;
}

.gallery-board {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  min-height: 520px;
  height: 520px;
  overflow: hidden;
  mask-image: linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%);
}

.gallery-column {
  position: relative;
  overflow: hidden;
  border-radius: 20px;
}

.gallery-track {
  display: grid;
  gap: 14px;
  animation: gallery-marquee 32s linear infinite;
  will-change: transform;
}

.gallery-column.reverse .gallery-track {
  animation-direction: reverse;
  animation-duration: 36s;
}

.gallery-board:hover .gallery-track {
  animation-play-state: paused;
}

.gallery-tile {
  position: relative;
  min-height: 180px;
  height: 180px;
  overflow: hidden;
  border-radius: 20px;
  background: #d7e3ea;
  isolation: isolate;
}

.gallery-tile.tall {
  height: 280px;
}

.gallery-tile::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.04) 0%, rgba(15, 23, 42, 0.72) 100%);
  z-index: 1;
}

.gallery-tile img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transform: scale(1.02);
}

.gallery-overlay {
  position: absolute;
  inset: auto 0 0 0;
  z-index: 2;
  display: grid;
  gap: 4px;
  padding: 16px;
  color: #ffffff;
}

.gallery-overlay strong {
  font-size: 0.98rem;
  line-height: 1.3;
}

.gallery-overlay span {
  font-size: 0.82rem;
  line-height: 1.45;
  color: rgba(255, 255, 255, 0.84);
}

@keyframes gallery-marquee {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(calc(-50% - 7px));
  }
}

.service-scroll {
  display: flex;
  flex-wrap: nowrap;
  gap: 18px;
  width: 100%;
  box-sizing: border-box;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 10px;
  padding-inline: 4px;
  scroll-snap-type: x proximity;
  overscroll-behavior-x: contain;
  -webkit-overflow-scrolling: touch;
}

.service-scroll::-webkit-scrollbar {
  height: 10px;
}

.service-scroll::-webkit-scrollbar-track {
  background: #e8eef4;
  border-radius: 999px;
}

.service-scroll::-webkit-scrollbar-thumb {
  background: #bfd3df;
  border-radius: 999px;
}

.service-card {
  flex: 0 0 320px;
  overflow: hidden;
  border: 1px solid #e3ecf2;
  border-radius: 18px;
  background: #ffffff;
  display: grid;
  min-width: 0;
  scroll-snap-align: start;
}

.service-media {
  position: relative;
  aspect-ratio: 4 / 3;
  background: #e2e8f0;
}

.service-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.service-id {
  position: absolute;
  top: 14px;
  left: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(15, 118, 110, 0.92);
  color: #ffffff;
  font-size: 0.8rem;
  font-weight: 800;
}

.service-body {
  padding: 16px 16px 18px;
  display: grid;
  gap: 10px;
}

.service-card-top {
  display: grid;
  gap: 6px;
}

.service-price {
  color: #0f172a;
  font-weight: 800;
}

.empty-state {
  min-height: 160px;
  display: grid;
  place-items: center;
  text-align: center;
  color: #526071;
}

.empty-state strong {
  color: #0f172a;
}

.clinic-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.clinic-card {
  padding: 18px;
  border: 1px solid #e3ecf2;
  border-radius: 16px;
  background: #f9fbfc;
  display: grid;
  grid-template-columns: 40px 1fr;
  gap: 12px;
  align-items: start;
}

.clinic-card small {
  display: block;
  margin-bottom: 6px;
  color: #64748b;
}

.clinic-card strong {
  line-height: 1.6;
}

.clinic-card.wide {
  grid-column: span 1;
}

.trust-section {
  padding-top: 2px;
}

.trust-panel {
  padding: 26px;
  background: linear-gradient(135deg, #0f172a 0%, #12324d 52%, #0f766e 100%);
  border-color: transparent;
}

.trust-panel .section-kicker,
.trust-panel p {
  color: rgba(255, 255, 255, 0.84);
}

.trust-panel h2 {
  margin-top: 10px;
  max-width: 18ch;
  color: #ffffff;
  line-height: 1.14;
}

.trust-panel p {
  margin-top: 12px;
  max-width: 66ch;
}

@media (max-width: 1100px) {
  .hero-section,
  .clinic-grid,
  .gallery-showcase {
    grid-template-columns: 1fr;
  }

  .hero-copy h1,
  .hero-copy h2 {
    max-width: 12ch;
    font-size: 3rem;
  }

  .gallery-copy h2 {
    max-width: none;
  }
}

@media (max-width: 860px) {
  .top-nav,
  .home-main {
    width: min(100% - 24px, 1180px);
  }

  .top-nav {
    flex-wrap: wrap;
  }

  .nav-links,
  .hero-actions {
    flex-wrap: wrap;
  }

  .hero-section,
  .hero-trust-row,
  .clinic-grid {
    grid-template-columns: 1fr;
  }

  .hero-gallery {
    grid-template-columns: 1fr;
  }

  .gallery-board {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    min-height: 440px;
    height: 440px;
  }

  .hero-section {
    padding: 20px;
  }

  .hero-copy h1,
  .hero-copy h2 {
    max-width: none;
  }

  .hero-photo,
  .hero-photo.small {
    min-height: 240px;
    aspect-ratio: 16 / 10;
  }
}

@media (max-width: 640px) {
  .top-nav,
  .nav-links,
  .hero-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .nav-links {
    gap: 12px;
  }

  .hero-copy h1,
  .hero-copy h2 {
    font-size: 2.35rem;
  }

  .content-section,
  .trust-panel,
  .gallery-showcase {
    padding: 18px;
  }

  .gallery-board {
    grid-template-columns: 1fr;
    min-height: 360px;
    height: 360px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .gallery-track {
    animation: none;
  }
}
</style>
