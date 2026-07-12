<template>
  <div class="dashboard-page">
    <section class="overview-grid">
      <article class="overview-card overview-card-main">
        <div class="overview-head">
          <div>
            <p class="eyebrow">Monthly overview</p>
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
          <button type="button" class="metric-card" @click="openDetailModal('appointment')">
            <div class="metric-top">
              <span class="metric-code">AP</span>
              <span class="metric-label">นัดหมาย</span>
            </div>
            <strong>{{ summary.totalAppointments }}</strong>
            <small>จำนวนคิวที่ถูกบันทึกในเดือนนี้</small>
          </button>

          <button type="button" class="metric-card" @click="openDetailModal('revenue')">
            <div class="metric-top">
              <span class="metric-code revenue">RV</span>
              <span class="metric-label">รายรับรวม</span>
            </div>
            <strong>{{ formatPrice(summary.totalRevenue) }}</strong>
            <small>รวมจากใบเสร็จที่ชำระเรียบร้อยแล้ว</small>
          </button>

          <button type="button" class="metric-card" @click="openDetailModal('expense')">
            <div class="metric-top">
              <span class="metric-code expense">EX</span>
              <span class="metric-label">รายจ่ายรวม</span>
            </div>
            <strong>{{ formatPrice(summary.totalExpense) }}</strong>
            <small>ต้นทุนและค่าใช้จ่ายทั้งหมดของคลินิก</small>
          </button>
        </div>
      </article>

      <article class="overview-card overview-card-side">
        <p class="eyebrow">Net result</p>
        <h2>กำไรสุทธิ</h2>
        <strong class="net-profit">{{ formatPrice(summary.netProfit) }}</strong>
        <p class="side-text">คำนวณจากรายรับหักรายจ่ายของช่วงเวลาที่เลือก</p>

        <div class="mini-breakdown">
          <div>
            <span>รายรับ</span>
            <strong class="positive">{{ formatPrice(summary.totalRevenue) }}</strong>
          </div>
          <div>
            <span>รายจ่าย</span>
            <strong class="negative">{{ formatPrice(summary.totalExpense) }}</strong>
          </div>
        </div>
      </article>
    </section>

    <section class="content-grid">
      <article class="panel-card">
        <div class="panel-head">
          <div>
            <p class="eyebrow">Daily activity</p>
            <h3>สถิติการนัดหมายรายวัน</h3>
          </div>
          <span class="panel-chip">{{ months[selectedMonth - 1] }} {{ selectedYear }}</span>
        </div>
        <p class="panel-text">ดูความหนาแน่นของคิวในแต่ละวันเพื่อช่วยวางแผนงานหน้าร้านและทีมรักษา</p>

        <div class="chart-frame">
          <div v-if="loading" class="empty-state">กำลังโหลดข้อมูล...</div>
          <div v-else-if="hasAppointmentData" class="chart-box">
            <Line :data="apptChartData" :options="lineChartOptions" />
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
            <p class="eyebrow">Cash flow</p>
            <h3>รายรับและรายจ่ายรายวัน</h3>
          </div>
          <span class="panel-chip">สรุปประจำเดือน</span>
        </div>
        <p class="panel-text">เปรียบเทียบกระแสเงินเข้าออกในแต่ละวันเพื่อมองเห็นช่วงที่ต้นทุนสูงหรือรายรับเด่น</p>

        <div class="chart-frame">
          <div v-if="loading" class="empty-state">กำลังโหลดข้อมูล...</div>
          <div v-else-if="hasFinancialData" class="chart-box">
            <Bar :data="financialChartData" :options="barChartOptions" />
          </div>
          <div v-else class="empty-state">
            <strong>ยังไม่มีข้อมูลการเงินในช่วงนี้</strong>
            <p>เมื่อมีรายรับหรือรายจ่าย ระบบจะสรุปเป็นกราฟให้ดูที่นี่</p>
          </div>
        </div>
      </article>
    </section>

    <section class="summary-row">
      <div class="summary-card">
        <span>จำนวนคิว</span>
        <strong>{{ summary.totalAppointments }}</strong>
      </div>
      <div class="summary-card">
        <span>รายรับ</span>
        <strong class="positive">{{ formatPrice(summary.totalRevenue) }}</strong>
      </div>
      <div class="summary-card">
        <span>รายจ่าย</span>
        <strong class="negative">{{ formatPrice(summary.totalExpense) }}</strong>
      </div>
      <div class="summary-card">
        <span>กำไรสุทธิ</span>
        <strong>{{ formatPrice(summary.netProfit) }}</strong>
      </div>
    </section>

    <div v-if="isModalOpen" class="modal-overlay" @click.self="isModalOpen = false">
      <div class="modal-card">
        <div class="modal-header">
          <div>
            <p class="eyebrow">Detail view</p>
            <h3>{{ getModalTitle() }}</h3>
            <p class="modal-subtitle">{{ months[selectedMonth - 1] }} {{ selectedYear }}</p>
          </div>
          <button class="close-btn" type="button" @click="isModalOpen = false">ปิด</button>
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
                <td class="right positive">+{{ formatPrice(item.total_amount) }}</td>
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
                <td class="right negative">-{{ formatPrice(item.exp_amount) }}</td>
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
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'
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

const summary = ref({ totalRevenue: 0, totalExpense: 0, netProfit: 0, totalAppointments: 0 })
const rawApptData = ref([])
const rawRevData = ref([])
const rawExpData = ref([])
const details = ref({ appointments: [], revenue: [], expense: [] })

const isModalOpen = ref(false)
const modalType = ref('')

const formatPrice = (value) =>
  Number(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

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
  } catch (err) {
    console.error('Dashboard Fetch Error:', err)
  } finally {
    loading.value = false
  }
}

const openDetailModal = (type) => {
  modalType.value = type
  isModalOpen.value = true
}

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
