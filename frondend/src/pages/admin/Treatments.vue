<template>
  <div class="treatment-page">
    <div class="clinic-card header-card">
      <div class="header-content">
        <div class="icon-box">TX</div>
        <div class="title-box">
          <h1>บันทึกการรักษา</h1>
          <p>บันทึกอาการ วินิจฉัยโรค และจัดการรายการค่ารักษา</p>
        </div>
      </div>
      <button @click="openAddModal" class="btn-primary">เพิ่มการรักษาใหม่</button>
    </div>

    <div class="clinic-card table-card">
      <div class="table-responsive">
        <table class="clinic-table">
          <thead>
            <tr>
              <th>รหัสการรักษา</th>
              <th>วันที่รักษา</th>
              <th>สัตว์เลี้ยง</th>
              <th>สัตวแพทย์</th>
              <th>การวินิจฉัย</th>
              <th class="text-right">ยอดรวม</th>
              <th class="text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in treatments" :key="t.treatment_id">
              <td><span class="badge">{{ t.treatment_id }}</span></td>
              <td>{{ formatDateTime(t.treatment_date) }}</td>
              <td>
                {{ t.pet_name }}
                <br>
                <span class="subtext">คุณ{{ t.owner_name }}</span>
              </td>
              <td>{{ t.vet_name || t.doctor_name || '-' }}</td>
              <td>{{ t.diagnosis || '-' }}</td>
              <td class="text-right amount">{{ formatPrice(t.total_amount) }}</td>
              <td class="text-center">
                <div class="row-actions">
                  <button class="btn-row edit" @click="openEditModal(t.treatment_id)">แก้ไข</button>
                  <button class="btn-row delete" @click="deleteTreatment(t)">ลบ</button>
                </div>
              </td>
            </tr>
            <tr v-if="treatments.length === 0">
              <td colspan="7" class="empty">ยังไม่มีประวัติการรักษา</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="isModalOpen" class="custom-modal-overlay" @click.self="closeModal">
      <div class="custom-modal-box modal-xl">
        <div class="modal-header">
          <h3>{{ isEditing ? 'แก้ไขการรักษา' : 'บันทึกการรักษาใหม่' }}</h3>
          <button @click="closeModal" class="close-btn">X</button>
        </div>

        <div class="form-grid">
          <div class="left-panel">
            <div class="form-group">
              <label>เลือกสัตว์เลี้ยง <span class="required">*</span></label>
              <select v-model="form.pet_id" class="custom-input" required>
                <option value="" disabled>-- กรุณาเลือกสัตว์เลี้ยง --</option>
                <option v-for="p in petsList" :key="p.pet_id" :value="p.pet_id">
                  {{ p.pet_name }} (คุณ{{ p.owner_name }})
                </option>
              </select>
            </div>

            <div class="form-group">
              <label>สัตวแพทย์</label>
              <select v-model="form.vet_id" class="custom-input">
                <option value="">-- เลือกสัตวแพทย์ --</option>
                <option v-for="vet in vetsList" :key="vet.vet_id" :value="vet.vet_id">
                  {{ vet.vet_name }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label>อาการเบื้องต้น</label>
              <textarea v-model="form.symptom" rows="3" class="custom-input"></textarea>
            </div>

            <div class="form-group">
              <label>การวินิจฉัยโรค</label>
              <textarea v-model="form.diagnosis" rows="3" class="custom-input"></textarea>
            </div>
          </div>

          <div class="right-panel">
            <label class="panel-label">รายการบริการ / ค่ารักษา</label>
            <div class="service-add">
              <select v-model="selectedServiceId" class="custom-input flex-1">
                <option value="" disabled>-- เลือกบริการ --</option>
                <option v-for="s in servicesList" :key="s.service_id" :value="s.service_id">
                  {{ s.service_name }} ({{ formatPrice(s.service_price) }} บาท)
                </option>
              </select>
              <button type="button" @click="addServiceItem" class="btn-add">เพิ่ม</button>
            </div>

            <div class="selected-items-box">
              <div v-for="(item, index) in form.services" :key="`${item.service_id}-${index}`" class="item-row">
                <div class="item-main">
                  <div class="item-name">{{ item.service_name }}</div>
                  <div class="item-price-row">
                    <span>ราคา</span>
                    <input type="number" v-model.number="item.price" min="0" step="0.5" class="price-edit-input">
                    <span>บาท</span>
                  </div>
                </div>
                <input type="number" v-model.number="item.quantity" min="1" class="qty-input">
                <div class="item-total">{{ formatPrice(item.price * item.quantity) }}</div>
                <button @click="removeServiceItem(index)" class="btn-remove" type="button">X</button>
              </div>
              <div v-if="form.services.length === 0" class="empty-services">
                ยังไม่มีรายการค่ารักษา
              </div>
            </div>

            <div class="total-box">
              <span>ยอดรวมทั้งหมด</span>
              <span class="total-amount">{{ formatPrice(totalAmount) }} บาท</span>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="closeModal" class="btn-cancel" type="button">ยกเลิก</button>
          <button @click="submitTreatment" :disabled="isSubmitting || !form.pet_id" class="btn-submit" type="button">
            {{ isSubmitting ? 'กำลังบันทึก...' : isEditing ? 'บันทึกการแก้ไข' : 'บันทึกการรักษา' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

const treatments = ref([])
const petsList = ref([])
const servicesList = ref([])
const vetsList = ref([])
const isModalOpen = ref(false)
const isSubmitting = ref(false)
const isEditing = ref(false)
const selectedServiceId = ref('')

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
  form.value.services.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0)
)

const submitTreatment = async () => {
  if (form.value.services.length === 0 && !confirm('ยังไม่มีรายการค่ารักษา ต้องการบันทึกหรือไม่?')) return

  isSubmitting.value = true
  try {
    const payload = {
      pet_id: form.value.pet_id,
      vet_id: form.value.vet_id || null,
      symptom: form.value.symptom,
      diagnosis: form.value.diagnosis,
      services: form.value.services.map((item) => ({
        service_id: item.service_id,
        quantity: Number(item.quantity || 1),
        price: Number(item.price || 0)
      })),
      total_amount: totalAmount.value
    }

    if (isEditing.value) {
      await axios.put(`http://localhost:3000/api/treatments/${form.value.treatment_id}`, payload, { headers: headers() })
    } else {
      await axios.post('http://localhost:3000/api/treatments', payload, { headers: headers() })
    }

    closeModal()
    await fetchAllData()
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
.treatment-page { background-color: #f8fafc; min-height: 100vh; padding: 24px; color: #1e293b; }
.clinic-card { background: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); padding: 24px; margin-bottom: 24px; border: 1px solid #f1f5f9; }
.header-card { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.header-content { display: flex; align-items: center; gap: 16px; }
.icon-box { width: 56px; height: 56px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 800; color: white; }
.title-box h1 { margin: 0; font-size: 24px; font-weight: 800; }
.title-box p { margin: 6px 0 0; color: #64748b; }
.btn-primary { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 700; cursor: pointer; }
.table-responsive { overflow-x: auto; }
.clinic-table { width: 100%; border-collapse: collapse; min-width: 860px; }
.clinic-table th { background: #f8fafc; padding: 16px; text-align: left; font-size: 13px; font-weight: 700; color: #64748b; border-bottom: 2px solid #e2e8f0; }
.clinic-table td { padding: 16px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
.badge { background: #f1f5f9; padding: 6px 12px; border-radius: 8px; font-weight: 700; font-size: 13px; color: #475569; }
.subtext { color: #64748b; font-size: 12px; }
.amount { font-weight: 800; color: #059669; }
.text-right { text-align: right; }
.text-center { text-align: center; }
.row-actions { display: flex; gap: 8px; justify-content: center; }
.btn-row { border: 0; border-radius: 8px; padding: 8px 10px; font-weight: 700; cursor: pointer; }
.btn-row.edit { background: #dbeafe; color: #1d4ed8; }
.btn-row.delete { background: #fee2e2; color: #b91c1c; }
.empty { text-align: center; padding: 32px; color: #64748b; }
.custom-modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.6); display: flex; justify-content: center; align-items: center; z-index: 50; padding: 20px; }
.modal-xl { background: white; width: 100%; max-width: 1000px; max-height: 90vh; overflow-y: auto; border-radius: 20px; padding: 32px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px; margin-bottom: 24px; }
.modal-header h3 { margin: 0; font-size: 22px; font-weight: 800; }
.close-btn { background: #f1f5f9; border: none; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; font-weight: bold; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
.form-group { margin-bottom: 16px; }
.form-group label, .panel-label { display: block; font-weight: 700; margin-bottom: 8px; font-size: 14px; color: #334155; }
.required { color: #dc2626; }
.custom-input { width: 100%; padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; outline: none; }
.custom-input:focus { border-color: #10b981; background: white; }
.right-panel { background: #f8fafc; padding: 20px; border-radius: 16px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; }
.service-add { display: flex; gap: 8px; margin-bottom: 16px; }
.btn-add { background: #3b82f6; color: white; border: none; border-radius: 12px; padding: 0 20px; font-weight: 700; cursor: pointer; }
.selected-items-box { flex-grow: 1; background: white; border-radius: 12px; border: 1px solid #e2e8f0; padding: 12px; max-height: 260px; overflow-y: auto; margin-bottom: 16px; }
.item-row { display: grid; grid-template-columns: minmax(0, 1fr) 70px 110px 32px; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
.item-main { min-width: 0; }
.item-name { font-weight: 700; font-size: 14px; }
.item-price-row { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #64748b; margin-top: 4px; }
.qty-input { width: 70px; text-align: center; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; }
.btn-remove { background: #fee2e2; color: #ef4444; border: none; width: 28px; height: 28px; border-radius: 8px; cursor: pointer; }
.item-total { font-weight: 800; color: #059669; text-align: right; }
.empty-services { text-align: center; color: #94a3b8; padding: 24px 0; font-size: 14px; }
.total-box { display: flex; justify-content: space-between; align-items: center; padding-top: 16px; border-top: 2px dashed #cbd5e1; font-weight: 800; }
.total-amount { font-size: 24px; color: #059669; }
.modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; }
.btn-cancel { padding: 12px 24px; background: #f1f5f9; border: none; border-radius: 12px; font-weight: 700; cursor: pointer; }
.btn-submit { padding: 12px 24px; background: #10b981; color: white; border: none; border-radius: 12px; font-weight: 700; cursor: pointer; }
.btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
.price-edit-input { width: 78px; padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 6px; text-align: right; font-size: 12px; background-color: #f8fafc; }
@media (max-width: 900px) {
  .form-grid { grid-template-columns: 1fr; }
}
</style>
