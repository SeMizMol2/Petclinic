<template>
  <div class="admin-page appointments-admin-page">
    <section class="page-header">
      <div>
        <p class="eyebrow">Appointment management</p>
        <h1>จัดการตารางนัดหมาย</h1>
        <p class="subtitle">จัดคิวการเข้ารับบริการ ตรวจสอบวันเวลา และติดตามสถานะนัดหมายของสัตว์เลี้ยง</p>
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
                  <span :class="['status-chip', apt.appt_status === APPT_STATUS_CONFIRMED ? 'is-success' : 'is-danger']">
                    {{ apt.appt_status === APPT_STATUS_CONFIRMED ? 'ยืนยันแล้ว' : 'ยกเลิก' }}
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
                  <p>กดปุ่มเพิ่มการนัดหมายเพื่อเริ่มจัดคิวให้ลูกค้า</p>
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
            <p>{{ modalMode === 'add' ? 'กรอกข้อมูลให้ครบเพื่อสร้างคิวนัดหมาย' : 'อัปเดตวัน เวลา หรือสถานะของการนัดหมาย' }}</p>
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
                <option :value="APPT_STATUS_CONFIRMED">ยืนยัน / รอดำเนินการ</option>
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
              <span>เหตุผลที่เลื่อนหรือยกเลิก</span>
              <textarea
                v-model="form.cancel_reason"
                rows="2"
                placeholder="เช่น เจ้าของไม่สะดวก เปลี่ยนเวลา หรือยกเลิกการนัด"
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
  return text === APPT_STATUS_CANCELED ? APPT_STATUS_CANCELED : APPT_STATUS_CONFIRMED
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
    appt_status: APPT_STATUS_CONFIRMED,
    appt_date: todayInputValue(),
    appt_time: '',
    appt_reason: '',
    cancel_reason: '',
    pet_id: ''
  }
  searchPetQuery.value = ''
  showPetDropdown.value = false
  isModalOpen.value = true
}

const openEditModal = (apt) => {
  const normalizedAppointment = normalizeAppointmentRecord(apt)
  modalMode.value = 'edit'
  form.value = {
    appt_id: normalizedAppointment.appt_id,
    appt_status: normalizedAppointment.appt_status,
    appt_date: normalizedAppointment.appt_date,
    appt_time: normalizedAppointment.appt_time,
    appt_reason: normalizedAppointment.appt_reason || '',
    cancel_reason: normalizedAppointment.cancel_reason || '',
    pet_id: normalizedAppointment.pet_id,
    pet_display: `${apt.pet_name || 'ไม่ทราบชื่อ'} (เจ้าของ: ${apt.owner_name || 'ไม่ระบุ'})`
  }
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
  showPetDropdown.value = false
}

const validateAppointmentDate = () => {
  const year = Number(String(form.value.appt_date || '').slice(0, 4))
  const currentYear = new Date().getFullYear()
  return year >= currentYear - 1 && year <= currentYear + 5
}

const buildEmailNotificationMessage = (result, mode) => {
  const actionLabel = mode === 'add' ? 'บันทึกนัดหมายสำเร็จ' : 'อัปเดตนัดหมายสำเร็จ'

  if (!result) return actionLabel
  if (result.sent) return `${actionLabel}\nส่งอีเมลแจ้งเตือนไปยังเจ้าของสัตว์เลี้ยงแล้ว`
  if (result.skipped && result.reason === 'missing-recipient') {
    return `${actionLabel}\nแต่ยังไม่ได้ส่งอีเมล เพราะเจ้าของสัตว์เลี้ยงยังไม่ได้ระบุอีเมล`
  }
  if (result.skipped && result.reason === 'mail-not-configured') {
    return `${actionLabel}\nแต่ยังไม่ได้ส่งอีเมล เพราะระบบยังไม่ได้ตั้งค่า SMTP`
  }
  return `${actionLabel}\nแต่ส่งอีเมลแจ้งเตือนไม่สำเร็จ`
}

const handleSubmit = async () => {
  if (modalMode.value === 'add' && !form.value.pet_id) {
    alert('กรุณาเลือกสัตว์เลี้ยงจากรายการให้ถูกต้อง')
    showPetDropdown.value = true
    return
  }

  if (!validateAppointmentDate()) {
    alert('กรุณาตรวจสอบปีของวันนัดหมายให้ถูกต้อง')
    return
  }

  isSubmitting.value = true
  try {
    const token = localStorage.getItem('token')
    let response

    if (modalMode.value === 'add') {
      response = await axios.post('http://localhost:3000/api/appointments', form.value, {
        headers: { Authorization: `Bearer ${token}` }
      })
    } else {
      response = await axios.put(`http://localhost:3000/api/appointments/${form.value.appt_id}`, form.value, {
        headers: { Authorization: `Bearer ${token}` }
      })

      appointments.value = appointments.value.map((item) =>
        item.appt_id === form.value.appt_id
          ? normalizeAppointmentRecord({
              ...item,
              appt_date: form.value.appt_date,
              appt_time: form.value.appt_time,
              appt_status: form.value.appt_status,
              cancel_reason: form.value.cancel_reason
            })
          : item
      )
    }

    closeModal()
    await nextTick()
    await waitForRender()

    if (modalMode.value === 'add') {
      await fetchAppointments()
      alert(buildEmailNotificationMessage(response?.data?.email_notification, modalMode.value))
      return
    }

    alert(buildEmailNotificationMessage(response?.data?.email_notification, modalMode.value))
    window.location.reload()
  } catch (err) {
    alert(err.response?.data?.message || 'บันทึกข้อมูลนัดหมายไม่สำเร็จ')
    console.error(err)
  } finally {
    isSubmitting.value = false
  }
}

const deleteAppointment = async (id) => {
  if (!confirm('ยืนยันที่จะลบข้อมูลการนัดหมายนี้อย่างถาวรหรือไม่?')) return
  try {
    const token = localStorage.getItem('token')
    await axios.delete(`http://localhost:3000/api/appointments/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    await fetchAppointments()
  } catch (err) {
    alert('ลบข้อมูลไม่สำเร็จ')
  }
}

onMounted(() => {
  fetchAppointments()
  fetchPetsList()
})
</script>

<style scoped>
.appointments-admin-page {
  display: grid;
  gap: 20px;
}

.filter-pills {
  display: inline-flex;
  gap: 8px;
  padding: 6px;
  border-radius: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.pill-btn {
  min-height: 40px;
  padding: 0 14px;
  border-radius: 12px;
  background: transparent;
  color: #64748b;
  font: inherit;
  font-weight: 700;
}

.pill-btn.active {
  background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);
  color: #ffffff;
}

.date-cell,
.pet-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.date-block {
  width: 54px;
  height: 54px;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.date-block .month {
  font-size: 10px;
  font-weight: 700;
  color: #64748b;
}

.date-block strong {
  color: #0f172a;
  font-size: 20px;
  line-height: 1.1;
}

.primary-line {
  color: #0f172a;
  font-weight: 700;
}

.secondary-line {
  margin-top: 3px;
  color: #64748b;
  font-size: 12px;
}

.pet-avatar {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-weight: 800;
}

.reason-chip {
  display: inline-block;
  max-width: 260px;
  padding: 8px 12px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #475569;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-stack {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.is-success {
  background: #dcfce7;
  color: #166534;
}

.is-danger {
  background: #fef2f2;
  color: #b91c1c;
}

.cancel-reason {
  color: #be123c;
  font-size: 11px;
  font-weight: 700;
}

.row-actions {
  display: flex;
  gap: 8px;
}

.mini-btn {
  min-height: 36px;
  padding: 0 12px;
  border-radius: 10px;
}

.danger-btn {
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
}

.empty-card {
  padding: 24px;
}

.empty-card strong {
  display: block;
  margin-bottom: 6px;
  font-size: 18px;
  color: #0f172a;
}

.empty-card p {
  margin: 0;
  color: #64748b;
}

.appointment-modal {
  max-width: 760px;
}

.full-width {
  grid-column: 1 / -1;
}

.field-wrap {
  position: relative;
}

.search-box {
  position: relative;
}

.inline-clear {
  position: absolute;
  top: 12px;
  right: 14px;
  background: none;
  color: #64748b;
  font: inherit;
  font-weight: 700;
}

.dropdown-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
}

.pet-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 1001;
  margin: 0;
  padding: 0;
  list-style: none;
  max-height: 260px;
  overflow-y: auto;
  background: #ffffff;
  border: 1px solid #d9e2ec;
  border-radius: 16px;
  box-shadow: 0 18px 30px rgba(15, 23, 42, 0.12);
}

.dropdown-item {
  padding: 12px 14px;
  border-bottom: 1px solid #edf2f7;
  cursor: pointer;
}

.dropdown-item:last-child {
  border-bottom: none;
}

.dropdown-item:hover {
  background: #f0fdfa;
}

.dropdown-empty {
  padding: 16px;
  text-align: center;
  color: #64748b;
}

@media (max-width: 900px) {
  .row-actions {
    flex-direction: column;
  }
}
</style>
