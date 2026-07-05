<template>
  <div class="admin-users-container">
    <h2>จัดการสิทธิ์ผู้ใช้งาน (Admin/User)</h2>
    
    <div v-if="loading" class="loading">กำลังโหลดข้อมูล...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    
    <table v-else class="users-table">
      <thead>
        <tr>
          <th>ชื่อผู้ใช้ (Username)</th>
          <th>ชื่อ-นามสกุล</th>
          <th>เบอร์โทร</th>
          <th>สิทธิ์ปัจจุบัน</th>
          <th>จัดการสิทธิ์</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="u in users" :key="u.user_id">
          <td>{{ u.username }}</td>
          <td>{{ u.owner_name || '-' }}</td>
          <td>{{ u.owner_tel || '-' }}</td>
          <td>
            <span :class="['badge', u.user_role === 'admin' ? 'bg-admin' : 'bg-user']">
              {{ u.user_role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้ใช้งานทั่วไป' }}
            </span>
          </td>
          <td>
            <button 
              v-if="u.user_id !== myUserId"
              @click="toggleRole(u)" 
              :class="['btn-toggle', u.user_role === 'admin' ? 'btn-demote' : 'btn-promote']"
            >
              {{ u.user_role === 'admin' ? 'ปลดเป็น User' : 'ตั้งเป็น Admin' }}
            </button>
            <span v-else class="text-muted">(บัญชีของคุณ)</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const users = ref([])
const loading = ref(true)
const error = ref('')
const myUserId = ref('')

const fetchUsers = async () => {
  try {
    loading.value = true
    const token = localStorage.getItem('token')
    
    // ดึง user_id ของตัวเองมาเช็ค เพื่อไม่ให้ปุ่มโชว์ที่ตัวเอง
    const myUserStr = localStorage.getItem('user')
    if (myUserStr) {
      myUserId.value = JSON.parse(myUserStr).user_id
    }

    const res = await axios.get('http://localhost:3000/api/user/all', {
      headers: { Authorization: `Bearer ${token}` }
    })
    users.value = res.data
  } catch (err) {
    error.value = err.response?.data?.message || 'ดึงข้อมูลผู้ใช้ไม่สำเร็จ'
  } finally {
    loading.value = false
  }
}

const toggleRole = async (user) => {
  // สลับค่าระหว่าง admin กับ user
  const newRole = user.user_role === 'admin' ? 'user' : 'admin'
  const confirmMsg = newRole === 'admin' 
    ? `ต้องการตั้งค่าให้ ${user.username} เป็น Admin ใช่หรือไม่?` 
    : `ต้องการปลด ${user.username} กลับเป็น User ทั่วไป ใช่หรือไม่?`
    
  if (!confirm(confirmMsg)) return

  try {
    const token = localStorage.getItem('token')
    await axios.put(`http://localhost:3000/api/user/role/${user.user_id}`, 
      { user_role: newRole },
      { headers: { Authorization: `Bearer ${token}` } }
    )
    
    // อัปเดตข้อมูลในหน้าจอทันทีโดยไม่ต้องโหลดใหม่
    user.user_role = newRole
    alert('อัปเดตสิทธิ์สำเร็จ')
  } catch (err) {
    alert(err.response?.data?.message || 'อัปเดตสิทธิ์ไม่สำเร็จ')
  }
}

onMounted(() => {
  fetchUsers()
})
</script>

<style scoped>
.admin-users-container {
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
}

.users-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}

.users-table th, .users-table td {
  padding: 12px 15px;
  border-bottom: 1px solid #eee;
  text-align: left;
}

.users-table th {
  background-color: #f8fafc;
  font-weight: 600;
  color: #334155;
}

.badge {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
}

.bg-admin { background-color: #fef08a; color: #854d0e; }
.bg-user { background-color: #e2e8f0; color: #475569; }

.btn-toggle {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.btn-promote { background: #3b82f6; color: white; }
.btn-promote:hover { background: #2563eb; }

.btn-demote { background: #ef4444; color: white; }
.btn-demote:hover { background: #dc2626; }

.text-muted {
  color: #94a3b8;
  font-size: 0.9rem;
}
</style>