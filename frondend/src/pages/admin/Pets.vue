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
      <input v-model="searchQuery" class="search-input" placeholder="ค้นหาชื่อสัตว์ ประเภท สายพันธุ์ หรือเจ้าของ" />
      <button class="ghost-btn" @click="reloadAll">รีเฟรช</button>
    </section>

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
              <td>
                <strong>{{ pet.pet_name }}</strong>
                <span class="muted">{{ pet.pet_id }}</span>
              </td>
              <td>
                <div>{{ pet.owner_name || '-' }}</div>
                <span class="muted">{{ pet.owner_tel || '-' }}</span>
              </td>
              <td>
                <div>{{ pet.pet_type || '-' }} / {{ pet.pet_breed || '-' }}</div>
                <span class="muted">{{ pet.pet_gender || '-' }} · {{ pet.pet_color || '-' }}</span>
              </td>
              <td>
                <div>{{ pet.sterile_status || '-' }}</div>
                <span class="muted">แพ้ยา: {{ pet.drug_allergy || '-' }}</span>
              </td>
              <td class="center">
                <div class="actions">
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
            เพศ
            <select v-model="form.pet_gender" required>
              <option value="" disabled>เลือกเพศ</option>
              <option value="ผู้">ผู้</option>
              <option value="เมีย">เมีย</option>
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
            <input v-model="form.pet_birthdate" type="date" />
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

const pets = ref([])
const owners = ref([])
const loading = ref(false)
const error = ref('')
const searchQuery = ref('')
const isModalOpen = ref(false)
const modalMode = ref('add')
const form = ref({})

const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` })

const normalizeDate = (value) => {
  if (!value) return ''
  return String(value).slice(0, 10)
}

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
  if (!q) return pets.value
  return pets.value.filter((pet) =>
    [pet.pet_name, pet.pet_type, pet.pet_breed, pet.pet_gender, pet.owner_name, pet.pet_id]
      .some((value) => String(value || '').toLowerCase().includes(q))
  )
})

const emptyForm = () => ({
  owner_id: '',
  pet_name: '',
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
    if (modalMode.value === 'add') {
      await axios.post('http://localhost:3000/api/admin/pets', form.value, { headers: headers() })
      alert('เพิ่มสัตว์เลี้ยงสำเร็จ')
    } else {
      await axios.put(`http://localhost:3000/api/admin/pets/${form.value.pet_id}`, form.value, { headers: headers() })
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
.admin-page { color: #1f2937; }
.page-header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 18px; }
.eyebrow { margin: 0 0 4px; color: #2563eb; font-size: 13px; font-weight: 700; }
h1 { margin: 0; font-size: 28px; font-weight: 800; }
.subtitle { margin: 6px 0 0; color: #64748b; }
.toolbar { display: flex; gap: 12px; margin-bottom: 18px; }
.search-input { flex: 1; min-width: 220px; padding: 12px 14px; border: 1px solid #dbe3ec; border-radius: 8px; background: #fff; }
.primary-btn, .ghost-btn, .action, .close-btn { border: 0; border-radius: 8px; font-weight: 700; cursor: pointer; }
.primary-btn { background: #2563eb; color: #fff; padding: 12px 18px; }
.ghost-btn { background: #eef2f7; color: #334155; padding: 12px 16px; }
.table-panel { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
.table-wrap { overflow-x: auto; }
table { width: 100%; min-width: 880px; border-collapse: collapse; }
th, td { padding: 14px 16px; border-bottom: 1px solid #edf2f7; text-align: left; vertical-align: top; }
th { background: #f8fafc; color: #475569; font-size: 13px; }
strong, .muted { display: block; }
.muted { color: #64748b; font-size: 13px; margin-top: 3px; }
.center { text-align: center; }
.actions { display: flex; justify-content: center; gap: 8px; }
.action { padding: 8px 10px; }
.action.edit { background: #dbeafe; color: #1d4ed8; }
.action.delete { background: #fee2e2; color: #b91c1c; }
.state { padding: 28px; text-align: center; color: #64748b; }
.state.error { color: #b91c1c; }
.modal-overlay { position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(15, 23, 42, 0.55); }
.modal { width: min(760px, 100%); max-height: 90vh; overflow-y: auto; background: #fff; border-radius: 8px; padding: 24px; }
.modal-head { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
.modal-head h2 { margin: 0; }
.modal-head p { margin: 4px 0 0; color: #64748b; }
.close-btn { background: #f1f5f9; color: #475569; padding: 8px 12px; align-self: flex-start; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
label { display: grid; gap: 7px; font-weight: 700; color: #334155; }
input, textarea, select { width: 100%; box-sizing: border-box; padding: 11px 12px; border: 1px solid #dbe3ec; border-radius: 8px; font: inherit; }
textarea { resize: vertical; }
.full { grid-column: 1 / -1; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 22px; }
@media (max-width: 760px) {
  .page-header, .toolbar { flex-direction: column; }
  .primary-btn, .ghost-btn, .search-input { width: 100%; }
  .form-grid { grid-template-columns: 1fr; }
}
</style>
