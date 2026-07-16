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
              <td class="center">
                <div class="row-actions">
                  <button class="ghost-btn mini-btn" @click="openEditModal(t.treatment_id)">แก้ไข</button>
                  <button class="danger-btn mini-btn" @click="deleteTreatment(t)">ลบ</button>
                </div>
              </td>
            </tr>
            <tr v-if="treatments.length === 0">
              <td colspan="7" class="state">ยังไม่มีประวัติการรักษา</td>
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
              <select v-model="form.pet_id" required>
                <option value="" disabled>-- กรุณาเลือกสัตว์เลี้ยง --</option>
                <option v-for="p in petsList" :key="p.pet_id" :value="p.pet_id">
                  {{ p.pet_name }} (คุณ{{ p.owner_name }})
                </option>
              </select>
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
            <div class="service-add">
              <select v-model="selectedServiceId" class="service-select">
                <option value="" disabled>-- เลือกบริการ --</option>
                <option v-for="s in servicesList" :key="s.service_id" :value="s.service_id">
                  {{ s.service_name }} ({{ formatPrice(s.service_price) }} บาท)
                </option>
              </select>
              <button type="button" @click="addServiceItem" class="primary-btn small-btn">เพิ่ม</button>
            </div>

            <div class="selected-items-box">
              <div v-for="(item, index) in form.services" :key="`${item.service_id}-${index}`" class="item-row">
                <div class="item-main">
                  <div class="item-name">{{ item.service_name }}</div>
                  <div class="item-price-row">
                    <span>ราคา</span>
                    <input type="number" v-model.number="item.price" min="0" step="0.5" class="price-edit-input" />
                    <span>บาท</span>
                  </div>
                </div>
                <input type="number" v-model.number="item.quantity" min="1" class="qty-input" />
                <div class="item-total">{{ formatPrice(item.price * item.quantity) }}</div>
                <button @click="removeServiceItem(index)" class="danger-btn remove-btn" type="button">ลบ</button>
              </div>
              <div v-if="form.services.length === 0" class="empty-services">ยังไม่มีรายการค่ารักษา</div>
            </div>

            <div class="total-box">
              <span>ยอดรวมทั้งหมด</span>
              <span class="total-amount">{{ formatPrice(totalAmount) }} บาท</span>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="closeModal" class="ghost-btn" type="button">ยกเลิก</button>
          <button @click="submitTreatment" :disabled="isSubmitting || !form.pet_id" class="primary-btn" type="button">
            {{ isSubmitting ? 'กำลังบันทึก...' : isEditing ? 'บันทึกการแก้ไข' : 'บันทึกการรักษา' }}
          </button>
        </div>
      </div>
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
import { ref, computed, onMounted } from 'vue'
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

const emptyForm = () => ({
  treatment_id: '',
  pet_id: '',
  vet_id: '',
  symptom: '',
  diagnosis: '',
  services: []
})

const form = ref(emptyForm())

const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` })

const formatPrice = (val) =>
  Number(val || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatDateTime = (d) => (d ? new Date(d).toLocaleString('th-TH') : '-')

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
      pet_id: data.pet_id || '',
      vet_id: data.vet_id || '',
      symptom: data.symptom || '',
      diagnosis: data.diagnosis || '',
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

const addServiceItem = () => {
  if (!selectedServiceId.value) return
  const svc = servicesList.value.find((s) => s.service_id === selectedServiceId.value)
  if (!svc) return

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
    } else {
      const response = await axios.post('http://localhost:3000/api/treatments', payload, { headers: headers() })
      savedTreatmentId = response.data?.treatment_id || ''
    }

    closeModal()
    await fetchAllData()
    if (followUps.length > 0) {
      specialtyTreatmentId.value = savedTreatmentId
      specialtyFollowUps.value = followUps
    }
  } catch (err) {
    alert(err.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึก')
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
}

.left-panel {
  align-content: start;
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
}

.service-label {
  display: block;
  margin-bottom: 8px;
  color: #334155;
  font-weight: 700;
}

.service-add {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.service-select {
  flex: 1;
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

.price-edit-input {
  width: 78px;
  padding: 4px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  text-align: right;
  font-size: 12px;
  background-color: #f8fafc;
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
  .followup-item {
    align-items: stretch;
    flex-direction: column;
  }

  .followup-item .primary-btn {
    width: 100%;
  }
}
</style>
