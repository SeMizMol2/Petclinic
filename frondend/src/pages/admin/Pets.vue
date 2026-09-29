<template>
  <div class="admin-page">
    <section class="page-header">
      <div>
        <p class="eyebrow">ข้อมูลสัตว์เลี้ยง</p>
        <h1>จัดการสัตว์เลี้ยง</h1>
        <p class="subtitle">เพิ่ม แก้ไข ย้ายเจ้าของ และค้นหาข้อมูลสัตว์เลี้ยงของลูกค้าในคลินิก</p>
      </div>
      <button class="primary-btn" @click="openAddModal">เพิ่มสัตว์เลี้ยง</button>
    </section>

    <section class="toolbar">
      <div class="search-field">
        <label for="pet-search">ค้นหาสัตว์เลี้ยง</label>
        <input id="pet-search" v-model="searchQuery" class="search-input" placeholder="ชื่อสัตว์ ประเภท สายพันธุ์ หรือเจ้าของ" />
      </div>
      <div class="filter-field">
        <label for="gender-filter">เพศ</label>
        <select id="gender-filter" v-model="genderFilter" class="filter-select">
          <option value="all">ทุกเพศ ({{ pets.length }})</option>
          <option value="ผู้">เพศผู้ ({{ genderCounts.male }})</option>
          <option value="เมีย">เพศเมีย ({{ genderCounts.female }})</option>
        </select>
      </div>
      <button v-if="hasActiveFilters" class="clear-btn" type="button" @click="clearFilters">ล้างตัวกรอง</button>
      <button class="ghost-btn" @click="reloadAll">รีเฟรช</button>
    </section>

    <p v-if="!loading && !error" class="result-summary" aria-live="polite">
      แสดง {{ filteredPets.length }} จาก {{ pets.length }} ตัว
    </p>

    <section class="table-panel">
      <div v-if="loading" class="state">กำลังโหลดข้อมูล...</div>
      <div v-else-if="error" class="state error">{{ error }}</div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>สัตว์เลี้ยง</th>
              <th>เจ้าของ</th>
              <th>ข้อมูลทั่วไป</th>
              <th>สุขภาพ</th>
              <th class="center">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="pet in filteredPets" :key="pet.pet_id">
              <td data-label="สัตว์เลี้ยง">
                <div class="pet-cell">
                  <div class="pet-thumb">
                    <img v-if="pet.pet_image" :src="resolveImageUrl(pet.pet_image)" alt="pet photo" />
                    <span v-else>{{ getPetInitial(pet.pet_name) }}</span>
                  </div>
                  <div>
                    <strong>{{ pet.pet_name }}</strong>
                    <span class="muted">{{ pet.pet_id }}</span>
                  </div>
                </div>
              </td>
              <td data-label="เจ้าของ">
                <div>{{ pet.owner_name || '-' }}</div>
                <span class="muted">{{ pet.owner_tel || '-' }}</span>
              </td>
              <td data-label="ข้อมูลทั่วไป">
                <div>{{ pet.pet_type || '-' }} / {{ pet.pet_breed || '-' }}</div>
                <div class="pet-meta">
                  <span class="gender-badge" :class="genderClass(pet.pet_gender)">{{ formatPetGender(pet.pet_gender) }}</span>
                  <span class="muted">{{ pet.pet_color || 'ไม่ระบุสี' }}</span>
                </div>
              </td>
              <td data-label="สุขภาพ">
                <div>{{ pet.sterile_status || '-' }}</div>
                <span class="muted">แพ้ยา: {{ pet.drug_allergy || '-' }}</span>
              </td>
              <td class="center" data-label="จัดการ">
                <div class="actions">
                  <router-link class="action view" :to="`/admin/history/${pet.pet_id}`">สรุป</router-link>
                  <button class="action edit" @click="openEditModal(pet)">แก้ไข</button>
                  <button class="action delete" @click="deletePet(pet)">ลบ</button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredPets.length === 0">
              <td colspan="5" class="state">ยังไม่มีข้อมูลสัตว์เลี้ยง</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div v-if="isModalOpen" class="modal-overlay" @click.self="closeModal">
      <form class="modal" @submit.prevent="submitPet">
        <div class="modal-head">
          <div>
            <h2>{{ modalMode === 'add' ? 'เพิ่มสัตว์เลี้ยง' : 'แก้ไขสัตว์เลี้ยง' }}</h2>
            <p>เลือกเจ้าของสัตว์และกรอกข้อมูลพื้นฐานให้ครบเพื่อใช้ในระบบนัดหมายและการรักษา</p>
          </div>
          <button type="button" class="close-btn" @click="closeModal">ปิด</button>
        </div>

        <div class="form-grid">
          <label class="full">
            เจ้าของสัตว์
            <select v-model="form.owner_id" required>
              <option value="" disabled>เลือกเจ้าของสัตว์</option>
              <option v-for="owner in owners" :key="owner.owner_id" :value="owner.owner_id">
                {{ owner.owner_name }} ({{ owner.owner_tel || 'ไม่มีเบอร์โทร' }})
              </option>
            </select>
          </label>
          <label>
            ชื่อสัตว์เลี้ยง
            <input v-model="form.pet_name" required />
          </label>
          <label>
            ประเภท
            <input v-model="form.pet_type" required placeholder="เช่น สุนัข, แมว" />
          </label>
          <label>
            สายพันธุ์
            <input v-model="form.pet_breed" />
          </label>
          <label>
            Pet image
            <input v-model="form.pet_image" placeholder="/images/pets/example.jpg or image URL" />
          </label>
          <div class="form-preview">
            <img v-if="form.pet_image" :src="resolveImageUrl(form.pet_image)" alt="pet photo preview" />
            <span v-else>Pet photo preview</span>
          </div>
          <label>
            เพศ
            <select v-model="form.pet_gender" required>
              <option value="" disabled>เลือกเพศ</option>
              <option value="ผู้">เพศผู้</option>
              <option value="เมีย">เพศเมีย</option>
            </select>
          </label>
          <label>
            สถานะทำหมัน
            <select v-model="form.sterile_status" required>
              <option value="" disabled>เลือกสถานะ</option>
              <option value="ทำแล้ว">ทำแล้ว</option>
              <option value="ยังไม่ทำ">ยังไม่ทำ</option>
            </select>
          </label>
          <label>
            สี/ลักษณะ
            <input v-model="form.pet_color" />
          </label>
          <label>
            วันเกิด
            <input v-model="form.pet_birthdate" type="date" :max="todayInThailand" />
          </label>
          <label class="full">
            ประวัติแพ้ยา
            <textarea v-model="form.drug_allergy" rows="3"></textarea>
          </label>
        </div>

        <div class="modal-actions">
          <button type="button" class="ghost-btn" @click="closeModal">ยกเลิก</button>
          <button class="primary-btn" type="submit">บันทึกข้อมูล</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'
import { resolveApiAssetUrl } from '../../api'

const todayInThailand = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10)
const pets = ref([])
const owners = ref([])
const loading = ref(false)
const error = ref('')
const searchQuery = ref('')
const genderFilter = ref('all')
const isModalOpen = ref(false)
const modalMode = ref('add')
const form = ref({})

const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` })

const resolveImageUrl = (value) => {
  return resolveApiAssetUrl(value)
}

const getPetInitial = (name) => String(name || '?').trim().charAt(0).toUpperCase()

const normalizePetGender = (value) => {
  const gender = String(value || '').trim().toLowerCase()
  if (['ผู้', 'เพศผู้', 'male'].includes(gender)) return 'ผู้'
  if (['เมีย', 'เพศเมีย', 'female'].includes(gender)) return 'เมีย'
  return ''
}

const formatPetGender = (value) => {
  const gender = normalizePetGender(value)
  if (gender === 'ผู้') return '♂ เพศผู้'
  if (gender === 'เมีย') return '♀ เพศเมีย'
  return 'ไม่ระบุเพศ'
}

const genderClass = (value) => {
  const gender = normalizePetGender(value)
  return gender === 'ผู้' ? 'gender-male' : gender === 'เมีย' ? 'gender-female' : 'gender-unknown'
}

const normalizeDate = (value) => {
  if (!value) return ''
  return String(value).slice(0, 10)
}

const buildPetPayload = () => ({
  ...form.value,
  pet_birthdate: form.value.pet_birthdate || null
})

const fetchPets = async () => {
  const res = await axios.get('http://localhost:3000/api/admin/pets', { headers: headers() })
  pets.value = res.data
}

const fetchOwners = async () => {
  const res = await axios.get('http://localhost:3000/api/admin/owners', { headers: headers() })
  owners.value = res.data
}

const reloadAll = async () => {
  try {
    loading.value = true
    error.value = ''
    await Promise.all([fetchPets(), fetchOwners()])
  } catch (err) {
    error.value = err.response?.data?.message || 'โหลดข้อมูลสัตว์เลี้ยงไม่สำเร็จ'
  } finally {
    loading.value = false
  }
}

const filteredPets = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return pets.value.filter((pet) =>
    (genderFilter.value === 'all' || normalizePetGender(pet.pet_gender) === genderFilter.value)
    && (!q || [pet.pet_name, pet.pet_type, pet.pet_breed, pet.pet_gender, pet.owner_name, pet.pet_id]
      .some((value) => String(value || '').toLowerCase().includes(q)))
  )
})

const genderCounts = computed(() => ({
  male: pets.value.filter((pet) => normalizePetGender(pet.pet_gender) === 'ผู้').length,
  female: pets.value.filter((pet) => normalizePetGender(pet.pet_gender) === 'เมีย').length
}))

const hasActiveFilters = computed(() => searchQuery.value.trim() !== '' || genderFilter.value !== 'all')

const clearFilters = () => {
  searchQuery.value = ''
  genderFilter.value = 'all'
}

const emptyForm = () => ({
  owner_id: '',
  pet_name: '',
  pet_image: '',
  pet_type: '',
  pet_breed: '',
  pet_gender: '',
  sterile_status: '',
  pet_color: '',
  pet_birthdate: '',
  drug_allergy: ''
})

const openAddModal = () => {
  modalMode.value = 'add'
  form.value = emptyForm()
  isModalOpen.value = true
}

const openEditModal = (pet) => {
  modalMode.value = 'edit'
  form.value = { ...pet, pet_birthdate: normalizeDate(pet.pet_birthdate) }
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
}

const submitPet = async () => {
  try {
    const payload = buildPetPayload()

    if (modalMode.value === 'add') {
      await axios.post('http://localhost:3000/api/admin/pets', payload, { headers: headers() })
      alert('เพิ่มสัตว์เลี้ยงสำเร็จ')
    } else {
      await axios.put(`http://localhost:3000/api/admin/pets/${form.value.pet_id}`, payload, { headers: headers() })
      alert('แก้ไขสัตว์เลี้ยงสำเร็จ')
    }
    closeModal()
    reloadAll()
  } catch (err) {
    alert(err.response?.data?.message || 'บันทึกข้อมูลไม่สำเร็จ')
  }
}

const deletePet = async (pet) => {
  if (!confirm(`ยืนยันลบข้อมูลสัตว์เลี้ยง "${pet.pet_name}" หรือไม่?`)) return

  try {
    await axios.delete(`http://localhost:3000/api/admin/pets/${pet.pet_id}`, { headers: headers() })
    reloadAll()
  } catch (err) {
    alert(err.response?.data?.message || 'ลบข้อมูลไม่สำเร็จ')
  }
}

onMounted(reloadAll)
</script>

<style scoped>
.admin-page {
  color: #1f2937;
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
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-end;
  padding: 24px 26px;
  margin-bottom: 18px;
}

.eyebrow {
  margin: 0 0 8px;
  color: #0f766e;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1,
.modal-head h2 {
  margin: 0;
  color: #0f172a;
}

h1 {
  font-size: 32px;
  font-weight: 800;
}

.subtitle,
.modal-head p {
  margin: 10px 0 0;
  color: #64748b;
  line-height: 1.7;
}

.toolbar {
  display: flex;
  gap: 12px;
  padding: 14px;
  margin-bottom: 18px;
  align-items: flex-end;
}

.search-field,
.filter-field {
  display: grid;
  gap: 6px;
}

.search-field {
  flex: 1;
  min-width: 220px;
}

.filter-field {
  flex: 0 0 190px;
}

.search-field label,
.filter-field label {
  color: #475569;
  font-size: 12px;
  font-weight: 700;
}

.search-input,
input,
textarea,
select {
  width: 100%;
  box-sizing: border-box;
  padding: 13px 14px;
  border: 1px solid rgba(203, 213, 225, 0.88);
  border-radius: 14px;
  background: #fff;
  color: #0f172a;
  font: inherit;
  outline: none;
}

.search-input {
  min-width: 0;
}

.clear-btn {
  min-height: 46px;
  padding: 0 8px;
  border: 0;
  background: transparent;
  color: #0f766e;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.clear-btn:hover {
  color: #115e59;
  text-decoration: underline;
}

.result-summary {
  margin: -8px 4px 12px;
  color: #64748b;
  font-size: 13px;
}

.search-input:focus,
input:focus,
textarea:focus,
select:focus {
  border-color: rgba(20, 184, 166, 0.6);
  box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.12);
}

.primary-btn,
.ghost-btn,
.action,
.close-btn {
  min-height: 42px;
  border-radius: 14px;
  border: 1px solid transparent;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.primary-btn {
  background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);
  color: #fff;
  padding: 0 18px;
  box-shadow: 0 14px 30px rgba(15, 118, 110, 0.18);
}

.ghost-btn,
.close-btn {
  background: #fff;
  color: #0f172a;
  border-color: rgba(203, 213, 225, 0.88);
  padding: 0 16px;
}

.primary-btn:hover,
.ghost-btn:hover,
.action:hover,
.close-btn:hover {
  transform: translateY(-1px);
}

.table-panel {
  padding: 18px;
  overflow: hidden;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  min-width: 920px;
  border-collapse: collapse;
}

th,
td {
  padding: 16px 14px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.9);
  text-align: left;
  vertical-align: top;
}

th {
  color: #64748b;
  font-size: 13px;
  font-weight: 800;
}

strong,
.muted {
  display: block;
}

.pet-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 7px;
  flex-wrap: wrap;
}

.pet-meta .muted {
  margin-top: 0;
}

.gender-badge {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 0 9px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.gender-male {
  background: #eaf2ff;
  color: #1d4ed8;
}

.gender-female {
  background: #fdf0f6;
  color: #9d174d;
}

.gender-unknown {
  background: #f1f5f9;
  color: #475569;
}

strong {
  color: #0f172a;
}

.muted {
  color: #64748b;
  font-size: 13px;
  margin-top: 4px;
}

.pet-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pet-thumb {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  overflow: hidden;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #ecfdf5, #f0fdfa);
  color: #0f766e;
  font-weight: 800;
  flex: 0 0 auto;
}

.pet-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.center {
  text-align: center;
}

.actions {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.action {
  min-height: 36px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
}

.action.view {
  background: rgba(59, 130, 246, 0.12);
  color: #1d4ed8;
  border-color: rgba(59, 130, 246, 0.16);
}

.action.edit {
  background: rgba(20, 184, 166, 0.12);
  color: #0f766e;
  border-color: rgba(20, 184, 166, 0.16);
}

.action.delete {
  background: rgba(239, 68, 68, 0.12);
  color: #b91c1c;
  border-color: rgba(239, 68, 68, 0.16);
}

.state {
  padding: 28px;
  text-align: center;
  color: #64748b;
}

.state.error {
  color: #b91c1c;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.48);
  backdrop-filter: blur(4px);
}

.modal {
  width: min(760px, 100%);
  max-height: 90vh;
  overflow-y: auto;
  padding: 24px;
}

.modal-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  align-items: flex-start;
}

.close-btn {
  align-self: flex-start;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

label {
  display: grid;
  gap: 8px;
  font-weight: 700;
  color: #334155;
}

textarea {
  resize: vertical;
  min-height: 108px;
}

.full {
  grid-column: 1 / -1;
}

.form-preview {
  min-height: 112px;
  border-radius: 16px;
  border: 1px dashed rgba(148, 163, 184, 0.85);
  background: #f8fafc;
  display: grid;
  place-items: center;
  color: #64748b;
  font-weight: 700;
  overflow: hidden;
}

.form-preview img {
  width: 100%;
  height: 100%;
  min-height: 112px;
  object-fit: cover;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 22px;
}

@media (max-width: 760px) {
  .page-header,
  .toolbar,
  .modal-head,
  .modal-actions {
    flex-direction: column;
  }

  .primary-btn,
  .ghost-btn,
  .close-btn,
  .search-field,
  .filter-field,
  .search-input,
  .filter-select,
  .clear-btn {
    width: 100%;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .pet-cell {
    align-items: flex-start;
  }
}

@media (max-width: 640px) {
  .table-panel {
    padding: 12px;
  }

  .table-wrap {
    overflow: visible;
  }

  table,
  thead,
  tbody,
  tr,
  td {
    display: block;
    width: 100%;
    min-width: 0;
  }

  table {
    border-collapse: separate;
  }

  thead {
    display: none;
  }

  tbody {
    display: grid;
    gap: 12px;
  }

  tr {
    padding: 14px;
    border: 1px solid rgba(217, 226, 236, 0.9);
    border-radius: 16px;
    background: #ffffff;
  }

  td {
    display: grid;
    grid-template-columns: 108px minmax(0, 1fr);
    gap: 10px;
    padding: 8px 0;
    border-bottom: 1px solid rgba(226, 232, 240, 0.72);
    text-align: left !important;
  }

  td:last-child {
    border-bottom: 0;
    padding-bottom: 0;
  }

  td::before {
    content: attr(data-label);
    color: #64748b;
    font-size: 12px;
    font-weight: 800;
  }

  td.state {
    display: block;
    text-align: center !important;
  }

  td.state::before {
    content: none;
  }

  .actions {
    justify-content: stretch;
  }
}
</style>
