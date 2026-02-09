<template>
  <div class="page-container">
    
    <div class="header-actions">
      <router-link to="/admin/dashboard" class="back-btn">
        ⬅ ย้อนกลับไป Dashboard
      </router-link>
      
      <div class="flex justify-between items-end mt-4">
        <div>
          <h1>จัดการผู้ใช้งานทั้งหมด ({{ users.length }})</h1>
          <p class="text-gray-500 text-sm mt-1">รายชื่อสมาชิกในระบบทั้งหมด</p>
        </div>
        <button @click="openAddModal" class="btn-add">
          + เพิ่มสมาชิกใหม่
        </button>
      </div>
    </div>

    <div class="search-wrapper">
      <input v-model="searchQuery" type="text" placeholder="🔍 ค้นหาชื่อ, เบอร์โทร..." class="search-input">
    </div>

    <div class="table-card">
      <table class="custom-table">
        <thead>
          <tr>
            <th>Username</th>
            <th>ชื่อ-นามสกุล</th>
            <th>เบอร์โทร</th>
            <th class="text-center">สัตว์เลี้ยง</th>
            <th>อีเมล</th>
            <th class="text-center">จัดการ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in filteredUsers" :key="user.user_id">
            <td>
              <div class="user-info">
                <div class="avatar" :class="{'guest': isGuest(user.username)}">
                  {{ user.username.startsWith('guest_') ? 'G' : user.username.charAt(0).toUpperCase() }}
                </div>
                <div class="flex flex-col">
                  <span class="username" :class="{'text-gray-400': isGuest(user.username)}">
                    {{ isGuest(user.username) ? '(ไม่ได้สมัคร)' : user.username }}
                  </span>
                  <span v-if="isGuest(user.username)" class="text-[10px] text-gray-400">Walk-in User</span>
                </div>
              </div>
            </td>
            <td>{{ user.owner_name || '-' }}</td>
            <td>{{ user.owner_tel || '-' }}</td>
            
            <td class="text-center">
              <span class="pet-badge" :class="{'has-pet': user.pet_count > 0}">
                🐾 {{ user.pet_count || 0 }} ตัว
              </span>
            </td>

            <td>{{ user.owner_email || '-' }}</td>
            <td class="text-center">
              <button @click="openEditModal(user)" class="action-btn edit" title="แก้ไข">✏️</button>
              <button @click="deleteUser(user.user_id)" class="action-btn delete" title="ลบ">🗑️</button>
            </td>
          </tr>
          <tr v-if="filteredUsers.length === 0">
             <td colspan="6" class="text-center text-muted">ไม่พบข้อมูล</td>
          </tr>
        </tbody>
      </table>
    </div>

    <Teleport to="body">
      <div v-if="isModalOpen" class="modal-overlay" @click.self="isModalOpen = false">
        <div class="modal-content">
          <div class="modal-header">
            <h3>
              {{ modalMode === 'add' ? '👤 เพิ่มสมาชิกใหม่' : '📝 แก้ไขข้อมูลผู้ใช้' }}
            </h3>
            <button @click="isModalOpen = false" class="close-btn">×</button>
          </div>
          
          <form @submit.prevent="handleSubmit">
            
            <div class="form-group" v-if="modalMode === 'edit' && !isGuest(form.username)">
              <label>Username (สำหรับ Login)</label>
              <input v-model="form.username" type="text" class="input-field bg-gray-100" required>
            </div>

            <div class="form-group">
              <label>ชื่อ-นามสกุล <span class="text-red-500">*</span></label>
              <input v-model="form.owner_name" type="text" class="input-field" required placeholder="ระบุชื่อเจ้าของ">
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div class="form-group">
                <label>เบอร์โทรศัพท์</label>
                <input v-model="form.tel" type="text" class="input-field" placeholder="0xx-xxx-xxxx">
              </div>
              <div class="form-group">
                <label>อีเมล</label>
                <input v-model="form.email" type="email" class="input-field" placeholder="example@mail.com">
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" @click="isModalOpen = false" class="btn-cancel">ยกเลิก</button>
              <button type="submit" class="btn-save">
                {{ modalMode === 'add' ? 'สร้างบัญชี' : 'บันทึกการแก้ไข' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

const users = ref([])
const searchQuery = ref('')

// Modal State
const isModalOpen = ref(false)
const modalMode = ref('add')
const form = ref({})

// Helper
const isGuest = (username) => username && username.startsWith('guest_')

// 1. ดึงข้อมูล
const fetchUsers = async () => {
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get('http://localhost:3000/api/admin/users', {
      headers: { Authorization: `Bearer ${token}` }
    })
    users.value = res.data
  } catch (err) {
    console.error(err)
  }
}

// 2. เปิด Modal เพิ่ม
const openAddModal = () => {
  modalMode.value = 'add'
  form.value = { owner_name: '', email: '', tel: '' }
  isModalOpen.value = true
}

// 3. เปิด Modal แก้ไข
const openEditModal = (user) => {
  modalMode.value = 'edit'
  form.value = {
    id: user.user_id,
    username: user.username,
    owner_name: user.owner_name,
    email: user.owner_email || '',
    tel: user.owner_tel || ''
  }
  isModalOpen.value = true
}

// 4. Submit
const handleSubmit = async () => {
  const token = localStorage.getItem('token')
  const headers = { Authorization: `Bearer ${token}` }

  try {
    if (modalMode.value === 'add') {
      await axios.post('http://localhost:3000/api/admin/users', form.value, { headers })
      alert('เพิ่มสมาชิกสำเร็จ')
    } else {
      await axios.put(`http://localhost:3000/api/admin/users/${form.value.id}`, form.value, { headers })
      alert('แก้ไขข้อมูลเรียบร้อย')
    }
    isModalOpen.value = false
    fetchUsers()
  } catch (err) {
    alert('ทำรายการไม่สำเร็จ')
    console.error(err)
  }
}

// 5. ลบ
const deleteUser = async (id) => {
  if(!confirm('ยืนยันการลบ?')) return;
  try {
    const token = localStorage.getItem('token')
    await axios.delete(`http://localhost:3000/api/admin/users/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    alert('ลบสำเร็จ')
    fetchUsers() 
  } catch(err) {
    alert('ลบไม่สำเร็จ')
  }
}

const filteredUsers = computed(() => {
  return users.value.filter(u => 
    (u.username && u.username.toLowerCase().includes(searchQuery.value.toLowerCase())) ||
    (u.owner_name && u.owner_name.toLowerCase().includes(searchQuery.value.toLowerCase())) ||
    (u.owner_tel && u.owner_tel.includes(searchQuery.value))
  )
})

onMounted(fetchUsers)
</script>

<style scoped>
/* Reuse Styles */
.page-container { padding: 0 0 2rem 0; font-family: 'Sarabun', sans-serif; }
.header-actions { margin-bottom: 1.5rem; }
.header-actions h1 { margin: 0; font-size: 1.5rem; color: #1e293b; font-weight: 800; }

.back-btn { text-decoration: none; color: #64748b; font-weight: 600; font-size: 0.9rem; }
.back-btn:hover { color: #10b981; }

.btn-add {
  background: #10b981; color: white; padding: 0.6rem 1.2rem;
  border-radius: 0.5rem; font-weight: bold; border: none; cursor: pointer;
  box-shadow: 0 2px 5px rgba(16, 185, 129, 0.3); transition: all 0.2s;
}
.btn-add:hover { background: #059669; transform: translateY(-2px); }

.search-wrapper { margin-bottom: 1rem; }
.search-input {
  width: 100%; max-width: 300px; padding: 0.75rem 1rem;
  border: 1px solid #e2e8f0; border-radius: 0.5rem; outline: none;
}
.search-input:focus { border-color: #10b981; box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1); }

.table-card { background: white; border-radius: 1rem; padding: 1rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
.custom-table { width: 100%; border-collapse: separate; border-spacing: 0; }
.custom-table th { text-align: left; padding: 1rem; border-bottom: 2px solid #f1f5f9; color: #64748b; font-size: 0.85rem; font-weight: bold; }
.custom-table td { padding: 1rem; border-bottom: 1px solid #f8fafc; color: #334155; vertical-align: middle; }

.user-info { display: flex; align-items: center; gap: 0.75rem; }
.avatar { width: 36px; height: 36px; background: #eff6ff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #3b82f6; }
.avatar.guest { background: #f1f5f9; color: #94a3b8; }
.username { font-weight: 600; color: #0f172a; font-size: 0.95rem; }

.action-btn { background: none; border: none; cursor: pointer; padding: 0.4rem; font-size: 1.1rem; transition: transform 0.2s; }
.action-btn:hover { transform: scale(1.2); }

/* ⭐ เพิ่มสไตล์ Badge จำนวนสัตว์เลี้ยง */
.pet-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  background-color: #f1f5f9;
  color: #64748b;
}

.pet-badge.has-pet {
  background-color: #ffedd5;
  color: #c2410c;
  border: 1px solid #fed7aa;
}

/* Modal Styles */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 50; backdrop-filter: blur(2px); }
.modal-content { background: white; width: 90%; max-width: 500px; padding: 2rem; border-radius: 1.5rem; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); animation: slideUp 0.3s ease-out; }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.modal-header h3 { font-size: 1.25rem; font-weight: 800; color: #1e293b; margin: 0; }
.close-btn { background: none; border: none; font-size: 1.5rem; color: #94a3b8; cursor: pointer; }

.form-group { margin-bottom: 1rem; }
.form-group label { display: block; font-size: 0.9rem; margin-bottom: 0.4rem; color: #475569; font-weight: 600; }
.input-field { width: 100%; padding: 0.75rem; border: 1px solid #e2e8f0; border-radius: 0.75rem; outline: none; box-sizing: border-box; }
.input-field:focus { border-color: #10b981; box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1); }

.modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 2rem; }
.btn-cancel { padding: 0.75rem 1.5rem; background: #f1f5f9; border: none; border-radius: 0.75rem; color: #64748b; font-weight: 600; cursor: pointer; }
.btn-save { padding: 0.75rem 1.5rem; background: #10b981; border: none; border-radius: 0.75rem; color: white; font-weight: 600; cursor: pointer; }
.btn-save:hover { background: #059669; }
</style>