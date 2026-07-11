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

const pet = ref({
  pet_name: '',
  pet_type: '',
  pet_breed: '',
  pet_gender: '',
  sterile_status: '',
  pet_color: '',
  pet_birthdate: '',
  drug_allergy: ''
})

const submitPet = async () => {
  const token = localStorage.getItem('token')

  if (!token) {
    alert('กรุณาเข้าสู่ระบบก่อนใช้งาน')
    router.push('/login')
    return
  }

  submitting.value = true

  try {
    await axios.post('http://localhost:3000/api/pets', pet.value, {
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
}

.hero-section,
.form-shell {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
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
  color: #111827;
  font-size: 30px;
}

.hero-text {
  margin: 10px 0 0;
  max-width: 640px;
  color: #4b5563;
  line-height: 1.7;
}

.back-link,
.secondary-btn,
.primary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  padding: 10px 15px;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
}

.back-link,
.secondary-btn {
  border: 1px solid #d1d5db;
  background: #ffffff;
  color: #374151;
}

.form-shell {
  padding: 24px;
}

.form-section + .form-section {
  margin-top: 22px;
}

.form-section h2 {
  margin: 0 0 16px;
  font-size: 18px;
  color: #111827;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

label span {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
}

.input-field {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 11px 12px;
  font-size: 14px;
  color: #111827;
  box-sizing: border-box;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.primary-btn {
  border: none;
  background: #4f46e5;
  color: #ffffff;
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
}
</style>
