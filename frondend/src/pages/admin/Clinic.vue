<template>
  <div class="clinic-page">
    <section class="page-header">
      <div>
        <p class="eyebrow">ข้อมูลคลินิก</p>
        <h1>ตั้งค่าคลินิก</h1>
        <p class="subtitle">ใช้กับหน้าหลัก ใบเสร็จ และข้อมูลอ้างอิงของระบบ</p>
      </div>
      <button class="primary-btn" :disabled="saving" @click="saveClinic">
        {{ saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล' }}
      </button>
    </section>

    <section class="panel">
      <div v-if="loading" class="state">กำลังโหลดข้อมูล...</div>
      <div v-else-if="error" class="state error">{{ error }}</div>
      <form v-else class="form-grid" @submit.prevent="saveClinic">
        <label>
          รหัสคลินิก
          <input v-model="form.clinic_id" readonly />
        </label>
        <label>
          ชื่อคลินิก
          <input v-model="form.clinic_name" required />
        </label>
        <label class="full">
          ที่อยู่
          <textarea v-model="form.address" rows="4"></textarea>
        </label>
        <label>
          เบอร์โทร
          <input v-model="form.tel" />
        </label>
        <label>
          เวลาทำการ
          <input v-model="form.open_hours" placeholder="เช่น ทุกวัน 09:00-18:00" />
        </label>
      </form>
    </section>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import axios from 'axios'

const loading = ref(false)
const saving = ref(false)
const error = ref('')
const form = ref({
  clinic_id: '01',
  clinic_name: '',
  address: '',
  tel: '',
  open_hours: ''
})

const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` })

const fetchClinic = async () => {
  try {
    loading.value = true
    error.value = ''
    const res = await axios.get('http://localhost:3000/api/admin/clinic', { headers: headers() })
    form.value = {
      clinic_id: res.data?.clinic_id || '01',
      clinic_name: res.data?.clinic_name || '',
      address: res.data?.address || '',
      tel: res.data?.tel || '',
      open_hours: res.data?.open_hours || ''
    }
  } catch (err) {
    error.value = err.response?.data?.message || 'โหลดข้อมูลคลินิกไม่สำเร็จ'
  } finally {
    loading.value = false
  }
}

const saveClinic = async () => {
  try {
    saving.value = true
    await axios.put('http://localhost:3000/api/admin/clinic', form.value, { headers: headers() })
    alert('บันทึกข้อมูลคลินิกสำเร็จ')
    fetchClinic()
  } catch (err) {
    alert(err.response?.data?.message || 'บันทึกข้อมูลคลินิกไม่สำเร็จ')
  } finally {
    saving.value = false
  }
}

onMounted(fetchClinic)
</script>

<style scoped>
.clinic-page { color: #1f2937; }
.page-header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 18px; }
.eyebrow { margin: 0 0 4px; color: #ea580c; font-size: 13px; font-weight: 700; }
h1 { margin: 0; font-size: 28px; font-weight: 800; }
.subtitle { margin: 6px 0 0; color: #64748b; }
.primary-btn { border: 0; border-radius: 8px; font-weight: 700; cursor: pointer; background: #ea580c; color: #fff; padding: 12px 18px; }
.primary-btn:disabled { opacity: 0.7; cursor: wait; }
.panel { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
label { display: grid; gap: 7px; font-weight: 700; color: #334155; }
input, textarea { width: 100%; box-sizing: border-box; padding: 11px 12px; border: 1px solid #dbe3ec; border-radius: 8px; font: inherit; }
textarea { resize: vertical; }
.full { grid-column: 1 / -1; }
.state { padding: 28px; text-align: center; color: #64748b; }
.state.error { color: #b91c1c; }
@media (max-width: 760px) {
  .page-header { flex-direction: column; }
  .primary-btn { width: 100%; }
  .form-grid { grid-template-columns: 1fr; }
}
</style>
