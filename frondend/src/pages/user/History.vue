<template>
  <div class="history-page">

    <div class="back-nav">
      <router-link to="/user/pets" class="btn-white">
        <span class="icon-lg">←</span>
        ย้อนกลับ
      </router-link>
    </div>

    <div class="header-container">
      <h1 class="page-title">
        <span class="icon-box">🏥</span>
        ประวัติการรักษาทั้งหมด
      </h1>
      <p class="subtitle">{{ petName ? `ของ ${petName}` : '' }}</p>
    </div>

    <div v-if="loading" class="loading-container">
      <div class="spinner"></div>
      <p>กำลังโหลดข้อมูล...</p>
    </div>

    <div v-else-if="records.length === 0" class="empty-state">
      <div class="empty-icon">📭</div>
      <h3>ยังไม่มีประวัติการรักษา</h3>
    </div>

    <div v-else class="record-list">
      <div v-for="rec in records" :key="rec.treatment_id" class="record-card">
        <div class="record-header">
          <div>
            <span class="record-id">รหัส: {{ rec.treatment_id }}</span>
            <h3 class="record-date">📅 {{ formatDate(rec.treatment_date) }}</h3>
          </div>
          <span class="record-total">฿ {{ formatPrice(rec.total_amount) }}</span>
        </div>

        <div class="record-body">
          <p><strong>👨‍⚕️ สัตวแพทย์:</strong> {{ rec.doctor_name || 'ไม่ระบุ' }}</p>
          <p><strong>📝 อาการ:</strong> {{ rec.symptom || '-' }}</p>
          <p><strong>🩺 การวินิจฉัย:</strong> {{ rec.diagnosis || '-' }}</p>
        </div>

        <div v-if="rec.details && rec.details.length" class="detail-list">
          <p class="detail-title">รายการที่ใช้:</p>
          <div v-for="d in rec.details" :key="d.service_id" class="detail-item">
            <span>{{ d.service_name || d.service_id }} × {{ d.quantity }}</span>
            <span>฿ {{ formatPrice(d.price) }}</span>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'

const route = useRoute()
const records = ref([])
const petName = ref('')
const loading = ref(false)

const formatDate = (d) => new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
const formatPrice = (val) => Number(val || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const getHeaders = () => ({
  headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
})

const loadHistory = async () => {
  loading.value = true
  try {
    const petId = route.params.petId

    // ดึงชื่อสัตว์เลี้ยงมาโชว์หัวข้อ (จากรายการสัตว์เลี้ยงของ user)
    const petsRes = await axios.get('http://localhost:3000/api/pets', getHeaders())
    const pet = petsRes.data.find(p => p.pet_id === petId)
    petName.value = pet ? pet.pet_name : ''

    const res = await axios.get(`http://localhost:3000/api/history/pet-history/${petId}`, getHeaders())
    if (res.data.success) {
      records.value = res.data.data
    }
  } catch (error) {
    console.error('Error loading history:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => loadHistory())
</script>

<style scoped>
.history-page { font-family: sans-serif; padding: 24px; max-width: 800px; margin: 0 auto; }
.back-nav { margin-bottom: 16px; }
.btn-white { display: inline-flex; align-items: center; gap: 6px; text-decoration: none; color: #374151; font-weight: 600; background: white; padding: 8px 16px; border-radius: 10px; border: 1px solid #e5e7eb; }
.header-container { margin-bottom: 24px; }
.page-title { display: flex; align-items: center; gap: 10px; font-size: 1.5rem; font-weight: 800; color: #111827; margin: 0; }
.icon-box { font-size: 1.5rem; }
.subtitle { color: #6b7280; margin: 4px 0 0 0; }

.loading-container, .empty-state { text-align: center; padding: 60px 20px; color: #6b7280; }
.spinner { width: 32px; height: 32px; border: 3px solid #e5e7eb; border-top-color: #10b981; border-radius: 50%; margin: 0 auto 12px; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.empty-icon { font-size: 40px; margin-bottom: 8px; }

.record-list { display: flex; flex-direction: column; gap: 16px; }
.record-card { background: white; border: 1px solid #f1f5f9; border-radius: 16px; padding: 20px; box-shadow: 0 2px 6px rgba(0,0,0,0.04); }
.record-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
.record-id { font-size: 0.75rem; color: #94a3b8; }
.record-date { margin: 4px 0 0 0; font-size: 1.05rem; font-weight: 700; }
.record-total { background: #ecfdf5; color: #047857; font-weight: 800; padding: 6px 14px; border-radius: 10px; font-size: 0.95rem; white-space: nowrap; }
.record-body p { margin: 4px 0; color: #374151; font-size: 0.9rem; }
.detail-list { margin-top: 12px; padding-top: 12px; border-top: 1px dashed #e5e7eb; }
.detail-title { font-size: 0.85rem; font-weight: 700; color: #64748b; margin: 0 0 6px 0; }
.detail-item { display: flex; justify-content: space-between; font-size: 0.85rem; color: #4b5563; padding: 3px 0; }
</style>
