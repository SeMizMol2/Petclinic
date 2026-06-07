<template>
  <div class="p-8 max-w-7xl mx-auto">
    <div class="flex items-center justify-between mb-8">
      <div>
        <h2 class="text-3xl font-extrabold text-gray-800 tracking-tight">📅 การนัดหมายของฉัน</h2>
        <p class="text-gray-500 mt-2 font-medium">ตรวจสอบวันและเวลานัดหมายกับทางคลินิก</p>
      </div>
    </div>

    <div v-if="appointments.length === 0" class="bg-white rounded-3xl shadow-sm border border-gray-100 p-16 text-center">
      <div class="text-4xl mb-4">🗓️</div>
      <h3 class="text-xl font-bold text-gray-700">ยังไม่มีการนัดหมาย</h3>
    </div>

    <div v-else class="grid gap-4">
      <div v-for="item in appointments" :key="item.appt_id" class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center justify-between hover:shadow-md transition-shadow">
        <div class="flex items-center gap-6">
          <div class="bg-indigo-50 text-indigo-600 rounded-xl p-4 text-center min-w-[80px]">
            <div class="text-sm font-bold uppercase">{{ getMonth(item.appt_date) }}</div>
            <div class="text-2xl font-extrabold">{{ getDay(item.appt_date) }}</div>
          </div>
          <div>
            <h4 class="text-lg font-bold text-gray-800">{{ item.appt_reason }}</h4>
            <div class="text-gray-500 text-sm mt-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <span class="font-medium text-indigo-500">🐾 น้อง{{ item.pet_name }}</span>
              <span class="hidden sm:inline text-gray-300">|</span>
              <span>⏰ เวลา: {{ formatTime(item.appt_time) }} น.</span>
            </div>
          </div>
        </div>
        <div>
          <span class="px-4 py-2 rounded-full text-sm font-bold"
                :class="item.appt_status === 'ยืนยัน' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'">
            {{ item.appt_status || 'รอยืนยัน' }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const appointments = ref([])

const getDay = (dateStr) => new Date(dateStr).getDate()
const getMonth = (dateStr) => new Date(dateStr).toLocaleDateString('th-TH', { month: 'short' })
const formatTime = (timeStr) => timeStr ? timeStr.substring(0, 5) : '-'

const loadAppointments = async () => {
  try {
    const token = localStorage.getItem('token')
    const userData = JSON.parse(localStorage.getItem('user'))
    if (!userData || !token) return

    // อย่าลืมแนบ Token ไปด้วยเพราะ API พี่ใช้ auth middleware
    const res = await axios.get(`http://localhost:3000/api/appointments/my-appointments/${userData.user_id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (res.data.success) appointments.value = res.data.data
  } catch (error) {
    console.error("Error loading appointments:", error)
  }
}

onMounted(() => loadAppointments())
</script>