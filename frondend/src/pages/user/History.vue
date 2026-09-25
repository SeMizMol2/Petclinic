<template>
  <div class="history-page" :class="{ 'owner-history': !isAdminView }">
    <section v-if="isAdminView" class="hero-section">
      <div>
        <p class="eyebrow">รายงานจากข้อมูลเดิมในระบบ</p>
        <h1>สรุปประวัติสัตว์เลี้ยงรายตัว</h1>
        <p class="hero-text" v-if="summary.pet">
          ดูข้อมูลสัตว์เลี้ยง เจ้าของ นัดหมาย การรักษา วัคซีน การผ่าตัด และใบเสร็จของ
          <strong>{{ summary.pet.pet_name }}</strong>
          ได้ในหน้าเดียว โดยไม่ต้องบันทึกข้อมูลใหม่
        </p>
      </div>
      <router-link :to="backTarget" class="back-link">{{ backLabel }}</router-link>
    </section>

    <section v-else class="owner-intro">
      <div>
        <h1>แฟ้มสุขภาพ</h1>
        <p v-if="summary.pet">ข้อมูลสุขภาพและประวัติการดูแลของ {{ summary.pet.pet_name }}</p>
      </div>
      <router-link :to="backTarget" class="back-link">{{ backLabel }}</router-link>
    </section>

    <section v-if="loading" class="state-section">กำลังโหลดข้อมูล...</section>
    <section v-else-if="!summary.pet" class="state-section">
      <h2>ไม่พบข้อมูลสัตว์เลี้ยง</h2>
      <p v-if="!isAdminView">ลองกลับไปเลือกสัตว์เลี้ยงจากหน้ารายชื่ออีกครั้ง</p>
      <router-link v-if="!isAdminView" :to="backTarget" class="back-link">{{ backLabel }}</router-link>
    </section>

    <template v-else>
      <section class="summary-shell">
        <article class="profile-card">
          <div class="profile-top">
            <div class="pet-avatar">
              <img v-if="summary.pet.pet_image" :src="resolveImageUrl(summary.pet.pet_image)" :alt="`รูป ${summary.pet.pet_name}`" />
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
              <strong>{{ formatPetGender(summary.pet.pet_gender) }}</strong>
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
            <div v-if="isAdminView" class="info-item">
              <span>แพ้ยา</span>
              <strong>{{ summary.pet.drug_allergy || 'ไม่มีข้อมูล' }}</strong>
            </div>
          </div>
          <div v-if="!isAdminView" class="allergy-notice" :class="{ 'has-allergy': summary.pet.drug_allergy }">
            <strong>ข้อมูลแพ้ยา</strong>
            <p>{{ summary.pet.drug_allergy || 'ไม่มีข้อมูลการแพ้ยา' }}</p>
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
        <article class="metric-card" :class="{ 'is-empty': !summary.overview.appointment_count }">
          <span>นัดหมาย</span>
          <strong>{{ summary.overview.appointment_count || 0 }}</strong>
          <small>{{ formatAppointmentSummary(summary.overview.latest_appointment) }}</small>
        </article>
        <article class="metric-card" :class="{ 'is-empty': !summary.overview.treatment_count }">
          <span>การรักษา</span>
          <strong>{{ summary.overview.treatment_count || 0 }}</strong>
          <small>{{ formatTreatmentSummary(summary.overview.latest_treatment) }}</small>
        </article>
        <article class="metric-card" :class="{ 'is-empty': !summary.overview.vaccine_count }">
          <span>วัคซีน</span>
          <strong>{{ summary.overview.vaccine_count || 0 }}</strong>
          <small>{{ formatVaccineSummary(summary.overview.latest_vaccine) }}</small>
        </article>
        <article class="metric-card" :class="{ 'is-empty': !summary.overview.surgery_count }">
          <span>ผ่าตัด</span>
          <strong>{{ summary.overview.surgery_count || 0 }}</strong>
          <small>{{ formatSurgerySummary(summary.overview.latest_surgery) }}</small>
        </article>
        <article class="metric-card" :class="{ 'is-empty': !summary.overview.receipt_count }">
          <span>ใบเสร็จ</span>
          <strong>{{ summary.overview.receipt_count || 0 }}</strong>
          <small>{{ formatReceiptSummary(summary.overview.latest_receipt) }}</small>
        </article>
      </section>

      <nav v-if="!isAdminView" class="history-nav" aria-label="ข้ามไปยังหมวดประวัติ">
        <a href="#history-treatments">การรักษา</a>
        <a href="#history-appointments">นัดหมาย</a>
        <a href="#history-vaccines">วัคซีน</a>
        <a href="#history-surgeries">ผ่าตัด</a>
        <a href="#history-receipts">ใบเสร็จ</a>
      </nav>

      <section class="timeline-grid">
        <article :id="!isAdminView ? 'history-appointments' : undefined" class="panel-card">
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
              <span class="tag" :class="!isAdminView ? appointmentTagClass(item.appt_status) : ''">{{ item.appt_status || '-' }}</span>
            </div>
          </div>
        </article>

        <article :id="!isAdminView ? 'history-treatments' : undefined" class="panel-card treatment-panel">
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

        <article :id="!isAdminView ? 'history-vaccines' : undefined" class="panel-card">
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

        <article :id="!isAdminView ? 'history-surgeries' : undefined" class="panel-card">
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

        <article :id="!isAdminView ? 'history-receipts' : undefined" class="panel-card full-width">
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
                  <td data-label="เลขที่ใบเสร็จ"><strong>{{ item.receipt_id }}</strong></td>
                  <td data-label="วันที่ออก">{{ formatDateTime(item.issue_date) }}</td>
                  <td data-label="เลขที่รักษา">{{ item.treatment_id || '-' }}</td>
                  <td data-label="ยอดเงิน" class="money">{{ formatPrice(item.total_amount) }}</td>
                  <td data-label="สถานะ">{{ item.payment_status || '-' }}</td>
                  <td data-label="ช่องทาง">{{ item.pay_method || '-' }}</td>
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
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import { resolveApiAssetUrl } from '../../api'
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

const formatPetGender = (value) => {
  const gender = String(value || '').trim().toLowerCase()
  if (['ผู้', 'เพศผู้', 'male'].includes(gender)) return 'เพศผู้'
  if (['เมีย', 'เพศเมีย', 'female'].includes(gender)) return 'เพศเมีย'
  return 'ไม่ระบุเพศ'
}

const isAdminView = computed(() => route.path.startsWith('/admin/'))
const backTarget = computed(() => (isAdminView.value ? '/admin/pets' : '/user/pets'))
const backLabel = computed(() => (isAdminView.value ? 'กลับไปหน้าจัดการสัตว์เลี้ยง' : 'กลับไปหน้าสัตว์เลี้ยง'))

const appointmentTagClass = (status) => {
  if (['ยกเลิก', 'ไม่มาตามนัด'].includes(status)) return 'tag-muted'
  if (['รอ', 'รอคลินิกยืนยัน'].includes(status)) return 'tag-waiting'
  return 'tag-success'
}

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
  return resolveApiAssetUrl(value)
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

/* Owner view: keep the shared admin report intact while giving the pet owner a calmer record. */
.owner-history {
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  gap: 18px;
}

.owner-history .owner-intro {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-width: 0;
  padding: 4px 2px 2px;
}

.owner-history .owner-intro h1 {
  margin: 0;
  color: #0f172a;
  font-size: clamp(23px, 2vw, 28px);
  line-height: 1.3;
}

.owner-history .owner-intro p {
  margin: 5px 0 0;
  color: #526277;
  line-height: 1.55;
}

.owner-history .back-link {
  flex: 0 0 auto;
  min-height: 42px;
  padding: 0 14px;
  box-sizing: border-box;
}

.owner-history .back-link:hover {
  border-color: #0f766e;
  color: #0f766e;
}

.owner-history :is(a, button):focus-visible {
  outline: 3px solid #0f766e;
  outline-offset: 3px;
}

.owner-history .state-section {
  display: grid;
  justify-items: center;
  gap: 10px;
  border-radius: 16px;
  box-shadow: none;
}

.owner-history .state-section h2,
.owner-history .state-section p { margin: 0; }

.owner-history .summary-shell {
  grid-template-columns: minmax(0, 1.5fr) minmax(280px, 0.7fr);
  gap: 16px;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
}

.owner-history .profile-card {
  min-width: 0;
  padding: 22px;
  border: 1px solid #d9e2ec;
  border-radius: 16px;
  background: #ffffff;
}

.owner-history .profile-top {
  margin-bottom: 16px;
}

.owner-history .profile-top h2 {
  font-size: 22px;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.owner-history .pet-avatar {
  width: 76px;
  height: 76px;
  border-radius: 14px;
  background: #e9f7f4;
}

.owner-history .owner-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: #e9f7f4;
}

.owner-history .owner-head { margin-bottom: 14px; }
.owner-history .owner-head h3 { font-size: 17px; }

.owner-history .info-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px 16px;
}

.owner-history .info-item,
.owner-history .owner-row {
  min-width: 0;
  padding: 10px 0;
  border: 0;
  border-top: 1px solid #e5edf5;
  border-radius: 0;
  background: transparent;
}

.owner-history .owner-list { gap: 0; }
.owner-history .info-item span,
.owner-history .owner-row span {
  margin-bottom: 3px;
  color: #526277;
  text-transform: none;
}

.owner-history .info-item strong,
.owner-history .owner-row strong {
  display: block;
  font-size: 14px;
  overflow-wrap: anywhere;
}

.owner-history .allergy-notice {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  gap: 8px;
  align-items: baseline;
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 10px;
  background: #f4f7fa;
  color: #334155;
}

.owner-history .allergy-notice.has-allergy {
  background: #fff7ed;
  color: #9a3412;
}

.owner-history .allergy-notice strong { font-size: 13px; }
.owner-history .allergy-notice p {
  margin: 0;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.owner-history .metric-grid {
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 1px;
  overflow: hidden;
  border: 1px solid #d9e2ec;
  border-radius: 16px;
  background: #e5edf5;
}

.owner-history .metric-card {
  min-width: 0;
  min-height: 0;
  padding: 15px 18px;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  background: #ffffff;
}

.owner-history .metric-card span {
  margin-bottom: 6px;
  color: #526277;
  text-transform: none;
}
.owner-history .metric-card strong {
  font-size: 24px;
  line-height: 1.1;
}
.owner-history .metric-card small {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.4;
}
.owner-history .metric-card.is-empty strong { color: #64748b; }

.owner-history .history-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding-bottom: 10px;
  border-bottom: 1px solid #d9e2ec;
}

.owner-history .history-nav a {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  padding: 0 12px;
  border-radius: 10px;
  color: #0f766e;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
}

.owner-history .history-nav a:hover { background: #e9f7f4; }

.owner-history .timeline-grid {
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
}

.owner-history .panel-card {
  min-width: 0;
  padding: 22px;
  border: 1px solid #d9e2ec;
  border-radius: 16px !important;
  box-shadow: none !important;
  background: #ffffff;
  scroll-margin-top: 22px;
}

.owner-history .panel-head {
  align-items: center;
  margin-bottom: 6px;
}
.owner-history .panel-head h2 { font-size: 17px; }
.owner-history .panel-head span {
  margin: 0;
  color: #526277;
  text-transform: none;
}

.owner-history .timeline-list { gap: 0; }
.owner-history .timeline-item {
  min-width: 0;
  padding: 16px 0;
  border: 0;
  border-bottom: 1px solid #e5edf5;
  border-radius: 0;
  background: transparent;
}
.owner-history .timeline-item:last-child { border-bottom: 0; }
.owner-history .timeline-item p { margin-top: 6px; }
.owner-history .timeline-meta { flex-wrap: wrap; }
.owner-history .timeline-meta span { color: #526277; }
.owner-history .detail-list { border-color: #e5edf5; }
.owner-history .empty-box {
  padding: 14px 0 4px;
  border-radius: 0;
  background: transparent;
  color: #526277;
  text-align: left;
}
.owner-history .tag.tag-waiting { background: #fff3d6; color: #92400e; }
.owner-history .tag.tag-muted { background: #f1f5f9; color: #475569; }

@media (max-width: 1180px) {
  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .owner-history .metric-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 960px) {
  .summary-shell,
  .timeline-grid {
    grid-template-columns: 1fr;
  }

  .owner-history .summary-shell {
    grid-template-columns: minmax(0, 1fr);
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

  .owner-history .owner-intro {
    align-items: flex-start;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 8px 12px;
  }

  .owner-history .owner-intro > div { flex: 1 1 165px; }
  .owner-history .owner-intro h1 { font-size: 22px; }
  .owner-history .owner-intro p { font-size: 14px; }
  .owner-history .owner-intro .back-link { padding: 8px 10px; font-size: 12px; }
  .owner-history .profile-card,
  .owner-history .panel-card { padding: 18px; }
  .owner-history .info-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .owner-history .allergy-notice { grid-template-columns: 1fr; gap: 3px; }
  .owner-history .metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .owner-history .metric-card { padding: 12px 14px; }
  .owner-history .history-nav { flex-wrap: nowrap; overflow-x: auto; }
  .owner-history .history-nav a { flex: 0 0 auto; }
  .owner-history .timeline-meta,
  .owner-history .detail-row { flex-direction: row; align-items: flex-start; }
  .owner-history .timeline-meta { flex-wrap: wrap; }

  .owner-history .receipt-table,
  .owner-history .receipt-table tbody,
  .owner-history .receipt-table tr { display: block; width: 100%; min-width: 0; }
  .owner-history .receipt-table thead {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  .owner-history .receipt-table tr {
    padding: 10px 0;
    border-bottom: 1px solid #e5edf5;
  }
  .owner-history .receipt-table td {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 5px 0;
    border: 0;
    text-align: right;
    overflow-wrap: anywhere;
  }
  .owner-history .receipt-table td::before {
    content: attr(data-label);
    flex: 0 0 42%;
    color: #526277;
    font-size: 12px;
    font-weight: 700;
    text-align: left;
  }
}
</style>

