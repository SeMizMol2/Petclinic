<template>
  <div class="admin-page expenses-admin-page">
    <section class="page-header">
      <div>
        <p class="eyebrow">Expense control</p>
        <h1>จัดการรายจ่ายของคลินิก</h1>
        <p class="subtitle">บันทึกรายจ่ายประจำวันและประจำเดือน เพื่อให้แดชบอร์ดคำนวณกำไร-ขาดทุนได้ถูกต้อง</p>
      </div>
      <div class="page-header-actions">
        <button @click="openCategoryModal" class="ghost-btn">จัดการหมวดหมู่</button>
        <button @click="openAddModal" class="primary-btn">เพิ่มรายจ่าย</button>
      </div>
    </section>

    <section class="toolbar">
      <select v-model="filterMonth">
        <option v-for="m in 12" :key="m" :value="m">เดือน {{ m }}</option>
      </select>
      <select v-model="filterYear">
        <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
      </select>
      <div class="total-badge">ยอดรวมเดือนนี้: <strong>{{ formatPrice(totalExpense) }} บาท</strong></div>
    </section>

    <section class="table-panel">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>วันที่</th>
              <th>รายการ</th>
              <th>หมวดหมู่</th>
              <th class="right">จำนวนเงิน (บาท)</th>
              <th class="center">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="exp in expenses" :key="exp.exp_id">
              <td>{{ formatDate(exp.exp_date) }}</td>
              <td><strong>{{ exp.exp_title }}</strong></td>
              <td>
                <span class="cat-badge">{{ exp.category_name || 'ไม่ระบุหมวดหมู่' }}</span>
              </td>
              <td class="right amount">{{ formatPrice(exp.exp_amount) }}</td>
              <td class="center">
                <div class="action-buttons">
                  <button @click="openEditModal(exp)" class="ghost-btn mini-btn">แก้ไข</button>
                  <button @click="deleteExpense(exp.exp_id)" class="danger-btn mini-btn">ลบ</button>
                </div>
              </td>
            </tr>
            <tr v-if="expenses.length === 0">
              <td colspan="5" class="state">
                <strong>ยังไม่มีรายจ่ายในเดือนนี้</strong>
                <p>กดปุ่มเพิ่มรายจ่ายด้านบนเพื่อเริ่มบันทึก</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div v-if="isModalOpen" class="modal-overlay" @click.self="isModalOpen = false">
      <div class="modal">
        <div class="modal-head">
          <div>
            <h2>{{ modalMode === 'add' ? 'เพิ่มรายจ่ายใหม่' : 'แก้ไขรายจ่าย' }}</h2>
            <p>กรอกรายละเอียดรายจ่ายของคลินิก</p>
          </div>
          <button @click="isModalOpen = false" class="close-btn">ปิด</button>
        </div>

        <form @submit.prevent="handleSubmit">
          <div class="form-grid">
            <label class="full-width">
              <span>ชื่อรายการ *</span>
              <input v-model="form.exp_title" type="text" required placeholder="เช่น ค่าน้ำ ค่าไฟ ซื้อยา" />
            </label>

            <label>
              <span>จำนวนเงิน (บาท) *</span>
              <input v-model="form.exp_amount" type="number" step="0.01" required placeholder="0.00" />
            </label>

            <label>
              <span>วันที่ *</span>
              <input v-model="form.exp_date" type="date" required />
            </label>

            <label class="full-width">
              <span>หมวดหมู่</span>
              <select v-model="form.category_id">
                <option value="">-- ไม่ระบุหมวดหมู่ --</option>
                <option v-for="c in expenseCategories" :key="c.category_id" :value="c.category_id">
                  {{ c.category_name }}
                </option>
              </select>
            </label>
          </div>

          <div class="modal-actions">
            <button type="button" @click="isModalOpen = false" class="ghost-btn">ยกเลิก</button>
            <button type="submit" class="primary-btn">บันทึกข้อมูล</button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="isCategoryModalOpen" class="modal-overlay" @click.self="isCategoryModalOpen = false">
      <div class="modal">
        <div class="modal-head">
          <div>
            <h2>จัดการหมวดหมู่</h2>
            <p>ใช้แยกประเภทรายรับ-รายจ่ายให้ดูภาพรวมง่ายขึ้น</p>
          </div>
          <button @click="isCategoryModalOpen = false" class="close-btn">ปิด</button>
        </div>

        <form @submit.prevent="handleAddCategory" class="category-add-form">
          <input v-model="newCategory.category_name" type="text" placeholder="ชื่อหมวดหมู่ใหม่" required />
          <select v-model="newCategory.type">
            <option value="รายจ่าย">รายจ่าย</option>
            <option value="รายรับ">รายรับ</option>
          </select>
          <button type="submit" class="primary-btn">เพิ่ม</button>
        </form>

        <div class="category-list">
          <div v-for="c in allCategories" :key="c.category_id" class="category-item">
            <span>{{ c.category_name }} <em>({{ c.type }})</em></span>
            <button @click="deleteCategory(c.category_id)" class="danger-btn mini-btn">ลบ</button>
          </div>
          <div v-if="allCategories.length === 0" class="state">ยังไม่มีหมวดหมู่</div>
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

const expenseCategories = computed(() => allCategories.value.filter((c) => c.type === 'รายจ่าย'))
const totalExpense = computed(() => expenses.value.reduce((sum, e) => sum + Number(e.exp_amount), 0))

const formatPrice = (val) => Number(val || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const formatDate = (d) => new Date(d).toLocaleDateString('th-TH')
const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` })

const fetchExpenses = async () => {
  try {
    const res = await axios.get(API_BASE, {
      headers: authHeader(),
      params: { month: filterMonth.value, year: filterYear.value }
    })
    expenses.value = res.data
  } catch (err) {
    console.error(err)
  }
}

const fetchCategories = async () => {
  try {
    const res = await axios.get(`${API_BASE}/categories`, { headers: authHeader() })
    allCategories.value = res.data
  } catch (err) {
    console.error(err)
  }
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

const openCategoryModal = () => {
  isCategoryModalOpen.value = true
}

const handleSubmit = async () => {
  try {
    if (modalMode.value === 'add') {
      await axios.post(API_BASE, form.value, { headers: authHeader() })
    } else {
      await axios.put(`${API_BASE}/${form.value.exp_id}`, form.value, { headers: authHeader() })
    }
    isModalOpen.value = false
    fetchExpenses()
  } catch (err) {
    alert('บันทึกไม่สำเร็จ')
    console.error(err)
  }
}

const deleteExpense = async (id) => {
  if (!confirm('ยืนยันที่จะลบรายจ่ายนี้หรือไม่?')) return
  try {
    await axios.delete(`${API_BASE}/${id}`, { headers: authHeader() })
    fetchExpenses()
  } catch (err) {
    alert('ลบไม่สำเร็จ')
    console.error(err)
  }
}

const handleAddCategory = async () => {
  try {
    await axios.post(`${API_BASE}/categories`, newCategory.value, { headers: authHeader() })
    newCategory.value = { category_name: '', type: 'รายจ่าย' }
    fetchCategories()
  } catch (err) {
    alert('เพิ่มหมวดหมู่ไม่สำเร็จ')
    console.error(err)
  }
}

const deleteCategory = async (id) => {
  if (!confirm('ยืนยันที่จะลบหมวดหมู่นี้หรือไม่?')) return
  try {
    await axios.delete(`${API_BASE}/categories/${id}`, { headers: authHeader() })
    fetchCategories()
  } catch (err) {
    alert('ลบไม่สำเร็จ (อาจมีรายจ่ายผูกอยู่)')
    console.error(err)
  }
}

watch([filterMonth, filterYear], fetchExpenses)

onMounted(() => {
  fetchExpenses()
  fetchCategories()
})
</script>

<style scoped>
.expenses-admin-page {
  display: grid;
  gap: 20px;
}

.page-header-actions {
  display: flex;
  gap: 12px;
}

.total-badge {
  margin-left: auto;
  background: #fef2f2;
  color: #b91c1c;
  padding: 10px 18px;
  border-radius: 12px;
  font-weight: 700;
}

.cat-badge {
  background: #f1f5f9;
  color: #475569;
  padding: 6px 12px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 13px;
  border: 1px solid #e2e8f0;
}

.amount {
  font-weight: 800;
  color: #dc2626;
}

.action-buttons {
  display: flex;
  justify-content: center;
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

.full-width {
  grid-column: 1 / -1;
}

.category-add-form {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 240px;
  overflow-y: auto;
}

.category-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: #f8fafc;
  border-radius: 10px;
  border: 1px solid #f1f5f9;
}

.category-item em {
  color: #94a3b8;
  font-style: normal;
  font-size: 12px;
}

@media (max-width: 760px) {
  .page-header-actions,
  .category-add-form {
    flex-direction: column;
  }
}
</style>
