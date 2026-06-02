<template>
  <div class="custom-page-container">

    <div class="back-nav">
      <router-link to="/user/profile" class="btn-white">
        <span class="icon-lg">←</span> 
        ย้อนกลับ
      </router-link>
    </div>

    <div class="header-container">
      <div class="header-content">
        <h1 class="page-title">
          <span class="icon-box">🐾</span> 
          สัตว์เลี้ยงของฉัน
        </h1>
        <p class="subtitle">จัดการข้อมูลน้องๆ ทั้งหมดของคุณได้ที่นี่</p>
      </div>
      
      <router-link to="/user/pets/add" class="btn-white">
        <span class="icon-lg">+</span> 
        เพิ่มสัตว์เลี้ยง
      </router-link>
    </div>

    <div v-if="loading" class="loading-container">
       <div class="spinner"></div>
       <p>กำลังโหลดข้อมูล...</p>
    </div>

    <div v-else-if="pets.length" class="custom-grid">
      
      <div
        v-for="pet in pets"
        :key="pet.pet_id"
        class="pet-card group"
      >
        
        <div class="action-buttons">
          <button @click.stop="openEdit(pet)" class="btn-icon btn-edit" title="แก้ไข">
            ✏️
          </button>
          <button @click.stop="deletePet(pet.pet_id)" class="btn-icon btn-delete" title="ลบ">
            🗑️
          </button>
        </div>

        <div class="card-header">
          <div class="pet-avatar">
            {{ getPetIcon(pet.pet_type) }}
          </div>
          <div class="pet-info">
            <h2 class="pet-name">{{ pet.pet_name }}</h2>
            <p class="pet-breed">{{ pet.pet_breed || 'ไม่ระบุสายพันธุ์' }}</p>
          </div>
        </div>

        <div class="info-row">
          <div class="info-box">
            <p class="label">ประเภท</p>
            <p class="value">{{ pet.pet_type }}</p>
          </div>
          <div class="info-box">
            <p class="label">เพศ</p>
            <p class="value flex-center">
              <span v-if="pet.pet_gender === 'ผู้'" style="color: #3b82f6;">♂</span>
              <span v-else style="color: #ec4899;">♀</span>
              {{ pet.pet_gender }}
            </p>
          </div>
        </div>

        <div class="status-row">
             <div>
                <span class="status-badge" :class="pet.sterile_status === 'ทำแล้ว' ? 'status-green' : 'status-orange'">
                  {{ pet.sterile_status === 'ทำแล้ว' ? '✓ ทำหมันแล้ว' : '✕ ยังไม่ทำ' }}
                </span>
             </div>
        </div>

        <div class="details-section">
            <div class="detail-item">
               <span class="emoji">✨</span>
               <div>
                  <p class="detail-label">ลักษณะเด่น</p>
                  <p class="detail-text">{{ pet.pet_color || '-' }}</p>
               </div>
            </div>

            <div class="detail-item">
               <span class="emoji">⚠️</span>
               <div>
                  <p class="detail-label">แพ้ยา</p>
                  <p class="detail-text" :style="{ color: pet.drug_allergy ? '#ef4444' : '#6b7280' }">
                    {{ pet.drug_allergy || 'ไม่มีประวัติแพ้ยา' }}
                  </p>
               </div>
            </div>
        </div>
        
        <div class="card-footer">
           <span>🎂 วันเกิด:</span>
           <span class="birthdate-text">{{ formatDateDisplay(pet.pet_birthdate) }}</span>
        </div>

        <div class="history-section">
          <h3 class="history-title">🏥 ประวัติการรักษาล่าสุด</h3>
          
          <div class="history-list">
            <div v-for="history in mockHistory" :key="history.id" class="history-item">
              <div class="history-item-header">
                 <span class="history-date">📅 {{ history.date }}</span>
                 <span class="history-vet">👨‍⚕️ {{ history.vet }}</span>
              </div>
              <p class="history-name">{{ history.title }}</p>
              <p class="history-note">📝 หมายเหตุ: {{ history.note }}</p>
            </div>
          </div>
        </div>
        </div>
    </div>

    <div v-else class="empty-state">
      <div class="empty-icon">🕸️</div>
      <h3 class="empty-title">ยังไม่มีข้อมูลสัตว์เลี้ยง</h3>
      <router-link to="/user/pets/add" class="btn-white">
        + เพิ่มสัตว์เลี้ยงตัวแรก
      </router-link>
    </div>

    <Teleport to="body">
      <div v-if="showEdit" class="modal-overlay" @click.self="showEdit = false">
        <div class="modal-card">
           <div class="modal-header">
             <h2>✏️ แก้ไขข้อมูลน้อง</h2>
             <button @click="showEdit=false" class="close-btn">&times;</button>
           </div>
           
           <div class="modal-body">
              <div class="form-group">
                <label>ชื่อสัตว์เลี้ยง</label>
                <input v-model="editPet.pet_name" class="input-field" />
              </div>
              <div class="form-row">
                 <div class="form-group"><label>ประเภท</label><input v-model="editPet.pet_type" class="input-field"/></div>
                 <div class="form-group"><label>สายพันธุ์</label><input v-model="editPet.pet_breed" class="input-field"/></div>
              </div>
              <div class="form-row">
                 <div class="form-group">
                   <label>เพศ</label>
                   <select v-model="editPet.pet_gender" class="input-field">
                     <option value="ผู้">♂ ตัวผู้</option>
                     <option value="เมีย">♀ ตัวเมีย</option>
                   </select>
                 </div>
                 <div class="form-group"><label>ลักษณะ/สี</label><input v-model="editPet.pet_color" class="input-field"/></div>
              </div>
              <div class="form-row">
                 <div class="form-group">
                   <label>สถานะ</label>
                   <select v-model="editPet.sterile_status" class="input-field">
                     <option value="ทำแล้ว">✅ ทำหมันแล้ว</option>
                     <option value="ยังไม่ทำ">⏳ ยังไม่ทำ</option>
                   </select>
                 </div>
                 <div class="form-group"><label>วันเกิด</label><input type="date" v-model="editPet.pet_birthdate" class="input-field"/></div>
              </div>
              <div class="form-group">
                <label>ประวัติแพ้ยา</label>
                <textarea v-model="editPet.drug_allergy" class="input-field" rows="2"></textarea>
              </div>
           </div>

           <div class="modal-footer">
              <button @click="showEdit=false" class="btn-cancel">ยกเลิก</button>
              <button @click="updatePet" class="btn-save">บันทึก</button>
           </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const pets = ref([])
const loading = ref(false)
const showEdit = ref(false)
const editPet = ref({})

// 📍 ส่วนที่เพิ่มเข้ามาใหม่: ข้อมูลจำลอง (Mock Data) 📍
// วันหลังถ้า API ประวัติเสร็จ ค่อยลบตัวนี้ทิ้ง แล้วดึงข้อมูลจาก axios แทนครับ
const mockHistory = ref([
  { id: 1, date: "20 พ.ค. 2026", title: "ฉีดวัคซีนรวม 5 โรค", note: "น้องปกติดี ร่าเริง", vet: "น.สพ. สมชาย" },
  { id: 2, date: "10 เม.ย. 2026", title: "อาบน้ำตัดขน", note: "ตัดทรงสิงโต", vet: "ช่างสมศรี" }
]);

const getHeaders = () => ({
  headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
})

const loadPets = async () => {
  loading.value = true
  try {
    const res = await axios.get('http://localhost:3000/api/pets', getHeaders())
    pets.value = res.data
  } catch (error) {
    console.error('Error loading pets:', error)
  } finally {
    loading.value = false
  }
}

const calculateAge = (birthdate) => {
  if (!birthdate) return '-'
  const birth = new Date(birthdate)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--
  }
  return age < 0 ? 0 : age
}

const getPetIcon = (type) => {
  const t = type?.toLowerCase() || ''
  if (t.includes('สุนัข') || t.includes('หมา')) return '🐕'
  if (t.includes('แมว')) return '🐈'
  if (t.includes('ปลา')) return '🐠'
  if (t.includes('นก')) return '🦜'
  if (t.includes('กระต่าย')) return '🐇'
  return '🐾'
}

const openEdit = (pet) => {
  try {
    const petData = { ...pet }
    if (petData.pet_birthdate) {
      const dateObj = new Date(petData.pet_birthdate)
      if (!isNaN(dateObj)) {
         petData.pet_birthdate = dateObj.toLocaleDateString('en-CA')
      } else {
         petData.pet_birthdate = ''
      }
    }
    editPet.value = petData
    showEdit.value = true
  } catch (error) {
    console.error("Error opening popup:", error)
  }
}

const updatePet = async () => {
  try {
    await axios.put(`http://localhost:3000/api/pets/${editPet.value.pet_id}`, editPet.value, getHeaders())
    alert('แก้ไขข้อมูลสำเร็จ ✅')
    showEdit.value = false
    loadPets()
  } catch (error) {
    alert('เกิดข้อผิดพลาดในการแก้ไข')
  }
}

const deletePet = async (id) => {
  if (!confirm('ยืนยันการลบข้อมูลน้อง?')) return
  try {
    await axios.delete(`http://localhost:3000/api/pets/${id}`, getHeaders())
    loadPets()
  } catch (error) {
    alert('ลบข้อมูลไม่สำเร็จ')
  }
}

const formatDateDisplay = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
}

onMounted(loadPets)
</script>

<style scoped>
/* =========================================
   CUSTOM CSS
   ========================================= */

/* 1. Page Container */
.custom-page-container {
  min-height: 100vh;
  background-color: #5a72ea;
  padding: 2rem;
  font-family: 'Inter', sans-serif;
}

/* Back Nav Container  */
.back-nav {
  max-width: 1200px;
  margin: 0 auto 1.5rem;
}

/* 2. Header */
.header-container {
  max-width: 1200px;
  margin: 0 auto 2.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}
.header-content { color: white; }
.page-title {
  font-size: 2rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0;
}
.icon-box {
  background-color: rgba(255, 255, 255, 0.2);
  padding: 0.5rem;
  border-radius: 12px;
  backdrop-filter: blur(4px);
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
}
.subtitle {
  color: #bfdbfe;
  margin-top: 0.25rem;
  font-size: 0.95rem;
  padding-left: 0.5rem;
}

/* 3. Shared Button Style  */
.btn-white {
  background-color: white;
  color: #5a72ea;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  transition: transform 0.2s, box-shadow 0.2s;
  text-decoration: none;
  font-size: 1rem;
}
.btn-white:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px rgba(0,0,0,0.15);
}
.icon-lg { 
  font-size: 1.4rem; 
  line-height: 1; 
  font-weight: 400; 
}

/* 4. Grid Layout */
.custom-grid {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 1.5rem;
}
@media (min-width: 768px) {
  .custom-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (min-width: 1024px) {
  .custom-grid { grid-template-columns: repeat(3, 1fr); }
}

/* 5. Pet Card */
.pet-card {
  background-color: #ffffff !important;
  border-radius: 1.5rem;
  padding: 1.5rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  position: relative;
  border: 4px solid transparent;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
}
.pet-card:hover {
  transform: translateY(-5px);
  border-color: #bfdbfe;
}

/* Action Buttons */
.action-buttons {
  position: absolute;
  top: 1rem;
  right: 1rem;
  display: flex;
  gap: 0.5rem;
  opacity: 0;
  transition: opacity 0.2s;
}
.pet-card:hover .action-buttons { opacity: 1; }
.btn-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: none;
  background-color: #f3f4f6;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  transition: background 0.2s;
}
.btn-edit:hover { background-color: #fef9c3; color: #ca8a04; }
.btn-delete:hover { background-color: #fee2e2; color: #dc2626; }

/* Card Content */
.card-header { display: flex; align-items: flex-start; gap: 1rem; margin-bottom: 1.5rem; }
.pet-avatar {
  width: 64px;
  height: 64px;
  background-color: #fff7ed;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  border: 1px solid #ffedd5;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
}
.pet-info { flex: 1; overflow: hidden; }
.pet-name { font-size: 1.5rem; font-weight: 800; color: #1f2937; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pet-breed { color: #6200ea; font-size: 0.875rem; font-weight: 500; margin: 0; }

.info-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem; }
.info-box { background-color: #f9fafb; padding: 0.5rem; border-radius: 0.5rem; }
.label { font-size: 0.65rem; text-transform: uppercase; color: #9ca3af; font-weight: 700; margin: 0 0 0.25rem 0; }
.value { font-size: 1rem; font-weight: 700; color: #374151; margin: 0; }
.flex-center { display: flex; align-items: center; gap: 0.25rem; }

.status-row { 
  display: flex; justify-content: space-between; align-items: flex-end; 
  padding-bottom: 1rem; margin-bottom: 1rem; 
  border-bottom: 1px dashed #e5e7eb; 
}
.age-value { font-size: 1.25rem; font-weight: 800; color: #1f2937; line-height: 1; }
.unit { font-size: 0.875rem; font-weight: 400; color: #9ca3af; }
.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 700;
  display: inline-block;
}
.status-green { background-color: #dcfce7; color: #15803d; }
.status-orange { background-color: #ffedd5; color: #c2410c; }

.details-section { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1rem; }
.detail-item { display: flex; gap: 0.75rem; align-items: flex-start; }
.emoji { font-size: 1.25rem; line-height: 1; }
.detail-label { font-size: 0.7rem; color: #9ca3af; font-weight: 700; text-transform: uppercase; margin: 0; }
.detail-text { font-size: 0.875rem; font-weight: 500; color: #4b5563; margin: 0; }

.card-footer {
  padding-top: 1rem;
  border-top: 1px solid #f3f4f6;
  font-size: 0.75rem;
  color: #9ca3af;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.birthdate-text { color: #6b7280; font-weight: 500; }

/* 📍 ส่วนที่เพิ่มเข้ามาใหม่: CSS ของประวัติการรักษา 📍 */
.history-section {
  margin-top: 1.25rem;
  padding-top: 1.25rem;
  border-top: 2px dashed #e5e7eb; /* เส้นประคั่นเนื้อหา */
}
.history-title {
  font-size: 0.95rem;
  font-weight: 800;
  color: #374151;
  margin: 0 0 1rem 0;
}
.history-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.history-item {
  background-color: #f8fafc;
  padding: 1rem;
  border-radius: 0.75rem;
  border: 1px solid #f1f5f9;
  transition: background 0.2s;
}
.history-item:hover {
  background-color: #f1f5f9;
}
.history-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}
.history-date { 
  font-size: 0.75rem; 
  color: #64748b; 
  font-weight: 700; 
}
.history-vet { 
  font-size: 0.7rem; 
  color: #4f46e5; 
  font-weight: 700; 
  background: #e0e7ff; 
  padding: 0.2rem 0.5rem; 
  border-radius: 99px; 
}
.history-name { 
  font-size: 0.9rem; 
  font-weight: 700; 
  color: #1e293b; 
  margin: 0 0 0.25rem 0; 
}
.history-note { 
  font-size: 0.8rem; 
  color: #64748b; 
  margin: 0; 
  line-height: 1.4;
}
/* 📍 สิ้นสุด CSS ประวัติการรักษา 📍 */

/* 7. Modal Styles */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 9999;
  display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px);
}
.modal-card {
  background: white; width: 100%; max-width: 500px; border-radius: 1.5rem;
  overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); margin: 1rem;
}
.modal-header { background: #5a72ea; padding: 1.5rem; color: white; display: flex; justify-content: space-between; align-items: center; }
.modal-header h2 { margin: 0; font-size: 1.25rem; font-weight: 700; }
.close-btn { background: none; border: none; color: white; font-size: 1.5rem; cursor: pointer; }
.modal-body { padding: 1.5rem; max-height: 60vh; overflow-y: auto; display: flex; flex-direction: column; gap: 1rem; }
.form-group label { font-size: 0.875rem; font-weight: 700; color: #4b5563; margin-bottom: 0.25rem; display: block; }
.input-field {
  width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 0.5rem;
  font-size: 0.95rem; outline: none; box-sizing: border-box;
}
.input-field:focus { border-color: #6200ea; box-shadow: 0 0 0 3px rgba(98,0,234,0.1); }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.modal-footer { padding: 1.5rem; background: #f9fafb; display: flex; justify-content: flex-end; gap: 0.75rem; }
.btn-cancel { padding: 0.6rem 1.2rem; background: white; border: 1px solid #d1d5db; border-radius: 0.5rem; color: #374151; font-weight: 600; }
.btn-save { padding: 0.6rem 1.5rem; background: #6200ea; border: none; border-radius: 0.5rem; color: white; font-weight: 600; }

/* Loading */
.loading-container { text-align: center; color: white; padding-top: 5rem; }
.spinner { width: 50px; height: 50px; border: 4px solid rgba(255,255,255,0.3); border-top: 4px solid white; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

</style>