<template>
  <div class="pets-page">
    <section class="pets-heading" aria-labelledby="pets-list-title">
      <div class="hero-copy">
        <div class="hero-title-line">
          <h1 id="pets-list-title">รายชื่อสัตว์เลี้ยง</h1>
          <span v-if="!loading" class="pet-count">{{ pets.length }} ตัว</span>
        </div>
        <p class="hero-text">ข้อมูลสำคัญและประวัติการรักษาของสัตว์เลี้ยงแต่ละตัว</p>
      </div>
      <router-link to="/user/pets/add" class="primary-link">เพิ่มสัตว์เลี้ยง</router-link>
    </section>

    <section v-if="loading" class="state-section">กำลังโหลดข้อมูลสัตว์เลี้ยง...</section>

    <section v-else-if="pets.length === 0" class="state-section empty-state">
      <h2>ยังไม่มีข้อมูลสัตว์เลี้ยง</h2>
      <p>เริ่มเพิ่มสัตว์เลี้ยงตัวแรกเพื่อเก็บประวัติการรักษา นัดหมาย และใบเสร็จ</p>
      <router-link to="/user/pets/add" class="primary-link">เพิ่มสัตว์เลี้ยงตัวแรก</router-link>
    </section>

    <template v-else>
      <section v-if="pets.length > 1" class="pet-filter-panel" aria-label="กรองสัตว์เลี้ยงตามเพศ">
        <div>
          <strong>กรองตามเพศ</strong>
          <span>แสดง {{ visiblePets.length }} จาก {{ pets.length }} ตัว</span>
        </div>
        <div class="gender-filter" role="group" aria-label="เลือกเพศสัตว์เลี้ยง">
          <button
            v-for="option in genderOptions"
            :key="option.value"
            type="button"
            :class="{ active: genderFilter === option.value }"
            :aria-pressed="genderFilter === option.value"
            @click="genderFilter = option.value"
          >
            {{ option.label }} <span>{{ option.count }}</span>
          </button>
        </div>
      </section>

      <section v-if="visiblePets.length" class="pets-grid" aria-label="รายชื่อสัตว์เลี้ยง">
      <article v-for="pet in visiblePets" :key="pet.pet_id" class="pet-card">
        <header class="pet-header">
          <div class="pet-identity">
            <button
              type="button"
              class="pet-avatar"
              :class="{ 'has-image': pet.pet_image }"
              :disabled="!pet.pet_image"
              :aria-label="pet.pet_image ? `ดูรูป ${pet.pet_name} ขนาดใหญ่` : `ยังไม่มีรูป ${pet.pet_name}`"
              @click="openPetImage(pet)"
            >
              <img
                v-if="pet.pet_image"
                :src="resolveImageUrl(pet.pet_image)"
                :alt="`รูปสัตว์เลี้ยง ${pet.pet_name}`"
              />
              <AppIcon v-else :name="getPetIcon(pet.pet_type)" :size="42" />
            </button>
            <div class="pet-title">
              <h2>{{ pet.pet_name }}</h2>
              <p>{{ pet.pet_type || 'ไม่ระบุประเภท' }} · {{ pet.pet_breed || 'ไม่ระบุสายพันธุ์' }}</p>
              <div class="pet-quickfacts">
                <span class="age-chip">อายุ {{ calculateAge(pet.pet_birthdate) }}</span>
                <span class="identity-gender" :class="genderClass(pet.pet_gender)">{{ formatPetGender(pet.pet_gender) }}</span>
              </div>
            </div>
          </div>

          <div class="pet-actions">
            <button type="button" class="ghost-btn" @click="openEdit(pet)">
              <AppIcon name="edit" :size="16" /> แก้ไข
            </button>
            <button type="button" class="danger-btn" @click="deletePet(pet.pet_id)">
              <AppIcon name="trash" :size="16" /> ลบ
            </button>
          </div>
        </header>

        <dl class="detail-grid">
          <div class="detail-item"><dt>วันเกิด</dt><dd>{{ formatPetBirthdate(pet.pet_birthdate) }}</dd></div>
          <div class="detail-item"><dt>ลักษณะ / สี</dt><dd>{{ pet.pet_color || 'ไม่ระบุ' }}</dd></div>
          <div class="detail-item">
            <dt>สถานะทำหมัน</dt>
            <dd>{{ pet.sterile_status === 'ทำแล้ว' ? 'ทำหมันแล้ว' : 'ยังไม่ได้ทำหมัน' }}</dd>
          </div>
        </dl>

        <div class="note-box" :class="{ 'has-allergy': pet.drug_allergy }">
          <span>ข้อมูลแพ้ยา</span>
          <p>{{ pet.drug_allergy || 'ไม่มีข้อมูลการแพ้ยา' }}</p>
        </div>

        <div class="history-panel">
          <div class="history-header">
            <h3>การรักษาล่าสุด</h3>
          </div>

          <div v-if="getRecentHistory(pet.pet_id).length === 0" class="history-empty">
            ยังไม่มีประวัติการรักษา
          </div>

          <div v-else class="history-list">
            <div v-for="history in getRecentHistory(pet.pet_id)" :key="history.treatment_id" class="history-item">
              <div class="history-meta">
                <span>{{ formatDateDisplay(history.treatment_date) }}</span>
                <span>{{ history.doctor_name || history.vet_name || 'ไม่ระบุสัตวแพทย์' }}</span>
              </div>
              <strong>{{ history.diagnosis || history.symptom || 'ไม่มีรายละเอียดการรักษา' }}</strong>
              <p>อาการ: {{ history.symptom || '-' }}</p>
            </div>
          </div>
        </div>
        <div class="pet-footer">
          <router-link :to="`/user/history/${pet.pet_id}`" class="history-link">
            <AppIcon name="history" :size="17" /> ดูประวัติการรักษา
          </router-link>
        </div>
      </article>
      </section>

      <section v-else class="state-section empty-filter-state">
        <h2>ไม่พบสัตว์เลี้ยงในตัวกรองนี้</h2>
        <p>ลองเลือกทุกเพศเพื่อดูสัตว์เลี้ยงทั้งหมด</p>
        <button type="button" class="secondary-btn" @click="genderFilter = 'all'">แสดงทั้งหมด</button>
      </section>
    </template>

    <Teleport to="body">
      <div v-if="showEdit" class="modal-overlay" @click.self="showEdit = false">
        <div class="modal-card">
          <div class="modal-header">
            <div>
              <h2>ข้อมูลสัตว์เลี้ยง</h2>
              <p>ปรับข้อมูลพื้นฐานของสัตว์เลี้ยงและรายละเอียดที่จำเป็นต่อการดูแล</p>
            </div>
            <button type="button" class="close-btn" @click="showEdit = false">ปิด</button>
          </div>

          <div class="modal-body">
            <div class="form-grid single">
              <label class="image-edit-field">
                <span>รูปภาพสัตว์เลี้ยง</span>
                <div class="edit-image-row">
                  <div class="edit-image-preview">
                    <img v-if="editImagePreview || editPet.pet_image" :src="editImagePreview || resolveImageUrl(editPet.pet_image)" alt="pet photo" />
                    <AppIcon v-else :name="getPetIcon(editPet.pet_type)" :size="28" />
                  </div>
                  <div class="edit-image-controls">
                    <input type="file" accept="image/*" @change="handleEditImageChange" />
                    <input v-model="editPet.pet_image" class="input-field" placeholder="URL / path รูปภาพ" />
                  </div>
                </div>
              </label>
              <label>
                <span>ชื่อสัตว์เลี้ยง</span>
                <input v-model="editPet.pet_name" class="input-field" />
              </label>
            </div>

            <div class="form-grid">
              <label>
                <span>ประเภท</span>
                <input v-model="editPet.pet_type" class="input-field" />
              </label>
              <label>
                <span>สายพันธุ์</span>
                <input v-model="editPet.pet_breed" class="input-field" />
              </label>
            </div>

            <div class="form-grid">
              <label>
                <span>เพศสัตว์</span>
                <select v-model="editPet.pet_gender" class="input-field">
                  <option value="ผู้">เพศผู้</option>
                  <option value="เมีย">เพศเมีย</option>
                </select>
              </label>
              <label>
                <span>ลักษณะ/สี</span>
                <input v-model="editPet.pet_color" class="input-field" />
              </label>
            </div>

            <div class="form-grid">
              <label>
                <span>สถานะการทำหมัน</span>
                <select v-model="editPet.sterile_status" class="input-field">
                  <option value="ทำแล้ว">ทำแล้ว</option>
                  <option value="ยังไม่ทำ">ยังไม่ทำ</option>
                </select>
              </label>
              <label>
                <span>วันเกิด</span>
                <input v-model="editPet.pet_birthdate" type="date" class="input-field" />
              </label>
            </div>

            <label class="textarea-wrap">
              <span>ประวัติแพ้ยา</span>
              <textarea v-model="editPet.drug_allergy" class="input-field" rows="3"></textarea>
            </label>
          </div>

          <div class="modal-footer">
            <button type="button" class="secondary-btn" @click="showEdit = false">ยกเลิก</button>
            <button type="button" class="primary-btn" @click="updatePet">บันทึก</button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="selectedPetImage" class="image-viewer-overlay" @click.self="closePetImage">
        <div class="image-viewer-card" role="dialog" aria-modal="true" :aria-label="`รูป ${selectedPetName}`">
          <div class="image-viewer-header">
            <strong>{{ selectedPetName }}</strong>
            <button type="button" class="close-btn" @click="closePetImage">ปิด</button>
          </div>
          <img :src="selectedPetImage" :alt="`รูปสัตว์เลี้ยง ${selectedPetName}`" />
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'
import { resolveApiAssetUrl } from '../../api'
import AppIcon from '../../components/AppIcon.vue'

const pets = ref([])
const loading = ref(false)
const showEdit = ref(false)
const editPet = ref({})
const editImageFile = ref(null)
const editImagePreview = ref('')
const historyByPet = ref({})
const selectedPetImage = ref('')
const selectedPetName = ref('')
const genderFilter = ref('all')

const normalizePetGender = (value) => {
  const gender = String(value || '').trim().toLowerCase()
  if (['ผู้', 'เพศผู้', 'male'].includes(gender)) return 'ผู้'
  if (['เมีย', 'เพศเมีย', 'female'].includes(gender)) return 'เมีย'
  return ''
}

const formatPetGender = (value, withSymbol = true) => {
  const gender = normalizePetGender(value)
  if (gender === 'ผู้') return `${withSymbol ? '♂ ' : ''}เพศผู้`
  if (gender === 'เมีย') return `${withSymbol ? '♀ ' : ''}เพศเมีย`
  return 'ไม่ระบุเพศ'
}

const genderClass = (value) => {
  const gender = normalizePetGender(value)
  return gender === 'ผู้' ? 'gender-male' : gender === 'เมีย' ? 'gender-female' : 'gender-unknown'
}

const genderCounts = computed(() => ({
  male: pets.value.filter((pet) => normalizePetGender(pet.pet_gender) === 'ผู้').length,
  female: pets.value.filter((pet) => normalizePetGender(pet.pet_gender) === 'เมีย').length
}))

const genderOptions = computed(() => [
  { value: 'all', label: 'ทุกเพศ', count: pets.value.length },
  { value: 'ผู้', label: 'เพศผู้', count: genderCounts.value.male },
  { value: 'เมีย', label: 'เพศเมีย', count: genderCounts.value.female }
])

const visiblePets = computed(() => {
  if (genderFilter.value === 'all') return pets.value
  return pets.value.filter((pet) => normalizePetGender(pet.pet_gender) === genderFilter.value)
})

const getHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
})

const formatDateDisplay = (date) => {
  if (!date) return '-'
  const parsedDate = new Date(date)
  if (Number.isNaN(parsedDate.getTime())) return '-'
  return parsedDate.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

const formatPetBirthdate = (birthdate) => {
  if (!birthdate) return 'ไม่ทราบวันเกิด'
  const parsedDate = new Date(birthdate)
  if (Number.isNaN(parsedDate.getTime())) return 'ไม่ทราบวันเกิด'
  return formatDateDisplay(birthdate)
}

const calculateAge = (birthdate) => {
  if (!birthdate) return 'ไม่ทราบอายุ'
  const birth = new Date(birthdate)
  if (Number.isNaN(birth.getTime())) return 'ไม่ทราบอายุ'

  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const monthDiff = now.getMonth() - birth.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age -= 1
  }

  return `${Math.max(age, 0)} ปี`
}

const getPetIcon = (type) => {
  const petType = (type || '').toLowerCase()
  if (petType.includes('หมา') || petType.includes('สุนัข') || petType.includes('dog')) return 'dog'
  if (petType.includes('แมว') || petType.includes('cat')) return 'cat'
  if (petType.includes('กระต่าย') || petType.includes('rabbit')) return 'rabbit'
  if (petType.includes('นก') || petType.includes('bird')) return 'bird'
  if (petType.includes('ปลา') || petType.includes('fish')) return 'fish'
  return 'paw'
}

const resolveImageUrl = (value) => {
  return resolveApiAssetUrl(value)
}

const openPetImage = (pet) => {
  if (!pet.pet_image) return
  selectedPetImage.value = resolveImageUrl(pet.pet_image)
  selectedPetName.value = pet.pet_name || 'รูปสัตว์เลี้ยง'
}

const closePetImage = () => {
  selectedPetImage.value = ''
  selectedPetName.value = ''
}

const handleEditImageChange = (event) => {
  const file = event.target.files?.[0]
  editImageFile.value = file || null

  if (editImagePreview.value) {
    URL.revokeObjectURL(editImagePreview.value)
  }

  editImagePreview.value = file ? URL.createObjectURL(file) : ''
}

const buildEditPetFormData = () => {
  const formData = new FormData()

  Object.entries({
    ...editPet.value,
    pet_birthdate: editPet.value.pet_birthdate || ''
  }).forEach(([key, value]) => {
    formData.append(key, value ?? '')
  })

  if (editImageFile.value) {
    formData.append('petImage', editImageFile.value)
  }

  return formData
}

const getRecentHistory = (petId) => (historyByPet.value[petId] || []).slice(0, 2)

const loadHistoryForPet = async (petId) => {
  try {
    const response = await axios.get(`http://localhost:3000/api/history/pet-history/${petId}`, getHeaders())
    historyByPet.value[petId] = response.data?.success ? response.data.data || [] : []
  } catch (error) {
    console.error('loadHistoryForPet error:', error)
    historyByPet.value[petId] = []
  }
}

const loadPets = async () => {
  loading.value = true
  try {
    const response = await axios.get('http://localhost:3000/api/pets', getHeaders())
    pets.value = Array.isArray(response.data) ? response.data : []
    await Promise.all(pets.value.map((pet) => loadHistoryForPet(pet.pet_id)))
  } catch (error) {
    console.error('loadPets error:', error)
    pets.value = []
    alert('ไม่สามารถโหลดข้อมูลสัตว์เลี้ยงได้')
  } finally {
    loading.value = false
  }
}

const openEdit = (pet) => {
  const petData = { ...pet }
  if (petData.pet_birthdate) {
    const parsedDate = new Date(petData.pet_birthdate)
    petData.pet_birthdate = Number.isNaN(parsedDate.getTime()) ? '' : parsedDate.toLocaleDateString('en-CA')
  }

  editPet.value = petData
  editImageFile.value = null
  editImagePreview.value = ''
  showEdit.value = true
}

const updatePet = async () => {
  try {
    await axios.put(`http://localhost:3000/api/pets/${editPet.value.pet_id}`, buildEditPetFormData(), getHeaders())
    alert('บันทึกข้อมูลสัตว์เลี้ยงเรียบร้อยแล้ว')
    showEdit.value = false
    await loadPets()
  } catch (error) {
    console.error('updatePet error:', error)
    alert(error.response?.data?.message || 'ไม่สามารถบันทึกข้อมูลสัตว์เลี้ยงได้')
  }
}

const deletePet = async (petId) => {
  if (!window.confirm('ยืนยันการลบข้อมูลสัตว์เลี้ยงรายการนี้?')) return

  try {
    await axios.delete(`http://localhost:3000/api/pets/${petId}`, getHeaders())
    alert('ลบข้อมูลสัตว์เลี้ยงเรียบร้อยแล้ว')
    await loadPets()
  } catch (error) {
    console.error('deletePet error:', error)
    alert(error.response?.data?.message || 'ไม่สามารถลบข้อมูลสัตว์เลี้ยงได้')
  }
}

onMounted(loadPets)
</script>

<style scoped>
.pets-page {
  display: grid;
  gap: 18px;
  max-width: 1180px;
  margin: 0 auto;
}

.pets-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  padding: 4px 2px 2px;
}

.state-section,
.pet-card,
.modal-card {
  background: #ffffff;
  border: 1px solid #d9e2ec;
  border-radius: 16px;
}

.hero-copy { min-width: 0; }

.hero-title-line {
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
}

.pet-count {
  color: #0f766e;
  font-size: 13px;
  font-weight: 700;
}

.pets-heading h1,
.pet-card h2,
.history-header h3,
.modal-header h2,
.empty-state h2 {
  margin: 0;
  color: #0f172a;
}

.pets-heading h1 {
  font-size: clamp(23px, 2vw, 28px);
  line-height: 1.3;
}

.hero-text {
  margin: 5px 0 0;
  max-width: 620px;
  color: #526277;
  line-height: 1.55;
}

.primary-link,
.primary-btn,
.secondary-btn,
.ghost-btn,
.danger-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-decoration: none;
  min-height: 44px;
  padding: 0 16px;
  border-radius: 12px;
  border: 1px solid transparent;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 0.18s ease, border-color 0.18s ease, color 0.18s ease;
}

.primary-link,
.primary-btn {
  background: #0f766e;
  color: #ffffff;
}

.primary-link:hover,
.primary-btn:hover { background: #0b5e57; }

.primary-link { flex: 0 0 auto; }

.secondary-btn,
.ghost-btn {
  background: #ffffff;
  color: #0f172a;
  border-color: rgba(203, 213, 225, 0.88);
}

.state-section {
  padding: 36px 24px;
  text-align: center;
  color: #475569;
}

.state-section h2 { margin: 0; color: #0f172a; }

.pet-filter-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 10px 2px 12px;
  border-bottom: 1px solid #d9e2ec;
}

.pet-filter-panel > div:first-child {
  display: grid;
  gap: 3px;
}

.pet-filter-panel > div:first-child strong {
  color: #0f172a;
  font-size: 14px;
}

.pet-filter-panel > div:first-child span {
  color: #526277;
  font-size: 12px;
}

.gender-filter {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.gender-filter button {
  min-height: 40px;
  padding: 0 12px;
  border: 1px solid #d9e2ec;
  border-radius: 999px;
  background: #ffffff;
  color: #475569;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.gender-filter button span {
  margin-left: 4px;
  color: #64748b;
}

.gender-filter button:hover {
  border-color: #94a3b8;
}

.gender-filter button:focus-visible {
  outline: 3px solid rgba(15, 118, 110, 0.18);
  outline-offset: 2px;
}

.gender-filter button.active {
  border-color: #0f766e;
  background: #0f766e;
  color: #ffffff;
}

.gender-filter button.active span {
  color: #ccfbf1;
}

.empty-filter-state {
  display: grid;
  justify-items: center;
  gap: 10px;
}

.empty-filter-state h2,
.empty-filter-state p {
  margin: 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}

.empty-state p {
  margin: 0;
  max-width: 560px;
}

.pets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 430px), 1fr));
  gap: 16px;
  align-items: start;
}

.pet-card {
  min-width: 0;
  padding: 22px;
}

.pet-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
  min-width: 0;
  margin-bottom: 18px;
}

.pet-identity {
  display: flex;
  gap: 14px;
  align-items: center;
  min-width: 0;
}

.pet-avatar {
  width: 88px;
  height: 88px;
  padding: 0;
  border: 0;
  border-radius: 14px;
  background: #e9f7f4;
  color: #0f766e;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex: 0 0 auto;
  cursor: default;
}

.pet-avatar.has-image {
  cursor: zoom-in;
}

.pet-avatar:focus-visible {
  outline: 3px solid #0f766e;
  outline-offset: 3px;
}

.pet-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pet-title { min-width: 0; }

.pet-title h2 {
  font-size: 22px;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.pet-title p {
  margin: 4px 0 0;
  color: #526277;
  font-size: 14px;
  overflow-wrap: anywhere;
}

.pet-quickfacts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.identity-gender,
.age-chip {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.age-chip { background: #f1f5f9; color: #475569; }

.gender-male {
  background: #eaf2ff;
  color: #1d4ed8;
}

.gender-female {
  background: #fdf0f6;
  color: #9d174d;
}

.gender-unknown {
  background: #f1f5f9;
  color: #475569;
}

.pet-actions {
  display: flex;
  gap: 4px;
  flex: 0 0 auto;
}

.ghost-btn {
  background: transparent;
  color: #0f766e;
  border-color: transparent;
}

.danger-btn {
  background: transparent;
  color: #b91c1c;
  border-color: transparent;
}

.secondary-btn:hover,
.ghost-btn:hover,
.danger-btn:hover,
.close-btn:hover { background: #f1f5f9; }

.pet-actions button { min-height: 40px; padding: 0 9px; font-size: 13px; }

.ghost-btn:hover { background: #e9f7f4; }
.danger-btn:hover { background: #fef2f2; }

.detail-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin: 0;
  padding: 15px 0;
  border-top: 1px solid #e3ebf1;
  border-bottom: 1px solid #e3ebf1;
}

.detail-item { min-width: 0; }

.detail-item dt,
.note-box span {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  font-weight: 700;
  color: #526277;
}

.detail-item dd {
  margin: 0;
  color: #0f172a;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.note-box {
  display: grid;
  grid-template-columns: 94px minmax(0, 1fr);
  align-items: baseline;
  gap: 8px;
  margin: 16px 0 0;
  padding: 12px 14px;
  border-radius: 10px;
  background: #f4f7fa;
}

.note-box.has-allergy {
  background: #fff7ed;
}

.note-box.has-allergy span,
.note-box.has-allergy p { color: #9a3412; }

.note-box span { margin: 0; }

.note-box p {
  color: #334155;
  margin: 0;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.history-panel {
  padding-top: 18px;
}

.history-header,
.history-meta,
.modal-header,
.modal-footer {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.history-link {
  color: #0f766e;
  font-weight: 700;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 42px;
  padding: 0 14px;
  border-radius: 10px;
  background: #e9f7f4;
}

.history-link:hover { background: #d6eee8; }

.history-empty {
  color: #64748b;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.history-item {
  padding: 10px 0;
  border-bottom: 1px solid #edf1f5;
}

.history-meta {
  margin-bottom: 8px;
  font-size: 12px;
  color: #64748b;
}

.history-item strong {
  display: block;
  margin-bottom: 6px;
  color: #0f172a;
}

.history-item p {
  margin: 0;
  color: #475569;
}

.history-header h3 { font-size: 15px; }

.pet-footer {
  display: flex;
  justify-content: flex-start;
  margin-top: 8px;
}

.pets-page :is(a, button):focus-visible {
  outline: 3px solid #0f766e;
  outline-offset: 3px;
}

.image-viewer-overlay {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.78);
}

.image-viewer-card {
  width: min(760px, 100%);
  overflow: hidden;
  border-radius: 16px;
  background: #ffffff;
}

.image-viewer-header {
  min-height: 62px;
  padding: 10px 14px 10px 20px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
}

.image-viewer-card > img {
  width: 100%;
  max-height: 76vh;
  display: block;
  object-fit: contain;
  background: #0f172a;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(4px);
}

.modal-card {
  width: min(760px, 100%);
  max-height: min(88vh, 860px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header,
.modal-footer {
  padding: 18px 20px;
}

.modal-header {
  border-bottom: 1px solid #e5edf5;
  align-items: flex-start;
}

.modal-header p {
  margin: 6px 0 0;
  color: #64748b;
  line-height: 1.55;
}

.modal-footer {
  border-top: 1px solid #e5edf5;
  justify-content: flex-end;
  flex: 0 0 auto;
  background: rgba(255, 255, 255, 0.98);
}

.modal-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 20px;
}

.close-btn {
  min-height: 40px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid rgba(203, 213, 225, 0.88);
  background: #ffffff;
  color: #0f172a;
  font-weight: 700;
  cursor: pointer;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 14px;
}

.form-grid.single,
.textarea-wrap {
  display: block;
}

.image-edit-field {
  margin-bottom: 16px;
}

.edit-image-row {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
}

.edit-image-preview {
  width: 120px;
  aspect-ratio: 1;
  border-radius: 18px;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: linear-gradient(135deg, #ecfdf5, #f0fdfa);
  color: #0f766e;
  border: 1px solid rgba(20, 184, 166, 0.16);
}

.edit-image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.edit-image-controls {
  display: grid;
  gap: 10px;
}

.edit-image-controls input[type="file"] {
  width: 100%;
  border: 1px dashed #94a3b8;
  border-radius: 14px;
  padding: 12px;
  background: #fff;
  color: #334155;
}

.modal-body label,
.textarea-wrap {
  display: grid;
  gap: 8px;
}

.input-field {
  width: 100%;
  min-height: 48px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(203, 213, 225, 0.9);
  background: #ffffff;
  color: #0f172a;
  font: inherit;
  box-sizing: border-box;
  outline: none;
}

.input-field:focus {
  border-color: rgba(20, 184, 166, 0.65);
  box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.12);
}

textarea.input-field {
  min-height: 108px;
  resize: vertical;
}

@media (max-width: 720px) {
  .pet-filter-panel,
  .modal-header,
  .modal-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .pets-heading { gap: 12px; }
  .pets-heading h1 { font-size: 22px; }
  .pets-heading .hero-text { display: none; }
  .pets-heading .primary-link { min-height: 40px; padding: 0 12px; }
  .pet-filter-panel { padding-top: 2px; }
  .pet-filter-panel > div:first-child { display: none; }

  .gender-filter {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .gender-filter button {
    padding: 0 8px;
  }

  .form-grid,
  .edit-image-row {
    grid-template-columns: 1fr;
  }

  .edit-image-preview {
    width: 104px;
  }

  .pet-card {
    padding: 16px;
  }

  .pet-header {
    flex-direction: column;
    gap: 12px;
    margin-bottom: 14px;
  }

  .pet-avatar {
    width: 72px;
    height: 72px;
    border-radius: 12px;
  }

  .pet-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .detail-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px 16px;
  }

  .note-box {
    grid-template-columns: 1fr;
    gap: 2px;
  }

  .history-meta {
    flex-wrap: wrap;
    gap: 2px 10px;
  }

  .pet-footer .history-link {
    width: 100%;
  }

  .image-viewer-overlay {
    padding: 12px;
  }

  .image-viewer-card > img {
    max-height: 70vh;
  }
}

@media (max-width: 400px) {
  .pet-identity { gap: 10px; }
  .pet-title h2 { font-size: 20px; }
  .pet-quickfacts { margin-top: 7px; }
  .gender-filter button { font-size: 12px; }
  .detail-grid { grid-template-columns: 1fr 1fr; }
  .detail-item:last-child { grid-column: 1 / -1; }
}

@media (prefers-reduced-motion: reduce) {
  .pets-page :is(a, button) {
    transition: none;
  }
}
</style>
