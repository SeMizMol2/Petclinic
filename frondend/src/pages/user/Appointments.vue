<template>
  <div class="appointments-page user-page">
    <section class="hero-section">
      <div>
        <p class="eyebrow">My appointments</p>
        <h1>การนัดหมายของฉัน</h1>
        <p class="hero-text">
          ตรวจสอบวัน เวลา และสถานะนัดหมายที่คลินิกบันทึกไว้สำหรับสัตว์เลี้ยงของคุณได้จากหน้านี้
        </p>
      </div>
    </section>

    <section v-if="appointments.length === 0" class="empty-section">
      <strong>ยังไม่มีรายการนัดหมาย</strong>
      <p>เมื่อนัดหมายถูกสร้างโดยคลินิก รายการทั้งหมดจะแสดงในส่วนนี้ทันที</p>
    </section>

    <section v-else class="summary-grid">
      <article class="summary-card">
        <span>รอยืนยัน</span>
        <strong>{{ pendingCount }}</strong>
        <p>นัดหมายที่ยังอยู่ระหว่างการตรวจสอบหรือรออัปเดตสถานะจากคลินิก</p>
      </article>

      <article class="summary-card">
        <span>ยืนยันแล้ว</span>
        <strong>{{ confirmedCount }}</strong>
        <p>นัดหมายที่พร้อมเข้ารับบริการตามวันและเวลาที่กำหนด</p>
      </article>

      <article class="summary-card">
        <span>ยกเลิก</span>
        <strong>{{ canceledCount }}</strong>
        <p>รายการที่ถูกยกเลิกหรือไม่สามารถเข้ารับบริการได้ตามกำหนดเดิม</p>
      </article>
    </section>

    <section v-if="appointments.length > 0" class="appointment-list">
      <article v-for="item in appointments" :key="item.appt_id" class="appointment-card">
        <div class="date-badge">
          <span>{{ getMonth(item.appt_date) }}</span>
          <strong>{{ getDay(item.appt_date) }}</strong>
        </div>

        <div class="appointment-main">
          <div class="top-row">
            <h2>{{ item.appt_reason || 'ไม่ได้ระบุเหตุผลการนัดหมาย' }}</h2>
            <span :class="['status-badge', statusClass(item.appt_status)]">
              {{ statusLabel(item.appt_status) }}
            </span>
          </div>

          <div class="appointment-meta">
            <span>สัตว์เลี้ยง: {{ item.pet_name || '-' }}</span>
            <span>เวลา: {{ formatTime(item.appt_time) }} น.</span>
          </div>

          <div v-if="item.cancel_reason" class="cancel-note">
            เหตุผลที่ยกเลิก: {{ item.cancel_reason }}
          </div>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'

const APPT_STATUS_PENDING = 'รอ'
const APPT_STATUS_CONFIRMED = 'ยืนยัน'
const APPT_STATUS_CANCELED = 'ยกเลิก'

const appointments = ref([])

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
})

const normalizeStatus = (value) => {
  const text = String(value || '').trim()
  if (text === APPT_STATUS_CANCELED) return APPT_STATUS_CANCELED
  if (text === APPT_STATUS_CONFIRMED) return APPT_STATUS_CONFIRMED
  return APPT_STATUS_PENDING
}

const statusClass = (status) => {
  const normalized = normalizeStatus(status)
  if (normalized === APPT_STATUS_CONFIRMED) return 'confirmed'
  if (normalized === APPT_STATUS_CANCELED) return 'canceled'
  return 'pending'
}

const statusLabel = (status) => {
  const normalized = normalizeStatus(status)
  if (normalized === APPT_STATUS_CANCELED) return 'ยกเลิก'
  if (normalized === APPT_STATUS_CONFIRMED) return 'ยืนยัน'
  return 'รอยืนยัน'
}

const pendingCount = computed(() =>
  appointments.value.filter((item) => normalizeStatus(item.appt_status) === APPT_STATUS_PENDING).length
)

const confirmedCount = computed(() =>
  appointments.value.filter((item) => normalizeStatus(item.appt_status) === APPT_STATUS_CONFIRMED).length
)

const canceledCount = computed(() =>
  appointments.value.filter((item) => normalizeStatus(item.appt_status) === APPT_STATUS_CANCELED).length
)

const getDay = (dateStr) => {
  const date = new Date(dateStr)
  return Number.isNaN(date.getTime()) ? '-' : date.getDate()
}

const getMonth = (dateStr) => {
  const date = new Date(dateStr)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('th-TH', { month: 'short' })
}

const formatTime = (timeStr) => (timeStr ? String(timeStr).slice(0, 5) : '-')

const loadAppointments = async () => {
  const userData = JSON.parse(localStorage.getItem('user') || 'null')
  if (!userData?.user_id) return

  const response = await axios.get(
    `http://localhost:3000/api/appointments/my-appointments/${userData.user_id}`,
    authHeaders()
  )

  if (response.data?.success) {
    appointments.value = (response.data.data || []).map((item) => ({
      ...item,
      appt_status: normalizeStatus(item.appt_status)
    }))
  }
}

onMounted(async () => {
  try {
    await loadAppointments()
  } catch (error) {
    console.error('load user appointments page error:', error)
    alert('ไม่สามารถโหลดข้อมูลนัดหมายได้')
  }
})
</script>

<style scoped>
.appointments-page {
  display: grid;
  gap: 20px;
}

.hero-section,
.summary-card,
.empty-section,
.appointment-card {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(217, 226, 236, 0.92);
  border-radius: 20px;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.05);
}

.hero-section {
  padding: 28px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
}

.eyebrow {
  margin: 0 0 8px;
  color: #0f766e;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-section h1,
.appointment-main h2 {
  margin: 0;
  color: #0f172a;
}

.hero-text {
  margin: 10px 0 0;
  color: #64748b;
  line-height: 1.7;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.summary-card,
.empty-section {
  padding: 22px;
}

.summary-card span {
  display: block;
  color: #64748b;
  font-size: 13px;
}

.summary-card strong {
  display: block;
  margin-top: 8px;
  color: #0f172a;
  font-size: 32px;
}

.summary-card p,
.empty-section p {
  margin: 10px 0 0;
  color: #64748b;
  line-height: 1.6;
}

.empty-section {
  text-align: center;
}

.empty-section strong {
  display: block;
  color: #0f172a;
  font-size: 20px;
}

.appointment-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.appointment-card {
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 20px;
  align-items: start;
  padding: 20px;
}

.date-badge {
  background: linear-gradient(180deg, #ecfdf5 0%, #f0fdfa 100%);
  color: #0f766e;
  border-radius: 16px;
  padding: 15px 10px;
  text-align: center;
  border: 1px solid rgba(20, 184, 166, 0.14);
}

.date-badge span {
  display: block;
  font-size: 12px;
  font-weight: 700;
}

.date-badge strong {
  display: block;
  font-size: 28px;
  margin-top: 4px;
}

.top-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.appointment-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 18px;
  margin-top: 8px;
  color: #475569;
}

.cancel-note {
  margin-top: 12px;
  color: #be123c;
  font-size: 13px;
  font-weight: 700;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}

.status-badge.confirmed {
  background: #dcfce7;
  color: #166534;
}

.status-badge.pending {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.canceled {
  background: #fee2e2;
  color: #b91c1c;
}

@media (max-width: 860px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .hero-section,
  .top-row {
    flex-direction: column;
  }

  .appointment-card {
    grid-template-columns: 1fr;
  }
}
</style>
