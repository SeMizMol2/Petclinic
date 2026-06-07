<template>
  <div class="profile-container">
    <div class="profile-card">
      <div class="card-header">
        <div class="avatar-wrapper" @click="triggerFileInput">
          <img v-if="previewImage || user.profile_pic" :src="previewImage || user.profile_pic" class="avatar-img" />
          <div v-else class="avatar-text">{{ user.username?.charAt(0).toUpperCase() || 'U' }}</div>
          <div class="avatar-overlay"><span class="text-xl">📷</span></div>
          <input type="file" ref="fileInput" @change="onFileSelected" accept="image/*" class="hidden-input" />
        </div>

        <button class="edit-btn" @click="isEditing ? saveProfile() : (isEditing = true)">
          {{ isEditing ? '💾 บันทึกข้อมูล' : '✏️ แก้ไขข้อมูล' }}
        </button>
      </div>

      <div class="info-grid">
        <div class="info-box">
          <label>ชื่อ-นามสกุล</label>
          <input v-if="isEditing" v-model="user.owner_name" class="edit-input" />
          <div v-else class="info-value">{{ user.owner_name || 'ไม่พบข้อมูล' }}</div>
        </div>

        <div class="info-box">
          <label>อีเมล</label>
          <input v-if="isEditing" v-model="user.email" class="edit-input" />
          <div v-else class="info-value">📧 {{ user.email || 'ไม่ได้ระบุอีเมล' }}</div>
        </div>

        <div class="info-box">
          <label>เบอร์โทรศัพท์</label>
          <input v-if="isEditing" v-model="user.tel" class="edit-input" />
          <div v-else class="info-value">📞 {{ user.tel || 'ไม่ได้ระบุเบอร์โทร' }}</div>
        </div>

        <div class="info-box">
          <label>ที่อยู่</label>
          <input v-if="isEditing" v-model="user.owner_address" class="edit-input" placeholder="ระบุที่อยู่..." />
          <div v-else class="info-value">🏠 {{ user.owner_address || 'ไม่ได้ระบุที่อยู่' }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const user = ref({})
const fileInput = ref(null)
const previewImage = ref(null)
const isEditing = ref(false)

onMounted(async () => {
  // 1. โหลดจาก localStorage มาโชว์ก่อน (เพื่อให้หน้าจอแสดงผลไว)
  const userData = JSON.parse(localStorage.getItem('user'))
  if (userData) user.value = userData

  // 2. ดึงข้อมูลล่าสุดจาก Server เสมอ เพื่อแก้ปัญหาข้อมูลหายหลัง Login
  try {
    const token = localStorage.getItem('token')
    if (token) {
      const res = await axios.get('http://localhost:3000/api/user/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      console.log("ข้อมูลที่ได้จาก Server:", res.data); // เพิ่มบรรทัดนี้
user.value = res.data;
    }
  } catch (err) {
    console.error("ดึงข้อมูลล่าสุดจาก Server ไม่สำเร็จ:", err)
  }
})

const triggerFileInput = () => fileInput.value.click()

const onFileSelected = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  previewImage.value = URL.createObjectURL(file)
  const formData = new FormData()
  formData.append('profileImage', file)
  try {
    const token = localStorage.getItem('token')
    const res = await axios.post('http://localhost:3000/api/user/upload-profile', formData, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
    })
    if (res.data.success) {
      user.value.profile_pic = res.data.imageUrl
      localStorage.setItem('user', JSON.stringify(user.value))
      alert("อัปโหลดรูปสำเร็จ!")
    }
  } catch (err) { alert("อัปโหลดไม่สำเร็จ") }
}

const saveProfile = async () => {
  try {
    const token = localStorage.getItem('token')
    await axios.put('http://localhost:3000/api/user/me', {
      owner_name: user.value.owner_name,
      owner_email: user.value.email, 
      tel: user.value.tel,
      owner_address: user.value.owner_address
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    localStorage.setItem('user', JSON.stringify(user.value))
    isEditing.value = false
    alert("บันทึกข้อมูลเรียบร้อย!")
  } catch (err) {
    console.error(err)
    alert("บันทึกไม่สำเร็จ: " + (err.response?.data?.message || err.message))
  }
}
</script>

<style scoped>
.profile-container { padding: 2rem; max-width: 900px; margin: 0 auto; font-family: 'Sarabun', sans-serif; }
.profile-card { background: white; border-radius: 20px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05); padding: 2.5rem; border: 1px solid #f1f5f9; }
.card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; padding-bottom: 1.5rem; border-bottom: 1px dashed #e2e8f0; }

/* Avatar */
.avatar-wrapper { position: relative; width: 100px; height: 100px; border-radius: 25px; overflow: hidden; cursor: pointer; box-shadow: 0 8px 20px rgba(99, 102, 241, 0.2); border: 3px solid white; }
.avatar-text { width: 100%; height: 100%; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; display: flex; align-items: center; justify-content: center; font-size: 3rem; font-weight: bold; }
.avatar-img { width: 100%; height: 100%; object-fit: cover; }
.avatar-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); color: white; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s; }
.avatar-wrapper:hover .avatar-overlay { opacity: 1; }
.hidden-input { display: none; }

/* Edit Controls */
.edit-btn { background: #f8fafc; border: 1px solid #e2e8f0; padding: 0.6rem 1.2rem; border-radius: 10px; color: #475569; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.edit-btn:hover { background: #f1f5f9; transform: translateY(-2px); }

/* Grid Layout */
.info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; }
.info-box { background: #f8fafc; padding: 1.2rem; border-radius: 15px; }
.info-box label { display: block; font-size: 0.75rem; font-weight: 700; color: #94a3b8; margin-bottom: 0.5rem; text-transform: uppercase; }
.info-value { font-size: 1.1rem; font-weight: 700; color: #334155; }

/* Input Styling */
.edit-input { width: 100%; padding: 0.7rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 1rem; color: #334155; outline: none; transition: border-color 0.2s; }
.edit-input:focus { border-color: #6366f1; }
</style>