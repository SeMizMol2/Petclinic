<template>
  <div class="history-page">
    <section class="hero-section">
      <div>
        <h1>ประวัติการรักษา</h1>
        <p class="hero-text" v-if="petName">ของ {{ petName }}</p>
      </div>
      <router-link to="/user/pets" class="back-link">กลับไปหน้าสัตว์เลี้ยง</router-link>
    </section>

    <section v-if="loading" class="state-section">กำลังโหลดข้อมูล...</section>
    <section v-else-if="records.length === 0" class="state-section">ยังไม่มีประวัติการรักษา</section>

    <section v-else class="record-list">
      <article v-for="rec in records" :key="rec.treatment_id" class="record-card">
        <div class="record-header">
          <div>
            <span class="record-id">รหัสการรักษา: {{ rec.treatment_id }}</span>
            <h2>{{ formatDate(rec.treatment_date) }}</h2>
          </div>
          <strong class="total-badge">{{ formatPrice(rec.total_amount) }} บาท</strong>
        </div>

        <div class="record-body">
          <div class="record-row">
            <span>สัตวแพทย์</span>
            <strong>{{ rec.doctor_name || rec.vet_name || 'ไม่ระบุ' }}</strong>
          </div>
          <div class="record-row">
            <span>อาการ</span>
            <strong>{{ rec.symptom || '-' }}</strong>
          </div>
          <div class="record-row">
            <span>การวินิจฉัย</span>
            <strong>{{ rec.diagnosis || '-' }}</strong>
          </div>
        </div>

        <div v-if="rec.details && rec.details.length" class="detail-box">
          <h3>รายการที่ใช้ในการรักษา</h3>
          <div v-for="detail in rec.details" :key="`${rec.treatment_id}-${detail.service_id}`" class="detail-row">
            <span>{{ detail.service_name || detail.service_id }} x {{ detail.quantity }}</span>
            <span>{{ formatPrice(detail.price) }} บาท</span>
          </div>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'

const route = useRoute()
const records = ref([])
const petName = ref('')
const loading = ref(false)

const getHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
})

const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const formatPrice = (value) => Number(value || 0).toLocaleString('th-TH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})

const loadHistory = async () => {
  loading.value = true

  try {
    const petId = route.params.petId
    const petsResponse = await axios.get('http://localhost:3000/api/pets', getHeaders())
    const pet = Array.isArray(petsResponse.data) ? petsResponse.data.find((item) => item.pet_id === petId) : null

    petName.value = pet?.pet_name || ''

    const response = await axios.get(`http://localhost:3000/api/history/pet-history/${petId}`, getHeaders())
    if (response.data?.success) {
      records.value = response.data.data || []
    }
  } catch (error) {
    console.error('loadHistory error:', error)
    alert('ไม่สามารถโหลดประวัติการรักษาได้')
  } finally {
    loading.value = false
  }
}

onMounted(loadHistory)
</script>

<style scoped>
.history-page {
  display: grid;
  gap: 20px;
}

.hero-section,
.state-section,
.record-card {
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

.hero-section h1,
.record-header h2,
.detail-box h3 {
  margin: 0;
  color: #111827;
}

.hero-text {
  margin: 10px 0 0;
  color: #4b5563;
}

.back-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 15px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  background: #ffffff;
  color: #374151;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
}

.state-section {
  padding: 36px 24px;
  text-align: center;
  color: #6b7280;
}

.record-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.record-card {
  padding: 20px;
}

.record-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: start;
  margin-bottom: 16px;
}

.record-id {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
}

.total-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 8px 12px;
  background: #ecfdf5;
  color: #047857;
  font-size: 14px;
}

.record-body {
  display: grid;
  gap: 10px;
}

.record-row {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 14px;
  padding: 12px 14px;
  background: #f8fafc;
  border-radius: 8px;
}

.record-row span {
  color: #6b7280;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
}

.record-row strong {
  color: #111827;
  line-height: 1.6;
}

.detail-box {
  margin-top: 16px;
  border-top: 1px solid #e5e7eb;
  padding-top: 16px;
}

.detail-box h3 {
  margin-bottom: 12px;
  font-size: 16px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  padding: 10px 0;
  color: #374151;
  border-bottom: 1px solid #f3f4f6;
}

.detail-row:last-child {
  border-bottom: none;
}

@media (max-width: 720px) {
  .hero-section,
  .record-header,
  .detail-row {
    flex-direction: column;
    align-items: stretch;
  }

  .record-row {
    grid-template-columns: 1fr;
  }
}
</style>
