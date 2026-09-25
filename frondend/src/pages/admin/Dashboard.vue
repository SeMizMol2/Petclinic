<template>
  <div class="dashboard-page" :aria-busy="loading">
    <section v-if="dashboardError" class="dashboard-alert" role="alert">
      <div>
        <strong>ยังอัปเดตข้อมูลไม่ได้</strong>
        <p>{{ dashboardError }}</p>
      </div>
      <button type="button" @click="fetchDashboardData">ลองอีกครั้ง</button>
    </section>

    <div v-else-if="lastUpdatedLabel" class="dashboard-freshness" role="status">
      ข้อมูลล่าสุดเมื่อ {{ lastUpdatedLabel }}
    </div>

    <section class="overview-grid">
      <article class="overview-card overview-card-main">
        <div class="overview-head">
          <div>
            <p class="eyebrow">สรุปประจำเดือน</p>
            <h1>ภาพรวมของคลินิก</h1>
          </div>
          <div class="period-card">
            <label class="filter-field">
              <span>เดือน</span>
              <select v-model="selectedMonth" @change="fetchDashboardData">
                <option v-for="(month, index) in months" :key="month" :value="index + 1">{{ month }}</option>
              </select>
            </label>
            <label class="filter-field">
              <span>ปี</span>
              <select v-model="selectedYear" @change="fetchDashboardData">
                <option v-for="year in years" :key="year" :value="year">{{ year }}</option>
              </select>
            </label>
          </div>
        </div>

        <p class="overview-text">
          ใช้มุมมองนี้เพื่อตรวจสอบปริมาณงานหน้าร้าน กระแสเงินสด และผลประกอบการของช่วงเวลาที่เลือก
        </p>

        <div class="metric-grid">
          <button type="button" class="metric-card" :disabled="!hasDashboardData" @click="openDetailModal('appointment', $event)">
            <div class="metric-top">
              <span class="metric-code"><AppIcon name="calendar" :size="17" /></span>
              <span class="metric-label">นัดหมาย</span>
            </div>
            <strong>{{ formatCount(summary?.totalAppointments) }}</strong>
            <small>จำนวนคิวที่ถูกบันทึกในเดือนนี้</small>
          </button>

          <button type="button" class="metric-card" :disabled="!hasDashboardData" @click="openDetailModal('revenue', $event)">
            <div class="metric-top">
              <span class="metric-code revenue"><AppIcon name="receipt" :size="17" /></span>
              <span class="metric-label">รายรับรวม</span>
            </div>
            <strong>{{ formatMoney(summary?.totalRevenue) }}</strong>
            <small>รวมจากใบเสร็จที่ชำระเรียบร้อยแล้ว</small>
          </button>

          <button type="button" class="metric-card" :disabled="!hasDashboardData" @click="openDetailModal('expense', $event)">
            <div class="metric-top">
              <span class="metric-code expense"><AppIcon name="expense" :size="17" /></span>
              <span class="metric-label">รายจ่ายรวม</span>
            </div>
            <strong>{{ formatMoney(summary?.totalExpense) }}</strong>
            <small>ต้นทุนและค่าใช้จ่ายทั้งหมดของคลินิก</small>
          </button>
        </div>
      </article>

      <article class="overview-card overview-card-side">
        <p class="eyebrow">ผลประกอบการ</p>
        <h2>กำไรสุทธิ</h2>
        <strong class="net-profit">{{ formatMoney(summary?.netProfit) }}</strong>
        <p class="side-text">คำนวณจากรายรับหักรายจ่ายของช่วงเวลาที่เลือก</p>

        <div class="mini-breakdown">
          <div>
            <span>รายรับ</span>
            <strong class="positive">{{ formatMoney(summary?.totalRevenue) }}</strong>
          </div>
          <div>
            <span>รายจ่าย</span>
            <strong class="negative">{{ formatMoney(summary?.totalExpense) }}</strong>
          </div>
        </div>
      </article>
    </section>

    <section class="content-grid">
      <article class="panel-card">
        <div class="panel-head">
          <div>
            <p class="eyebrow">แนวโน้มนัดหมาย</p>
            <h3>สถิติการนัดหมายรายวัน</h3>
          </div>
          <span class="panel-chip">{{ months[selectedMonth - 1] }} {{ selectedYear }}</span>
        </div>
        <p class="panel-text">ดูความหนาแน่นของคิวในแต่ละวันเพื่อช่วยวางแผนงานหน้าร้านและทีมรักษา</p>

        <div class="chart-frame">
          <div v-if="loading" class="empty-state loading-state" role="status">กำลังโหลดข้อมูล...</div>
          <div v-else-if="dashboardError" class="empty-state error-state">
            <strong>ไม่สามารถแสดงกราฟได้</strong>
            <p>ลองโหลดข้อมูลอีกครั้งเมื่อการเชื่อมต่อพร้อม</p>
          </div>
          <div v-else-if="hasAppointmentData" class="chart-box">
            <Line :data="apptChartData" :options="lineChartOptions" role="img" aria-label="กราฟจำนวนการนัดหมายรายวัน" />
          </div>
          <div v-else class="empty-state">
            <strong>ยังไม่มีข้อมูลนัดหมาย</strong>
            <p>เมื่อมีการบันทึกคิว ระบบจะแสดงรูปแบบการนัดหมายของเดือนนี้ที่นี่</p>
          </div>
        </div>
      </article>

      <article class="panel-card">
        <div class="panel-head">
          <div>
            <p class="eyebrow">กระแสเงินสด</p>
            <h3>รายรับและรายจ่ายรายวัน</h3>
          </div>
          <span class="panel-chip">สรุปประจำเดือน</span>
        </div>
        <p class="panel-text">เปรียบเทียบกระแสเงินเข้าออกในแต่ละวันเพื่อมองเห็นช่วงที่ต้นทุนสูงหรือรายรับเด่น</p>

        <div class="chart-frame">
          <div v-if="loading" class="empty-state loading-state" role="status">กำลังโหลดข้อมูล...</div>
          <div v-else-if="dashboardError" class="empty-state error-state">
            <strong>ไม่สามารถแสดงกราฟได้</strong>
            <p>ลองโหลดข้อมูลอีกครั้งเมื่อการเชื่อมต่อพร้อม</p>
          </div>
          <div v-else-if="hasFinancialData" class="chart-box">
            <Bar :data="financialChartData" :options="barChartOptions" role="img" aria-label="กราฟรายรับและรายจ่ายรายวัน" />
          </div>
          <div v-else class="empty-state">
            <strong>ยังไม่มีข้อมูลการเงินในช่วงนี้</strong>
            <p>เมื่อมีรายรับหรือรายจ่าย ระบบจะสรุปเป็นกราฟให้ดูที่นี่</p>
          </div>
        </div>
      </article>
    </section>

    <div v-if="isModalOpen" class="modal-overlay" @click.self="closeDetailModal" @keydown.esc="closeDetailModal">
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="dashboard-detail-title">
        <div class="modal-header">
          <div>
            <p class="eyebrow">ข้อมูลรายละเอียด</p>
            <h3 id="dashboard-detail-title">{{ getModalTitle() }}</h3>
            <p class="modal-subtitle">{{ months[selectedMonth - 1] }} {{ selectedYear }}</p>
          </div>
          <button ref="modalCloseButton" class="close-btn" type="button" @click="closeDetailModal">ปิด</button>
        </div>

        <div class="table-wrap">
          <table v-if="modalType === 'appointment'" class="data-table">
            <thead>
              <tr>
                <th>วันและเวลา</th>
                <th>สัตว์เลี้ยง</th>
                <th>เจ้าของ</th>
                <th>เหตุผลการนัดหมาย</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in details.appointments" :key="idx">
                <td>{{ formatDate(item.appt_date) }} {{ formatTime(item.appt_time) }}</td>
                <td>{{ item.pet_name || '-' }}</td>
                <td>{{ item.owner_name || '-' }}</td>
                <td>{{ item.appt_reason || '-' }}</td>
              </tr>
              <tr v-if="details.appointments.length === 0">
                <td colspan="4" class="table-empty">ไม่มีข้อมูลการนัดหมายในเดือนนี้</td>
              </tr>
            </tbody>
          </table>

          <table v-if="modalType === 'revenue'" class="data-table">
            <thead>
              <tr>
                <th>วันที่ชำระ</th>
                <th>เลขที่ใบเสร็จ</th>
                <th>ลูกค้า</th>
                <th class="right">ยอดเงิน</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in details.revenue" :key="idx">
                <td>{{ formatDateTime(item.pay_date) }}</td>
                <td>{{ item.receipt_id }}</td>
                <td>{{ item.owner_name || 'ลูกค้าทั่วไป' }}</td>
                <td class="right positive">+{{ formatMoney(item.total_amount) }}</td>
              </tr>
              <tr v-if="details.revenue.length === 0">
                <td colspan="4" class="table-empty">ไม่มีข้อมูลรายรับในเดือนนี้</td>
              </tr>
            </tbody>
          </table>

          <table v-if="modalType === 'expense'" class="data-table">
            <thead>
              <tr>
                <th>วันที่จ่าย</th>
                <th>รายการ</th>
                <th>หมวดหมู่</th>
                <th class="right">ยอดเงิน</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in details.expense" :key="idx">
                <td>{{ formatDate(item.exp_date) }}</td>
                <td>{{ item.exp_title }}</td>
                <td>{{ item.category_name || 'ทั่วไป' }}</td>
                <td class="right negative">-{{ formatMoney(item.exp_amount) }}</td>
              </tr>
              <tr v-if="details.expense.length === 0">
                <td colspan="4" class="table-empty">ไม่มีข้อมูลรายจ่ายในเดือนนี้</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import axios from 'axios'
import AppIcon from '../../components/AppIcon.vue'
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip
} from 'chart.js'
import { Bar, Line } from 'vue-chartjs'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler)

const currentDate = new Date()
const selectedMonth = ref(currentDate.getMonth() + 1)
const selectedYear = ref(currentDate.getFullYear())
const loading = ref(true)
const dashboardError = ref('')
const lastUpdatedAt = ref(null)

const months = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม'
]

const years = computed(() => {
  const current = new Date().getFullYear()
  return [current - 2, current - 1, current, current + 1]
})

const summary = ref(null)
const rawApptData = ref([])
const rawRevData = ref([])
const rawExpData = ref([])
const details = ref({ appointments: [], revenue: [], expense: [] })

const isModalOpen = ref(false)
const modalType = ref('')
const modalCloseButton = ref(null)
let modalTrigger = null

const formatPrice = (value) =>
  Number(value).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatMoney = (value) => value == null ? '—' : `${formatPrice(value)} บาท`
const formatCount = (value) => value == null ? '—' : Number(value).toLocaleString('th-TH')

const hasDashboardData = computed(() => Boolean(summary.value) && !loading.value)
const lastUpdatedLabel = computed(() =>
  lastUpdatedAt.value
    ? lastUpdatedAt.value.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    : ''
)

const formatDate = (dateStr) =>
  dateStr ? new Date(dateStr).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'

const formatDateTime = (dateStr) =>
  dateStr
    ? new Date(dateStr).toLocaleString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : '-'

const formatTime = (timeStr) => (timeStr ? String(timeStr).substring(0, 5) : '-')

const fetchDashboardData = async () => {
  loading.value = true
  dashboardError.value = ''
  summary.value = null
  rawApptData.value = []
  rawRevData.value = []
  rawExpData.value = []
  details.value = { appointments: [], revenue: [], expense: [] }
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get('http://localhost:3000/api/dashboard', {
      headers: { Authorization: `Bearer ${token}` },
      params: { month: selectedMonth.value, year: selectedYear.value }
    })

    summary.value = res.data.summary
    rawApptData.value = res.data.charts.appointments
    rawRevData.value = res.data.charts.revenue
    rawExpData.value = res.data.charts.expense
    details.value = res.data.details
    lastUpdatedAt.value = new Date()
  } catch (err) {
    dashboardError.value = err.code === 'ECONNABORTED'
      ? 'การเชื่อมต่อใช้เวลานานเกินไป กรุณาลองอีกครั้ง'
      : (err.response?.data?.message || 'ไม่สามารถเชื่อมต่อข้อมูล Dashboard ได้ กรุณาตรวจสอบการเข้าสู่ระบบแล้วลองอีกครั้ง')
  } finally {
    loading.value = false
  }
}

const openDetailModal = (type, event) => {
  if (!hasDashboardData.value) return
  modalType.value = type
  modalTrigger = event?.currentTarget || null
  isModalOpen.value = true
}

const closeDetailModal = () => {
  isModalOpen.value = false
  nextTick(() => modalTrigger?.focus())
}

watch(isModalOpen, async (open) => {
  if (!open) return
  await nextTick()
  modalCloseButton.value?.focus()
})

const getModalTitle = () => {
  if (modalType.value === 'appointment') return 'รายละเอียดการนัดหมาย'
  if (modalType.value === 'revenue') return 'รายละเอียดรายรับ'
  if (modalType.value === 'expense') return 'รายละเอียดรายจ่าย'
  return ''
}

const hasAppointmentData = computed(() =>
  rawApptData.value.some((item) => Number.parseInt(item.count, 10) > 0)
)

const hasFinancialData = computed(() => {
  const hasRevenue = rawRevData.value.some((item) => Number.parseFloat(item.total) > 0)
  const hasExpense = rawExpData.value.some((item) => Number.parseFloat(item.total) > 0)
  return hasRevenue || hasExpense
})

const apptChartData = computed(() => {
  const labels = rawApptData.value.map((item) => {
    const date = new Date(item.date)
    return `${date.getDate()}/${date.getMonth() + 1}`
  })

  return {
    labels,
    datasets: [
      {
        label: 'จำนวนการนัดหมาย',
        backgroundColor: 'rgba(37, 99, 235, 0.10)',
        borderColor: '#2563eb',
        borderWidth: 2,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: '#2563eb',
        pointRadius: 3,
        fill: true,
        tension: 0.35,
        data: rawApptData.value.map((item) => Number.parseInt(item.count, 10))
      }
    ]
  }
})

const lineChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: {
      beginAtZero: true,
      ticks: { stepSize: 1, color: '#64748b' },
      grid: { color: 'rgba(148, 163, 184, 0.14)' }
    },
    x: {
      ticks: { color: '#64748b' },
      grid: { display: false }
    }
  }
}

const financialChartData = computed(() => {
  const daysInMonth = new Date(selectedYear.value, selectedMonth.value, 0).getDate()
  const labels = Array.from({ length: daysInMonth }, (_, index) => index + 1)
  const revenueByDay = new Array(daysInMonth).fill(0)
  const expenseByDay = new Array(daysInMonth).fill(0)

  rawRevData.value.forEach((item) => {
    revenueByDay[item.day - 1] = Number.parseFloat(item.total)
  })
  rawExpData.value.forEach((item) => {
    expenseByDay[item.day - 1] = Number.parseFloat(item.total)
  })

  return {
    labels,
    datasets: [
      { label: 'รายรับ', backgroundColor: '#10b981', borderRadius: 8, data: revenueByDay, maxBarThickness: 18 },
      { label: 'รายจ่าย', backgroundColor: '#fb7185', borderRadius: 8, data: expenseByDay, maxBarThickness: 18 }
    ]
  }
})

const barChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
      align: 'end',
      labels: {
        color: '#475569',
        boxWidth: 12,
        usePointStyle: true,
        pointStyle: 'rectRounded'
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: { color: '#64748b' },
      grid: { color: 'rgba(148, 163, 184, 0.14)' }
    },
    x: {
      ticks: { color: '#64748b' },
      grid: { display: false }
    }
  }
}

onMounted(fetchDashboardData)
</script>
