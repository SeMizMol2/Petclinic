<template>
  <div class="appointments-page user-page">
    <div v-if="actionMessage" :class="['page-feedback', actionMessageTone]" :role="actionMessageTone === 'error' ? 'alert' : 'status'">
      {{ actionMessage }}
    </div>

    <section v-if="!appointmentsLoading && !appointmentsError && attentionAppointment" class="attention-strip" aria-label="นัดหมายที่ต้องตอบรับ">
      <span class="attention-mark" aria-hidden="true"></span>
      <div>
        <strong>มีนัดหมายที่รอคุณยืนยัน</strong>
        <p>{{ attentionAppointment.pet_name || 'สัตว์เลี้ยง' }} · {{ formatDateLabel(attentionAppointment.appt_date) }} เวลา {{ formatTime(attentionAppointment.appt_time) }} น.</p>
      </div>
      <button type="button" @click="revealAppointment(attentionAppointment)">ตรวจสอบนัด</button>
    </section>

    <section class="booking-panel" aria-labelledby="booking-title">
      <div class="booking-intro">
        <div>
          <h2 id="booking-title">ตารางสัตวแพทย์</h2>
          <p>วันที่มีเวรหมอแสดงเป็นสีเขียว แต่คุณเลือกวันอื่นและส่งเวลาที่ต้องการได้ คลินิกจะตรวจสอบก่อนยืนยันนัด</p>
        </div>
        <div class="month-switcher" aria-label="เปลี่ยนเดือน">
          <button type="button" aria-label="เดือนก่อนหน้า" :disabled="isCurrentMonth || scheduleLoading" @click="changeMonth(-1)">‹</button>
          <strong>{{ calendarMonthLabel }}</strong>
          <button type="button" aria-label="เดือนถัดไป" :disabled="scheduleLoading" @click="changeMonth(1)">›</button>
        </div>
      </div>

      <div v-if="scheduleLoading" class="schedule-state" role="status">กำลังโหลดตารางสัตวแพทย์...</div>
      <div v-else class="schedule-layout">
        <div class="calendar-shell">
          <div v-if="scheduleError" class="schedule-inline-error" role="alert">
            <strong>ยังโหลดตารางเข้าเวรไม่ได้</strong>
            <p>{{ scheduleError }}</p>
            <button type="button" class="retry-btn" @click="loadSchedules()">ลองอีกครั้ง</button>
          </div>
          <template v-else>
            <div class="weekday-row"><span v-for="day in weekdayLabels" :key="day">{{ day }}</span></div>
            <div class="calendar-grid">
              <button v-for="day in calendarDays" :key="day.key" type="button"
                :disabled="!day.inMonth || day.key < toDateKey(new Date())"
                :aria-label="calendarDayLabel(day)" :aria-pressed="selectedDate === day.key"
                :aria-current="day.isToday ? 'date' : undefined"
                :class="['calendar-day', { muted: !day.inMonth, selected: selectedDate === day.key, today: day.isToday, available: day.scheduleCount > 0, 'has-my-appointment': day.appointmentCount > 0 }]"
                @click="selectCalendarDay(day.key)">
                <span class="calendar-day-number">{{ day.day }}</span>
                <small v-if="day.appointmentCount > 0" class="calendar-my-appointment">{{ day.appointmentCount }} นัด</small>
                <small v-if="day.scheduleCount > 0" class="calendar-shift-count">{{ day.scheduleCount }} เวร</small>
              </button>
            </div>
            <p v-if="!hasSelectableSchedules" class="calendar-empty">เดือนนี้ยังไม่มีตารางเข้าเวร คุณยังส่งคำขอวันและเวลาที่ต้องการให้คลินิกพิจารณาได้</p>
            <div class="calendar-legend"><span><i class="legend-shift" aria-hidden="true"></i> มีหมอเข้าเวร</span><span><i class="legend-appointment" aria-hidden="true"></i> นัดของฉัน</span><span>วันอื่นก็ส่งคำขอได้</span></div>
          </template>
        </div>

        <aside class="day-schedule" aria-label="เวลาและสัตวแพทย์ที่เลือก">
          <div class="day-schedule-head"><span>วันและเวลาที่เลือก</span><strong>{{ selectedDate ? formatDateLabel(selectedDate) : 'เลือกวันที่จากปฏิทิน' }}</strong></div>
          <div v-if="selectedDayAppointments.length > 0" class="selected-day-appointments">
            <strong>นัดของฉันในวันนี้</strong>
            <div v-for="item in selectedDayAppointments" :key="item.appt_id" class="selected-day-appointment">
              <div><span>{{ formatTime(item.appt_time) }} น. · {{ item.pet_name || 'สัตว์เลี้ยง' }}</span><small>{{ statusLabel(item.appt_status) }}</small></div>
              <button type="button" @click="revealAppointment(item)">ดูนัด</button>
            </div>
          </div>
          <div v-if="selectedSchedules.length > 0" class="vet-shift-list">
            <article v-for="shift in selectedSchedules" :key="shift.schedule_id" class="vet-shift">
              <div class="vet-avatar"><AppIcon name="stethoscope" :size="18" /></div>
              <div><strong>{{ shift.vet_name }}</strong><span>เข้าเวร {{ formatTime(shift.start_time) }}–{{ formatTime(shift.end_time) }} น.</span></div>
            </article>
          </div>
          <p v-else-if="!scheduleError" class="no-shift">{{ selectedDate ? 'ยังไม่มีตารางเข้าเวรในวันที่เลือก คลินิกจะตรวจสอบคำขอก่อนยืนยัน' : 'เลือกวันที่ต้องการจากปฏิทิน' }}</p>
          <label v-if="scheduleError" class="fallback-date"><span>เลือกวันที่ด้วยตนเอง</span><input v-model="bookingDate" type="date" :min="toDateKey(new Date())" /></label>
          <label class="booking-vet"><span>สัตวแพทย์ที่ต้องการ</span><select v-model="bookingVetId" :disabled="!bookingDate">
            <option value="">ไม่ระบุ ให้คลินิกจัดสัตวแพทย์</option>
            <option v-for="vet in availableBookingVets" :key="vet.vet_id" :value="vet.vet_id">{{ vet.vet_name }}</option>
          </select><small>ตารางเวรด้านบนใช้ดูประกอบ ไม่ได้เลือกหมอให้โดยอัตโนมัติ</small></label>
          <div class="booking-time">
            <span id="booking-time-label">เวลาที่ต้องการนัด <span aria-hidden="true">*</span></span>
            <div class="time-entry" role="group" aria-labelledby="booking-time-label" :class="{ 'has-error': bookingTimeError }">
              <label class="time-part"><span>ชั่วโมง</span><input :value="bookingHour" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="2" autocomplete="off" enterkeyhint="next" placeholder="13" aria-label="ชั่วโมง แบบ 24 ชั่วโมง" aria-required="true" :aria-invalid="Boolean(bookingTimeError)" aria-describedby="booking-time-help" :disabled="!bookingDate" @input="onTimePartInput('hour', $event)" @blur="onTimePartBlur('hour')" /></label>
              <span class="time-colon" aria-hidden="true">:</span>
              <label class="time-part"><span>นาที</span><input :value="bookingMinute" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="2" autocomplete="off" enterkeyhint="done" placeholder="34" aria-label="นาที" aria-required="true" :aria-invalid="Boolean(bookingTimeError)" aria-describedby="booking-time-help" :disabled="!bookingDate" @input="onTimePartInput('minute', $event)" @blur="onTimePartBlur('minute')" /></label>
              <span class="time-suffix">น.</span>
            </div>
            <p id="booking-time-help" :class="['booking-time-hint', { error: bookingTimeError }]" aria-live="polite">{{ bookingTimeError || 'เวลาแบบ 24 ชั่วโมง เช่น 13:34 น. กรอกได้ทุกนาที' }}</p>
            <p v-if="bookingTimeWarning" class="booking-time-warning" role="status">{{ bookingTimeWarning }}</p>
          </div>
        </aside>
      </div>
    </section>

    <section class="request-panel" aria-labelledby="request-title">
      <div class="request-intro"><h2 id="request-title">รายละเอียดคำขอนัด</h2><p v-if="bookingTime">{{ formatDateLabel(bookingDate) }} · {{ bookingTime }} น. · {{ bookingVetId ? bookingVets.find(vet => vet.vet_id === bookingVetId)?.vet_name : 'ให้คลินิกจัดสัตวแพทย์' }}</p><p v-else>เลือกวันและกรอกเวลาที่ต้องการด้านบนก่อน</p></div>
      <div v-if="petsLoading" class="booking-state" role="status">กำลังโหลดรายชื่อสัตว์เลี้ยง...</div>
      <div v-else-if="petsError" class="booking-state" role="alert">{{ petsError }} <button type="button" class="retry-btn" @click="loadPets">ลองอีกครั้ง</button></div>
      <div v-else-if="pets.length === 0" class="booking-state"><strong>เพิ่มสัตว์เลี้ยงก่อนขอนัดหมาย</strong><p>ระบบจะใช้นัดหมายนี้กับสัตว์เลี้ยงที่อยู่ในบัญชีของคุณเท่านั้น</p><router-link to="/user/pets/add" class="booking-link">เพิ่มสัตว์เลี้ยง</router-link></div>
      <form v-else class="booking-form" @submit.prevent="submitBooking">
        <div class="request-fields">
          <label><span>สัตว์เลี้ยง *</span><select v-model="bookingPetId" required><option value="" disabled>เลือกสัตว์เลี้ยง</option><option v-for="pet in pets" :key="pet.pet_id" :value="pet.pet_id">{{ pet.pet_name }}</option></select></label>
          <label class="booking-reason"><span>อาการหรือเหตุผลที่นัด *</span><textarea v-model.trim="bookingReason" maxlength="500" rows="2" required placeholder="เช่น ซึม ไม่กินอาหาร ต้องการให้สัตวแพทย์ตรวจอาการ"></textarea></label>
        </div>
        <div class="booking-footer"><p>คำขอจะยังไม่ยึดคิว คลินิกจะตรวจสอบเวลาและยืนยันอีกครั้ง</p><button type="submit" class="booking-submit" :disabled="bookingSubmitting || !bookingPetId || !bookingDate || !bookingTime || Boolean(bookingTimeError) || !bookingReason.trim()">{{ bookingSubmitting ? 'กำลังส่งคำขอ...' : 'ส่งคำขอนัดหมาย' }}</button></div>
      </form>
    </section>

    <section v-if="appointmentsLoading" class="empty-panel loading-panel" role="status">
      <div class="empty-illustration"><AppIcon name="calendar" :size="26" /></div>
      <div>
        <strong>กำลังโหลดรายการนัดหมาย</strong>
        <p>ระบบกำลังตรวจสอบข้อมูลล่าสุดจากคลินิก</p>
      </div>
    </section>

    <section v-else-if="appointmentsError" class="empty-panel error-panel" role="alert">
      <div class="empty-illustration"><AppIcon name="history" :size="26" /></div>
      <div>
        <strong>ยังโหลดรายการนัดหมายไม่ได้</strong>
        <p>{{ appointmentsError }}</p>
        <button type="button" class="retry-btn" @click="loadAppointments()">ลองอีกครั้ง</button>
      </div>
    </section>

    <section v-else-if="appointments.length === 0" class="empty-panel">
      <div class="empty-illustration">
        <AppIcon name="calendar" :size="28" />
      </div>
      <div>
        <strong>ยังไม่มีรายการนัดหมาย</strong>
        <p>เมื่อนัดหมายถูกบันทึกโดยคลินิก รายการทั้งหมดจะปรากฏที่หน้านี้พร้อมวัน เวลา และสถานะล่าสุดทันที</p>
      </div>
    </section>

    <template v-else>
      <section class="list-section">
        <div class="list-head">
          <div>
            <h2>นัดหมายของฉัน</h2>
            <p class="list-copy">ติดตามสถานะนัดที่กำลังดำเนินการและดูประวัติย้อนหลัง</p>
          </div>
          <label class="status-filter">
            <span>แสดงสถานะ</span>
            <select v-model="statusFilter">
              <option value="all">ทุกสถานะในหมวด</option>
              <option :value="APPT_STATUS_PENDING">รอยืนยัน ({{ pendingCount }})</option>
              <option :value="APPT_STATUS_CLINIC_PENDING">รอคลินิกยืนยัน ({{ clinicPendingCount }})</option>
              <option :value="APPT_STATUS_CONFIRMED">ยืนยันแล้ว ({{ confirmedCount }})</option>
              <option :value="APPT_STATUS_COMPLETED">เสร็จสิ้น ({{ completedCount }})</option>
              <option :value="APPT_STATUS_MISSED">ไม่มาตามนัด ({{ missedCount }})</option>
              <option :value="APPT_STATUS_CANCELED">ยกเลิก ({{ canceledCount }})</option>
            </select>
          </label>
        </div>

        <div class="list-tabs" role="group" aria-label="หมวดรายการนัดหมาย">
          <button type="button" :class="{ active: periodFilter === 'active' }" :aria-pressed="periodFilter === 'active'" @click="setPeriodFilter('active')">กำลังดำเนินการ <span>{{ activeAppointmentCount }}</span></button>
          <button type="button" :class="{ active: periodFilter === 'history' }" :aria-pressed="periodFilter === 'history'" @click="setPeriodFilter('history')">ประวัติ <span>{{ appointments.length - activeAppointmentCount }}</span></button>
        </div>

        <div id="appointment-list" class="appointment-list">
          <article v-for="item in filteredAppointments" :id="`appointment-${item.appt_id}`" :key="item.appt_id" class="appointment-card">
            <div class="date-card">
              <span>{{ getMonth(item.appt_date) }}</span>
              <strong>{{ getDay(item.appt_date) }}</strong>
            </div>

            <div class="appointment-body">
              <div class="appointment-head">
                <div>
                  <p class="appointment-label">{{ normalizeStatus(item.appt_status) === APPT_STATUS_CLINIC_PENDING ? 'คำขอนัดหมาย' : 'คิวนัดหมาย' }}</p>
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
                <span class="fact-chip"><AppIcon name="stethoscope" :size="15" /> {{ item.vet_name || 'รอระบุสัตวแพทย์' }}</span>
                <span class="fact-chip subtle">รหัส {{ item.appt_id }}</span>
              </div>

              <div class="appointment-alerts">
                <span v-if="isToday(item) && normalizeStatus(item.appt_status) !== APPT_STATUS_CLINIC_PENDING" class="inline-alert success">วันนี้มีนัดหมาย</span>
                <span v-else-if="isTomorrow(item) && normalizeStatus(item.appt_status) !== APPT_STATUS_CLINIC_PENDING" class="inline-alert info">พรุ่งนี้มีนัดหมาย</span>
                <span v-else-if="isOverdue(item)" class="inline-alert danger">เลยเวลาที่ขอนัดแล้ว</span>
              </div>

              <p
                v-if="normalizeStatus(item.appt_status) === APPT_STATUS_CANCELED && item.cancel_reason"
                class="cancel-note"
              >
                {{ item.request_source === 'owner' ? 'เหตุผลที่ไม่รับนัด/ยกเลิก' : 'เหตุผลที่ยกเลิก' }}: {{ item.cancel_reason }}
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
                <button type="button" class="cancel-btn" :disabled="respondingId === item.appt_id" @click="openCancelDialog(item, $event)">
                  ยกเลิกนัดหมาย
                </button>
              </div>
              <div v-else-if="normalizeStatus(item.appt_status) === APPT_STATUS_CLINIC_PENDING" class="response-actions">
                <p class="response-help">ส่งคำขอแล้ว คลินิกกำลังตรวจสอบคิวนี้</p>
                <button type="button" class="cancel-btn" :disabled="respondingId === item.appt_id" @click="openCancelDialog(item, $event)">ยกเลิกคำขอ</button>
              </div>
            </div>

          </article>
        </div>
        <p v-if="filteredAppointments.length === 0" class="filtered-empty">{{ periodFilter === 'history' ? 'ยังไม่มีประวัตินัดหมายในสถานะที่เลือก' : 'ยังไม่มีนัดที่กำลังดำเนินการในสถานะที่เลือก' }}</p>
      </section>
    </template>

    <div v-if="cancelDialogOpen" class="dialog-overlay" @click.self="closeCancelDialog" @keydown="handleCancelDialogKeydown">
      <form
        ref="cancelDialog"
        class="cancel-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-dialog-title"
        @submit.prevent="submitCancellation"
      >
        <div>
          <h2 id="cancel-dialog-title">{{ cancelTarget?.appt_status === APPT_STATUS_CLINIC_PENDING ? 'ยกเลิกคำขอนัดหมาย' : 'ยกเลิกนัดหมาย' }}</h2>
          <p>เมื่อยืนยัน ระบบจะยกเลิกรายการนี้ทันที และบันทึกเหตุผลให้คลินิกทราบ</p>
        </div>
        <dl v-if="cancelTarget" class="cancel-summary">
          <div><dt>สัตว์เลี้ยง</dt><dd>{{ cancelTarget.pet_name || 'สัตว์เลี้ยงในระบบ' }}</dd></div>
          <div><dt>วันและเวลา</dt><dd>{{ formatDateLabel(cancelTarget.appt_date) }} · {{ formatTime(cancelTarget.appt_time) }} น.</dd></div>
          <div><dt>สัตวแพทย์</dt><dd>{{ cancelTarget.vet_name || 'รอระบุสัตวแพทย์' }}</dd></div>
        </dl>
        <label>
          <span>เหตุผลที่ยกเลิก *</span>
          <textarea ref="cancelReasonInput" v-model.trim="cancelReason" rows="4" maxlength="500" placeholder="เช่น ไม่สะดวกตามวันและเวลาที่กำหนด" required></textarea>
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
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import axios from 'axios'
import AppIcon from '../../components/AppIcon.vue'

const APPT_STATUS_PENDING = 'รอ'
const APPT_STATUS_CLINIC_PENDING = 'รอคลินิกยืนยัน'
const APPT_STATUS_CONFIRMED = 'ยืนยัน'
const APPT_STATUS_CANCELED = 'ยกเลิก'
const APPT_STATUS_COMPLETED = 'เสร็จสิ้น'
const APPT_STATUS_MISSED = 'ไม่มาตามนัด'

const appointments = ref([])
const pets = ref([])
const petsLoading = ref(true)
const petsError = ref('')
const bookingVets = ref([])
const bookingPetId = ref('')
const bookingDate = ref('')
const bookingVetId = ref('')
const bookingHour = ref('')
const bookingMinute = ref('')
const bookingTimeTouched = ref(false)
const bookingReason = ref('')
const bookingSubmitting = ref(false)
const schedules = ref([])
const currentMonth = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
const selectedDate = ref('')
const respondingId = ref('')
const cancelDialogOpen = ref(false)
const cancelTarget = ref(null)
const cancelReason = ref('')
const responseError = ref('')
const appointmentsLoading = ref(true)
const appointmentsError = ref('')
const scheduleLoading = ref(true)
const scheduleError = ref('')
const actionMessage = ref('')
const actionMessageTone = ref('success')
const statusFilter = ref('all')
const periodFilter = ref('active')
const cancelDialog = ref(null)
const cancelReasonInput = ref(null)
const weekdayLabels = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา']
let cancelTrigger = null
let actionMessageTimer = null

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
})

const normalizeStatus = (value) => {
  const text = String(value || '').trim()
  if (text === APPT_STATUS_CANCELED) return APPT_STATUS_CANCELED
  if (text === APPT_STATUS_CLINIC_PENDING) return APPT_STATUS_CLINIC_PENDING
  if (text === APPT_STATUS_CONFIRMED) return APPT_STATUS_CONFIRMED
  if (text === APPT_STATUS_COMPLETED) return APPT_STATUS_COMPLETED
  if (text === APPT_STATUS_MISSED) return APPT_STATUS_MISSED
  return APPT_STATUS_PENDING
}

const normalizeDateKey = (value) => {
  const match = String(value || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  return match ? `${match[1]}-${match[2]}-${match[3]}` : ''
}

const toLocalDate = (value) => {
  const dateKey = normalizeDateKey(value)
  if (!dateKey) return null
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return Number.isNaN(date.getTime()) ? null : date
}

const toDateTime = (apptDate, apptTime = '00:00') => {
  const dateKey = normalizeDateKey(apptDate)
  if (!dateKey) return null
  const safeTime = String(apptTime || '00:00').slice(0, 5)
  const date = new Date(`${dateKey}T${safeTime}:00`)
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

const isActiveAppointment = (item) => {
  const status = normalizeStatus(item.appt_status)
  return status === APPT_STATUS_PENDING || status === APPT_STATUS_CLINIC_PENDING || status === APPT_STATUS_CONFIRMED
}

const isToday = (item) => {
  if (!isActiveAppointment(item) || normalizeStatus(item.appt_status) === APPT_STATUS_CLINIC_PENDING) return false
  const at = toDateTime(item.appt_date, item.appt_time)
  if (!at) return false
  const today = startOfToday().getTime()
  const tomorrow = startOfTomorrow().getTime()
  return at.getTime() >= today && at.getTime() < tomorrow
}

const isTomorrow = (item) => {
  if (!isActiveAppointment(item) || normalizeStatus(item.appt_status) === APPT_STATUS_CLINIC_PENDING) return false
  const at = toDateTime(item.appt_date, item.appt_time)
  if (!at) return false
  const tomorrow = startOfTomorrow().getTime()
  const nextDay = tomorrow + 24 * 60 * 60 * 1000
  return at.getTime() >= tomorrow && at.getTime() < nextDay
}

const isOverdue = (item) => {
  if (!isActiveAppointment(item) || normalizeStatus(item.appt_status) === APPT_STATUS_CLINIC_PENDING) return false
  const at = toDateTime(item.appt_date, item.appt_time)
  return at ? at.getTime() < Date.now() : false
}

const statusClass = (status) => {
  const normalized = normalizeStatus(status)
  if (normalized === APPT_STATUS_CONFIRMED) return 'confirmed'
  if (normalized === APPT_STATUS_CANCELED) return 'canceled'
  if (normalized === APPT_STATUS_COMPLETED) return 'completed'
  if (normalized === APPT_STATUS_MISSED) return 'missed'
  if (normalized === APPT_STATUS_CLINIC_PENDING) return 'pending'
  return 'pending'
}

const statusLabel = (status) => {
  const normalized = normalizeStatus(status)
  if (normalized === APPT_STATUS_CANCELED) return 'ยกเลิก'
  if (normalized === APPT_STATUS_CONFIRMED) return 'ยืนยัน'
  if (normalized === APPT_STATUS_COMPLETED) return 'เสร็จสิ้น'
  if (normalized === APPT_STATUS_MISSED) return 'ไม่มาตามนัด'
  if (normalized === APPT_STATUS_CLINIC_PENDING) return 'รอคลินิกยืนยัน'
  return 'รอยืนยัน'
}

const pendingCount = computed(() =>
  appointments.value.filter((item) => normalizeStatus(item.appt_status) === APPT_STATUS_PENDING).length
)

const clinicPendingCount = computed(() =>
  appointments.value.filter((item) => normalizeStatus(item.appt_status) === APPT_STATUS_CLINIC_PENDING).length
)

const confirmedCount = computed(() =>
  appointments.value.filter((item) => normalizeStatus(item.appt_status) === APPT_STATUS_CONFIRMED).length
)

const canceledCount = computed(() =>
  appointments.value.filter((item) => normalizeStatus(item.appt_status) === APPT_STATUS_CANCELED).length
)

const completedCount = computed(() =>
  appointments.value.filter((item) => normalizeStatus(item.appt_status) === APPT_STATUS_COMPLETED).length
)

const missedCount = computed(() =>
  appointments.value.filter((item) => normalizeStatus(item.appt_status) === APPT_STATUS_MISSED).length
)

const sortedAppointments = computed(() => {
  const now = Date.now()
  return [...appointments.value].sort((a, b) => {
    const left = toDateTime(a.appt_date, a.appt_time)?.getTime() || 0
    const right = toDateTime(b.appt_date, b.appt_time)?.getTime() || 0
    const leftUpcoming = isActiveAppointment(a) && left >= now
    const rightUpcoming = isActiveAppointment(b) && right >= now
    if (leftUpcoming !== rightUpcoming) return leftUpcoming ? -1 : 1
    return leftUpcoming ? left - right : right - left
  })
})

const isCurrentAppointment = (item) => {
  if (!isActiveAppointment(item)) return false
  const status = normalizeStatus(item.appt_status)
  const at = toDateTime(item.appt_date, item.appt_time)
  return status !== APPT_STATUS_CONFIRMED || (at && at.getTime() >= Date.now())
}

const activeAppointmentCount = computed(() =>
  appointments.value.filter(isCurrentAppointment).length
)

const attentionAppointment = computed(() =>
  sortedAppointments.value.find((item) =>
    normalizeStatus(item.appt_status) === APPT_STATUS_PENDING && !isOverdue(item)
  ) || null
)

const filteredAppointments = computed(() => {
  const inPeriod = sortedAppointments.value.filter((item) =>
    periodFilter.value === 'active' ? isCurrentAppointment(item) : !isCurrentAppointment(item)
  )
  if (statusFilter.value === 'all') return inPeriod
  return inPeriod.filter((item) => normalizeStatus(item.appt_status) === statusFilter.value)
})

const setPeriodFilter = (period) => {
  periodFilter.value = period
  statusFilter.value = 'all'
}

const revealAppointment = async (item) => {
  setPeriodFilter('active')
  await nextTick()
  document.getElementById(`appointment-${item.appt_id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

const formatDateLabel = (dateStr) => {
  const date = toLocalDate(dateStr)
  return !date
    ? '-'
    : date.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
}

const getDay = (dateStr) => {
  const date = toLocalDate(dateStr)
  return date ? date.getDate() : '-'
}

const getMonth = (dateStr) => {
  const date = toLocalDate(dateStr)
  return date ? date.toLocaleDateString('th-TH', { month: 'short' }) : '-'
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

const isCurrentMonth = computed(() => {
  const now = new Date()
  return currentMonth.value.getFullYear() === now.getFullYear() && currentMonth.value.getMonth() === now.getMonth()
})

const scheduleCountByDate = computed(() => {
  const vetsByDate = {}
  schedules.value.forEach((shift) => {
    const key = String(shift.work_date || '').slice(0, 10)
    if (!vetsByDate[key]) vetsByDate[key] = new Set()
    vetsByDate[key].add(String(shift.vet_id))
  })
  return Object.fromEntries(Object.entries(vetsByDate).map(([key, vets]) => [key, vets.size]))
})

const activeAppointmentsByDate = computed(() => {
  const byDate = {}
  appointments.value.filter(isCurrentAppointment).forEach((item) => {
    const key = normalizeDateKey(item.appt_date)
    if (!key) return
    if (!byDate[key]) byDate[key] = []
    byDate[key].push(item)
  })
  Object.values(byDate).forEach((items) => items.sort((a, b) => String(a.appt_time || '').localeCompare(String(b.appt_time || ''))))
  return byDate
})

const hasSelectableSchedules = computed(() => {
  const today = toDateKey(new Date())
  return Object.keys(scheduleCountByDate.value).some((dateKey) => dateKey >= today)
})

const calendarDays = computed(() => {
  const first = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth(), 1)
  const mondayOffset = (first.getDay() + 6) % 7
  const start = new Date(first.getFullYear(), first.getMonth(), first.getDate() - mondayOffset)
  const today = toDateKey(new Date())
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const visibleDays = Math.ceil((mondayOffset + daysInMonth) / 7) * 7

  return Array.from({ length: visibleDays }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)
    const key = toDateKey(date)
    return {
      key,
      day: date.getDate(),
      inMonth: date.getMonth() === currentMonth.value.getMonth(),
      isToday: key === today,
      scheduleCount: scheduleCountByDate.value[key] || 0,
      appointmentCount: activeAppointmentsByDate.value[key]?.length || 0
    }
  })
})

const calendarDayLabel = (day) => {
  const ownAppointments = day.appointmentCount > 0 ? `มีนัดของคุณ ${day.appointmentCount} รายการ ` : ''
  const availability = day.scheduleCount > 0
    ? `มีสัตวแพทย์เข้าเวร ${day.scheduleCount} คน`
    : 'ยังไม่มีตารางเข้าเวร'
  return `${formatDateLabel(day.key)} ${ownAppointments}${availability} เลือกเพื่อดูรายละเอียดหรือส่งคำขอ${day.isToday ? ' วันนี้' : ''}`
}

const selectedDayAppointments = computed(() => activeAppointmentsByDate.value[selectedDate.value] || [])

const selectedSchedules = computed(() =>
  schedules.value.filter((shift) => String(shift.work_date || '').slice(0, 10) === selectedDate.value)
)

const availableBookingVets = computed(() => bookingVets.value)

const bookingTime = computed(() => {
  if (!/^\d{2}$/.test(bookingHour.value) || !/^\d{2}$/.test(bookingMinute.value)) return ''
  const hour = Number(bookingHour.value)
  const minute = Number(bookingMinute.value)
  return hour <= 23 && minute <= 59 ? `${bookingHour.value}:${bookingMinute.value}` : ''
})

const bookingTimeError = computed(() => {
  if (bookingHour.value.length === 2 && Number(bookingHour.value) > 23) return 'ชั่วโมงต้องอยู่ระหว่าง 00–23'
  if (bookingMinute.value.length === 2 && Number(bookingMinute.value) > 59) return 'นาทีต้องอยู่ระหว่าง 00–59'
  if (bookingTimeTouched.value && !bookingTime.value) return 'กรอกชั่วโมงและนาทีให้ครบ เช่น 13:34'
  if (bookingTime.value && new Date(`${bookingDate.value}T${bookingTime.value}:00+07:00`).getTime() < Date.now()) return 'วันและเวลานี้ผ่านไปแล้ว กรุณาเลือกเวลาใหม่'
  return ''
})

const bookingTimeWarning = computed(() => {
  if (!bookingTime.value || bookingTimeError.value) return ''
  if (scheduleError.value) return 'ยังตรวจตารางเวรไม่ได้ คลินิกจะตรวจสอบก่อนยืนยันนัด'
  const shifts = bookingVetId.value
    ? selectedSchedules.value.filter((shift) => String(shift.vet_id) === String(bookingVetId.value))
    : selectedSchedules.value
  const inShift = shifts.some((shift) => bookingTime.value >= String(shift.start_time).slice(0, 5) && bookingTime.value < String(shift.end_time).slice(0, 5))
  return inShift ? '' : 'ยังไม่พบเวรในเวลาที่ขอ คลินิกจะตรวจสอบกับสัตวแพทย์ก่อนยืนยันนัด'
})

const resetBookingTime = () => {
  bookingHour.value = ''
  bookingMinute.value = ''
  bookingTimeTouched.value = false
}

const onTimePartInput = (part, event) => {
  const digits = String(event.target.value).replace(/\D/g, '').slice(0, 2)
  event.target.value = digits
  if (part === 'hour') bookingHour.value = digits
  else bookingMinute.value = digits
}

const onTimePartBlur = (part) => {
  bookingTimeTouched.value = true
  const value = part === 'hour' ? bookingHour.value : bookingMinute.value
  if (value.length !== 1) return
  if (part === 'hour') bookingHour.value = value.padStart(2, '0')
  else bookingMinute.value = value.padStart(2, '0')
}

const selectCalendarDay = (dateKey) => {
  selectedDate.value = dateKey
  bookingVetId.value = ''
  bookingDate.value = dateKey
  resetBookingTime()
}

watch(bookingDate, (dateKey) => {
  if (dateKey && selectedDate.value !== dateKey) selectedDate.value = dateKey
  resetBookingTime()
  if (bookingVetId.value && !availableBookingVets.value.some((vet) => vet.vet_id === bookingVetId.value)) bookingVetId.value = ''
})

const loadPets = async () => {
  petsLoading.value = true
  petsError.value = ''
  try {
    const response = await axios.get('http://localhost:3000/api/pets', authHeaders())
    pets.value = Array.isArray(response.data) ? response.data : []
    if (pets.value.length === 1) bookingPetId.value = pets.value[0].pet_id
  } catch (error) {
    pets.value = []
    petsError.value = error.response?.data?.message || 'โหลดรายชื่อสัตว์เลี้ยงไม่สำเร็จ'
  } finally {
    petsLoading.value = false
  }
}

const loadBookingVets = async () => {
  try {
    const response = await axios.get('http://localhost:3000/api/appointments/veterinarians-list', authHeaders())
    bookingVets.value = Array.isArray(response.data) ? response.data : []
  } catch (_error) {
    bookingVets.value = []
  }
}

const submitBooking = async () => {
  bookingTimeTouched.value = true
  if (!bookingPetId.value || !bookingDate.value || !bookingTime.value || bookingTimeError.value || !bookingReason.value.trim()) return
  bookingSubmitting.value = true
  try {
    const response = await axios.post('http://localhost:3000/api/appointments/request', {
      pet_id: bookingPetId.value,
      vet_id: bookingVetId.value || null,
      appt_date: bookingDate.value,
      appt_time: bookingTime.value,
      appt_reason: bookingReason.value.trim()
    }, authHeaders())
    bookingReason.value = ''
    resetBookingTime()
    await loadAppointments(true)
    showActionMessage(response.data?.message || 'ส่งคำขอนัดหมายแล้ว รอคลินิกยืนยัน')
  } catch (error) {
    showActionMessage(error.response?.data?.message || 'ส่งคำขอนัดหมายไม่สำเร็จ กรุณาลองอีกครั้ง', 'error')
  } finally {
    bookingSubmitting.value = false
  }
}

const loadSchedules = async () => {
  scheduleLoading.value = true
  scheduleError.value = ''
  try {
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
    const firstScheduledDate = schedules.value
      .map((shift) => String(shift.work_date || '').slice(0, 10))
      .filter((dateKey) => dateKey >= today && dateKey >= from && dateKey <= to)
      .sort()[0]
    selectedDate.value = firstScheduledDate || ''
    bookingDate.value = firstScheduledDate || ''
    bookingVetId.value = ''
  } catch (error) {
    schedules.value = []
    scheduleError.value = error.response?.data?.message || 'กรุณาตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง'
    selectedDate.value = ''
    bookingDate.value = ''
    bookingVetId.value = ''
  } finally {
    scheduleLoading.value = false
  }
}

const changeMonth = async (offset) => {
  if (offset < 0 && isCurrentMonth.value) return
  currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + offset, 1)
  await loadSchedules()
}

const showActionMessage = (message, tone = 'success') => {
  actionMessage.value = message
  actionMessageTone.value = tone
  if (actionMessageTimer) window.clearTimeout(actionMessageTimer)
  actionMessageTimer = window.setTimeout(() => {
    actionMessage.value = ''
  }, 5000)
}

const respondAppointment = async (item, action, reason = '') => {
  if (action === 'accept') {
    const detail = `${formatDateLabel(item.appt_date)} เวลา ${formatTime(item.appt_time)} น.`
    if (!confirm(`ยืนยันนัดหมายของ ${item.pet_name || 'สัตว์เลี้ยง'}\n${detail}\nสัตวแพทย์: ${item.vet_name || 'รอระบุ'} หรือไม่?`)) return false
  }
  responseError.value = ''
  respondingId.value = item.appt_id
  try {
    const response = await axios.patch(
      `http://localhost:3000/api/appointments/${item.appt_id}/respond`,
      { action, cancel_reason: reason },
      { ...authHeaders(), timeout: 12000 }
    )
    await loadAppointments(true)
    showActionMessage(response.data?.message || (action === 'cancel' ? 'ส่งคำขอยกเลิกแล้ว' : 'ยืนยันนัดหมายแล้ว'))
    return true
  } catch (error) {
    const message = error.code === 'ECONNABORTED'
      ? 'ระบบใช้เวลาตอบกลับนานเกินไป กรุณาตรวจสอบว่า backend เปิดอยู่แล้วลองอีกครั้ง'
      : (error.response?.data?.message || 'ตอบรับนัดหมายไม่สำเร็จ')
    if (action === 'cancel') {
      responseError.value = message
    } else {
      showActionMessage(message, 'error')
    }
    return false
  } finally {
    respondingId.value = ''
  }
}

const openCancelDialog = async (item, event) => {
  cancelTrigger = event?.currentTarget || document.activeElement
  cancelTarget.value = item
  cancelReason.value = ''
  responseError.value = ''
  cancelDialogOpen.value = true
  await nextTick()
  cancelReasonInput.value?.focus()
}

const closeCancelDialog = async () => {
  if (respondingId.value) return
  cancelDialogOpen.value = false
  cancelTarget.value = null
  cancelReason.value = ''
  responseError.value = ''
  await nextTick()
  cancelTrigger?.focus?.()
  cancelTrigger = null
}

const handleCancelDialogKeydown = (event) => {
  if (event.key === 'Escape') {
    event.preventDefault()
    closeCancelDialog()
    return
  }
  if (event.key !== 'Tab' || !cancelDialog.value) return
  const focusable = [...cancelDialog.value.querySelectorAll(
    'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
  )]
  if (!focusable.length) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

const submitCancellation = async () => {
  if (!cancelTarget.value || !cancelReason.value) return
  const saved = await respondAppointment(cancelTarget.value, 'cancel', cancelReason.value)
  if (saved) closeCancelDialog()
}

const loadAppointments = async (silent = false) => {
  if (!silent) appointmentsLoading.value = true
  appointmentsError.value = ''
  try {
    const userData = JSON.parse(localStorage.getItem('user') || 'null')
    if (!userData?.user_id) throw new Error('ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบอีกครั้ง')

    const response = await axios.get(
      `http://localhost:3000/api/appointments/my-appointments/${userData.user_id}`,
      authHeaders()
    )
    if (!response.data?.success) throw new Error(response.data?.message || 'ข้อมูลที่ได้รับไม่สมบูรณ์')

    appointments.value = (response.data.data || []).map((item) => ({
      ...item,
      appt_status: normalizeStatus(item.appt_status)
    }))
  } catch (error) {
    appointmentsError.value = error.response?.data?.message || error.message || 'กรุณาตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง'
  } finally {
    appointmentsLoading.value = false
  }
}

onMounted(() => {
  loadAppointments()
  loadSchedules()
  loadPets()
  loadBookingVets()
})

onBeforeUnmount(() => {
  if (actionMessageTimer) window.clearTimeout(actionMessageTimer)
})
</script>

<style scoped>
.appointments-page {
  display: grid;
  gap: 18px;
  width: min(1080px, 100%);
  margin: 0 auto;
}

.booking-panel {
  padding: 22px;
  border: 1px solid var(--pc-border);
  border-radius: 14px;
  background: var(--pc-surface);
}

.booking-intro,
.booking-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.booking-intro h2 { margin: 0; font-size: 1.25rem; color: var(--pc-text); }
.booking-intro p,
.booking-footer p { margin: 6px 0 0; color: var(--pc-text-sub); }
.booking-process { color: #0b5f59; font-size: 0.86rem; font-weight: 700; }
.booking-form { display: grid; gap: 18px; margin-top: 22px; }
.booking-fields { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.booking-fields label,
.booking-reason { display: grid; gap: 6px; color: var(--pc-text); font-weight: 700; }
.booking-fields input,
.booking-fields select,
.booking-reason textarea {
  width: 100%; min-height: 44px; padding: 10px 12px;
  border: 1px solid var(--pc-border-strong); border-radius: 10px;
  background: #fff; color: var(--pc-text);
}
.booking-reason textarea { resize: vertical; min-height: 84px; }
.booking-slots { display: grid; gap: 10px; }
.booking-slots > p { margin: 0; color: var(--pc-text-sub); }
.slot-options { display: flex; flex-wrap: wrap; gap: 8px; }
.slot-option {
  display: grid; gap: 2px; min-width: 94px; min-height: 52px;
  padding: 7px 12px; border: 1px solid var(--pc-border-strong); border-radius: 10px;
  background: #fff; color: var(--pc-text); text-align: center; font-weight: 700;
}
.slot-option small { color: var(--pc-text-sub); font-size: 0.72rem; font-weight: 500; }
.slot-option:hover { border-color: var(--pc-primary); }
.slot-option.selected { border-color: var(--pc-primary); background: var(--pc-primary-soft); color: #0b5f59; }
.booking-footer { padding-top: 15px; border-top: 1px solid var(--pc-border-soft); }
.booking-submit,
.booking-link {
  display: inline-flex; align-items: center; justify-content: center;
  min-height: 44px; padding: 10px 18px; border-radius: 10px;
  background: var(--pc-primary); color: #fff; font-weight: 800; text-decoration: none;
}
.booking-submit:hover,
.booking-link:hover { background: var(--pc-primary-hover); }
.booking-submit:disabled { cursor: not-allowed; background: #9ab9b5; }
.booking-state { margin-top: 18px; color: var(--pc-text-sub); }
.booking-state p { margin: 5px 0 12px; }
.booking-state strong { color: var(--pc-text); }
@media (max-width: 720px) {
  .booking-panel { padding: 18px; }
  .booking-intro,
  .booking-footer { align-items: stretch; flex-direction: column; }
  .booking-fields { grid-template-columns: 1fr; }
  .booking-submit { width: 100%; }
}

.spotlight-card,
.empty-panel,
.list-section,
.appointment-card {
  background: #ffffff;
  border: 1px solid #d9e2ec;
  border-radius: 14px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
}

.appointment-label,
.spotlight-label {
  margin: 0 0 8px;
  color: #0f766e;
  font-size: 12px;
  font-weight: 800;
}

.spotlight-card h2,
.spotlight-meta h3,
.list-head h2,
.appointment-head h3 {
  margin: 0;
  color: #0f172a;
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
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: #e8f7f3;
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

.page-feedback {
  position: sticky;
  top: 12px;
  z-index: 20;
  padding: 12px 14px;
  border: 1px solid #a7e5d7;
  border-radius: 10px;
  background: #ecfdf8;
  color: #115e59;
  font-weight: 700;
}

.page-feedback.error,
.error-panel {
  border-color: #fecaca;
  background: #fff7f7;
  color: #991b1b;
}

.loading-panel {
  background: #f8fbfd;
}

.retry-btn {
  min-height: 40px;
  margin-top: 12px;
  padding: 8px 14px;
  border: 1px solid #0f766e;
  border-radius: 10px;
  background: #ffffff;
  color: #0f766e;
  font: inherit;
  font-weight: 800;
  cursor: pointer;
}

.overview-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 18px;
}

.spotlight-card {
  padding: 22px;
  background: #10243a;
  border-color: transparent;
  color: #ffffff;
}

.spotlight-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

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
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
}

.spotlight-date {
  border-radius: 10px;
  padding: 12px 10px;
  text-align: center;
  background: rgba(255, 255, 255, 0.1);
}

.spotlight-date span {
  display: block;
  font-size: 11px;
  font-weight: 800;
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

.spotlight-actions .accept-btn {
  border-color: #ffffff;
  background: #ffffff;
  color: #0f5f59;
}

.spotlight-actions .cancel-btn {
  border-color: rgba(255, 255, 255, 0.5);
  background: transparent;
  color: #ffffff;
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

.status-filter {
  display: grid;
  gap: 6px;
  color: #475569;
  font-size: 12px;
  font-weight: 700;
}

.status-filter select {
  min-width: 190px;
  min-height: 42px;
  padding: 8px 34px 8px 11px;
  border: 1px solid #cbd8e3;
  border-radius: 10px;
  background: #ffffff;
  color: #0f172a;
  font: inherit;
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
  transition: border-color 0.18s ease, background-color 0.18s ease;
}

.appointment-card:hover {
  border-color: #cbd9e6;
  background: #fcfefe;
}

.date-card {
  border-radius: 12px;
  padding: 12px 10px;
  text-align: center;
  background: #e8f7f3;
  border: 1px solid #c9f2e8;
  color: #0f766e;
}

.date-card span {
  display: block;
  font-size: 11px;
  font-weight: 800;
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
  background: #dbeafe;
  color: #1d4ed8;
}

.status-badge.pending {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.canceled {
  background: #fee2e2;
  color: #b91c1c;
}

.status-badge.completed {
  background: #dcfce7;
  color: #166534;
}

.status-badge.missed {
  background: #f1f5f9;
  color: #475569;
}

.filtered-empty {
  margin: 0;
  padding: 28px 16px;
  border: 1px dashed #cbd8e3;
  border-radius: 12px;
  color: #64748b;
  text-align: center;
}

.schedule-disclosure {
  border: 1px solid #d9e2ec;
  border-radius: 14px;
  background: #ffffff;
  overflow: hidden;
}

.schedule-disclosure > summary {
  min-height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
  color: #0f172a;
  cursor: pointer;
  list-style: none;
}

.schedule-disclosure > summary::-webkit-details-marker {
  display: none;
}

.schedule-disclosure > summary span:first-child {
  display: grid;
  gap: 3px;
}

.schedule-disclosure > summary small {
  color: #64748b;
  line-height: 1.45;
}

.schedule-disclosure > summary span:last-child {
  color: #0f766e;
  font-size: 13px;
  font-weight: 800;
  white-space: nowrap;
}

.schedule-disclosure[open] > summary {
  border-bottom: 1px solid #d9e2ec;
}

.schedule-disclosure[open] > summary span:last-child::after {
  content: ' ▲';
}

.schedule-disclosure:not([open]) > summary span:last-child::after {
  content: ' ▼';
}

.schedule-panel {
  padding: 22px;
  background: #ffffff;
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
  width: 42px;
  height: 42px;
  border: 1px solid #d7e2ec;
  border-radius: 10px;
  background: #ffffff;
  color: #0f766e;
  font-size: 1.45rem;
  cursor: pointer;
}

.schedule-state {
  min-height: 140px;
  display: grid;
  place-items: center;
  padding: 24px;
  border: 1px dashed #cbd8e3;
  border-radius: 12px;
  color: #64748b;
  text-align: center;
}

.schedule-state.error-state {
  justify-items: center;
  color: #991b1b;
  background: #fff7f7;
  border-color: #fecaca;
}

.schedule-state p {
  margin: 6px 0 0;
}

.schedule-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(260px, 0.75fr);
  gap: 18px;
}

.calendar-shell,
.day-schedule {
  border: 1px solid #dce7ef;
  border-radius: 12px;
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
  min-height: 68px;
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
  background: transparent;
  border-color: transparent;
  cursor: default;
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
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 26px 70px rgba(15, 23, 42, 0.24);
}

.cancel-summary {
  display: grid;
  gap: 9px;
  margin: 0;
  padding: 14px;
  border: 1px solid #d9e2ec;
  border-radius: 12px;
  background: #f8fbfd;
}

.cancel-summary div {
  display: grid;
  grid-template-columns: 110px 1fr;
  gap: 10px;
}

.cancel-summary dt {
  color: #64748b;
  font-size: 13px;
}

.cancel-summary dd {
  margin: 0;
  color: #0f172a;
  font-size: 13px;
  font-weight: 700;
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

.cancel-dialog textarea:focus,
.status-filter select:focus,
.month-switcher button:focus-visible,
.calendar-day:focus-visible,
.retry-btn:focus-visible {
  outline: 3px solid rgba(20, 184, 166, 0.24);
  outline-offset: 2px;
  border-color: #0f766e;
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

  .appointment-card {
    grid-template-columns: 1fr;
  }

  .appointment-side {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
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
    grid-template-columns: 42px 1fr 42px;
  }

  .schedule-panel {
    padding: 16px;
  }

  .calendar-day {
    min-height: 48px;
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

  .status-filter select {
    width: 100%;
  }

  .schedule-disclosure > summary {
    align-items: flex-start;
  }

  .schedule-disclosure > summary small {
    display: none;
  }

  .cancel-summary div {
    grid-template-columns: 1fr;
    gap: 2px;
  }
}

/* Calendar-first owner booking: shift visibility and actual bookable slots stay distinct. */
.appointments-page {
  width: min(1180px, 100%);
  gap: 16px;
  min-width: 0;
}

.attention-strip {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 16px;
  border: 1px solid #efdcb1;
  border-radius: 12px;
  background: #fff9ec;
  color: #754d12;
}
.attention-mark { width: 8px; height: 8px; flex: 0 0 auto; border-radius: 50%; background: #ad731b; }
.attention-strip > div { flex: 1; min-width: 0; }
.attention-strip strong { display: block; font-size: 14px; }
.attention-strip p { margin: 2px 0 0; font-size: 13px; line-height: 1.5; }
.attention-strip button {
  flex: 0 0 auto;
  min-height: 38px;
  padding: 7px 12px;
  border: 1px solid #c58b38;
  border-radius: 9px;
  background: transparent;
  color: #754d12;
  font-weight: 700;
}

.booking-panel,
.request-panel,
.list-section { min-width: 0; border: 1px solid #d9e2ec; border-radius: 16px; background: #fff; box-shadow: none; }
.booking-panel { padding: 24px; }
.booking-intro { align-items: end; margin-bottom: 22px; }
.booking-intro h2 { font-size: 1.45rem; line-height: 1.3; }
.booking-intro p { margin-top: 4px; line-height: 1.55; }
.month-switcher { grid-template-columns: 42px minmax(140px, auto) 42px; }
.month-switcher button:disabled { opacity: .4; }
.schedule-layout { grid-template-columns: minmax(0, 1.4fr) minmax(288px, .85fr); gap: 24px; align-items: start; }
.calendar-shell { min-width: 0; border: 0; border-radius: 0; background: transparent; overflow: visible; }
.weekday-row { padding: 0 4px 11px; background: transparent; }
.calendar-grid { gap: 6px; padding: 0; }
.calendar-day { min-height: 76px; padding: 8px; border: 1px solid transparent; border-radius: 10px; }
.calendar-day:disabled { opacity: 1; cursor: default; }
.calendar-day:disabled:not(.available) { color: #a6b3c1; }
.calendar-day.available { background: #eef8f5; border-color: #d7eee7; }
.calendar-day.available:hover:not(:disabled) { border-color: #0f766e; }
.calendar-day.available:disabled { opacity: .46; }
.calendar-day.has-my-appointment:not(.selected) { border-color: #d89c38; }
.calendar-day.has-my-appointment:not(.selected):hover:not(:disabled) { border-color: #a6630a; }
.calendar-day.selected { background: #0f766e; border-color: #0f766e; color: #fff; }
.calendar-day.selected span,
.calendar-day.selected small { color: #fff; }
.calendar-day small { margin-top: 5px; font-size: 10px; line-height: 1.3; }
.calendar-day .calendar-my-appointment { width: fit-content; max-width: 100%; padding: 2px 4px; border-radius: 4px; background: #fff1d7; color: #72400a; white-space: nowrap; }
.calendar-day .calendar-shift-count { color: #0b685f; }
.calendar-day.selected .calendar-my-appointment { background: #fff1d7; color: #72400a; }
.calendar-day.selected .calendar-shift-count { color: #fff; }
.calendar-empty { margin: 12px 0 0; padding: 10px 0; color: #526277; font-size: 13px; line-height: 1.5; }
.calendar-legend { display: flex; flex-wrap: wrap; gap: 6px 16px; padding-top: 13px; color: #526277; font-size: 12px; }
.calendar-legend span { display: inline-flex; align-items: center; gap: 7px; }
.calendar-legend i { width: 8px; height: 8px; border-radius: 50%; }
.calendar-legend .legend-shift { background: #0f766e; }
.calendar-legend .legend-appointment { background: #b36b0e; }
.calendar-legend span:last-child { margin-left: auto; }
.schedule-inline-error { padding: 20px; border: 1px solid #fecaca; border-radius: 12px; background: #fff7f7; color: #991b1b; }
.schedule-inline-error p { margin: 5px 0 0; line-height: 1.5; }
.schedule-inline-error .retry-btn { margin-top: 10px; }
.day-schedule { min-width: 0; padding: 18px; border: 0; border-radius: 13px; background: #eef8f5; }
.day-schedule-head span { color: #0b685f; }
.day-schedule-head strong { margin-top: 5px; font-size: 1.1rem; line-height: 1.4; }
.selected-day-appointments { margin-top: 14px; padding: 12px; border-radius: 10px; background: #fff; }
.selected-day-appointments > strong { color: #0f172a; font-size: 13px; }
.selected-day-appointment { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-top: 10px; }
.selected-day-appointment + .selected-day-appointment { padding-top: 10px; border-top: 1px solid #e5edf5; }
.selected-day-appointment > div { display: grid; gap: 2px; min-width: 0; }
.selected-day-appointment span { color: #0f172a; font-size: 13px; font-weight: 700; }
.selected-day-appointment small { color: #77500d; font-size: 11px; }
.selected-day-appointment button { flex: 0 0 auto; min-height: 36px; padding: 6px 10px; border: 1px solid #cbd8e3; border-radius: 8px; background: #fff; color: #0b685f; font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; }
.selected-day-appointment button:hover { border-color: #0f766e; background: #f1f9f7; }
.vet-shift-list { gap: 0; margin-top: 14px; border-top: 1px solid #d4e6e2; }
.vet-shift { grid-template-columns: 34px 1fr; gap: 9px; padding: 11px 0; border: 0; border-bottom: 1px solid #d4e6e2; border-radius: 0; background: transparent; }
.vet-avatar { width: 34px; height: 34px; border-radius: 9px; background: #fff; }
.vet-shift span { font-size: 12px; }
.no-shift { margin: 12px 0 0; padding: 12px 0; text-align: left; color: #526277; }
.booking-vet,
.booking-time,
.fallback-date { display: grid; gap: 6px; margin-top: 15px; color: #334155; font-size: 13px; font-weight: 700; }
.booking-vet select,
.booking-time input,
.fallback-date input,
.request-fields select,
.request-fields textarea {
  width: 100%; min-height: 44px; padding: 9px 12px;
  border: 1px solid #cbd8e3; border-radius: 10px;
  background: #fff; color: #0f172a; font: inherit;
}
.booking-vet > small { color: #526277; font-size: 11px; font-weight: 400; line-height: 1.45; }
.time-entry { display: flex; align-items: end; gap: 9px; margin-top: 2px; }
.time-part { display: grid; gap: 5px; width: 82px; min-width: 0; }
.time-part > span { color: #526277; font-size: 11px; font-weight: 600; }
.time-entry .time-part input { min-height: 48px; padding: 8px 10px; text-align: center; font-size: 22px; font-weight: 700; font-variant-numeric: tabular-nums; letter-spacing: .02em; }
.time-entry .time-part input::placeholder { color: #91a3b4; opacity: 1; }
.time-entry .time-part input:disabled { background: #f1f5f9; color: #94a3b8; }
.time-entry.has-error .time-part input { border-color: #dc2626; }
.time-colon { align-self: end; padding-bottom: 10px; color: #334155; font-size: 24px; line-height: 28px; }
.time-suffix { align-self: end; padding-bottom: 13px; color: #526277; font-size: 13px; font-weight: 600; }
.booking-time-hint { margin: 7px 0 0; color: #526277; font-size: 12px; line-height: 1.5; }
.booking-time-hint.error { color: #b91c1c; }
.booking-time-warning { margin: 5px 0 0; color: #965b0a; font-size: 12px; font-weight: 500; line-height: 1.5; }
.booking-slots { margin-top: 18px; gap: 8px; }
.slots-head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
.slots-head strong { color: #0f172a; font-size: 14px; }
.slots-head span { color: #526277; font-size: 12px; }
.booking-slots > p { font-size: 13px; line-height: 1.55; }
.slot-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.slot-option { min-width: 0; min-height: 48px; border-radius: 9px; }
.slot-option.selected { background: #0f766e; color: #fff; }
.slot-option.selected small { color: #e4faf6; }
.selected-slot { color: #0b685f; font-size: 12px; line-height: 1.4; }

.request-panel { display: grid; grid-template-columns: minmax(200px, .7fr) minmax(0, 1.3fr); gap: 14px 20px; padding: 22px 24px; }
.request-intro h2 { margin: 0; color: #0f172a; font-size: 1.15rem; }
.request-intro p { margin: 6px 0 0; color: #526277; font-size: 13px; line-height: 1.55; }
.request-panel .booking-state { margin-top: 0; }
.request-panel .booking-form { display: grid; gap: 14px; margin-top: 0; }
.request-fields { display: grid; grid-template-columns: minmax(145px, .75fr) minmax(0, 1.25fr); gap: 12px; align-items: start; }
.request-fields label { display: grid; gap: 6px; min-width: 0; color: #334155; font-size: 13px; font-weight: 700; }
.request-fields textarea { min-height: 72px; resize: vertical; }
.request-panel .booking-footer { align-items: center; padding-top: 10px; }
.request-panel .booking-footer p { margin: 0; font-size: 12px; line-height: 1.5; }
.request-panel .booking-submit { flex: 0 0 auto; }

.list-section { padding: 22px 24px; }
.list-head { align-items: center; margin-bottom: 14px; }
.list-head h2 { font-size: 1.2rem; }
.list-copy { margin-top: 4px; font-size: 13px; }
.list-tabs { display: flex; gap: 4px; border-bottom: 1px solid #d9e2ec; margin-bottom: 4px; }
.list-tabs button { min-height: 42px; padding: 8px 12px; border: 0; border-bottom: 2px solid transparent; background: transparent; color: #526277; font: inherit; font-size: 14px; font-weight: 700; }
.list-tabs button.active { border-bottom-color: #0f766e; color: #0f766e; }
.list-tabs button span { margin-left: 4px; color: inherit; font-size: 12px; }
.appointment-list { gap: 0; }
.appointment-card { grid-template-columns: 66px minmax(0, 1fr); gap: 16px; padding: 18px 0; border: 0; border-bottom: 1px solid #e5edf5; border-radius: 0; box-shadow: none; scroll-margin-top: 24px; }
.appointment-card:last-child { border-bottom: 0; }
.appointment-card:hover { background: transparent; }
.date-card { display: grid; align-content: center; border: 0; border-radius: 10px; background: #e9f7f4; }
.date-card strong { margin-top: 3px; font-size: 1.65rem; }
.appointment-head h3 { font-size: 1.08rem; }
.appointment-label { margin-bottom: 3px; font-size: 11px; }
.appointment-subtitle { margin-top: 5px; font-size: 13px; line-height: 1.5; }
.appointment-facts { gap: 5px 14px; margin-top: 10px; }
.fact-chip { padding: 0; border-radius: 0; background: transparent; color: #526277; font-size: 12px; }
.fact-chip.subtle { background: transparent; color: #64748b; }
.appointment-alerts { min-height: 0; margin-top: 10px; }
.inline-alert { padding: 5px 8px; font-size: 11px; }
.response-actions { margin-top: 12px; }
.response-help { font-size: 12px; }
.status-filter select { min-height: 40px; }
.filtered-empty { border: 0; padding: 22px 4px; text-align: left; }
.appointments-page :is(button, select, textarea, input, a):focus-visible { outline: 3px solid rgba(15, 118, 110, .4); outline-offset: 2px; }

@media (max-width: 1000px) {
  .schedule-layout { grid-template-columns: minmax(0, 1.15fr) minmax(260px, .85fr); gap: 16px; }
  .request-panel { grid-template-columns: 1fr; }
}
@media (max-width: 760px) {
  .schedule-layout { grid-template-columns: 1fr; }
  .day-schedule { margin-top: 0; }
  .request-fields { grid-template-columns: 1fr 1.4fr; }
}
@media (max-width: 560px) {
  .appointments-page { gap: 14px; }
  .attention-strip { flex-wrap: wrap; padding: 12px; }
  .attention-strip button { margin-left: 20px; }
  .booking-panel,
  .request-panel,
  .list-section { padding: 18px; }
  .booking-intro { align-items: flex-start; gap: 12px; }
  .booking-intro h2 { font-size: 1.28rem; }
  .month-switcher { width: 100%; grid-template-columns: 42px 1fr 42px; }
  .calendar-grid { gap: 3px; }
  .calendar-day { min-height: 62px; padding: 5px; border-radius: 8px; }
  .calendar-day small { margin-top: 3px; font-size: 9px; }
  .calendar-legend { font-size: 11px; }
  .day-schedule { padding: 15px; }
  .request-fields { grid-template-columns: 1fr; }
  .request-panel .booking-footer { align-items: stretch; }
  .request-panel .booking-submit { width: 100%; }
  .list-head { align-items: stretch; }
  .status-filter select { width: 100%; }
  .appointment-card { grid-template-columns: 52px minmax(0, 1fr); gap: 12px; }
  .date-card { padding: 8px 5px; }
  .appointment-head { flex-direction: column; align-items: flex-start; gap: 8px; }
  .appointment-facts { gap: 7px 12px; }
}
</style>
