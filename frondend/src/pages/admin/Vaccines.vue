<template>
  <div class="admin-page">
    <section class="page-header">
      <div>
        <p class="eyebrow">ข้อมูลวัคซีน</p>
        <h1>จัดการวัคซีน</h1>
        <p class="subtitle">บันทึกประวัติฉีดวัคซีนเชื่อมสัตว์เลี้ยง บริการ และสัตวแพทย์</p>
      </div>
      <button class="primary-btn" @click="openAddModal">เพิ่มวัคซีน</button>
    </section>

    <section class="toolbar">
      <input v-model="searchQuery" class="search-input" placeholder="ค้นหารหัสวัคซีน ชื่อวัคซีน ชื่อสัตว์ หรือชื่อหมอ" />
      <button class="ghost-btn" @click="reloadAll">รีเฟรช</button>
    </section>

    <section class="table-panel">
      <div v-if="loading" class="state">กำลังโหลดข้อมูล...</div>
      <div v-else-if="error" class="state error">{{ error }}</div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>รหัส</th>
              <th>สัตว์เลี้ยง</th>
              <th>วัคซีน</th>
              <th>สัตวแพทย์</th>
              <th class="right">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in filteredRows" :key="row.vac_rec_id">
              <td><strong>{{ row.vac_rec_id }}</strong></td>
              <td>{{ row.pet_name || '-' }}</td>
              <td>
                <div>{{ row.vaccine_name || '-' }}</div>
                <span class="muted">{{ row.vac_date || '-' }}</span>
              </td>
              <td>{{ row.vet_name || '-' }}</td>
              <td class="center">
                <div class="actions">
                  <button class="action edit" @click="openEditModal(row)">แก้ไข</button>
                  <button class="action delete" @click="deleteRow(row)">ลบ</button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredRows.length === 0">
              <td colspan="5" class="state">ยังไม่มีข้อมูลวัคซีน</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div v-if="isModalOpen" class="modal-overlay" @click.self="closeModal">
      <form class="modal" @submit.prevent="submitRow">
        <div class="modal-head">
          <div>
            <h2>{{ modalMode === 'add' ? 'เพิ่มวัคซีน' : 'แก้ไขวัคซีน' }}</h2>
            <p>เชื่อมข้อมูลกับสัตว์เลี้ยง บริการ และสัตวแพทย์ให้ครบ</p>
          </div>
          <button type="button" class="close-btn" @click="closeModal">ปิด</button>
        </div>

        <div class="form-grid">
          <label>
            ชื่อวัคซีน
            <input v-model="form.vaccine_name" required />
          </label>
          <label>
            Lot number
            <input v-model="form.lot_number" />
          </label>
          <label>
            วันที่ฉีด
            <input v-model="form.vac_date" type="date" required />
          </label>
          <label>
            บริการ
            <select v-model="form.service_id">
              <option value="">ไม่ระบุ</option>
              <option v-for="service in services" :key="service.service_id" :value="service.service_id">
                {{ service.service_name }}
              </option>
            </select>
          </label>
          <label>
            สัตว์เลี้ยง
            <select v-model="form.pet_id" required>
              <option value="">เลือกสัตว์เลี้ยง</option>
              <option v-for="pet in pets" :key="pet.pet_id" :value="pet.pet_id">
                {{ pet.pet_name }} ({{ pet.owner_name }})
              </option>
            </select>
          </label>
          <label class="full">
            สัตวแพทย์
            <select v-model="form.vet_id">
              <option value="">ไม่ระบุ</option>
              <option v-for="vet in vets" :key="vet.vet_id" :value="vet.vet_id">
                {{ vet.vet_name }}
              </option>
            </select>
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

const rows = ref([])
const pets = ref([])
const services = ref([])
const vets = ref([])
const loading = ref(false)
const error = ref('')
const searchQuery = ref('')
const isModalOpen = ref(false)
const modalMode = ref('add')
const form = ref({})

const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` })

const fetchRows = async () => {
  const res = await axios.get('http://localhost:3000/api/admin/vaccines', { headers: headers() })
  rows.value = res.data || []
}

const fetchLookups = async () => {
  const [petRes, serviceRes, vetRes] = await Promise.all([
    axios.get('http://localhost:3000/api/admin/pets', { headers: headers() }),
    axios.get('http://localhost:3000/api/services', { headers: headers() }),
    axios.get('http://localhost:3000/api/admin/veterinarians', { headers: headers() })
  ])
  pets.value = petRes.data || []
  services.value = serviceRes.data || []
  vets.value = vetRes.data || []
}

const reloadAll = async () => {
  try {
    loading.value = true
    error.value = ''
    await Promise.all([fetchRows(), fetchLookups()])
  } catch (err) {
    error.value = err.response?.data?.message || 'โหลดข้อมูลวัคซีนไม่สำเร็จ'
  } finally {
    loading.value = false
  }
}

const filteredRows = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return rows.value
  return rows.value.filter((row) =>
    [row.vac_rec_id, row.vaccine_name, row.pet_name, row.vet_name, row.lot_number]
      .some((value) => String(value || '').toLowerCase().includes(q))
  )
})

const emptyForm = () => ({
  vaccine_name: '',
  lot_number: '',
  vac_date: '',
  service_id: '',
  pet_id: '',
  vet_id: ''
})

const openAddModal = () => {
  modalMode.value = 'add'
  form.value = emptyForm()
  isModalOpen.value = true
}

const openEditModal = (row) => {
  modalMode.value = 'edit'
  form.value = { ...row }
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
}

const submitRow = async () => {
  try {
    if (modalMode.value === 'add') {
      await axios.post('http://localhost:3000/api/admin/vaccines', form.value, { headers: headers() })
      alert('เพิ่มข้อมูลวัคซีนสำเร็จ')
    } else {
      await axios.put(`http://localhost:3000/api/admin/vaccines/${form.value.vac_rec_id}`, form.value, { headers: headers() })
      alert('แก้ไขข้อมูลวัคซีนสำเร็จ')
    }
    closeModal()
    reloadAll()
  } catch (err) {
    alert(err.response?.data?.message || 'บันทึกข้อมูลไม่สำเร็จ')
  }
}

const deleteRow = async (row) => {
  if (!confirm(`ยืนยันลบรายการวัคซีน "${row.vaccine_name}" หรือไม่?`)) return
  try {
    await axios.delete(`http://localhost:3000/api/admin/vaccines/${row.vac_rec_id}`, { headers: headers() })
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
table { width: 100%; min-width: 860px; border-collapse: collapse; }
th, td { padding: 14px 16px; border-bottom: 1px solid #edf2f7; text-align: left; vertical-align: top; }
th { background: #f8fafc; color: #475569; font-size: 13px; }
strong, .muted { display: block; }
.muted { color: #64748b; font-size: 13px; margin-top: 3px; }
.center { text-align: center; }
.right { text-align: right; }
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
.full { grid-column: 1 / -1; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 22px; }
@media (max-width: 760px) {
  .page-header, .toolbar { flex-direction: column; }
  .primary-btn, .ghost-btn, .search-input { width: 100%; }
  .form-grid { grid-template-columns: 1fr; }
}
</style>
