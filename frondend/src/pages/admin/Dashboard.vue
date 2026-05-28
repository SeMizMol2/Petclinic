<template>
  <div class="dashboard-wrapper">
    
    <div class="clinic-card header-card">
      <div class="header-content">
        <div class="icon-box">📊</div>
        <div class="title-box">
          <h1>ภาพรวมระบบ (Dashboard)</h1>
          <p>รายงานสถิติการนัดหมาย และสรุปรายรับ-รายจ่ายของคลินิก</p>
        </div>
      </div>
      
      <div class="filter-box">
        <select v-model="selectedMonth" @change="fetchDashboardData" class="custom-select">
          <option v-for="(m, index) in months" :key="index" :value="index + 1">{{ m }}</option>
        </select>
        <select v-model="selectedYear" @change="fetchDashboardData" class="custom-select">
          <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
        </select>
      </div>
    </div>

    <div class="summary-grid">
      <div class="summary-card">
        <div class="card-icon bg-blue-100 text-blue-600">📅</div>
        <div class="card-info">
          <p>จำนวนนัดหมาย (ประจำเดือน)</p>
          <h3>{{ summary.totalAppointments }} <span class="unit">รายการ</span></h3>
        </div>
      </div>

      <div class="summary-card">
        <div class="card-icon bg-emerald-100 text-emerald-600">💰</div>
        <div class="card-info">
          <p>รายรับรวม (เดือนนี้)</p>
          <h3 class="text-emerald-600">{{ formatPrice(summary.totalRevenue) }} <span class="unit">บาท</span></h3>
        </div>
      </div>

      <div class="summary-card">
        <div class="card-icon bg-rose-100 text-rose-600">💸</div>
        <div class="card-info">
          <p>รายจ่ายรวม (เดือนนี้)</p>
          <h3 class="text-rose-600">{{ formatPrice(summary.totalExpense) }} <span class="unit">บาท</span></h3>
        </div>
      </div>

      <div class="summary-card highlight-card">
        <div class="card-icon bg-white/20 text-white">🏆</div>
        <div class="card-info text-white">
          <p class="text-emerald-50">กำไรสุทธิ (เดือนนี้)</p>
          <h3 class="text-white">{{ formatPrice(summary.netProfit) }} <span class="unit text-emerald-100">บาท</span></h3>
        </div>
      </div>
    </div>

    <div class="charts-grid">
      <div class="clinic-card chart-container">
        <h3>📈 สถิติการนัดหมาย (30 วันย้อนหลัง)</h3>
        <div class="chart-box">
          <Line v-if="!loading" :data="apptChartData" :options="lineChartOptions" />
        </div>
      </div>

      <div class="clinic-card chart-container">
        <h3>📊 รายรับ - รายจ่าย รายวัน (ประจำเดือน)</h3>
        <div class="chart-box">
          <Bar v-if="!loading" :data="financialChartData" :options="barChartOptions" />
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

// นำเข้าเครื่องมือสร้างกราฟจาก Chart.js
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler } from 'chart.js'
import { Line, Bar } from 'vue-chartjs'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler)

// State สำหรับตัวกรอง
const currentDate = new Date()
const selectedMonth = ref(currentDate.getMonth() + 1)
const selectedYear = ref(currentDate.getFullYear())
const loading = ref(true)

const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']
const years = computed(() => {
  const current = new Date().getFullYear()
  return [current - 2, current - 1, current, current + 1]
})

// State สำหรับข้อมูลสรุป
const summary = ref({
  totalRevenue: 0,
  totalExpense: 0,
  netProfit: 0,
  totalAppointments: 0
})

// State ข้อมูลกราฟดิบ
const rawApptData = ref([])
const rawRevData = ref([])
const rawExpData = ref([])

// รูปแบบตัวเลขเงิน
const formatPrice = (val) => {
  return Number(val).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ----------------------------------------------------
// ดึงข้อมูลจาก API
// ----------------------------------------------------
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

  } catch (err) {
    console.error("Dashboard Fetch Error:", err)
  } finally {
    loading.value = false
  }
}

// ----------------------------------------------------
// กราฟที่ 1: นัดหมาย 30 วัน (Line Chart)
// ----------------------------------------------------
const apptChartData = computed(() => {
  const labels = rawApptData.value.map(item => {
    const d = new Date(item.date)
    return `${d.getDate()}/${d.getMonth()+1}`
  })
  const data = rawApptData.value.map(item => parseInt(item.count))

  return {
    labels,
    datasets: [{
      label: 'จำนวนนัดหมาย (คิว)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderColor: '#3b82f6',
      borderWidth: 2,
      pointBackgroundColor: '#ffffff',
      pointBorderColor: '#3b82f6',
      pointRadius: 4,
      fill: true,
      tension: 0.4,
      data
    }]
  }
})

const lineChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: { beginAtZero: true, ticks: { stepSize: 1 } },
    x: { grid: { display: false } }
  }
}

// ----------------------------------------------------
// กราฟที่ 2: รายรับ VS รายจ่าย (Bar Chart)
// ----------------------------------------------------
const financialChartData = computed(() => {
  // สร้าง Array วันที่ 1-31 ของเดือนนั้น
  const daysInMonth = new Date(selectedYear.value, selectedMonth.value, 0).getDate()
  const labels = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  
  const revDataArray = new Array(daysInMonth).fill(0)
  const expDataArray = new Array(daysInMonth).fill(0)

  rawRevData.value.forEach(item => {
    revDataArray[item.day - 1] = parseFloat(item.total)
  })
  rawExpData.value.forEach(item => {
    expDataArray[item.day - 1] = parseFloat(item.total)
  })

  return {
    labels,
    datasets: [
      {
        label: 'รายรับ',
        backgroundColor: '#10b981',
        borderRadius: 4,
        data: revDataArray
      },
      {
        label: 'รายจ่าย',
        backgroundColor: '#f43f5e',
        borderRadius: 4,
        data: expDataArray
      }
    ]
  }
})

const barChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { 
    legend: { position: 'top', align: 'end', labels: { usePointStyle: true, boxWidth: 8 } } 
  },
  scales: {
    y: { beginAtZero: true },
    x: { grid: { display: false } }
  }
}

onMounted(() => {
  fetchDashboardData()
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap');

.dashboard-wrapper {
  font-family: 'Sarabun', sans-serif;
  background-color: #f8fafc;
  min-height: 100vh;
  padding: 24px;
  color: #1e293b;
  box-sizing: border-box;
}

/* --- Cards Shared --- */
.clinic-card {
  background: #ffffff;
  border-radius: 20px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
  border: 1px solid #f1f5f9;
  padding: 24px;
}

/* --- Header Section --- */
.header-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
}
.header-content { display: flex; align-items: center; gap: 16px; }
.icon-box {
  width: 56px; height: 56px;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  border-radius: 16px; display: flex; align-items: center; justify-content: center;
  font-size: 28px; color: white; box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.3);
}
.title-box h1 { margin: 0; font-size: 24px; font-weight: 800; color: #0f172a; }
.title-box p { margin: 4px 0 0 0; font-size: 14px; color: #64748b; font-weight: 500; }

/* Filter Dropdown */
.filter-box { display: flex; gap: 12px; }
.custom-select {
  padding: 10px 16px; font-size: 15px; font-family: inherit; font-weight: 600;
  color: #334155; background-color: #f8fafc; border: 1px solid #e2e8f0;
  border-radius: 12px; outline: none; cursor: pointer; transition: 0.2s;
}
.custom-select:hover { border-color: #cbd5e1; }
.custom-select:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1); background-color: #ffffff; }

/* --- Summary Cards Grid --- */
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 24px;
  margin-bottom: 24px;
}

.summary-card {
  background: #ffffff; border-radius: 20px; padding: 24px;
  display: flex; align-items: center; gap: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); border: 1px solid #f1f5f9;
  transition: transform 0.2s ease;
}
.summary-card:hover { transform: translateY(-3px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }

.card-icon {
  width: 56px; height: 56px; border-radius: 16px;
  display: flex; align-items: center; justify-content: center; font-size: 26px; flex-shrink: 0;
}
.card-info { flex-grow: 1; }
.card-info p { margin: 0 0 4px 0; font-size: 13px; color: #64748b; font-weight: 600; }
.card-info h3 { margin: 0; font-size: 26px; font-weight: 800; color: #0f172a; line-height: 1; }
.unit { font-size: 13px; font-weight: 500; color: #94a3b8; }

.highlight-card {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border: none;
}

/* --- Charts Grid --- */
.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;
}
.chart-container h3 {
  margin: 0 0 20px 0; font-size: 16px; font-weight: 800; color: #1e293b;
}
.chart-box {
  position: relative; height: 300px; width: 100%;
}

@media (max-width: 768px) {
  .charts-grid { grid-template-columns: 1fr; }
  .header-card { flex-direction: column; align-items: flex-start; }
}
</style>