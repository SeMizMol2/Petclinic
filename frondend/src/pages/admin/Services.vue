<template>
  <div class="service-page">
    <div class="clinic-card header-card">
      <div class="header-content">
        <div class="icon-box">SV</div>
        <div class="title-box">
          <h1>จัดการข้อมูลบริการและค่ารักษา</h1>
          <p>เพิ่ม แก้ไข หรือลบบริการ พร้อมกำหนดรูปภาพสำหรับหน้าแรกของระบบ</p>
        </div>
      </div>
      <button @click="openAddModal" class="btn-primary">
        <span class="icon-sm">+</span> เพิ่มบริการใหม่
      </button>
    </div>

    <div class="search-section">
      <div class="search-wrapper">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="ค้นหาชื่อบริการ หรือ รหัสบริการ..."
          class="custom-search-input"
        >
      </div>
    </div>

    <div class="clinic-card table-card">
      <div class="table-responsive">
        <table class="clinic-table">
          <thead>
            <tr>
              <th width="14%">รหัสบริการ</th>
              <th width="16%">รูป</th>
              <th width="30%">รายการบริการ</th>
              <th width="18%" class="text-right">ราคา (บาท)</th>
              <th width="22%" class="text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="svc in filteredServices" :key="svc.service_id">
              <td><span class="service-id-badge">{{ svc.service_id }}</span></td>
              <td>
                <div class="service-image-cell">
                  <img
                    v-if="svc.service_image"
                    :src="getImagePreview(svc.service_image)"
                    :alt="svc.service_name"
                    class="service-thumb"
                  >
                  <div v-else class="service-thumb service-thumb-empty">No image</div>
                </div>
              </td>
              <td>
                <div class="font-bold">{{ svc.service_name }}</div>
                <div class="text-sm text-gray-500 mt-1">
                  {{ svc.service_desc || 'ไม่มีรายละเอียดเพิ่มเติม' }}
                </div>
                <div v-if="svc.service_image" class="service-path">
                  {{ svc.service_image }}
                </div>
              </td>
              <td class="text-right font-bold text-emerald-600">
                {{ formatPrice(svc.service_price) }}
              </td>
              <td class="text-center">
                <div class="action-buttons">
                  <button @click="openEditModal(svc)" class="btn-action edit" title="แก้ไข">✎</button>
                  <button @click="deleteService(svc.service_id)" class="btn-action delete" title="ลบ">🗑</button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredServices.length === 0">
              <td colspan="5" class="empty-state">
                <div class="empty-icon">⋯</div>
                <h3>ไม่มีรายการบริการในระบบ</h3>
                <p>กดปุ่ม "เพิ่มบริการใหม่" เพื่อเริ่มต้นสร้างบริการพร้อมรูปประกอบ</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="isModalOpen" class="custom-modal-overlay" @click.self="isModalOpen = false">
      <div class="custom-modal-box">
        <div class="modal-header">
          <div class="modal-title">
            <div class="modal-icon">{{ modalMode === 'add' ? '+' : '✎' }}</div>
            <div>
              <h3>{{ modalMode === 'add' ? 'เพิ่มบริการใหม่' : 'แก้ไขข้อมูลบริการ' }}</h3>
              <p>ระบุชื่อ ราคา รายละเอียด และ path รูป เพื่อให้หน้า Home ดึงไปแสดงได้ทันที</p>
            </div>
          </div>
          <button @click="isModalOpen = false" class="close-btn">×</button>
        </div>

        <form @submit.prevent="handleSubmit">
          <div class="form-group" v-if="modalMode === 'edit'">
            <label>รหัสบริการ</label>
            <input v-model="form.service_id" type="text" class="custom-input readonly-input" readonly>
          </div>

          <div class="form-group">
            <label>ชื่อรายการบริการ <span class="required">*</span></label>
            <input
              v-model="form.service_name"
              type="text"
              class="custom-input"
              required
              placeholder="เช่น ค่าตรวจสุขภาพเบื้องต้น, ผ่าตัดทำหมันแมว"
            >
          </div>

          <div class="form-group">
            <label>ราคามาตรฐาน (บาท) <span class="required">*</span></label>
            <input
              v-model="form.service_price"
              type="number"
              step="0.01"
              class="custom-input"
              required
              placeholder="0.00"
            >
          </div>

          <div class="form-group">
            <label>รายละเอียดเพิ่มเติม</label>
            <textarea
              v-model="form.service_desc"
              rows="3"
              class="custom-input"
              placeholder="เงื่อนไขหรือรายละเอียดเพิ่มเติมของบริการนี้..."
            ></textarea>
          </div>

          <div class="form-group">
            <label>รูปบริการ / Path รูป</label>
            <input
              v-model="form.service_image"
              type="text"
              class="custom-input"
              placeholder="/images/services/xray.jpg หรือ https://example.com/xray.jpg"
            >
            <small class="field-help">
              แนะนำให้เก็บรูปไว้ใน public เช่น /images/services/xray.jpg แล้วกรอก path นี้ลงมา
            </small>
          </div>

          <div v-if="form.service_image" class="image-preview-block">
            <img :src="getImagePreview(form.service_image)" alt="preview" class="image-preview">
          </div>

          <div class="modal-actions">
            <button type="button" @click="isModalOpen = false" class="btn-cancel">ยกเลิก</button>
            <button type="submit" class="btn-submit">บันทึกข้อมูล</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'

const services = ref([])
const searchQuery = ref('')
const isModalOpen = ref(false)
const modalMode = ref('add')
const form = ref({})

const formatPrice = (val) =>
  Number(val || 0).toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })

const getImagePreview = (value) => {
  if (!value) return ''
  if (/^https?:\/\//i.test(value) || value.startsWith('/')) return value
  return `/${value.replace(/^\/+/, '')}`
}

const fetchServices = async () => {
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get('http://localhost:3000/api/services', {
      headers: { Authorization: `Bearer ${token}` }
    })
    services.value = Array.isArray(res.data) ? res.data : []
  } catch (err) {
    console.error(err)
  }
}

const openAddModal = () => {
  modalMode.value = 'add'
  form.value = {
    service_name: '',
    service_price: '',
    service_desc: '',
    service_image: ''
  }
  isModalOpen.value = true
}

const openEditModal = (svc) => {
  modalMode.value = 'edit'
  form.value = {
    ...svc,
    service_image: svc.service_image || ''
  }
  isModalOpen.value = true
}

const buildPayload = () => ({
  service_name: form.value.service_name,
  service_price: form.value.service_price,
  service_desc: form.value.service_desc,
  service_image: form.value.service_image?.trim() || null
})

const handleSubmit = async () => {
  try {
    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }
    const payload = buildPayload()

    if (modalMode.value === 'add') {
      await axios.post('http://localhost:3000/api/services', payload, { headers })
    } else {
      await axios.put(`http://localhost:3000/api/services/${form.value.service_id}`, payload, { headers })
    }

    isModalOpen.value = false
    await fetchServices()
  } catch (err) {
    alert('ดำเนินการไม่สำเร็จ')
    console.error(err)
  }
}

const deleteService = async (id) => {
  if (!confirm('ยืนยันที่จะลบบริการนี้ออกจากระบบหรือไม่?')) return

  try {
    const token = localStorage.getItem('token')
    await axios.delete(`http://localhost:3000/api/services/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    await fetchServices()
  } catch (err) {
    alert('ไม่สามารถลบได้ (อาจมีประวัติการใช้งานบริการนี้อยู่ในระบบ)')
    console.error(err)
  }
}

const filteredServices = computed(() =>
  services.value.filter((s) => {
    const query = searchQuery.value.toLowerCase()
    return (
      String(s.service_name || '').toLowerCase().includes(query) ||
      String(s.service_id || '').toLowerCase().includes(query)
    )
  })
)

onMounted(() => {
  fetchServices()
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap');

.service-page { font-family: 'Sarabun', sans-serif; background-color: #f8fafc; min-height: 100vh; padding: 24px; color: #1e293b; box-sizing: border-box; }
.clinic-card { background: #ffffff; border-radius: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #f1f5f9; padding: 24px; margin-bottom: 24px; }
.header-card { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
.header-content { display: flex; align-items: center; gap: 16px; }
.icon-box { width: 56px; height: 56px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 800; color: white; box-shadow: 0 10px 15px -3px rgba(245, 158, 11, 0.3); }
.title-box h1 { margin: 0; font-size: 24px; font-weight: 800; }
.title-box p { margin: 4px 0 0 0; font-size: 14px; color: #64748b; font-weight: 500; }
.btn-primary { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 700; font-size: 15px; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 14px 0 rgba(245, 158, 11, 0.3); transition: 0.2s; font-family: inherit; }
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4); }

.search-section { margin-bottom: 24px; }
.search-wrapper { max-width: 420px; }
.custom-search-input { width: 100%; padding: 14px 16px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; font-size: 15px; outline: none; transition: 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-family: inherit; }
.custom-search-input:focus { border-color: #f59e0b; box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.1); }

.table-card { padding: 0; overflow: hidden; }
.table-responsive { width: 100%; overflow-x: auto; }
.clinic-table { width: 100%; border-collapse: collapse; min-width: 900px; }
.clinic-table th { background-color: #f8fafc; padding: 16px 24px; text-align: left; font-size: 13px; font-weight: 700; color: #64748b; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; }
.clinic-table td { padding: 16px 24px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
.clinic-table tbody tr:hover { background-color: #fffbeb; }

.service-id-badge { background: #f1f5f9; color: #475569; padding: 6px 12px; border-radius: 8px; font-weight: 700; font-size: 13px; border: 1px solid #e2e8f0; }
.font-bold { font-weight: 700; }
.text-emerald-600 { color: #059669; }
.text-sm { font-size: 13px; }
.text-gray-500 { color: #64748b; }
.mt-1 { margin-top: 4px; }
.text-center { text-align: center; }
.text-right { text-align: right; }
.text-xs { font-size: 12px; }

.service-image-cell { display: flex; align-items: center; }
.service-thumb { width: 84px; height: 64px; border-radius: 12px; object-fit: cover; background: #f8fafc; border: 1px solid #e2e8f0; display: block; }
.service-thumb-empty { display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 12px; font-weight: 600; }
.service-path { margin-top: 6px; font-size: 12px; color: #94a3b8; word-break: break-all; }

.action-buttons { display: flex; justify-content: center; gap: 8px; }
.btn-action { background: #ffffff; border: 1px solid #e2e8f0; width: 36px; height: 36px; border-radius: 10px; cursor: pointer; transition: 0.2s; display: inline-flex; align-items: center; justify-content: center; }
.btn-action.edit:hover { background: #fffbeb; border-color: #fde68a; transform: translateY(-2px); }
.btn-action.delete:hover { background: #fef2f2; border-color: #fecaca; transform: translateY(-2px); }

.empty-state { padding: 60px 20px; text-align: center; }
.empty-icon { font-size: 48px; background: #f8fafc; width: 100px; height: 100px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px; border: 1px solid #e2e8f0; }

.custom-modal-overlay { position: fixed; inset: 0; background-color: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; }
.custom-modal-box { background-color: #ffffff; width: 90%; max-width: 560px; border-radius: 24px; padding: 32px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes slideUp { from { opacity: 0; transform: translateY(30px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
.modal-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 1px solid #f1f5f9; padding-bottom: 20px; }
.modal-title { display: flex; gap: 16px; align-items: center; }
.modal-icon { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 24px; }
.modal-title h3 { margin: 0; font-size: 20px; font-weight: 800; }
.modal-title p { margin: 4px 0 0 0; font-size: 13px; color: #64748b; }
.close-btn { background: #f1f5f9; border: none; width: 36px; height: 36px; border-radius: 50%; color: #64748b; cursor: pointer; font-weight: bold; transition: 0.2s; }
.close-btn:hover { background: #fee2e2; color: #ef4444; }

.form-group { margin-bottom: 20px; }
.form-group label { display: block; font-size: 14px; font-weight: 700; color: #334155; margin-bottom: 8px; }
.required { color: #ef4444; }
.custom-input { width: 100%; padding: 14px 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 14px; outline: none; font-family: inherit; transition: 0.2s; box-sizing: border-box; }
.custom-input:focus { background-color: #ffffff; border-color: #f59e0b; box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1); }
textarea.custom-input { resize: none; }
.readonly-input { background-color: #f1f5f9; color: #94a3b8; cursor: not-allowed; border-color: #e2e8f0; }
.field-help { display: block; margin-top: 8px; font-size: 12px; color: #64748b; }
.image-preview-block { margin-top: 8px; margin-bottom: 8px; }
.image-preview { width: 100%; max-height: 220px; object-fit: cover; border-radius: 16px; border: 1px solid #e2e8f0; background: #f8fafc; }

.modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 32px; padding-top: 20px; border-top: 1px solid #f1f5f9; }
.btn-cancel { padding: 12px 24px; background-color: #f1f5f9; color: #475569; border: none; border-radius: 12px; font-weight: 700; cursor: pointer; transition: 0.2s; font-family: inherit; }
.btn-cancel:hover { background-color: #e2e8f0; color: #1e293b; }
.btn-submit { padding: 12px 28px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; border: none; border-radius: 12px; font-weight: 700; cursor: pointer; transition: 0.2s; font-family: inherit; box-shadow: 0 4px 14px 0 rgba(245, 158, 11, 0.3); }
.btn-submit:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4); }
</style>
