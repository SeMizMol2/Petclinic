<template>
  <div class="expense-page">

    <div class="clinic-card header-card">
      <div class="header-content">
        <div class="icon-box">💸</div>
        <div class="title-box">
          <h1>จัดการรายจ่ายของคลินิก</h1>
          <p>บันทึกรายจ่ายประจำวัน/ประจำเดือน เพื่อให้แดชบอร์ดคำนวณกำไร-ขาดทุนได้ถูกต้อง</p>
        </div>
      </div>
      <div class="header-actions">
        <button @click="openCategoryModal" class="btn-secondary">🏷️ จัดการหมวดหมู่</button>
        <button @click="openAddModal" class="btn-primary">
          <span class="icon-sm">➕</span> เพิ่มรายจ่าย
        </button>
      </div>
    </div>

    <div class="filter-section">
      <select v-model="filterMonth" class="custom-select">
        <option v-for="m in 12" :key="m" :value="m">เดือน {{ m }}</option>
      </select>
      <select v-model="filterYear" class="custom-select">
        <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
      </select>
      <div class="total-badge">ยอดรวมเดือนนี้: <strong>{{ formatPrice(totalExpense) }} บาท</strong></div>
    </div>

    <div class="clinic-card table-card">
      <div class="table-responsive">
        <table class="clinic-table">
          <thead>
            <tr>
              <th>วันที่</th>
              <th>รายการ</th>
              <th>หมวดหมู่</th>
              <th class="text-right">จำนวนเงิน (บาท)</th>
              <th class="text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="exp in expenses" :key="exp.exp_id">
              <td>{{ formatDate(exp.exp_date) }}</td>
              <td class="font-bold">{{ exp.exp_title }}</td>
              <td>
                <span class="cat-badge">{{ exp.category_name || 'ไม่ระบุหมวดหมู่' }}</span>
              </td>
              <td class="text-right font-bold text-red-600">{{ formatPrice(exp.exp_amount) }}</td>
              <td class="text-center">
                <div class="action-buttons">
                  <button @click="openEditModal(exp)" class="btn-action edit" title="แก้ไข">✏️</button>
                  <button @click="deleteExpense(exp.exp_id)" class="btn-action delete" title="ลบ">🗑️</button>
                </div>
              </td>
            </tr>
            <tr v-if="expenses.length === 0">
              <td colspan="5" class="empty-state">
                <div class="empty-icon">📭</div>
                <h3>ยังไม่มีรายจ่ายในเดือนนี้</h3>
                <p>กดปุ่ม "เพิ่มรายจ่าย" ด้านบนเพื่อเริ่มบันทึก</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal: เพิ่ม/แก้ไขรายจ่าย -->
    <div v-if="isModalOpen" class="custom-modal-overlay" @click.self="isModalOpen = false">
      <div class="custom-modal-box">
        <div class="modal-header">
          <div class="modal-title">
            <div class="modal-icon">{{ modalMode === 'add' ? '➕' : '✏️' }}</div>
            <div>
              <h3>{{ modalMode === 'add' ? 'เพิ่มรายจ่ายใหม่' : 'แก้ไขรายจ่าย' }}</h3>
              <p>กรอกรายละเอียดรายจ่ายของคลินิก</p>
            </div>
          </div>
          <button @click="isModalOpen = false" class="close-btn">✕</button>
        </div>

        <form @submit.prevent="handleSubmit">
          <div class="form-group">
            <label>ชื่อรายการ <span class="required">*</span></label>
            <input v-model="form.exp_title" type="text" class="custom-input" required placeholder="เช่น ค่าน้ำ, ค่าไฟ, ซื้อยา">
          </div>

          <div class="form-group">
            <label>จำนวนเงิน (บาท) <span class="required">*</span></label>
            <input v-model="form.exp_amount" type="number" step="0.01" class="custom-input" required placeholder="0.00">
          </div>

          <div class="form-group">
            <label>วันที่ <span class="required">*</span></label>
            <input v-model="form.exp_date" type="date" class="custom-input" required>
          </div>

          <div class="form-group">
            <label>หมวดหมู่</label>
            <select v-model="form.category_id" class="custom-input">
              <option value="">-- ไม่ระบุหมวดหมู่ --</option>
              <option v-for="c in expenseCategories" :key="c.category_id" :value="c.category_id">
                {{ c.category_name }}
              </option>
            </select>
          </div>

          <div class="modal-actions">
            <button type="button" @click="isModalOpen = false" class="btn-cancel">ยกเลิก</button>
            <button type="submit" class="btn-submit">บันทึกข้อมูล</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal: จัดการหมวดหมู่ -->
    <div v-if="isCategoryModalOpen" class="custom-modal-overlay" @click.self="isCategoryModalOpen = false">
      <div class="custom-modal-box">
        <div class="modal-header">
          <div class="modal-title">
            <div class="modal-icon">🏷️</div>
            <div>
              <h3>จัดการหมวดหมู่</h3>
              <p>ใช้แยกประเภทรายรับ-รายจ่ายให้ดูภาพรวมง่ายขึ้น</p>
            </div>
          </div>
          <button @click="isCategoryModalOpen = false" class="close-btn">✕</button>
        </div>

        <form @submit.prevent="handleAddCategory" class="cat-add-form">
          <input v-model="newCategory.category_name" type="text" class="custom-input" placeholder="ชื่อหมวดหมู่ใหม่" required>
          <select v-model="newCategory.type" class="custom-input">
            <option value="รายจ่าย">รายจ่าย</option>
            <option value="รายรับ">รายรับ</option>
          </select>
          <button type="submit" class="btn-submit small">เพิ่ม</button>
        </form>

        <div class="cat-list">
          <div v-for="c in allCategories" :key="c.category_id" class="cat-list-item">
            <span>{{ c.category_name }} <em>({{ c.type }})</em></span>
            <button @click="deleteCategory(c.category_id)" class="btn-action delete small">🗑️</button>
          </div>
          <div v-if="allCategories.length === 0" class="empty-state small">ยังไม่มีหมวดหมู่</div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import axios from 'axios'

const API_BASE = 'http://localhost:3000/api/expenses'

const expenses = ref([])
const allCategories = ref([])
const isModalOpen = ref(false)
const isCategoryModalOpen = ref(false)
const modalMode = ref('add')
const form = ref({})
const newCategory = ref({ category_name: '', type: 'รายจ่าย' })

const now = new Date()
const filterMonth = ref(now.getMonth() + 1)
const filterYear = ref(now.getFullYear())
const yearOptions = computed(() => {
  const y = now.getFullYear()
  return [y - 1, y, y + 1]
})

const expenseCategories = computed(() => allCategories.value.filter(c => c.type === 'รายจ่าย'))
const totalExpense = computed(() => expenses.value.reduce((sum, e) => sum + Number(e.exp_amount), 0))

const formatPrice = (val) => Number(val).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const formatDate = (d) => new Date(d).toLocaleDateString('th-TH')
const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` })

const fetchExpenses = async () => {
  try {
    const res = await axios.get(API_BASE, {
      headers: authHeader(),
      params: { month: filterMonth.value, year: filterYear.value }
    })
    expenses.value = res.data
  } catch (err) { console.error(err) }
}

const fetchCategories = async () => {
  try {
    const res = await axios.get(`${API_BASE}/categories`, { headers: authHeader() })
    allCategories.value = res.data
  } catch (err) { console.error(err) }
}

const openAddModal = () => {
  modalMode.value = 'add'
  form.value = { exp_title: '', exp_amount: '', exp_date: new Date().toISOString().slice(0, 10), category_id: '' }
  isModalOpen.value = true
}

const openEditModal = (exp) => {
  modalMode.value = 'edit'
  form.value = { ...exp, exp_date: exp.exp_date?.slice(0, 10) }
  isModalOpen.value = true
}

const openCategoryModal = () => { isCategoryModalOpen.value = true }

const handleSubmit = async () => {
  try {
    if (modalMode.value === 'add') {
      await axios.post(API_BASE, form.value, { headers: authHeader() })
    } else {
      await axios.put(`${API_BASE}/${form.value.exp_id}`, form.value, { headers: authHeader() })
    }
    isModalOpen.value = false
    fetchExpenses()
  } catch (err) { alert('บันทึกไม่สำเร็จ'); console.error(err) }
}

const deleteExpense = async (id) => {
  if (!confirm('ยืนยันที่จะลบรายจ่ายนี้หรือไม่?')) return
  try {
    await axios.delete(`${API_BASE}/${id}`, { headers: authHeader() })
    fetchExpenses()
  } catch (err) { alert('ลบไม่สำเร็จ'); console.error(err) }
}

const handleAddCategory = async () => {
  try {
    await axios.post(`${API_BASE}/categories`, newCategory.value, { headers: authHeader() })
    newCategory.value = { category_name: '', type: 'รายจ่าย' }
    fetchCategories()
  } catch (err) { alert('เพิ่มหมวดหมู่ไม่สำเร็จ'); console.error(err) }
}

const deleteCategory = async (id) => {
  if (!confirm('ยืนยันที่จะลบหมวดหมู่นี้หรือไม่?')) return
  try {
    await axios.delete(`${API_BASE}/categories/${id}`, { headers: authHeader() })
    fetchCategories()
  } catch (err) { alert('ลบไม่สำเร็จ (อาจมีรายจ่ายผูกอยู่)'); console.error(err) }
}

watch([filterMonth, filterYear], fetchExpenses)

onMounted(() => {
  fetchExpenses()
  fetchCategories()
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap');

.expense-page { font-family: 'Sarabun', sans-serif; background-color: #f8fafc; min-height: 100vh; padding: 24px; color: #1e293b; box-sizing: border-box; }
.clinic-card { background: #ffffff; border-radius: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #f1f5f9; padding: 24px; margin-bottom: 24px; }
.header-card { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
.header-content { display: flex; align-items: center; gap: 16px; }
.header-actions { display: flex; gap: 12px; }
.icon-box { width: 56px; height: 56px; background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%); border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 28px; color: white; box-shadow: 0 10px 15px -3px rgba(239, 68, 68, 0.3); }
.title-box h1 { margin: 0; font-size: 24px; font-weight: 800; }
.title-box p { margin: 4px 0 0 0; font-size: 14px; color: #64748b; font-weight: 500; }
.btn-primary { background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%); color: #ffffff; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 700; font-size: 15px; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 14px 0 rgba(239, 68, 68, 0.3); transition: 0.2s; font-family: inherit; }
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4); }
.btn-secondary { background: #f1f5f9; color: #334155; border: none; padding: 12px 20px; border-radius: 12px; font-weight: 700; font-size: 15px; cursor: pointer; transition: 0.2s; font-family: inherit; }
.btn-secondary:hover { background: #e2e8f0; }

.filter-section { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
.custom-select { padding: 10px 14px; border-radius: 10px; border: 1px solid #e2e8f0; background: white; font-family: inherit; font-size: 14px; }
.total-badge { margin-left: auto; background: #fef2f2; color: #b91c1c; padding: 10px 18px; border-radius: 12px; font-weight: 700; }

.table-card { padding: 0; overflow: hidden; }
.table-responsive { width: 100%; overflow-x: auto; }
.clinic-table { width: 100%; border-collapse: collapse; min-width: 700px; }
.clinic-table th { background-color: #f8fafc; padding: 16px 24px; text-align: left; font-size: 13px; font-weight: 700; color: #64748b; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; }
.clinic-table td { padding: 16px 24px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
.clinic-table tbody tr:hover { background-color: #fef2f2; }

.cat-badge { background: #f1f5f9; color: #475569; padding: 6px 12px; border-radius: 8px; font-weight: 600; font-size: 13px; border: 1px solid #e2e8f0; }
.font-bold { font-weight: 700; } .text-red-600 { color: #dc2626; } .text-center { text-align: center; } .text-right { text-align: right; }

.action-buttons { display: flex; justify-content: center; gap: 8px; }
.btn-action { background: #ffffff; border: 1px solid #e2e8f0; width: 36px; height: 36px; border-radius: 10px; cursor: pointer; transition: 0.2s; display: inline-flex; align-items: center; justify-content: center; }
.btn-action.edit:hover { background: #fffbeb; border-color: #fde68a; transform: translateY(-2px); }
.btn-action.delete:hover { background: #fef2f2; border-color: #fecaca; transform: translateY(-2px); }
.btn-action.small { width: 30px; height: 30px; font-size: 13px; }

.empty-state { padding: 60px 20px; text-align: center; }
.empty-state.small { padding: 20px; color: #94a3b8; }
.empty-icon { font-size: 48px; background: #f8fafc; width: 100px; height: 100px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px; border: 1px solid #e2e8f0; }

.custom-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; }
.custom-modal-box { background-color: #ffffff; width: 90%; max-width: 500px; border-radius: 24px; padding: 32px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); max-height: 85vh; overflow-y: auto; }
@keyframes slideUp { from { opacity: 0; transform: translateY(30px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
.modal-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 1px solid #f1f5f9; padding-bottom: 20px; }
.modal-title { display: flex; gap: 16px; align-items: center; }
.modal-icon { background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%); color: white; width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 24px; }
.modal-title h3 { margin: 0; font-size: 20px; font-weight: 800; }
.modal-title p { margin: 4px 0 0 0; font-size: 13px; color: #64748b; }
.close-btn { background: #f1f5f9; border: none; width: 36px; height: 36px; border-radius: 50%; color: #64748b; cursor: pointer; font-weight: bold; transition: 0.2s; }
.close-btn:hover { background: #fee2e2; color: #ef4444; }

.form-group { margin-bottom: 20px; }
.form-group label { display: block; font-size: 14px; font-weight: 700; color: #334155; margin-bottom: 8px; }
.required { color: #ef4444; }
.custom-input { width: 100%; padding: 14px 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 14px; outline: none; font-family: inherit; transition: 0.2s; box-sizing: border-box; }
.custom-input:focus { background-color: #ffffff; border-color: #ef4444; box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1); }

.modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 32px; padding-top: 20px; border-top: 1px solid #f1f5f9; }
.btn-cancel { padding: 12px 24px; background-color: #f1f5f9; color: #475569; border: none; border-radius: 12px; font-weight: 700; cursor: pointer; transition: 0.2s; font-family: inherit; }
.btn-cancel:hover { background-color: #e2e8f0; color: #1e293b; }
.btn-submit { padding: 12px 28px; background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%); color: #ffffff; border: none; border-radius: 12px; font-weight: 700; cursor: pointer; transition: 0.2s; font-family: inherit; box-shadow: 0 4px 14px 0 rgba(239, 68, 68, 0.3); }
.btn-submit:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4); }
.btn-submit.small { padding: 10px 18px; white-space: nowrap; }

.cat-add-form { display: flex; gap: 10px; margin-bottom: 20px; }
.cat-list { display: flex; flex-direction: column; gap: 8px; max-height: 240px; overflow-y: auto; }
.cat-list-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #f8fafc; border-radius: 10px; border: 1px solid #f1f5f9; }
.cat-list-item em { color: #94a3b8; font-style: normal; font-size: 12px; }
</style>
