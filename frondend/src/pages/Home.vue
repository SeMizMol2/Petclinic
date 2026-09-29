<template>
  <div class="home-page">
    <header class="top-nav">
      <div class="brand">
        <div class="brand-mark">
          <AppIcon name="paw" :size="24" />
        </div>
        <div class="brand-copy">
          <strong>{{ clinic.clinic_name || 'โรงพยาบาลสัตว์เมืองเลย' }}</strong>
          <span>ระบบจัดการข้อมูลการรักษาและบริการสัตว์เลี้ยง</span>
        </div>
      </div>

      <nav class="nav-links">
        <a href="#services">บริการ</a>
        <a href="#pet-care">ความรู้สัตว์เลี้ยง</a>
        <a href="#contact">ติดต่อ</a>
      </nav>

      <div class="nav-account-actions">
        <router-link to="/register" class="nav-secondary-button">สมัครสมาชิก</router-link>
        <router-link to="/login" class="nav-solid-button">เข้าสู่ระบบ</router-link>
      </div>
    </header>

    <main class="home-main">
      <section class="hero-section">
        <div class="hero-copy">
          <h1>โรงพยาบาลสัตว์เมืองเลย</h1>
          <p class="hero-description">
            ให้บริการดูแลสัตว์เลี้ยง พร้อมระบบสำหรับตรวจสอบข้อมูลสัตว์เลี้ยง นัดหมาย
            ประวัติการรักษา และใบเสร็จของเจ้าของสัตว์เลี้ยง
          </p>
          <div class="hero-actions">
            <router-link to="/login" class="primary-button">เข้าสู่ระบบเพื่อขอนัดหมาย</router-link>
            <a href="#services" class="nav-secondary-button">ดูบริการของเรา</a>
          </div>
          <p class="appointment-note">เข้าสู่ระบบก่อนขอนัดหมาย และรอการยืนยันจากคลินิก</p>
        </div>
        <div class="hero-gallery">
          <article class="hero-photo large">
            <img src="/images/clinic-gallery/รูปภาพ1.png" :alt="`ภาพหน้า ${clinic.clinic_name || 'โรงพยาบาลสัตว์เมืองเลย'}`" fetchpriority="high" />
          </article>
        </div>
      </section>
          <section id="contact" class="hero-info-list" aria-label="ข้อมูลติดต่อโรงพยาบาล">
            <div class="hero-info-item">
              <span class="hero-info-icon"><AppIcon name="phone" :size="18" /></span>
              <div>
                <small>โทรศัพท์</small>
                <strong>{{ clinic.tel || 'ยังไม่ได้ระบุ' }}</strong>
              </div>
            </div>

            <div class="hero-info-item">
              <span class="hero-info-icon"><AppIcon name="history" :size="18" /></span>
              <div>
                <small>เวลาเปิดให้บริการ</small>
                <strong>{{ clinic.open_hours || 'ยังไม่ได้ระบุ' }}</strong>
              </div>
            </div>

            <div class="hero-info-item address">
              <span class="hero-info-icon"><AppIcon name="clinic" :size="18" /></span>
              <div>
                <small>ที่ตั้งโรงพยาบาล</small>
                <strong>{{ clinic.address || 'กรุณาตรวจสอบข้อมูลกับทางโรงพยาบาล' }}</strong>
              </div>
            </div>
          </section>

      <section class="gallery-showcase">
        <div class="gallery-copy">
          <h2>ภาพจากโรงพยาบาล</h2>
          <p>เคสบริการจริงและเคสตัวอย่าง</p>
        </div>

        <div
          class="gallery-slider"
          aria-roledescription="carousel"
          aria-label="เคสบริการของโรงพยาบาลสัตว์เมืองเลย"
          @mouseenter="stopGalleryAutoSlide"
          @mouseleave="startGalleryAutoSlide"
          @focusin="stopGalleryAutoSlide"
          @touchstart.passive="onGalleryTouchStart"
          @touchend.passive="onGalleryTouchEnd"
        >
          <div
            class="gallery-slide-track"
            :class="{ 'without-transition': !galleryTransitionEnabled }"
            :style="{ transform: `translateX(-${galleryPosition * 100}%)` }"
            @transitionend="handleGalleryTransitionEnd"
          >
            <article
              v-for="(item, itemIndex) in gallerySlides"
              :key="`${item.id}-${itemIndex}`"
              class="gallery-slide"
              :aria-hidden="galleryPosition !== itemIndex"
            >
              <img :src="item.src" :alt="item.title" loading="lazy" />
              <div class="gallery-slide-title">{{ item.title }}</div>
            </article>
          </div>

          <button
            type="button"
            class="gallery-control previous"
            title="ภาพก่อนหน้า"
            aria-label="ดูภาพก่อนหน้า"
            @click="previousGallery"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg>
          </button>
          <button
            type="button"
            class="gallery-control next"
            title="ภาพถัดไป"
            aria-label="ดูภาพถัดไป"
            @click="nextGallery"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
          </button>

          <div class="gallery-dots" aria-label="เลือกภาพ">
            <button
              v-for="(item, itemIndex) in clinicGallery"
              :key="`dot-${item.id}`"
              type="button"
              :class="{ active: currentGalleryIndex === itemIndex }"
              :aria-label="`ดูภาพที่ ${itemIndex + 1}`"
              :aria-current="currentGalleryIndex === itemIndex ? 'true' : undefined"
              @click="goToGallery(itemIndex)"
            />
          </div>
          <button type="button" class="gallery-pause" :aria-pressed="galleryPaused" @click="toggleGalleryPause">{{ galleryPaused ? 'เล่นภาพอัตโนมัติ' : 'หยุดภาพอัตโนมัติ' }}</button>
        </div>
      </section>

      <section id="services" class="content-section">
        <div class="section-head">
          <div>
            <h2>บริการของเรา</h2>
          </div>
          <p class="section-description">
            ดูรายละเอียดบริการและค่าบริการ ก่อนติดต่อหรือนัดหมายกับคลินิก
          </p>
        </div>

        <div v-if="services.length" class="service-scroll">
          <article v-for="service in serviceCards" :key="service.service_id" class="service-card">
            <div class="service-media">
              <img :src="service.image" :alt="service.service_name" loading="lazy" />
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

      <section id="pet-care" class="knowledge-section">
        <div class="knowledge-heading">
          <div>
            <h2>ดูแลให้ถูกวิธี สังเกตอาการได้เร็วขึ้น</h2>
          </div>
          <p>
            คำแนะนำเบื้องต้นสำหรับการดูแลสัตว์เลี้ยงในสถานการณ์ที่พบได้บ่อย
            หากมีอาการผิดปกติควรติดต่อสัตวแพทย์เพื่อรับการตรวจที่เหมาะสม
          </p>
        </div>

        <div class="knowledge-layout">
          <article class="knowledge-feature">
            <div class="knowledge-feature-media">
              <img
                src="https://images.unsplash.com/photo-1576201836106-db1758fd1c97?auto=format&fit=crop&w=1200&q=80"
                alt="สุนัขเตรียมเข้ารับการตรวจสุขภาพก่อนฉีดวัคซีน"
                loading="lazy"
              />
            </div>
            <div class="knowledge-feature-body">
              <span class="knowledge-icon"><AppIcon name="vaccine" :size="20" /></span>
              <div>
                <h3>เตรียมสัตว์เลี้ยงก่อนฉีดวัคซีน</h3>
                <p>
                  สัตว์เลี้ยงควรมีสุขภาพแข็งแรง ไม่มีไข้ อาเจียน หรือท้องเสีย
                  พร้อมนำสมุดวัคซีนเดิมมาให้สัตวแพทย์ตรวจสอบก่อนทุกครั้ง
                </p>
              </div>
            </div>
          </article>

          <div class="knowledge-list">
            <article class="knowledge-brief">
              <img
                src="https://images.unsplash.com/photo-1548681528-6a5c45b66b42?auto=format&fit=crop&w=900&q=80"
                alt="แมวที่เจ้าของควรสังเกตอาการผิดปกติ"
                loading="lazy"
              />
              <div>
                <span class="knowledge-icon"><AppIcon name="stethoscope" :size="19" /></span>
                <h3>อาการผิดปกติที่ไม่ควรรอดูเอง</h3>
                <p>หายใจลำบาก ซึมมาก ชัก อาเจียนซ้ำ ปัสสาวะไม่ได้ หรือไม่กินอาหาร ควรรีบพบสัตวแพทย์</p>
              </div>
            </article>

            <article class="knowledge-brief">
              <img
                src="https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&w=900&q=80"
                alt="สุนัขพักฟื้นและได้รับการดูแลหลังผ่าตัด"
                loading="lazy"
              />
              <div>
                <span class="knowledge-icon"><AppIcon name="surgery" :size="19" /></span>
                <h3>การดูแลหลังผ่าตัด</h3>
                <p>ป้องกันการเลียแผล รักษาแผลให้แห้ง ให้ยาตามกำหนด และกลับมาตรวจตามนัดของสัตวแพทย์</p>
              </div>
            </article>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import axios from 'axios'
import { resolveApiAssetUrl } from '../api'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AppIcon from '../components/AppIcon.vue'

const clinic = ref({})
const services = ref([])
const galleryPosition = ref(0)
const galleryTransitionEnabled = ref(true)
const galleryPaused = ref(false)
function toggleGalleryPause() {
  galleryPaused.value = !galleryPaused.value
  if (galleryPaused.value) stopGalleryAutoSlide()
  else startGalleryAutoSlide()
}

let galleryTimer = null
let galleryTouchStartX = 0

const clinicGallery = [
  {
    id: 'cg-01',
    src: '/images/clinic-gallery/clinic-01.png',
    title: 'เคสบริการจริง'
  },
  {
    id: 'cg-02',
    src: '/images/clinic-gallery/clinic-02.png',
    title: 'เคสบริการจริง'
  },
  {
    id: 'cg-03',
    src: '/images/clinic-gallery/clinic-03.png',
    title: 'เคสตัวอย่าง'
  },
  {
    id: 'cg-04',
    src: '/images/clinic-gallery/clinic-04.png',
    title: 'เคสบริการจริง'
  },
  {
    id: 'cg-05',
    src: '/images/clinic-gallery/clinic-05.png',
    title: 'เคสตัวอย่าง'
  }
]

const gallerySlides = computed(() => [...clinicGallery, clinicGallery[0]])
const currentGalleryIndex = computed(() => galleryPosition.value % clinicGallery.length)

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

function resolveServiceImage(service) {
  if (service.service_image) return resolveApiAssetUrl(service.service_image)

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

function stopGalleryAutoSlide() {
  if (galleryTimer) {
    window.clearInterval(galleryTimer)
    galleryTimer = null
  }
}

function startGalleryAutoSlide() {
  stopGalleryAutoSlide()

  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  if (clinicGallery.length > 1 && !reduceMotion && !galleryPaused.value) {
    galleryTimer = window.setInterval(nextGallery, 5200)
  }
}

function nextGallery() {
  if (galleryPosition.value >= clinicGallery.length) return

  galleryTransitionEnabled.value = true
  galleryPosition.value += 1
}

function previousGallery() {
  if (galleryPosition.value === 0) {
    galleryTransitionEnabled.value = false
    galleryPosition.value = clinicGallery.length

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        galleryTransitionEnabled.value = true
        galleryPosition.value = clinicGallery.length - 1
      })
    })
  } else {
    galleryTransitionEnabled.value = true
    galleryPosition.value -= 1
  }

  startGalleryAutoSlide()
}

function goToGallery(index) {
  galleryTransitionEnabled.value = true
  galleryPosition.value = index
  startGalleryAutoSlide()
}

function handleGalleryTransitionEnd() {
  if (galleryPosition.value === clinicGallery.length) {
    galleryTransitionEnabled.value = false
    galleryPosition.value = 0

    window.requestAnimationFrame(() => {
      galleryTransitionEnabled.value = true
    })
  }
}

function onGalleryTouchStart(event) {
  galleryTouchStartX = event.changedTouches?.[0]?.clientX || 0
  stopGalleryAutoSlide()
}

function onGalleryTouchEnd(event) {
  const touchEndX = event.changedTouches?.[0]?.clientX || 0
  const distance = touchEndX - galleryTouchStartX

  if (Math.abs(distance) >= 45) {
    if (distance < 0) {
      nextGallery()
    } else {
      previousGallery()
    }
  }

  startGalleryAutoSlide()
}

onMounted(async () => {
  startGalleryAutoSlide()

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

onBeforeUnmount(stopGalleryAutoSlide)
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  width: 100%;
  overflow-x: hidden;
  background:
    radial-gradient(circle at 12% 0%, rgba(20, 184, 166, 0.1), transparent 28%),
    linear-gradient(180deg, #f7fafc 0%, #edf3f6 100%);
  color: #0f172a;
}

.home-page * {
  box-sizing: border-box;
}

.top-nav,
.home-main {
  width: min(1200px, calc(100vw - 48px));
  margin: 0 auto;
}

.top-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 22px 0 14px;
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
  line-height: 1.25;
}

.brand-copy span {
  color: #526071;
  font-size: 0.94rem;
  line-height: 1.45;
}

.nav-links,
.nav-account-actions,
.hero-actions {
  display: flex;
  align-items: center;
}

.nav-links {
  gap: 28px;
}

.nav-account-actions {
  gap: 10px;
  flex-shrink: 0;
}

.nav-links a {
  color: #334155;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.18s ease;
}

.nav-links a:hover {
  color: #0f766e;
}

.nav-secondary-button {
  min-height: 46px;
  padding: 0 17px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #b9d7d3;
  border-radius: 14px;
  color: #0f766e;
  background: #ffffff;
  text-decoration: none;
  font-weight: 700;
  transition: border-color 0.18s ease, background 0.18s ease, color 0.18s ease;
}

.nav-secondary-button:hover {
  border-color: #0f766e;
  background: #eefaf8;
  color: #0b5e57;
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
  background: #0b5e57;
}

.home-main {
  display: grid;
  gap: 22px;
  padding-bottom: 44px;
}

.hero-section,
.content-section,
.knowledge-section {
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(214, 225, 235, 0.96);
  border-radius: 16px;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.045);
  overflow: hidden;
}

.hero-section {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(460px, 1.1fr);
  gap: 32px;
  padding: 32px;
  align-items: center;
  min-width: 0;
}

.hero-copy {
  display: grid;
  align-content: center;
  gap: 14px;
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
.knowledge-heading h2,
.knowledge-feature h3,
.knowledge-brief h3 {
  margin: 0;
  color: #0f172a;
}

.hero-copy h1 {
  max-width: 14ch;
  font-size: clamp(2.6rem, 4.5vw, 4.5rem);
  line-height: 1.06;
  text-wrap: balance;
}

.hero-copy h2 {
  max-width: 28ch;
  color: #0f766e;
  font-size: clamp(1.25rem, 1.8vw, 1.65rem);
  line-height: 1.4;
  text-wrap: balance;
}

.hero-description,
.section-description,
.service-card p {
  margin: 0;
  color: #526071;
  line-height: 1.65;
}

.hero-description,
.section-description {
  max-width: 72ch;
}

.hero-actions {
  gap: 12px;
}

.hero-info-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0;
  margin-top: 8px;
  border-top: 1px solid #dce6eb;
  border-bottom: 1px solid #dce6eb;
}

.hero-info-item {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  min-width: 0;
  padding: 14px 14px 14px 0;
}

.hero-info-item:nth-child(2) {
  padding-left: 16px;
  border-left: 1px solid #dce6eb;
}

.hero-info-item.address {
  grid-column: 1 / -1;
  padding-top: 12px;
  border-top: 1px solid #dce6eb;
}

.hero-info-icon,
.clinic-icon {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: #ecfdf5;
  color: #0f766e;
}

.hero-info-item small {
  display: block;
  margin-bottom: 2px;
  color: #64748b;
  font-size: 0.76rem;
  font-weight: 700;
}

.hero-info-item strong {
  display: block;
  overflow-wrap: anywhere;
  color: #1e293b;
  font-size: 0.94rem;
  line-height: 1.45;
}

.hero-gallery {
  display: block;
  align-items: stretch;
  min-width: 0;
  overflow: hidden;
}

.hero-photo {
  overflow: hidden;
  border-radius: 14px;
  min-height: 500px;
  background: #e2e8f0;
  aspect-ratio: 5 / 4;
}

.hero-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  display: block;
}

.hero-photo.large img {
  object-position: center;
}

.content-section {
  padding: 24px;
}

.section-head {
  display: grid;
  gap: 8px;
  margin-bottom: 18px;
}

.gallery-showcase {
  display: grid;
  grid-template-columns: minmax(220px, 0.48fr) minmax(0, 1.52fr);
  gap: 28px;
  padding: 24px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(214, 225, 235, 0.96);
  border-radius: 16px;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.045);
  overflow: hidden;
}

.gallery-copy {
  display: grid;
  align-content: center;
  gap: 10px;
}

.gallery-copy h2 {
  margin: 0;
  color: #0f172a;
  max-width: 12ch;
  font-size: clamp(1.85rem, 3.2vw, 2.85rem);
  line-height: 1.12;
  text-wrap: balance;
}

.gallery-slider {
  position: relative;
  min-width: 0;
  overflow: hidden;
  border-radius: 14px;
  background: #d7e3ea;
  aspect-ratio: 16 / 9;
  touch-action: pan-y;
}

.gallery-slide-track {
  display: flex;
  width: 100%;
  height: 100%;
  transition: transform 800ms cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform;
}

.gallery-slide-track.without-transition {
  transition: none;
}

.gallery-slide {
  position: relative;
  flex: 0 0 100%;
  min-width: 100%;
  height: 100%;
  isolation: isolate;
}

.gallery-slide::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 52%, rgba(15, 23, 42, 0.76) 100%);
  z-index: 1;
}

.gallery-slide img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.gallery-slide-title {
  position: absolute;
  inset: auto 72px 0 0;
  z-index: 2;
  padding: 22px;
  color: #ffffff;
  font-size: clamp(1.1rem, 2vw, 1.45rem);
  font-weight: 800;
  line-height: 1.3;
}

.gallery-control {
  position: absolute;
  z-index: 3;
  top: 50%;
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.92);
  color: #0f172a;
  font-family: inherit;
  font-size: 2rem;
  line-height: 1;
  cursor: pointer;
  transform: translateY(-50%);
  transition: background 0.18s ease, color 0.18s ease;
}

.gallery-control:hover {
  background: #0f766e;
  color: #ffffff;
}

.gallery-control.previous {
  left: 14px;
}

.gallery-control.next {
  right: 14px;
}

.gallery-dots {
  position: absolute;
  z-index: 3;
  right: 20px;
  bottom: 22px;
  display: flex;
  gap: 7px;
}

.gallery-dots button {
  width: 8px;
  height: 8px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.55);
  cursor: pointer;
  transition: background 0.2s ease;
}

.gallery-dots button.active {
  width: 22px;
  border-radius: 999px;
  background: #ffffff;
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
  scrollbar-gutter: stable;
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
  flex: 0 0 304px;
  overflow: hidden;
  border: 1px solid #e3ecf2;
  border-radius: 16px;
  background: #ffffff;
  display: grid;
  min-width: 0;
  scroll-snap-align: start;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.service-card:hover {
  transform: translateY(-2px);
  border-color: #cfe1ea;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
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

.knowledge-section {
  padding: 26px;
}

.knowledge-heading {
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(300px, 0.65fr);
  justify-content: space-between;
  gap: 32px;
  align-items: end;
  margin-bottom: 20px;
}

.knowledge-heading h2 {
  margin-top: 4px;
  font-size: clamp(1.8rem, 3vw, 2.65rem);
  line-height: 1.2;
  text-wrap: balance;
}

.knowledge-heading > p {
  margin: 0;
  color: #526071;
  line-height: 1.65;
}

.knowledge-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(340px, 0.92fr);
  gap: 18px;
}

.knowledge-feature {
  display: grid;
  grid-template-rows: minmax(270px, 1fr) auto;
  min-height: 480px;
  overflow: hidden;
  border-radius: 14px;
  background: #0f766e;
}

.knowledge-feature-media {
  min-height: 0;
}

.knowledge-feature-media img,
.knowledge-brief > img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.knowledge-feature-body {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 14px;
  padding: 22px;
  color: #ffffff;
}

.knowledge-feature h3 {
  color: #ffffff;
  font-size: 1.35rem;
  line-height: 1.35;
}

.knowledge-feature p,
.knowledge-brief p {
  margin: 7px 0 0;
  line-height: 1.62;
}

.knowledge-feature p {
  color: rgba(255, 255, 255, 0.84);
}

.knowledge-icon {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: #ecfdf5;
  color: #0f766e;
}

.knowledge-list {
  display: grid;
  grid-template-rows: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.knowledge-brief {
  display: grid;
  grid-template-columns: minmax(130px, 0.72fr) minmax(0, 1.28fr);
  min-height: 0;
  overflow: hidden;
  border: 1px solid #dfe8ed;
  border-radius: 14px;
  background: #f9fbfc;
}

.knowledge-brief > div {
  padding: 18px;
}

.knowledge-brief h3 {
  margin-top: 12px;
  font-size: 1.08rem;
  line-height: 1.4;
}

.knowledge-brief p {
  color: #526071;
}

@media (max-width: 1100px) {
  .hero-section,
  .gallery-showcase,
  .knowledge-heading,
  .knowledge-layout {
    grid-template-columns: 1fr;
  }

  .knowledge-feature {
    min-height: 440px;
  }

  .hero-copy h1 {
    max-width: 18ch;
    font-size: clamp(2.45rem, 6vw, 3.4rem);
  }

  .hero-copy h2 {
    max-width: 30ch;
    font-size: clamp(1.2rem, 2.4vw, 1.55rem);
  }

  .gallery-copy h2 {
    max-width: none;
  }

  .gallery-slider {
    width: 100%;
  }
}

@media (max-width: 860px) {
  .top-nav,
  .home-main {
    width: min(100vw - 24px, 1180px);
  }

  .top-nav {
    flex-wrap: wrap;
  }

  .nav-links,
  .nav-account-actions,
  .hero-actions {
    flex-wrap: wrap;
  }

  .hero-section,
  .hero-info-list {
    grid-template-columns: 1fr;
  }

  .hero-info-item:nth-child(2) {
    padding-left: 0;
    border-left: 0;
    border-top: 1px solid #dce6eb;
  }

  .hero-info-item.address {
    grid-column: auto;
  }

  .hero-gallery {
    grid-template-columns: 1fr;
  }

  .hero-section {
    padding: 22px;
  }

  .hero-copy h1 {
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

  .hero-copy h1 {
    font-size: 2.15rem;
    line-height: 1.16;
  }

  .hero-copy h2 {
    font-size: 1.15rem;
    line-height: 1.5;
  }

  .brand-copy span,
  .nav-links {
    display: none;
  }

  .nav-account-actions {
    width: 100%;
    flex-direction: row;
    flex-wrap: nowrap;
  }

  .nav-account-actions .nav-secondary-button,
  .nav-account-actions .nav-solid-button {
    flex: 1 1 0;
    width: auto;
    white-space: nowrap;
  }

  .primary-button {
    width: 100%;
  }

  .content-section,
  .knowledge-section,
  .gallery-showcase {
    padding: 18px;
  }

  .knowledge-feature {
    min-height: 360px;
  }

  .knowledge-brief {
    grid-template-columns: 1fr;
  }

  .knowledge-brief > img {
    height: auto;
    aspect-ratio: 16 / 9;
  }

  .knowledge-feature-body {
    padding: 18px;
  }

  .knowledge-brief > div {
    padding: 16px;
  }

  .service-card {
    flex-basis: min(82vw, 304px);
  }

  .gallery-showcase {
    gap: 16px;
  }

  .gallery-slider {
    aspect-ratio: 4 / 3;
  }

  .gallery-slide-title {
    inset: auto 56px 0 0;
    padding: 16px;
    font-size: 1.05rem;
  }

  .gallery-control {
    width: 36px;
    height: 36px;
    font-size: 1.7rem;
  }

  .gallery-control.previous {
    left: 10px;
  }

  .gallery-control.next {
    right: 10px;
  }

  .gallery-dots {
    right: 14px;
    bottom: 17px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .gallery-slide-track {
    transition: none;
  }
}
</style>

<style scoped>
.home-page { background: #f7f8f6; color: #122f3e; }
.top-nav, .home-main { width: min(1240px, calc(100% - 64px)); }
.top-nav { padding: 22px 0; gap: 24px; border-bottom: 1px solid #dce5e7; }
.brand { gap: 10px; min-width: 0; }
.brand-mark { width: 40px; height: 40px; background: transparent; color: #122f3e; border-radius: 0; box-shadow: none; flex: none; }
.brand-copy strong { font-size: 19px; color: #122f3e; }
.brand-copy span { display: none; }
.nav-links { gap: 22px; font-size: 14px; }
.nav-secondary-button, .nav-solid-button, .primary-button { border-radius: 8px; box-shadow: none; font-size: 14px; min-height: 46px; }
.nav-solid-button:hover, .primary-button:hover { transform: none; }
.home-main { gap: 0; }
.home-page .hero-section { padding: 38px 0 32px; grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr); gap: 40px; background: transparent; border: 0; border-radius: 0; box-shadow: none; }
.hero-copy { gap: 20px; }
.hero-copy h1 { color: #122f3e; font-size: clamp(34px, 3.8vw, 54px); line-height: 1.3; max-width: none; }
.hero-description { font-size: 16px; color: #526575; line-height: 1.85; }
.hero-actions { flex-wrap: wrap; gap: 12px; }
.appointment-note { margin: -6px 0 0; color: #526575; font-size: 12px; line-height: 1.7; }
.hero-photo { min-height: 0; height: auto; aspect-ratio: 1.2; border-radius: 12px; margin: 0; }
.hero-photo img { object-fit: cover; }
.hero-info-list { grid-template-columns: repeat(3, minmax(0, 1fr)); margin: 0; padding: 14px 0; background: #fff; border: 0; border-top: 1px solid #dce5e7; border-bottom: 1px solid #dce5e7; scroll-margin-top: 24px; }
.hero-info-item { padding: 8px 20px; align-items: start; }
.hero-info-item:nth-child(2), .hero-info-item.address { padding: 8px 20px; grid-column: auto; border-top: 0; border-left: 1px solid #dce5e7; }
.hero-info-icon { background: transparent; color: #122f3e; }
.hero-info-item small { color: #526575; font-size: 12px; }
.hero-info-item strong { font-size: 14px; font-weight: 600; }
.home-page .content-section { order: 1; padding: 40px 0; background: transparent; border: 0; border-radius: 0; box-shadow: none; scroll-margin-top: 24px; }
.section-head { display: flex; align-items: baseline; justify-content: space-between; gap: 24px; }
.section-head h2, .knowledge-heading h2 { font-size: 27px; color: #122f3e; }
.section-description { font-size: 13px; max-width: 50ch; }
.service-scroll { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; overflow: visible; }
.home-page .service-card { min-width: 0; background: transparent; border: 0; border-radius: 0; box-shadow: none; }
.service-media { border-radius: 10px; overflow: hidden; aspect-ratio: 1.8; }
.service-media img { width: 100%; height: 100%; object-fit: cover; }
.service-body { padding: 16px 0 0; }
.service-card-top { flex-wrap: wrap; gap: 8px; }
.service-card h3 { font-size: 18px; }
.service-card p { font-size: 13px; margin-top: 8px; }
.service-price { font-size: 14px; white-space: nowrap; }
.home-page .gallery-showcase { order: 2; grid-template-columns: minmax(0, .7fr) minmax(0, 1fr); padding: 28px 0; border: 0; border-top: 1px solid #dce5e7; border-radius: 0; box-shadow: none; background: transparent; align-items: center; }
.gallery-copy h2 { font-size: 28px; line-height: 1.4; max-width: none; }
.gallery-copy p { margin: 0; color: #526575; line-height: 1.7; }
.gallery-slider { aspect-ratio: 2; }
.gallery-pause { position: absolute; z-index: 4; top: 12px; right: 12px; min-height: 36px; padding: 6px 12px; border: 0; border-radius: 8px; background: #fff; color: #122f3e; font: inherit; font-size: 12px; }
.gallery-dots button { width: 24px; height: 24px; border: 6px solid transparent; background-clip: padding-box; }
.gallery-dots button.active { width: 32px; }
.home-page .knowledge-section { order: 3; padding: 36px 0 44px; border: 0; border-top: 1px solid #dce5e7; border-radius: 0; box-shadow: none; background: transparent; scroll-margin-top: 24px; }
.home-page .knowledge-feature, .home-page .knowledge-brief { box-shadow: none; }
a:focus-visible, button:focus-visible { outline: 3px solid #4caaa1; outline-offset: 4px; }
@media (max-width: 900px) {
  .top-nav { flex-wrap: wrap; gap: 14px; }
  .nav-links { order: 3; width: 100%; justify-content: flex-start; }
  .home-page .hero-section { gap: 24px; }
  .hero-actions a { width: 100%; }
  .service-scroll { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 600px) {
  .top-nav, .home-main { width: calc(100% - 32px); }
  .top-nav { padding: 16px 0; }
  .brand-copy strong { font-size: 16px; }
  .brand-mark { width: 30px; height: 30px; }
  .nav-account-actions { width: 100%; justify-content: flex-start; }
  .nav-links { gap: 22px; font-size: 13px; }
  .home-page .hero-section { grid-template-columns: 1fr; padding: 28px 0 24px; }
  .hero-copy h1 { font-size: 34px; }
  .hero-description { font-size: 14px; }
  .hero-actions { flex-direction: column; align-items: stretch; }
  .hero-photo { aspect-ratio: 1.3; }
  .hero-info-list { grid-template-columns: 1fr; padding: 0 14px; }
  .hero-info-item, .hero-info-item:nth-child(2), .hero-info-item.address { padding: 16px 0; border-left: 0; }
  .hero-info-item + .hero-info-item { border-top: 1px solid #dce5e7; }
  .section-head { flex-direction: column; gap: 10px; }
  .service-scroll { grid-template-columns: 1fr; gap: 24px; }
  .service-card { display: grid; grid-template-columns: 104px minmax(0, 1fr); gap: 14px; align-items: start; }
  .service-media { aspect-ratio: 1; }
  .service-body { padding: 0; }
  .service-card h3 { font-size: 16px; }
  .home-page .gallery-showcase { grid-template-columns: 1fr; gap: 16px; }
  .gallery-copy h2, .section-head h2, .knowledge-heading h2 { font-size: 24px; }
  .gallery-slider { aspect-ratio: 1.5; }
}
</style>
