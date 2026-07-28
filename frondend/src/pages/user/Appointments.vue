<template>
  <div class="appointments-page user-page">
    <section class="page-intro">
      <div class="intro-copy-block">
        <p class="section-kicker">Appointment portal</p>
        <h1>การนัดหมายของฉัน</h1>
        <p class="intro-copy">
          ดูวันนัด เวลาเข้ารับบริการ สถานะล่าสุด และการแจ้งเตือนสำคัญของสัตว์เลี้ยงแต่ละตัวได้ในหน้าเดียว
        </p>
      </div>

      <div v-if="upcomingAppointment" class="intro-pill">
        <span>นัดถัดไป</span>
        <strong>{{ upcomingAppointment.pet_name || 'สัตว์เลี้ยงในระบบ' }}</strong>
        <small>{{ formatDateLabel(upcomingAppointment.appt_date) }} เวลา {{ formatTime(upcomingAppointment.appt_time) }} น.</small>
      </div>
    </section>

    <section class="schedule-panel">
      <div class="schedule-head">
        <div>
          <p class="card-kicker">Veterinarian schedule</p>
          <h2>ตารางสัตวแพทย์เข้าเวร</h2>
          <p>เลือกวันที่เพื่อดูว่าสัตวแพทย์คนใดพร้อมให้บริการและเข้าเวรช่วงเวลาใด</p>
        </div>
        <div class="month-switcher" aria-label="เปลี่ยนเดือน">
          <button type="button" title="เดือนก่อนหน้า" @click="changeMonth(-1)">‹</button>
          <strong>{{ calendarMonthLabel }}</strong>
          <button type="button" title="เดือนถัดไป" @click="changeMonth(1)">›</button>
        </div>
      </div>

      <div class="schedule-layout">
        <div class="calendar-shell">
          <div class="weekday-row">
            <span v-for="day in weekdayLabels" :key="day">{{ day }}</span>
          </div>
          <div class="calendar-grid">
            <button
              v-for="day in calendarDays"
              :key="day.key"
              type="button"
              :class="[
                'calendar-day',
                { muted: !day.inMonth, selected: selectedDate === day.key, today: day.isToday, available: day.scheduleCount > 0 }
              ]"
              @click="selectedDate = day.key"
            >
              <span>{{ day.day }}</span>
              <small v-if="day.scheduleCount > 0">{{ day.scheduleCount }} หมอ</small>
            </button>
          </div>
        </div>

        <aside class="day-schedule">
          <div class="day-schedule-head">
            <span>ตารางเข้าเวร</span>
            <strong>{{ formatDateLabel(selectedDate) }}</strong>
          </div>
          <div v-if="selectedSchedules.length > 0" class="vet-shift-list">
            <article v-for="shift in selectedSchedules" :key="shift.schedule_id" class="vet-shift">
              <div class="vet-avatar"><AppIcon name="stethoscope" :size="18" /></div>
              <div>
                <strong>{{ shift.vet_name }}</strong>
                <span>{{ formatTime(shift.start_time) }} - {{ formatTime(shift.end_time) }} น.</span>
                <p v-if="shift.schedule_note">{{ shift.schedule_note }}</p>
              </div>
            </article>
          </div>
          <div v-else class="no-shift">
            <AppIcon name="calendar" :size="22" />
            <strong>ยังไม่มีสัตวแพทย์ลงเวรวันนี้</strong>
            <p>เลือกวันที่มีจุดสีเขียวเพื่อดูช่วงเวลาที่พร้อมให้บริการ</p>
          </div>
        </aside>
      </div>
    </section>

    <section v-if="appointments.length === 0" class="empty-panel">
      <div class="empty-illustration">
        <AppIcon name="calendar" :size="28" />
      </div>
      <div>
        <strong>ยังไม่มีรายการนัดหมาย</strong>
        <p>เมื่อนัดหมายถูกบันทึกโดยคลินิก รายการทั้งหมดจะปรากฏที่หน้านี้พร้อมวัน เวลา และสถานะล่าสุดทันที</p>
      </div>
    </section>

    <template v-else>
      <section class="overview-grid">
        <article class="spotlight-card">
          <div class="spotlight-head">
            <div>
              <p class="card-kicker">Latest notice</p>
              <h2>{{ nextAlertTitle }}</h2>
            </div>
            <span :class="['spotlight-state', spotlightTone]">{{ spotlightLabel }}</span>
          </div>

          <p class="spotlight-copy">{{ nextAlertDescription }}</p>

          <div v-if="highlightAppointment" class="spotlight-detail">
            <div class="spotlight-date">
              <span>{{ getMonth(highlightAppointment.appt_date) }}</span>
              <strong>{{ getDay(highlightAppointment.appt_date) }}</strong>
            </div>

            <div class="spotlight-meta">
              <p class="spotlight-label">สัตว์เลี้ยง</p>
              <h3>{{ highlightAppointment.pet_name || 'สัตว์เลี้ยงในระบบ' }}</h3>
              <p class="spotlight-reason">
                {{ highlightAppointment.appt_reason || 'นัดหมายเพื่อตรวจติดตามหรือเข้ารับบริการที่คลินิก' }}
              </p>
              <div class="meta-line">
                <span><AppIcon name="calendar" :size="15" /> {{ formatDateLabel(highlightAppointment.appt_date) }}</span>
                <span><AppIcon name="history" :size="15" /> {{ formatTime(highlightAppointment.appt_time) }} น.</span>
              </div>
            </div>
          </div>
        </article>

        <div class="signal-stack">
          <article class="signal-card">
            <div class="signal-top">
              <span class="signal-icon success"><AppIcon name="calendar" :size="16" /></span>
              <span class="signal-label">นัดวันนี้</span>
            </div>
            <strong>{{ todayAppointments.length }}</strong>
            <p>รายการที่ควรเตรียมตัวเข้ารับบริการภายในวันนี้</p>
          </article>

          <article class="signal-card">
            <div class="signal-top">
              <span class="signal-icon info"><AppIcon name="mail" :size="16" /></span>
              <span class="signal-label">นัดพรุ่งนี้</span>
            </div>
            <strong>{{ tomorrowAppointments.length }}</strong>
            <p>คิวถัดไปที่ควรวางแผนเวลาไว้ล่วงหน้า</p>
          </article>

          <article class="signal-card" :class="{ danger: overdueAppointments.length > 0 }">
            <div class="signal-top">
              <span class="signal-icon danger"><AppIcon name="history" :size="16" /></span>
              <span class="signal-label">เลยกำหนด</span>
            </div>
            <strong>{{ overdueAppointments.length }}</strong>
            <p>นัดหมายที่ยังไม่ยกเลิกแต่เวลานัดได้ผ่านไปแล้ว</p>
          </article>
        </div>
      </section>

      <section class="status-strip">
        <article class="status-tile">
          <span>รอยืนยัน</span>
          <strong>{{ pendingCount }}</strong>
        </article>
        <article class="status-tile">
          <span>ยืนยันแล้ว</span>
          <strong>{{ confirmedCount }}</strong>
        </article>
        <article class="status-tile">
          <span>ยกเลิก</span>
          <strong>{{ canceledCount }}</strong>
        </article>
      </section>

      <section class="list-section">
        <div class="list-head">
          <div>
            <p class="card-kicker">Appointment list</p>
            <h2>รายการนัดหมายทั้งหมด</h2>
            <p class="list-copy">เรียงตามวันและเวลาเพื่อให้ดูคิวล่าสุดได้ง่ายขึ้น</p>
          </div>
          <span class="list-count">{{ sortedAppointments.length }} รายการ</span>
        </div>

        <div class="appointment-list">
          <article v-for="item in sortedAppointments" :key="item.appt_id" class="appointment-card">
            <div class="date-card">
              <span>{{ getMonth(item.appt_date) }}</span>
              <strong>{{ getDay(item.appt_date) }}</strong>
            </div>

            <div class="appointment-body">
              <div class="appointment-head">
                <div>
                  <p class="appointment-label">คิวนัดหมาย</p>
                  <h3>{{ item.pet_name || 'สัตว์เลี้ยงในระบบ' }}</h3>
                  <p class="appointment-subtitle">
                    {{ item.appt_reason || 'นัดหมายเพื่อตรวจติดตามหรือเข้ารับบริการที่คลินิก' }}
                  </p>
                </div>
                <span :class="['status-badge', statusClass(item.appt_status)]">
                  {{ statusLabel(item.appt_status) }}
                </span>
              </div>

              <div class="appointment-facts">
                <span class="fact-chip"><AppIcon name="calendar" :size="15" /> {{ formatDateLabel(item.appt_date) }}</span>
                <span class="fact-chip"><AppIcon name="history" :size="15" /> {{ formatTime(item.appt_time) }} น.</span>
                <span class="fact-chip subtle">รหัส {{ item.appt_id }}</span>
              </div>

              <div class="appointment-alerts">
                <span v-if="isToday(item)" class="inline-alert success">วันนี้มีนัดหมาย</span>
                <span v-else-if="isTomorrow(item)" class="inline-alert info">พรุ่งนี้มีนัดหมาย</span>
                <span v-else-if="isOverdue(item)" class="inline-alert danger">เลยเวลานัดแล้ว</span>
              </div>

              <p
                v-if="normalizeStatus(item.appt_status) === APPT_STATUS_CANCELED && item.cancel_reason"
                class="cancel-note"
              >
                เหตุผลที่ยกเลิก: {{ item.cancel_reason }}
              </p>
              <div
                v-else-if="normalizeStatus(item.appt_status) === APPT_STATUS_PENDING && item.cancel_reason"
                class="reschedule-note"
              >
                <strong>คลินิกเสนอวันนัดหมายใหม่</strong>
                <span>คำขอเดิมของคุณ: {{ item.cancel_reason }}</span>
                <small>กรุณาตรวจสอบวัน เวลา และสัตวแพทย์ แล้วเลือกยืนยันหรือขอยกเลิกอีกครั้ง</small>
              </div>

              <div v-if="normalizeStatus(item.appt_status) === APPT_STATUS_PENDING" class="response-actions">
                <p v-if="isOverdue(item)" class="response-help">
                  นัดหมายนี้เลยเวลาแล้ว จึงยืนยันย้อนหลังไม่ได้ แต่สามารถยกเลิกเพื่อปิดรายการได้
                </p>
                <button v-if="!isOverdue(item)" type="button" class="accept-btn" :disabled="respondingId === item.appt_id" @click="respondAppointment(item, 'accept')">
                  ยืนยันนัดหมาย
                </button>
                <button type="button" class="cancel-btn" :disabled="respondingId === item.appt_id" @click="openCancelDialog(item)">
                  ขอยกเลิก
                </button>
              </div>
            </div>

            <aside class="appointment-side">
              <div class="side-block">
                <span>วันนัด</span>
                <strong>{{ formatDateLabel(item.appt_date) }}</strong>
              </div>
              <div class="side-block">
                <span>เวลาเข้ารับบริการ</span>
                <strong>{{ formatTime(item.appt_time) }} น.</strong>
              </div>
              <div class="side-block">
                <span>สัตวแพทย์</span>
                <strong>{{ item.vet_name || 'รอระบุสัตวแพทย์' }}</strong>
              </div>
            </aside>
          </article>
        </div>
      </section>
    </template>

    <div v-if="cancelDialogOpen" class="dialog-overlay" @click.self="closeCancelDialog">
      <form class="cancel-dialog" @submit.prevent="submitCancellation">
        <div>
          <p class="card-kicker">Appointment response</p>
          <h2>ขอยกเลิกนัดหมาย</h2>
          <p>แจ้งเหตุผลให้คลินิกทราบเพื่อช่วยจัดคิวใหม่ได้เหมาะสม</p>
        </div>
        <label>
          <span>เหตุผลที่ยกเลิก *</span>
          <textarea v-model.trim="cancelReason" rows="4" maxlength="500" placeholder="เช่น ไม่สะดวกตามวันและเวลาที่กำหนด" required></textarea>
        </label>
        <p v-if="responseError" class="dialog-error" role="alert">{{ responseError }}</p>
        <div class="dialog-actions">
          <button type="button" class="dialog-secondary" :disabled="Boolean(respondingId)" @click="closeCancelDialog">กลับ</button>
          <button type="submit" class="dialog-danger" :disabled="!cancelReason || Boolean(respondingId)">
            {{ respondingId ? 'กำลังบันทึก...' : 'ยืนยันการยกเลิก' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'
import AppIcon from '../../components/AppIcon.vue'

const APPT_STATUS_PENDING = 'รอ'
const APPT_STATUS_CONFIRMED = 'ยืนยัน'
const APPT_STATUS_CANCELED = 'ยกเลิก'

const appointments = ref([])
const schedules = ref([])
const currentMonth = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
const selectedDate = ref('')
const respondingId = ref('')
const cancelDialogOpen = ref(false)
const cancelTarget = ref(null)
const cancelReason = ref('')
const responseError = ref('')
const weekdayLabels = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา']

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
})

const normalizeStatus = (value) => {
  const text = String(value || '').trim()
  if (text === APPT_STATUS_CANCELED) return APPT_STATUS_CANCELED
  if (text === APPT_STATUS_CONFIRMED) return APPT_STATUS_CONFIRMED
  return APPT_STATUS_PENDING
}

const toDateTime = (apptDate, apptTime = '00:00') => {
  if (!apptDate) return null
  const safeTime = String(apptTime || '00:00').slice(0, 5)
  const date = new Date(`${apptDate}T${safeTime}:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

const startOfToday = () => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

const startOfTomorrow = () => {
  const today = startOfToday()
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
}

const isActiveAppointment = (item) => normalizeStatus(item.appt_status) !== APPT_STATUS_CANCELED

const isToday = (item) => {
  if (!isActiveAppointment(item)) return false
  const at = toDateTime(item.appt_date, item.appt_time)
  if (!at) return false
  const today = startOfToday().getTime()
  const tomorrow = startOfTomorrow().getTime()
  return at.getTime() >= today && at.getTime() < tomorrow
}

const isTomorrow = (item) => {
  if (!isActiveAppointment(item)) return false
  const at = toDateTime(item.appt_date, item.appt_time)
  if (!at) return false
  const tomorrow = startOfTomorrow().getTime()
  const nextDay = tomorrow + 24 * 60 * 60 * 1000
  return at.getTime() >= tomorrow && at.getTime() < nextDay
}

const isOverdue = (item) => {
  if (!isActiveAppointment(item)) return false
  const at = toDateTime(item.appt_date, item.appt_time)
  return at ? at.getTime() < Date.now() : false
}

const statusClass = (status) => {
  const normalized = normalizeStatus(status)
  if (normalized === APPT_STATUS_CONFIRMED) return 'confirmed'
  if (normalized === APPT_STATUS_CANCELED) return 'canceled'
  return 'pending'
}

const statusLabel = (status) => {
  const normalized = normalizeStatus(status)
  if (normalized === APPT_STATUS_CANCELED) return 'ยกเลิก'
  if (normalized === APPT_STATUS_CONFIRMED) return 'ยืนยัน'
  return 'รอยืนยัน'
}

const pendingCount = computed(() =>
  appointments.value.filter((item) => normalizeStatus(item.appt_status) === APPT_STATUS_PENDING).length
)

const confirmedCount = computed(() =>
  appointments.value.filter((item) => normalizeStatus(item.appt_status) === APPT_STATUS_CONFIRMED).length
)

const canceledCount = computed(() =>
  appointments.value.filter((item) => normalizeStatus(item.appt_status) === APPT_STATUS_CANCELED).length
)

const todayAppointments = computed(() => appointments.value.filter((item) => isToday(item)))
const tomorrowAppointments = computed(() => appointments.value.filter((item) => isTomorrow(item)))
const overdueAppointments = computed(() => appointments.value.filter((item) => isOverdue(item)))

const upcomingAppointment = computed(() => {
  const now = Date.now()
  return (
    appointments.value
      .filter((item) => {
        if (!isActiveAppointment(item)) return false
        const at = toDateTime(item.appt_date, item.appt_time)
        return at && at.getTime() >= now
      })
      .sort((a, b) => toDateTime(a.appt_date, a.appt_time) - toDateTime(b.appt_date, b.appt_time))[0] || null
  )
})

const sortedAppointments = computed(() =>
  [...appointments.value].sort((a, b) => {
    const left = toDateTime(a.appt_date, a.appt_time)?.getTime() || 0
    const right = toDateTime(b.appt_date, b.appt_time)?.getTime() || 0
    return left - right
  })
)

const formatDateLabel = (dateStr) => {
  const date = new Date(dateStr)
  return Number.isNaN(date.getTime())
    ? '-'
    : date.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
}

const getDay = (dateStr) => {
  const date = new Date(dateStr)
  return Number.isNaN(date.getTime()) ? '-' : date.getDate()
}

const getMonth = (dateStr) => {
  const date = new Date(dateStr)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('th-TH', { month: 'short' })
}

const formatTime = (timeStr) => (timeStr ? String(timeStr).slice(0, 5) : '-')

const toDateKey = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const calendarMonthLabel = computed(() =>
  currentMonth.value.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })
)

const scheduleCountByDate = computed(() => {
  const result = {}
  schedules.value.forEach((shift) => {
    const key = String(shift.work_date || '').slice(0, 10)
    result[key] = (result[key] || 0) + 1
  })
  return result
})

const calendarDays = computed(() => {
  const first = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth(), 1)
  const mondayOffset = (first.getDay() + 6) % 7
  const start = new Date(first.getFullYear(), first.getMonth(), first.getDate() - mondayOffset)
  const today = toDateKey(new Date())

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)
    const key = toDateKey(date)
    return {
      key,
      day: date.getDate(),
      inMonth: date.getMonth() === currentMonth.value.getMonth(),
      isToday: key === today,
      scheduleCount: scheduleCountByDate.value[key] || 0
    }
  })
})

const selectedSchedules = computed(() =>
  schedules.value.filter((shift) => String(shift.work_date || '').slice(0, 10) === selectedDate.value)
)

const loadSchedules = async () => {
  const year = currentMonth.value.getFullYear()
  const month = currentMonth.value.getMonth()
  const from = toDateKey(new Date(year, month, 1))
  const to = toDateKey(new Date(year, month + 1, 0))
  const response = await axios.get('http://localhost:3000/api/appointments/vet-schedules', {
    ...authHeaders(),
    params: { from, to }
  })
  schedules.value = response.data || []

  const today = toDateKey(new Date())
  selectedDate.value = today >= from && today <= to ? today : from
}

const changeMonth = async (offset) => {
  currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + offset, 1)
  try {
    await loadSchedules()
  } catch (error) {
    console.error('load veterinarian schedules error:', error)
    alert(error.response?.data?.message || 'ไม่สามารถโหลดตารางสัตวแพทย์ได้')
  }
}

const respondAppointment = async (item, action, reason = '') => {
  if (action === 'accept' && !confirm(`ยืนยันนัดหมายของ ${item.pet_name || 'สัตว์เลี้ยง'} หรือไม่?`)) return false
  responseError.value = ''
  respondingId.value = item.appt_id
  try {
    const response = await axios.patch(
      `http://localhost:3000/api/appointments/${item.appt_id}/respond`,
      { action, cancel_reason: reason },
      { ...authHeaders(), timeout: 12000 }
    )
    alert(response.data?.message || 'บันทึกการตอบรับสำเร็จ')
    await loadAppointments()
    return true
  } catch (error) {
    console.error('respond appointment error:', error)
    const message = error.code === 'ECONNABORTED'
      ? 'ระบบใช้เวลาตอบกลับนานเกินไป กรุณาตรวจสอบว่า backend เปิดอยู่แล้วลองอีกครั้ง'
      : (error.response?.data?.message || 'ตอบรับนัดหมายไม่สำเร็จ')
    if (action === 'cancel') {
      responseError.value = message
    } else {
      alert(message)
    }
    return false
  } finally {
    respondingId.value = ''
  }
}

const openCancelDialog = (item) => {
  cancelTarget.value = item
  cancelReason.value = ''
  responseError.value = ''
  cancelDialogOpen.value = true
}

const closeCancelDialog = () => {
  cancelDialogOpen.value = false
  cancelTarget.value = null
  cancelReason.value = ''
  responseError.value = ''
}

const submitCancellation = async () => {
  if (!cancelTarget.value || !cancelReason.value) return
  const saved = await respondAppointment(cancelTarget.value, 'cancel', cancelReason.value)
  if (saved) closeCancelDialog()
}

const spotlightTone = computed(() => {
  if (todayAppointments.value.length > 0) return 'success'
  if (tomorrowAppointments.value.length > 0) return 'info'
  if (overdueAppointments.value.length > 0) return 'danger'
  return 'neutral'
})

const spotlightLabel = computed(() => {
  if (todayAppointments.value.length > 0) return 'วันนี้'
  if (tomorrowAppointments.value.length > 0) return 'พรุ่งนี้'
  if (overdueAppointments.value.length > 0) return 'ต้องติดตาม'
  return 'ภาพรวม'
})

const highlightAppointment = computed(() => {
  if (todayAppointments.value.length > 0) return todayAppointments.value[0]
  if (tomorrowAppointments.value.length > 0) return tomorrowAppointments.value[0]
  if (upcomingAppointment.value) return upcomingAppointment.value
  if (overdueAppointments.value.length > 0) return overdueAppointments.value[0]
  return null
})

const nextAlertTitle = computed(() => {
  if (todayAppointments.value.length > 0) return 'วันนี้มีคิวนัดหมาย'
  if (tomorrowAppointments.value.length > 0) return 'พรุ่งนี้มีคิวนัดหมาย'
  if (overdueAppointments.value.length > 0) return 'มีนัดหมายที่เลยกำหนด'
  if (upcomingAppointment.value) return 'นัดครั้งถัดไปของคุณ'
  return 'ไม่มีการแจ้งเตือนใหม่'
})

const nextAlertDescription = computed(() => {
  if (todayAppointments.value.length > 0) {
    const first = todayAppointments.value[0]
    return `${first.pet_name || 'สัตว์เลี้ยง'} มีนัดเวลา ${formatTime(first.appt_time)} น. กรุณาตรวจสอบเวลาและเตรียมตัวล่วงหน้า`
  }
  if (tomorrowAppointments.value.length > 0) {
    const first = tomorrowAppointments.value[0]
    return `${first.pet_name || 'สัตว์เลี้ยง'} มีนัดในวันที่ ${formatDateLabel(first.appt_date)} เวลา ${formatTime(first.appt_time)} น.`
  }
  if (overdueAppointments.value.length > 0) {
    return `มี ${overdueAppointments.value.length} รายการที่ผ่านเวลานัดไปแล้วและควรตรวจสอบกับคลินิกอีกครั้ง`
  }
  if (upcomingAppointment.value) {
    return `นัดถัดไปของคุณอยู่ในวันที่ ${formatDateLabel(upcomingAppointment.value.appt_date)} เวลา ${formatTime(upcomingAppointment.value.appt_time)} น.`
  }
  return 'ติดตามรายการนัดหมายทั้งหมดได้จากหน้านี้'
})

const loadAppointments = async () => {
  const userData = JSON.parse(localStorage.getItem('user') || 'null')
  if (!userData?.user_id) return

  const response = await axios.get(
    `http://localhost:3000/api/appointments/my-appointments/${userData.user_id}`,
    authHeaders()
  )

  if (response.data?.success) {
    appointments.value = (response.data.data || []).map((item) => ({
      ...item,
      appt_status: normalizeStatus(item.appt_status)
    }))
  }
}

onMounted(async () => {
  try {
    await Promise.all([loadAppointments(), loadSchedules()])
  } catch (error) {
    console.error('load user appointments page error:', error)
    alert('ไม่สามารถโหลดข้อมูลนัดหมายได้')
  }
})
</script>

<style scoped>
.appointments-page {
  display: grid;
  gap: 18px;
  width: min(1080px, 100%);
  margin: 0 auto;
}

.page-intro,
.spotlight-card,
.signal-card,
.status-tile,
.empty-panel,
.list-section,
.appointment-card {
  background: rgba(255, 255, 255, 0.97);
  border: 1px solid rgba(217, 226, 236, 0.92);
  border-radius: 18px;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.05);
}

.page-intro {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  padding: 22px 24px;
}

.intro-copy-block {
  min-width: 0;
}

.section-kicker,
.card-kicker,
.appointment-label,
.spotlight-label {
  margin: 0 0 8px;
  color: #0f766e;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.page-intro h1,
.spotlight-card h2,
.spotlight-meta h3,
.list-head h2,
.appointment-head h3 {
  margin: 0;
  color: #0f172a;
}

.page-intro h1 {
  font-size: 1.95rem;
  line-height: 1.08;
}

.intro-copy {
  margin: 8px 0 0;
  max-width: 56ch;
  color: #64748b;
  line-height: 1.6;
}

.intro-pill {
  min-width: 240px;
  padding: 14px 16px;
  border-radius: 16px;
  background: linear-gradient(180deg, #f8fbff 0%, #f1f7fb 100%);
  border: 1px solid #dbe7f3;
}

.intro-pill span {
  display: block;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.intro-pill strong {
  display: block;
  margin-top: 8px;
  color: #0f172a;
  font-size: 1rem;
}

.intro-pill small {
  display: block;
  margin-top: 4px;
  color: #475569;
  line-height: 1.5;
}

.empty-panel {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 24px;
}

.empty-illustration {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #ecfdf5 0%, #f0fdfa 100%);
  color: #0f766e;
  flex: none;
}

.empty-panel strong {
  display: block;
  font-size: 1.05rem;
  color: #0f172a;
}

.empty-panel p {
  margin: 8px 0 0;
  color: #64748b;
  line-height: 1.6;
}

.overview-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(300px, 0.85fr);
  gap: 18px;
}

.spotlight-card {
  padding: 22px;
  background: linear-gradient(135deg, #0f172a 0%, #10243a 46%, #0f766e 100%);
  border-color: transparent;
  color: #ffffff;
}

.spotlight-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.spotlight-card .card-kicker,
.spotlight-copy,
.spotlight-reason,
.meta-line span,
.spotlight-label {
  color: rgba(255, 255, 255, 0.82);
}

.spotlight-card h2 {
  color: #ffffff;
  font-size: 1.55rem;
  line-height: 1.12;
}

.spotlight-state {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 7px 11px;
  font-size: 12px;
  font-weight: 800;
  background: rgba(255, 255, 255, 0.14);
  color: #ffffff;
}

.spotlight-copy {
  margin: 12px 0 0;
  max-width: 48ch;
  line-height: 1.6;
}

.spotlight-detail {
  display: grid;
  grid-template-columns: 88px 1fr;
  gap: 16px;
  margin-top: 18px;
  padding: 15px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.08);
}

.spotlight-date {
  border-radius: 14px;
  padding: 12px 10px;
  text-align: center;
  background: rgba(255, 255, 255, 0.1);
}

.spotlight-date span {
  display: block;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.spotlight-date strong {
  display: block;
  margin-top: 6px;
  font-size: 2rem;
  line-height: 1;
}

.spotlight-meta h3 {
  color: #ffffff;
  font-size: 1.2rem;
  line-height: 1.15;
}

.spotlight-reason {
  margin: 8px 0 0;
  line-height: 1.6;
}

.meta-line {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  margin-top: 12px;
}

.meta-line span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.signal-stack {
  display: grid;
  gap: 14px;
}

.signal-card {
  padding: 16px 17px;
}

.signal-card.danger {
  background: linear-gradient(180deg, #fff7f7 0%, #fff1f2 100%);
  border-color: rgba(248, 113, 113, 0.34);
}

.signal-top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.signal-icon {
  width: 34px;
  height: 34px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  color: #0f172a;
  background: #f8fafc;
}

.signal-icon.success {
  background: #dcfce7;
  color: #166534;
}

.signal-icon.info {
  background: #dbeafe;
  color: #1d4ed8;
}

.signal-icon.danger {
  background: #fee2e2;
  color: #b91c1c;
}

.signal-label {
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
}

.signal-card strong {
  display: block;
  margin-top: 12px;
  color: #0f172a;
  font-size: 1.8rem;
  line-height: 1;
}

.signal-card p {
  margin: 10px 0 0;
  color: #64748b;
  line-height: 1.55;
}

.status-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.status-tile {
  padding: 16px 18px;
}

.status-tile span {
  display: block;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.status-tile strong {
  display: block;
  margin-top: 6px;
  color: #0f172a;
  font-size: 1.7rem;
  line-height: 1;
}

.list-section {
  padding: 20px;
}

.list-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.list-copy {
  margin: 8px 0 0;
  color: #64748b;
  line-height: 1.6;
}

.list-count {
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
}

.appointment-list {
  display: grid;
  gap: 14px;
}

.appointment-card {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr) 220px;
  gap: 16px;
  padding: 16px;
  align-items: stretch;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.appointment-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
  border-color: #cbd9e6;
}

.date-card {
  border-radius: 16px;
  padding: 12px 10px;
  text-align: center;
  background: linear-gradient(180deg, #eefcf8 0%, #e7fbf6 100%);
  border: 1px solid #c9f2e8;
  color: #0f766e;
}

.date-card span {
  display: block;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.date-card strong {
  display: block;
  margin-top: 8px;
  font-size: 2rem;
  line-height: 1;
}

.appointment-body {
  min-width: 0;
}

.appointment-head {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;
}

.appointment-head h3 {
  font-size: 1.2rem;
  line-height: 1.18;
}

.appointment-label {
  margin-bottom: 6px;
}

.appointment-subtitle {
  margin: 8px 0 0;
  color: #64748b;
  line-height: 1.6;
}

.appointment-facts {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.fact-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 11px;
  border-radius: 999px;
  background: #f8fafc;
  color: #334155;
  font-size: 13px;
  font-weight: 600;
}

.fact-chip.subtle {
  background: #f1f5f9;
  color: #475569;
}

.appointment-alerts {
  min-height: 30px;
  margin-top: 12px;
}

.inline-alert {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
}

.inline-alert.success {
  background: #dcfce7;
  color: #166534;
}

.inline-alert.info {
  background: #dbeafe;
  color: #1d4ed8;
}

.inline-alert.danger {
  background: #fee2e2;
  color: #b91c1c;
}

.cancel-note {
  margin: 10px 0 0;
  color: #be123c;
  font-size: 13px;
  font-weight: 700;
}

.reschedule-note {
  display: grid;
  gap: 4px;
  margin-top: 12px;
  padding: 12px 14px;
  border: 1px solid #99f6e4;
  border-radius: 12px;
  background: #f0fdfa;
  color: #115e59;
}

.reschedule-note strong {
  font-size: 14px;
}

.reschedule-note span,
.reschedule-note small {
  line-height: 1.55;
}

.reschedule-note small {
  color: #0f766e;
}

.response-help {
  flex-basis: 100%;
  margin: 0;
  padding: 10px 12px;
  border: 1px solid #fed7aa;
  border-radius: 10px;
  background: #fff7ed;
  color: #9a3412;
  font-size: 13px;
  line-height: 1.55;
}

.appointment-side {
  display: grid;
  gap: 10px;
  align-content: flex-start;
}

.side-block {
  padding: 13px 14px;
  border-radius: 14px;
  background: #f8fbfd;
  border: 1px solid #deebf2;
}

.side-block span {
  display: block;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.side-block strong {
  display: block;
  margin-top: 6px;
  color: #0f172a;
  font-size: 0.96rem;
  line-height: 1.5;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}

.status-badge.confirmed {
  background: #dcfce7;
  color: #166534;
}

.status-badge.pending {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.canceled {
  background: #fee2e2;
  color: #b91c1c;
}

.schedule-panel {
  padding: 22px;
  background: rgba(255, 255, 255, 0.97);
  border: 1px solid rgba(217, 226, 236, 0.92);
  border-radius: 18px;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.05);
}

.schedule-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 18px;
}

.schedule-head h2,
.day-schedule h3,
.cancel-dialog h2 {
  margin: 0;
  color: #0f172a;
}

.schedule-head > div > p:last-child,
.cancel-dialog > div > p:last-child {
  margin: 8px 0 0;
  color: #64748b;
  line-height: 1.6;
}

.month-switcher {
  display: grid;
  grid-template-columns: 38px minmax(145px, auto) 38px;
  align-items: center;
  gap: 6px;
  flex: none;
}

.month-switcher strong {
  text-align: center;
  color: #0f172a;
}

.month-switcher button {
  width: 38px;
  height: 38px;
  border: 1px solid #d7e2ec;
  border-radius: 10px;
  background: #ffffff;
  color: #0f766e;
  font-size: 1.45rem;
  cursor: pointer;
}

.schedule-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(260px, 0.75fr);
  gap: 18px;
}

.calendar-shell,
.day-schedule {
  border: 1px solid #dce7ef;
  border-radius: 16px;
  background: #fafdff;
  overflow: hidden;
}

.weekday-row,
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.weekday-row {
  padding: 10px 8px;
  background: #f1f7fa;
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
  text-align: center;
}

.calendar-grid {
  padding: 8px;
  gap: 5px;
}

.calendar-day {
  min-height: 66px;
  padding: 8px;
  border: 1px solid transparent;
  border-radius: 12px;
  background: transparent;
  color: #334155;
  text-align: left;
  cursor: pointer;
}

.calendar-day span,
.calendar-day small {
  display: block;
}

.calendar-day small {
  margin-top: 8px;
  color: #0f766e;
  font-size: 10px;
  font-weight: 800;
}

.calendar-day.muted {
  color: #b0bdca;
}

.calendar-day.available {
  background: #effcf8;
  border-color: #c9f2e8;
}

.calendar-day.today span {
  color: #0f766e;
  font-weight: 900;
}

.calendar-day.selected {
  background: #0f766e;
  border-color: #0f766e;
  color: #ffffff;
  box-shadow: 0 8px 18px rgba(15, 118, 110, 0.18);
}

.calendar-day.selected small,
.calendar-day.selected span {
  color: #ffffff;
}

.day-schedule {
  padding: 16px;
}

.day-schedule-head span,
.day-schedule-head strong {
  display: block;
}

.day-schedule-head span {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.day-schedule-head strong {
  margin-top: 5px;
  color: #0f172a;
}

.vet-shift-list {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.vet-shift {
  display: grid;
  grid-template-columns: 42px 1fr;
  gap: 11px;
  padding: 12px;
  border-radius: 13px;
  background: #ffffff;
  border: 1px solid #dce7ef;
}

.vet-avatar {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: #e7faf5;
  color: #0f766e;
}

.vet-shift strong,
.vet-shift span {
  display: block;
}

.vet-shift strong {
  color: #0f172a;
}

.vet-shift span,
.vet-shift p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}

.no-shift {
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 34px 12px;
  color: #64748b;
  text-align: center;
}

.no-shift strong {
  color: #334155;
}

.no-shift p {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
}

.response-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.accept-btn,
.cancel-btn,
.dialog-secondary,
.dialog-danger {
  min-height: 40px;
  padding: 9px 14px;
  border-radius: 10px;
  font-weight: 800;
  cursor: pointer;
}

.accept-btn {
  border: 1px solid #0f766e;
  background: #0f766e;
  color: #ffffff;
}

.cancel-btn,
.dialog-secondary {
  border: 1px solid #d9e3ec;
  background: #ffffff;
  color: #475569;
}

.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(15, 23, 42, 0.56);
}

.cancel-dialog {
  width: min(480px, 100%);
  display: grid;
  gap: 18px;
  padding: 22px;
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 26px 70px rgba(15, 23, 42, 0.24);
}

.cancel-dialog label span {
  display: block;
  margin-bottom: 8px;
  color: #334155;
  font-size: 13px;
  font-weight: 800;
}

.cancel-dialog textarea {
  width: 100%;
  resize: vertical;
  padding: 12px;
  border: 1px solid #cfdbe6;
  border-radius: 12px;
  font: inherit;
}

.dialog-error {
  margin: -4px 0 0;
  padding: 10px 12px;
  border: 1px solid #fecaca;
  border-radius: 10px;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.5;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.dialog-danger {
  border: 1px solid #dc2626;
  background: #dc2626;
  color: #ffffff;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

@media (max-width: 1080px) {
  .overview-grid {
    grid-template-columns: 1fr;
  }

  .appointment-card {
    grid-template-columns: 88px minmax(0, 1fr);
  }
}

@media (max-width: 860px) {
  .schedule-layout {
    grid-template-columns: 1fr;
  }

  .status-strip {
    grid-template-columns: 1fr;
  }

  .appointment-card {
    grid-template-columns: 1fr;
  }

  .appointment-side {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .page-intro,
  .list-head,
  .appointment-head,
  .spotlight-head {
    flex-direction: column;
    align-items: stretch;
  }

  .spotlight-detail {
    grid-template-columns: 1fr;
  }

  .appointment-side {
    grid-template-columns: 1fr;
  }

  .schedule-head {
    flex-direction: column;
  }

  .month-switcher {
    width: 100%;
    grid-template-columns: 38px 1fr 38px;
  }

  .schedule-panel {
    padding: 16px;
  }

  .calendar-day {
    min-height: 52px;
    padding: 6px;
  }

  .calendar-day small {
    margin-top: 5px;
    font-size: 9px;
  }

  .response-actions,
  .dialog-actions {
    display: grid;
    grid-template-columns: 1fr;
  }
}
</style>
