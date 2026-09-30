<template>
  <div class="admin-page appointments-admin-page">
    <p v-if="reviewMessage" class="review-feedback" role="status">{{ reviewMessage }}</p>
    <section class="page-header">
      <div>
        <h1>จัดการตารางนัดหมาย</h1>
        <p class="subtitle">
          ตรวจคำขอ จัดคิว และดูตารางเวรสัตวแพทย์
        </p>
      </div>
      <button @click="openAddModal" class="primary-btn" type="button">เพิ่มการนัดหมาย</button>
    </section>

    <nav class="view-tabs" aria-label="มุมมองการนัดหมาย">
      <button type="button" :aria-pressed="activeView === 'requests'" @click="activeView = 'requests'">รอคลินิกยืนยัน <span>{{ clinicRequests.length }}</span></button>
      <button type="button" :aria-pressed="activeView === 'today'" @click="activeView = 'today'">นัดวันนี้ <span>{{ todayAppointments.length }}</span></button>
      <button type="button" :aria-pressed="activeView === 'all'" @click="activeView = 'all'">รายการทั้งหมด <span>{{ appointments.length }}</span></button>
    </nav>
    <div class="appointment-workspace">
    <section v-if="activeView === 'requests'" class="request-queue" aria-labelledby="request-queue-title">
      <div class="request-queue-head">
        <h2 id="request-queue-title">คำขอนัดจากเจ้าของสัตว์เลี้ยง</h2>
        <span>{{ clinicRequests.length }} รายการรอตรวจสอบ</span>
      </div>
      <p class="queue-help">เวลาที่เจ้าของขอ ยังไม่ใช่นัดที่ยืนยันแล้ว · ดูตารางเวรประกอบและตรวจคิวชนก่อนยืนยัน</p>
      <p v-if="!clinicRequests.length" class="quiet-empty">ไม่มีคำขอรอคลินิกยืนยันแล้ว ดูคิวงานต่อได้ที่นัดวันนี้</p>
      <p v-if="reviewError" class="review-error" role="alert">{{ reviewError }}</p>
      <article v-for="request in clinicRequests" :key="request.appt_id" class="request-row">
        <div class="request-date">
          <span>{{ formatShortDate(request.appt_date) }}</span>
          <strong>{{ formatTime(request.appt_time) }} น.</strong>
          <button type="button" class="compare-button" @click="scheduleDate = formatInputDate(request.appt_date)">ดูเวรวันนี้</button>
        </div>
        <div class="request-copy">
          <strong>{{ request.pet_name }}</strong>
          <p>คุณ{{ request.owner_name || 'ไม่ระบุ' }}</p>
          <p>{{ request.vet_name || 'ให้คลินิกจัดสัตวแพทย์' }}</p>
          <label v-if="!request.vet_id" class="request-vet-picker">
            <span>เลือกสัตวแพทย์ก่อนยืนยัน</span>
            <select v-model="reviewVetIds[request.appt_id]" :disabled="!!reviewingId">
              <option value="">เลือกสัตวแพทย์</option>
              <option v-for="vet in veterinarians" :key="vet.vet_id" :value="vet.vet_id">{{ vet.vet_name }}</option>
            </select>
          </label>
          <small>{{ request.appt_reason || 'ไม่ได้ระบุเหตุผล' }}</small>
          <span class="status-chip is-pending">รอคลินิกยืนยัน</span>
        </div>
        <div class="request-actions">
          <button type="button" class="primary-btn mini-btn" :disabled="!!reviewingId" @click="reviewRequest(request, 'approve')">{{ reviewingId === request.appt_id ? 'กำลังบันทึก…' : 'ยืนยันนัด' }}</button>
          <button type="button" class="ghost-btn mini-btn" :disabled="!!reviewingId" :aria-expanded="rejectionId === request.appt_id" @click="rejectionId = rejectionId === request.appt_id ? '' : request.appt_id; rejectionReason = ''">ไม่รับคำขอ</button>
        </div>
        <form v-if="rejectionId === request.appt_id" class="rejection-form" @submit.prevent="reviewRequest(request, 'reject')">
          <label>เหตุผลที่ไม่รับนัด <input v-model.trim="rejectionReason" maxlength="500" required placeholder="เช่น คลินิกไม่สามารถรับนัดช่วงเวลานี้ได้" /></label>
          <button type="submit" class="danger-btn mini-btn" :disabled="reviewingId === request.appt_id || !rejectionReason">ยืนยันไม่รับนัด</button>
        </form>
      </article>
    </section>

    <aside class="schedule-column">
    <section class="shift-panel">
      <div class="shift-head">
        <div>
          <h2>ตารางเวรสัตวแพทย์</h2>
          <p>ช่วงเวลาที่สัตวแพทย์พร้อมให้บริการ</p>
        </div>
        <span class="shift-count">{{ selectedSchedules.length }} ช่วงเวลา</span>
      </div>
      <label class="schedule-date-picker">วันที่ดูตารางเวร <input v-model="scheduleDate" type="date" /></label>
      <details class="schedule-manager">
      <summary>จัดการตารางเวร</summary>
      <form class="shift-form" @submit.prevent="saveSchedule">
        <label>
          <span>สัตวแพทย์ *</span>
          <select v-model="scheduleForm.vet_id" required>
            <option value="" disabled>เลือกสัตวแพทย์</option>
            <option v-for="vet in veterinarians" :key="vet.vet_id" :value="vet.vet_id">{{ vet.vet_name }}</option>
          </select>
        </label>
        <label>
          <span>วันที่เข้าเวร *</span>
          <input v-model="scheduleForm.work_date" type="date" :min="todayInputValue()" required />
        </label>
        <label>
          <span>เริ่ม *</span>
          <input v-model="scheduleForm.start_time" type="time" required />
        </label>
        <label>
          <span>สิ้นสุด *</span>
          <input v-model="scheduleForm.end_time" type="time" required />
        </label>
        <label class="shift-note-field">
          <span>หมายเหตุ</span>
          <input v-model.trim="scheduleForm.schedule_note" type="text" maxlength="255" placeholder="เช่น ตรวจทั่วไปและติดตามอาการ" />
        </label>
        <button type="submit" class="primary-btn" :disabled="isSavingSchedule">
          {{ isSavingSchedule ? 'กำลังบันทึก...' : 'เพิ่มตารางเวร' }}
        </button>
      </form>
      </details>
      <div v-if="selectedSchedules.length > 0" class="shift-list">
        <article v-for="shift in selectedSchedules" :key="shift.schedule_id" class="shift-item">
          <div class="shift-date">
            <span>{{ getShortMonth(shift.work_date) }}</span>
            <strong>{{ getDay(shift.work_date) }}</strong>
          </div>
          <div class="shift-detail">
            <strong>{{ shift.vet_name }}</strong>
            <span>{{ formatFullDate(shift.work_date) }} · {{ formatTime(shift.start_time) }} - {{ formatTime(shift.end_time) }} น.</span>
            <small v-if="shift.schedule_note">{{ shift.schedule_note }}</small>
          </div>
          <button type="button" class="danger-btn mini-btn" @click="deleteSchedule(shift.schedule_id)">ลบ</button>
        </article>
      </div>
      <div v-else class="shift-empty">ไม่มีตารางเวรในวันที่เลือก ลองเลือกวันอื่นหรือเพิ่มตารางเวร</div>
    </section>
    <section class="day-preview">
      <h2>นัดที่ยืนยันแล้วในวันที่เลือก</h2>
      <p class="queue-help">{{ formatFullDate(scheduleDate) }}</p>
      <article v-for="apt in selectedConfirmed" :key="apt.appt_id" class="confirmed-row">
        <strong>{{ formatTime(apt.appt_time) }} น.</strong>
        <div><b>{{ apt.pet_name }}</b><small>{{ apt.vet_name || 'ยังไม่ระบุสัตวแพทย์' }}</small></div>
      </article>
      <p v-if="!selectedConfirmed.length" class="quiet-empty">ยังไม่มีนัดที่ยืนยันในวันนี้</p>
    </section>
    </aside>

    <section v-if="activeView !== 'requests'" class="list-column">
    <section v-if="activeView === 'all'" class="toolbar">
      <div class="filter-pills">
        <button
          v-for="filter in filters"
          :key="filter.value"
          @click="statusFilter = filter.value"
          :class="['pill-btn', statusFilter === filter.value ? 'active' : '']"
          type="button"
        >
          {{ filter.label }}
        </button>
      </div>
    </section>

    <section class="table-panel">
      <h2>{{ activeView === 'today' ? 'คิวนัดหมายวันนี้' : 'รายการนัดหมายทั้งหมด' }}</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>วันและเวลา</th>
              <th>สัตวแพทย์</th>
              <th>สัตว์เลี้ยง</th>
              <th>เหตุผล / อาการ</th>
              <th>สถานะ</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="apt in filteredAppointments"
              :key="`${apt.appt_id}-${apt.appt_date}-${apt.appt_time}-${apt.appt_status}-${apt.cancel_reason || ''}`"
            >
              <td data-label="วันและเวลา">
                <div class="date-cell">
                  <div class="date-block">
                    <span class="month">{{ getShortMonth(apt.appt_date) }}</span>
                    <strong>{{ getDay(apt.appt_date) }}</strong>
                  </div>
                  <div>
                    <div class="primary-line">{{ formatFullDate(apt.appt_date) }}</div>
                    <div class="secondary-line">{{ formatTime(apt.appt_time) }} น.</div>
                  </div>
                </div>
              </td>
              <td data-label="สัตวแพทย์">
                <div class="primary-line">{{ apt.vet_name || 'ยังไม่ระบุ' }}</div>
                <div class="secondary-line">{{ apt.vet_id || '-' }}</div>
              </td>
              <td data-label="สัตว์เลี้ยง">
                <div class="pet-cell">
                  <div class="pet-avatar" :style="{ backgroundColor: getPetColor(apt.pet_name) }">
                    {{ getInitial(apt.pet_name) }}
                  </div>
                  <div>
                    <div class="primary-line">{{ apt.pet_name || 'ไม่พบข้อมูล' }}</div>
                    <div class="secondary-line">คุณ{{ apt.owner_name || 'ไม่ระบุ' }}</div>
                  </div>
                </div>
              </td>
              <td data-label="เหตุผล / อาการ">
                <div class="reason-chip" :title="apt.appt_reason || '-'">
                  {{ apt.appt_reason || 'ไม่ได้ระบุเหตุผลการนัดหมาย' }}
                </div>
              </td>
              <td data-label="สถานะ">
                <div class="status-stack">
                  <span :class="['status-chip', getStatusClass(apt.appt_status)]">
                    {{ getStatusLabel(apt.appt_status) }}
                  </span>
                  <span v-if="apt.cancel_reason" class="cancel-reason">
                    {{ apt.appt_status === APPT_STATUS_CANCELED ? (apt.request_source === 'owner' ? 'เหตุผลที่ไม่รับ/ยกเลิก' : 'เหตุผลยกเลิก') : 'คำขอเดิม' }}:
                    {{ apt.cancel_reason }}
                  </span>
                </div>
              </td>
              <td data-label="จัดการ">
                <div class="row-actions">
                  <button
                    v-if="apt.appt_status === APPT_STATUS_CANCELED"
                    @click="openRescheduleModal(apt)"
                    class="reschedule-btn mini-btn"
                    type="button"
                  >
                    จัดนัดใหม่
                  </button>
                  <button v-else-if="apt.appt_status !== APPT_STATUS_CLINIC_PENDING" @click="openEditModal(apt)" class="ghost-btn mini-btn" type="button">แก้ไข</button>
                  <button v-else type="button" class="ghost-btn mini-btn" @click="activeView = 'requests'">ตรวจคำขอ</button>
                  <button @click="deleteAppointment(apt.appt_id)" class="danger-btn mini-btn" type="button">ลบ</button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredAppointments.length === 0">
              <td colspan="6" class="state">
                <div class="empty-card">
                  <strong>ยังไม่มีข้อมูลนัดหมาย</strong>
                  <p>เมื่อมีการสร้างคิวนัดหมายในระบบ รายการทั้งหมดจะแสดงที่นี่</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
    </section>
    </div>

    <div v-if="isModalOpen" class="modal-overlay" @click.self="closeModal">
      <div class="modal appointment-modal">
        <div class="modal-head">
          <div>
            <h2>{{ modalTitle }}</h2>
            <p>{{ modalDescription }}</p>
          </div>
          <button @click="closeModal" class="close-btn" type="button">ปิด</button>
        </div>

        <form @submit.prevent="handleSubmit">
          <div class="form-grid" v-if="modalMode === 'add'">
            <label class="full-width field-wrap">
              <span>ค้นหาสัตว์เลี้ยง *</span>
              <div class="search-box">
                <input
                  id="appointment-pet-search"
                  type="text"
                  v-model="searchPetQuery"
                  @focus="showPetDropdown = true"
                  @input="showPetDropdown = true"
                  @blur="handlePetInputBlur"
                  placeholder="พิมพ์ชื่อสัตว์เลี้ยง เจ้าของ หรือรหัส"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-controls="appointment-pet-options"
                  :aria-expanded="showPetDropdown ? 'true' : 'false'"
                  autocomplete="off"
                  required
                />
                <button v-if="form.pet_id" @click="clearPetSelection" type="button" class="inline-clear">ล้าง</button>
                <ul v-if="showPetDropdown" id="appointment-pet-options" class="pet-dropdown" role="listbox" aria-label="ผลการค้นหาสัตว์เลี้ยง">
                  <li v-if="filteredPets.length === 0" class="dropdown-empty">ไม่พบข้อมูลสัตว์เลี้ยง</li>
                  <li v-for="pet in filteredPets" :key="pet.pet_id" @mousedown.prevent="selectPet(pet)" class="dropdown-item" role="option">
                    <div class="primary-line">{{ pet.pet_name }}</div>
                    <div class="secondary-line">รหัส: {{ pet.pet_id }} | เจ้าของ: {{ pet.owner_name || 'ไม่ระบุ' }}</div>
                  </li>
                </ul>
              </div>
              <p v-if="searchPetQuery && !form.pet_id" class="field-hint warning-text">
                กรุณาเลือกสัตว์เลี้ยงจากรายการด้านล่างเพื่อยืนยันรายการนัดหมาย
              </p>
              <p v-else-if="form.pet_id" class="field-hint success-text">
                เลือกสัตว์เลี้ยงแล้ว รหัส {{ form.pet_id }}
              </p>
            </label>
          </div>

          <div class="form-grid" v-if="modalMode !== 'add'">
            <label class="full-width">
              <span>สัตว์เลี้ยง</span>
              <input type="text" :value="form.pet_display" readonly />
            </label>
          </div>

          <div v-if="modalMode === 'reschedule'" class="reschedule-banner">
            <strong>คำขอจากเจ้าของสัตว์เลี้ยง</strong>
            <p>{{ form.original_cancel_reason || 'เจ้าของสัตว์เลี้ยงขอยกเลิกนัดหมายเดิม' }}</p>
            <small>เลือกวัน เวลา และสัตวแพทย์ใหม่ ระบบจะส่งรายการกลับไปให้ลูกค้ากดยืนยันอีกครั้ง</small>
          </div>

          <div class="form-grid">
            <label class="full-width">
              <span>สัตวแพทย์ *</span>
              <select v-model="form.vet_id" required>
                <option value="" disabled>เลือกสัตวแพทย์ที่ลงเวร</option>
                <option v-for="vet in veterinarians" :key="vet.vet_id" :value="vet.vet_id">{{ vet.vet_name }}</option>
              </select>
              <small v-if="form.appt_date && form.vet_id" class="field-hint" :class="{ 'warning-text': !matchingShifts.length && !isLoadingSchedules && !scheduleFetchError }">
                {{ matchingShiftText }}
              </small>
            </label>
          </div>

          <div class="form-grid" v-if="modalMode === 'edit'">
            <label class="full-width">
              <span>สถานะนัดหมาย *</span>
              <select v-model="form.appt_status">
                <option :value="APPT_STATUS_PENDING">รอยืนยัน</option>
                <option :value="APPT_STATUS_CONFIRMED">ยืนยัน</option>
                <option :value="APPT_STATUS_COMPLETED">เสร็จสิ้น</option>
                <option :value="APPT_STATUS_MISSED">ไม่มาตามนัด</option>
                <option :value="APPT_STATUS_CANCELED">ยกเลิก</option>
              </select>
              <small class="field-hint">สถานะ “เสร็จสิ้น” และ “ไม่มาตามนัด” เลือกได้เมื่อผ่านเวลานัดแล้ว</small>
            </label>
          </div>

          <div class="form-grid">
            <label class="appointment-date-field">
              <span>วันที่นัดหมาย *</span>
              <input
                v-model="form.appt_date"
                type="date"
                :min="modalMode === 'edit' ? undefined : todayInputValue()"
                required
              />
            </label>
            <label class="appointment-time-field">
              <span>เวลานัดหมาย *</span>
              <input
                v-model.trim="form.appt_time"
                type="text"
                inputmode="numeric"
                maxlength="5"
                placeholder="HH:mm เช่น 13:27"
                autocomplete="off"
                :aria-invalid="!!visibleTimeError"
                aria-describedby="appointment-time-help appointment-time-feedback"
                @input="timeServerError = ''"
                @blur="normalizeAppointmentTimeInput"
              />
              <small id="appointment-time-help" class="field-hint">กรอกแบบ 24 ชั่วโมง เช่น 09:00 หรือ 13:27 · นัดใช้เวลา 30 นาที</small>
              <small v-if="visibleTimeError" id="appointment-time-feedback" class="field-hint field-error" role="alert">{{ visibleTimeError }}</small>
              <small v-else-if="timeAvailabilityText" id="appointment-time-feedback" class="field-hint" :class="timeAvailabilityWarning ? 'warning-text' : 'success-text'" role="status">{{ timeAvailabilityText }}</small>
            </label>
          </div>

          <p v-if="appointmentFormError" class="appointment-form-error" role="alert">{{ appointmentFormError }}</p>

          <div class="form-grid" v-if="modalMode === 'edit'">
            <label class="full-width">
              <span>หมายเหตุการเลื่อนหรือยกเลิก</span>
              <textarea
                v-model="form.cancel_reason"
                rows="2"
                placeholder="เช่น เปลี่ยนเวลา เจ้าของไม่สะดวก หรือยกเลิกการนัด"
              ></textarea>
            </label>
          </div>

          <div class="form-grid">
            <label class="full-width">
              <span>เหตุผล / อาการเบื้องต้น</span>
              <textarea v-model="form.appt_reason" rows="2" placeholder="ระบุอาการเบื้องต้น"></textarea>
            </label>
          </div>

          <div class="modal-actions">
            <button type="button" @click="closeModal" class="ghost-btn">ยกเลิก</button>
            <button type="submit" :disabled="isSubmitting" class="primary-btn">
              {{ isSubmitting ? 'กำลังบันทึก...' : submitLabel }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import axios from 'axios'

const APPT_STATUS_PENDING = 'รอ'
const APPT_STATUS_CLINIC_PENDING = 'รอคลินิกยืนยัน'
const APPT_STATUS_CONFIRMED = 'ยืนยัน'
const APPT_STATUS_CANCELED = 'ยกเลิก'
const APPT_STATUS_COMPLETED = 'เสร็จสิ้น'
const APPT_STATUS_MISSED = 'ไม่มาตามนัด'

const appointments = ref([])
const petsList = ref([])
const veterinarians = ref([])
const schedules = ref([])
const statusFilter = ref('all')
const activeView = ref('requests')
const scheduleDate = ref(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()))
const selectedSchedules = computed(() => schedules.value.filter(shift => formatInputDate(shift.work_date) === scheduleDate.value))
const selectedConfirmed = computed(() => appointments.value.filter(apt => apt.appt_status === APPT_STATUS_CONFIRMED && apt.appt_date === scheduleDate.value).sort((a, b) => a.appt_time.localeCompare(b.appt_time)))
const reviewingId = ref('')
const rejectionId = ref('')
const rejectionReason = ref('')
const reviewError = ref('')
const reviewMessage = ref('')
const reviewVetIds = ref({})
const isModalOpen = ref(false)
const modalMode = ref('add')
const form = ref({})
const isSubmitting = ref(false)
const appointmentFormError = ref('')
const timeServerError = ref('')
const timeTouched = ref(false)
const originalAppointmentSlot = ref(null)
const isLoadingSchedules = ref(false)
const scheduleFetchError = ref('')
let scheduleFetchSequence = 0
const searchPetQuery = ref('')
const showPetDropdown = ref(false)
const isSavingSchedule = ref(false)
const scheduleForm = ref({
  vet_id: '',
  work_date: '',
  start_time: '09:00',
  end_time: '17:00',
  schedule_note: ''
})

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
})

const formatDateParts = (value) => {
  const raw = String(value || '').trim()
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (match) {
    return {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3])
    }
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]))

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day)
  }
}

const formatInputDate = (value) => {
  const parts = formatDateParts(value)
  if (!parts) return ''
  return `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
}

const normalizeAppointmentStatus = (status) => {
  const text = String(status || '').trim()
  if (text === APPT_STATUS_CANCELED) return APPT_STATUS_CANCELED
  if (text === APPT_STATUS_PENDING) return APPT_STATUS_PENDING
  if (text === APPT_STATUS_CLINIC_PENDING) return APPT_STATUS_CLINIC_PENDING
  if (text === APPT_STATUS_COMPLETED) return APPT_STATUS_COMPLETED
  if (text === APPT_STATUS_MISSED) return APPT_STATUS_MISSED
  return APPT_STATUS_CONFIRMED
}

const getStatusClass = (status) => {
  const normalized = normalizeAppointmentStatus(status)
  if (normalized === APPT_STATUS_CANCELED) return 'is-danger'
  if (normalized === APPT_STATUS_PENDING) return 'is-pending'
  if (normalized === APPT_STATUS_CLINIC_PENDING) return 'is-pending'
  if (normalized === APPT_STATUS_COMPLETED) return 'is-completed'
  if (normalized === APPT_STATUS_MISSED) return 'is-missed'
  return 'is-confirmed'
}

const getStatusLabel = (status) => {
  const normalized = normalizeAppointmentStatus(status)
  if (normalized === APPT_STATUS_CANCELED) return 'ยกเลิก'
  if (normalized === APPT_STATUS_PENDING) return 'รอยืนยัน'
  if (normalized === APPT_STATUS_CLINIC_PENDING) return 'รอคลินิกยืนยัน'
  if (normalized === APPT_STATUS_COMPLETED) return 'เสร็จสิ้น'
  if (normalized === APPT_STATUS_MISSED) return 'ไม่มาตามนัด'
  return 'ยืนยันแล้ว'
}

const normalizeAppointmentRecord = (appointment) => ({
  ...appointment,
  appt_date: formatInputDate(appointment.appt_date),
  appt_time: String(appointment.appt_time || '').slice(0, 5),
  appt_status: normalizeAppointmentStatus(appointment.appt_status),
  cancel_reason: appointment.cancel_reason || ''
})

const waitForRender = () => new Promise((resolve) => setTimeout(resolve, 50))

const filters = computed(() => [
  { label: 'ทั้งหมด', value: 'all' },
  { label: `รอคลินิก (${clinicRequests.value.length})`, value: APPT_STATUS_CLINIC_PENDING },
  { label: 'รอยืนยัน', value: APPT_STATUS_PENDING },
  { label: 'ยืนยันแล้ว', value: APPT_STATUS_CONFIRMED },
  { label: 'เสร็จสิ้น', value: APPT_STATUS_COMPLETED },
  { label: 'ไม่มาตามนัด', value: APPT_STATUS_MISSED },
  { label: 'ยกเลิก', value: APPT_STATUS_CANCELED }
])

const clinicRequests = computed(() => appointments.value.filter((item) => item.appt_status === APPT_STATUS_CLINIC_PENDING))

const reviewRequest = async (request, action) => {
  if (reviewingId.value) return
  if (action === 'approve' && !request.vet_id && !reviewVetIds.value[request.appt_id]) {
    reviewError.value = 'กรุณาเลือกสัตวแพทย์ให้คำขอนี้ก่อนยืนยัน'
    return
  }
  if (action === 'approve' && !window.confirm(`ยืนยันนัดของ ${request.pet_name} วันที่ ${formatFullDate(request.appt_date)} เวลา ${formatTime(request.appt_time)} น. หรือไม่?`)) return
  reviewingId.value = request.appt_id
  reviewError.value = ''
  reviewMessage.value = ''
  try {
    await axios.patch(`http://localhost:3000/api/appointments/requests/${request.appt_id}/review`, {
      action,
      vet_id: action === 'approve' ? (request.vet_id || reviewVetIds.value[request.appt_id]) : undefined,
      reason: action === 'reject' ? rejectionReason.value : ''
    }, authHeaders())
    rejectionId.value = ''
    rejectionReason.value = ''
    delete reviewVetIds.value[request.appt_id]
    await fetchAppointments()
    reviewMessage.value = action === 'approve' ? 'ยืนยันคำขอนัดหมายแล้ว' : 'ไม่รับคำขอนัดหมายแล้ว เจ้าของจะเห็นเหตุผลในรายการนัดหมาย'
  } catch (error) {
    reviewError.value = error.response?.data?.message || 'จัดการคำขอนัดหมายไม่สำเร็จ'
  } finally {
    reviewingId.value = ''
  }
}

const modalTitle = computed(() => {
  if (modalMode.value === 'add') return 'เพิ่มการนัดหมายใหม่'
  if (modalMode.value === 'reschedule') return 'จัดวันนัดหมายใหม่'
  return 'แก้ไขการนัดหมาย'
})

const modalDescription = computed(() => {
  if (modalMode.value === 'add') return 'กรอกข้อมูลให้ครบเพื่อสร้างคิวนัดหมาย'
  if (modalMode.value === 'reschedule') return 'กำหนดคิวใหม่แล้วส่งให้เจ้าของสัตว์เลี้ยงตอบรับ'
  return 'อัปเดตวัน เวลา สถานะ หรือหมายเหตุของการนัดหมาย'
})

const submitLabel = computed(() => {
  if (modalMode.value === 'add') return 'บันทึกนัดหมาย'
  if (modalMode.value === 'reschedule') return 'ส่งวันนัดใหม่'
  return 'บันทึกการแก้ไข'
})

const todayInputValue = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const parseDateOnly = (dateStr) => {
  const parts = formatDateParts(dateStr)
  if (!parts) return null
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
}

const toAppointmentDateTime = (apptDate, apptTime = '00:00') => {
  const normalizedDate = formatInputDate(apptDate)
  if (!normalizedDate) return null
  const safeTime = String(apptTime || '00:00').slice(0, 5)
  const date = new Date(`${normalizedDate}T${safeTime}:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

const startOfLocalToday = () => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

const startOfLocalTomorrow = () => {
  const today = startOfLocalToday()
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
}

const filteredPets = computed(() => {
  if (!searchPetQuery.value) return petsList.value
  const query = searchPetQuery.value.toLowerCase()
  return petsList.value.filter((pet) =>
    [pet.pet_name, pet.owner_name, pet.pet_id].some((value) => String(value || '').toLowerCase().includes(query))
  )
})

const filteredAppointments = computed(() => {
  if (activeView.value === 'today') return todayAppointments.value
  if (statusFilter.value === 'all') return appointments.value
  return appointments.value.filter((item) => item.appt_status === statusFilter.value)
})

const matchingShifts = computed(() =>
  schedules.value.filter(
    (shift) =>
      String(shift.work_date || '').slice(0, 10) === form.value.appt_date && shift.vet_id === form.value.vet_id
  )
)

const toTimeMinutes = (value) => {
  const match = String(value || '').match(/^([01]\d|2[0-3]):([0-5]\d)$/)
  return match ? Number(match[1]) * 60 + Number(match[2]) : null
}

const requiresSlotValidation = computed(() => {
  if (modalMode.value !== 'edit') return true
  if (![APPT_STATUS_PENDING, APPT_STATUS_CONFIRMED].includes(form.value.appt_status)) return false
  const original = originalAppointmentSlot.value
  if (!original) return true
  return original.appt_date !== form.value.appt_date ||
    original.appt_time !== form.value.appt_time ||
    original.vet_id !== form.value.vet_id ||
    ![APPT_STATUS_PENDING, APPT_STATUS_CONFIRMED].includes(original.appt_status)
})

const timeValidationError = computed(() => {
  const time = String(form.value.appt_time || '')
  if (!time) return 'กรุณากรอกเวลานัดหมาย'
  if (toTimeMinutes(time) === null) return 'กรอกเวลาแบบ 24 ชั่วโมง HH:mm เช่น 13:27'
  if (requiresSlotValidation.value && form.value.appt_date && new Date(`${form.value.appt_date}T${time}:00+07:00`).getTime() < Date.now()) {
    return 'วันและเวลานี้ผ่านไปแล้ว กรุณาเลือกใหม่'
  }
  return ''
})

const visibleTimeError = computed(() => timeServerError.value || (timeTouched.value ? timeValidationError.value : ''))
const timeAvailabilityWarning = computed(() => {
  const start = toTimeMinutes(form.value.appt_time)
  if (start === null || !form.value.appt_date || !form.value.vet_id) return false
  if (isLoadingSchedules.value || scheduleFetchError.value) return true
  return !matchingShifts.value.some((shift) => {
    const shiftStart = toTimeMinutes(String(shift.start_time || '').slice(0, 5))
    const shiftEnd = toTimeMinutes(String(shift.end_time || '').slice(0, 5))
    return shiftStart !== null && shiftEnd !== null && start >= shiftStart && start + 30 <= shiftEnd
  })
})
const timeAvailabilityText = computed(() => {
  if (!timeTouched.value || timeValidationError.value) return ''
  if (!form.value.appt_date || !form.value.vet_id) return ''
  if (isLoadingSchedules.value) return 'กำลังตรวจตารางเวร · คุณยังบันทึกนัดได้'
  if (scheduleFetchError.value) return 'โหลดตารางเวรไม่ได้ · คุณยังบันทึกนัดได้ ระบบจะตรวจคิวชนตอนบันทึก'
  return timeAvailabilityWarning.value
    ? `${form.value.appt_time} น. อยู่นอกตารางเวร · คลินิกบันทึกได้หากหมอพร้อม ระบบจะตรวจคิวชนอีกครั้ง`
    : `${form.value.appt_time} น. อยู่ในช่วงเข้าเวร · ระบบจะตรวจคิวชนอีกครั้งตอนบันทึก`
})

const matchingShiftText = computed(() => {
  if (isLoadingSchedules.value) return 'กำลังตรวจตารางเวร…'
  if (scheduleFetchError.value) return 'โหลดตารางเวรไม่ได้ · ยังสร้างนัดได้หากหมอพร้อม'
  if (matchingShifts.value.length === 0) return 'ยังไม่มีตารางเวรในวันที่เลือก · คลินิกยังสร้างนัดได้หากหมอพร้อม'
  return `ช่วงเข้าเวร (นัด 30 นาที): ${matchingShifts.value
    .map((shift) => {
      const end = toTimeMinutes(String(shift.end_time || '').slice(0, 5))
      const lastStart = end === null ? '' : `${String(Math.floor((end - 30) / 60)).padStart(2, '0')}:${String((end - 30) % 60).padStart(2, '0')}`
      return `${formatTime(shift.start_time)}–${formatTime(shift.end_time)} น.${lastStart ? ` (เริ่มได้ถึง ${lastStart} น.)` : ''}`
    })
    .join(', ')}`
})

const isActiveAppointment = (item) => {
  const status = normalizeAppointmentStatus(item.appt_status)
  return status === APPT_STATUS_PENDING || status === APPT_STATUS_CONFIRMED
}

const todayAppointments = computed(() => {
  const today = startOfLocalToday().getTime()
  const tomorrow = startOfLocalTomorrow().getTime()
  return appointments.value.filter((item) => {
    if (!isActiveAppointment(item)) return false
    const at = toAppointmentDateTime(item.appt_date, item.appt_time)
    return at && at.getTime() >= today && at.getTime() < tomorrow
  })
})

const tomorrowAppointments = computed(() => {
  const tomorrow = startOfLocalTomorrow().getTime()
  const nextDay = tomorrow + 24 * 60 * 60 * 1000
  return appointments.value.filter((item) => {
    if (!isActiveAppointment(item)) return false
    const at = toAppointmentDateTime(item.appt_date, item.appt_time)
    return at && at.getTime() >= tomorrow && at.getTime() < nextDay
  })
})

const overdueAppointments = computed(() => {
  const now = Date.now()
  return appointments.value.filter((item) => {
    if (!isActiveAppointment(item)) return false
    const at = toAppointmentDateTime(item.appt_date, item.appt_time)
    return at && at.getTime() < now
  })
})

const nextUpcomingAppointment = computed(() => {
  const now = Date.now()
  return (
    appointments.value
      .filter((item) => {
        if (!isActiveAppointment(item)) return false
        const at = toAppointmentDateTime(item.appt_date, item.appt_time)
        return at && at.getTime() >= now
      })
      .sort((a, b) => toAppointmentDateTime(a.appt_date, a.appt_time) - toAppointmentDateTime(b.appt_date, b.appt_time))[0] || null
  )
})

const selectPet = (pet) => {
  form.value.pet_id = pet.pet_id
  searchPetQuery.value = `${pet.pet_name} (เจ้าของ: ${pet.owner_name || 'ไม่ระบุ'})`
  showPetDropdown.value = false
}

const clearPetSelection = () => {
  form.value.pet_id = ''
  searchPetQuery.value = ''
  showPetDropdown.value = true
}

const handlePetInputBlur = () => {
  setTimeout(() => {
    showPetDropdown.value = false
  }, 120)
}

const getDay = (dateStr) => {
  const date = parseDateOnly(dateStr)
  return date ? String(date.getUTCDate()).padStart(2, '0') : '-'
}

const getShortMonth = (dateStr) => {
  const date = parseDateOnly(dateStr)
  return date ? date.toLocaleDateString('th-TH', { month: 'short', timeZone: 'UTC' }) : '-'
}

const formatFullDate = (dateStr) => {
  const date = parseDateOnly(dateStr)
  return date
    ? date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC'
      })
    : '-'
}

const formatTime = (timeStr) => (timeStr ? String(timeStr).slice(0, 5) : '-')
const formatShortDate = (dateStr) => {
  const date = parseDateOnly(dateStr)
  return date
    ? date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC'
      })
    : '-'
}
const getInitial = (name) => (name ? String(name).charAt(0).toUpperCase() : '?')

const getPetColor = (name) => {
  const colors = ['#f59e0b', '#f97316', '#f43f5e', '#10b981', '#0ea5e9', '#8b5cf6']
  if (!name) return colors[0]
  return colors[String(name).charCodeAt(0) % colors.length]
}

const adminAlertTitle = computed(() => {
  if (todayAppointments.value.length > 0) return 'วันนี้มีคิวรอให้บริการ'
  if (tomorrowAppointments.value.length > 0) return 'พรุ่งนี้มีคิวนัดหมาย'
  if (overdueAppointments.value.length > 0) return 'มีรายการเลยเวลานัด'
  if (nextUpcomingAppointment.value) return 'คิวถัดไปของคลินิก'
  return 'ไม่มีคิวที่ต้องติดตาม'
})

const adminAlertDescription = computed(() => {
  if (todayAppointments.value.length > 0) {
    const first = todayAppointments.value[0]
    return `${first.pet_name || 'สัตว์เลี้ยง'} เจ้าของ ${first.owner_name || '-'} เวลา ${formatTime(first.appt_time)} น.`
  }
  if (tomorrowAppointments.value.length > 0) {
    const first = tomorrowAppointments.value[0]
    return `${first.pet_name || 'สัตว์เลี้ยง'} วันที่ ${formatShortDate(first.appt_date)}`
  }
  if (overdueAppointments.value.length > 0) {
    return `มี ${overdueAppointments.value.length} รายการที่ควรติดต่อกลับหรืออัปเดตสถานะ`
  }
  if (nextUpcomingAppointment.value) {
    return `${nextUpcomingAppointment.value.pet_name || 'สัตว์เลี้ยง'} เวลา ${formatTime(nextUpcomingAppointment.value.appt_time)} น. วันที่ ${formatShortDate(nextUpcomingAppointment.value.appt_date)}`
  }
  return 'เมื่อมีการสร้างคิว ระบบจะแสดงรายการสำคัญตรงส่วนนี้'
})

const fetchAppointments = async () => {
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get('http://localhost:3000/api/appointments', {
      headers: { Authorization: `Bearer ${token}` }
    })
    appointments.value = res.data.map(normalizeAppointmentRecord)
  } catch (err) {
    console.error('Fetch appointments error:', err)
  }
}

const fetchPetsList = async () => {
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get('http://localhost:3000/api/appointments/pets-list', {
      headers: { Authorization: `Bearer ${token}` }
    })
    petsList.value = res.data
  } catch (err) {
    console.error('Fetch pets error:', err)
  }
}

const fetchVeterinarians = async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/appointments/veterinarians-list', authHeaders())
    veterinarians.value = res.data || []
  } catch (err) {
    console.error('Fetch veterinarians error:', err)
  }
}

const scheduleRange = () => {
  const today = new Date()
  const end = new Date(today.getFullYear(), today.getMonth() + 4, 0)
  const toKey = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  const selectedDate = form.value.appt_date || ''
  return {
    from: selectedDate && selectedDate < toKey(today) ? selectedDate : toKey(today),
    to: selectedDate && selectedDate > toKey(end) ? selectedDate : toKey(end)
  }
}

const fetchSchedules = async () => {
  const requestSequence = ++scheduleFetchSequence
  isLoadingSchedules.value = true
  scheduleFetchError.value = ''
  try {
    const res = await axios.get('http://localhost:3000/api/appointments/vet-schedules', {
      ...authHeaders(),
      params: scheduleRange()
    })
    if (requestSequence === scheduleFetchSequence) schedules.value = res.data || []
  } catch (err) {
    console.error('Fetch veterinarian schedules error:', err)
    if (requestSequence === scheduleFetchSequence) scheduleFetchError.value = 'โหลดตารางเวรไม่สำเร็จ'
  } finally {
    if (requestSequence === scheduleFetchSequence) isLoadingSchedules.value = false
  }
}

watch(() => form.value.appt_date, (date, previousDate) => {
  if (date === previousDate || !isModalOpen.value || !date) return
  timeServerError.value = ''
  fetchSchedules()
})

watch(() => form.value.vet_id, () => { timeServerError.value = '' })

const saveSchedule = async () => {
  isSavingSchedule.value = true
  try {
    await axios.post('http://localhost:3000/api/appointments/vet-schedules', scheduleForm.value, authHeaders())
    scheduleDate.value = scheduleForm.value.work_date
    scheduleForm.value = {
      vet_id: scheduleForm.value.vet_id,
      work_date: '',
      start_time: '09:00',
      end_time: '17:00',
      schedule_note: ''
    }
    await fetchSchedules()
  } catch (error) {
    console.error('Save veterinarian schedule error:', error)
    alert(error.response?.data?.message || 'บันทึกตารางเวรไม่สำเร็จ')
  } finally {
    isSavingSchedule.value = false
  }
}

const deleteSchedule = async (scheduleId) => {
  if (!confirm('ยืนยันลบตารางเวรนี้หรือไม่?')) return
  try {
    await axios.delete(`http://localhost:3000/api/appointments/vet-schedules/${scheduleId}`, authHeaders())
    await fetchSchedules()
  } catch (error) {
    console.error('Delete veterinarian schedule error:', error)
    alert(error.response?.data?.message || 'ลบตารางเวรไม่สำเร็จ')
  }
}

const openAddModal = () => {
  modalMode.value = 'add'
  originalAppointmentSlot.value = null
  appointmentFormError.value = ''
  timeServerError.value = ''
  timeTouched.value = false
  form.value = {
    pet_id: '',
    vet_id: '',
    appt_status: APPT_STATUS_PENDING,
    appt_date: todayInputValue(),
    appt_time: '',
    appt_reason: '',
    cancel_reason: ''
  }
  searchPetQuery.value = ''
  showPetDropdown.value = false
  isModalOpen.value = true
}

const openEditModal = (appointment) => {
  modalMode.value = 'edit'
  appointmentFormError.value = ''
  timeServerError.value = ''
  timeTouched.value = false
  const normalizedAppointment = normalizeAppointmentRecord(appointment)
  originalAppointmentSlot.value = {
    vet_id: appointment.vet_id || '',
    appt_date: normalizedAppointment.appt_date,
    appt_time: normalizedAppointment.appt_time,
    appt_status: normalizedAppointment.appt_status
  }
  form.value = {
    appt_id: appointment.appt_id,
    pet_id: appointment.pet_id,
    vet_id: appointment.vet_id || '',
    pet_display: `${appointment.pet_name || '-'} (เจ้าของ: ${appointment.owner_name || 'ไม่ระบุ'})`,
    appt_status: normalizedAppointment.appt_status,
    appt_date: normalizedAppointment.appt_date,
    appt_time: normalizedAppointment.appt_time,
    appt_reason: appointment.appt_reason || '',
    cancel_reason: normalizedAppointment.cancel_reason
  }
  isModalOpen.value = true
}

const openRescheduleModal = (appointment) => {
  modalMode.value = 'reschedule'
  originalAppointmentSlot.value = null
  appointmentFormError.value = ''
  timeServerError.value = ''
  timeTouched.value = false
  const normalizedAppointment = normalizeAppointmentRecord(appointment)
  form.value = {
    appt_id: appointment.appt_id,
    pet_id: appointment.pet_id,
    vet_id: appointment.vet_id || '',
    pet_display: `${appointment.pet_name || '-'} (เจ้าของ: ${appointment.owner_name || 'ไม่ระบุ'})`,
    appt_status: APPT_STATUS_PENDING,
    appt_date: '',
    appt_time: '',
    appt_reason: appointment.appt_reason || '',
    cancel_reason: '',
    original_cancel_reason: normalizedAppointment.cancel_reason
  }
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
  searchPetQuery.value = ''
  showPetDropdown.value = false
}

const normalizeAppointmentTimeInput = () => {
  const entered = String(form.value.appt_time || '').trim()
  if (/^\d{4}$/.test(entered)) {
    form.value.appt_time = `${entered.slice(0, 2)}:${entered.slice(2)}`
  }
  timeTouched.value = true
}

const showAppointmentFeedback = (response) => {
  const emailMessage = response?.data?.email_notification?.message
  const baseMessage = modalMode.value === 'add'
    ? 'บันทึกนัดหมายสำเร็จ'
    : modalMode.value === 'reschedule'
      ? 'ส่งวันนัดหมายใหม่ให้ลูกค้าตอบรับแล้ว'
      : 'อัปเดตการนัดหมายสำเร็จ'
  reviewMessage.value = emailMessage ? `${baseMessage}\n${emailMessage}` : baseMessage
}

const handleSubmit = async () => {
  normalizeAppointmentTimeInput()
  appointmentFormError.value = ''
  timeServerError.value = ''
  if (timeValidationError.value) return
  if (modalMode.value === 'add' && !form.value.pet_id) {
    appointmentFormError.value = 'กรุณาเลือกสัตว์เลี้ยงจากรายการก่อนบันทึกนัดหมาย'
    return
  }
  isSubmitting.value = true
  try {
    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }

    if (modalMode.value === 'add') {
      const response = await axios.post(
        'http://localhost:3000/api/appointments',
        {
          pet_id: form.value.pet_id,
          vet_id: form.value.vet_id,
          appt_date: form.value.appt_date,
          appt_time: form.value.appt_time,
          appt_reason: form.value.appt_reason,
          appt_status: APPT_STATUS_PENDING
        },
        { headers }
      )
      showAppointmentFeedback(response)
    } else {
      const response = await axios.put(
        `http://localhost:3000/api/appointments/${form.value.appt_id}`,
        {
          appt_date: form.value.appt_date,
          vet_id: form.value.vet_id,
          appt_time: form.value.appt_time,
          appt_reason: form.value.appt_reason,
          appt_status: form.value.appt_status,
          cancel_reason: form.value.appt_status === APPT_STATUS_CANCELED ? form.value.cancel_reason : null,
          reschedule: modalMode.value === 'reschedule'
        },
        { headers }
      )
      showAppointmentFeedback(response)
    }

    closeModal()
    activeView.value = 'all'
    statusFilter.value = 'all'
    await Promise.all([fetchAppointments(), fetchPetsList()])
  } catch (error) {
    console.error('Appointment submit error:', error)
    const message = error.response?.data?.message || 'บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'
    if (/ช่วงเวลานี้มีนัดหมาย|เวลาที่ผ่านมาแล้ว|วันและเวลา/.test(message)) {
      timeServerError.value = message
    } else {
      appointmentFormError.value = message
    }
  } finally {
    isSubmitting.value = false
  }
}

const deleteAppointment = async (apptId) => {
  if (!confirm('ยืนยันที่จะลบข้อมูลการนัดหมายนี้อย่างถาวรหรือไม่?')) return

  try {
    const token = localStorage.getItem('token')
    await axios.delete(`http://localhost:3000/api/appointments/${apptId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    await fetchAppointments()
  } catch (error) {
    console.error('Delete appointment error:', error)
    alert(error.response?.data?.message || 'ลบข้อมูลไม่สำเร็จ')
  }
}

onMounted(async () => {
  await Promise.all([fetchAppointments(), fetchPetsList(), fetchVeterinarians(), fetchSchedules()])
  await nextTick()
  await waitForRender()
})
</script>

<style scoped>
.appointments-admin-page {
  display: grid;
  gap: 22px;
}

.request-queue {
  padding: 22px 24px;
  border: 1px solid #a7d9cf;
  border-radius: 14px;
  background: #f5fbf9;
}
.review-feedback {
  margin: 0; padding: 11px 14px;
  border: 1px solid #a7d9cf; border-radius: 10px;
  background: #effaf6; color: #0b5f59; font-weight: 700;
}
.request-queue-head,
.request-row,
.request-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.request-queue-head { margin-bottom: 12px; }
.request-queue-head h2 { margin: 0; font-size: 1.2rem; }
.request-queue-head span { color: #0b5f59; font-weight: 700; }
.request-row { flex-wrap: wrap; padding: 14px 0; border-top: 1px solid #cee6df; }
.request-row p { margin: 4px 0; color: #334155; }
.request-row small { color: #526273; }
.request-actions { justify-content: flex-start; }
.rejection-form { display: flex; flex-basis: 100%; align-items: end; gap: 12px; }
.rejection-form label { flex: 1; display: grid; gap: 5px; font-weight: 700; }
.rejection-form input { width: 100%; min-height: 40px; padding: 8px 12px; border: 1px solid #c4d2db; border-radius: 10px; }
.review-error { color: #991b1b; }
@media (max-width: 720px) {
  .request-row,
  .request-queue-head,
  .rejection-form { align-items: stretch; flex-direction: column; }
}

.page-header,
.shift-panel,
.toolbar,
.table-panel,
.modal {
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(217, 226, 236, 0.9);
  border-radius: 20px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.06);
}

.page-header {
  padding: 24px 26px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}

.eyebrow {
  margin: 0 0 8px;
  color: #0f766e;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.page-header h1,
.modal-head h2 {
  margin: 0;
  color: #0f172a;
}

.subtitle,
.modal-head p {
  margin: 10px 0 0;
  color: #64748b;
  line-height: 1.7;
}

.shift-panel {
  padding: 22px 24px;
}

.shift-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.shift-head h2 {
  margin: 0;
  color: #0f172a;
}

.shift-head p:last-child {
  margin: 8px 0 0;
  color: #64748b;
  line-height: 1.6;
}

.shift-count {
  flex: none;
  padding: 8px 11px;
  border-radius: 999px;
  background: #e8faf5;
  color: #0f766e;
  font-size: 12px;
  font-weight: 800;
}

.shift-form {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) minmax(150px, 0.8fr) 120px 120px minmax(220px, 1.25fr) auto;
  align-items: end;
  gap: 12px;
  margin: 18px 0 0;
  padding: 16px;
  border: 1px solid #dce7ef;
  border-radius: 16px;
  background: #f8fbfd;
}

.shift-form label {
  gap: 6px;
}

.shift-form label span {
  font-size: 12px;
}

.shift-form input,
.shift-form select {
  min-height: 44px;
  padding: 10px 11px;
  border-radius: 11px;
}

.shift-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.shift-item {
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid #dce7ef;
  border-radius: 15px;
  background: #ffffff;
}

.shift-date {
  padding: 8px 6px;
  border-radius: 12px;
  background: #ecfdf8;
  color: #0f766e;
  text-align: center;
}

.shift-date span,
.shift-date strong,
.shift-detail strong,
.shift-detail span,
.shift-detail small {
  display: block;
}

.shift-date span {
  font-size: 10px;
  font-weight: 800;
}

.shift-date strong {
  margin-top: 3px;
  font-size: 1.35rem;
}

.shift-detail strong {
  color: #0f172a;
}

.shift-detail span,
.shift-detail small {
  margin-top: 4px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.45;
}

.shift-empty {
  margin-top: 16px;
  padding: 22px;
  border: 1px dashed #cbd8e4;
  border-radius: 14px;
  color: #64748b;
  text-align: center;
}

.primary-btn,
.ghost-btn,
.danger-btn,
.reschedule-btn,
.close-btn,
.pill-btn {
  min-height: 42px;
  border-radius: 14px;
  border: 1px solid transparent;
  padding: 0 16px;
  font-weight: 700;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.primary-btn {
  background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);
  color: #fff;
  box-shadow: 0 14px 30px rgba(15, 118, 110, 0.18);
}

.ghost-btn,
.close-btn,
.pill-btn {
  background: #fff;
  color: #0f172a;
  border-color: rgba(203, 213, 225, 0.88);
}

.danger-btn {
  background: rgba(239, 68, 68, 0.12);
  color: #b91c1c;
  border-color: rgba(239, 68, 68, 0.16);
}

.reschedule-btn {
  background: #ecfdf5;
  color: #0f766e;
  border-color: #99f6e4;
}

.primary-btn:hover,
.ghost-btn:hover,
.danger-btn:hover,
.reschedule-btn:hover,
.close-btn:hover,
.pill-btn:hover {
  transform: translateY(-1px);
}

.toolbar {
  padding: 14px;
}

.filter-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.pill-btn.active {
  background: rgba(20, 184, 166, 0.12);
  color: #0f766e;
  border-color: rgba(20, 184, 166, 0.2);
}

.table-panel {
  padding: 18px;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 16px 14px;
  text-align: left;
  border-bottom: 1px solid rgba(226, 232, 240, 0.9);
  vertical-align: top;
}

th {
  color: #64748b;
  font-size: 13px;
  font-weight: 800;
}

.date-cell,
.pet-cell {
  display: flex;
  gap: 14px;
}

.date-block {
  min-width: 68px;
  border-radius: 16px;
  background: linear-gradient(180deg, #ecfdf5 0%, #f0fdfa 100%);
  border: 1px solid rgba(20, 184, 166, 0.14);
  color: #0f766e;
  text-align: center;
  padding: 10px 8px;
}

.date-block span {
  display: block;
  font-size: 11px;
  font-weight: 700;
}

.date-block strong {
  display: block;
  margin-top: 4px;
  font-size: 24px;
}

.pet-avatar {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 800;
}

.primary-line {
  color: #0f172a;
  font-weight: 700;
}

.secondary-line {
  margin-top: 4px;
  color: #64748b;
  font-size: 13px;
}

.reason-chip {
  color: #334155;
  line-height: 1.6;
}

.status-stack {
  display: grid;
  gap: 8px;
}

.status-chip {
  width: fit-content;
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 800;
}

.status-chip.is-confirmed {
  background: #dbeafe;
  color: #1d4ed8;
}

.status-chip.is-pending {
  background: #fef3c7;
  color: #92400e;
}

.status-chip.is-danger {
  background: #fee2e2;
  color: #b91c1c;
}

.status-chip.is-completed {
  background: #dcfce7;
  color: #166534;
}

.status-chip.is-missed {
  background: #f1f5f9;
  color: #475569;
}

.cancel-reason {
  color: #b91c1c;
  font-size: 12px;
  line-height: 1.5;
}

.row-actions {
  display: flex;
  gap: 10px;
}

.mini-btn {
  min-height: 36px;
  padding: 0 12px;
  font-size: 13px;
}

.state {
  padding: 28px 14px;
}

.alert-board {
  display: grid;
  grid-template-columns: 1.4fr repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.alert-panel {
  padding: 20px 22px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(217, 226, 236, 0.92);
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
}

.alert-panel-primary {
  background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);
  border-color: transparent;
}

.alert-panel-danger {
  background: linear-gradient(180deg, #fff7f7 0%, #fff1f2 100%);
  border-color: rgba(248, 113, 113, 0.35);
}

.alert-kicker {
  display: block;
  color: #64748b;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.alert-panel-primary .alert-kicker {
  color: rgba(255, 255, 255, 0.78);
}

.alert-panel strong {
  display: block;
  margin-top: 10px;
  color: #0f172a;
  font-size: 28px;
  line-height: 1.2;
}

.alert-panel-primary strong {
  color: #ffffff;
}

.alert-panel p {
  margin: 10px 0 0;
  color: #64748b;
  line-height: 1.6;
}

.alert-panel-primary p {
  color: rgba(255, 255, 255, 0.92);
}

.empty-card {
  text-align: center;
}

.empty-card strong {
  display: block;
  color: #0f172a;
  font-size: 18px;
}

.empty-card p {
  margin: 8px 0 0;
  color: #64748b;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.42);
  backdrop-filter: blur(3px);
  display: grid;
  place-items: center;
  padding: 20px;
  z-index: 50;
}

.modal {
  width: min(760px, 100%);
  padding: 24px;
}

.modal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

form {
  margin-top: 18px;
}

.reschedule-banner {
  margin-bottom: 16px;
  padding: 14px 16px;
  border: 1px solid #fed7aa;
  border-radius: 12px;
  background: #fff7ed;
  color: #7c2d12;
}

.reschedule-banner strong,
.reschedule-banner p,
.reschedule-banner small {
  display: block;
}

.reschedule-banner p {
  margin: 6px 0;
  font-weight: 700;
  line-height: 1.55;
}

.reschedule-banner small {
  color: #9a3412;
  line-height: 1.55;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.full-width {
  grid-column: 1 / -1;
}

.field-wrap,
label {
  display: grid;
  gap: 8px;
}

.field-wrap {
  position: relative;
  min-width: 0;
}

label span {
  color: #334155;
  font-size: 14px;
  font-weight: 700;
}

input,
select,
textarea {
  width: 100%;
  border-radius: 14px;
  border: 1px solid rgba(203, 213, 225, 0.88);
  background: #fff;
  padding: 13px 14px;
  color: #0f172a;
  font: inherit;
  outline: none;
}

input:focus,
select:focus,
textarea:focus {
  border-color: rgba(20, 184, 166, 0.6);
  box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.12);
}

.search-box {
  position: relative;
  min-width: 0;
}

.search-box input {
  box-sizing: border-box;
  min-width: 0;
}

.inline-clear {
  position: absolute;
  top: 50%;
  right: 12px;
  transform: translateY(-50%);
  border: 0;
  background: transparent;
  color: #0f766e;
  font-weight: 700;
}

.pet-dropdown {
  position: absolute;
  z-index: 20;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  width: auto;
  box-sizing: border-box;
  margin: 0;
  padding: 8px;
  list-style: none;
  border-radius: 16px;
  border: 1px solid rgba(203, 213, 225, 0.88);
  background: #fff;
  box-shadow: 0 16px 30px rgba(15, 23, 42, 0.12);
  max-height: 280px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

.dropdown-item,
.dropdown-empty {
  padding: 12px;
  border-radius: 12px;
}

.dropdown-item {
  cursor: pointer;
}

.dropdown-item:hover {
  background: rgba(20, 184, 166, 0.08);
}

.dropdown-item:active {
  background: rgba(20, 184, 166, 0.14);
}

.dropdown-empty {
  color: #64748b;
}

.field-hint {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
}

.appointment-time-field input {
  font-variant-numeric: tabular-nums;
}

.appointment-date-field {
  align-content: start;
}

.appointment-time-field input[aria-invalid="true"] {
  border-color: #dc2626;
}

.field-error,
.appointment-form-error {
  color: #b42318;
}

.appointment-form-error {
  margin: 0 0 16px;
  padding: 11px 14px;
  border-radius: 10px;
  background: #fff1f0;
  font-size: 14px;
  font-weight: 600;
}

.review-feedback {
  white-space: pre-line;
}

.warning-text {
  color: #b45309;
}

.success-text {
  color: #0f766e;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 8px;
}

@media (max-width: 900px) {
  .alert-board,
  .page-header {
    grid-template-columns: 1fr;
  }

  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .shift-form {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .shift-note-field {
    grid-column: 1 / -1;
  }
}

@media (max-width: 720px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .modal-head,
  .modal-actions,
  .row-actions,
  .date-cell,
  .pet-cell {
    flex-direction: column;
  }

  .primary-btn,
  .ghost-btn,
  .danger-btn,
  .reschedule-btn,
  .close-btn {
    width: 100%;
  }

  .shift-head {
    flex-direction: column;
  }

  .shift-form,
  .shift-list {
    grid-template-columns: 1fr;
  }

  .shift-note-field {
    grid-column: auto;
  }

  .shift-item {
    grid-template-columns: 54px minmax(0, 1fr);
  }

  .shift-item .danger-btn {
    grid-column: 1 / -1;
  }
}
</style>

<style scoped>
/* Appointment desk: requests and veterinarian context stay side by side. */
.appointments-admin-page { gap: 18px; }
.appointments-admin-page .page-header { padding: 0 0 4px; background: transparent; border: 0; border-radius: 0; box-shadow: none; align-items: center; }
.page-header h1 { font-size: 24px; }
.subtitle { margin-top: 5px; font-size: 14px; color: #526575; }
.view-tabs { display: flex; flex-wrap: wrap; gap: 4px; padding: 0 12px; background: #fff; border: 1px solid #dbe4ea; border-radius: 12px; }
.view-tabs button { display: flex; align-items: center; gap: 8px; min-height: 58px; padding: 12px 18px; color: #526575; border: 0; border-bottom: 2px solid transparent; border-radius: 0; background: transparent; box-shadow: none; font: inherit; font-weight: 600; }
.view-tabs button[aria-pressed="true"] { border-bottom-color: #0f766e; color: #0f766e; }
.view-tabs span { min-width: 24px; border-radius: 50%; padding: 2px 6px; background: #edf2f5; font-size: 12px; }
.appointment-workspace { display: grid; grid-template-columns: minmax(0, 1.8fr) minmax(300px, 1fr); gap: 18px; align-items: start; }
.request-queue, .list-column { grid-column: 1; grid-row: 1; min-width: 0; }
.schedule-column { grid-column: 2; grid-row: 1; min-width: 0; display: grid; gap: 18px; }
.request-queue, .shift-panel, .day-preview, .table-panel { padding: 22px; background: #fff; border: 1px solid #dbe4ea; border-radius: 12px; box-shadow: none; }
.request-queue-head { gap: 8px; flex-wrap: wrap; }
.request-queue-head h2, .shift-head h2, .day-preview h2, .table-panel h2 { font-size: 18px; margin: 0; color: #183343; }
.request-queue-head span { font-size: 12px; color: #526575; }
.queue-help, .quiet-empty { font-size: 13px; line-height: 1.7; color: #526575; }
.quiet-empty { padding: 20px 0; }
.request-row { display: grid; grid-template-columns: 115px minmax(0, 1fr) 106px; align-items: start; gap: 16px; padding: 22px 0; border-color: #e1e8ed; }
.request-row:last-child { padding-bottom: 0; }
.request-date { display: grid; gap: 5px; font-size: 13px; color: #526575; font-variant-numeric: tabular-nums; }
.request-date strong { font-size: 17px; color: #183343; }
.compare-button { padding: 5px 0; border: 0; background: transparent; color: #0f766e; text-align: left; font: inherit; font-size: 12px; box-shadow: none; }
.compare-button:hover { text-decoration: underline; }
.request-copy { min-width: 0; overflow-wrap: anywhere; }
.request-copy > strong { font-size: 17px; color: #183343; }
.request-copy p, .request-copy small { font-size: 13px; line-height: 1.6; color: #526575; }
.request-copy small { display: block; }
.request-vet-picker { display: grid; gap: 6px; max-width: 320px; margin-top: 12px; }
.request-vet-picker span { font-size: 13px; color: #334155; }
.request-vet-picker select { min-width: 0; padding: 9px 12px; font-size: 14px; }
.request-copy .status-chip { margin-top: 10px; padding: 4px 10px; }
.request-actions { display: grid; gap: 8px; }
.rejection-form { grid-column: 1 / -1; margin-top: 0; padding-top: 14px; }
.shift-head { gap: 8px; }
.shift-head p:last-child { font-size: 12px; color: #526575; }
.shift-count { padding: 5px 8px; font-weight: 600; }
.schedule-date-picker { margin: 18px 0; font-size: 13px; color: #526575; }
.schedule-manager summary { cursor: pointer; padding: 12px 0; color: #0f766e; font-size: 14px; font-weight: 600; border-top: 1px solid #e1e8ed; }
.shift-form { grid-template-columns: 1fr 1fr; padding: 0 0 18px; border: 0; border-radius: 0; background: #fff; }
.shift-form label:first-child, .shift-note-field, .shift-form > button { grid-column: 1 / -1; }
.shift-form label:nth-child(2) { grid-column: 1 / -1; }
.shift-list { grid-template-columns: 1fr; gap: 0; margin-top: 6px; }
.shift-item { grid-template-columns: minmax(0, 1fr) auto; border: 0; border-top: 1px solid #e1e8ed; border-radius: 0; padding: 16px 0; }
.shift-date { display: none; }
.shift-detail { overflow-wrap: anywhere; }
.shift-detail span, .shift-detail small { color: #526575; }
.shift-empty { border: 0; padding: 18px 0 0; text-align: left; line-height: 1.7; color: #526575; font-size: 13px; }
.confirmed-row { display: flex; align-items: start; gap: 18px; padding: 16px 0; border-top: 1px solid #e1e8ed; font-size: 13px; }
.confirmed-row > strong { flex: none; font-variant-numeric: tabular-nums; }
.confirmed-row div { min-width: 0; overflow-wrap: anywhere; }
.confirmed-row small { display: block; margin-top: 5px; color: #526575; }
.toolbar { padding: 0 0 14px; background: transparent; border: 0; box-shadow: none; border-radius: 0; }
.filter-pills { gap: 6px; }
.table-panel { padding: 20px 12px; }
.table-panel h2 { margin: 0 8px 16px; }
th, td { padding: 16px 9px; font-size: 13px; }
th { color: #526575; }
.date-block { display: none; }
.date-cell, .pet-cell { gap: 8px; }
.pet-avatar { width: 30px; height: 30px; border-radius: 8px; flex: none; }
.row-actions { flex-wrap: wrap; gap: 6px; }
.primary-btn, .ghost-btn, .danger-btn, .reschedule-btn, .close-btn, .pill-btn { border-radius: 8px; box-shadow: none; transition: background .15s ease; }
.primary-btn { background: #0f766e; }
.primary-btn:hover { background: #095f59; }
.ghost-btn:hover, .pill-btn:hover { background: #f1f6f7; }
button:hover { transform: none; }
button:disabled { opacity: .55; cursor: wait; }
button:focus-visible, summary:focus-visible { outline: 3px solid #4caaa1; outline-offset: 3px; }
input, select, textarea { border-radius: 8px; box-sizing: border-box; min-width: 0; }
.modal { max-height: calc(100dvh - 40px); overflow-y: auto; border-radius: 14px; box-shadow: none; }
@media (max-width: 1250px) {
  .appointment-workspace { grid-template-columns: minmax(0, 1.5fr) minmax(280px, 1fr); }
  .request-row { grid-template-columns: 100px minmax(0, 1fr); }
  .request-actions { grid-column: 2; display: flex; flex-wrap: wrap; }
}
@media (max-width: 900px) {
  .appointment-workspace { grid-template-columns: 1fr; }
  .schedule-column { grid-column: 1; grid-row: 2; }
}
@media (max-width: 720px) {
  .request-queue, .shift-panel, .day-preview { padding: 18px; }
  .view-tabs { padding: 0 6px; }
  .view-tabs button { font-size: 12px; padding: 10px 8px; min-height: 48px; }
  .request-row { grid-template-columns: 1fr; gap: 12px; }
  .request-date { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
  .request-actions { grid-column: 1; display: grid; grid-template-columns: 1fr 1fr; }
  .request-queue-head, .rejection-form { flex-direction: column; align-items: stretch; }
  .shift-item .danger-btn { grid-column: auto; width: auto; }
  .shift-head { flex-direction: row; }
  .table-wrap { overflow: visible; }
  table, tbody { display: block; }
  thead { display: none; }
  tbody tr { display: block; padding: 14px 6px; border-top: 1px solid #e1e8ed; }
  tbody td { display: grid; grid-template-columns: 90px minmax(0, 1fr); gap: 10px; border: 0; padding: 8px 0; overflow-wrap: anywhere; }
  tbody td::before { content: attr(data-label); color: #526575; font-size: 12px; }
  tbody td.state { display: block; }
  tbody td.state::before { display: none; }
  .date-cell, .pet-cell, .row-actions { flex-direction: row; }
  .row-actions button { width: auto; }
}
</style>
