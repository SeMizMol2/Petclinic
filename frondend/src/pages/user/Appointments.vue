<template>
  <div class="appointments-page user-page">
    <section class="hero-section">
      <div>
        <p class="eyebrow">My schedule</p>
        <h1>การนัดหมายของฉัน</h1>
        <p class="hero-text">ตรวจสอบวัน เวลา เหตุผลการนัดหมาย และสถานะการยืนยันจากคลินิกได้แบบรวดเร็ว</p>
      </div>
    </section>

    <section v-if="appointments.length === 0" class="empty-section">
      <strong>ยังไม่มีการนัดหมาย</strong>
      <p>เมื่อมีการจองนัดหมาย รายการต่างๆ จะแสดงในหน้านี้</p>
    </section>

    <section v-else class="appointment-list">
      <article v-for="item in appointments" :key="item.appt_id" class="appointment-card">
        <div class="date-badge">
          <span>{{ getMonth(item.appt_date) }}</span>
          <strong>{{ getDay(item.appt_date) }}</strong>
        </div>

        <div class="appointment-main">
          <h2>{{ item.appt_reason || 'ไม่ระบุเหตุผลการนัดหมาย' }}</h2>
          <div class="appointment-meta">
            <span>สัตว์เลี้ยง: {{ item.pet_name || '-' }}</span>
            <span>เวลา: {{ formatTime(item.appt_time) }} น.</span>
          </div>
          <div v-if="item.cancel_reason" class="cancel-note">
            เหตุผลที่ยกเลิก: {{ item.cancel_reason }}
          </div>
        </div>

        <div class="status-area">
          <span :class="['status-badge', item.appt_status === 'ยืนยัน' ? 'confirmed' : 'pending']">
            {{ item.appt_status || 'รอยืนยัน' }}
          </span>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import axios from 'axios'

const appointments = ref([])

const getDay = (dateStr) => {
  const date = new Date(dateStr)
  return Number.isNaN(date.getTime()) ? '-' : date.getDate()
}

const getMonth = (dateStr) => {
  const date = new Date(dateStr)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('th-TH', { month: 'short' })
}

const formatTime = (timeStr) => (timeStr ? String(timeStr).substring(0, 5) : '-')

const loadAppointments = async () => {
  try {
    const token = localStorage.getItem('token')
    const userData = JSON.parse(localStorage.getItem('user'))
    if (!userData || !token) return

    const response = await axios.get(`http://localhost:3000/api/appointments/my-appointments/${userData.user_id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (response.data?.success) {
      appointments.value = response.data.data || []
    }
  } catch (error) {
    console.error('loadAppointments error:', error)
    alert('ไม่สามารถโหลดข้อมูลการนัดหมายได้')
  }
}

onMounted(loadAppointments)
</script>

<style scoped>
.appointments-page {
  display: grid;
  gap: 20px;
}

.hero-section,
.empty-section,
.appointment-card {
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(217, 226, 236, 0.92);
  border-radius: 18px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.05);
}

.hero-section {
  padding: 28px;
}

.eyebrow {
  margin: 0 0 8px;
  color: #0f766e;
  font-size: 12px;
  font-weight: 700;
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

.empty-section {
  padding: 40px 24px;
  text-align: center;
}

.empty-section strong {
  display: block;
  color: #0f172a;
  font-size: 20px;
}

.empty-section p {
  margin: 10px 0 0;
  color: #64748b;
}

.appointment-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.appointment-card {
  display: grid;
  grid-template-columns: 96px 1fr auto;
  gap: 20px;
  align-items: center;
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

.appointment-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 18px;
  margin-top: 8px;
  color: #475569;
}

.cancel-note {
  margin-top: 10px;
  color: #be123c;
  font-size: 13px;
  font-weight: 700;
}

.status-area {
  display: flex;
  justify-content: flex-end;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 7px 11px;
  font-size: 12px;
  font-weight: 700;
}

.confirmed {
  background: #dcfce7;
  color: #166534;
}

.pending {
  background: #fef3c7;
  color: #92400e;
}

@media (max-width: 720px) {
  .appointment-card {
    grid-template-columns: 1fr;
  }

  .status-area {
    justify-content: flex-start;
  }
}
</style>
