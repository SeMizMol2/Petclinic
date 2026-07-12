<template>
  <div class="receipts-page">
    <section class="hero-section">
      <div>
        <h1>ประวัติการชำระเงิน</h1>
        <p class="hero-text">ตรวจสอบยอดชำระ สถานะใบเสร็จ และอัปโหลดหลักฐานการโอนเงินได้จากหน้านี้</p>
      </div>
    </section>

    <section class="summary-grid" v-if="receipts.length">
      <div class="summary-card">
        <span>จำนวนใบเสร็จทั้งหมด</span>
        <strong>{{ receipts.length }}</strong>
      </div>
      <div class="summary-card">
        <span>ชำระแล้ว</span>
        <strong>{{ paidCount }}</strong>
      </div>
      <div class="summary-card">
        <span>ค้างชำระ</span>
        <strong>{{ unpaidCount }}</strong>
      </div>
    </section>

    <section class="content-shell">
      <div v-if="receipts.length === 0" class="empty-state">ยังไม่มีประวัติการชำระเงิน</div>

      <div v-else class="receipt-list">
        <article v-for="item in receipts" :key="item.receipt_id" class="receipt-card">
          <div class="receipt-main">
            <div>
              <span class="receipt-label">เลขที่ใบเสร็จ</span>
              <h2>{{ item.receipt_id }}</h2>
              <p>{{ formatDate(item.issue_date) }}</p>
            </div>
            <div class="receipt-amount">
              <span>ยอดรวม</span>
              <strong>{{ formatCurrency(item.total_amount) }}</strong>
            </div>
          </div>

          <div class="receipt-meta">
            <div class="meta-item">
              <span>ช่องทางชำระ</span>
              <strong>{{ item.pay_method || '-' }}</strong>
            </div>
            <div class="meta-item">
              <span>สถานะ</span>
              <strong :class="['status-badge', isPaid(item) ? 'paid' : 'unpaid']">
                {{ isPaid(item) ? 'ชำระแล้ว' : 'ค้างชำระ' }}
              </strong>
            </div>
          </div>

          <div class="upload-panel">
            <template v-if="isPaid(item)">
              <span class="upload-note done">รายการนี้ชำระเรียบร้อยแล้ว</span>
            </template>

            <template v-else-if="item.proof_image">
              <span class="upload-note waiting">ส่งหลักฐานแล้ว รอตรวจสอบจากคลินิก</span>
            </template>

            <template v-else>
              <div class="upload-box">
                <input type="file" accept="image/*" @change="(event) => onFileSelected(event, item.receipt_id)" />
                <button :disabled="uploadingId === item.receipt_id" @click="uploadProof(item.receipt_id)">
                  {{ uploadingId === item.receipt_id ? 'กำลังส่ง...' : 'ส่งหลักฐานการโอน' }}
                </button>
              </div>
            </template>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'

const receipts = ref([])
const selectedFiles = ref({})
const uploadingId = ref(null)

const authHeader = () => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const isPaid = (item) => {
  const status = String(item.payment_status || '').trim()
  return status === 'ชำระเสร็จสิ้น' || status.includes('เสร็จ') || status.includes('à¹€à¸ªà¸£à¹‡à¸ˆ')
}

const paidCount = computed(() => receipts.value.filter((item) => isPaid(item)).length)
const unpaidCount = computed(() => receipts.value.filter((item) => !isPaid(item)).length)

const formatDate = (dateString) => {
  if (!dateString) return '-'
  const parsedDate = new Date(dateString)
  if (Number.isNaN(parsedDate.getTime())) return '-'
  return parsedDate.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

const formatCurrency = (amount) => `${Number(amount || 0).toLocaleString('th-TH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})} บาท`

const loadReceipts = async () => {
  try {
    const userData = JSON.parse(localStorage.getItem('user'))
    if (!userData) return

    const response = await axios.get(`http://localhost:3000/api/receipts/my-receipts/${userData.user_id}`, {
      headers: authHeader()
    })

    if (response.data?.success) {
      receipts.value = response.data.data || []
    }
  } catch (error) {
    console.error('loadReceipts error:', error)
    alert('ไม่สามารถโหลดประวัติการชำระเงินได้')
  }
}

const onFileSelected = (event, receiptId) => {
  selectedFiles.value[receiptId] = event.target.files?.[0] || null
}

const uploadProof = async (receiptId) => {
  const file = selectedFiles.value[receiptId]

  if (!file) {
    alert('กรุณาเลือกไฟล์หลักฐานก่อน')
    return
  }

  try {
    uploadingId.value = receiptId
    const formData = new FormData()
    formData.append('proofImage', file)

    await axios.post(`http://localhost:3000/api/receipts/${receiptId}/proof`, formData, {
      headers: {
        ...authHeader(),
        'Content-Type': 'multipart/form-data'
      }
    })

    alert('ส่งหลักฐานการโอนเงินเรียบร้อยแล้ว')
    await loadReceipts()
  } catch (error) {
    console.error('uploadProof error:', error)
    alert(error.response?.data?.message || 'ไม่สามารถส่งหลักฐานการโอนเงินได้')
  } finally {
    uploadingId.value = null
  }
}

onMounted(loadReceipts)
</script>

<style scoped>
.receipts-page {
  display: grid;
  gap: 20px;
}

.hero-section,
.summary-card,
.content-shell,
.receipt-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.hero-section,
.content-shell {
  padding: 28px;
}

.hero-section h1,
.receipt-card h2 {
  margin: 0;
  color: #111827;
}

.hero-text {
  margin: 10px 0 0;
  color: #4b5563;
  line-height: 1.7;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.summary-card {
  padding: 20px;
}

.summary-card span,
.receipt-label,
.meta-item span,
.receipt-amount span {
  display: block;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
}

.summary-card strong {
  font-size: 28px;
  color: #111827;
}

.empty-state {
  text-align: center;
  color: #6b7280;
  padding: 24px 0;
}

.receipt-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.receipt-card {
  padding: 20px;
}

.receipt-main {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: start;
  margin-bottom: 16px;
}

.receipt-main p {
  margin: 8px 0 0;
  color: #6b7280;
}

.receipt-amount {
  text-align: right;
}

.receipt-amount strong {
  font-size: 22px;
  color: #111827;
}

.receipt-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}

.meta-item {
  background: #f8fafc;
  border-radius: 8px;
  padding: 14px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 7px 11px;
  font-size: 12px;
}

.paid {
  background: #dcfce7;
  color: #166534;
}

.unpaid {
  background: #fee2e2;
  color: #b91c1c;
}

.upload-panel {
  border-top: 1px solid #e5e7eb;
  padding-top: 16px;
}

.upload-note {
  display: inline-flex;
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 700;
}

.upload-note.done {
  background: #ecfdf5;
  color: #047857;
}

.upload-note.waiting {
  background: #eff6ff;
  color: #1d4ed8;
}

.upload-box {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.upload-box button {
  border: none;
  border-radius: 8px;
  padding: 10px 14px;
  background: #4f46e5;
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.upload-box button:disabled {
  opacity: 0.7;
  cursor: wait;
}

@media (max-width: 720px) {
  .summary-grid,
  .receipt-meta {
    grid-template-columns: 1fr;
  }

  .receipt-main {
    flex-direction: column;
  }

  .receipt-amount {
    text-align: left;
  }
}
</style>
