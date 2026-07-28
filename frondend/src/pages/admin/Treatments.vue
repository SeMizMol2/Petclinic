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

const router = useRouter()
const treatments = ref([])
const petsList = ref([])
const servicesList = ref([])
const vetsList = ref([])
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

const isReceiptPaid = (treatment) => {
  const status = String(treatment?.payment_status || '').trim()
  return status === paidStatus || status.includes('เสร็จ') || status.includes('ชำระแล้ว')
}

const isFinancialLocked = computed(() =>
  isEditing.value && Boolean(form.value.receipt_id) && isReceiptPaid(form.value)
)

const fetchAllData = async () => {
  const [tRes, pRes, sRes, vRes] = await Promise.all([
    axios.get('http://localhost:3000/api/treatments', { headers: headers() }),
    axios.get('http://localhost:3000/api/treatments/pets', { headers: headers() }),
    axios.get('http://localhost:3000/api/treatments/services', { headers: headers() }),
    axios.get('http://localhost:3000/api/admin/veterinarians', { headers: headers() })
  ])

  treatments.value = tRes.data || []
  petsList.value = pRes.data || []
  servicesList.value = sRes.data || []
  vetsList.value = vRes.data || []
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
  () => {
    selectedServiceId.value = ''
  }
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

    closeModal()
    await fetchAllData()
    if (followUps.length > 0) {
      specialtyTreatmentId.value = savedTreatmentId
      specialtyFollowUps.value = followUps
    } else if (receipt?.receipt_id) {
      await viewReceipt(receipt.receipt_id)
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
  gap: 8px;
  justify-content: center;
}

.mini-btn {
  min-height: 36px;
  padding: 0 12px;
  border-radius: 10px;
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

  .followup-item {
    align-items: stretch;
    flex-direction: column;
  }

  .followup-item .primary-btn {
    width: 100%;
  }
}
</style>
