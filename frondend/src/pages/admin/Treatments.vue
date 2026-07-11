<template>
  <div class="treatment-page">
    <div class="clinic-card header-card">
      <div class="header-content">
        <div class="icon-box">🩺</div>
        <div class="title-box">
          <h1>บันทึกการรักษา</h1>
          <p>บันทึกอาการ วินิจฉัยโรค และส่งต่อรายการค่ารักษา</p>
        </div>
      </div>
      <button @click="openAddModal" class="btn-primary">
        <span class="icon-sm">➕</span> เพิ่มการรักษาใหม่
      </button>
    </div>

    <div class="clinic-card table-card">
      <div class="table-responsive">
        <table class="clinic-table">
          <thead>
            <tr>
              <th>รหัสการรักษา</th>
              <th>วันที่รักษา</th>
              <th>สัตว์เลี้ยง (เจ้าของ)</th>
              <th>สัตวแพทย์</th>
              <th>การวินิจฉัย</th>
              <th class="text-right">ยอดรวม (บาท)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in treatments" :key="t.treatment_id">
              <td><span class="badge">{{ t.treatment_id }}</span></td>
              <td>{{ formatDateTime(t.treatment_date) }}</td>
              <td>
                🐾 {{ t.pet_name }}
                <br>
                <span class="text-xs text-gray-500">คุณ{{ t.owner_name }}</span>
              </td>
              <td>{{ t.vet_name || t.doctor_name || '-' }}</td>
              <td>{{ t.diagnosis || '-' }}</td>
              <td class="text-right font-bold text-emerald-600">{{ formatPrice(t.total_amount) }}</td>
            </tr>
            <tr v-if="treatments.length === 0">
              <td colspan="6" class="text-center py-8">ยังไม่มีประวัติการรักษา</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="isModalOpen" class="custom-modal-overlay" @click.self="closeModal">
      <div class="custom-modal-box modal-xl">
        <div class="modal-header">
          <h3>🩺 บันทึกการรักษาใหม่</h3>
          <button @click="closeModal" class="close-btn">✕</button>
        </div>

        <div class="form-grid">
          <div class="left-panel">
            <div class="form-group">
              <label>เลือกสัตว์เลี้ยง <span class="required">*</span></label>
              <select v-model="form.pet_id" class="custom-input" required>
                <option value="" disabled>-- กรุณาเลือกสัตว์เลี้ยง --</option>
                <option v-for="p in petsList" :key="p.pet_id" :value="p.pet_id">
                  🐾 {{ p.pet_name }} (คุณ{{ p.owner_name }})
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
            <label class="block mb-2 font-bold text-slate-700">เพิ่มรายการบริการ / ค่ารักษา</label>
            <div class="flex gap-2 mb-4">
              <select v-model="selectedServiceId" class="custom-input flex-1">
                <option value="" disabled>-- เลือกบริการ --</option>
                <option v-for="s in servicesList" :key="s.service_id" :value="s.service_id">
                  {{ s.service_name }} ({{ formatPrice(s.service_price) }}฿)
                </option>
              </select>
              <button type="button" @click="addServiceItem" class="btn-add">เพิ่ม</button>
            </div>

            <div class="selected-items-box">
              <div v-for="(item, index) in form.services" :key="index" class="item-row">
                <div class="flex-1">
                  <div class="font-bold text-sm">{{ item.service_name }}</div>
                  <div class="flex items-center gap-1 text-xs text-gray-500 mt-1">
                    <span></span>
                    <input type="number" v-model.number="item.price" min="0" step="0.5" class="price-edit-input">
                    <span>บาท</span>
                  </div>
                </div>
                <input type="number" v-model.number="item.quantity" min="1" class="qty-input">
                <div class="font-bold text-emerald-600 w-20 text-right">{{ formatPrice(item.price * item.quantity) }}</div>
                <button @click="removeServiceItem(index)" class="btn-remove">✕</button>
              </div>
              <div v-if="form.services.length === 0" class="text-center text-gray-400 py-4 text-sm">
                ยังไม่มีรายการค่ารักษา
              </div>
            </div>

            <div class="total-box">
              <span>ยอดรวมทั้งหมด:</span>
              <span class="text-2xl font-black text-emerald-600">{{ formatPrice(totalAmount) }} บาท</span>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="closeModal" class="btn-cancel">ยกเลิก</button>
          <button @click="submitTreatment" :disabled="isSubmitting || !form.pet_id" class="btn-submit">
            {{ isSubmitting ? 'กำลังบันทึก...' : 'บันทึกการรักษา' }}
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
const selectedServiceId = ref('')

const form = ref({
  pet_id: '',
  vet_id: '',
  symptom: '',
  diagnosis: '',
  services: []
})

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
  form.value = {
    pet_id: '',
    vet_id: '',
    symptom: '',
    diagnosis: '',
    services: []
  }
  selectedServiceId.value = ''
  isModalOpen.value = true
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
    form.value.services.push({ ...svc, quantity: 1, price: svc.service_price })
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
      ...form.value,
      total_amount: totalAmount.value
    }

    await axios.post('http://localhost:3000/api/treatments', payload, { headers: headers() })
    closeModal()
    await fetchAllData()
  } catch (err) {
    alert(err.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึก')
  } finally {
    isSubmitting.value = false
  }
}

onMounted(fetchAllData)
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap');
.treatment-page { font-family: 'Sarabun', sans-serif; background-color: #f8fafc; min-height: 100vh; padding: 24px; color: #1e293b; }
.clinic-card { background: #ffffff; border-radius: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); padding: 24px; margin-bottom: 24px; border: 1px solid #f1f5f9; }
.header-card { display: flex; justify-content: space-between; align-items: center; }
.header-content { display: flex; align-items: center; gap: 16px; }
.icon-box { width: 56px; height: 56px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 28px; color: white; }
.title-box h1 { margin: 0; font-size: 24px; font-weight: 800; }
.btn-primary { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 700; cursor: pointer; transition: 0.2s; }
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(16,185,129,0.4); }

.clinic-table { width: 100%; border-collapse: collapse; min-width: 700px; }
.clinic-table th { background: #f8fafc; padding: 16px; text-align: left; font-size: 13px; font-weight: 700; color: #64748b; border-bottom: 2px solid #e2e8f0; }
.clinic-table td { padding: 16px; border-bottom: 1px solid #f1f5f9; }
.badge { background: #f1f5f9; padding: 6px 12px; border-radius: 8px; font-weight: 700; font-size: 13px; color: #475569; }

.custom-modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.6); backdrop-filter: blur(4px); display: flex; justify-content: center; align-items: center; z-index: 50; padding: 20px;}
.modal-xl { background: white; width: 100%; max-width: 1000px; max-height: 90vh; overflow-y: auto; border-radius: 24px; padding: 32px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px; margin-bottom: 24px; }
.modal-header h3 { margin: 0; font-size: 22px; font-weight: 800; }
.close-btn { background: #f1f5f9; border: none; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; font-weight: bold; }

.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-weight: 700; margin-bottom: 8px; font-size: 14px; }
.custom-input { width: 100%; padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; outline: none; }
.custom-input:focus { border-color: #10b981; background: white; }

.right-panel { background: #f8fafc; padding: 20px; border-radius: 16px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; }
.btn-add { background: #3b82f6; color: white; border: none; border-radius: 12px; padding: 0 20px; font-weight: 700; cursor: pointer; }
.selected-items-box { flex-grow: 1; background: white; border-radius: 12px; border: 1px solid #e2e8f0; padding: 12px; max-height: 250px; overflow-y: auto; margin-bottom: 16px; }
.item-row { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
.qty-input { width: 60px; text-align: center; border: 1px solid #e2e8f0; border-radius: 8px; padding: 4px; }
.btn-remove { background: #fee2e2; color: #ef4444; border: none; width: 28px; height: 28px; border-radius: 8px; cursor: pointer; }
.total-box { display: flex; justify-content: space-between; align-items: center; padding-top: 16px; border-top: 2px dashed #cbd5e1; font-weight: 800; }

.modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; }
.btn-cancel { padding: 12px 24px; background: #f1f5f9; border: none; border-radius: 12px; font-weight: 700; cursor: pointer; }
.btn-submit { padding: 12px 24px; background: #10b981; color: white; border: none; border-radius: 12px; font-weight: 700; cursor: pointer; }
.btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }

@media (max-width: 768px) {
  .form-grid { grid-template-columns: 1fr; }
}

.price-edit-input {
  width: 70px;
  padding: 2px 6px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  text-align: right;
  font-size: 12px;
  background-color: #f8fafc;
  transition: all 0.2s;
}
.price-edit-input:focus {
  background-color: #ffffff;
  border-color: #10b981;
  outline: none;
}
</style>
