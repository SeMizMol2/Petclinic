<template>
  <div class="pets-page">
    <section class="hero-section">
      <div>
        <p class="eyebrow">Pet records</p>
        <h1>สัตว์เลี้ยงของฉัน</h1>
        <p class="hero-text">ดูรายละเอียด แก้ไขข้อมูล และเปิดประวัติการรักษาของสัตว์เลี้ยงแต่ละตัวได้จากหน้านี้</p>
      </div>
      <router-link to="/user/pets/add" class="primary-link">เพิ่มสัตว์เลี้ยง</router-link>
    </section>

    <section v-if="loading" class="state-section">กำลังโหลดข้อมูลสัตว์เลี้ยง...</section>

    <section v-else-if="pets.length === 0" class="state-section empty-state">
      <h2>ยังไม่มีข้อมูลสัตว์เลี้ยง</h2>
      <p>เริ่มเพิ่มสัตว์เลี้ยงตัวแรกเพื่อเก็บประวัติการรักษา นัดหมาย และใบเสร็จ</p>
      <router-link to="/user/pets/add" class="primary-link">เพิ่มสัตว์เลี้ยงตัวแรก</router-link>
    </section>

    <section v-else class="pets-grid">
      <article v-for="pet in pets" :key="pet.pet_id" class="pet-card">
        <div class="pet-header">
          <div class="pet-identity">
            <div class="pet-avatar">
              <AppIcon :name="getPetIcon(pet.pet_type)" :size="30" />
            </div>
            <div>
              <h2>{{ pet.pet_name }}</h2>
              <p>{{ pet.pet_breed || 'ไม่ระบุสายพันธุ์' }}</p>
            </div>
          </div>

          <div class="pet-actions">
            <button type="button" class="ghost-btn" @click="openEdit(pet)">
              <AppIcon name="edit" :size="16" /> แก้ไข
            </button>
            <button type="button" class="danger-btn" @click="deletePet(pet.pet_id)">
              <AppIcon name="trash" :size="16" /> ลบ
            </button>
          </div>
        </div>

        <div class="metric-grid">
          <div class="metric-item">
            <span>ประเภท</span>
            <strong>{{ pet.pet_type || '-' }}</strong>
          </div>
          <div class="metric-item">
            <span>เพศ</span>
            <strong>{{ pet.pet_gender || '-' }}</strong>
          </div>
          <div class="metric-item">
            <span>ลักษณะ/สี</span>
            <strong>{{ pet.pet_color || '-' }}</strong>
          </div>
          <div class="metric-item">
            <span>วันเกิด</span>
            <strong>{{ formatDateDisplay(pet.pet_birthdate) }}</strong>
          </div>
        </div>

        <div class="status-row">
          <span class="status-badge" :class="pet.sterile_status === 'ทำแล้ว' ? 'status-success' : 'status-warn'">
            {{ pet.sterile_status === 'ทำแล้ว' ? 'ทำหมันแล้ว' : 'ยังไม่ได้ทำหมัน' }}
          </span>
          <span class="age-chip">อายุ {{ calculateAge(pet.pet_birthdate) }}</span>
        </div>

        <div class="note-box">
          <span>ประวัติแพ้ยา</span>
          <p>{{ pet.drug_allergy || 'ไม่มีข้อมูลการแพ้ยา' }}</p>
        </div>

        <div class="history-panel">
          <div class="history-header">
            <h3>ประวัติการรักษาล่าสุด</h3>
            <router-link :to="`/user/history/${pet.pet_id}`" class="history-link">
              <AppIcon name="history" :size="15" /> ดูทั้งหมด
            </router-link>
          </div>

          <div v-if="getRecentHistory(pet.pet_id).length === 0" class="history-empty">
            ยังไม่มีประวัติการรักษา
          </div>

          <div v-else class="history-list">
            <div v-for="history in getRecentHistory(pet.pet_id)" :key="history.treatment_id" class="history-item">
              <div class="history-meta">
                <span>{{ formatDateDisplay(history.treatment_date) }}</span>
                <span>{{ history.doctor_name || history.vet_name || 'ไม่ระบุสัตวแพทย์' }}</span>
              </div>
              <strong>{{ history.diagnosis || history.symptom || 'ไม่มีรายละเอียดการรักษา' }}</strong>
              <p>อาการ: {{ history.symptom || '-' }}</p>
            </div>
          </div>
        </div>
      </article>
    </section>

    <Teleport to="body">
      <div v-if="showEdit" class="modal-overlay" @click.self="showEdit = false">
        <div class="modal-card">
          <div class="modal-header">
            <div>
              <h2>ข้อมูลสัตว์เลี้ยง</h2>
              <p>ปรับข้อมูลพื้นฐานของสัตว์เลี้ยงและรายละเอียดที่จำเป็นต่อการดูแล</p>
            </div>
            <button type="button" class="close-btn" @click="showEdit = false">ปิด</button>
          </div>

          <div class="modal-body">
            <div class="form-grid single">
              <label>
                <span>ชื่อสัตว์เลี้ยง</span>
                <input v-model="editPet.pet_name" class="input-field" />
              </label>
            </div>

            <div class="form-grid">
              <label>
                <span>ประเภท</span>
                <input v-model="editPet.pet_type" class="input-field" />
              </label>
              <label>
                <span>สายพันธุ์</span>
                <input v-model="editPet.pet_breed" class="input-field" />
              </label>
            </div>

            <div class="form-grid">
              <label>
                <span>เพศ</span>
                <select v-model="editPet.pet_gender" class="input-field">
                  <option value="ผู้">ผู้</option>
                  <option value="เมีย">เมีย</option>
                </select>
              </label>
              <label>
                <span>ลักษณะ/สี</span>
                <input v-model="editPet.pet_color" class="input-field" />
              </label>
            </div>

            <div class="form-grid">
              <label>
                <span>สถานะการทำหมัน</span>
                <select v-model="editPet.sterile_status" class="input-field">
                  <option value="ทำแล้ว">ทำแล้ว</option>
                  <option value="ยังไม่ทำ">ยังไม่ทำ</option>
                </select>
              </label>
              <label>
                <span>วันเกิด</span>
                <input v-model="editPet.pet_birthdate" type="date" class="input-field" />
              </label>
            </div>

            <label class="textarea-wrap">
              <span>ประวัติแพ้ยา</span>
              <textarea v-model="editPet.drug_allergy" class="input-field" rows="3"></textarea>
            </label>
          </div>

          <div class="modal-footer">
            <button type="button" class="secondary-btn" @click="showEdit = false">ยกเลิก</button>
            <button type="button" class="primary-btn" @click="updatePet">บันทึก</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import axios from 'axios'
import AppIcon from '../../components/AppIcon.vue'

const pets = ref([])
const loading = ref(false)
const showEdit = ref(false)
const editPet = ref({})
const historyByPet = ref({})

const getHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
})

const formatDateDisplay = (date) => {
  if (!date) return '-'
  const parsedDate = new Date(date)
  if (Number.isNaN(parsedDate.getTime())) return '-'
  return parsedDate.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

const calculateAge = (birthdate) => {
  if (!birthdate) return '-'
  const birth = new Date(birthdate)
  if (Number.isNaN(birth.getTime())) return '-'

  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const monthDiff = now.getMonth() - birth.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age -= 1
  }

  return `${Math.max(age, 0)} ปี`
}

const getPetIcon = (type) => {
  const petType = (type || '').toLowerCase()
  if (petType.includes('หมา') || petType.includes('สุนัข') || petType.includes('dog')) return 'dog'
  if (petType.includes('แมว') || petType.includes('cat')) return 'cat'
  if (petType.includes('กระต่าย') || petType.includes('rabbit')) return 'rabbit'
  if (petType.includes('นก') || petType.includes('bird')) return 'bird'
  if (petType.includes('ปลา') || petType.includes('fish')) return 'fish'
  return 'paw'
}

const getRecentHistory = (petId) => (historyByPet.value[petId] || []).slice(0, 2)

const loadHistoryForPet = async (petId) => {
  try {
    const response = await axios.get(`http://localhost:3000/api/history/pet-history/${petId}`, getHeaders())
    historyByPet.value[petId] = response.data?.success ? response.data.data || [] : []
  } catch (error) {
    console.error('loadHistoryForPet error:', error)
    historyByPet.value[petId] = []
  }
}

const loadPets = async () => {
  loading.value = true
  try {
    const response = await axios.get('http://localhost:3000/api/pets', getHeaders())
    pets.value = Array.isArray(response.data) ? response.data : []
    await Promise.all(pets.value.map((pet) => loadHistoryForPet(pet.pet_id)))
  } catch (error) {
    console.error('loadPets error:', error)
    pets.value = []
    alert('ไม่สามารถโหลดข้อมูลสัตว์เลี้ยงได้')
  } finally {
    loading.value = false
  }
}

const openEdit = (pet) => {
  const petData = { ...pet }
  if (petData.pet_birthdate) {
    const parsedDate = new Date(petData.pet_birthdate)
    petData.pet_birthdate = Number.isNaN(parsedDate.getTime()) ? '' : parsedDate.toLocaleDateString('en-CA')
  }

  editPet.value = petData
  showEdit.value = true
}

const updatePet = async () => {
  try {
    await axios.put(`http://localhost:3000/api/pets/${editPet.value.pet_id}`, editPet.value, getHeaders())
    alert('บันทึกข้อมูลสัตว์เลี้ยงเรียบร้อยแล้ว')
    showEdit.value = false
    await loadPets()
  } catch (error) {
    console.error('updatePet error:', error)
    alert(error.response?.data?.message || 'ไม่สามารถบันทึกข้อมูลสัตว์เลี้ยงได้')
  }
}

const deletePet = async (petId) => {
  if (!window.confirm('ยืนยันการลบข้อมูลสัตว์เลี้ยงรายการนี้?')) return

  try {
    await axios.delete(`http://localhost:3000/api/pets/${petId}`, getHeaders())
    alert('ลบข้อมูลสัตว์เลี้ยงเรียบร้อยแล้ว')
    await loadPets()
  } catch (error) {
    console.error('deletePet error:', error)
    alert(error.response?.data?.message || 'ไม่สามารถลบข้อมูลสัตว์เลี้ยงได้')
  }
}

onMounted(loadPets)
</script>

<style scoped>
.pets-page {
  display: grid;
  gap: 20px;
}

.hero-section {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 16px;
  padding: 28px;
}

.hero-section,
.state-section,
.pet-card,
.modal-card {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(217, 226, 236, 0.92);
  border-radius: 22px;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
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
.pet-card h2,
.history-header h3,
.modal-header h2,
.empty-state h2 {
  margin: 0;
  color: #0f172a;
}

.hero-text {
  margin: 8px 0 0;
  max-width: 620px;
  color: #64748b;
  line-height: 1.65;
}

.primary-link,
.primary-btn,
.secondary-btn,
.ghost-btn,
.danger-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-decoration: none;
  min-height: 44px;
  padding: 0 16px;
  border-radius: 14px;
  border: 1px solid transparent;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.primary-link,
.primary-btn {
  background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);
  color: #ffffff;
  box-shadow: 0 14px 30px rgba(15, 118, 110, 0.18);
}

.secondary-btn,
.ghost-btn {
  background: #ffffff;
  color: #0f172a;
  border-color: rgba(203, 213, 225, 0.88);
}

.state-section {
  padding: 36px 24px;
  text-align: center;
  color: #475569;
}

.empty-state {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}

.empty-state p {
  margin: 0;
  max-width: 560px;
}

.pets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 20px;
}

.pet-card {
  padding: 22px;
}

.pet-header {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: start;
  margin-bottom: 18px;
}

.pet-identity {
  display: flex;
  gap: 14px;
  align-items: center;
}

.pet-avatar {
  width: 58px;
  height: 58px;
  border-radius: 18px;
  background: linear-gradient(135deg, #ecfdf5, #f0fdfa);
  color: #0f766e;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 0 0 1px rgba(20, 184, 166, 0.12);
}

.pet-identity p {
  margin: 6px 0 0;
  color: #64748b;
}

.pet-actions {
  display: flex;
  gap: 8px;
}

.ghost-btn {
  background: #f0fdfa;
  color: #0f766e;
  border: 1px solid rgba(20, 184, 166, 0.15);
}

.danger-btn {
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid rgba(220, 38, 38, 0.12);
}

.primary-link:hover,
.primary-btn:hover,
.secondary-btn:hover,
.ghost-btn:hover,
.danger-btn:hover,
.close-btn:hover {
  transform: translateY(-1px);
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.metric-item,
.note-box,
.history-item {
  background: #f8fafc;
  border-radius: 16px;
  border: 1px solid #e8eef5;
}

.metric-item {
  padding: 14px;
}

.metric-item span,
.note-box span,
.modal-body span {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.metric-item strong,
.note-box p {
  color: #0f172a;
}

.status-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
}

.status-badge,
.age-chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 7px 11px;
  font-size: 12px;
  font-weight: 700;
}

.status-success {
  background: #dcfce7;
  color: #166534;
}

.status-warn {
  background: #fef3c7;
  color: #92400e;
}

.age-chip {
  background: #f1f5f9;
  color: #475569;
}

.note-box {
  padding: 14px;
  margin-bottom: 18px;
}

.note-box p {
  margin: 0;
  line-height: 1.6;
}

.history-panel {
  border-top: 1px solid #e5edf5;
  padding-top: 16px;
}

.history-header,
.history-meta,
.modal-header,
.modal-footer {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.history-link {
  color: #0f766e;
  font-weight: 700;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.history-empty {
  color: #64748b;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.history-item {
  padding: 14px;
}

.history-meta {
  margin-bottom: 8px;
  font-size: 12px;
  color: #64748b;
}

.history-item strong {
  display: block;
  margin-bottom: 6px;
  color: #0f172a;
}

.history-item p {
  margin: 0;
  color: #475569;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(4px);
}

.modal-card {
  width: min(760px, 100%);
  max-height: min(88vh, 860px);
  overflow: hidden;
}

.modal-header,
.modal-footer {
  padding: 18px 20px;
}

.modal-header {
  border-bottom: 1px solid #e5edf5;
  align-items: flex-start;
}

.modal-header p {
  margin: 6px 0 0;
  color: #64748b;
  line-height: 1.55;
}

.modal-footer {
  border-top: 1px solid #e5edf5;
  justify-content: flex-end;
}

.modal-body {
  padding: 20px;
}

.close-btn {
  min-height: 40px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid rgba(203, 213, 225, 0.88);
  background: #ffffff;
  color: #0f172a;
  font-weight: 700;
  cursor: pointer;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 14px;
}

.form-grid.single,
.textarea-wrap {
  display: block;
}

.modal-body label,
.textarea-wrap {
  display: grid;
  gap: 8px;
}

.input-field {
  width: 100%;
  min-height: 48px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(203, 213, 225, 0.9);
  background: #ffffff;
  color: #0f172a;
  font: inherit;
  box-sizing: border-box;
  outline: none;
}

.input-field:focus {
  border-color: rgba(20, 184, 166, 0.65);
  box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.12);
}

textarea.input-field {
  min-height: 108px;
  resize: vertical;
}

@media (max-width: 720px) {
  .hero-section,
  .pet-header,
  .status-row,
  .history-header,
  .modal-header,
  .modal-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .metric-grid,
  .form-grid {
    grid-template-columns: 1fr;
  }

  .pet-actions {
    width: 100%;
    flex-direction: column;
  }
}
</style>
