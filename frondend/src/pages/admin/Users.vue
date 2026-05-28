<template>
  <div class="user-page">
    
    <div class="clinic-card header-card">
      <div class="header-content">
        <div class="icon-box">👥</div>
        <div class="title-box">
          <h1>จัดการผู้ใช้งานทั้งหมด ({{ users.length }})</h1>
          <p>รายชื่อสมาชิกในระบบทั้งหมด รวมถึงผู้ใช้งานทั่วไปและ Walk-in</p>
        </div>
      </div>
      
      <button @click="openAddModal" class="btn-primary">
        <svg class="icon-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
        </svg>
        เพิ่มสมาชิกใหม่
      </button>
    </div>

    <div class="search-section">
      <div class="search-wrapper">
        <svg class="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="ค้นหาชื่อ, เบอร์โทร, Username..." 
          class="custom-search-input"
        >
      </div>
    </div>

    <div class="clinic-card table-card">
      <div class="table-responsive">
        <table class="clinic-table">
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
                  <div :class="['avatar', isGuest(user.username) ? 'guest-avatar' : 'member-avatar']">
                    {{ user.username.startsWith('guest_') ? 'G' : user.username.charAt(0).toUpperCase() }}
                  </div>
                  <div class="user-details">
                    <span :class="['username', isGuest(user.username) ? 'guest-text' : '']">
                      {{ isGuest(user.username) ? '(ไม่ได้สมัครสมาชิก)' : user.username }}
                    </span>
                    <span v-if="isGuest(user.username)" class="guest-badge">Walk-in User</span>
                  </div>
                </div>
              </td>
              <td class="font-bold">{{ user.owner_name || '-' }}</td>
              <td class="text-gray">{{ user.owner_tel || '-' }}</td>
              
              <td class="text-center">
                <span :class="['pet-badge', user.pet_count > 0 ? 'has-pet' : 'no-pet']">
                  🐾 {{ user.pet_count || 0 }} ตัว
                </span>
              </td>

              <td class="text-gray">{{ user.owner_email || '-' }}</td>
              <td class="text-center">
                <div class="action-buttons">
                  <button @click="openEditModal(user)" class="btn-action edit" title="แก้ไข">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button @click="deleteUser(user.user_id)" class="btn-action delete" title="ลบ">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredUsers.length === 0">
              <td colspan="6" class="empty-state">
                <div class="empty-icon">🔍</div>
                <h3>ไม่พบข้อมูลผู้ใช้งาน</h3>
                <p>ลองค้นหาด้วยคำอื่น หรือเพิ่มสมาชิกใหม่</p>
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
            <div class="modal-icon">{{ modalMode === 'add' ? '👤' : '📝' }}</div>
            <div>
              <h3>{{ modalMode === 'add' ? 'เพิ่มสมาชิกใหม่' : 'แก้ไขข้อมูลผู้ใช้' }}</h3>
              <p>กรอกข้อมูลรายละเอียดของลูกค้าให้ครบถ้วน</p>
            </div>
          </div>
          <button @click="isModalOpen = false" class="close-btn">✕</button>
        </div>
        
        <form @submit.prevent="handleSubmit">
          
          <div class="form-group" v-if="modalMode === 'edit' && !isGuest(form.username)">
            <label>Username (สำหรับ Login)</label>
            <input v-model="form.username" type="text" class="custom-input readonly-input" required readonly>
          </div>

          <div class="form-group">
            <label>ชื่อ-นามสกุล <span class="required">*</span></label>
            <div class="input-with-icon">
              <svg class="input-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              <input v-model="form.owner_name" type="text" class="custom-input pl-10" required placeholder="ระบุชื่อเจ้าของ">
            </div>
          </div>
          
          <div class="grid-2-col">
            <div class="form-group">
              <label>เบอร์โทรศัพท์</label>
              <div class="input-with-icon">
                <svg class="input-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                <input v-model="form.tel" type="text" class="custom-input pl-10" placeholder="0xx-xxx-xxxx">
              </div>
            </div>
            <div class="form-group">
              <label>อีเมล</label>
              <div class="input-with-icon">
                <svg class="input-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                <input v-model="form.email" type="email" class="custom-input pl-10" placeholder="example@mail.com">
              </div>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" @click="isModalOpen = false" class="btn-cancel">ยกเลิก</button>
            <button type="submit" class="btn-submit">
              {{ modalMode === 'add' ? 'สร้างบัญชี' : 'บันทึกการแก้ไข' }}
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
  if(!confirm('ยืนยันการลบ? หากลบ ข้อมูลสัตว์เลี้ยงของลูกค้ารายนี้จะหายไปด้วย')) return;
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
/* ==========================================================================
   PURE CUSTOM CSS - ไม่พึ่งพา Tailwind
   ========================================================================== */
@import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap');

.user-page {
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.icon-box {
  width: 56px; height: 56px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border-radius: 16px;
  display: flex; align-items: center; justify-content: center;
  font-size: 28px;
  color: white;
  box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.3);
}

.title-box h1 { margin: 0; font-size: 24px; font-weight: 800; color: #0f172a; }
.title-box p { margin: 4px 0 0 0; font-size: 14px; color: #64748b; font-weight: 500; }

/* --- Buttons --- */
.btn-primary {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: #ffffff;
  border: none;
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: 700;
  font-size: 15px;
  cursor: pointer;
  display: flex; align-items: center; gap: 8px;
  box-shadow: 0 4px 14px 0 rgba(59, 130, 246, 0.39);
  transition: all 0.2s ease-in-out;
  font-family: inherit;
}
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4); }
.btn-primary:active { transform: translateY(0); }
.icon-sm { width: 20px; height: 20px; }

/* --- Search Section --- */
.search-section {
  margin-bottom: 24px;
}
.search-wrapper {
  position: relative;
  max-width: 400px;
}
.search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  color: #94a3b8;
}
.custom-search-input {
  width: 100%;
  padding: 14px 16px 14px 44px;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  font-size: 15px;
  color: #1e293b;
  outline: none;
  box-sizing: border-box;
  transition: all 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  font-family: inherit;
}
.custom-search-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
}

/* --- Table Section --- */
.table-card { padding: 0; overflow: hidden; }
.table-responsive { width: 100%; overflow-x: auto; }
.clinic-table { width: 100%; border-collapse: collapse; min-width: 800px; }
.clinic-table th {
  background-color: #f8fafc; padding: 16px 24px; text-align: left;
  font-size: 13px; font-weight: 700; color: #64748b; text-transform: uppercase;
  border-bottom: 2px solid #e2e8f0;
}
.clinic-table td { padding: 16px 24px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
.clinic-table tbody tr { transition: all 0.2s; }
.clinic-table tbody tr:hover { background-color: #eff6ff; } /* สีฟ้าอ่อนตอนชี้ */

.text-center { text-align: center; }
.font-bold { font-weight: 700; color: #1e293b; }
.text-gray { color: #64748b; }

/* User Info Layout */
.user-info { display: flex; align-items: center; gap: 12px; }
.avatar {
  width: 44px; height: 44px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 18px;
}
.member-avatar { background: #dbeafe; color: #2563eb; }
.guest-avatar { background: #f1f5f9; color: #94a3b8; border: 1px dashed #cbd5e1; }
.user-details { display: flex; flex-direction: column; }
.username { font-weight: 700; color: #0f172a; font-size: 15px; }
.guest-text { color: #94a3b8; font-style: italic; }
.guest-badge { font-size: 10px; background: #f1f5f9; color: #64748b; padding: 2px 6px; border-radius: 4px; font-weight: 700; width: fit-content; margin-top: 2px; }

/* Pet Badge */
.pet-badge {
  display: inline-block; padding: 6px 12px; border-radius: 99px;
  font-size: 13px; font-weight: 700;
}
.has-pet { background-color: #ffedd5; color: #c2410c; border: 1px solid #fed7aa; }
.no-pet { background-color: #f1f5f9; color: #94a3b8; }

/* Action Buttons */
.action-buttons { display: flex; justify-content: center; gap: 8px; }
.btn-action {
  background: #ffffff; border: 1px solid #e2e8f0;
  width: 36px; height: 36px; border-radius: 10px;
  cursor: pointer; transition: all 0.2s;
  display: inline-flex; align-items: center; justify-content: center;
  color: #94a3b8;
}
.btn-action.edit:hover { background: #eff6ff; border-color: #bfdbfe; color: #3b82f6; transform: translateY(-2px); }
.btn-action.delete:hover { background: #fef2f2; border-color: #fecaca; color: #ef4444; transform: translateY(-2px); }

.empty-state { padding: 60px 20px; text-align: center; }
.empty-icon { font-size: 48px; background: #f8fafc; width: 100px; height: 100px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px; border: 1px solid #e2e8f0; }
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
  background-color: #ffffff; width: 90%; max-width: 550px;
  border-radius: 24px; padding: 32px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); box-sizing: border-box;
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(30px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.modal-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  margin-bottom: 24px; border-bottom: 1px solid #f1f5f9; padding-bottom: 20px;
}
.modal-title { display: flex; gap: 16px; align-items: center; }
.modal-icon {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white; width: 48px; height: 48px; border-radius: 14px;
  display: flex; align-items: center; justify-content: center; font-size: 24px;
}
.modal-title h3 { margin: 0; font-size: 20px; font-weight: 800; color: #0f172a; }
.modal-title p { margin: 4px 0 0 0; font-size: 13px; color: #64748b; }
.close-btn {
  background: #f1f5f9; border: none; width: 36px; height: 36px; border-radius: 50%;
  color: #64748b; cursor: pointer; font-weight: bold; transition: all 0.2s;
}
.close-btn:hover { background: #fee2e2; color: #ef4444; }

.form-group { margin-bottom: 20px; }
.form-group label { display: block; font-size: 14px; font-weight: 700; color: #334155; margin-bottom: 8px; }
.required { color: #ef4444; }

.input-with-icon { position: relative; }
.input-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); width: 20px; height: 20px; color: #94a3b8; }
.pl-10 { padding-left: 44px !important; }

.custom-input {
  width: 100%; padding: 14px 16px; background-color: #f8fafc;
  border: 1px solid #e2e8f0; border-radius: 12px; font-size: 14px; color: #0f172a;
  outline: none; box-sizing: border-box; font-family: inherit; transition: all 0.2s;
}
.custom-input:focus { background-color: #ffffff; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
.readonly-input { background-color: #f1f5f9; color: #64748b; cursor: not-allowed; }

.grid-2-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

.modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 32px; padding-top: 20px; border-top: 1px solid #f1f5f9; }
.btn-cancel { padding: 12px 24px; background-color: #f1f5f9; color: #475569; border: none; border-radius: 12px; font-weight: 700; cursor: pointer; font-family: inherit; transition: 0.2s; }
.btn-cancel:hover { background-color: #e2e8f0; color: #1e293b; }
.btn-submit { padding: 12px 28px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; border: none; border-radius: 12px; font-weight: 700; cursor: pointer; font-family: inherit; transition: 0.2s; box-shadow: 0 4px 14px 0 rgba(59, 130, 246, 0.39); }
.btn-submit:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4); }

@media (max-width: 640px) {
  .grid-2-col { grid-template-columns: 1fr; }
  .custom-modal-box { padding: 20px; }
}
</style>