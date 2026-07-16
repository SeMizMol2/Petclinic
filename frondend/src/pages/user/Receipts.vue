<template>
  <div class="receipts-page user-page">
    <section class="hero-section">
      <div>
        <p class="eyebrow">Payments</p>
        <h1>ประวัติการชำระเงิน</h1>
        <p class="hero-text">ตรวจสอบยอดชำระ ช่องทางชำระเงิน และสถานะใบเสร็จได้จากหน้านี้</p>
      </div>
    </section>

    <section class="summary-grid" v-if="receipts.length">
      <div class="summary-card">
        <span>ใบเสร็จทั้งหมด</span>
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

          <div :class="['payment-note-panel', isPaid(item) ? 'done' : 'pending']">
            <strong>{{ isPaid(item) ? 'รายการนี้ชำระเรียบร้อยแล้ว' : 'รายการนี้ยังค้างชำระ' }}</strong>
            <span v-if="!isPaid(item)">กรุณาติดต่อชำระเงินกับทางโรงพยาบาลสัตว์</span>
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

const authHeader = () => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const isPaid = (item) => {
  const status = String(item.payment_status || '').trim()
  return status === 'ชำระเสร็จสิ้น' || status.includes('เสร็จ')
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

const formatCurrency = (amount) =>
  `${Number(amount || 0).toLocaleString('th-TH', {
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
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(217, 226, 236, 0.92);
  border-radius: 22px;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.07);
}

.hero-section,
.content-shell {
  padding: 28px;
}

.eyebrow {
  margin: 0 0 8px;
  color: #0f766e;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-section h1,
.receipt-card h2 {
  margin: 0;
  color: #0f172a;
}

.hero-text {
  margin: 10px 0 0;
  color: #64748b;
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
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.summary-card strong {
  font-size: 28px;
  color: #0f172a;
}

.empty-state {
  text-align: center;
  color: #64748b;
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
  color: #64748b;
}

.receipt-amount {
  text-align: right;
}

.receipt-amount strong {
  font-size: 22px;
  color: #0f172a;
}

.receipt-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}

.meta-item {
  background: #f8fafc;
  border-radius: 16px;
  border: 1px solid #e8eef5;
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

.payment-note-panel {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
  align-items: center;
  border-top: 1px solid #e5e7eb;
  padding-top: 16px;
  font-size: 13px;
}

.payment-note-panel strong {
  border-radius: 999px;
  padding: 8px 12px;
}

.payment-note-panel.done strong {
  background: #dcfce7;
  color: #047857;
}

.payment-note-panel.pending strong {
  background: #fee2e2;
  color: #b91c1c;
}

.payment-note-panel span {
  color: #64748b;
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
