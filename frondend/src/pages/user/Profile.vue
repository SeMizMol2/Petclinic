<template>
  <div class="custom-page-container">

    <div class="header-container">
      <div>
        <h1 class="page-title">
          <span class="icon-box">👤</span> 
          ข้อมูลส่วนตัว
        </h1>
        <p class="subtitle">จัดการข้อมูลบัญชีผู้ใช้และช่องทางการติดต่อ</p>
      </div>
    </div>

    <div v-if="loading" class="loading-container">
       <div class="spinner"></div>
       <p>กำลังโหลดข้อมูล...</p>
    </div>

    <div v-else class="content-wrapper">
      
      <div class="profile-card">
        <div class="profile-header">
          <div class="avatar-circle">
            {{ user.username?.charAt(0).toUpperCase() || 'U' }}
          </div>
          <div class="profile-info">
            <h2 class="username">{{ user.username }}</h2>
            <span class="role-badge">เจ้าของสัตว์เลี้ยง</span>
          </div>
          <button @click="openEdit" class="edit-btn">
            ✏️ แก้ไขข้อมูล
          </button>
        </div>

        <div class="info-grid">
          <div class="info-item">
            <label>ชื่อ-นามสกุล</label>
            <p>{{ user.owner_name || '-' }}</p>
          </div>
          <div class="info-item">
            <label>รหัสสมาชิก</label>
            <p class="font-mono text-gray-500">{{ user.user_id }}</p>
          </div>
          <div class="info-item">
            <label>📧 อีเมล</label>
            <p>{{ user.email || '-' }}</p>
          </div>
          <div class="info-item">
            <label>📞 เบอร์โทรศัพท์</label>
            <p>{{ user.tel || '-' }}</p>
          </div>
        </div>
      </div>

      <div class="pets-section">
        <div class="section-header">
          <h3>🐾 สัตว์เลี้ยงของฉัน ({{ pets.length }})</h3>
          <router-link to="/user/pets" class="view-all-link">ดูทั้งหมด →</router-link>
        </div>

        <div v-if="pets.length" class="pets-grid">
          <div v-for="pet in pets.slice(0, 3)" :key="pet.pet_id" class="mini-pet-card">
            <div class="pet-icon">{{ getPetIcon(pet.pet_type) }}</div>
            <div>
              <p class="pet-name">{{ pet.pet_name }}</p>
              <p class="pet-type">{{ pet.pet_type }}</p>
            </div>
          </div>
          <router-link v-if="pets.length > 3" to="/user/pets" class="more-pets-card">
            +{{ pets.length - 3 }}
          </router-link>
        </div>
        
        <div v-else class="empty-pets">
          <p>ยังไม่มีข้อมูลสัตว์เลี้ยง</p>
          <router-link to="/user/pets/add" class="add-pet-link">+ เพิ่มสัตว์เลี้ยง</router-link>
        </div>
      </div>

    </div>

    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
        <div class="modal-card">
          <div class="modal-header">
            <h2>✏️ แก้ไขข้อมูลส่วนตัว</h2>
            <button @click="showModal=false" class="close-btn">&times;</button>
          </div>

          <form @submit.prevent="saveUser" class="modal-body">
            
            <div class="form-group">
              <label>ชื่อผู้ใช้ (แก้ไขไม่ได้)</label>
              <input :value="editUser.username" class="input-field bg-gray-100 text-gray-500" disabled />
            </div>

            <div class="form-group">
              <label>ชื่อ-นามสกุล</label>
              <input v-model="editUser.owner_name" class="input-field" placeholder="กรอกชื่อ-นามสกุล" required />
            </div>
            
            <div class="form-group">
              <label>เบอร์โทรศัพท์</label>
              <input v-model="editUser.tel" class="input-field" type="tel" placeholder="08x-xxx-xxxx" />
            </div>

            <div class="form-group">
              <label>อีเมล</label>
              <input v-model="editUser.email" class="input-field" type="email" placeholder="user@example.com" />
            </div>

            <div class="modal-footer">
              <button type="button" @click="showModal=false" class="btn-cancel">ยกเลิก</button>
              <button type="submit" class="btn-save" :disabled="isSaving">
                {{ isSaving ? 'กำลังบันทึก...' : 'บันทึก' }}
              </button>
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

const user = ref({})
const pets = ref([])
const loading = ref(false)
const showModal = ref(false)
const editUser = ref({})
const isSaving = ref(false)

const token = localStorage.getItem('token')

const getHeaders = () => ({
  headers: { Authorization: `Bearer ${token}` }
})

// โหลดข้อมูลผู้ใช้และสัตว์เลี้ยง
const loadData = async () => {
  loading.value = true
  try {
    const [userRes, petsRes] = await Promise.all([
      axios.get('http://localhost:3000/api/user/me', getHeaders()), // API ดึงข้อมูล User
      axios.get('http://localhost:3000/api/pets', getHeaders())    // API ดึงข้อมูล Pets
    ])
    user.value = userRes.data
    pets.value = petsRes.data
  } catch (err) {
    console.error("Error loading profile:", err)
  } finally {
    loading.value = false
  }
}

// เปิด Modal พร้อม copy ข้อมูลเดิมมาใส่
const openEdit = () => {
  editUser.value = { ...user.value } 
  showModal.value = true
}

// บันทึกข้อมูลลงฐานข้อมูล
const saveUser = async () => {
  isSaving.value = true
  try {
    // ส่งข้อมูลไป update ที่ backend
    const response = await axios.put(
      'http://localhost:3000/api/user/me', 
      {
        owner_name: editUser.value.owner_name,
        tel: editUser.value.tel,
        email: editUser.value.email
      }, 
      getHeaders()
    )
    
    // อัปเดตข้อมูลในหน้าจอด้วยข้อมูลล่าสุดจาก Server (หรือใช้ค่าที่ส่งไปก็ได้)
    user.value = { ...user.value, ...editUser.value } 
    
    alert('บันทึกข้อมูลเรียบร้อย ✅')
    showModal.value = false
    
  } catch (err) {
    console.error("Error updating user:", err)
    alert('เกิดข้อผิดพลาดในการบันทึก: ' + (err.response?.data?.message || 'โปรดลองอีกครั้ง'))
  } finally {
    isSaving.value = false
  }
}

const getPetIcon = (type) => {
  const t = type?.toLowerCase() || ''
  if (t.includes('สุนัข') || t.includes('หมา')) return '🐕'
  if (t.includes('แมว')) return '🐈'
  return '🐾'
}

onMounted(loadData)
</script>

<style scoped>
/* Container Styles (ธีมเดียวกับ Pets.vue) */
.custom-page-container {
  min-height: 100%;
  background-color: #5a72ea;
  padding: 2rem;
  font-family: 'Inter', sans-serif;
  color: #333;
}

/* Header */
.header-container {
  max-width: 800px;
  margin: 0 auto 2rem;
  color: white;
}
.page-title { font-size: 2rem; font-weight: 800; display: flex; align-items: center; gap: 0.75rem; margin: 0; }
.icon-box { background-color: rgba(255,255,255,0.2); padding: 0.5rem; border-radius: 12px; backdrop-filter: blur(4px); }
.subtitle { color: #bfdbfe; margin-top: 0.25rem; font-size: 0.95rem; padding-left: 0.5rem; }

/* Content Wrapper */
.content-wrapper { max-width: 800px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.5rem; }

/* Profile Card */
.profile-card {
  background: white; border-radius: 1.5rem; padding: 2rem;
  box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
}
.profile-header { display: flex; align-items: center; gap: 1.5rem; margin-bottom: 2rem; padding-bottom: 1.5rem; border-bottom: 1px dashed #e5e7eb; }
.avatar-circle {
  width: 80px; height: 80px; background: linear-gradient(135deg, #6200ea, #9d46ff);
  color: white; font-size: 2.5rem; font-weight: 800; border-radius: 50%;
  display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(98,0,234,0.3);
}
.profile-info { flex: 1; }
.username { font-size: 1.5rem; font-weight: 800; color: #1f2937; margin: 0; }
.role-badge { background: #dbeafe; color: #1e40af; font-size: 0.75rem; padding: 0.25rem 0.75rem; border-radius: 99px; font-weight: 600; }
.edit-btn {
  background: #f3f4f6; color: #4b5563; border: none; padding: 0.6rem 1rem;
  border-radius: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.2s;
}
.edit-btn:hover { background: #e5e7eb; color: #111827; }

/* Info Grid (Responsive) */
.info-grid { display: grid; grid-template-columns: 1fr; gap: 1.5rem; }
@media (min-width: 640px) {
  .info-grid { grid-template-columns: 1fr 1fr; }
}

.info-item label { display: block; font-size: 0.85rem; color: #9ca3af; font-weight: 600; margin-bottom: 0.25rem; }
.info-item p { font-size: 1.1rem; font-weight: 600; color: #374151; word-break: break-all; }

/* Pets Section */
.pets-section { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 1.5rem; padding: 1.5rem; color: white; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.section-header h3 { font-size: 1.1rem; font-weight: 700; margin: 0; }
.view-all-link { color: white; font-size: 0.9rem; text-decoration: none; opacity: 0.8; }
.view-all-link:hover { opacity: 1; text-decoration: underline; }

.pets-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 1rem; }
.mini-pet-card {
  background: white; border-radius: 1rem; padding: 1rem; color: #333;
  display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0.5rem;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05); transition: transform 0.2s;
}
.mini-pet-card:hover { transform: translateY(-3px); }
.pet-icon { font-size: 2rem; background: #fff7ed; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; border-radius: 50%; }
.pet-name { font-weight: 700; font-size: 0.95rem; margin: 0; }
.pet-type { font-size: 0.75rem; color: #9ca3af; }
.more-pets-card {
  background: rgba(255,255,255,0.2); border-radius: 1rem; display: flex; align-items: center; justify-content: center;
  color: white; font-weight: 700; font-size: 1.25rem; text-decoration: none; border: 2px dashed rgba(255,255,255,0.4);
}
.empty-pets { text-align: center; padding: 2rem; color: #bfdbfe; }
.add-pet-link { display: inline-block; margin-top: 0.5rem; color: white; font-weight: 600; text-decoration: underline; }

/* Modal Styles */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 9999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
.modal-card { background: white; width: 100%; max-width: 450px; border-radius: 1.5rem; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); margin: 1rem; }
.modal-header { background: #5a72ea; padding: 1.25rem 1.5rem; color: white; display: flex; justify-content: space-between; align-items: center; }
.modal-header h2 { margin: 0; font-size: 1.1rem; font-weight: 700; }
.close-btn { background: none; border: none; color: white; font-size: 1.5rem; cursor: pointer; }
.modal-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
.form-group label { display: block; font-size: 0.85rem; font-weight: 600; color: #4b5563; margin-bottom: 0.4rem; }
.input-field { width: 100%; padding: 0.7rem 1rem; border: 1px solid #e5e7eb; border-radius: 0.75rem; font-size: 0.95rem; outline: none; box-sizing: border-box; }
.input-field:focus { border-color: #5a72ea; box-shadow: 0 0 0 3px rgba(90,114,234,0.1); }
.modal-footer { padding: 1.25rem 1.5rem; background: #f9fafb; display: flex; justify-content: flex-end; gap: 0.75rem; border-top: 1px solid #f3f4f6; }
.btn-cancel { padding: 0.6rem 1.2rem; background: white; border: 1px solid #d1d5db; border-radius: 0.75rem; color: #374151; font-weight: 600; }
.btn-save { padding: 0.6rem 1.5rem; background: #5a72ea; border: none; border-radius: 0.75rem; color: white; font-weight: 600; }
.btn-save:disabled { background-color: #a5b4fc; cursor: not-allowed; }

/* Loading */
.loading-container { text-align: center; color: white; padding-top: 5rem; }
.spinner { width: 40px; height: 40px; border: 4px solid rgba(255,255,255,0.3); border-top: 4px solid white; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>