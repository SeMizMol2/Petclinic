<template>
  <div class="custom-page-container">
    
    <div class="header-section">
      <div class="icon-wrapper">
        <span class="header-icon">🐾</span>
      </div>
      <h1 class="page-title">เพิ่มข้อมูลสัตว์เลี้ยง</h1>
      <p class="page-subtitle">กรอกข้อมูลน้องๆ เพื่อเริ่มดูแลสุขภาพของพวกเขา</p>
    </div>

    <div class="form-card">
      
      <form @submit.prevent="submitPet">
        
        <div class="form-group">
          <label class="input-label">
            <span class="label-icon">🏷️</span> ชื่อสัตว์เลี้ยง
          </label>
          <input 
            v-model="pet.pet_name" 
            class="input-field" 
            placeholder="กรอกชื่อสัตว์เลี้ยง" 
            required 
          />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="input-label">
              <span class="label-icon">🐕</span> ประเภท
            </label>
            <input 
              v-model="pet.pet_type" 
              class="input-field" 
              placeholder="เช่น สุนัข, แมว" 
              required 
            />
          </div>
          <div class="form-group">
            <label class="input-label">
              <span class="label-icon">🧬</span> สายพันธุ์
            </label>
            <input 
              v-model="pet.pet_breed" 
              class="input-field" 
              placeholder="เช่น โกลเด้นรีทรีฟเวอร์" 
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="input-label">
              <span class="label-icon">⚧</span> เพศ
            </label>
            <div class="select-wrapper">
              <select v-model="pet.pet_gender" class="input-field cursor-pointer" required>
                <option value="" disabled selected>เลือกเพศ</option>
                <option value="ผู้">ตัวผู้</option>
                <option value="เมีย">ตัวเมีย</option>
              </select>
              <span class="select-arrow">▼</span>
            </div>
          </div>
          <div class="form-group">
            <label class="input-label">
              <span class="label-icon">💉</span> สถานะการทำหมัน
            </label>
            <div class="select-wrapper">
              <select v-model="pet.sterile_status" class="input-field cursor-pointer" required>
                <option value="" disabled selected>เลือกสถานะ</option>
                <option value="ทำแล้ว">ทำหมันแล้ว</option>
                <option value="ยังไม่ทำ">ยังไม่ทำหมัน</option>
              </select>
              <span class="select-arrow">▼</span>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="input-label">
            <span class="label-icon">✨</span> ลักษณะเด่น / สี
          </label>
          <input 
            v-model="pet.pet_color" 
            class="input-field" 
            placeholder="บรรยายลักษณะเด่นของสัตว์เลี้ยง หรือสี" 
          />
        </div>

        <div class="form-group">
          <label class="input-label">
            <span class="label-icon">🎂</span> วันเกิด
          </label>
          <input 
            type="date" 
            v-model="pet.pet_birthdate" 
            class="input-field"
          />
        </div>

        <div class="form-group">
          <label class="input-label">
            <span class="label-icon">⚠️</span> ประวัติการแพ้ยา
          </label>
          <textarea
            v-model="pet.drug_allergy"
            class="input-field textarea-field"
            rows="3"
            placeholder="ระบุยาที่แพ้ (ถ้าไม่มีให้เว้นว่างหรือพิมพ์ 'ไม่มี')"
          ></textarea>
        </div>

        <div class="button-group">
          <button type="submit" class="btn btn-save">
            <span>✓</span> ยืนยันการเพิ่มข้อมูล
          </button>

          <router-link to="/user/pets" class="btn btn-cancel">
            <span>✕</span> ยกเลิก
          </router-link>
        </div>

      </form>
    </div>

    <div class="footer-text">
      <span>🐾</span> ดูแลสัตว์เลี้ยงด้วยความรัก <span>🐾</span>
    </div>

  </div>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'

const router = useRouter()
const token = localStorage.getItem('token')

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
  if (!token) {
    alert("กรุณาเข้าสู่ระบบก่อน")
    router.push('/login')
    return
  }

  try {
    await axios.post(
      'http://localhost:3000/api/pets',
      pet.value,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    alert('เพิ่มข้อมูลน้องเรียบร้อยแล้ว! 🎉')
    router.push('/user/pets')

  } catch (err) {
    console.error("ERROR:", err.response?.data)
    alert(err.response?.data?.message || 'เพิ่มสัตว์เลี้ยงไม่สำเร็จ')
  }
}
</script>

<style scoped>
/* =========================================
   CUSTOM CSS (บังคับใช้ Style นี้แน่นอน)
   ========================================= */

/* Main Page Container */
.custom-page-container {
  min-height: 100vh;
  background-color: #5a72ea; /* พื้นหลังสีฟ้า */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  font-family: 'Inter', sans-serif;
}

/* Header Section */
.header-section {
  text-align: center;
  margin-bottom: 2rem;
  color: white;
}
.icon-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 5rem;
  height: 5rem;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  margin-bottom: 1rem;
  backdrop-filter: blur(4px);
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
}
.header-icon { font-size: 2.5rem; }
.page-title {
  font-size: 2rem;
  font-weight: 800;
  margin: 0 0 0.5rem;
  text-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.page-subtitle {
  color: #bfdbfe; /* blue-100 */
  font-size: 0.95rem;
  margin: 0;
  opacity: 0.9;
}

/* Card Container */
.form-card {
  background-color: #ffffff !important; /* บังคับพื้นขาว */
  width: 100%;
  max-width: 800px;
  border-radius: 2rem;
  padding: 2.5rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  position: relative;
  box-sizing: border-box;
}

/* Form Styles */
.form-group { margin-bottom: 1.25rem; }
.form-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;
  margin-bottom: 1.25rem;
}
@media (min-width: 768px) {
  .form-row { grid-template-columns: 1fr 1fr; }
}

.input-label {
  display: flex;
  align-items: center;
  font-size: 0.95rem;
  font-weight: 700;
  color: #374151; /* gray-700 */
  margin-bottom: 0.5rem;
}
.label-icon { margin-right: 0.5rem; }

.input-field {
  width: 100%;
  padding: 0.85rem 1rem;
  background-color: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  color: #4b5563;
  font-size: 1rem;
  outline: none;
  transition: all 0.2s ease;
  box-sizing: border-box; /* ป้องกัน Input ล้น */
}
.input-field:focus {
  border-color: #6200ea;
  box-shadow: 0 0 0 3px rgba(98, 0, 234, 0.1);
}
.input-field::placeholder { color: #9ca3af; font-weight: 400; }

.textarea-field { min-height: 100px; resize: vertical; }

/* Custom Select */
.select-wrapper { position: relative; }
.select-arrow {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  font-size: 0.75rem;
  pointer-events: none;
}
select.input-field { appearance: none; cursor: pointer; }

/* Buttons */
.button-group {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}
.btn {
  padding: 0.85rem 1.5rem;
  border-radius: 0.75rem;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.2s;
  text-decoration: none;
}
.btn-save {
  flex-grow: 1;
  background-color: #6200ea; /* สีม่วง */
  color: white;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
.btn-save:hover {
  background-color: #5200d6;
  transform: translateY(-1px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}
.btn-save:active { transform: translateY(0); }

.btn-cancel {
  background-color: #f3f4f6;
  color: #374151;
  min-width: 120px;
}
.btn-cancel:hover { background-color: #e5e7eb; color: #111827; }

/* Footer */
.footer-text {
  margin-top: 2rem;
  color: #bfdbfe;
  font-size: 0.875rem;
  opacity: 0.8;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

</style>