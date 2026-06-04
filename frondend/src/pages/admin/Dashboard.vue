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
      <div class="summary-card clickable" @click="openDetailModal('appointment')" title="คลิกเพื่อดูรายละเอียดนัดหมาย">
        <div class="card-icon bg-blue-100 text-blue-600">📅</div>
        <div class="card-info">
          <p>จำนวนนัดหมาย (ประจำเดือน)</p>
          <h3>{{ summary.totalAppointments }} <span class="unit">รายการ</span></h3>
        </div>
        <div class="click-hint">ดูรายละเอียด ➔</div>
      </div>

      <div class="summary-card clickable" @click="openDetailModal('revenue')" title="คลิกเพื่อดูรายละเอียดบิลรายรับ">
        <div class="card-icon bg-emerald-100 text-emerald-600">💰</div>
        <div class="card-info">
          <p>รายรับรวม (ประจำเดือน)</p>
          <h3 class="text-emerald-600">{{ formatPrice(summary.totalRevenue) }} <span class="unit">บาท</span></h3>
        </div>
        <div class="click-hint text-emerald-600">ดูรายละเอียด ➔</div>
      </div>

      <div class="summary-card clickable" @click="openDetailModal('expense')" title="คลิกเพื่อดูรายละเอียดรายจ่าย">
        <div class="card-icon bg-rose-100 text-rose-600">💸</div>
        <div class="card-info">
          <p>รายจ่ายรวม (ประจำเดือน)</p>
          <h3 class="text-rose-600">{{ formatPrice(summary.totalExpense) }} <span class="unit">บาท</span></h3>
        </div>
        <div class="click-hint text-rose-600">ดูรายละเอียด ➔</div>
      </div>

      <div class="summary-card highlight-card">
        <div class="card-icon bg-white/20 text-white">🏆</div>
        <div class="card-info text-white">
          <p class="text-emerald-50">กำไรสุทธิ (ประจำเดือน)</p>
          <h3 class="text-white">{{ formatPrice(summary.netProfit) }} <span class="unit text-emerald-100">บาท</span></h3>
        </div>
      </div>
    </div>

    <div class="charts-grid">
      <div class="clinic-card chart-container">
        <h3>📈 สถิติการนัดหมาย (รายวัน)</h3>
        <div class="chart-box"><Line v-if="!loading" :data="apptChartData" :options="lineChartOptions" /></div>
      </div>
      <div class="clinic-card chart-container">
        <h3>📊 รายรับ - รายจ่าย รายวัน</h3>
        <div class="chart-box"><Bar v-if="!loading" :data="financialChartData" :options="barChartOptions" /></div>
      </div>
    </div>

    <div v-if="isModalOpen" class="custom-modal-overlay" @click.self="isModalOpen = false">
      <div class="custom-modal-box modal-lg">
        
        <div class="modal-header">
          <div class="modal-title">
            <div class="modal-icon">{{ getModalIcon() }}</div>
            <div>
              <h3>{{ getModalTitle() }}</h3>
              <p>ประจำเดือน {{ months[selectedMonth - 1] }} {{ selectedYear }}</p>
            </div>
          </div>
          <button @click="isModalOpen = false" class="close-btn">✕</button>
        </div>
        
        <div class="table-responsive">
          <table v-if="modalType === 'appointment'" class="clinic-table">
            <thead>
              <tr><th>วันที่และเวลา</th><th>สัตว์เลี้ยง</th><th>เจ้าของ</th><th>สาเหตุ</th></tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in details.appointments" :key="idx">
                <td>{{ formatDate(item.appt_date) }} <span class="text-emerald-600 font-bold ml-2">⏱️ {{ formatTime(item.appt_time) }}</span></td>
                <td>🐾 {{ item.pet_name || '-' }}</td>
                <td>คุณ{{ item.owner_name || '-' }}</td>
                <td>{{ item.appt_reason || '-' }}</td>
              </tr>
              <tr v-if="details.appointments.length === 0"><td colspan="4" class="text-center py-8 text-gray-500">ไม่มีข้อมูลนัดหมายในเดือนนี้</td></tr>
            </tbody>
          </table>

          <table v-if="modalType === 'revenue'" class="clinic-table">
            <thead>
              <tr><th>วันที่ชำระ</th><th>เลขที่ใบเสร็จ</th><th>ลูกค้า</th><th class="text-right">ยอดเงิน (บาท)</th></tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in details.revenue" :key="idx">
                <td>{{ formatDateTime(item.pay_date) }}</td>
                <td class="font-bold">{{ item.receipt_id }}</td>
                <td>คุณ{{ item.owner_name || 'ลูกค้าทั่วไป' }}</td>
                <td class="text-right text-emerald-600 font-bold">+{{ formatPrice(item.total_amount) }}</td>
              </tr>
              <tr v-if="details.revenue.length === 0"><td colspan="4" class="text-center py-8 text-gray-500">ไม่มีข้อมูลรายรับในเดือนนี้</td></tr>
            </tbody>
          </table>

          <table v-if="modalType === 'expense'" class="clinic-table">
            <thead>
              <tr><th>วันที่จ่าย</th><th>รายการ</th><th>หมวดหมู่</th><th class="text-right">ยอดเงิน (บาท)</th></tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in details.expense" :key="idx">
                <td>{{ formatDate(item.exp_date) }}</td>
                <td class="font-bold">{{ item.exp_title }}</td>
                <td><span class="category-badge">{{ item.category_name || 'ทั่วไป' }}</span></td>
                <td class="text-right text-rose-500 font-bold">-{{ formatPrice(item.exp_amount) }}</td>
              </tr>
              <tr v-if="details.expense.length === 0"><td colspan="4" class="text-center py-8 text-gray-500">ไม่มีข้อมูลรายจ่ายในเดือนนี้</td></tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler } from 'chart.js'
import { Line, Bar } from 'vue-chartjs'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler)

const currentDate = new Date()
const selectedMonth = ref(currentDate.getMonth() + 1)
const selectedYear = ref(currentDate.getFullYear())
const loading = ref(true)

const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']
const years = computed(() => {
  const current = new Date().getFullYear()
  return [current - 2, current - 1, current, current + 1]
})

// ข้อมูลหลัก
const summary = ref({ totalRevenue: 0, totalExpense: 0, netProfit: 0, totalAppointments: 0 })
const rawApptData = ref([])
const rawRevData = ref([])
const rawExpData = ref([])
const details = ref({ appointments: [], revenue: [], expense: [] }) // เก็บข้อมูลแสดงในตาราง

// Modal State
const isModalOpen = ref(false)
const modalType = ref('')

// Utility Formatting
const formatPrice = (val) => Number(val).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'
const formatDateTime = (dateStr) => dateStr ? new Date(dateStr).toLocaleString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'
const formatTime = (timeStr) => timeStr ? timeStr.substring(0, 5) : '-'

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
    details.value = res.data.details // รับข้อมูลตารางมาเก็บไว้

  } catch (err) {
    console.error("Dashboard Fetch Error:", err)
  } finally {
    loading.value = false
  }
}

// Modal Functions
const openDetailModal = (type) => {
  modalType.value = type
  isModalOpen.value = true
}

const getModalTitle = () => {
  if (modalType.value === 'appointment') return 'รายละเอียดการนัดหมาย'
  if (modalType.value === 'revenue') return 'รายละเอียดรายรับ (ใบเสร็จ)'
  if (modalType.value === 'expense') return 'รายละเอียดรายจ่าย'
  return ''
}

const getModalIcon = () => {
  if (modalType.value === 'appointment') return '📅'
  if (modalType.value === 'revenue') return '💰'
  if (modalType.value === 'expense') return '💸'
  return '📋'
}

// Charts (เหมือนเดิม)
const apptChartData = computed(() => {
  const labels = rawApptData.value.map(item => {
    const d = new Date(item.date)
    return `${d.getDate()}/${d.getMonth()+1}`
  })
  return {
    labels,
    datasets: [{ label: 'นัดหมาย (คิว)', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: '#3b82f6', borderWidth: 2, pointBackgroundColor: '#ffffff', fill: true, tension: 0.4, data: rawApptData.value.map(item => parseInt(item.count)) }]
  }
})
const lineChartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } }, x: { grid: { display: false } } } }

const financialChartData = computed(() => {
  const daysInMonth = new Date(selectedYear.value, selectedMonth.value, 0).getDate()
  const labels = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const revDataArray = new Array(daysInMonth).fill(0)
  const expDataArray = new Array(daysInMonth).fill(0)

  rawRevData.value.forEach(item => { revDataArray[item.day - 1] = parseFloat(item.total) })
  rawExpData.value.forEach(item => { expDataArray[item.day - 1] = parseFloat(item.total) })

  return { labels, datasets: [ { label: 'รายรับ', backgroundColor: '#10b981', borderRadius: 4, data: revDataArray }, { label: 'รายจ่าย', backgroundColor: '#f43f5e', borderRadius: 4, data: expDataArray } ] }
})
const barChartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', align: 'end' } }, scales: { y: { beginAtZero: true }, x: { grid: { display: false } } } }

onMounted(() => { fetchDashboardData() })
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap');

.dashboard-wrapper { font-family: 'Sarabun', sans-serif; background-color: #f8fafc; min-height: 100vh; padding: 24px; color: #1e293b; box-sizing: border-box; }
.clinic-card { background: #ffffff; border-radius: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #f1f5f9; padding: 24px; }

/* Header & Select */
.header-card { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; margin-bottom: 24px; }
.header-content { display: flex; align-items: center; gap: 16px; }
.icon-box { width: 56px; height: 56px; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 28px; color: white; box-shadow: 0 10px 15px -3px rgba(99,102,241,0.3); }
.title-box h1 { margin: 0; font-size: 24px; font-weight: 800; }
.title-box p { margin: 4px 0 0 0; font-size: 14px; color: #64748b; font-weight: 500; }
.filter-box { display: flex; gap: 12px; }
.custom-select { padding: 10px 16px; font-size: 15px; font-family: inherit; font-weight: 600; border-radius: 12px; border: 1px solid #e2e8f0; outline: none; cursor: pointer; }

/* Summary Cards (Clickable) */
.summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 24px; }
.summary-card { background: #ffffff; border-radius: 20px; padding: 24px; display: flex; align-items: center; gap: 16px; border: 1px solid #f1f5f9; position: relative; overflow: hidden; }
.clickable { cursor: pointer; transition: all 0.2s ease; }
.clickable:hover { transform: translateY(-4px); box-shadow: 0 15px 25px -5px rgba(0,0,0,0.1); border-color: #cbd5e1; }
.click-hint { position: absolute; bottom: 8px; right: 16px; font-size: 11px; font-weight: 700; color: #3b82f6; opacity: 0; transition: opacity 0.2s; }
.clickable:hover .click-hint { opacity: 1; }

.card-icon { width: 56px; height: 56px; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 26px; flex-shrink: 0; }
.card-info { flex-grow: 1; }
.card-info p { margin: 0 0 4px 0; font-size: 13px; color: #64748b; font-weight: 600; }
.card-info h3 { margin: 0; font-size: 26px; font-weight: 800; line-height: 1; }
.unit { font-size: 13px; font-weight: 500; color: #94a3b8; }
.highlight-card { background: linear-gradient(135deg, #10b981 0%, #059669 100%); border: none; }

/* Charts */
.charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 24px; }
.chart-container h3 { margin: 0 0 20px 0; font-size: 16px; font-weight: 800; }
.chart-box { position: relative; height: 300px; width: 100%; }

/* Modal & Tables */
.custom-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(15,23,42,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; }
.custom-modal-box { background-color: #ffffff; width: 90%; border-radius: 24px; padding: 32px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); animation: slideUp 0.3s cubic-bezier(0.16,1,0.3,1); }
.modal-lg { max-width: 800px; max-height: 80vh; display: flex; flex-direction: column; }
@keyframes slideUp { from { opacity: 0; transform: translateY(30px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }

.modal-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 1px solid #f1f5f9; padding-bottom: 20px; }
.modal-title { display: flex; gap: 16px; align-items: center; }
.modal-icon { background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 24px; border: 1px solid #e2e8f0; }
.modal-title h3 { margin: 0; font-size: 20px; font-weight: 800; }
.modal-title p { margin: 4px 0 0 0; font-size: 13px; color: #64748b; font-weight: 600; }
.close-btn { background: #f1f5f9; border: none; width: 36px; height: 36px; border-radius: 50%; color: #64748b; cursor: pointer; font-weight: bold; transition: all 0.2s; }
.close-btn:hover { background: #fee2e2; color: #ef4444; }

.table-responsive { overflow-y: auto; flex-grow: 1; }
.clinic-table { width: 100%; border-collapse: collapse; min-width: 600px; }
.clinic-table th { background-color: #f8fafc; padding: 14px 20px; text-align: left; font-size: 13px; font-weight: 700; color: #64748b; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; position: sticky; top: 0; }
.clinic-table td { padding: 14px 20px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; font-size: 14px; }
.clinic-table tbody tr:hover { background-color: #f8fafc; }

.category-badge { display: inline-block; background: #f1f5f9; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; color: #475569; }
.text-right { text-align: right; }
.font-bold { font-weight: 700; color: #1e293b; }
.ml-2 { margin-left: 8px; }
</style>