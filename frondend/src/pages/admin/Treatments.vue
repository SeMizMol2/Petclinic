<template>
  <div class="admin-page treatments-admin-page">
    <section class="page-header">
      <div>
        <p class="eyebrow">Treatment records</p>
        <h1>บันทึกการรักษา</h1>
        <p class="subtitle">บันทึกอาการ วินิจฉัยโรค และจัดการรายการค่ารักษา</p>
      </div>
      <button @click="openAddModal" class="primary-btn">เพิ่มการรักษาใหม่</button>
    </section>

    <section class="table-panel">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>รหัสการรักษา</th>
              <th>วันที่รักษา</th>
              <th>สัตว์เลี้ยง</th>
              <th>สัตวแพทย์</th>
              <th>การวินิจฉัย</th>
              <th class="right">ยอดรวม</th>
              <th>ใบเสร็จ</th>
              <th class="center">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in treatments" :key="t.treatment_id">
              <td>
                <strong>{{ t.treatment_id }}</strong>
              </td>
              <td>{{ formatDateTime(t.treatment_date) }}</td>
              <td>
                {{ t.pet_name }}
                <br />
                <span class="muted">คุณ{{ t.owner_name }}</span>
              </td>
              <td>{{ t.vet_name || t.doctor_name || '-' }}</td>
              <td>{{ t.diagnosis || '-' }}</td>
              <td class="right amount">{{ formatPrice(t.total_amount) }}</td>
              <td>
                <button
                  v-if="t.receipt_id"
                  class="receipt-link"
                  type="button"
                  @click="viewReceipt(t.receipt_id)"
                >
                  {{ t.receipt_id }}
                  <span :class="['receipt-state', isReceiptPaid(t) ? 'paid' : 'unpaid']">
                    {{ isReceiptPaid(t) ? 'ชำระแล้ว' : 'ค้างชำระ' }}
                  </span>
                </button>
                <button v-else class="ghost-btn mini-btn" type="button" @click="openReceiptIssueModal(t)">
                  ออกใบเสร็จ
                </button>
              </td>
              <td class="center">
                <div class="row-actions">
                  <button class="ghost-btn mini-btn" @click="openEditModal(t.treatment_id)">แก้ไข</button>
                  <button class="followup-btn mini-btn" @click="openFollowUpModal(t)">นัดติดตาม</button>
                  <button class="danger-btn mini-btn" @click="deleteTreatment(t)">ลบ</button>
                </div>
              </td>
            </tr>
            <tr v-if="treatments.length === 0">
              <td colspan="8" class="state">ยังไม่มีประวัติการรักษา</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div v-if="isModalOpen" class="modal-overlay" @click.self="closeModal">
      <div class="modal treatment-modal">
        <div class="modal-head">
          <div>
            <h2>{{ isEditing ? 'แก้ไขการรักษา' : 'บันทึกการรักษาใหม่' }}</h2>
            <p>บันทึกข้อมูลสัตว์เลี้ยง อาการ วินิจฉัย และรายการค่ารักษา</p>
          </div>
          <button @click="closeModal" class="close-btn">ปิด</button>
        </div>

        <div class="form-layout">
          <div class="form-grid left-panel">
            <label class="full-width">
              <span>เลือกสัตว์เลี้ยง *</span>
              <select v-model="form.pet_id" :disabled="isFinancialLocked" required>
                <option value="" disabled>-- กรุณาเลือกสัตว์เลี้ยง --</option>
                <option v-for="p in petsList" :key="p.pet_id" :value="p.pet_id">
                  {{ p.pet_name }} (คุณ{{ p.owner_name }}) · {{ p.pet_type || 'ไม่ระบุประเภท' }} / {{ p.pet_gender || 'ไม่ระบุเพศ' }}
                </option>
              </select>
              <small v-if="selectedPet" class="pet-context">
                กำลังเลือกบริการสำหรับ {{ selectedPet.pet_name }} · {{ selectedPet.pet_type || 'ไม่ระบุประเภท' }} · {{ selectedPet.pet_gender || 'ไม่ระบุเพศ' }}
              </small>
            </label>

            <section v-if="form.pet_id" class="clinical-context full-width" aria-live="polite">
              <div v-if="isPetSummaryLoading" class="clinical-state">กำลังโหลดข้อมูลสุขภาพสัตว์เลี้ยง...</div>
              <div v-else-if="petSummaryError" class="clinical-state error">{{ petSummaryError }}</div>
              <template v-else-if="selectedPetSummary">
                <div class="clinical-head">
                  <div class="clinical-pet">
                    <img
                      v-if="selectedPetSummary.pet.pet_image"
                      :src="resolveApiAssetUrl(selectedPetSummary.pet.pet_image)"
                      :alt="`รูป ${selectedPetSummary.pet.pet_name}`"
                    />
                    <span v-else class="clinical-avatar">{{ getPetInitial(selectedPetSummary.pet.pet_name) }}</span>
                    <div>
                      <span class="clinical-kicker">ข้อมูลก่อนการรักษา</span>
                      <strong>{{ selectedPetSummary.pet.pet_name }}</strong>
                      <small>เจ้าของ คุณ{{ selectedPetSummary.owner.owner_name || '-' }}</small>
                    </div>
                  </div>
                  <span :class="['allergy-badge', { danger: hasDrugAllergy }]">
                    {{ hasDrugAllergy ? 'มีประวัติแพ้ยา' : 'ไม่พบประวัติแพ้ยา' }}
                  </span>
                </div>

                <div class="clinical-facts">
                  <div><span>ประเภท / เพศ</span><strong>{{ selectedPetSummary.pet.pet_type || '-' }} / {{ selectedPetSummary.pet.pet_gender || '-' }}</strong></div>
                  <div><span>อายุ</span><strong>{{ formatPetAge(selectedPetSummary.pet.pet_birthdate) }}</strong></div>
                  <div><span>สายพันธุ์</span><strong>{{ selectedPetSummary.pet.pet_breed || 'ไม่ระบุ' }}</strong></div>
                  <div><span>ทำหมัน</span><strong>{{ selectedPetSummary.pet.sterile_status || 'ไม่ระบุ' }}</strong></div>
                </div>

                <div :class="['allergy-notice', { danger: hasDrugAllergy }]">
                  <span>ประวัติแพ้ยา</span>
                  <strong>{{ selectedPetSummary.pet.drug_allergy || 'ไม่มีข้อมูลการแพ้ยา' }}</strong>
                </div>

                <div class="clinical-counts">
                  <span>รักษา <strong>{{ selectedPetSummary.overview.treatment_count || 0 }}</strong></span>
                  <span>วัคซีน <strong>{{ selectedPetSummary.overview.vaccine_count || 0 }}</strong></span>
                  <span>ผ่าตัด <strong>{{ selectedPetSummary.overview.surgery_count || 0 }}</strong></span>
                  <span>นัดหมาย <strong>{{ selectedPetSummary.overview.appointment_count || 0 }}</strong></span>
                </div>

                <div class="recent-treatment-list">
                  <div class="recent-treatment-head">
                    <strong>การรักษาล่าสุด</strong>
                    <button type="button" class="history-link" @click="viewPetHistory(form.pet_id)">ดูประวัติทั้งหมด</button>
                  </div>
                  <article v-for="item in recentPetTreatments" :key="item.treatment_id">
                    <time>{{ formatShortDate(item.treatment_date) }}</time>
                    <div>
                      <strong>{{ item.diagnosis || 'ยังไม่ระบุคำวินิจฉัย' }}</strong>
                      <span>{{ item.symptom || 'ไม่ระบุอาการ' }} · {{ item.doctor_name || 'ไม่ระบุสัตวแพทย์' }}</span>
                    </div>
                  </article>
                  <p v-if="recentPetTreatments.length === 0" class="no-history">ยังไม่มีประวัติการรักษา</p>
                </div>
              </template>
            </section>

            <label class="full-width">
              <span>สัตวแพทย์</span>
              <select v-model="form.vet_id">
                <option value="">-- เลือกสัตวแพทย์ --</option>
                <option v-for="vet in vetsList" :key="vet.vet_id" :value="vet.vet_id">
                  {{ vet.vet_name }}
                </option>
              </select>
            </label>

            <label class="full-width">
              <span>อาการเบื้องต้น</span>
              <textarea v-model="form.symptom" rows="3"></textarea>
            </label>

            <label class="full-width">
              <span>การวินิจฉัยโรค</span>
              <textarea v-model="form.diagnosis" rows="3"></textarea>
            </label>
          </div>

          <div class="service-panel">
            <label class="service-label">รายการบริการ / ค่ารักษา</label>
            <div v-if="isFinancialLocked" class="financial-notice locked">
              <strong>ใบเสร็จ {{ form.receipt_id }} ชำระแล้ว</strong>
              <span>ยอดเงินและรายการบริการถูกล็อก แต่ยังแก้สัตวแพทย์ อาการ และคำวินิจฉัยได้</span>
            </div>
            <div v-else-if="isEditing && form.receipt_id" class="financial-notice syncing">
              <strong>ใบเสร็จ {{ form.receipt_id }} ยังไม่ได้ชำระ</strong>
              <span>เมื่อแก้บริการ จำนวน หรือราคา ระบบจะอัปเดตยอดในใบเสร็จให้อัตโนมัติ</span>
            </div>
            <div class="service-add">
              <select v-model="selectedServiceId" class="service-select" :disabled="isFinancialLocked || !form.pet_id">
                <option value="" disabled>{{ form.pet_id ? '-- เลือกบริการที่ใช้ได้ --' : '-- เลือกสัตว์เลี้ยงก่อน --' }}</option>
                <option v-for="s in availableServicesList" :key="s.service_id" :value="s.service_id">
                  {{ s.service_name }} ({{ formatPrice(s.service_price) }} บาท)
                </option>
              </select>
              <button type="button" @click="addServiceItem" class="primary-btn small-btn" :disabled="isFinancialLocked || !selectedServiceId">เพิ่ม</button>
            </div>
            <p v-if="selectedPet && availableServicesList.length === 0" class="service-message">
              ยังไม่มีบริการที่กำหนดไว้สำหรับประเภทและเพศของสัตว์ตัวนี้
            </p>
            <p v-if="!isFinancialLocked && incompatibleSelectedServices.length > 0" class="service-message error">
              รายการที่ไม่ตรงกับสัตว์ที่เลือก: {{ incompatibleSelectedServices.map((item) => item.service_name).join(', ') }}
              กรุณาลบรายการเหล่านี้ก่อนบันทึก
            </p>

            <div class="selected-items-box">
              <div v-for="(item, index) in form.services" :key="`${item.service_id}-${index}`" class="item-row">
                <div class="item-main">
                  <div class="item-name">{{ item.service_name }}</div>
                  <div class="item-price-row">
                    <span>ราคา</span>
                    <input type="number" v-model.number="item.price" min="0" step="0.5" class="price-edit-input" :disabled="isFinancialLocked" />
                    <span>บาท</span>
                  </div>
                </div>
                <input type="number" v-model.number="item.quantity" min="1" class="qty-input" :disabled="isFinancialLocked" />
                <div class="item-total">{{ formatPrice(item.price * item.quantity) }}</div>
                <button @click="removeServiceItem(index)" class="danger-btn remove-btn" type="button" :disabled="isFinancialLocked">ลบ</button>
              </div>
              <div v-if="form.services.length === 0" class="empty-services">ยังไม่มีรายการค่ารักษา</div>
            </div>

            <div class="total-box">
              <span>ยอดรวมทั้งหมด</span>
              <span class="total-amount">{{ formatPrice(totalAmount) }} บาท</span>
            </div>

            <div v-if="!isEditing" class="receipt-options">
              <div class="receipt-options-head">
                <strong>ออกใบเสร็จหลังบันทึก</strong>
                <span>ระบบจะใช้ยอดรวมด้านบนสร้างใบเสร็จให้ทันที</span>
              </div>
              <div class="receipt-options-grid">
                <label>
                  <span>ช่องทางชำระ</span>
                  <select v-model="form.pay_method">
                    <option :value="cashMethod">เงินสด</option>
                    <option :value="transferMethod">โอนเงิน</option>
                  </select>
                </label>
                <label>
                  <span>สถานะการชำระ</span>
                  <select v-model="form.payment_status">
                    <option :value="unpaidStatus">ค้างชำระ</option>
                    <option :value="paidStatus">ชำระแล้ว</option>
                  </select>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="closeModal" class="ghost-btn" type="button">ยกเลิก</button>
          <button @click="submitTreatment" :disabled="isSubmitting || !form.pet_id || (!isFinancialLocked && incompatibleSelectedServices.length > 0)" class="primary-btn" type="button">
            {{ isSubmitting ? 'กำลังบันทึก...' : isFinancialLocked ? 'บันทึกข้อมูลการรักษา' : isEditing ? 'บันทึกการแก้ไข' : 'บันทึกการรักษาและออกใบเสร็จ' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="receiptIssueTarget" class="modal-overlay" @click.self="closeReceiptIssueModal">
      <section class="modal receipt-issue-modal" role="dialog" aria-modal="true" aria-labelledby="receipt-issue-title">
        <div class="modal-head">
          <div>
            <p class="eyebrow">Receipt</p>
            <h2 id="receipt-issue-title">ออกใบเสร็จจากการรักษา</h2>
            <p>
              รหัส {{ receiptIssueTarget.treatment_id }} · {{ receiptIssueTarget.pet_name }}
              · ยอด {{ formatPrice(receiptIssueTarget.total_amount) }} บาท
            </p>
          </div>
          <button class="close-btn" type="button" @click="closeReceiptIssueModal">ปิด</button>
        </div>

        <div class="receipt-options-grid standalone">
          <label>
            <span>ช่องทางชำระ</span>
            <select v-model="receiptIssuePayMethod">
              <option :value="cashMethod">เงินสด</option>
              <option :value="transferMethod">โอนเงิน</option>
            </select>
          </label>
          <label>
            <span>สถานะการชำระ</span>
            <select v-model="receiptIssueStatus">
              <option :value="unpaidStatus">ค้างชำระ</option>
              <option :value="paidStatus">ชำระแล้ว</option>
            </select>
          </label>
        </div>

        <div class="modal-actions">
          <button class="ghost-btn" type="button" @click="closeReceiptIssueModal">ยกเลิก</button>
          <button class="primary-btn" type="button" :disabled="isIssuingReceipt" @click="issueLegacyReceipt">
            {{ isIssuingReceipt ? 'กำลังออกใบเสร็จ...' : 'ยืนยันออกใบเสร็จ' }}
          </button>
        </div>
      </section>
    </div>

    <div v-if="followUpTarget" class="modal-overlay" @click.self="dismissFollowUpModal">
      <section class="modal followup-appointment-modal" role="dialog" aria-modal="true" aria-labelledby="appointment-followup-title">
        <div class="modal-head">
          <div>
            <p class="eyebrow">Follow-up appointment</p>
            <h2 id="appointment-followup-title">นัดติดตามผลการรักษา</h2>
            <p>
              {{ followUpTarget.pet_name || 'สัตว์เลี้ยง' }}
              · การรักษา {{ followUpTarget.treatment_id }}
            </p>
          </div>
          <button @click="dismissFollowUpModal" class="close-btn" type="button">ปิด</button>
        </div>

        <div class="followup-appointment-grid">
          <label>
            <span>สัตวแพทย์ *</span>
            <select v-model="followUpForm.vet_id" required>
              <option value="" disabled>-- เลือกสัตวแพทย์ --</option>
              <option v-for="vet in vetsList" :key="vet.vet_id" :value="vet.vet_id">
                {{ vet.vet_name }}
              </option>
            </select>
          </label>

          <label>
            <span>วันที่ติดตามผล *</span>
            <input v-model="followUpForm.appt_date" type="date" :min="todayInputValue()" required />
          </label>

          <label>
            <span>เวลานัดหมาย *</span>
            <input v-model="followUpForm.appt_time" type="time" required />
          </label>

          <div :class="['schedule-context', followUpScheduleStateClass]">
            <strong>ตารางเวรสัตวแพทย์</strong>
            <span>{{ followUpScheduleText }}</span>
          </div>

          <label class="full-width">
            <span>เหตุผลการติดตาม *</span>
            <textarea
              v-model.trim="followUpForm.appt_reason"
              rows="3"
              maxlength="500"
              placeholder="เช่น ตรวจแผลและประเมินอาการหลังการรักษา"
              required
            ></textarea>
          </label>
        </div>

        <p class="followup-help">
          นัดหมายที่สร้างจะอยู่ในสถานะ “รอเจ้าของยืนยัน” และระบบจะใช้การแจ้งอีเมลเดิมของการนัดหมาย
        </p>

        <div class="modal-actions">
          <button @click="dismissFollowUpModal" class="ghost-btn" type="button">
            {{ followUpTarget.fromPostSave ? 'ไม่ต้องติดตามผล' : 'ยกเลิก' }}
          </button>
          <button
            @click="createFollowUpAppointment"
            :disabled="isCreatingFollowUp || !canCreateFollowUp"
            class="primary-btn"
            type="button"
          >
            {{ isCreatingFollowUp ? 'กำลังสร้างนัด...' : 'ส่งนัดให้เจ้าของยืนยัน' }}
          </button>
        </div>
      </section>
    </div>

    <div v-if="specialtyFollowUps.length > 0" class="modal-overlay" @click.self="dismissSpecialtyFollowUps">
      <section class="modal specialty-followup-modal" role="dialog" aria-modal="true" aria-labelledby="followup-title">
        <div class="modal-head">
          <div>
            <h2 id="followup-title">บันทึกการรักษาสำเร็จ</h2>
            <p>พบรายการที่ควรบันทึกรายละเอียดทางการแพทย์ต่อ เลือกรายการที่ต้องการดำเนินการได้เลย</p>
          </div>
          <button @click="dismissSpecialtyFollowUps" class="close-btn" type="button">ปิด</button>
        </div>

        <div class="followup-list">
          <article v-for="item in specialtyFollowUps" :key="`${item.type}-${item.service_id}`" class="followup-item">
            <div>
              <span class="followup-type">{{ item.type === 'surgery' ? 'เวชระเบียนการผ่าตัด' : 'ประวัติวัคซีน' }}</span>
              <strong>{{ item.service_name }}</strong>
              <p>
                ระบบจะเลือกสัตว์เลี้ยง สัตวแพทย์ และบริการจากการรักษารหัส
                {{ specialtyTreatmentId }} ให้โดยอัตโนมัติ
              </p>
            </div>
            <button @click="continueToSpecialty(item)" class="primary-btn" type="button">
              กรอกรายละเอียดต่อ
            </button>
          </article>
        </div>

        <div class="modal-actions">
          <button @click="dismissSpecialtyFollowUps" class="ghost-btn" type="button">ไว้บันทึกภายหลัง</button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { resolveApiAssetUrl } from '../../api'

const router = useRouter()
const treatments = ref([])
const petsList = ref([])
const servicesList = ref([])
const vetsList = ref([])
const schedulesList = ref([])
const selectedPetSummary = ref(null)
const isPetSummaryLoading = ref(false)
const petSummaryError = ref('')
const isModalOpen = ref(false)
const isSubmitting = ref(false)
const isEditing = ref(false)
const selectedServiceId = ref('')
const originalServiceIds = ref(new Set())
const specialtyFollowUps = ref([])
const specialtyTreatmentId = ref('')
const receiptIssueTarget = ref(null)
const receiptIssuePayMethod = ref('เงินสด')
const receiptIssueStatus = ref('ยังไม่ได้ชำระ')
const isIssuingReceipt = ref(false)
const followUpTarget = ref(null)
const isCreatingFollowUp = ref(false)
const pendingPostSaveFlow = ref(null)
const followUpForm = ref({
  vet_id: '',
  appt_date: '',
  appt_time: '',
  appt_reason: ''
})

const paidStatus = 'ชำระเสร็จสิ้น'
const unpaidStatus = 'ยังไม่ได้ชำระ'
const cashMethod = 'เงินสด'
const transferMethod = 'โอนเงิน'

const emptyForm = () => ({
  treatment_id: '',
  receipt_id: '',
  pet_id: '',
  vet_id: '',
  symptom: '',
  diagnosis: '',
  pay_method: cashMethod,
  payment_status: unpaidStatus,
  services: []
})

const form = ref(emptyForm())

const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` })

const formatPrice = (val) =>
  Number(val || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatDateTime = (d) => (d ? new Date(d).toLocaleString('th-TH') : '-')
const formatShortDate = (value) => value
  ? new Date(value).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
  : '-'

const formatPetAge = (birthdate) => {
  if (!birthdate) return 'ไม่ทราบอายุ'
  const born = new Date(birthdate)
  if (Number.isNaN(born.getTime())) return 'ไม่ทราบอายุ'
  const now = new Date()
  let months = (now.getFullYear() - born.getFullYear()) * 12 + now.getMonth() - born.getMonth()
  if (now.getDate() < born.getDate()) months -= 1
  if (months < 0) return 'วันเกิดไม่ถูกต้อง'
  if (months < 12) return `${months} เดือน`
  const years = Math.floor(months / 12)
  const remainingMonths = months % 12
  return remainingMonths ? `${years} ปี ${remainingMonths} เดือน` : `${years} ปี`
}

const getPetInitial = (name) => String(name || '?').trim().charAt(0).toUpperCase()

const isReceiptPaid = (treatment) => {
  const status = String(treatment?.payment_status || '').trim()
  return status === paidStatus || status.includes('เสร็จ') || status.includes('ชำระแล้ว')
}

const isFinancialLocked = computed(() =>
  isEditing.value && Boolean(form.value.receipt_id) && isReceiptPaid(form.value)
)

const fetchAllData = async () => {
  const [tRes, pRes, sRes, vRes, scheduleRes] = await Promise.all([
    axios.get('http://localhost:3000/api/treatments', { headers: headers() }),
    axios.get('http://localhost:3000/api/treatments/pets', { headers: headers() }),
    axios.get('http://localhost:3000/api/treatments/services', { headers: headers() }),
    axios.get('http://localhost:3000/api/admin/veterinarians', { headers: headers() }),
    axios.get('http://localhost:3000/api/appointments/vet-schedules', { headers: headers() })
  ])

  treatments.value = tRes.data || []
  petsList.value = pRes.data || []
  servicesList.value = sRes.data || []
  vetsList.value = vRes.data || []
  schedulesList.value = scheduleRes.data || []
}

const openAddModal = () => {
  isEditing.value = false
  form.value = emptyForm()
  originalServiceIds.value = new Set()
  selectedServiceId.value = ''
  isModalOpen.value = true
}

const openEditModal = async (treatmentId) => {
  try {
    const res = await axios.get(`http://localhost:3000/api/treatments/${treatmentId}`, { headers: headers() })
    const data = res.data
    form.value = {
      treatment_id: data.treatment_id,
      receipt_id: data.receipt_id || '',
      pet_id: data.pet_id || '',
      vet_id: data.vet_id || '',
      symptom: data.symptom || '',
      diagnosis: data.diagnosis || '',
      pay_method: data.pay_method || cashMethod,
      payment_status: data.payment_status || unpaidStatus,
      services: (data.services || []).map((item) => ({
        detail_id: item.detail_id,
        service_id: item.service_id,
        service_name: item.service_name || item.service_id,
        quantity: Number(item.quantity || 1),
        price: Number(item.price || 0)
      }))
    }
    selectedServiceId.value = ''
    originalServiceIds.value = new Set(form.value.services.map((item) => item.service_id))
    isEditing.value = true
    isModalOpen.value = true
  } catch (err) {
    alert(err.response?.data?.message || 'โหลดข้อมูลการรักษาไม่สำเร็จ')
  }
}

const closeModal = () => {
  isModalOpen.value = false
}

const viewPetHistory = (petId) => {
  if (!petId) return
  closeModal()
  router.push(`/admin/history/${petId}`)
}

const viewReceipt = (receiptId) =>
  router.push({ path: '/admin/receipts', query: { receipt_id: receiptId } })

const createReceiptForTreatment = async (treatmentId, payMethod, paymentStatus) => {
  const response = await axios.post(
    'http://localhost:3000/api/receipts',
    { treatment_id: treatmentId, pay_method: payMethod || null },
    { headers: headers() }
  )
  const receipt = response.data?.data

  if (!receipt?.receipt_id) {
    throw new Error('ไม่พบเลขที่ใบเสร็จจากระบบ')
  }

  if (paymentStatus === paidStatus && !isReceiptPaid(receipt)) {
    await axios.put(
      `http://localhost:3000/api/receipts/${receipt.receipt_id}/status`,
      { payment_status: paidStatus, pay_method: payMethod || cashMethod },
      { headers: headers() }
    )
  }

  return receipt
}

const openReceiptIssueModal = (treatment) => {
  receiptIssueTarget.value = treatment
  receiptIssuePayMethod.value = cashMethod
  receiptIssueStatus.value = unpaidStatus
}

const closeReceiptIssueModal = () => {
  if (isIssuingReceipt.value) return
  receiptIssueTarget.value = null
}

const todayInputValue = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const normalizeScheduleDate = (value) => String(value || '').slice(0, 10)
const normalizeScheduleTime = (value) => String(value || '').slice(0, 5)

const fetchFollowUpSchedules = async (date) => {
  if (!date) return
  try {
    const response = await axios.get('http://localhost:3000/api/appointments/vet-schedules', {
      headers: headers(),
      params: { from: date, to: date }
    })
    schedulesList.value = response.data || []
  } catch (error) {
    schedulesList.value = []
    console.error('Load follow-up vet schedules failed:', error)
  }
}

const matchingFollowUpSchedules = computed(() => {
  if (!followUpForm.value.vet_id || !followUpForm.value.appt_date) return []
  return schedulesList.value.filter((schedule) =>
    schedule.vet_id === followUpForm.value.vet_id
    && normalizeScheduleDate(schedule.work_date) === followUpForm.value.appt_date
  )
})

const followUpScheduleText = computed(() => {
  if (!followUpForm.value.vet_id || !followUpForm.value.appt_date) {
    return 'เลือกสัตวแพทย์และวันที่เพื่อดูช่วงเวลาที่เข้าเวร'
  }
  if (matchingFollowUpSchedules.value.length === 0) {
    return 'ไม่พบตารางเวรของสัตวแพทย์ในวันที่เลือก'
  }
  const shiftText = matchingFollowUpSchedules.value
    .map((schedule) => `${normalizeScheduleTime(schedule.start_time)}-${normalizeScheduleTime(schedule.end_time)} น.`)
    .join(', ')
  if (followUpForm.value.appt_time && !isFollowUpTimeWithinSchedule.value) {
    return `ช่วงเข้าเวร: ${shiftText} · เวลาที่เลือกอยู่นอกช่วงเข้าเวร`
  }
  return `ช่วงเข้าเวร: ${shiftText}`
})

const isFollowUpTimeWithinSchedule = computed(() => {
  const selectedTime = normalizeScheduleTime(followUpForm.value.appt_time)
  if (!selectedTime) return false
  return matchingFollowUpSchedules.value.some((schedule) => {
    const start = normalizeScheduleTime(schedule.start_time)
    const end = normalizeScheduleTime(schedule.end_time)
    return selectedTime >= start && selectedTime < end
  })
})

const followUpScheduleStateClass = computed(() => {
  if (matchingFollowUpSchedules.value.length === 0) return 'unavailable'
  if (followUpForm.value.appt_time && !isFollowUpTimeWithinSchedule.value) return 'unavailable'
  return 'available'
})

const canCreateFollowUp = computed(() =>
  Boolean(
    followUpTarget.value?.pet_id
    && followUpForm.value.vet_id
    && followUpForm.value.appt_date
    && followUpForm.value.appt_time
    && followUpForm.value.appt_reason
    && isFollowUpTimeWithinSchedule.value
  )
)

const openFollowUpModal = (treatment, fromPostSave = false) => {
  const vet = vetsList.value.find((item) => item.vet_id === treatment.vet_id)
  followUpTarget.value = {
    treatment_id: treatment.treatment_id,
    pet_id: treatment.pet_id,
    pet_name: treatment.pet_name || selectedPet.value?.pet_name || '',
    vet_id: treatment.vet_id || '',
    vet_name: treatment.vet_name || vet?.vet_name || '',
    fromPostSave
  }
  followUpForm.value = {
    vet_id: treatment.vet_id || '',
    appt_date: '',
    appt_time: '',
    appt_reason: `นัดติดตามผลจากการรักษา ${treatment.treatment_id}`
  }
}

const continuePostSaveFlow = async () => {
  const nextStep = pendingPostSaveFlow.value
  pendingPostSaveFlow.value = null
  if (!nextStep) return

  if (nextStep.specialtyFollowUps.length > 0) {
    specialtyTreatmentId.value = nextStep.treatmentId
    specialtyFollowUps.value = nextStep.specialtyFollowUps
    return
  }

  if (nextStep.receiptId) {
    await viewReceipt(nextStep.receiptId)
  }
}

const dismissFollowUpModal = async () => {
  if (isCreatingFollowUp.value) return
  const shouldContinue = Boolean(followUpTarget.value?.fromPostSave)
  followUpTarget.value = null
  if (shouldContinue) await continuePostSaveFlow()
}

const createFollowUpAppointment = async () => {
  if (!canCreateFollowUp.value || !followUpTarget.value) return

  isCreatingFollowUp.value = true
  const shouldContinue = Boolean(followUpTarget.value.fromPostSave)
  try {
    const response = await axios.post(
      'http://localhost:3000/api/appointments',
      {
        pet_id: followUpTarget.value.pet_id,
        vet_id: followUpForm.value.vet_id,
        appt_date: followUpForm.value.appt_date,
        appt_time: followUpForm.value.appt_time,
        appt_reason: followUpForm.value.appt_reason
      },
      { headers: headers() }
    )

    const emailQueued = response.data?.email_notification?.queued !== false
    alert(
      emailQueued
        ? 'สร้างนัดติดตามสำเร็จ และส่งให้เจ้าของยืนยันแล้ว'
        : 'สร้างนัดติดตามสำเร็จ แต่ระบบอีเมลยังไม่พร้อมใช้งาน'
    )
    followUpTarget.value = null
    if (shouldContinue) await continuePostSaveFlow()
  } catch (err) {
    alert(err.response?.data?.message || 'สร้างนัดติดตามผลไม่สำเร็จ')
  } finally {
    isCreatingFollowUp.value = false
  }
}

const issueLegacyReceipt = async () => {
  if (!receiptIssueTarget.value) return

  isIssuingReceipt.value = true
  try {
    const receipt = await createReceiptForTreatment(
      receiptIssueTarget.value.treatment_id,
      receiptIssuePayMethod.value,
      receiptIssueStatus.value
    )
    receiptIssueTarget.value = null
    await fetchAllData()
    await viewReceipt(receipt.receipt_id)
  } catch (err) {
    alert(err.response?.data?.message || err.message || 'ออกใบเสร็จไม่สำเร็จ')
  } finally {
    isIssuingReceipt.value = false
  }
}

const addServiceItem = () => {
  if (!selectedServiceId.value) return
  const svc = servicesList.value.find((s) => s.service_id === selectedServiceId.value)
  if (!svc || !selectedPet.value || !serviceMatchesPet(svc, selectedPet.value)) {
    selectedServiceId.value = ''
    return
  }

  const existing = form.value.services.find((i) => i.service_id === svc.service_id)
  if (existing) {
    existing.quantity += 1
  } else {
    form.value.services.push({
      service_id: svc.service_id,
      service_name: svc.service_name,
      quantity: 1,
      price: Number(svc.service_price || 0)
    })
  }
  selectedServiceId.value = ''
}

const removeServiceItem = (index) => {
  form.value.services.splice(index, 1)
}

const totalAmount = computed(() =>
  form.value.services.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0)
)

const normalizePetType = (value) => {
  const normalized = String(value || '').trim().toLowerCase()
  if (['dog', 'หมา', 'สุนัข'].includes(normalized)) return 'dog'
  if (['cat', 'แมว'].includes(normalized)) return 'cat'
  return normalized ? `other:${normalized}` : ''
}

const normalizePetGender = (value) => {
  const normalized = String(value || '').trim().toLowerCase()
  if (['male', 'ผู้', 'เพศผู้'].includes(normalized)) return 'male'
  if (['female', 'เมีย', 'เพศเมีย'].includes(normalized)) return 'female'
  return normalized ? `other:${normalized}` : ''
}

const isAllApplicability = (value) => {
  const normalized = String(value || '').trim().toLowerCase()
  return !normalized || ['all', 'ทั้งหมด', 'ทุกประเภท', 'ทุกเพศ'].includes(normalized)
}

const selectedPet = computed(() =>
  petsList.value.find((pet) => pet.pet_id === form.value.pet_id) || null
)

const recentPetTreatments = computed(() =>
  (selectedPetSummary.value?.treatments || []).slice(0, 3)
)

const hasDrugAllergy = computed(() => {
  const value = String(selectedPetSummary.value?.pet?.drug_allergy || '').trim().toLowerCase()
  return Boolean(value && !['-', 'ไม่มี', 'ไม่แพ้', 'ไม่มีข้อมูล', 'none', 'no'].includes(value))
})

let petSummaryRequestId = 0
const loadPetClinicalSummary = async (petId) => {
  const requestId = ++petSummaryRequestId
  selectedPetSummary.value = null
  petSummaryError.value = ''
  if (!petId) {
    isPetSummaryLoading.value = false
    return
  }

  isPetSummaryLoading.value = true
  try {
    const response = await axios.get(`http://localhost:3000/api/history/pet-summary/${petId}`, {
      headers: headers()
    })
    if (requestId === petSummaryRequestId) {
      selectedPetSummary.value = response.data?.data || null
    }
  } catch (error) {
    if (requestId === petSummaryRequestId) {
      petSummaryError.value = error.response?.data?.message || 'โหลดข้อมูลสุขภาพสัตว์เลี้ยงไม่สำเร็จ'
    }
  } finally {
    if (requestId === petSummaryRequestId) isPetSummaryLoading.value = false
  }
}

const serviceMatchesPet = (service, pet) => {
  if (!pet) return false
  const typeMatches = isAllApplicability(service.applicable_pet_type)
    || normalizePetType(service.applicable_pet_type) === normalizePetType(pet.pet_type)
  const genderMatches = isAllApplicability(service.applicable_pet_gender)
    || normalizePetGender(service.applicable_pet_gender) === normalizePetGender(pet.pet_gender)
  return typeMatches && genderMatches
}

const availableServicesList = computed(() => {
  if (!selectedPet.value) return []
  return servicesList.value.filter((service) => serviceMatchesPet(service, selectedPet.value))
})

const incompatibleSelectedServices = computed(() => {
  if (!selectedPet.value) return []
  return form.value.services.filter((item) => {
    const service = servicesList.value.find((entry) => entry.service_id === item.service_id)
    return service && !serviceMatchesPet(service, selectedPet.value)
  })
})

watch(
  () => form.value.pet_id,
  (petId) => {
    selectedServiceId.value = ''
    loadPetClinicalSummary(petId)
  }
)

watch(
  () => followUpForm.value.appt_date,
  (date) => fetchFollowUpSchedules(date)
)

const getSpecialtyType = (item) => {
  const service = servicesList.value.find((entry) => entry.service_id === item.service_id)
  const text = `${service?.service_type || ''} ${item.service_name || service?.service_name || ''}`.toLowerCase()

  if (/วัคซีน|vaccine|vaccination/.test(text)) return 'vaccine'
  if (/ผ่าตัด|ทำหมัน|surgery|operation/.test(text)) return 'surgery'
  return ''
}

const getSpecialtyFollowUps = () => {
  const candidates = isEditing.value
    ? form.value.services.filter((item) => !originalServiceIds.value.has(item.service_id))
    : form.value.services

  return candidates.reduce((items, serviceItem) => {
    const type = getSpecialtyType(serviceItem)
    if (!type || items.some((item) => item.type === type && item.service_id === serviceItem.service_id)) {
      return items
    }

    items.push({
      type,
      service_id: serviceItem.service_id,
      service_name: serviceItem.service_name || serviceItem.service_id
    })
    return items
  }, [])
}

const dismissSpecialtyFollowUps = () => {
  specialtyFollowUps.value = []
  specialtyTreatmentId.value = ''
}

const continueToSpecialty = async (item) => {
  const path = item.type === 'surgery' ? '/admin/surgeries' : '/admin/vaccines'
  const query = {
    source: 'treatment',
    treatment_id: specialtyTreatmentId.value,
    pet_id: form.value.pet_id,
    vet_id: form.value.vet_id || '',
    service_id: item.service_id,
    service_name: item.service_name
  }

  dismissSpecialtyFollowUps()
  await router.push({ path, query })
}

const submitTreatment = async () => {
  if (form.value.services.length === 0 && !confirm('ยังไม่มีรายการค่ารักษา ต้องการบันทึกหรือไม่?')) return

  isSubmitting.value = true
  let treatmentSaved = false
  try {
    const wasEditing = isEditing.value
    const followUps = getSpecialtyFollowUps()
    const payload = {
      pet_id: form.value.pet_id,
      vet_id: form.value.vet_id || null,
      symptom: form.value.symptom,
      diagnosis: form.value.diagnosis,
      services: form.value.services.map((item) => ({
        detail_id: item.detail_id || null,
        service_id: item.service_id,
        quantity: Number(item.quantity || 1),
        price: Number(item.price || 0)
      })),
      total_amount: totalAmount.value
    }

    let savedTreatmentId = form.value.treatment_id
    if (isEditing.value) {
      await axios.put(`http://localhost:3000/api/treatments/${savedTreatmentId}`, payload, { headers: headers() })
      treatmentSaved = true
    } else {
      const response = await axios.post('http://localhost:3000/api/treatments', payload, { headers: headers() })
      savedTreatmentId = response.data?.treatment_id || ''
      treatmentSaved = true
    }

    let receipt = null
    if (!isEditing.value) {
      receipt = await createReceiptForTreatment(
        savedTreatmentId,
        form.value.pay_method,
        form.value.payment_status
      )
    }

    const treatmentContext = {
      treatment_id: savedTreatmentId,
      pet_id: form.value.pet_id,
      pet_name: selectedPet.value?.pet_name || '',
      vet_id: form.value.vet_id || '',
      vet_name: vetsList.value.find((vet) => vet.vet_id === form.value.vet_id)?.vet_name || ''
    }

    closeModal()
    await fetchAllData()
    if (!wasEditing) {
      pendingPostSaveFlow.value = {
        treatmentId: savedTreatmentId,
        specialtyFollowUps: followUps,
        receiptId: receipt?.receipt_id || ''
      }
      openFollowUpModal(treatmentContext, true)
    } else if (followUps.length > 0) {
      specialtyTreatmentId.value = savedTreatmentId
      specialtyFollowUps.value = followUps
    }
  } catch (err) {
    const fallback = treatmentSaved
      ? 'บันทึกการรักษาแล้ว แต่ออกใบเสร็จไม่สำเร็จ กรุณากด “ออกใบเสร็จ” จากรายการการรักษาอีกครั้ง'
      : 'เกิดข้อผิดพลาดในการบันทึก'
    alert(err.response?.data?.message || fallback)
    if (treatmentSaved) {
      closeModal()
      await fetchAllData()
    }
  } finally {
    isSubmitting.value = false
  }
}

const deleteTreatment = async (treatment) => {
  if (!confirm(`ต้องการลบการรักษา ${treatment.treatment_id} หรือไม่?`)) return
  try {
    await axios.delete(`http://localhost:3000/api/treatments/${treatment.treatment_id}`, { headers: headers() })
    await fetchAllData()
  } catch (err) {
    alert(err.response?.data?.message || 'ลบการรักษาไม่สำเร็จ')
  }
}

onMounted(fetchAllData)
</script>

<style scoped>
.treatments-admin-page {
  display: grid;
  gap: 20px;
}

.amount {
  font-weight: 800;
  color: #059669;
}

.receipt-link {
  display: inline-grid;
  gap: 5px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #0f766e;
  font: inherit;
  font-weight: 800;
  text-align: left;
  cursor: pointer;
}

.receipt-link:hover {
  text-decoration: underline;
}

.receipt-state {
  width: max-content;
  padding: 3px 7px;
  border-radius: 999px;
  font-size: 11px;
  text-decoration: none;
}

.receipt-state.paid {
  background: #dcfce7;
  color: #166534;
}

.receipt-state.unpaid {
  background: #fee2e2;
  color: #991b1b;
}

.row-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.mini-btn {
  min-height: 36px;
  padding: 0 12px;
  border-radius: 10px;
}

.followup-btn {
  border: 1px solid #99f6e4;
  background: #f0fdfa;
  color: #0f766e;
  font-weight: 700;
  cursor: pointer;
}

.followup-btn:hover {
  border-color: #5eead4;
  background: #ccfbf1;
}

.danger-btn {
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
}

.treatment-modal {
  width: min(1040px, 100%);
}

.form-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  min-width: 0;
}

.left-panel {
  align-content: start;
  min-width: 0;
}

.full-width {
  grid-column: 1 / -1;
}

.service-panel {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  min-width: 0;
  box-sizing: border-box;
}

.service-label {
  display: block;
  margin-bottom: 8px;
  color: #334155;
  font-weight: 700;
}

.financial-notice {
  display: grid;
  gap: 3px;
  margin-bottom: 14px;
  padding: 11px 12px;
  border: 1px solid;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.5;
}

.financial-notice strong {
  color: inherit;
}

.financial-notice span {
  opacity: 0.86;
}

.financial-notice.locked {
  border-color: #fecaca;
  background: #fff7f7;
  color: #991b1b;
}

.financial-notice.syncing {
  border-color: #a7f3d0;
  background: #f0fdf8;
  color: #065f46;
}

.service-add {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  min-width: 0;
}

.service-select {
  flex: 1;
  min-width: 0;
}

.service-select:disabled {
  cursor: not-allowed;
  color: #64748b;
  background: #eef2f6;
}

.pet-context {
  display: block;
  margin-top: 7px;
  color: #047857;
  font-size: 12px;
  font-weight: 600;
}

.clinical-context {
  overflow: hidden;
  border: 1px solid #cfe3df;
  border-radius: 14px;
  background: #f8fcfb;
}

.clinical-state {
  padding: 18px;
  color: #64748b;
  text-align: center;
}

.clinical-state.error {
  color: #b91c1c;
  background: #fff7f7;
}

.clinical-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  border-bottom: 1px solid #dbe9e6;
}

.clinical-pet {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
}

.clinical-pet img,
.clinical-avatar {
  width: 52px;
  height: 52px;
  flex: 0 0 52px;
  border-radius: 10px;
}

.clinical-pet img {
  object-fit: cover;
}

.clinical-avatar {
  display: grid;
  place-items: center;
  background: #dff5ef;
  color: #0f766e;
  font-size: 20px;
  font-weight: 800;
}

.clinical-pet div {
  display: grid;
  min-width: 0;
}

.clinical-pet strong {
  overflow: hidden;
  color: #0f172a;
  font-size: 17px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.clinical-pet small {
  color: #64748b;
}

.clinical-kicker {
  color: #0f766e;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
}

.allergy-badge {
  flex: 0 0 auto;
  padding: 6px 9px;
  border-radius: 999px;
  background: #dcfce7;
  color: #166534;
  font-size: 11px;
  font-weight: 800;
}

.allergy-badge.danger {
  background: #fee2e2;
  color: #991b1b;
}

.clinical-facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  background: #dbe9e6;
}

.clinical-facts div {
  display: grid;
  gap: 3px;
  padding: 11px 14px;
  background: #fff;
}

.clinical-facts span,
.allergy-notice span {
  color: #64748b;
  font-size: 11px;
}

.clinical-facts strong,
.allergy-notice strong {
  color: #1e293b;
  font-size: 13px;
}

.allergy-notice {
  display: grid;
  gap: 3px;
  margin: 12px 14px 0;
  padding: 10px 12px;
  border: 1px solid #bbf7d0;
  border-radius: 10px;
  background: #f0fdf4;
}

.allergy-notice.danger {
  border-color: #fecaca;
  background: #fff1f2;
}

.allergy-notice.danger span,
.allergy-notice.danger strong {
  color: #991b1b;
}

.clinical-counts {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  padding: 12px 14px;
}

.clinical-counts span {
  padding: 5px 8px;
  border: 1px solid #dbe3ec;
  border-radius: 7px;
  background: #fff;
  color: #475569;
  font-size: 11px;
}

.clinical-counts strong {
  margin-left: 3px;
  color: #0f766e;
}

.recent-treatment-list {
  display: grid;
  gap: 7px;
  padding: 0 14px 14px;
}

.recent-treatment-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.recent-treatment-head > strong {
  color: #0f172a;
  font-size: 13px;
}

.history-link {
  padding: 0;
  border: 0;
  background: transparent;
  color: #0f766e;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.recent-treatment-list article {
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  gap: 9px;
  padding: 9px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 9px;
  background: #fff;
}

.recent-treatment-list time {
  color: #64748b;
  font-size: 11px;
}

.recent-treatment-list article div {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.recent-treatment-list article strong,
.recent-treatment-list article span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-treatment-list article strong {
  color: #1e293b;
  font-size: 12px;
}

.recent-treatment-list article span,
.no-history {
  margin: 0;
  color: #64748b;
  font-size: 11px;
}

.service-message {
  margin: -4px 0 14px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #fffbeb;
  color: #92400e;
  font-size: 13px;
  line-height: 1.5;
}

.service-message.error {
  background: #fef2f2;
  color: #b91c1c;
}

.small-btn {
  min-height: 44px;
}

.selected-items-box {
  flex-grow: 1;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  padding: 12px;
  max-height: 280px;
  overflow-y: auto;
  margin-bottom: 16px;
}

.item-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 70px 110px 48px;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid #f1f5f9;
}

.item-main {
  min-width: 0;
}

.item-name {
  font-weight: 700;
  font-size: 14px;
  color: #0f172a;
}

.item-price-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #64748b;
  margin-top: 4px;
}

.qty-input {
  width: 70px;
  text-align: center;
}

.remove-btn {
  min-height: 36px;
  padding: 0 10px;
  border-radius: 10px;
}

.item-total {
  font-weight: 800;
  color: #059669;
  text-align: right;
}

.empty-services {
  text-align: center;
  color: #94a3b8;
  padding: 24px 0;
  font-size: 14px;
}

.total-box {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 2px dashed #cbd5e1;
  font-weight: 800;
}

.total-amount {
  font-size: 24px;
  color: #059669;
}

.receipt-options {
  display: grid;
  gap: 14px;
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid #dbe3ec;
}

.receipt-options-head {
  display: grid;
  gap: 3px;
}

.receipt-options-head strong {
  color: #0f172a;
}

.receipt-options-head span {
  color: #64748b;
  font-size: 13px;
}

.receipt-options-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.receipt-options-grid label {
  display: grid;
  gap: 7px;
  color: #334155;
  font-size: 13px;
  font-weight: 700;
}

.receipt-options-grid.standalone {
  margin-top: 20px;
}

.receipt-issue-modal {
  width: min(620px, 100%);
}

.followup-appointment-modal {
  width: min(720px, 100%);
}

.followup-appointment-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 20px;
}

.followup-appointment-grid label {
  display: grid;
  gap: 7px;
  color: #334155;
  font-size: 13px;
  font-weight: 700;
}

.schedule-context {
  display: grid;
  gap: 4px;
  align-content: center;
  min-height: 72px;
  padding: 11px 13px;
  border: 1px solid;
  border-radius: 10px;
  font-size: 13px;
}

.schedule-context.available {
  border-color: #a7f3d0;
  background: #f0fdf8;
  color: #065f46;
}

.schedule-context.unavailable {
  border-color: #fde68a;
  background: #fffbeb;
  color: #92400e;
}

.followup-help {
  margin: 16px 0 0;
  padding: 11px 13px;
  border-radius: 10px;
  background: #f1f5f9;
  color: #475569;
  font-size: 13px;
  line-height: 1.55;
}

.price-edit-input {
  width: 78px;
  padding: 4px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  text-align: right;
  font-size: 12px;
  background-color: #f8fafc;
}

.service-panel input:disabled,
.service-panel select:disabled,
.service-panel button:disabled,
.left-panel select:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.specialty-followup-modal {
  width: min(760px, 100%);
}

.followup-list {
  display: grid;
  gap: 12px;
  margin-top: 20px;
}

.followup-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 18px;
  border: 1px solid #dbe3ec;
  border-radius: 12px;
  background: #f8fafc;
}

.followup-item strong {
  display: block;
  margin-top: 6px;
  color: #0f172a;
  font-size: 18px;
}

.followup-item p {
  max-width: 58ch;
  margin: 6px 0 0;
  color: #64748b;
  line-height: 1.6;
}

.followup-type {
  color: #0f766e;
  font-size: 13px;
  font-weight: 800;
}

@media (max-width: 900px) {
  .form-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .service-panel {
    padding: 16px;
  }

  .receipt-options-grid {
    grid-template-columns: 1fr;
  }

  .followup-appointment-grid {
    grid-template-columns: 1fr;
  }

  .followup-item {
    align-items: stretch;
    flex-direction: column;
  }

  .followup-item .primary-btn {
    width: 100%;
  }

  .clinical-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .clinical-facts {
    grid-template-columns: 1fr;
  }

  .recent-treatment-list article {
    grid-template-columns: 1fr;
  }
}
</style>
