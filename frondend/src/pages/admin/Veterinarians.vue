<template>
  <div class="admin-page">
    <section class="page-header">
      <div>
        <p class="eyebrow">ข้อมูลสัตวแพทย์</p>
        <h1>จัดการสัตวแพทย์</h1>
        <p class="subtitle">เพิ่ม แก้ไข และเชื่อมสัตวแพทย์กับบัญชีผู้ใช้สำหรับงานรักษา ผ่าตัด และวัคซีน</p>
      </div>
      <button class="primary-btn" @click="openAddModal">เพิ่มสัตวแพทย์</button>
    </section>

    <section class="toolbar">
      <input v-model="searchQuery" class="search-input" placeholder="ค้นหาชื่อสัตวแพทย์ เลขใบประกอบวิชาชีพ เบอร์โทร หรือ username" />
      <button class="ghost-btn" @click="reloadAll">รีเฟรช</button>
    </section>

    <section class="table-panel">
      <div v-if="loading" class="state">กำลังโหลดข้อมูล...</div>
      <div v-else-if="error" class="state error">{{ error }}</div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>สัตวแพทย์</th>
              <th>ใบประกอบวิชาชีพ</th>
              <th>ติดต่อ</th>
              <th>บัญชีผู้ใช้</th>
              <th class="center">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="vet in filteredVets" :key="vet.vet_id">
              <td>
                <strong>{{ vet.vet_name }}</strong>
                <span class="muted">{{ vet.vet_id }}</span>
              </td>
              <td>{{ vet.license_no || '-' }}</td>
              <td>{{ vet.vet_tel || '-' }}</td>
              <td>{{ vet.username || '-' }}</td>
              <td class="center">
                <div class="actions">
                  <button class="action edit" @click="openEditModal(vet)">แก้ไข</button>
                  <button class="action delete" @click="deleteVet(vet)">ลบ</button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredVets.length === 0">
              <td colspan="5" class="state">ยังไม่มีข้อมูลสัตวแพทย์</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div v-if="isModalOpen" class="modal-overlay" @click.self="closeModal">
      <form class="modal" @submit.prevent="submitVet">
        <div class="modal-head">
          <div>
            <h2>{{ modalMode === 'add' ? 'เพิ่มสัตวแพทย์' : 'แก้ไขข้อมูลสัตวแพทย์' }}</h2>
            <p>ผูกข้อมูลสัตวแพทย์กับบัญชีผู้ใช้ได้ในกรณีที่มีบัญชีอยู่แล้ว</p>
          </div>
          <button type="button" class="close-btn" @click="closeModal">ปิด</button>
        </div>

        <div class="form-grid">
          <label>
            ชื่อ-นามสกุล
            <input v-model="form.vet_name" required />
          </label>
          <label>
            เลขใบประกอบวิชาชีพ
            <input v-model="form.license_no" />
          </label>
          <label>
            เบอร์โทร
            <input v-model="form.vet_tel" />
          </label>
          <label>
            บัญชีผู้ใช้
            <select v-model="form.user_id">
              <option value="">ไม่เชื่อมบัญชี</option>
              <option v-for="user in users" :key="user.user_id" :value="user.user_id">
                {{ user.username }} ({{ user.user_id }})
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

const vets = ref([])
const users = ref([])
const loading = ref(false)
const error = ref('')
const searchQuery = ref('')
const isModalOpen = ref(false)
const modalMode = ref('add')
const form = ref({})

const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` })

const fetchVets = async () => {
  const res = await axios.get('http://localhost:3000/api/admin/veterinarians', { headers: headers() })
  vets.value = res.data
}

const fetchUsers = async () => {
  const res = await axios.get('http://localhost:3000/api/admin/users', { headers: headers() })
  users.value = res.data || []
}

const reloadAll = async () => {
  try {
    loading.value = true
    error.value = ''
    await Promise.all([fetchVets(), fetchUsers()])
  } catch (err) {
    error.value = err.response?.data?.message || 'โหลดข้อมูลสัตวแพทย์ไม่สำเร็จ'
  } finally {
    loading.value = false
  }
}

const filteredVets = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return vets.value
  return vets.value.filter((vet) =>
    [vet.vet_name, vet.license_no, vet.vet_tel, vet.username, vet.vet_id]
      .some((value) => String(value || '').toLowerCase().includes(q))
  )
})

const emptyForm = () => ({
  vet_name: '',
  license_no: '',
  vet_tel: '',
  user_id: ''
})

const openAddModal = () => {
  modalMode.value = 'add'
  form.value = emptyForm()
  isModalOpen.value = true
}

const openEditModal = (vet) => {
  modalMode.value = 'edit'
  form.value = {
    vet_id: vet.vet_id,
    vet_name: vet.vet_name || '',
    license_no: vet.license_no || '',
    vet_tel: vet.vet_tel || '',
    user_id: vet.user_id || ''
  }
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
}

const submitVet = async () => {
  try {
    if (modalMode.value === 'add') {
      await axios.post('http://localhost:3000/api/admin/veterinarians', form.value, { headers: headers() })
      alert('เพิ่มข้อมูลสัตวแพทย์สำเร็จ')
    } else {
      await axios.put(`http://localhost:3000/api/admin/veterinarians/${form.value.vet_id}`, form.value, { headers: headers() })
      alert('แก้ไขข้อมูลสัตวแพทย์สำเร็จ')
    }
    closeModal()
    reloadAll()
  } catch (err) {
    alert(err.response?.data?.message || 'บันทึกข้อมูลไม่สำเร็จ')
  }
}

const deleteVet = async (vet) => {
  if (!confirm(`ยืนยันลบข้อมูลสัตวแพทย์ "${vet.vet_name}" หรือไม่?`)) return
  try {
    await axios.delete(`http://localhost:3000/api/admin/veterinarians/${vet.vet_id}`, { headers: headers() })
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
.eyebrow { margin: 0 0 4px; color: #7c3aed; font-size: 13px; font-weight: 700; }
h1 { margin: 0; font-size: 28px; font-weight: 800; }
.subtitle { margin: 6px 0 0; color: #64748b; }
.toolbar { display: flex; gap: 12px; margin-bottom: 18px; }
.search-input { flex: 1; min-width: 220px; padding: 12px 14px; border: 1px solid #dbe3ec; border-radius: 8px; background: #fff; }
.primary-btn, .ghost-btn, .action, .close-btn { border: 0; border-radius: 8px; font-weight: 700; cursor: pointer; }
.primary-btn { background: #7c3aed; color: #fff; padding: 12px 18px; }
.ghost-btn { background: #eef2f7; color: #334155; padding: 12px 16px; }
.table-panel { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
.table-wrap { overflow-x: auto; }
table { width: 100%; min-width: 820px; border-collapse: collapse; }
th, td { padding: 14px 16px; border-bottom: 1px solid #edf2f7; text-align: left; vertical-align: top; }
th { background: #f8fafc; color: #475569; font-size: 13px; }
strong, .muted { display: block; }
.muted { color: #64748b; font-size: 13px; margin-top: 3px; }
.center { text-align: center; }
.actions { display: flex; justify-content: center; gap: 8px; }
.action { padding: 8px 10px; }
.action.edit { background: #ede9fe; color: #6d28d9; }
.action.delete { background: #fee2e2; color: #b91c1c; }
.state { padding: 28px; text-align: center; color: #64748b; }
.state.error { color: #b91c1c; }
.modal-overlay { position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(15, 23, 42, 0.55); }
.modal { width: min(720px, 100%); max-height: 90vh; overflow-y: auto; background: #fff; border-radius: 8px; padding: 24px; }
.modal-head { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
.modal-head h2 { margin: 0; }
.modal-head p { margin: 4px 0 0; color: #64748b; }
.close-btn { background: #f1f5f9; color: #475569; padding: 8px 12px; align-self: flex-start; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
label { display: grid; gap: 7px; font-weight: 700; color: #334155; }
input, select { width: 100%; box-sizing: border-box; padding: 11px 12px; border: 1px solid #dbe3ec; border-radius: 8px; font: inherit; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 22px; }
@media (max-width: 760px) {
  .page-header, .toolbar { flex-direction: column; }
  .primary-btn, .ghost-btn, .search-input { width: 100%; }
  .form-grid { grid-template-columns: 1fr; }
}
</style>
