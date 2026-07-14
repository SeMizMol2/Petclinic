<template>
  <div class="history-page">
    <section class="hero-section">
      <div>
        <p class="eyebrow">สรุปข้อมูลสัตว์เลี้ยง</p>
        <h1>สรุปประวัติสัตว์เลี้ยงรายตัว</h1>
        <p class="hero-text" v-if="summary.pet">
          ดูข้อมูลสัตว์เลี้ยง เจ้าของ นัดหมาย การรักษา วัคซีน การผ่าตัด และใบเสร็จของ
          <strong>{{ summary.pet.pet_name }}</strong>
          ได้ในหน้าเดียว
        </p>
      </div>
      <router-link to="/user/pets" class="back-link">กลับไปหน้าสัตว์เลี้ยง</router-link>
    </section>

    <section v-if="loading" class="state-section">กำลังโหลดข้อมูล...</section>
    <section v-else-if="!summary.pet" class="state-section">ไม่พบข้อมูลสัตว์เลี้ยง</section>

    <template v-else>
      <section class="summary-shell">
        <article class="profile-card">
          <div class="profile-top">
            <div class="pet-avatar">
              <img v-if="summary.pet.pet_image" :src="resolveImageUrl(summary.pet.pet_image)" alt="pet photo" />
              <AppIcon v-else :name="getPetIcon(summary.pet.pet_type)" :size="34" />
            </div>
            <div>
              <h2>{{ summary.pet.pet_name }}</h2>
              <p>{{ summary.pet.pet_type || '-' }} / {{ summary.pet.pet_breed || 'ไม่ระบุสายพันธุ์' }}</p>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-item">
              <span>เพศ</span>
              <strong>{{ summary.pet.pet_gender || '-' }}</strong>
            </div>
            <div class="info-item">
              <span>อายุ</span>
              <strong>{{ calculateAge(summary.pet.pet_birthdate) }}</strong>
            </div>
            <div class="info-item">
              <span>ลักษณะ/สี</span>
              <strong>{{ summary.pet.pet_color || '-' }}</strong>
            </div>
            <div class="info-item">
              <span>ทำหมัน</span>
              <strong>{{ summary.pet.sterile_status || '-' }}</strong>
            </div>
            <div class="info-item">
              <span>วันเกิด</span>
              <strong>{{ formatBirthdate(summary.pet.pet_birthdate) }}</strong>
            </div>
            <div class="info-item">
              <span>แพ้ยา</span>
              <strong>{{ summary.pet.drug_allergy || 'ไม่มีข้อมูล' }}</strong>
            </div>
          </div>
        </article>

        <article class="profile-card owner-card">
          <div class="owner-head">
            <div class="owner-icon">
              <AppIcon name="user" :size="24" />
            </div>
            <div>
              <h3>ข้อมูลเจ้าของ</h3>
              <p>{{ summary.owner.owner_name || '-' }}</p>
            </div>
          </div>

          <div class="owner-list">
            <div class="owner-row">
              <span>อีเมล</span>
              <strong>{{ summary.owner.owner_email || '-' }}</strong>
            </div>
            <div class="owner-row">
              <span>เบอร์โทร</span>
              <strong>{{ summary.owner.owner_tel || '-' }}</strong>
            </div>
            <div class="owner-row">
              <span>รหัสเจ้าของ</span>
              <strong>{{ summary.owner.owner_id || '-' }}</strong>
            </div>
          </div>
        </article>
      </section>

      <section class="metric-grid">
        <article class="metric-card">
          <span>นัดหมาย</span>
          <strong>{{ summary.overview.appointment_count || 0 }}</strong>
          <small>{{ formatAppointmentSummary(summary.overview.latest_appointment) }}</small>
        </article>
        <article class="metric-card">
          <span>การรักษา</span>
          <strong>{{ summary.overview.treatment_count || 0 }}</strong>
          <small>{{ formatTreatmentSummary(summary.overview.latest_treatment) }}</small>
        </article>
        <article class="metric-card">
          <span>วัคซีน</span>
          <strong>{{ summary.overview.vaccine_count || 0 }}</strong>
          <small>{{ formatVaccineSummary(summary.overview.latest_vaccine) }}</small>
        </article>
        <article class="metric-card">
          <span>ผ่าตัด</span>
          <strong>{{ summary.overview.surgery_count || 0 }}</strong>
          <small>{{ formatSurgerySummary(summary.overview.latest_surgery) }}</small>
        </article>
        <article class="metric-card">
          <span>ใบเสร็จ</span>
          <strong>{{ summary.overview.receipt_count || 0 }}</strong>
          <small>{{ formatReceiptSummary(summary.overview.latest_receipt) }}</small>
        </article>
      </section>

      <section class="timeline-grid">
        <article class="panel-card">
          <div class="panel-head">
            <h2><AppIcon name="calendar" :size="18" /> นัดหมาย</h2>
            <span>{{ summary.appointments.length }} รายการ</span>
          </div>
          <div v-if="summary.appointments.length === 0" class="empty-box">ยังไม่มีข้อมูลนัดหมาย</div>
          <div v-else class="timeline-list">
            <div v-for="item in summary.appointments" :key="item.appt_id" class="timeline-item">
              <div class="timeline-meta">
                <strong>{{ formatDate(item.appt_date) }}</strong>
                <span>{{ formatTime(item.appt_time) }}</span>
              </div>
              <p>{{ item.appt_reason || 'ไม่ได้ระบุสาเหตุการนัดหมาย' }}</p>
              <span class="tag">{{ item.appt_status || '-' }}</span>
            </div>
          </div>
        </article>

        <article class="panel-card">
          <div class="panel-head">
            <h2><AppIcon name="treatment" :size="18" /> การรักษา</h2>
            <span>{{ summary.treatments.length }} รายการ</span>
          </div>
          <div v-if="summary.treatments.length === 0" class="empty-box">ยังไม่มีประวัติการรักษา</div>
          <div v-else class="timeline-list">
            <div v-for="item in summary.treatments" :key="item.treatment_id" class="timeline-item treatment-item">
              <div class="timeline-meta">
                <strong>{{ formatDateTime(item.treatment_date) }}</strong>
                <span>{{ formatPrice(item.total_amount) }} บาท</span>
              </div>
              <p><strong>อาการ:</strong> {{ item.symptom || '-' }}</p>
              <p><strong>วินิจฉัย:</strong> {{ item.diagnosis || '-' }}</p>
              <p><strong>ผู้ดูแล:</strong> {{ item.doctor_name || 'ไม่ระบุสัตวแพทย์' }}</p>

              <div v-if="item.details?.length" class="detail-list">
                <div v-for="detail in item.details" :key="detail.detail_id" class="detail-row">
                  <span>{{ detail.service_name || detail.service_id }} x {{ detail.quantity }}</span>
                  <strong>{{ formatPrice(detail.price) }} บาท</strong>
                </div>
              </div>
            </div>
          </div>
        </article>

        <article class="panel-card">
          <div class="panel-head">
            <h2><AppIcon name="vaccine" :size="18" /> วัคซีน</h2>
            <span>{{ summary.vaccines.length }} รายการ</span>
          </div>
          <div v-if="summary.vaccines.length === 0" class="empty-box">ยังไม่มีข้อมูลวัคซีน</div>
          <div v-else class="timeline-list">
            <div v-for="item in summary.vaccines" :key="item.vac_rec_id" class="timeline-item">
              <div class="timeline-meta">
                <strong>{{ item.vaccine_name || '-' }}</strong>
                <span>{{ formatDate(item.vac_date) }}</span>
              </div>
              <p>Lot: {{ item.lot_number || '-' }}</p>
              <p>บริการ: {{ item.service_name || item.service_id || '-' }}</p>
              <p>สัตวแพทย์: {{ item.vet_name || 'ไม่ระบุ' }}</p>
            </div>
          </div>
        </article>

        <article class="panel-card">
          <div class="panel-head">
            <h2><AppIcon name="surgery" :size="18" /> การผ่าตัด</h2>
            <span>{{ summary.surgeries.length }} รายการ</span>
          </div>
          <div v-if="summary.surgeries.length === 0" class="empty-box">ยังไม่มีข้อมูลผ่าตัด</div>
          <div v-else class="timeline-list">
            <div v-for="item in summary.surgeries" :key="item.surg_id" class="timeline-item">
              <div class="timeline-meta">
                <strong>{{ item.surg_type || '-' }}</strong>
                <span>{{ formatDateTime(item.create_datetime) }}</span>
              </div>
              <p>ยาสลบ: {{ item.anesthesia || '-' }}</p>
              <p>ผลการผ่าตัด: {{ item.result || '-' }}</p>
              <p>สัตวแพทย์: {{ item.vet_name || 'ไม่ระบุ' }}</p>
            </div>
          </div>
        </article>

        <article class="panel-card full-width">
          <div class="panel-head">
            <h2><AppIcon name="receipt" :size="18" /> ใบเสร็จ</h2>
            <span>{{ summary.receipts.length }} รายการ</span>
          </div>
          <div v-if="summary.receipts.length === 0" class="empty-box">ยังไม่มีข้อมูลใบเสร็จ</div>
          <div v-else class="table-shell">
            <table class="receipt-table">
              <thead>
                <tr>
                  <th>เลขที่ใบเสร็จ</th>
                  <th>วันที่ออก</th>
                  <th>เลขที่รักษา</th>
                  <th>ยอดเงิน</th>
                  <th>สถานะ</th>
                  <th>ช่องทาง</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in summary.receipts" :key="item.receipt_id">
                  <td><strong>{{ item.receipt_id }}</strong></td>
                  <td>{{ formatDateTime(item.issue_date) }}</td>
                  <td>{{ item.treatment_id || '-' }}</td>
                  <td class="money">{{ formatPrice(item.total_amount) }}</td>
                  <td>{{ item.payment_status || '-' }}</td>
                  <td>{{ item.pay_method || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </template>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import AppIcon from '../../components/AppIcon.vue'

const route = useRoute()
const loading = ref(false)
const summary = ref({
  pet: null,
  owner: {},
  overview: {},
  appointments: [],
  treatments: [],
  vaccines: [],
  surgeries: [],
  receipts: []
})

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

const formatBirthdate = (value) => {
  if (!value) return 'ไม่ทราบวันเกิด'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'ไม่ทราบวันเกิด'
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatTime = (value) => {
  if (!value) return '-'
  const normalized = String(value).slice(0, 5)
  return normalized || '-'
}

const formatPrice = (value) =>
  Number(value || 0).toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })

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
  const petType = String(type || '').toLowerCase()
  if (petType.includes('หมา') || petType.includes('สุนัข') || petType.includes('dog')) return 'dog'
  if (petType.includes('แมว') || petType.includes('cat')) return 'cat'
  if (petType.includes('กระต่าย') || petType.includes('rabbit')) return 'rabbit'
  if (petType.includes('นก') || petType.includes('bird')) return 'bird'
  if (petType.includes('ปลา') || petType.includes('fish')) return 'fish'
  return 'paw'
}

const resolveImageUrl = (value) => {
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  return value.startsWith('/') ? value : `/${value}`
}

const formatAppointmentSummary = (item) => {
  if (!item) return 'ยังไม่มีนัดหมาย'
  return `${formatDate(item.appt_date)} ${formatTime(item.appt_time)}`
}

const formatTreatmentSummary = (item) => {
  if (!item) return 'ยังไม่มีการรักษา'
  return item.diagnosis || item.symptom || 'มีประวัติการรักษาแล้ว'
}

const formatVaccineSummary = (item) => {
  if (!item) return 'ยังไม่มีประวัติวัคซีน'
  return `${item.vaccine_name || '-'} • ${formatDate(item.vac_date)}`
}

const formatSurgerySummary = (item) => {
  if (!item) return 'ยังไม่มีประวัติผ่าตัด'
  return item.surg_type || 'มีประวัติผ่าตัด'
}

const formatReceiptSummary = (item) => {
  if (!item) return 'ยังไม่มีใบเสร็จ'
  return `${item.receipt_id} • ${formatPrice(item.total_amount)} บาท`
}

const loadSummary = async () => {
  loading.value = true
  try {
    const petId = route.params.petId
    const response = await axios.get(`http://localhost:3000/api/history/pet-summary/${petId}`, getHeaders())
    if (response.data?.success) {
      summary.value = response.data.data
    }
  } catch (error) {
    console.error('loadSummary error:', error)
    alert('ไม่สามารถโหลดข้อมูลสรุปสัตว์เลี้ยงได้')
    summary.value = {
      pet: null,
      owner: {},
      overview: {},
      appointments: [],
      treatments: [],
      vaccines: [],
      surgeries: [],
      receipts: []
    }
  } finally {
    loading.value = false
  }
}

onMounted(loadSummary)
</script>

<style scoped>
.history-page {
  display: grid;
  gap: 20px;
  width: min(1180px, 100%);
  margin: 0 auto;
}

.hero-section,
.summary-shell,
.metric-card,
.panel-card,
.state-section {
  background: #ffffff;
  border: 1px solid #dbe5f0;
  border-radius: 20px;
  box-shadow: 0 18px 45px rgba(148, 163, 184, 0.14);
}

.hero-section {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 16px;
  padding: 28px;
}

.eyebrow {
  margin: 0 0 8px;
  color: #0f766e;
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-section h1,
.profile-card h2,
.profile-card h3,
.panel-head h2 {
  margin: 0;
  color: #0f172a;
}

.hero-text {
  margin: 10px 0 0;
  max-width: 700px;
  color: #475569;
  line-height: 1.7;
}

.back-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 16px;
  border-radius: 12px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #334155;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
}

.state-section {
  padding: 36px 24px;
  text-align: center;
  color: #64748b;
}

.summary-shell {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(280px, 0.7fr);
  gap: 20px;
  padding: 22px;
}

.profile-card {
  padding: 22px;
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.98));
  border: 1px solid #e2e8f0;
}

.profile-top,
.owner-head {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 18px;
}

.pet-avatar,
.owner-icon {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #d1fae5 0%, #ccfbf1 100%);
  color: #0f766e;
  overflow: hidden;
  flex: 0 0 auto;
}

.pet-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-top p,
.owner-head p {
  margin: 6px 0 0;
  color: #64748b;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.info-item,
.owner-row {
  padding: 14px 16px;
  border-radius: 14px;
  background: #f8fbff;
  border: 1px solid #e2e8f0;
}

.info-item span,
.owner-row span,
.panel-head span {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
}

.info-item strong,
.owner-row strong {
  color: #0f172a;
  line-height: 1.5;
}

.owner-list {
  display: grid;
  gap: 12px;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(160px, 1fr));
  gap: 16px;
}

.metric-card {
  padding: 18px;
  min-height: 140px;
}

.metric-card span {
  display: block;
  margin-bottom: 10px;
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
}

.metric-card strong {
  display: block;
  color: #0f172a;
  font-size: 1.9rem;
}

.metric-card small {
  display: block;
  margin-top: 10px;
  color: #475569;
  line-height: 1.6;
}

.timeline-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.panel-card {
  padding: 20px;
  background: rgba(255, 255, 255, 0.97);
}

.full-width {
  grid-column: 1 / -1;
}

.panel-head {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.panel-head h2 {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 1.05rem;
}

.timeline-list {
  display: grid;
  gap: 12px;
}

.timeline-item {
  padding: 16px;
  border-radius: 16px;
  background: #f8fbff;
  border: 1px solid #e2e8f0;
}

.timeline-item p {
  margin: 8px 0 0;
  color: #334155;
  line-height: 1.6;
}

.timeline-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: start;
}

.timeline-meta strong {
  color: #0f172a;
}

.timeline-meta span {
  color: #64748b;
  font-size: 13px;
}

.tag {
  display: inline-flex;
  margin-top: 10px;
  padding: 6px 10px;
  border-radius: 999px;
  background: #dcfce7;
  color: #166534;
  font-size: 12px;
  font-weight: 700;
}

.detail-list {
  display: grid;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e2e8f0;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: #334155;
}

.empty-box {
  padding: 18px;
  border-radius: 14px;
  background: #f8fafc;
  color: #64748b;
  text-align: center;
}

.table-shell {
  overflow-x: auto;
}

.receipt-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 720px;
}

.receipt-table th,
.receipt-table td {
  padding: 12px 10px;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
  color: #334155;
}

.receipt-table th {
  font-size: 12px;
  font-weight: 800;
  color: #64748b;
  text-transform: uppercase;
}

.money {
  font-weight: 700;
  color: #0f766e;
}

@media (max-width: 1180px) {
  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 960px) {
  .summary-shell,
  .timeline-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .hero-section,
  .timeline-meta,
  .detail-row {
    flex-direction: column;
    align-items: stretch;
  }

  .metric-grid,
  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>

