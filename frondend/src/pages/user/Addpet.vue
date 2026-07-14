<template>
  <div class="add-pet-page">
    <section class="hero-section">
      <div>
        <h1>เพิ่มสัตว์เลี้ยงใหม่</h1>
        <p class="hero-text">กรอกข้อมูลพื้นฐานเพื่อเริ่มใช้งานประวัติการรักษา การนัดหมาย และใบเสร็จของสัตว์เลี้ยงตัวนี้</p>
      </div>
      <router-link to="/user/pets" class="back-link">กลับไปหน้าสัตว์เลี้ยง</router-link>
    </section>

    <form class="form-shell" @submit.prevent="submitPet">
      <section class="form-section">
        <h2>ข้อมูลพื้นฐาน</h2>
        <div class="image-uploader">
          <div class="pet-photo-preview">
            <img v-if="imagePreview" :src="imagePreview" alt="pet photo" />
            <span v-else>Pet photo</span>
          </div>
          <label class="image-picker">
            <span>รูปภาพสัตว์เลี้ยง</span>
            <input type="file" accept="image/*" @change="handleImageChange" />
            <small>เลือกรูปสัตว์เลี้ยงเพื่อแสดงในประวัติรายตัว</small>
          </label>
        </div>
        <div class="form-grid">
          <label>
            <span>ชื่อสัตว์เลี้ยง</span>
            <input v-model.trim="pet.pet_name" class="input-field" placeholder="เช่น มะลิ" required />
          </label>
          <label>
            <span>ประเภท</span>
            <input v-model.trim="pet.pet_type" class="input-field" placeholder="เช่น สุนัข, แมว" required />
          </label>
          <label>
            <span>สายพันธุ์</span>
            <input v-model.trim="pet.pet_breed" class="input-field" placeholder="เช่น เปอร์เซีย, ชิสุ" />
          </label>
          <label>
            <span>ลักษณะ/สี</span>
            <input v-model.trim="pet.pet_color" class="input-field" placeholder="เช่น ขาวน้ำตาล" />
          </label>
        </div>
      </section>

      <section class="form-section">
        <h2>ข้อมูลสุขภาพเบื้องต้น</h2>
        <div class="form-grid">
          <label>
            <span>เพศ</span>
            <select v-model="pet.pet_gender" class="input-field" required>
              <option value="" disabled>เลือกเพศ</option>
              <option value="ผู้">ผู้</option>
              <option value="เมีย">เมีย</option>
            </select>
          </label>
          <label>
            <span>สถานะการทำหมัน</span>
            <select v-model="pet.sterile_status" class="input-field" required>
              <option value="" disabled>เลือกสถานะ</option>
              <option value="ทำแล้ว">ทำแล้ว</option>
              <option value="ยังไม่ทำ">ยังไม่ทำ</option>
            </select>
          </label>
          <label>
            <span>วันเกิด</span>
            <input v-model="pet.pet_birthdate" type="date" class="input-field" />
          </label>
          <label>
            <span>ประวัติแพ้ยา</span>
            <input v-model.trim="pet.drug_allergy" class="input-field" placeholder="ถ้าไม่มีให้เว้นว่าง" />
          </label>
        </div>
      </section>

      <div class="actions">
        <router-link to="/user/pets" class="secondary-btn">ยกเลิก</router-link>
        <button type="submit" class="primary-btn" :disabled="submitting">
          {{ submitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูลสัตว์เลี้ยง' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'

const router = useRouter()
const submitting = ref(false)
const selectedImage = ref(null)
const imagePreview = ref('')

const pet = ref({
  pet_name: '',
  pet_image: '',
  pet_type: '',
  pet_breed: '',
  pet_gender: '',
  sterile_status: '',
  pet_color: '',
  pet_birthdate: '',
  drug_allergy: ''
})

const handleImageChange = (event) => {
  const file = event.target.files?.[0]
  selectedImage.value = file || null

  if (imagePreview.value) {
    URL.revokeObjectURL(imagePreview.value)
  }

  imagePreview.value = file ? URL.createObjectURL(file) : ''
}

const buildPetFormData = () => {
  const formData = new FormData()

  Object.entries({
    ...pet.value,
    pet_birthdate: pet.value.pet_birthdate || ''
  }).forEach(([key, value]) => {
    formData.append(key, value ?? '')
  })

  if (selectedImage.value) {
    formData.append('petImage', selectedImage.value)
  }

  return formData
}

const submitPet = async () => {
  const token = localStorage.getItem('token')

  if (!token) {
    alert('กรุณาเข้าสู่ระบบก่อนใช้งาน')
    router.push('/login')
    return
  }

  submitting.value = true

  try {
    await axios.post('http://localhost:3000/api/pets', buildPetFormData(), {
      headers: { Authorization: `Bearer ${token}` }
    })

    alert('เพิ่มข้อมูลสัตว์เลี้ยงเรียบร้อยแล้ว')
    router.push('/user/pets')
  } catch (error) {
    console.error('submitPet error:', error)
    alert(error.response?.data?.message || 'ไม่สามารถเพิ่มข้อมูลสัตว์เลี้ยงได้')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.add-pet-page {
  display: grid;
  gap: 20px;
  color: #0f172a;
  font-family: inherit;
}

.hero-section,
.form-shell {
  background: #ffffff;
  border: 1px solid rgba(217, 226, 236, 0.92);
  border-radius: 22px;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
}

.hero-section {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 16px;
  padding: 28px;
}

.hero-section h1 {
  margin: 0;
  color: #0f172a;
  font-size: 32px;
  line-height: 1.2;
  letter-spacing: 0;
}

.hero-text {
  margin: 10px 0 0;
  max-width: 640px;
  color: #64748b;
  line-height: 1.7;
  font-size: 15px;
}

.back-link,
.secondary-btn,
.primary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  border-radius: 14px;
  padding: 10px 15px;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease;
}

.back-link,
.secondary-btn {
  border: 1px solid rgba(203, 213, 225, 0.9);
  background: #ffffff;
  color: #0f172a;
}

.back-link:hover,
.secondary-btn:hover,
.primary-btn:hover {
  transform: translateY(-1px);
}

.form-shell {
  padding: 24px;
}

.form-section + .form-section {
  margin-top: 22px;
}

.form-section h2 {
  margin: 0 0 16px;
  font-size: 20px;
  line-height: 1.35;
  color: #0f172a;
}

.image-uploader {
  display: grid;
  grid-template-columns: 132px minmax(0, 1fr);
  gap: 16px;
  align-items: center;
  margin-bottom: 18px;
  padding: 16px;
  border: 1px solid #d9e2ec;
  border-radius: 18px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}

.pet-photo-preview {
  width: 132px;
  aspect-ratio: 1;
  border-radius: 18px;
  overflow: hidden;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #ecfdf5, #e0f2fe);
  color: #0f766e;
  font-size: 13px;
  font-weight: 800;
  text-align: center;
  border: 1px solid rgba(20, 184, 166, 0.14);
}

.pet-photo-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-picker input {
  width: 100%;
  border: 1px dashed #94a3b8;
  border-radius: 14px;
  padding: 12px;
  background: #fff;
  color: #334155;
  font: inherit;
}

.image-picker small {
  display: block;
  margin-top: 6px;
  color: #64748b;
  line-height: 1.55;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

label span {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 700;
  color: #334155;
  letter-spacing: 0;
}

.input-field {
  width: 100%;
  min-height: 48px;
  border: 1px solid rgba(203, 213, 225, 0.9);
  border-radius: 14px;
  padding: 12px 14px;
  font: inherit;
  font-size: 15px;
  color: #0f172a;
  box-sizing: border-box;
  background: #ffffff;
  outline: none;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.input-field::placeholder {
  color: #64748b;
  opacity: 1;
}

.input-field:focus {
  border-color: #0f766e;
  box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.12);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.primary-btn {
  border: none;
  background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);
  color: #ffffff;
  box-shadow: 0 14px 30px rgba(15, 118, 110, 0.18);
}

.primary-btn:disabled {
  opacity: 0.7;
  cursor: wait;
}

@media (max-width: 720px) {
  .hero-section,
  .actions {
    flex-direction: column;
    align-items: stretch;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .image-uploader {
    grid-template-columns: 1fr;
  }

  .pet-photo-preview {
    width: 100%;
  }
}
</style>
