<template>
  <div class="admin-page">
    <section class="page-header">
      <div>
        <p class="eyebrow">ข้อมูลเจ้าของสัตว์</p>
        <h1>จัดการเจ้าของสัตว์เลี้ยง</h1>
        <p class="subtitle">เพิ่ม แก้ไข และค้นหาข้อมูลเจ้าของสัตว์สำหรับใช้เชื่อมกับข้อมูลสัตว์เลี้ยง</p>
      </div>
      <button class="primary-btn" @click="openAddModal">เพิ่มเจ้าของสัตว์</button>
    </section>

    <section class="toolbar">
      <input v-model="searchQuery" class="search-input" placeholder="ค้นหาชื่อ เบอร์โทร อีเมล หรือ username" />
      <button class="ghost-btn" @click="fetchOwners">รีเฟรช</button>
    </section>

    <section class="table-panel">
      <div v-if="loading" class="state">กำลังโหลดข้อมูล...</div>
      <div v-else-if="error" class="state error">{{ error }}</div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>เจ้าของสัตว์</th>
              <th>บัญชี</th>
              <th>ติดต่อ</th>
              <th class="center">จำนวนสัตว์</th>
              <th class="center">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="owner in filteredOwners" :key="owner.owner_id">
              <td>
                <strong>{{ owner.owner_name }}</strong>
                <span class="muted">{{ owner.owner_id }}</span>
              </td>
              <td>{{ owner.username || '-' }}</td>
              <td>
                <div>{{ owner.owner_tel || '-' }}</div>
                <span class="muted">{{ owner.owner_email || '-' }}</span>
              </td>
              <td class="center">{{ owner.pet_count }}</td>
              <td class="center">
                <div class="actions">
                  <button class="action edit" @click="openEditModal(owner)">แก้ไข</button>
                  <button class="action delete" @click="deleteOwner(owner)">ลบ</button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredOwners.length === 0">
              <td colspan="5" class="state">ยังไม่มีข้อมูลเจ้าของสัตว์</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div v-if="isModalOpen" class="modal-overlay" @click.self="closeModal">
      <form class="modal" @submit.prevent="submitOwner">
        <div class="modal-head">
          <div>
            <h2>{{ modalMode === 'add' ? 'เพิ่มเจ้าของสัตว์' : 'แก้ไขเจ้าของสัตว์' }}</h2>
            <p>ข้อมูลนี้ใช้สำหรับค้นหาเจ้าของและผูกกับสัตว์เลี้ยงในระบบ</p>
          </div>
          <button type="button" class="close-btn" @click="closeModal">ปิด</button>
        </div>

        <div class="form-grid">
          <label>
            ชื่อ-นามสกุล
            <input v-model="form.owner_name" required />
          </label>
          <label>
            Username
            <input v-model="form.username" :placeholder="modalMode === 'add' ? 'เว้นว่างเพื่อสร้างอัตโนมัติ' : ''" />
          </label>
          <label v-if="modalMode === 'add'">
            รหัสผ่านเริ่มต้น
            <input v-model="form.password" placeholder="เว้นว่างเพื่อใช้ 123456" />
          </label>
          <label>
            เบอร์โทร
            <input v-model="form.owner_tel" />
          </label>
          <label>
            อีเมล
            <input v-model="form.owner_email" type="email" />
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

const owners = ref([])
const loading = ref(false)
const error = ref('')
const searchQuery = ref('')
const isModalOpen = ref(false)
const modalMode = ref('add')
const form = ref({})

const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` })

const fetchOwners = async () => {
  try {
    loading.value = true
    error.value = ''
    const res = await axios.get('http://localhost:3000/api/admin/owners', { headers: headers() })
    owners.value = res.data
  } catch (err) {
    error.value = err.response?.data?.message || 'โหลดข้อมูลเจ้าของสัตว์ไม่สำเร็จ'
  } finally {
    loading.value = false
  }
}

const filteredOwners = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return owners.value
  return owners.value.filter((owner) =>
    [owner.owner_name, owner.owner_tel, owner.owner_email, owner.username, owner.owner_id]
      .some((value) => String(value || '').toLowerCase().includes(q))
  )
})

const openAddModal = () => {
  modalMode.value = 'add'
  form.value = {
    owner_name: '',
    username: '',
    password: '',
    owner_email: '',
    owner_tel: ''
  }
  isModalOpen.value = true
}

const openEditModal = (owner) => {
  modalMode.value = 'edit'
  form.value = { ...owner }
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
}

const submitOwner = async () => {
  try {
    if (modalMode.value === 'add') {
      const res = await axios.post('http://localhost:3000/api/admin/owners', form.value, { headers: headers() })
      alert(`เพิ่มเจ้าของสัตว์สำเร็จ\nUsername: ${res.data.username}\nรหัสผ่านเริ่มต้น: ${res.data.default_password}`)
    } else {
      await axios.put(`http://localhost:3000/api/admin/owners/${form.value.owner_id}`, form.value, { headers: headers() })
      alert('แก้ไขเจ้าของสัตว์สำเร็จ')
    }
    closeModal()
    fetchOwners()
  } catch (err) {
    alert(err.response?.data?.message || 'บันทึกข้อมูลไม่สำเร็จ')
  }
}

const deleteOwner = async (owner) => {
  const ok = confirm(`ยืนยันลบเจ้าของสัตว์ "${owner.owner_name}" หรือไม่?\nข้อมูลสัตว์เลี้ยงที่ผูกอยู่จะถูกลบตามด้วย`)
  if (!ok) return

  try {
    await axios.delete(`http://localhost:3000/api/admin/owners/${owner.owner_id}`, { headers: headers() })
    fetchOwners()
  } catch (err) {
    alert(err.response?.data?.message || 'ลบข้อมูลไม่สำเร็จ')
  }
}

onMounted(fetchOwners)
</script>

<style scoped>
.admin-page { color: #1f2937; }
.page-header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 18px; }
.eyebrow { margin: 0 0 4px; color: #0f766e; font-size: 13px; font-weight: 700; }
h1 { margin: 0; font-size: 28px; font-weight: 800; }
.subtitle { margin: 6px 0 0; color: #64748b; }
.toolbar { display: flex; gap: 12px; margin-bottom: 18px; }
.search-input { flex: 1; min-width: 220px; padding: 12px 14px; border: 1px solid #dbe3ec; border-radius: 8px; background: #fff; }
.primary-btn, .ghost-btn, .action, .close-btn { border: 0; border-radius: 8px; font-weight: 700; cursor: pointer; }
.primary-btn { background: #0f766e; color: #fff; padding: 12px 18px; }
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
.action.edit { background: #e0f2fe; color: #0369a1; }
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
