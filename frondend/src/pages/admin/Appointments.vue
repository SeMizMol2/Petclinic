<template>
  <div class="appointment-wrapper">
    
    <div class="clinic-card header-card">
      <div class="header-content">
        <div class="icon-box">📅</div>
        <div class="title-box">
          <h1>จัดการตารางนัดหมาย</h1>
          <p>จัดการคิวการเข้ารับการรักษาสัตว์เลี้ยง และติดตามสถานะ</p>
        </div>
      </div>
      <button @click="openAddModal" class="btn-primary">
        <svg class="icon-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
        </svg>
        เพิ่มการนัดหมาย
      </button>
    </div>

    <div class="filter-section">
      <div class="filter-group">
        <button 
          v-for="f in filters" 
          :key="f.value" 
          @click="statusFilter = f.value"
          :class="['filter-btn', statusFilter === f.value ? 'active' : '']"
        >
          <span class="filter-icon">{{ f.icon }}</span>
          <span>{{ f.label }}</span>
        </button>
      </div>
    </div>

    <div class="clinic-card table-card">
      <div class="table-responsive">
        <table class="clinic-table">
          <thead>
            <tr>
              <th>วันและเวลาที่นัด</th>
              <th>ข้อมูลสัตว์เลี้ยง</th>
              <th>สาเหตุ / อาการ</th>
              <th class="text-center">สถานะ</th>
              <th class="text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="apt in filteredAppointments" :key="apt.appt_id">
              <td>
                <div class="datetime-info">
                  <div class="date-badge">
                    <span class="month">{{ getShortMonth(apt.appt_date) }}</span>
                    <span class="day">{{ getDay(apt.appt_date) }}</span>
                  </div>
                  <div class="date-details">
                    <div class="full-date">{{ formatFullDate(apt.appt_date) }}</div>
                    <div class="time">⏱️ {{ formatTime(apt.appt_time) }} น.</div>
                  </div>
                </div>
              </td>
              <td>
                <div class="pet-info">
                  <div class="pet-avatar" :style="{ backgroundColor: getPetColor(apt.pet_name) }">
                    {{ getInitial(apt.pet_name) }}
                  </div>
                  <div class="pet-details">
                    <div class="pet-name">🐾 {{ apt.pet_name || 'ไม่พบข้อมูล' }}</div>
                    <div class="owner-name">คุณ{{ apt.owner_name || 'ไม่ระบุ' }}</div>
                  </div>
                </div>
              </td>
              <td>
                <div class="reason-badge" :title="apt.appt_reason">
                  {{ apt.appt_reason || 'ไม่มีการระบุสาเหตุ' }}
                </div>
              </td>
              
              <td class="text-center">
                <div class="status-wrapper">
                  <span :class="['status-badge', apt.appt_status === 'ยืนยัน' ? 'badge-confirm' : 'badge-cancel']">
                    {{ apt.appt_status === 'ยืนยัน' ? '✅ ยืนยันแล้ว' : '❌ ยกเลิก' }}
                  </span>
                  <div v-if="apt.cancel_reason" class="cancel-reason-text" :title="apt.cancel_reason">
                    💬 {{ apt.cancel_reason }}
                  </div>
                </div>
              </td>

              <td class="text-center">
                <div class="action-buttons">
                  <button @click="openEditModal(apt)" class="btn-action edit" title="แก้ไข/เลื่อน/ยกเลิกนัด">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button @click="deleteAppointment(apt.appt_id)" class="btn-action delete" title="ลบการนัดหมาย">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredAppointments.length === 0">
              <td colspan="5" class="empty-state">
                <div class="empty-icon">🐕</div>
                <h3>ยังไม่มีคิวการรักษาสัตว์</h3>
                <p>กดปุ่ม "เพิ่มการนัดหมาย" ด้านบนเพื่อจัดตาราง</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="isModalOpen" class="custom-modal-overlay" @click.self="isModalOpen = false">
      <div class="custom-modal-box">
        
        <div class="modal-header">
          <div class="modal-title">
            <div class="modal-icon">{{ modalMode === 'add' ? '📅' : '📝' }}</div>
            <div>
              <h3>{{ modalMode === 'add' ? 'เพิ่มการนัดหมายใหม่' : 'แก้ไข / เลื่อน / ยกเลิกนัด' }}</h3>
              <p>{{ modalMode === 'add' ? 'กรอกข้อมูลให้ครบถ้วนเพื่อจัดตารางแพทย์' : 'อัปเดตเวลา หรือเปลี่ยนสถานะการนัดหมาย' }}</p>
            </div>
          </div>
          <button @click="isModalOpen = false" class="close-btn">✕</button>
        </div>
        
        <form @submit.prevent="handleSubmit">
          
          <div class="form-group relative-box" v-if="modalMode === 'add'">
            <label>ค้นหาสัตว์เลี้ยง <span class="required">*</span></label>
            <div class="search-wrapper">
              <input 
                type="text" 
                v-model="searchPetQuery" 
                @focus="showPetDropdown = true"
                placeholder="🔍 พิมพ์ชื่อสัตว์เลี้ยง, เจ้าของ หรือ รหัส..." 
                class="custom-input"
                required
              >
              <button v-if="form.pet_id" @click="clearPetSelection" type="button" class="clear-btn">✕</button>
            </div>
            <div v-if="showPetDropdown" @click="showPetDropdown = false" class="dropdown-backdrop"></div>
            <ul v-if="showPetDropdown" class="custom-dropdown">
              <li v-if="filteredPets.length === 0" class="dropdown-empty">ไม่มีข้อมูลสัตว์เลี้ยงที่ค้นหา</li>
              <li v-for="pet in filteredPets" :key="pet.pet_id" @click="selectPet(pet)" class="dropdown-item">
                <div class="pet-name-drop">🐾 {{ pet.pet_name }}</div>
                <div class="pet-detail-drop">รหัส: {{ pet.pet_id }} | 👤 คุณ{{ pet.owner_name || 'ไม่ระบุ' }}</div>
              </li>
            </ul>
          </div>
          
          <div class="form-group" v-if="modalMode === 'edit'">
            <label>สัตว์เลี้ยง (ล็อกไว้)</label>
            <input type="text" :value="form.pet_display" class="custom-input readonly-input" readonly>
          </div>

          <div class="form-group" v-if="modalMode === 'edit'">
            <label>สถานะการนัดหมาย <span class="required">*</span></label>
            <select v-model="form.appt_status" class="custom-input select-input">
              <option value="ยืนยัน">✅ ยืนยัน / รอดำเนินการ</option>
              <option value="ยกเลิก">❌ ยกเลิกการนัดหมาย</option>
            </select>
          </div>

          <div class="grid-2-col">
            <div class="form-group">
              <label>วันที่นัดหมาย <span class="required">*</span></label>
              <input v-model="form.appt_date" type="date" class="custom-input" required>
            </div>
            <div class="form-group">
              <label>เวลานัดหมาย <span class="required">*</span></label>
              <input v-model="form.appt_time" type="time" class="custom-input" required>
            </div>
          </div>

          <div class="form-group" v-if="modalMode === 'edit'">
            <label>เหตุผลที่เลื่อน หรือ ยกเลิกนัด (ถ้ามี)</label>
            <textarea v-model="form.cancel_reason" rows="2" placeholder="เช่น เจ้าของไม่สะดวก, เปลี่ยนเวลา, สัตว์เลี้ยงป่วย..." class="custom-input highlight-input"></textarea>
          </div>

          <div class="form-group" v-if="modalMode === 'add'">
            <label>สาเหตุ / อาการเบื้องต้น</label>
            <textarea v-model="form.appt_reason" rows="2" placeholder="ระบุอาการเบื้องต้น..." class="custom-input"></textarea>
          </div>

          <div class="modal-actions">
            <button type="button" @click="isModalOpen = false" class="btn-cancel">ยกเลิก</button>
            <button type="submit" :disabled="isSubmitting" class="btn-submit">
              {{ isSubmitting ? 'กำลังบันทึก...' : (modalMode === 'add' ? 'บันทึกนัดหมาย' : 'บันทึกการแก้ไข') }}
            </button>
          </div>

        </form>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

// State
const appointments = ref([])
const petsList = ref([])
const statusFilter = ref('all')
const isModalOpen = ref(false)
const modalMode = ref('add') // 'add' หรือ 'edit'
const form = ref({})
const isSubmitting = ref(false)

// Dropdown State
const searchPetQuery = ref('')
const showPetDropdown = ref(false)

const filters = computed(() => [
  { label: 'ทั้งหมด', value: 'all', icon: '📋' },
  { label: 'ยืนยันแล้ว', value: 'ยืนยัน', icon: '✅' },
  { label: 'ยกเลิก', value: 'ยกเลิก', icon: '❌' },
])

const filteredPets = computed(() => {
  if (!searchPetQuery.value) return petsList.value
  const query = searchPetQuery.value.toLowerCase()
  return petsList.value.filter(pet => 
    (pet.pet_name && pet.pet_name.toLowerCase().includes(query)) ||
    (pet.owner_name && pet.owner_name.toLowerCase().includes(query)) ||
    (pet.pet_id && pet.pet_id.toLowerCase().includes(query))
  )
})

const selectPet = (pet) => {
  form.value.pet_id = pet.pet_id
  searchPetQuery.value = `🐾 ${pet.pet_name} (เจ้าของ: ${pet.owner_name || 'ไม่ระบุ'})`
  showPetDropdown.value = false
}

const clearPetSelection = () => {
  form.value.pet_id = ''
  searchPetQuery.value = ''
  showPetDropdown.value = true
}

const getDay = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).getDate().toString().padStart(2, '0')
}

const getShortMonth = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('th-TH', { month: 'short' })
}

const formatFullDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
}

const formatTime = (timeStr) => {
  if (!timeStr) return '-'
  return timeStr.substring(0, 5)
}

const getInitial = (name) => name ? name.charAt(0).toUpperCase() : '?'

const getPetColor = (name) => {
  const colors = ['#f59e0b', '#f97316', '#f43f5e', '#10b981', '#0ea5e9', '#8b5cf6']
  if (!name) return colors[0]
  return colors[name.charCodeAt(0) % colors.length]
}

// ================= API FETCH =================
const fetchAppointments = async () => {
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get('http://localhost:3000/api/appointments', {
      headers: { Authorization: `Bearer ${token}` }
    })
    appointments.value = res.data
  } catch (err) {
    console.error("Fetch Error:", err)
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
    console.error("Fetch Pets Error:", err)
  }
}

// ================= ACTIONS =================
const openAddModal = () => {
  modalMode.value = 'add'
  form.value = { appt_status: 'ยืนยัน', appt_date: '', appt_time: '', appt_reason: '', cancel_reason: '', pet_id: '' }
  searchPetQuery.value = '' 
  showPetDropdown.value = false 
  isModalOpen.value = true
}

const openEditModal = (apt) => {
  modalMode.value = 'edit'
  
  // แปลงวันที่ให้อยู่ในฟอร์แมต YYYY-MM-DD เพื่อแสดงในช่อง input type="date"
  let formattedDate = ''
  if (apt.appt_date) {
      const dateObj = new Date(apt.appt_date)
      // ใช้ time zone ปัจจุบันเพื่อป้องกันวันที่เคลื่อน
      formattedDate = new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000)).toISOString().split('T')[0]
  }

  form.value = { 
    appt_id: apt.appt_id,
    appt_status: apt.appt_status, 
    appt_date: formattedDate, 
    appt_time: apt.appt_time, 
    appt_reason: apt.appt_reason, 
    cancel_reason: apt.cancel_reason || '',
    pet_id: apt.pet_id,
    pet_display: `🐾 ${apt.pet_name || 'ไม่ทราบชื่อ'} (เจ้าของ: ${apt.owner_name || 'ไม่ระบุ'})`
  }
  isModalOpen.value = true
}

const handleSubmit = async () => {
  if (modalMode.value === 'add' && !form.value.pet_id) {
      alert("กรุณาเลือกสัตว์เลี้ยงจากรายชื่อให้ถูกต้อง")
      showPetDropdown.value = true
      return
  }
  
  isSubmitting.value = true
  try {
    const token = localStorage.getItem('token')
    
    if (modalMode.value === 'add') {
      // Create
      await axios.post('http://localhost:3000/api/appointments', form.value, {
        headers: { Authorization: `Bearer ${token}` }
      })
    } else {
      // Update (Edit / Postpone / Cancel)
      await axios.put(`http://localhost:3000/api/appointments/${form.value.appt_id}`, form.value, {
        headers: { Authorization: `Bearer ${token}` }
      })
    }

    isModalOpen.value = false
    fetchAppointments()
  } catch (err) {
    alert('บันทึกไม่สำเร็จ กรุณาตรวจสอบข้อมูลอีกครั้ง')
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
    fetchAppointments()
  } catch (err) {
    alert('ลบไม่สำเร็จ')
  }
}

const filteredAppointments = computed(() => {
  if (statusFilter.value === 'all') return appointments.value
  return appointments.value.filter(a => a.appt_status === statusFilter.value)
})

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

/* --- Cards --- */
.clinic-card {
  background: #ffffff;
  border-radius: 20px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
  border: 1px solid #f1f5f9;
  padding: 24px;
  margin-bottom: 24px;
}

/* --- Header Section --- */
.header-card {
  display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;
}
.header-content { display: flex; align-items: center; gap: 16px; }
.icon-box {
  width: 56px; height: 56px; background: linear-gradient(135deg, #34d399 0%, #059669 100%);
  border-radius: 16px; display: flex; align-items: center; justify-content: center;
  font-size: 28px; color: white; box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.3);
}
.title-box h1 { margin: 0; font-size: 24px; font-weight: 800; color: #0f172a; }
.title-box p { margin: 4px 0 0 0; font-size: 14px; color: #64748b; font-weight: 500; }

.btn-primary {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff;
  border: none; padding: 12px 24px; border-radius: 12px; font-weight: 700; font-size: 15px;
  cursor: pointer; display: flex; align-items: center; gap: 8px;
  box-shadow: 0 4px 14px 0 rgba(16, 185, 129, 0.39); transition: all 0.2s ease-in-out; font-family: inherit;
}
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4); }
.icon-sm { width: 20px; height: 20px; }

/* --- Filter Section --- */
.filter-section { margin-bottom: 24px; }
.filter-group {
  background: #ffffff; padding: 6px; border-radius: 16px; display: inline-flex; gap: 4px;
  border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.filter-btn {
  background: transparent; border: none; padding: 10px 16px; border-radius: 12px;
  font-weight: 700; color: #64748b; cursor: pointer; transition: all 0.2s;
  display: flex; align-items: center; gap: 8px; font-family: inherit; font-size: 14px;
}
.filter-btn:hover { background: #f8fafc; color: #334155; }
.filter-btn.active { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2); }

/* --- Table Section --- */
.table-card { padding: 0; overflow: hidden; }
.table-responsive { width: 100%; overflow-x: auto; }
.clinic-table { width: 100%; border-collapse: collapse; min-width: 850px; }
.clinic-table th {
  background-color: #f8fafc; padding: 16px 24px; text-align: left; font-size: 13px; font-weight: 700;
  color: #64748b; text-transform: uppercase; border-bottom: 2px solid #e2e8f0;
}
.clinic-table td { padding: 16px 24px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
.clinic-table tbody tr { transition: all 0.2s; }
.clinic-table tbody tr:hover { background-color: #f0fdf4; }
.text-center { text-align: center; }

/* Table Inner Elements */
.datetime-info { display: flex; align-items: center; gap: 12px; }
.date-badge {
  background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; width: 50px; height: 50px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}
.date-badge .month { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; line-height: 1; }
.date-badge .day { font-size: 20px; font-weight: 900; color: #0f172a; line-height: 1.2; }
.full-date { font-weight: 700; color: #334155; font-size: 14px; }
.time { color: #059669; font-size: 12px; font-weight: 700; margin-top: 2px; }

.pet-info { display: flex; align-items: center; gap: 12px; }
.pet-avatar {
  width: 40px; height: 40px; border-radius: 50%; color: white; font-weight: bold;
  display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.pet-name { font-weight: 700; color: #1e293b; font-size: 15px; }
.owner-name { font-size: 12px; color: #64748b; margin-top: 2px; }

.reason-badge {
  background: #f8fafc; padding: 6px 12px; border-radius: 8px; font-size: 13px; color: #475569;
  border: 1px solid #e2e8f0; display: inline-block; max-width: 200px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* Status Badges */
.status-wrapper { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.status-badge {
  display: inline-block; padding: 6px 14px; border-radius: 99px; font-size: 12px; font-weight: 700;
}
.badge-confirm { background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
.badge-cancel { background-color: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
.cancel-reason-text { font-size: 11px; color: #f43f5e; font-weight: 600; background: #fff1f2; padding: 4px 8px; border-radius: 6px; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; border: 1px solid #ffe4e6; }

/* Action Buttons (Edit & Delete) */
.action-buttons { display: flex; justify-content: center; gap: 8px; }
.btn-action {
  background: #ffffff; border: 1px solid #e2e8f0; width: 36px; height: 36px; border-radius: 10px;
  cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; justify-content: center; color: #94a3b8;
}
.btn-action.edit:hover { background: #eff6ff; border-color: #bfdbfe; color: #3b82f6; transform: translateY(-2px); }
.btn-action.delete:hover { background: #fef2f2; border-color: #fecaca; color: #ef4444; transform: translateY(-2px); }

.empty-state { padding: 60px 20px; text-align: center; }
.empty-icon { font-size: 48px; background: #f1f5f9; width: 100px; height: 100px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px; }
.empty-state h3 { margin: 0; color: #334155; font-size: 18px; }
.empty-state p { margin: 8px 0 0 0; color: #94a3b8; font-size: 14px; }

/* ==========================================================================
   MODAL CSS
   ========================================================================== */
.custom-modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background-color: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center; z-index: 9999;
}
.custom-modal-box {
  background-color: #ffffff; width: 90%; max-width: 550px; border-radius: 24px; padding: 32px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); box-sizing: border-box;
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(30px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.modal-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 1px solid #f1f5f9; padding-bottom: 20px; }
.modal-title { display: flex; gap: 16px; align-items: center; }
.modal-icon {
  background: linear-gradient(135deg, #34d399 0%, #059669 100%); color: white; width: 48px; height: 48px; border-radius: 14px;
  display: flex; align-items: center; justify-content: center; font-size: 24px;
}
.modal-title h3 { margin: 0; font-size: 20px; font-weight: 800; color: #0f172a; }
.modal-title p { margin: 4px 0 0 0; font-size: 13px; color: #64748b; }
.close-btn { background: #f1f5f9; border: none; width: 36px; height: 36px; border-radius: 50%; color: #64748b; cursor: pointer; font-weight: bold; transition: all 0.2s; }
.close-btn:hover { background: #fee2e2; color: #ef4444; }

.form-group { margin-bottom: 20px; }
.relative-box { position: relative; }
.form-group label { display: block; font-size: 14px; font-weight: 700; color: #334155; margin-bottom: 8px; }
.required { color: #ef4444; }

.custom-input {
  width: 100%; padding: 14px 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 14px; color: #0f172a;
  outline: none; box-sizing: border-box; font-family: inherit; transition: all 0.2s;
}
.custom-input:focus { background-color: #ffffff; border-color: #10b981; box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1); }
textarea.custom-input { resize: none; }
.readonly-input { background-color: #f1f5f9; color: #94a3b8; cursor: not-allowed; border-color: #e2e8f0; }
.highlight-input { background-color: #fff1f2; border-color: #fecaca; color: #be123c; }
.highlight-input:focus { border-color: #f43f5e; box-shadow: 0 0 0 3px rgba(244, 63, 94, 0.1); background-color: #ffffff; }
.select-input { cursor: pointer; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; background-size: 16px; padding-right: 36px; font-weight: 600; }

.grid-2-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

/* Dropdown */
.search-wrapper { position: relative; }
.clear-btn { position: absolute; right: 14px; top: 14px; background: none; border: none; color: #94a3b8; cursor: pointer; font-weight: bold; }
.clear-btn:hover { color: #ef4444; }
.dropdown-backdrop { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 10000; }
.custom-dropdown {
  position: absolute; top: 100%; left: 0; right: 0; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; margin: 4px 0 0 0; padding: 0;
  list-style: none; max-height: 250px; overflow-y: auto; z-index: 10001; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}
.dropdown-item { padding: 12px 16px; border-bottom: 1px solid #f8fafc; cursor: pointer; }
.dropdown-item:last-child { border-bottom: none; }
.dropdown-item:hover { background-color: #f0fdf4; }
.pet-name-drop { font-weight: 700; color: #0f172a; font-size: 14px; }
.pet-detail-drop { font-size: 12px; color: #64748b; margin-top: 4px; }
.dropdown-empty { padding: 16px; text-align: center; color: #94a3b8; font-size: 14px; }

/* Modal Actions */
.modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 32px; padding-top: 20px; border-top: 1px solid #f1f5f9; }
.btn-cancel { padding: 12px 24px; background-color: #f1f5f9; color: #475569; border: none; border-radius: 12px; font-weight: 700; cursor: pointer; font-family: inherit; transition: 0.2s; }
.btn-cancel:hover { background-color: #e2e8f0; color: #1e293b; }
.btn-submit { padding: 12px 28px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; border: none; border-radius: 12px; font-weight: 700; cursor: pointer; font-family: inherit; transition: 0.2s; box-shadow: 0 4px 14px 0 rgba(16, 185, 129, 0.39); }
.btn-submit:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4); }
.btn-submit:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }

@media (max-width: 640px) {
  .grid-2-col { grid-template-columns: 1fr; }
  .custom-modal-box { padding: 20px; }
}
</style>