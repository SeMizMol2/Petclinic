<template>
  <div class="appointment-wrapper">
    <div class="clinic-card header-card">
      <div class="header-content">
        <div class="icon-box">AP</div>
        <div class="title-box">
          <h1>จัดการตารางนัดหมาย</h1>
          <p>จัดการคิวการเข้ารับบริการ ตรวจสอบวันเวลา และติดตามสถานะนัดหมายของสัตว์เลี้ยง</p>
        </div>
      </div>
      <button @click="openAddModal" class="btn-primary" type="button">
        <svg class="icon-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
        </svg>
        เพิ่มการนัดหมาย
      </button>
    </div>

    <div class="filter-section">
      <div class="filter-group">
        <button
          v-for="filter in filters"
          :key="filter.value"
          @click="statusFilter = filter.value"
          :class="['filter-btn', statusFilter === filter.value ? 'active' : '']"
          type="button"
        >
          <span class="filter-icon">{{ filter.icon }}</span>
          <span>{{ filter.label }}</span>
        </button>
      </div>
    </div>

    <div class="clinic-card table-card">
      <div class="table-responsive">
        <table class="clinic-table">
          <thead>
            <tr>
              <th>วันและเวลานัด</th>
              <th>สัตว์เลี้ยง</th>
              <th>เหตุผล / อาการ</th>
              <th class="text-center">สถานะ</th>
              <th class="text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="apt in filteredAppointments"
              :key="`${apt.appt_id}-${apt.appt_date}-${apt.appt_time}-${apt.appt_status}-${apt.cancel_reason || ''}`"
            >
              <td>
                <div class="datetime-info">
                  <div class="date-badge">
                    <span class="month">{{ getShortMonth(apt.appt_date) }}</span>
                    <span class="day">{{ getDay(apt.appt_date) }}</span>
                  </div>
                  <div class="date-details">
                    <div class="full-date">{{ formatFullDate(apt.appt_date) }}</div>
                    <div class="time">{{ formatTime(apt.appt_time) }} น.</div>
                  </div>
                </div>
              </td>
              <td>
                <div class="pet-info">
                  <div class="pet-avatar" :style="{ backgroundColor: getPetColor(apt.pet_name) }">
                    {{ getInitial(apt.pet_name) }}
                  </div>
                  <div class="pet-details">
                    <div class="pet-name">{{ apt.pet_name || 'ไม่พบข้อมูล' }}</div>
                    <div class="owner-name">คุณ{{ apt.owner_name || 'ไม่ระบุ' }}</div>
                  </div>
                </div>
              </td>
              <td>
                <div class="reason-badge" :title="apt.appt_reason || '-'">
                  {{ apt.appt_reason || 'ไม่ได้ระบุเหตุผลการนัดหมาย' }}
                </div>
              </td>
              <td class="text-center">
                <div class="status-wrapper">
                  <span :class="['status-badge', apt.appt_status === APPT_STATUS_CONFIRMED ? 'badge-confirm' : 'badge-cancel']">
                    {{ apt.appt_status === APPT_STATUS_CONFIRMED ? 'ยืนยันแล้ว' : 'ยกเลิก' }}
                  </span>
                  <div v-if="apt.cancel_reason" class="cancel-reason-text" :title="apt.cancel_reason">
                    {{ apt.cancel_reason }}
                  </div>
                </div>
              </td>
              <td class="text-center">
                <div class="action-buttons">
                  <button @click="openEditModal(apt)" class="btn-action edit" type="button" title="แก้ไขนัดหมาย">
                    แก้ไข
                  </button>
                  <button @click="deleteAppointment(apt.appt_id)" class="btn-action delete" type="button" title="ลบนัดหมาย">
                    ลบ
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredAppointments.length === 0">
              <td colspan="5" class="empty-state">
                <div class="empty-icon">AP</div>
                <h3>ยังไม่มีข้อมูลนัดหมาย</h3>
                <p>กดปุ่มเพิ่มการนัดหมายเพื่อเริ่มจัดคิวให้ลูกค้า</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="isModalOpen" class="custom-modal-overlay" @click.self="closeModal">
      <div class="custom-modal-box">
        <div class="modal-header">
          <div class="modal-title">
            <div class="modal-icon">{{ modalMode === 'add' ? 'AP' : 'ED' }}</div>
            <div>
              <h3>{{ modalMode === 'add' ? 'เพิ่มการนัดหมายใหม่' : 'แก้ไขการนัดหมาย' }}</h3>
              <p>{{ modalMode === 'add' ? 'กรอกข้อมูลให้ครบเพื่อสร้างคิวนัดหมาย' : 'อัปเดตวัน เวลา หรือสถานะของการนัดหมาย' }}</p>
            </div>
          </div>
          <button @click="closeModal" class="close-btn" type="button">ปิด</button>
        </div>

        <form @submit.prevent="handleSubmit">
          <div class="form-group relative-box" v-if="modalMode === 'add'">
            <label>ค้นหาสัตว์เลี้ยง <span class="required">*</span></label>
            <div class="search-wrapper">
              <input
                type="text"
                v-model="searchPetQuery"
                @focus="showPetDropdown = true"
                placeholder="พิมพ์ชื่อสัตว์เลี้ยง เจ้าของ หรือรหัส"
                class="custom-input"
                required
              />
              <button v-if="form.pet_id" @click="clearPetSelection" type="button" class="clear-btn">ล้าง</button>
            </div>
            <div v-if="showPetDropdown" @click="showPetDropdown = false" class="dropdown-backdrop"></div>
            <ul v-if="showPetDropdown" class="custom-dropdown">
              <li v-if="filteredPets.length === 0" class="dropdown-empty">ไม่พบข้อมูลสัตว์เลี้ยง</li>
              <li v-for="pet in filteredPets" :key="pet.pet_id" @click="selectPet(pet)" class="dropdown-item">
                <div class="pet-name-drop">{{ pet.pet_name }}</div>
                <div class="pet-detail-drop">รหัส: {{ pet.pet_id }} | เจ้าของ: {{ pet.owner_name || 'ไม่ระบุ' }}</div>
              </li>
            </ul>
          </div>

          <div class="form-group" v-if="modalMode === 'edit'">
            <label>สัตว์เลี้ยง</label>
            <input type="text" :value="form.pet_display" class="custom-input readonly-input" readonly />
          </div>

          <div class="form-group" v-if="modalMode === 'edit'">
            <label>สถานะนัดหมาย <span class="required">*</span></label>
            <select v-model="form.appt_status" class="custom-input select-input">
              <option :value="APPT_STATUS_CONFIRMED">ยืนยัน / รอดำเนินการ</option>
              <option :value="APPT_STATUS_CANCELED">ยกเลิก</option>
            </select>
          </div>

          <div class="grid-2-col">
            <div class="form-group">
              <label>วันที่นัดหมาย <span class="required">*</span></label>
              <input v-model="form.appt_date" type="date" class="custom-input" required />
            </div>
            <div class="form-group">
              <label>เวลานัดหมาย <span class="required">*</span></label>
              <input v-model="form.appt_time" type="time" class="custom-input" required />
            </div>
          </div>

          <div class="form-group" v-if="modalMode === 'edit'">
            <label>เหตุผลที่เลื่อนหรือยกเลิก (ถ้ามี)</label>
            <textarea
              v-model="form.cancel_reason"
              rows="2"
              placeholder="เช่น เจ้าของไม่สะดวก เปลี่ยนเวลา หรือยกเลิกการนัด"
              class="custom-input highlight-input"
            ></textarea>
          </div>

          <div class="form-group" v-if="modalMode === 'add'">
            <label>เหตุผล / อาการเบื้องต้น</label>
            <textarea
              v-model="form.appt_reason"
              rows="2"
              placeholder="ระบุอาการเบื้องต้น"
              class="custom-input"
            ></textarea>
          </div>

          <div class="modal-actions">
            <button type="button" @click="closeModal" class="btn-cancel">ยกเลิก</button>
            <button type="submit" :disabled="isSubmitting" class="btn-submit">
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
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value])
  )

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
  { label: 'ทั้งหมด', value: 'all', icon: 'ALL' },
  { label: 'ยืนยันแล้ว', value: APPT_STATUS_CONFIRMED, icon: 'OK' },
  { label: 'ยกเลิก', value: APPT_STATUS_CANCELED, icon: 'NO' }
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
    [pet.pet_name, pet.owner_name, pet.pet_id].some((value) =>
      String(value || '').toLowerCase().includes(query)
    )
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
@import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap');

.appointment-wrapper {
  font-family: 'Sarabun', sans-serif;
  background-color: #f8fafc;
  min-height: 100vh;
  padding: 24px;
  color: #1e293b;
  box-sizing: border-box;
}

.clinic-card {
  background: #ffffff;
  border-radius: 20px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
  border: 1px solid #f1f5f9;
  padding: 24px;
  margin-bottom: 24px;
}

.header-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.icon-box {
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #34d399 0%, #059669 100%);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 800;
  color: white;
  box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.3);
}

.title-box h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
  color: #0f172a;
}

.title-box p {
  margin: 4px 0 0;
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
}

.btn-primary {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #ffffff;
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: 700;
  font-size: 15px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 14px 0 rgba(16, 185, 129, 0.39);
  transition: all 0.2s ease-in-out;
  font-family: inherit;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
}

.icon-sm {
  width: 20px;
  height: 20px;
}

.filter-section {
  margin-bottom: 24px;
}

.filter-group {
  background: #ffffff;
  padding: 6px;
  border-radius: 16px;
  display: inline-flex;
  gap: 4px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.filter-btn {
  background: transparent;
  padding: 10px 16px;
  border-radius: 12px;
  font-weight: 700;
  color: #64748b;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: inherit;
  font-size: 14px;
}

.filter-btn:hover {
  background: #f8fafc;
  color: #334155;
}

.filter-btn.active {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2);
}

.table-card {
  padding: 0;
  overflow: hidden;
}

.table-responsive {
  width: 100%;
  overflow-x: auto;
}

.clinic-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 850px;
}

.clinic-table th {
  background-color: #f8fafc;
  padding: 16px 24px;
  text-align: left;
  font-size: 13px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  border-bottom: 2px solid #e2e8f0;
}

.clinic-table td {
  padding: 16px 24px;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
}

.clinic-table tbody tr:hover {
  background-color: #f0fdf4;
}

.text-center {
  text-align: center;
}

.datetime-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.date-badge {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  width: 50px;
  height: 50px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.date-badge .month {
  font-size: 10px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  line-height: 1;
}

.date-badge .day {
  font-size: 20px;
  font-weight: 900;
  color: #0f172a;
  line-height: 1.2;
}

.full-date {
  font-weight: 700;
  color: #334155;
  font-size: 14px;
}

.time {
  color: #059669;
  font-size: 12px;
  font-weight: 700;
  margin-top: 2px;
}

.pet-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pet-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  color: white;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.pet-name {
  font-weight: 700;
  color: #1e293b;
  font-size: 15px;
}

.owner-name {
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
}

.reason-badge {
  background: #f8fafc;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 13px;
  color: #475569;
  border: 1px solid #e2e8f0;
  display: inline-block;
  max-width: 220px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.status-badge {
  display: inline-block;
  padding: 6px 14px;
  border-radius: 99px;
  font-size: 12px;
  font-weight: 700;
}

.badge-confirm {
  background-color: #ecfdf5;
  color: #047857;
  border: 1px solid #a7f3d0;
}

.badge-cancel {
  background-color: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
}

.cancel-reason-text {
  font-size: 11px;
  color: #f43f5e;
  font-weight: 600;
  background: #fff1f2;
  padding: 4px 8px;
  border-radius: 6px;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border: 1px solid #ffe4e6;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.btn-action {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  min-width: 54px;
  height: 36px;
  padding: 0 10px;
  border-radius: 10px;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-family: inherit;
  font-weight: 700;
}

.btn-action.edit:hover {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #3b82f6;
  transform: translateY(-2px);
}

.btn-action.delete:hover {
  background: #fef2f2;
  border-color: #fecaca;
  color: #ef4444;
  transform: translateY(-2px);
}

.empty-state {
  padding: 60px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 24px;
  font-weight: 800;
  background: #f1f5f9;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  color: #64748b;
}

.empty-state h3 {
  margin: 0;
  color: #334155;
  font-size: 18px;
}

.empty-state p {
  margin: 8px 0 0;
  color: #94a3b8;
  font-size: 14px;
}

.custom-modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.custom-modal-box {
  background-color: #ffffff;
  width: 90%;
  max-width: 550px;
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  box-sizing: border-box;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 20px;
}

.modal-title {
  display: flex;
  gap: 16px;
  align-items: center;
}

.modal-icon {
  background: linear-gradient(135deg, #34d399 0%, #059669 100%);
  color: white;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 800;
}

.modal-title h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  color: #0f172a;
}

.modal-title p {
  margin: 4px 0 0;
  font-size: 13px;
  color: #64748b;
}

.close-btn {
  background: #f1f5f9;
  width: 60px;
  height: 36px;
  border-radius: 18px;
  color: #64748b;
  font-weight: 700;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #fee2e2;
  color: #ef4444;
}

.form-group {
  margin-bottom: 20px;
}

.relative-box {
  position: relative;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 700;
  color: #334155;
  margin-bottom: 8px;
}

.required {
  color: #ef4444;
}

.custom-input {
  width: 100%;
  padding: 14px 16px;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 14px;
  color: #0f172a;
  outline: none;
  box-sizing: border-box;
  font-family: inherit;
  transition: all 0.2s;
}

.custom-input:focus {
  background-color: #ffffff;
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

textarea.custom-input {
  resize: none;
}

.readonly-input {
  background-color: #f1f5f9;
  color: #94a3b8;
  cursor: not-allowed;
}

.highlight-input {
  background-color: #fff1f2;
  border-color: #fecaca;
  color: #be123c;
}

.highlight-input:focus {
  border-color: #f43f5e;
  box-shadow: 0 0 0 3px rgba(244, 63, 94, 0.1);
  background-color: #ffffff;
}

.select-input {
  cursor: pointer;
}

.grid-2-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.search-wrapper {
  position: relative;
}

.clear-btn {
  position: absolute;
  right: 14px;
  top: 14px;
  background: none;
  color: #94a3b8;
  font-weight: 700;
}

.clear-btn:hover {
  color: #ef4444;
}

.dropdown-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10000;
}

.custom-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  margin: 4px 0 0;
  padding: 0;
  list-style: none;
  max-height: 250px;
  overflow-y: auto;
  z-index: 10001;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.dropdown-item {
  padding: 12px 16px;
  border-bottom: 1px solid #f8fafc;
  cursor: pointer;
}

.dropdown-item:last-child {
  border-bottom: none;
}

.dropdown-item:hover {
  background-color: #f0fdf4;
}

.pet-name-drop {
  font-weight: 700;
  color: #0f172a;
  font-size: 14px;
}

.pet-detail-drop {
  font-size: 12px;
  color: #64748b;
  margin-top: 4px;
}

.dropdown-empty {
  padding: 16px;
  text-align: center;
  color: #94a3b8;
  font-size: 14px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 32px;
  padding-top: 20px;
  border-top: 1px solid #f1f5f9;
}

.btn-cancel {
  padding: 12px 24px;
  background-color: #f1f5f9;
  color: #475569;
  border-radius: 12px;
  font-weight: 700;
  font-family: inherit;
  transition: 0.2s;
}

.btn-cancel:hover {
  background-color: #e2e8f0;
  color: #1e293b;
}

.btn-submit {
  padding: 12px 28px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #ffffff;
  border-radius: 12px;
  font-weight: 700;
  font-family: inherit;
  transition: 0.2s;
  box-shadow: 0 4px 14px 0 rgba(16, 185, 129, 0.39);
}

.btn-submit:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
}

.btn-submit:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

@media (max-width: 640px) {
  .grid-2-col {
    grid-template-columns: 1fr;
  }

  .custom-modal-box {
    padding: 20px;
  }
}
</style>
