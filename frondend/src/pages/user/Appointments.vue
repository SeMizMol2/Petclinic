<template>
  <div class="appointments-page user-page">
    <section class="hero-section">
      <div>
        <p class="eyebrow">My appointments</p>
        <h1>นัดหมายของฉัน</h1>
        <p class="hero-text">
          จองคิวด้วยตัวเอง เลือกสัตว์เลี้ยง วัน เวลา และติดตามสถานะการยืนยันจากคลินิกได้ในหน้าเดียว
        </p>
      </div>

      <button type="button" class="primary-btn" @click="openBookingModal" :disabled="pets.length === 0">
        จองนัดหมายใหม่
      </button>
    </section>

    <section v-if="pets.length === 0" class="empty-section">
      <strong>ยังไม่มีสัตว์เลี้ยงในระบบ</strong>
      <p>เพิ่มข้อมูลสัตว์เลี้ยงก่อน เพื่อใช้ในการจองนัดหมายกับคลินิก</p>
      <router-link to="/user/pets/add" class="primary-link">เพิ่มสัตว์เลี้ยง</router-link>
    </section>

    <section v-else class="summary-grid">
      <article class="summary-card">
        <span>รอยืนยัน</span>
        <strong>{{ pendingCount }}</strong>
        <p>คำขอนัดหมายที่กำลังรอคลินิกตรวจสอบ</p>
      </article>

      <article class="summary-card">
        <span>ยืนยันแล้ว</span>
        <strong>{{ confirmedCount }}</strong>
        <p>นัดหมายที่พร้อมเข้ารับบริการตามเวลาที่กำหนด</p>
      </article>

      <article class="summary-card">
        <span>ยกเลิก</span>
        <strong>{{ canceledCount }}</strong>
        <p>รายการที่ถูกยกเลิกหรือไม่สามารถเข้ารับบริการได้</p>
      </article>
    </section>

    <section v-if="appointments.length === 0 && pets.length > 0" class="empty-section">
      <strong>ยังไม่มีรายการนัดหมาย</strong>
      <p>เมื่อจองคิวแล้ว รายการนัดหมายทั้งหมดจะแสดงในส่วนนี้ทันที</p>
    </section>

    <section v-else class="appointment-list">
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

    <Teleport to="body">
      <div v-if="isModalOpen" class="modal-overlay" @click.self="closeBookingModal">
        <div class="modal-card">
          <div class="modal-header">
            <div>
              <p class="eyebrow">Booking request</p>
              <h2>จองนัดหมายใหม่</h2>
              <p>เลือกสัตว์เลี้ยง วัน เวลา และระบุอาการเบื้องต้นเพื่อส่งคำขอไปยังคลินิก</p>
            </div>
            <button type="button" class="close-btn" @click="closeBookingModal">ปิด</button>
          </div>

          <form class="modal-body" @submit.prevent="submitAppointment">
            <label class="field-wrap">
              <span>สัตว์เลี้ยง *</span>
              <select v-model="form.pet_id" required>
                <option value="">เลือกสัตว์เลี้ยง</option>
                <option v-for="pet in pets" :key="pet.pet_id" :value="pet.pet_id">
                  {{ pet.pet_name }}{{ pet.pet_type ? ` • ${pet.pet_type}` : '' }}
                </option>
              </select>
            </label>

            <div class="field-grid">
              <label class="field-wrap">
                <span>วันที่นัดหมาย *</span>
                <input v-model="form.appt_date" type="date" :min="todayValue" required />
              </label>

              <label class="field-wrap">
                <span>เวลานัดหมาย *</span>
                <input v-model="form.appt_time" type="time" required />
              </label>
            </div>

            <label class="field-wrap">
              <span>เหตุผล / อาการเบื้องต้น</span>
              <textarea
                v-model="form.appt_reason"
                rows="4"
                placeholder="เช่น ซึม ไม่กินอาหาร มีอาการคัน หรือมาตรวจติดตามอาการ"
              ></textarea>
            </label>

            <div class="modal-actions">
              <button type="button" class="ghost-btn" @click="closeBookingModal">ยกเลิก</button>
              <button type="submit" class="primary-btn" :disabled="isSubmitting">
                {{ isSubmitting ? 'กำลังส่งคำขอ...' : 'ยืนยันการจอง' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'

const APPT_STATUS_PENDING = 'รอ'
const APPT_STATUS_CONFIRMED = 'ยืนยัน'
const APPT_STATUS_CANCELED = 'ยกเลิก'

const appointments = ref([])
const pets = ref([])
const isModalOpen = ref(false)
const isSubmitting = ref(false)

const todayValue = new Date().toLocaleDateString('en-CA')

const form = ref({
  pet_id: '',
  appt_date: '',
  appt_time: '',
  appt_reason: ''
})

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

const resetForm = () => {
  form.value = {
    pet_id: pets.value[0]?.pet_id || '',
    appt_date: '',
    appt_time: '',
    appt_reason: ''
  }
}

const loadPets = async () => {
  const response = await axios.get('http://localhost:3000/api/pets', authHeaders())
  pets.value = Array.isArray(response.data) ? response.data : []
  if (!form.value.pet_id && pets.value.length > 0) {
    form.value.pet_id = pets.value[0].pet_id
  }
}

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

const openBookingModal = () => {
  resetForm()
  isModalOpen.value = true
}

const closeBookingModal = () => {
  isModalOpen.value = false
  isSubmitting.value = false
}

const submitAppointment = async () => {
  try {
    isSubmitting.value = true
    const response = await axios.post('http://localhost:3000/api/appointments/self', form.value, authHeaders())

    alert(response.data?.email_notification?.message
      ? `ส่งคำขอนัดหมายเรียบร้อย\n${response.data.email_notification.message}`
      : 'ส่งคำขอนัดหมายเรียบร้อย')

    closeBookingModal()
    await loadAppointments()
  } catch (error) {
    console.error('submitAppointment error:', error)
    alert(error.response?.data?.message || 'ไม่สามารถจองนัดหมายได้')
  } finally {
    isSubmitting.value = false
  }
}

onMounted(async () => {
  try {
    await loadPets()
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
.appointment-card,
.modal-card {
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
.modal-header h2,
.appointment-main h2 {
  margin: 0;
  color: #0f172a;
}

.hero-text,
.modal-header p {
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

.primary-btn,
.primary-link,
.ghost-btn,
.close-btn {
  min-height: 46px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 18px;
  font-weight: 700;
  border: 1px solid transparent;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.primary-btn,
.primary-link {
  background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);
  color: #ffffff;
  box-shadow: 0 14px 30px rgba(15, 118, 110, 0.2);
  text-decoration: none;
}

.ghost-btn,
.close-btn {
  background: #ffffff;
  color: #0f172a;
  border-color: rgba(203, 213, 225, 0.85);
}

.primary-btn:hover,
.primary-link:hover,
.ghost-btn:hover,
.close-btn:hover {
  transform: translateY(-1px);
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

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.42);
  backdrop-filter: blur(3px);
  display: grid;
  place-items: center;
  padding: 20px;
  z-index: 40;
}

.modal-card {
  width: min(680px, 100%);
  padding: 24px;
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.modal-body {
  display: grid;
  gap: 16px;
  margin-top: 20px;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.field-wrap {
  display: grid;
  gap: 8px;
}

.field-wrap span {
  color: #334155;
  font-size: 14px;
  font-weight: 700;
}

.field-wrap input,
.field-wrap select,
.field-wrap textarea {
  width: 100%;
  border: 1px solid rgba(203, 213, 225, 0.9);
  border-radius: 14px;
  padding: 13px 14px;
  background: #ffffff;
  color: #0f172a;
  font: inherit;
  outline: none;
}

.field-wrap input:focus,
.field-wrap select:focus,
.field-wrap textarea:focus {
  border-color: rgba(20, 184, 166, 0.65);
  box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.12);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 8px;
}

@media (max-width: 860px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .hero-section,
  .top-row,
  .field-grid,
  .modal-header,
  .modal-actions {
    grid-template-columns: 1fr;
    flex-direction: column;
  }

  .appointment-card {
    grid-template-columns: 1fr;
  }

  .primary-btn,
  .ghost-btn,
  .close-btn,
  .primary-link {
    width: 100%;
  }
}
</style>
