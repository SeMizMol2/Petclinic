<template>
  <div class="reports-page">
    <section class="page-header">
      <div>
        <p class="eyebrow">Reports</p>
        <h1>รายงานสรุประบบ</h1>
        <p class="subtitle">สรุปการรักษา รายงานการเงิน และรายงานการนัดหมายจากฐานข้อมูลจริงของคลินิก</p>
      </div>

      <div class="filters">
        <select v-model="selectedMonth" @change="fetchReports">
          <option v-for="(month, index) in months" :key="month" :value="index + 1">{{ month }}</option>
        </select>
        <select v-model="selectedYear" @change="fetchReports">
          <option v-for="year in years" :key="year" :value="year">{{ year }}</option>
        </select>
      </div>
    </section>

    <section class="tabs">
      <button :class="['tab-btn', activeTab === 'treatment' ? 'active' : '']" @click="activeTab = 'treatment'">
        รายสรุปการรักษา
      </button>
      <button :class="['tab-btn', activeTab === 'financial' ? 'active' : '']" @click="activeTab = 'financial'">
        รายงานการเงิน
      </button>
      <button :class="['tab-btn', activeTab === 'appointment' ? 'active' : '']" @click="activeTab = 'appointment'">
        รายงานการนัดหมาย
      </button>
    </section>

    <div v-if="loading" class="state">กำลังโหลดข้อมูลรายงาน...</div>
    <div v-else-if="error" class="state error">{{ error }}</div>

    <template v-else>
      <section v-if="activeTab === 'treatment'" class="report-section">
        <div class="summary-grid">
          <article class="summary-card">
            <span class="summary-label">จำนวนเคสการรักษา</span>
            <strong>{{ report.treatmentReport.totalCases }}</strong>
          </article>
          <article class="summary-card">
            <span class="summary-label">ยอดค่ารักษารวม</span>
            <strong>{{ formatPrice(report.treatmentReport.totalAmount) }}</strong>
          </article>
        </div>

        <div class="table-card">
          <table>
            <thead>
              <tr>
                <th>รหัสการรักษา</th>
                <th>วันที่รักษา</th>
                <th>สัตว์เลี้ยง</th>
                <th>เจ้าของ</th>
                <th>สัตวแพทย์</th>
                <th>วินิจฉัย</th>
                <th class="right">ยอดเงิน</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in report.treatmentReport.items" :key="item.treatment_id">
                <td><strong>{{ item.treatment_id }}</strong></td>
                <td>{{ formatDateTime(item.treatment_date) }}</td>
                <td>{{ item.pet_name || '-' }}</td>
                <td>{{ item.owner_name || '-' }}</td>
                <td>{{ item.vet_name || '-' }}</td>
                <td>{{ item.diagnosis || '-' }}</td>
                <td class="right money">{{ formatPrice(item.total_amount) }}</td>
              </tr>
              <tr v-if="report.treatmentReport.items.length === 0">
                <td colspan="7" class="state">ไม่มีข้อมูลการรักษาในช่วงเวลานี้</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-if="activeTab === 'financial'" class="report-section">
        <div class="summary-grid">
          <article class="summary-card">
            <span class="summary-label">รายรับรวม</span>
            <strong class="positive">{{ formatPrice(report.financialReport.totalRevenue) }}</strong>
          </article>
          <article class="summary-card">
            <span class="summary-label">รายจ่ายรวม</span>
            <strong class="negative">{{ formatPrice(report.financialReport.totalExpense) }}</strong>
          </article>
          <article class="summary-card">
            <span class="summary-label">กำไรสุทธิ</span>
            <strong>{{ formatPrice(report.financialReport.netProfit) }}</strong>
          </article>
        </div>

        <div class="dual-grid">
          <div class="table-card">
            <div class="card-title">รายการรายรับ</div>
            <table>
              <thead>
                <tr>
                  <th>ใบเสร็จ</th>
                  <th>วันที่ชำระ</th>
                  <th>ลูกค้า</th>
                  <th class="right">ยอดเงิน</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in report.financialReport.receipts" :key="item.receipt_id">
                  <td><strong>{{ item.receipt_id }}</strong></td>
                  <td>{{ formatDateTime(item.pay_date || item.issue_date) }}</td>
                  <td>{{ item.owner_name || '-' }}</td>
                  <td class="right money">{{ formatPrice(item.total_amount) }}</td>
                </tr>
                <tr v-if="report.financialReport.receipts.length === 0">
                  <td colspan="4" class="state">ไม่มีข้อมูลรายรับในช่วงเวลานี้</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="table-card">
            <div class="card-title">รายการรายจ่าย</div>
            <table>
              <thead>
                <tr>
                  <th>วันที่จ่าย</th>
                  <th>รายการ</th>
                  <th>หมวดหมู่</th>
                  <th class="right">ยอดเงิน</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in report.financialReport.expenses" :key="item.exp_id">
                  <td>{{ formatDate(item.exp_date) }}</td>
                  <td><strong>{{ item.exp_title }}</strong></td>
                  <td>{{ item.category_name || '-' }}</td>
                  <td class="right expense">{{ formatPrice(item.exp_amount) }}</td>
                </tr>
                <tr v-if="report.financialReport.expenses.length === 0">
                  <td colspan="4" class="state">ไม่มีข้อมูลรายจ่ายในช่วงเวลานี้</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section v-if="activeTab === 'appointment'" class="report-section">
        <div class="summary-grid">
          <article class="summary-card">
            <span class="summary-label">นัดหมายทั้งหมด</span>
            <strong>{{ report.appointmentReport.totalAppointments }}</strong>
          </article>
          <article class="summary-card">
            <span class="summary-label">ยืนยันแล้ว</span>
            <strong class="positive">{{ report.appointmentReport.confirmedAppointments }}</strong>
          </article>
          <article class="summary-card">
            <span class="summary-label">ยกเลิก</span>
            <strong class="negative">{{ report.appointmentReport.canceledAppointments }}</strong>
          </article>
        </div>

        <div class="table-card">
          <table>
            <thead>
              <tr>
                <th>รหัสนัดหมาย</th>
                <th>วันที่</th>
                <th>เวลา</th>
                <th>สัตว์เลี้ยง</th>
                <th>เจ้าของ</th>
                <th>เหตุผล</th>
                <th>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in report.appointmentReport.items" :key="item.appt_id">
                <td><strong>{{ item.appt_id }}</strong></td>
                <td>{{ formatDate(item.appt_date) }}</td>
                <td>{{ formatTime(item.appt_time) }}</td>
                <td>{{ item.pet_name || '-' }}</td>
                <td>{{ item.owner_name || '-' }}</td>
                <td>{{ item.appt_reason || item.cancel_reason || '-' }}</td>
                <td>
                  <span :class="['status-badge', String(item.appt_status || '').includes('ยกเลิก') ? 'cancel' : 'confirm']">
                    {{ item.appt_status || '-' }}
                  </span>
                </td>
              </tr>
              <tr v-if="report.appointmentReport.items.length === 0">
                <td colspan="7" class="state">ไม่มีข้อมูลการนัดหมายในช่วงเวลานี้</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'

const now = new Date()
const selectedMonth = ref(now.getMonth() + 1)
const selectedYear = ref(now.getFullYear())
const loading = ref(false)
const error = ref('')
const activeTab = ref('treatment')

const report = ref({
  treatmentReport: { totalCases: 0, totalAmount: 0, items: [] },
  financialReport: { totalRevenue: 0, totalExpense: 0, netProfit: 0, receipts: [], expenses: [] },
  appointmentReport: { totalAppointments: 0, confirmedAppointments: 0, canceledAppointments: 0, items: [] }
})

const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']
const years = computed(() => {
  const current = new Date().getFullYear()
  return [current - 2, current - 1, current, current + 1]
})

const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` })

const formatPrice = (value) =>
  Number(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatDate = (value) => (value ? new Date(value).toLocaleDateString('th-TH') : '-')
const formatDateTime = (value) => (value ? new Date(value).toLocaleString('th-TH') : '-')
const formatTime = (value) => (value ? String(value).slice(0, 5) : '-')

const fetchReports = async () => {
  try {
    loading.value = true
    error.value = ''
    const res = await axios.get('http://localhost:3000/api/reports', {
      headers: headers(),
      params: { month: selectedMonth.value, year: selectedYear.value }
    })
    report.value = res.data
  } catch (err) {
    error.value = err.response?.data?.message || 'โหลดข้อมูลรายงานไม่สำเร็จ'
  } finally {
    loading.value = false
  }
}

onMounted(fetchReports)
</script>

<style scoped>
.reports-page { color: #1f2937; }
.page-header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 18px; }
.eyebrow { margin: 0 0 4px; color: #0f766e; font-size: 13px; font-weight: 700; }
h1 { margin: 0; font-size: 28px; font-weight: 800; }
.subtitle { margin: 6px 0 0; color: #64748b; }
.filters { display: flex; gap: 10px; }
.filters select {
  padding: 12px 14px;
  border: 1px solid #dbe3ec;
  border-radius: 8px;
  background: #fff;
  font: inherit;
}
.tabs { display: flex; gap: 10px; margin-bottom: 18px; flex-wrap: wrap; }
.tab-btn {
  border: 1px solid #dbe3ec;
  background: #fff;
  color: #334155;
  padding: 10px 14px;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
}
.tab-btn.active { background: #0f766e; color: #fff; border-color: #0f766e; }
.summary-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-bottom: 18px; }
.summary-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 18px;
}
.summary-label { display: block; color: #64748b; font-size: 13px; margin-bottom: 8px; }
.summary-card strong { font-size: 24px; }
.positive { color: #047857; }
.negative { color: #b91c1c; }
.report-section { display: flex; flex-direction: column; gap: 18px; }
.dual-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
.table-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}
.card-title { padding: 16px 18px; font-weight: 800; border-bottom: 1px solid #e5e7eb; }
table { width: 100%; border-collapse: collapse; min-width: 720px; }
th, td { padding: 14px 16px; border-bottom: 1px solid #edf2f7; text-align: left; vertical-align: top; }
th { background: #f8fafc; color: #475569; font-size: 13px; }
.right { text-align: right; }
.money { font-weight: 800; color: #047857; }
.expense { font-weight: 800; color: #b91c1c; }
.status { padding: 28px; text-align: center; color: #64748b; }
.state.error { color: #b91c1c; }
.status-badge {
  display: inline-flex;
  padding: 5px 9px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 800;
}
.status-badge.confirm { background: #dcfce7; color: #166534; }
.status-badge.cancel { background: #fee2e2; color: #991b1b; }
@media (max-width: 920px) {
  .page-header, .filters { flex-direction: column; align-items: stretch; }
  .summary-grid, .dual-grid { grid-template-columns: 1fr; }
}
</style>
