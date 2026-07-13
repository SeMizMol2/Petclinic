<template>
  <div class="admin-page appointments-admin-page">
    <section class="page-header">
      <div>
        <p class="eyebrow">Appointment management</p>
        <h1>จัดการตารางนัดหมาย</h1>
        <p class="subtitle">
          จัดการคิวนัดหมายของคลินิก สร้างนัดใหม่ แก้ไขเวลา และอัปเดตสถานะการนัดหมายจากหน้าเดียว
        </p>
      </div>
      <button @click="openAddModal" class="primary-btn" type="button">เพิ่มการนัดหมาย</button>
    </section>

    <section class="toolbar">
      <div class="filter-pills">
        <button
          v-for="filter in filters"
          :key="filter.value"
          @click="statusFilter = filter.value"
          :class="['pill-btn', statusFilter === filter.value ? 'active' : '']"
          type="button"
        >
          {{ filter.label }}
        </button>
      </div>
    </section>

    <section class="table-panel">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>วันและเวลา</th>
              <th>สัตว์เลี้ยง</th>
              <th>เหตุผล / อาการ</th>
              <th>สถานะ</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="apt in filteredAppointments"
              :key="`${apt.appt_id}-${apt.appt_date}-${apt.appt_time}-${apt.appt_status}-${apt.cancel_reason || ''}`"
            >
              <td>
                <div class="date-cell">
                  <div class="date-block">
                    <span class="month">{{ getShortMonth(apt.appt_date) }}</span>
                    <strong>{{ getDay(apt.appt_date) }}</strong>
                  </div>
                  <div>
                    <div class="primary-line">{{ formatFullDate(apt.appt_date) }}</div>
                    <div class="secondary-line">{{ formatTime(apt.appt_time) }} น.</div>
                  </div>
                </div>
              </td>
              <td>
                <div class="pet-cell">
                  <div class="pet-avatar" :style="{ backgroundColor: getPetColor(apt.pet_name) }">
                    {{ getInitial(apt.pet_name) }}
                  </div>
                  <div>
                    <div class="primary-line">{{ apt.pet_name || 'ไม่พบข้อมูล' }}</div>
                    <div class="secondary-line">คุณ{{ apt.owner_name || 'ไม่ระบุ' }}</div>
                  </div>
                </div>
              </td>
              <td>
                <div class="reason-chip" :title="apt.appt_reason || '-'">
                  {{ apt.appt_reason || 'ไม่ได้ระบุเหตุผลการนัดหมาย' }}
                </div>
              </td>
              <td>
                <div class="status-stack">
                  <span :class="['status-chip', getStatusClass(apt.appt_status)]">
                    {{ getStatusLabel(apt.appt_status) }}
                  </span>
                  <span v-if="apt.cancel_reason" class="cancel-reason">{{ apt.cancel_reason }}</span>
                </div>
              </td>
              <td>
                <div class="row-actions">
                  <button @click="openEditModal(apt)" class="ghost-btn mini-btn" type="button">แก้ไข</button>
                  <button @click="deleteAppointment(apt.appt_id)" class="danger-btn mini-btn" type="button">ลบ</button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredAppointments.length === 0">
              <td colspan="5" class="state">
                <div class="empty-card">
                  <strong>ยังไม่มีข้อมูลนัดหมาย</strong>
                  <p>เมื่อมีการสร้างคิวนัดหมายในระบบ รายการทั้งหมดจะแสดงที่นี่</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div v-if="isModalOpen" class="modal-overlay" @click.self="closeModal">
      <div class="modal appointment-modal">
        <div class="modal-head">
          <div>
            <h2>{{ modalMode === 'add' ? 'เพิ่มการนัดหมายใหม่' : 'แก้ไขการนัดหมาย' }}</h2>
            <p>
              {{
                modalMode === 'add'
                  ? 'กรอกข้อมูลให้ครบเพื่อสร้างคิวนัดหมาย'
                  : 'อัปเดตวัน เวลา สถานะ หรือหมายเหตุของการนัดหมาย'
              }}
            </p>
          </div>
          <button @click="closeModal" class="close-btn" type="button">ปิด</button>
        </div>

        <form @submit.prevent="handleSubmit">
          <div class="form-grid" v-if="modalMode === 'add'">
            <label class="full-width field-wrap">
              <span>ค้นหาสัตว์เลี้ยง *</span>
              <div class="search-box">
                <input
                  type="text"
                  v-model="searchPetQuery"
                  @focus="showPetDropdown = true"
                  placeholder="พิมพ์ชื่อสัตว์เลี้ยง เจ้าของ หรือรหัส"
                  required
                />
                <button v-if="form.pet_id" @click="clearPetSelection" type="button" class="inline-clear">ล้าง</button>
              </div>
              <div v-if="showPetDropdown" @click="showPetDropdown = false" class="dropdown-backdrop"></div>
              <ul v-if="showPetDropdown" class="pet-dropdown">
                <li v-if="filteredPets.length === 0" class="dropdown-empty">ไม่พบข้อมูลสัตว์เลี้ยง</li>
                <li v-for="pet in filteredPets" :key="pet.pet_id" @click="selectPet(pet)" class="dropdown-item">
                  <div class="primary-line">{{ pet.pet_name }}</div>
                  <div class="secondary-line">รหัส: {{ pet.pet_id }} | เจ้าของ: {{ pet.owner_name || 'ไม่ระบุ' }}</div>
                </li>
              </ul>
            </label>
          </div>

          <div class="form-grid" v-if="modalMode === 'edit'">
            <label class="full-width">
              <span>สัตว์เลี้ยง</span>
              <input type="text" :value="form.pet_display" readonly />
            </label>
          </div>

          <div class="form-grid" v-if="modalMode === 'edit'">
            <label class="full-width">
              <span>สถานะนัดหมาย *</span>
              <select v-model="form.appt_status">
                <option :value="APPT_STATUS_PENDING">รอยืนยัน</option>
                <option :value="APPT_STATUS_CONFIRMED">ยืนยัน</option>
                <option :value="APPT_STATUS_CANCELED">ยกเลิก</option>
              </select>
            </label>
          </div>

          <div class="form-grid">
            <label>
              <span>วันที่นัดหมาย *</span>
              <input v-model="form.appt_date" type="date" required />
            </label>
            <label>
              <span>เวลานัดหมาย *</span>
              <input v-model="form.appt_time" type="time" required />
            </label>
          </div>

          <div class="form-grid" v-if="modalMode === 'edit'">
            <label class="full-width">
              <span>หมายเหตุการเลื่อนหรือยกเลิก</span>
              <textarea
                v-model="form.cancel_reason"
                rows="2"
                placeholder="เช่น เปลี่ยนเวลา เจ้าของไม่สะดวก หรือยกเลิกการนัด"
              ></textarea>
            </label>
          </div>

          <div class="form-grid" v-if="modalMode === 'add'">
            <label class="full-width">
              <span>เหตุผล / อาการเบื้องต้น</span>
              <textarea v-model="form.appt_reason" rows="2" placeholder="ระบุอาการเบื้องต้น"></textarea>
            </label>
          </div>

          <div class="modal-actions">
            <button type="button" @click="closeModal" class="ghost-btn">ยกเลิก</button>
            <button type="submit" :disabled="isSubmitting" class="primary-btn">
              {{ isSubmitting ? 'กำลังบันทึก...' : modalMode === 'add' ? 'บันทึกนัดหมาย' : 'บันทึกการแก้ไข' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import axios from 'axios'

const APPT_STATUS_PENDING = 'รอ'
const APPT_STATUS_CONFIRMED = 'ยืนยัน'
const APPT_STATUS_CANCELED = 'ยกเลิก'

const appointments = ref([])
const petsList = ref([])
const statusFilter = ref('all')
const isModalOpen = ref(false)
const modalMode = ref('add')
const form = ref({})
const isSubmitting = ref(false)
const searchPetQuery = ref('')
const showPetDropdown = ref(false)

const formatDateParts = (value) => {
  const raw = String(value || '').trim()
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (match) {
    return {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3])
    }
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]))

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day)
  }
}

const formatInputDate = (value) => {
  const parts = formatDateParts(value)
  if (!parts) return ''
  return `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
}

const normalizeAppointmentStatus = (status) => {
  const text = String(status || '').trim()
  if (text === APPT_STATUS_CANCELED) return APPT_STATUS_CANCELED
  if (text === APPT_STATUS_PENDING) return APPT_STATUS_PENDING
  return APPT_STATUS_CONFIRMED
}

const getStatusClass = (status) => {
  const normalized = normalizeAppointmentStatus(status)
  if (normalized === APPT_STATUS_CANCELED) return 'is-danger'
  if (normalized === APPT_STATUS_PENDING) return 'is-pending'
  return 'is-success'
}

const getStatusLabel = (status) => {
  const normalized = normalizeAppointmentStatus(status)
  if (normalized === APPT_STATUS_CANCELED) return 'ยกเลิก'
  if (normalized === APPT_STATUS_PENDING) return 'รอยืนยัน'
  return 'ยืนยันแล้ว'
}

const normalizeAppointmentRecord = (appointment) => ({
  ...appointment,
  appt_date: formatInputDate(appointment.appt_date),
  appt_time: String(appointment.appt_time || '').slice(0, 5),
  appt_status: normalizeAppointmentStatus(appointment.appt_status),
  cancel_reason: appointment.cancel_reason || ''
})

const waitForRender = () => new Promise((resolve) => setTimeout(resolve, 50))

const filters = computed(() => [
  { label: 'ทั้งหมด', value: 'all' },
  { label: 'รอยืนยัน', value: APPT_STATUS_PENDING },
  { label: 'ยืนยันแล้ว', value: APPT_STATUS_CONFIRMED },
  { label: 'ยกเลิก', value: APPT_STATUS_CANCELED }
])

const todayInputValue = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const parseDateOnly = (dateStr) => {
  const parts = formatDateParts(dateStr)
  if (!parts) return null
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
}

const filteredPets = computed(() => {
  if (!searchPetQuery.value) return petsList.value
  const query = searchPetQuery.value.toLowerCase()
  return petsList.value.filter((pet) =>
    [pet.pet_name, pet.owner_name, pet.pet_id].some((value) => String(value || '').toLowerCase().includes(query))
  )
})

const filteredAppointments = computed(() => {
  if (statusFilter.value === 'all') return appointments.value
  return appointments.value.filter((item) => item.appt_status === statusFilter.value)
})

const selectPet = (pet) => {
  form.value.pet_id = pet.pet_id
  searchPetQuery.value = `${pet.pet_name} (เจ้าของ: ${pet.owner_name || 'ไม่ระบุ'})`
  showPetDropdown.value = false
}

const clearPetSelection = () => {
  form.value.pet_id = ''
  searchPetQuery.value = ''
  showPetDropdown.value = true
}

const getDay = (dateStr) => {
  const date = parseDateOnly(dateStr)
  return date ? String(date.getUTCDate()).padStart(2, '0') : '-'
}

const getShortMonth = (dateStr) => {
  const date = parseDateOnly(dateStr)
  return date ? date.toLocaleDateString('th-TH', { month: 'short', timeZone: 'UTC' }) : '-'
}

const formatFullDate = (dateStr) => {
  const date = parseDateOnly(dateStr)
  return date
    ? date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC'
      })
    : '-'
}

const formatTime = (timeStr) => (timeStr ? String(timeStr).slice(0, 5) : '-')
const getInitial = (name) => (name ? String(name).charAt(0).toUpperCase() : '?')

const getPetColor = (name) => {
  const colors = ['#f59e0b', '#f97316', '#f43f5e', '#10b981', '#0ea5e9', '#8b5cf6']
  if (!name) return colors[0]
  return colors[String(name).charCodeAt(0) % colors.length]
}

const fetchAppointments = async () => {
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get('http://localhost:3000/api/appointments', {
      headers: { Authorization: `Bearer ${token}` }
    })
    appointments.value = res.data.map(normalizeAppointmentRecord)
  } catch (err) {
    console.error('Fetch appointments error:', err)
  }
}

const fetchPetsList = async () => {
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get('http://localhost:3000/api/appointments/pets-list', {
      headers: { Authorization: `Bearer ${token}` }
    })
    petsList.value = res.data
  } catch (err) {
    console.error('Fetch pets error:', err)
  }
}

const openAddModal = () => {
  modalMode.value = 'add'
  form.value = {
    pet_id: '',
    appt_status: APPT_STATUS_CONFIRMED,
    appt_date: todayInputValue(),
    appt_time: '',
    appt_reason: '',
    cancel_reason: ''
  }
  searchPetQuery.value = ''
  showPetDropdown.value = false
  isModalOpen.value = true
}

const openEditModal = (appointment) => {
  modalMode.value = 'edit'
  const normalizedAppointment = normalizeAppointmentRecord(appointment)
  form.value = {
    appt_id: appointment.appt_id,
    pet_id: appointment.pet_id,
    pet_display: `${appointment.pet_name || '-'} (เจ้าของ: ${appointment.owner_name || 'ไม่ระบุ'})`,
    appt_status: normalizedAppointment.appt_status,
    appt_date: normalizedAppointment.appt_date,
    appt_time: normalizedAppointment.appt_time,
    cancel_reason: normalizedAppointment.cancel_reason
  }
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
  searchPetQuery.value = ''
  showPetDropdown.value = false
}

const showAppointmentFeedback = (response) => {
  const emailMessage = response?.data?.email_notification?.message
  const baseMessage = modalMode.value === 'add' ? 'บันทึกนัดหมายสำเร็จ' : 'อัปเดตการนัดหมายสำเร็จ'
  alert(emailMessage ? `${baseMessage}\n${emailMessage}` : baseMessage)
}

const handleSubmit = async () => {
  isSubmitting.value = true
  try {
    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }

    if (modalMode.value === 'add') {
      const response = await axios.post(
        'http://localhost:3000/api/appointments',
        {
          pet_id: form.value.pet_id,
          appt_date: form.value.appt_date,
          appt_time: form.value.appt_time,
          appt_reason: form.value.appt_reason,
          appt_status: APPT_STATUS_CONFIRMED
        },
        { headers }
      )
      showAppointmentFeedback(response)
    } else {
      const response = await axios.put(
        `http://localhost:3000/api/appointments/${form.value.appt_id}`,
        {
          appt_date: form.value.appt_date,
          appt_time: form.value.appt_time,
          appt_status: form.value.appt_status,
          cancel_reason: form.value.appt_status === APPT_STATUS_CANCELED ? form.value.cancel_reason : null
        },
        { headers }
      )
      showAppointmentFeedback(response)
    }

    closeModal()
    await Promise.all([fetchAppointments(), fetchPetsList()])
  } catch (error) {
    console.error('Appointment submit error:', error)
    alert(error.response?.data?.message || 'บันทึกข้อมูลไม่สำเร็จ')
  } finally {
    isSubmitting.value = false
  }
}

const deleteAppointment = async (apptId) => {
  if (!confirm('ยืนยันที่จะลบข้อมูลการนัดหมายนี้อย่างถาวรหรือไม่?')) return

  try {
    const token = localStorage.getItem('token')
    await axios.delete(`http://localhost:3000/api/appointments/${apptId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    await fetchAppointments()
  } catch (error) {
    console.error('Delete appointment error:', error)
    alert(error.response?.data?.message || 'ลบข้อมูลไม่สำเร็จ')
  }
}

onMounted(async () => {
  await Promise.all([fetchAppointments(), fetchPetsList()])
  await nextTick()
  await waitForRender()
})
</script>

<style scoped>
.appointments-admin-page {
  display: grid;
  gap: 22px;
}

.page-header,
.toolbar,
.table-panel,
.modal {
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(217, 226, 236, 0.9);
  border-radius: 20px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.06);
}

.page-header {
  padding: 24px 26px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}

.eyebrow {
  margin: 0 0 8px;
  color: #0f766e;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.page-header h1,
.modal-head h2 {
  margin: 0;
  color: #0f172a;
}

.subtitle,
.modal-head p {
  margin: 10px 0 0;
  color: #64748b;
  line-height: 1.7;
}

.primary-btn,
.ghost-btn,
.danger-btn,
.close-btn,
.pill-btn {
  min-height: 42px;
  border-radius: 14px;
  border: 1px solid transparent;
  padding: 0 16px;
  font-weight: 700;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.primary-btn {
  background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);
  color: #fff;
  box-shadow: 0 14px 30px rgba(15, 118, 110, 0.18);
}

.ghost-btn,
.close-btn,
.pill-btn {
  background: #fff;
  color: #0f172a;
  border-color: rgba(203, 213, 225, 0.88);
}

.danger-btn {
  background: rgba(239, 68, 68, 0.12);
  color: #b91c1c;
  border-color: rgba(239, 68, 68, 0.16);
}

.primary-btn:hover,
.ghost-btn:hover,
.danger-btn:hover,
.close-btn:hover,
.pill-btn:hover {
  transform: translateY(-1px);
}

.toolbar {
  padding: 14px;
}

.filter-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.pill-btn.active {
  background: rgba(20, 184, 166, 0.12);
  color: #0f766e;
  border-color: rgba(20, 184, 166, 0.2);
}

.table-panel {
  padding: 18px;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 16px 14px;
  text-align: left;
  border-bottom: 1px solid rgba(226, 232, 240, 0.9);
  vertical-align: top;
}

th {
  color: #64748b;
  font-size: 13px;
  font-weight: 800;
}

.date-cell,
.pet-cell {
  display: flex;
  gap: 14px;
}

.date-block {
  min-width: 68px;
  border-radius: 16px;
  background: linear-gradient(180deg, #ecfdf5 0%, #f0fdfa 100%);
  border: 1px solid rgba(20, 184, 166, 0.14);
  color: #0f766e;
  text-align: center;
  padding: 10px 8px;
}

.date-block span {
  display: block;
  font-size: 11px;
  font-weight: 700;
}

.date-block strong {
  display: block;
  margin-top: 4px;
  font-size: 24px;
}

.pet-avatar {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 800;
}

.primary-line {
  color: #0f172a;
  font-weight: 700;
}

.secondary-line {
  margin-top: 4px;
  color: #64748b;
  font-size: 13px;
}

.reason-chip {
  color: #334155;
  line-height: 1.6;
}

.status-stack {
  display: grid;
  gap: 8px;
}

.status-chip {
  width: fit-content;
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 800;
}

.status-chip.is-success {
  background: #dcfce7;
  color: #166534;
}

.status-chip.is-pending {
  background: #fef3c7;
  color: #92400e;
}

.status-chip.is-danger {
  background: #fee2e2;
  color: #b91c1c;
}

.cancel-reason {
  color: #b91c1c;
  font-size: 12px;
}

.row-actions {
  display: flex;
  gap: 10px;
}

.mini-btn {
  min-height: 36px;
  padding: 0 12px;
  font-size: 13px;
}

.state {
  padding: 28px 14px;
}

.empty-card {
  text-align: center;
}

.empty-card strong {
  display: block;
  color: #0f172a;
  font-size: 18px;
}

.empty-card p {
  margin: 8px 0 0;
  color: #64748b;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.42);
  backdrop-filter: blur(3px);
  display: grid;
  place-items: center;
  padding: 20px;
  z-index: 50;
}

.modal {
  width: min(760px, 100%);
  padding: 24px;
}

.modal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

form {
  margin-top: 18px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.full-width {
  grid-column: 1 / -1;
}

.field-wrap,
label {
  display: grid;
  gap: 8px;
}

label span {
  color: #334155;
  font-size: 14px;
  font-weight: 700;
}

input,
select,
textarea {
  width: 100%;
  border-radius: 14px;
  border: 1px solid rgba(203, 213, 225, 0.88);
  background: #fff;
  padding: 13px 14px;
  color: #0f172a;
  font: inherit;
  outline: none;
}

input:focus,
select:focus,
textarea:focus {
  border-color: rgba(20, 184, 166, 0.6);
  box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.12);
}

.search-box {
  position: relative;
}

.inline-clear {
  position: absolute;
  top: 50%;
  right: 12px;
  transform: translateY(-50%);
  border: 0;
  background: transparent;
  color: #0f766e;
  font-weight: 700;
}

.dropdown-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1;
}

.pet-dropdown {
  position: absolute;
  z-index: 2;
  width: 100%;
  margin: 8px 0 0;
  padding: 8px;
  list-style: none;
  border-radius: 16px;
  border: 1px solid rgba(203, 213, 225, 0.88);
  background: #fff;
  box-shadow: 0 16px 30px rgba(15, 23, 42, 0.12);
  max-height: 280px;
  overflow-y: auto;
}

.dropdown-item,
.dropdown-empty {
  padding: 12px;
  border-radius: 12px;
}

.dropdown-item {
  cursor: pointer;
}

.dropdown-item:hover {
  background: rgba(20, 184, 166, 0.08);
}

.dropdown-empty {
  color: #64748b;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 8px;
}

@media (max-width: 900px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }
}

@media (max-width: 720px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .modal-head,
  .modal-actions,
  .row-actions,
  .date-cell,
  .pet-cell {
    flex-direction: column;
  }

  .primary-btn,
  .ghost-btn,
  .danger-btn,
  .close-btn {
    width: 100%;
  }
}
</style>
