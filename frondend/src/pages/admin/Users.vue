<template>
  <div class="admin-users-container">
    <section class="users-hero">
      <div>
        <p class="section-kicker">สิทธิ์การใช้งาน</p>
        <h2>จัดการบทบาทผู้ใช้</h2>
        <p class="section-subtitle">ตรวจสอบบัญชีในระบบ แยกผู้ดูแลและผู้ใช้งานทั่วไป พร้อมเปลี่ยนสิทธิ์ได้จากหน้านี้</p>
      </div>
      <div class="hero-actions">
        <button class="toolbar-btn ghost" type="button" @click="fetchUsers">รีเฟรช</button>
      </div>
    </section>

    <section class="users-summary">
      <div class="summary-tile">
        <span class="tile-code">ALL</span>
        <div>
          <strong>{{ users.length }}</strong>
          <p>บัญชีทั้งหมดในระบบ</p>
        </div>
      </div>
      <div class="summary-tile">
        <span class="tile-code admin">AD</span>
        <div>
          <strong>{{ adminCount }}</strong>
          <p>ผู้ดูแลระบบที่มีสิทธิ์เต็ม</p>
        </div>
      </div>
      <div class="summary-tile">
        <span class="tile-code user">US</span>
        <div>
          <strong>{{ userCount }}</strong>
          <p>ผู้ใช้งานทั่วไปในระบบ</p>
        </div>
      </div>
    </section>

    <section class="toolbar">
      <input
        v-model="searchQuery"
        class="search-input"
        placeholder="ค้นหาจาก username ชื่อเจ้าของ เบอร์โทร หรือสิทธิ์"
      />
    </section>

    <section class="table-card">
      <div v-if="loading" class="loading">กำลังโหลดข้อมูล...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>บัญชีผู้ใช้</th>
              <th>เจ้าของบัญชี</th>
              <th>ติดต่อ</th>
              <th>สิทธิ์ปัจจุบัน</th>
              <th class="center">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in filteredUsers" :key="user.user_id">
              <td>
                <div class="identity-cell">
                  <div class="identity-mark">{{ getInitial(user.username) }}</div>
                  <div>
                    <strong>{{ user.username }}</strong>
                    <span class="text-muted">{{ user.user_id }}</span>
                  </div>
                </div>
              </td>
              <td>
                <strong>{{ user.owner_name || '-' }}</strong>
              </td>
              <td>
                <div>{{ user.owner_tel || '-' }}</div>
              </td>
              <td>
                <span :class="['role-badge', user.user_role === 'admin' ? 'is-admin' : 'is-user']">
                  {{ user.user_role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้ใช้งานทั่วไป' }}
                </span>
              </td>
              <td class="center">
                <template v-if="user.user_id !== myUserId">
                  <button
                    @click="toggleRole(user)"
                    :class="['btn-toggle', user.user_role === 'admin' ? 'btn-demote' : 'btn-promote']"
                    type="button"
                  >
                    {{ user.user_role === 'admin' ? 'ปรับเป็น User' : 'ตั้งเป็น Admin' }}
                  </button>
                </template>
                <span v-else class="text-muted">บัญชีที่ใช้งานอยู่</span>
              </td>
            </tr>
            <tr v-if="filteredUsers.length === 0">
              <td colspan="5" class="empty-state">ไม่พบบัญชีผู้ใช้ตามคำค้นหา</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'

const users = ref([])
const loading = ref(true)
const error = ref('')
const myUserId = ref('')
const searchQuery = ref('')

const filteredUsers = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return users.value

  return users.value.filter((user) =>
    [user.username, user.owner_name, user.owner_tel, user.user_role, user.user_id]
      .some((value) => String(value || '').toLowerCase().includes(q))
  )
})

const adminCount = computed(() => users.value.filter((user) => user.user_role === 'admin').length)
const userCount = computed(() => users.value.filter((user) => user.user_role !== 'admin').length)

const fetchUsers = async () => {
  try {
    loading.value = true
    error.value = ''

    const token = localStorage.getItem('token')
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
  const newRole = user.user_role === 'admin' ? 'user' : 'admin'
  const confirmMsg = newRole === 'admin'
    ? `ต้องการตั้งค่าให้ ${user.username} เป็น Admin ใช่หรือไม่?`
    : `ต้องการปรับ ${user.username} กลับเป็น User ทั่วไปใช่หรือไม่?`

  if (!confirm(confirmMsg)) return

  try {
    const token = localStorage.getItem('token')
    await axios.put(
      `http://localhost:3000/api/user/role/${user.user_id}`,
      { user_role: newRole },
      { headers: { Authorization: `Bearer ${token}` } }
    )

    user.user_role = newRole
    alert('อัปเดตสิทธิ์สำเร็จ')
  } catch (err) {
    alert(err.response?.data?.message || 'อัปเดตสิทธิ์ไม่สำเร็จ')
  }
}

const getInitial = (value) => String(value || 'U').charAt(0).toUpperCase()

onMounted(fetchUsers)
</script>

<style scoped>
.admin-users-container {
  display: grid;
  gap: 20px;
}

.users-hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 22px;
}

.section-kicker {
  margin: 0 0 6px;
  color: #6b7280;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-actions {
  display: flex;
  gap: 10px;
}

.users-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.summary-tile {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(229, 231, 235, 0.92);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
}

.tile-code {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #eef2ff;
  color: #4338ca;
  font-size: 11px;
  font-weight: 800;
  flex: none;
}

.tile-code.admin {
  background: #ede9fe;
  color: #7c3aed;
}

.tile-code.user {
  background: #ecfeff;
  color: #0f766e;
}

.summary-tile strong {
  display: block;
  font-size: 28px;
  color: #111827;
  line-height: 1;
}

.summary-tile p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.5;
}

.identity-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.identity-mark {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: #ffffff;
  font-weight: 800;
}

.identity-cell strong,
td strong {
  display: block;
  color: #111827;
}

.text-muted {
  display: block;
  margin-top: 4px;
  font-size: 13px;
}

.role-badge {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.role-badge.is-admin {
  background: #ede9fe;
  color: #6d28d9;
}

.role-badge.is-user {
  background: #eff6ff;
  color: #2563eb;
}

.center {
  text-align: center;
}

.btn-toggle {
  min-width: 134px;
}

.btn-promote {
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  color: #ffffff;
  box-shadow: 0 10px 24px rgba(99, 102, 241, 0.18);
}

.btn-demote {
  background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%);
  color: #ffffff;
  box-shadow: 0 10px 24px rgba(244, 63, 94, 0.18);
}

.btn-promote:hover,
.btn-demote:hover {
  transform: translateY(-1px);
}

@media (max-width: 900px) {
  .users-summary {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .users-hero {
    flex-direction: column;
    align-items: stretch;
  }

  .hero-actions .toolbar-btn {
    width: 100%;
  }
}
</style>
