<template>
  <div class="dashboard-container">
    
    <header class="dashboard-header">
      <div class="header-text">
        <h1>Dashboard ภาพรวม</h1>
        <p>👋 ยินดีต้อนรับกลับ, <span class="highlight-text">Administrator</span></p>
      </div>
      <div class="date-badge">📅 {{ currentDate }}</div>
    </header>

    <section class="stats-grid">
      <div class="stat-card">
        <div class="stat-content">
          <p class="stat-label">ผู้ใช้งานทั้งหมด</p>
          <h3 class="stat-value">{{ stats.totalUsers }}</h3>
          <p class="stat-trend positive">คน</p>
        </div>
        <div class="stat-icon icon-blue">👥</div>
      </div>
      <div class="stat-card">
        <div class="stat-content">
          <p class="stat-label">จำนวนสัตว์เลี้ยง</p>
          <h3 class="stat-value">{{ stats.totalPets }}</h3>
          <p class="stat-trend positive">ตัว</p>
        </div>
        <div class="stat-icon icon-orange">🐾</div>
      </div>
    </section>

    <section class="content-grid">
      <div class="main-card table-wrapper">
        <div class="card-header">
          <h2><span class="accent-bar"></span> สมาชิกใหม่ล่าสุด</h2>
          
          <router-link to="/admin/users" class="text-btn">
            ดูทั้งหมด →
          </router-link>
        </div>
        
        <table class="custom-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>ชื่อเจ้าของ</th>
              <th>เบอร์โทร</th>
              <th class="text-center">สัตว์เลี้ยง</th>
              <th class="text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in stats.recentUsers" :key="user.user_id">
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
              <td class="text-gray">{{ user.owner_tel || '-' }}</td>
              
              <td class="text-center">
                <span class="pet-badge" :class="{'has-pet': user.pet_count > 0}">
                  🐾 {{ user.pet_count || 0 }} ตัว
                </span>
              </td>

              <td class="text-center">
                <button @click="openEditModal(user)" class="action-btn edit" title="แก้ไข">
                  ✏️
                </button>
                <button @click="deleteUser(user.user_id)" class="action-btn delete" title="ลบ">
                  🗑️
                </button>
              </td>
            </tr>
            <tr v-if="stats.recentUsers.length === 0">
              <td colspan="5" class="text-center py-6 text-gray-400">ไม่พบข้อมูล</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <Teleport to="body">
      <div v-if="isEditOpen" class="modal-overlay" @click.self="isEditOpen = false">
        <div class="modal-content">
          <div class="modal-header">
            <h3>📝 แก้ไขข้อมูลผู้ใช้</h3>
            <button @click="isEditOpen = false" class="close-btn">×</button>
          </div>
          
          <form @submit.prevent="updateUser">
            <div class="form-group" v-if="!isGuest(editForm.username)">
              <label>Username</label>
              <input v-model="editForm.username" type="text" class="input-field bg-gray-100" required>
            </div>
            
            <div class="form-group">
              <label>ชื่อ-นามสกุล</label>
              <input v-model="editForm.owner_name" type="text" class="input-field">
            </div>
            
            <div class="grid grid-cols-2 gap-4">
               <div class="form-group">
                <label>เบอร์โทรศัพท์</label>
                <input v-model="editForm.tel" type="text" class="input-field">
              </div>
              <div class="form-group">
                <label>อีเมล</label>
                <input v-model="editForm.email" type="email" class="input-field">
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" @click="isEditOpen = false" class="btn-cancel">ยกเลิก</button>
              <button type="submit" class="btn-save">บันทึก</button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'

const router = useRouter()
const currentDate = new Date().toLocaleDateString('th-TH', { dateStyle: 'long' })

const stats = ref({ totalUsers: 0, totalPets: 0, recentUsers: [] })
const isEditOpen = ref(false)
const editForm = ref({})

// Helper function เช็ค Guest
const isGuest = (username) => username && username.startsWith('guest_')

const fetchData = async () => {
  try {
    const token = localStorage.getItem('token')
    if (!token) return router.push('/login')

    const res = await axios.get('http://localhost:3000/api/admin/dashboard', {
      headers: { Authorization: `Bearer ${token}` }
    })
    stats.value = res.data
  } catch (err) {
    console.error(err)
  }
}

const deleteUser = async (userId) => {
  if(!confirm('⚠️ คำเตือน: ข้อมูลสัตว์เลี้ยงจะหายไปถาวร!\nต้องการลบจริงหรือไม่?')) return;

  try {
    const token = localStorage.getItem('token')
    await axios.delete(`http://localhost:3000/api/admin/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    alert('ลบข้อมูลสำเร็จ')
    fetchData()
  } catch (err) {
    alert('เกิดข้อผิดพลาดในการลบ')
  }
}

const openEditModal = (user) => {
  editForm.value = {
    id: user.user_id,
    username: user.username,
    owner_name: user.owner_name,
    email: user.owner_email || '',
    tel: user.owner_tel || ''
  }
  isEditOpen.value = true
}

const updateUser = async () => {
  try {
    const token = localStorage.getItem('token')
    await axios.put(`http://localhost:3000/api/admin/users/${editForm.value.id}`, editForm.value, {
      headers: { Authorization: `Bearer ${token}` }
    })
    alert('แก้ไขข้อมูลเรียบร้อย')
    isEditOpen.value = false
    fetchData()
  } catch (err) {
    alert('บันทึกไม่สำเร็จ')
  }
}

onMounted(fetchData)
</script>

<style scoped>
/* GLOBAL & VARIABLES */
:root {
  --primary: #10b981;
  --bg-color: #f8fafc;
  --text-main: #1e293b;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.05);
}

.dashboard-container {
  min-height: 100%;
  padding-bottom: 2.5rem;
  font-family: 'Sarabun', sans-serif;
  color: #334155;
  background-color: #f1f5f9;
  background-image: radial-gradient(at 0% 0%, rgba(16, 185, 129, 0.08) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(59, 130, 246, 0.08) 0px, transparent 50%);
  background-attachment: fixed;
}

.dashboard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.header-text h1 { font-size: 1.8rem; font-weight: 800; color: #0f172a; margin: 0; }
.highlight-text { color: #10b981; font-weight: 700; }
.date-badge { background: white; padding: 0.5rem 1rem; border-radius: 0.75rem; border: 1px solid #e2e8f0; font-size: 0.9rem; color: #64748b; }

.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
.stat-card { background: white; border-radius: 1rem; padding: 1.5rem; display: flex; justify-content: space-between; box-shadow: var(--shadow-sm); }
.stat-label { font-size: 0.85rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; }
.stat-value { font-size: 2rem; font-weight: 800; color: #1e293b; margin: 0.5rem 0 0 0; }
.stat-icon { width: 56px; height: 56px; border-radius: 1rem; display: flex; align-items: center; justify-content: center; font-size: 1.75rem; }
.icon-blue { background: #eff6ff; color: #3b82f6; }
.icon-orange { background: #fff7ed; color: #f97316; }

.content-grid { display: block; }
.main-card { background: white; border-radius: 1rem; padding: 2rem; box-shadow: var(--shadow-sm); }

.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.card-header h2 { font-size: 1.25rem; font-weight: 700; display: flex; gap: 0.75rem; align-items: center; }
.accent-bar { width: 5px; height: 24px; background: #10b981; border-radius: 4px; display: block; }

.text-btn { text-decoration: none; color: #10b981; font-weight: 600; font-size: 0.9rem; transition: all 0.2s; cursor: pointer; }
.text-btn:hover { text-decoration: underline; color: #059669; }

/* Table Styles */
.table-wrapper { overflow-x: auto; }
.custom-table { width: 100%; border-collapse: separate; border-spacing: 0; }
.custom-table th { text-align: left; padding: 1rem; border-bottom: 2px solid #f1f5f9; color: #64748b; font-size: 0.85rem; font-weight: 700; }
.custom-table td { padding: 1rem; border-bottom: 1px solid #f8fafc; vertical-align: middle; }

.user-info { display: flex; align-items: center; gap: 1rem; }
.avatar { width: 36px; height: 36px; background: #eff6ff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #3b82f6; }
.avatar.guest { background: #f1f5f9; color: #94a3b8; }
.username { font-weight: 600; color: #0f172a; font-size: 0.95rem; }

/* Pet Badge */
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

/* Action Buttons */
.action-btn { background: none; border: none; cursor: pointer; padding: 0.5rem; font-size: 1.1rem; border-radius: 0.5rem; transition: all 0.2s; margin: 0 0.2rem; }
.action-btn.edit:hover { background: #eff6ff; transform: translateY(-2px); }
.action-btn.delete:hover { background: #fef2f2; transform: translateY(-2px); }

/* Modal Styles */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 50; backdrop-filter: blur(4px); }
.modal-content { background: white; width: 90%; max-width: 500px; padding: 2rem; border-radius: 1.5rem; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); animation: slideUp 0.3s ease-out; }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

.modal-header { display: flex; justify-content: space-between; margin-bottom: 1.5rem; align-items: center; }
.modal-header h3 { margin: 0; font-size: 1.25rem; font-weight: 700; color: #1e293b; }
.close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #94a3b8; }

.form-group { margin-bottom: 1rem; }
.form-group label { display: block; font-size: 0.9rem; margin-bottom: 0.5rem; color: #475569; font-weight: 600; }
.input-field { width: 100%; padding: 0.75rem; border: 1px solid #e2e8f0; border-radius: 0.75rem; outline: none; transition: all 0.2s; box-sizing: border-box; }
.input-field:focus { border-color: #10b981; box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1); }

.modal-footer { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 2rem; }
.btn-cancel { padding: 0.75rem 1.5rem; background: #f1f5f9; border: none; border-radius: 0.75rem; font-weight: 600; color: #64748b; cursor: pointer; }
.btn-save { padding: 0.75rem 1.5rem; background: #10b981; border: none; border-radius: 0.75rem; font-weight: 600; color: white; cursor: pointer; }
.btn-save:hover { background: #059669; }
</style>