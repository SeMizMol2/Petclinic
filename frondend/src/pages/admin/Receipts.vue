<template>
  <div class="admin-page receipts-admin-page">
    <section class="page-header">
      <div>
        <p class="eyebrow">Finance</p>
        <h1>ใบเสร็จรับเงิน</h1>
        <p class="subtitle">ตรวจสอบสถานะการชำระ ดูรายละเอียด และพิมพ์ใบเสร็จให้ลูกค้า</p>
      </div>
      <button class="ghost-btn" @click="fetchReceipts">รีเฟรช</button>
    </section>

    <section class="panel-card create-panel">
      <div>
        <h2>สร้างใบเสร็จจากการรักษา</h2>
        <p>กรอกรหัสการรักษา เช่น TR001 เพื่อออกใบเสร็จจากยอดค่ารักษาที่บันทึกไว้</p>
      </div>
      <form class="create-form" @submit.prevent="createReceipt">
        <input v-model="newTreatmentId" placeholder="รหัสการรักษา" required />
        <select v-model="newPayMethod">
          <option value="">ยังไม่ระบุช่องทาง</option>
          <option :value="cashMethod">เงินสด</option>
          <option :value="transferMethod">โอนเงิน</option>
        </select>
        <button class="primary-btn" type="submit">สร้างใบเสร็จ</button>
      </form>
    </section>

    <section class="toolbar">
      <input v-model="searchQuery" class="search-input" placeholder="ค้นหาเลขที่ใบเสร็จ เจ้าของ หรือสัตว์เลี้ยง" />
      <select v-model="statusFilter">
        <option value="">ทุกสถานะ</option>
        <option :value="unpaidStatus">ยังไม่ได้ชำระ</option>
        <option :value="paidStatus">ชำระเสร็จสิ้น</option>
      </select>
    </section>

    <section class="table-panel">
      <div v-if="loading" class="state">กำลังโหลดข้อมูล...</div>
      <div v-else-if="error" class="state error">{{ error }}</div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>เลขที่ใบเสร็จ</th>
              <th>วันออกบิล</th>
              <th>ลูกค้า</th>
              <th>สัตว์เลี้ยง</th>
              <th class="right">ยอดเงิน</th>
              <th>สถานะ</th>
              <th class="center">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="receipt in filteredReceipts" :key="receipt.receipt_id">
              <td>
                <strong>{{ receipt.receipt_id }}</strong>
                <span class="muted">{{ receipt.treatment_id || '-' }}</span>
              </td>
              <td>{{ formatDateTime(receipt.issue_date) }}</td>
              <td>
                <div>{{ receipt.owner_name || '-' }}</div>
                <span class="muted">{{ receipt.owner_tel || '-' }}</span>
              </td>
              <td>{{ receipt.pet_name || '-' }}</td>
              <td class="right money">{{ formatPrice(receipt.total_amount) }}</td>
              <td>
                <span :class="['status', isPaid(receipt) ? 'paid' : 'unpaid']">
                  {{ isPaid(receipt) ? 'ชำระแล้ว' : 'ค้างชำระ' }}
                </span>
              </td>
              <td class="center">
                <div class="actions">
                  <button class="action view" @click="openReceipt(receipt)">ดู/พิมพ์</button>
                  <button v-if="!isPaid(receipt)" class="action paid" @click="markPaid(receipt)">รับชำระ</button>
                  <button v-else class="action unpaid" @click="markUnpaid(receipt)">ยกเลิกชำระ</button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredReceipts.length === 0">
              <td colspan="7" class="state">ยังไม่มีข้อมูลใบเสร็จ</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div v-if="selectedReceipt" class="modal-overlay" @click.self="closeReceipt">
      <div class="modal receipt-modal">
        <div class="modal-actions no-print">
          <button class="ghost-btn" @click="closeReceipt">ปิด</button>
          <button class="primary-btn" @click="printReceipt">พิมพ์ใบเสร็จ</button>
        </div>

        <section id="printable-receipt" class="print-sheet">
          <header class="receipt-head">
            <div>
              <h2>Pet Clinic</h2>
              <p>ระบบจัดการข้อมูลการรักษาและบริการสัตว์เลี้ยง</p>
            </div>
            <div class="receipt-title">
              <h1>ใบเสร็จรับเงิน</h1>
              <p>{{ selectedReceipt.receipt.receipt_id }}</p>
            </div>
          </header>

          <div class="info-grid">
            <div>
              <h3>ข้อมูลลูกค้า</h3>
              <p><strong>ชื่อ:</strong> {{ selectedReceipt.receipt.owner_name || '-' }}</p>
              <p><strong>เบอร์โทร:</strong> {{ selectedReceipt.receipt.owner_tel || '-' }}</p>
            </div>
            <div>
              <h3>ข้อมูลการรักษา</h3>
              <p><strong>สัตว์เลี้ยง:</strong> {{ selectedReceipt.receipt.pet_name || '-' }}</p>
              <p><strong>ประเภท/สายพันธุ์:</strong> {{ selectedReceipt.receipt.pet_type || '-' }} / {{ selectedReceipt.receipt.pet_breed || '-' }}</p>
              <p><strong>วันที่รักษา:</strong> {{ formatDateTime(selectedReceipt.receipt.treatment_date) }}</p>
              <p><strong>ผู้ออกเอกสาร:</strong> {{ selectedReceipt.receipt.issued_by || selectedReceipt.receipt.user_id || '-' }}</p>
            </div>
          </div>

          <table class="print-table">
            <thead>
              <tr>
                <th>ประเภทรายการ</th>
                <th>รายละเอียด</th>
                <th class="right">จำนวนเงิน</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in selectedReceipt.items" :key="item.detail_id">
                <td>{{ item.income_type || '-' }}</td>
                <td>{{ item.description || '-' }}</td>
                <td class="right">{{ formatPrice(item.amount) }}</td>
              </tr>
              <tr v-if="selectedReceipt.items.length === 0">
                <td colspan="3" class="center">ไม่มีรายการย่อยในใบเสร็จ</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" class="right total-label">ยอดสุทธิ</td>
                <td class="right total-value">{{ formatPrice(selectedReceipt.receipt.total_amount) }}</td>
              </tr>
            </tfoot>
          </table>

          <div class="receipt-footer">
            <p><strong>สถานะ:</strong> {{ selectedReceipt.receipt.payment_status || '-' }}</p>
            <p><strong>ช่องทางชำระ:</strong> {{ selectedReceipt.receipt.pay_method || '-' }}</p>
            <p><strong>วันที่ออกเอกสาร:</strong> {{ formatDateTime(selectedReceipt.receipt.issue_date) }}</p>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'

const receipts = ref([])
const selectedReceipt = ref(null)
const loading = ref(false)
const error = ref('')
const searchQuery = ref('')
const statusFilter = ref('')
const newTreatmentId = ref('')
const newPayMethod = ref('')

const paidStatus = 'ชำระเสร็จสิ้น'
const unpaidStatus = 'ยังไม่ได้ชำระ'
const cashMethod = 'เงินสด'
const transferMethod = 'โอนเงิน'

const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` })

const normalizeStatus = (value) => {
  const text = String(value || '').trim()
  if (text === paidStatus || text.includes('เสร็จ') || text.includes('ชำระแล้ว')) return paidStatus
  return unpaidStatus
}

const isPaid = (receipt) => normalizeStatus(receipt.payment_status) === paidStatus

const formatPrice = (value) =>
  Number(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatDateTime = (value) => {
  if (!value) return '-'
  return new Date(value).toLocaleString('th-TH')
}

const fetchReceipts = async () => {
  try {
    loading.value = true
    error.value = ''
    const res = await axios.get('http://localhost:3000/api/receipts', { headers: headers() })
    receipts.value = res.data.data || []
  } catch (err) {
    error.value = err.response?.data?.message || 'โหลดข้อมูลใบเสร็จไม่สำเร็จ'
  } finally {
    loading.value = false
  }
}

const filteredReceipts = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return receipts.value.filter((receipt) => {
    const matchesSearch =
      !q ||
      [receipt.receipt_id, receipt.treatment_id, receipt.owner_name, receipt.pet_name].some((value) =>
        String(value || '').toLowerCase().includes(q)
      )
    const matchesStatus = !statusFilter.value || normalizeStatus(receipt.payment_status) === statusFilter.value
    return matchesSearch && matchesStatus
  })
})

const openReceipt = async (receipt) => {
  try {
    const res = await axios.get(`http://localhost:3000/api/receipts/detail/${receipt.receipt_id}`, { headers: headers() })
    selectedReceipt.value = res.data.data
  } catch (err) {
    alert(err.response?.data?.message || 'โหลดรายละเอียดใบเสร็จไม่สำเร็จ')
  }
}

const createReceipt = async () => {
  try {
    const res = await axios.post(
      'http://localhost:3000/api/receipts',
      { treatment_id: newTreatmentId.value.trim(), pay_method: newPayMethod.value || null },
      { headers: headers() }
    )
    newTreatmentId.value = ''
    newPayMethod.value = ''
    await fetchReceipts()
    if (res.data?.data?.receipt_id) {
      await openReceipt(res.data.data)
    }
  } catch (err) {
    alert(err.response?.data?.message || 'สร้างใบเสร็จไม่สำเร็จ')
  }
}

const closeReceipt = () => {
  selectedReceipt.value = null
}

const updateStatus = async (receipt, paymentStatus) => {
  try {
    await axios.put(
      `http://localhost:3000/api/receipts/${receipt.receipt_id}/status`,
      { payment_status: paymentStatus, pay_method: receipt.pay_method || cashMethod },
      { headers: headers() }
    )
    await fetchReceipts()
    if (selectedReceipt.value?.receipt?.receipt_id === receipt.receipt_id) {
      await openReceipt(receipt)
    }
  } catch (err) {
    alert(err.response?.data?.message || 'อัปเดตสถานะไม่สำเร็จ')
  }
}

const markPaid = (receipt) => updateStatus(receipt, paidStatus)
const markUnpaid = (receipt) => updateStatus(receipt, unpaidStatus)

const printReceipt = () => {
  const printable = document.getElementById('printable-receipt')
  if (!printable) return

  const printWindow = window.open('', '_blank', 'width=900,height=700')
  if (!printWindow) {
    window.print()
    return
  }

  printWindow.document.write(`
    <html>
      <head>
        <title>Receipt</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111827; margin: 24px; }
          h1, h2, h3 { margin-top: 0; }
          .receipt-head { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #111827; padding-bottom: 18px; margin-bottom: 20px; }
          .receipt-head p, .receipt-title p { margin: 4px 0 0; color: #475569; }
          .receipt-title { text-align: right; }
          .info-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; margin-bottom: 22px; }
          .info-grid p { margin: 5px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #d1d5db; padding: 10px 12px; text-align: left; }
          th { background: #f3f4f6; }
          .right { text-align: right; }
          .total-label { font-weight: 800; }
          .total-value { font-size: 18px; font-weight: 900; }
          .receipt-footer { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 20px; border-top: 1px solid #d1d5db; padding-top: 14px; }
          .receipt-footer p { margin: 0; }
        </style>
      </head>
      <body>${printable.innerHTML}</body>
    </html>
  `)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
  printWindow.close()
}

onMounted(fetchReceipts)
</script>

<style scoped>
.receipts-admin-page {
  display: grid;
  gap: 20px;
}

.create-panel {
  padding: 20px 22px;
}

.create-panel h2 {
  margin: 0;
  color: #0f172a;
  font-size: 20px;
}

.create-panel p {
  margin: 8px 0 0;
  color: #64748b;
}

.create-form {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-top: 18px;
}

.toolbar select {
  min-width: 180px;
}

.money {
  font-weight: 800;
  color: #047857;
}

.status {
  display: inline-flex;
  padding: 5px 9px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 800;
}

.status.paid {
  background: #dcfce7;
  color: #166534;
}

.status.unpaid {
  background: #fee2e2;
  color: #991b1b;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.action {
  border: 0;
  border-radius: 10px;
  padding: 8px 10px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.action.view {
  background: #ccfbf1;
  color: #0f766e;
}

.action.paid {
  background: #dcfce7;
  color: #166534;
}

.action.unpaid {
  background: #fee2e2;
  color: #991b1b;
}

.receipt-modal {
  width: min(900px, 100%);
}

.print-sheet {
  background: #fff;
  border-radius: 18px;
  padding: 32px;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.25);
}

.receipt-head {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  border-bottom: 2px solid #111827;
  padding-bottom: 18px;
  margin-bottom: 20px;
}

.receipt-head h2,
.receipt-title h1 {
  margin: 0;
}

.receipt-head p,
.receipt-title p {
  margin: 4px 0 0;
  color: #475569;
}

.receipt-title {
  text-align: right;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
  margin-bottom: 22px;
}

.info-grid h3 {
  margin: 0 0 8px;
  font-size: 16px;
}

.info-grid p {
  margin: 5px 0;
}

.print-table {
  width: 100%;
  min-width: 0;
  border-collapse: collapse;
  margin-top: 10px;
}

.print-table th,
.print-table td {
  border: 1px solid #d1d5db;
  padding: 10px 12px;
}

.print-table th {
  background: #f3f4f6;
}

.total-label {
  font-weight: 800;
}

.total-value {
  font-size: 18px;
  font-weight: 900;
}

.receipt-footer {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 20px;
  border-top: 1px solid #d1d5db;
  padding-top: 14px;
}

.receipt-footer p {
  margin: 0;
}

@media (max-width: 760px) {
  .create-form {
    flex-direction: column;
    align-items: stretch;
  }

  .create-form input,
  .create-form select,
  .create-form button {
    width: 100%;
  }

  .info-grid,
  .receipt-footer {
    grid-template-columns: 1fr;
  }

  .receipt-head {
    flex-direction: column;
  }

  .receipt-title {
    text-align: left;
  }
}

@media print {
  body * {
    visibility: hidden !important;
  }
  #printable-receipt,
  #printable-receipt * {
    visibility: visible !important;
  }
  #printable-receipt {
    position: fixed;
    left: 0;
    top: 0;
    width: 100%;
    box-shadow: none;
    border-radius: 0;
  }
  .no-print {
    display: none !important;
  }
}
</style>
