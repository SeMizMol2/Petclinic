<template>
  <div class="profile-page">
    <section class="hero-section">
      <div>
        <h1>ข้อมูลส่วนตัว</h1>
        <p class="hero-text">จัดการรูปโปรไฟล์ ข้อมูลติดต่อ และรายละเอียดเจ้าของสัตว์เลี้ยงได้จากหน้าจอนี้</p>
      </div>
      <button class="action-btn" @click="isEditing ? saveProfile() : (isEditing = true)">
        {{ isEditing ? 'บันทึกข้อมูล' : 'แก้ไขข้อมูล' }}
      </button>
    </section>

    <section class="profile-grid">
      <div class="profile-summary">
        <div class="avatar-panel" @click="triggerFileInput">
          <img v-if="previewImage || user.profile_pic" :src="previewImage || user.profile_pic" class="avatar-img" />
          <div v-else class="avatar-text">{{ user.username?.charAt(0).toUpperCase() || 'U' }}</div>
          <div class="avatar-overlay">อัปโหลดรูป</div>
          <input ref="fileInput" type="file" accept="image/*" class="hidden-input" @change="onFileSelected" />
        </div>

        <div class="summary-copy">
          <h2>{{ user.owner_name || user.username || 'เจ้าของสัตว์เลี้ยง' }}</h2>
          <p>{{ user.email || 'ยังไม่ได้ระบุอีเมล' }}</p>
          <span class="summary-tag">{{ user.tel || 'ยังไม่ได้ระบุเบอร์โทรศัพท์' }}</span>
        </div>
      </div>

      <div class="profile-details">
        <div class="detail-card">
          <span class="detail-label">ชื่อ-นามสกุล</span>
          <input v-if="isEditing" v-model="user.owner_name" class="detail-input" />
          <div v-else class="detail-value">{{ user.owner_name || 'ไม่พบข้อมูล' }}</div>
        </div>

        <div class="detail-card">
          <span class="detail-label">อีเมล</span>
          <input v-if="isEditing" v-model="user.email" class="detail-input" />
          <div v-else class="detail-value">{{ user.email || 'ยังไม่ได้ระบุอีเมล' }}</div>
        </div>

        <div class="detail-card">
          <span class="detail-label">เบอร์โทรศัพท์</span>
          <input v-if="isEditing" v-model="user.tel" class="detail-input" />
          <div v-else class="detail-value">{{ user.tel || 'ยังไม่ได้ระบุเบอร์โทรศัพท์' }}</div>
        </div>

        <div class="detail-card detail-note">
          <span class="detail-label">หมายเหตุ</span>
          <div class="detail-value muted">ข้อมูลนี้จะถูกใช้ประกอบการติดต่อ นัดหมาย และออกเอกสารของคลินิก</div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const user = ref({})
const fileInput = ref(null)
const previewImage = ref(null)
const isEditing = ref(false)

const loadProfile = async () => {
  const token = localStorage.getItem('token')
  if (!token) return

  try {
    const res = await axios.get('http://localhost:3000/api/user/me', {
      headers: { Authorization: `Bearer ${token}` }
    })

    user.value = {
      ...res.data,
      email: res.data.owner_email
    }
    localStorage.setItem('user', JSON.stringify(user.value))
  } catch (err) {
    console.error('โหลดข้อมูลผู้ใช้ไม่สำเร็จ:', err)
    const userData = JSON.parse(localStorage.getItem('user'))
    if (userData) user.value = userData
  }
}

onMounted(loadProfile)

const triggerFileInput = () => fileInput.value?.click()

const onFileSelected = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  previewImage.value = URL.createObjectURL(file)
  const formData = new FormData()
  formData.append('profileImage', file)

  try {
    const token = localStorage.getItem('token')
    const res = await axios.post('http://localhost:3000/api/user/upload-profile', formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    })

    if (res.data.success) {
      user.value.profile_pic = res.data.imageUrl
      localStorage.setItem('user', JSON.stringify(user.value))
      alert('อัปโหลดรูปสำเร็จ')
    }
  } catch (err) {
    console.error(err)
    alert('อัปโหลดรูปไม่สำเร็จ')
  }
}

const saveProfile = async () => {
  try {
    const token = localStorage.getItem('token')
    await axios.put(
      'http://localhost:3000/api/user/me',
      {
        owner_name: user.value.owner_name,
        owner_email: user.value.email,
        tel: user.value.tel
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    )

    localStorage.setItem('user', JSON.stringify(user.value))
    isEditing.value = false
    alert('บันทึกข้อมูลเรียบร้อย')
  } catch (err) {
    console.error(err)
    alert(err.response?.data?.message || 'บันทึกข้อมูลไม่สำเร็จ')
  }
}
</script>

<style scoped>
.profile-page {
  display: grid;
  gap: 20px;
}

.hero-section,
.profile-summary,
.profile-details {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.hero-section {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: start;
  padding: 28px;
}

.hero-section h1 {
  margin: 0;
  font-size: 30px;
  color: #111827;
}

.hero-text {
  margin: 8px 0 0;
  max-width: 580px;
  color: #4b5563;
  line-height: 1.65;
}

.action-btn {
  border: none;
  border-radius: 8px;
  background: #4f46e5;
  color: #ffffff;
  padding: 11px 16px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.profile-grid {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 20px;
}

.profile-summary,
.profile-details {
  background: rgba(255, 255, 255, 0.92);
}

.profile-summary {
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.avatar-panel {
  position: relative;
  width: 132px;
  height: 132px;
  border-radius: 18px;
  overflow: hidden;
  cursor: pointer;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  margin-bottom: 18px;
}

.avatar-img,
.avatar-text {
  width: 100%;
  height: 100%;
}

.avatar-img {
  object-fit: cover;
}

.avatar-text {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 52px;
  font-weight: 800;
}

.avatar-overlay {
  position: absolute;
  inset: 0;
  background: rgba(17, 24, 39, 0.45);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.avatar-panel:hover .avatar-overlay {
  opacity: 1;
}

.hidden-input {
  display: none;
}

.summary-copy h2 {
  margin: 0;
  font-size: 22px;
  color: #111827;
}

.summary-copy p {
  margin: 8px 0 12px;
  color: #6b7280;
}

.summary-tag {
  display: inline-flex;
  border-radius: 999px;
  padding: 7px 12px;
  background: #eef2ff;
  color: #4338ca;
  font-size: 13px;
  font-weight: 700;
}

.profile-details {
  padding: 24px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.detail-card {
  background: #f8fafc;
  border-radius: 8px;
  padding: 18px;
}

.detail-note {
  grid-column: 1 / -1;
}

.detail-label {
  display: block;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
}

.detail-value {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  line-height: 1.6;
}

.detail-input {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  color: #111827;
  box-sizing: border-box;
}

.muted {
  color: #4b5563;
  font-weight: 500;
}

@media (max-width: 900px) {
  .profile-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .hero-section {
    flex-direction: column;
  }

  .profile-details {
    grid-template-columns: 1fr;
  }
}
</style>
