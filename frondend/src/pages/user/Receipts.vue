<template>
  <div class="receipts-page user-page">
    <section v-if="loading" class="receipt-state" role="status">
      <AppIcon name="receipt" :size="24" />
      <div><h3>กำลังโหลดรายการค่าใช้จ่าย</h3><p>กำลังตรวจสอบยอดและสถานะล่าสุดจากคลินิก</p></div>
    </section>
    <section v-else-if="loadError" class="receipt-state error-state" role="alert">
      <AppIcon name="receipt" :size="24" />
      <div><h3>ยังโหลดรายการไม่ได้</h3><p>{{ loadError }}</p><button type="button" class="outline-button" @click="loadReceipts">ลองอีกครั้ง</button></div>
    </section>
    <section v-else-if="!receipts.length" class="receipt-state">
      <AppIcon name="receipt" :size="28" />
      <div><h3>ยังไม่มีรายการค่าใช้จ่าย</h3><p>เมื่อคลินิกบันทึกค่าใช้จ่าย รายการและสถานะการชำระจะปรากฏที่นี่</p><router-link to="/user/pets" class="text-link">กลับไปดูสัตว์เลี้ยงของฉัน</router-link></div>
    </section>
    <template v-else>
      <section class="balance-panel" aria-label="สรุปยอดค้างชำระ">
        <div>
          <h3>ยอดค้างชำระ</h3>
          <p class="balance-amount">{{ formatAmount(unpaidTotal) }} <span>บาท</span></p>
          <p class="balance-description">{{ unpaidCount ? unpaidCount + ' รายการที่ยังต้องชำระกับคลินิก' : 'ไม่มีรายการค้างชำระในขณะนี้' }}</p>
        </div>
        <p class="balance-help"><AppIcon :name="unpaidCount ? 'receipt' : 'services'" :size="20" /><span>{{ unpaidCount ? 'ติดต่อชำระเงินกับทางคลินิก' : 'ตรวจสอบรายการที่ชำระแล้วได้ด้านล่าง' }}</span></p>
      </section>
      <section class="receipt-content" aria-label="รายการค่าใช้จ่าย">
        <div class="receipt-filters" role="group" aria-label="แสดงรายการตามสถานะการชำระ">
          <button v-for="filter in filters" :key="filter.value" type="button" :class="{ active: selectedFilter === filter.value }" :aria-pressed="selectedFilter === filter.value" @click="setFilter(filter.value)">{{ filter.label }} <span>({{ filter.count }})</span></button>
        </div>
        <p class="list-guidance">เรียงตามวันที่ล่าสุด · กดดูรายละเอียดเพื่อแยกรายการค่าใช้จ่าย</p>
        <div v-if="!filteredReceipts.length" class="filtered-empty" role="status"><h3>{{ selectedFilter === 'unpaid' ? 'ไม่มีรายการค้างชำระ' : 'ยังไม่มีรายการที่ชำระแล้ว' }}</h3><p>เลือกหมวดอื่นเพื่อดูรายการค่าใช้จ่ายของคุณ</p></div>
        <div v-else class="receipt-list">
          <article v-for="item in filteredReceipts" :key="item.receipt_id" class="receipt-row" :aria-labelledby="'receipt-title-' + item.receipt_id">
            <div class="receipt-summary">
              <div class="pet-identity">
                <div class="pet-avatar">
                  <img v-if="item.pet_image && !failedImages[item.receipt_id]" :src="resolveImageUrl(item.pet_image)" alt="" loading="lazy" @error="failedImages[item.receipt_id] = true" />
                  <AppIcon v-else :name="item.pet_id ? 'paw' : 'receipt'" :size="25" />
                </div>
                <div class="receipt-identity">
                  <h3 :id="'receipt-title-' + item.receipt_id">{{ item.pet_name || 'ค่าใช้จ่ายของคลินิก' }}</h3>
                  <p>{{ item.treatment_id ? 'ค่ารักษา' : 'ค่าใช้จ่าย' }} · {{ formatDate(item.treatment_date || item.issue_date) }}</p>
                  <span>เลขที่{{ isPaid(item) ? 'ใบเสร็จ' : 'รายการ' }} {{ item.receipt_id }}</span>
                </div>
              </div>
              <div class="receipt-finance"><span :class="['status-badge', isPaid(item) ? 'paid' : 'unpaid']">{{ isPaid(item) ? 'ชำระแล้ว' : 'ค้างชำระ' }}</span><strong>{{ formatAmount(item.total_amount) }} <span>บาท</span></strong></div>
              <button type="button" class="outline-button detail-toggle" :aria-expanded="expandedId === item.receipt_id" :aria-controls="'receipt-detail-' + item.receipt_id" :aria-label="(expandedId === item.receipt_id ? 'ซ่อน' : 'ดู') + 'รายละเอียด ' + (item.pet_name || 'รายการ') + ' ' + item.receipt_id" @click="toggleDetail(item)">
                {{ expandedId === item.receipt_id ? 'ซ่อนรายละเอียด' : 'ดูรายละเอียด' }}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true" :class="{ expanded: expandedId === item.receipt_id }"><path d="m6 9 6 6 6-6" /></svg>
              </button>
            </div>
            <div v-if="expandedId === item.receipt_id" :id="'receipt-detail-' + item.receipt_id" class="receipt-detail">
              <h4>{{ isPaid(item) ? 'ใบเสร็จรับเงิน' : 'รายละเอียดค่าใช้จ่าย' }}</h4>
              <p v-if="detailLoading[item.receipt_id]" class="detail-state" role="status">กำลังโหลดรายละเอียดค่าใช้จ่าย...</p>
              <div v-else-if="detailErrors[item.receipt_id]" class="detail-state detail-error" role="alert"><p>{{ detailErrors[item.receipt_id] }}</p><button type="button" class="outline-button" @click="loadDetail(item)">ลองโหลดรายละเอียดอีกครั้ง</button></div>
              <template v-else-if="details[item.receipt_id]">
                <table class="cost-table">
                  <caption class="sr-only">รายการค่าใช้จ่าย {{ item.receipt_id }}</caption>
                  <thead><tr><th scope="col">รายการ</th><th scope="col">จำนวนเงิน</th></tr></thead>
                  <tbody><tr v-for="(cost, index) in details[item.receipt_id].items" :key="cost.detail_id || index"><td>{{ cost.description || cost.income_type || 'รายการค่าใช้จ่าย' }}</td><td>{{ formatAmount(cost.amount) }} บาท</td></tr><tr v-if="!details[item.receipt_id].items.length"><td colspan="2" class="no-cost-items">ยังไม่มีรายละเอียดแยกรายการ กรุณาสอบถามคลินิก</td></tr></tbody>
                  <tfoot><tr><th scope="row">ยอดรวม</th><td>{{ formatAmount(item.total_amount) }} บาท</td></tr></tfoot>
                </table>
                <dl class="document-meta">
                  <div><dt>วันที่บันทึกรายการ</dt><dd>{{ formatDate(item.issue_date) }}</dd></div>
                  <div v-if="item.treatment_id"><dt>รหัสการรักษา</dt><dd>{{ item.treatment_id }}</dd></div>
                  <div><dt>{{ isPaid(item) ? 'ช่องทางชำระ' : 'ช่องทางชำระที่ระบุ' }}</dt><dd>{{ item.pay_method || 'ยังไม่ระบุ' }}</dd></div>
                  <div v-if="isPaid(item)"><dt>วันที่ชำระ</dt><dd>{{ item.pay_date ? formatDate(item.pay_date) : 'ยังไม่มีข้อมูลวันที่ชำระ' }}</dd></div>
                </dl>
                <p :class="['payment-note', isPaid(item) ? 'paid-note' : 'unpaid-note']"><AppIcon :name="isPaid(item) ? 'services' : 'receipt'" :size="18" /><span>{{ isPaid(item) ? 'คลินิกบันทึกว่ารายการนี้ชำระเรียบร้อยแล้ว' : 'รายการนี้ยังค้างชำระ กรุณาติดต่อชำระเงินกับทางคลินิก' }}</span></p>
              </template>
            </div>
          </article>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'
import AppIcon from '../../components/AppIcon.vue'
import { API_BASE_URL, resolveApiAssetUrl } from '../../api'

const receipts = ref([])
const loading = ref(true)
const loadError = ref('')
const selectedFilter = ref('unpaid')
const expandedId = ref('')
const details = ref({})
const detailLoading = ref({})
const detailErrors = ref({})
const failedImages = ref({})
let initialized = false
const authHeader = () => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: 'Bearer ' + token } : {}
}
const isPaid = (item) => ['ชำระเสร็จสิ้น', 'ชำระแล้ว'].includes(String(item.payment_status || '').trim())
const paidCount = computed(() => receipts.value.filter(isPaid).length)
const unpaidCount = computed(() => receipts.value.length - paidCount.value)
const unpaidTotal = computed(() => receipts.value.reduce((sum, item) => sum + (isPaid(item) ? 0 : Number(item.total_amount || 0)), 0))
const filters = computed(() => [
  { value: 'unpaid', label: 'ค้างชำระ', count: unpaidCount.value },
  { value: 'paid', label: 'ชำระแล้ว', count: paidCount.value },
  { value: 'all', label: 'ทั้งหมด', count: receipts.value.length }
])
const filteredReceipts = computed(() => receipts.value.filter((item) => selectedFilter.value === 'all' || (selectedFilter.value === 'paid' ? isPaid(item) : !isPaid(item))))
const setFilter = (filter) => { selectedFilter.value = filter; expandedId.value = '' }
const formatAmount = (value) => Number(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const formatDate = (value) => {
  if (!value) return 'ไม่ระบุวันที่'
  const raw = String(value)
  const date = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(raw + 'T00:00:00+07:00') : new Date(raw)
  return Number.isNaN(date.getTime()) ? 'ไม่ระบุวันที่' : date.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Bangkok' })
}
const resolveImageUrl = resolveApiAssetUrl
const loadReceipts = async () => {
  loading.value = true
  loadError.value = ''
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null')
    if (!user?.user_id) throw new Error('กรุณาเข้าสู่ระบบใหม่เพื่อดูรายการของคุณ')
    const response = await axios.get(API_BASE_URL + '/api/receipts/my-receipts/' + encodeURIComponent(user.user_id), { headers: authHeader() })
    if (!response.data?.success || !Array.isArray(response.data.data)) throw new Error('คลินิกยังส่งรายการกลับมาไม่ครบ กรุณาลองอีกครั้ง')
    receipts.value = response.data.data
    if (!initialized) {
      selectedFilter.value = unpaidCount.value ? 'unpaid' : paidCount.value ? 'paid' : 'all'
      initialized = true
    }
  } catch (error) {
    loadError.value = error.response?.data?.message || (error.response ? 'โหลดรายการไม่สำเร็จ กรุณาลองอีกครั้ง' : error.message === 'Network Error' ? 'เชื่อมต่อคลินิกไม่ได้ กรุณาตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง' : error.message)
  } finally { loading.value = false }
}
const loadDetail = async (item) => {
  const id = item.receipt_id
  if (detailLoading.value[id]) return
  detailLoading.value[id] = true
  detailErrors.value[id] = ''
  try {
    const response = await axios.get(API_BASE_URL + '/api/receipts/detail/' + encodeURIComponent(id), { headers: authHeader() })
    if (!response.data?.success || !response.data.data?.receipt || !Array.isArray(response.data.data.items)) throw new Error('รายละเอียดรายการยังไม่ครบ กรุณาลองอีกครั้ง')
    details.value[id] = response.data.data
  } catch (error) {
    detailErrors.value[id] = error.response?.data?.message || 'โหลดรายละเอียดไม่สำเร็จ กรุณาลองอีกครั้ง'
  } finally { detailLoading.value[id] = false }
}
const toggleDetail = (item) => {
  if (expandedId.value === item.receipt_id) { expandedId.value = ''; return }
  expandedId.value = item.receipt_id
  if (!details.value[item.receipt_id]) loadDetail(item)
}
onMounted(loadReceipts)
</script>

<style scoped>
.receipts-page { display: grid; gap: 22px; color: #0f172a; }
.balance-panel { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 24px; border-radius: 14px; background: #eaf6f3; }
.balance-panel h3 { margin: 0; font-size: 14px; color: #285950; font-weight: 600; }
.balance-amount { margin: 6px 0 0; font-size: 32px; line-height: 1.3; font-weight: 750; color: #0f766e; font-variant-numeric: tabular-nums; }
.balance-amount span { font-size: 22px; font-weight: 650; }
.balance-description { margin: 6px 0 0; color: #285950; font-size: 13px; line-height: 1.6; }
.balance-help { display: flex; align-items: center; gap: 9px; margin: 0; color: #285950; font-size: 13px; }
.balance-help svg { flex-shrink: 0; }
.receipt-content { min-width: 0; padding: 20px 24px 8px; border: 1px solid #d9e2ec; border-radius: 16px; background: #fff; }
.receipt-filters { display: flex; gap: 14px; border-bottom: 1px solid #d9e2ec; }
.receipt-filters button { min-height: 44px; padding: 8px 10px 12px; border: 0; border-bottom: 2px solid transparent; background: transparent; color: #526277; font: inherit; font-size: 14px; cursor: pointer; }
.receipt-filters button:hover { color: #0f766e; background: #f5faf9; }
.receipt-filters button.active { border-bottom-color: #0f766e; color: #0f766e; font-weight: 700; }
.receipt-filters button span { font-size: 12px; }
.list-guidance { margin: 12px 0 0; color: #526277; font-size: 12px; line-height: 1.5; }
.receipt-row { min-width: 0; padding: 22px 0; border-bottom: 1px solid #e5edf5; }
.receipt-row:last-child { border-bottom: 0; }
.receipt-summary { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 16px 22px; align-items: center; }
.pet-identity { display: flex; align-items: center; gap: 14px; min-width: 0; }
.pet-avatar { display: grid; place-items: center; flex: 0 0 52px; width: 52px; height: 52px; overflow: hidden; border-radius: 50%; background: #eaf6f3; color: #0f766e; }
.pet-avatar img { width: 100%; height: 100%; object-fit: cover; }
.receipt-identity { min-width: 0; }
.receipt-identity h3 { margin: 0; font-size: 17px; line-height: 1.4; overflow-wrap: anywhere; }
.receipt-identity p { margin: 4px 0 0; color: #526277; font-size: 13px; line-height: 1.5; }
.receipt-identity > span { display: block; margin-top: 3px; color: #526277; font-size: 12px; overflow-wrap: anywhere; }
.receipt-finance { display: grid; justify-items: end; gap: 6px; }
.receipt-finance strong { font-size: 18px; white-space: nowrap; font-variant-numeric: tabular-nums; }
.receipt-finance strong span { font-size: 14px; font-weight: 600; }
.status-badge { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 999px; font-size: 12px; line-height: 1.5; font-weight: 650; }
.status-badge.paid { background: #e8f7ef; color: #166534; }
.status-badge.unpaid { background: #fff3cd; color: #89540a; }
.outline-button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 42px; padding: 9px 12px; border: 1px solid #c4d2df; border-radius: 9px; background: #fff; color: #17354a; font: inherit; font-size: 13px; font-weight: 650; cursor: pointer; }
.outline-button:hover { border-color: #0f766e; background: #f1faf7; color: #0f766e; }
.detail-toggle svg { width: 16px; height: 16px; transition: transform 160ms ease-out; }
.detail-toggle svg.expanded { transform: rotate(180deg); }
.receipt-detail { margin-top: 22px; padding-top: 18px; border-top: 1px solid #e5edf5; }
.receipt-detail h4 { margin: 0 0 12px; font-size: 15px; }
.cost-table { width: 100%; border-collapse: collapse; font-size: 13px; line-height: 1.6; }
.cost-table thead { background: #f5f8fb; }
.cost-table th, .cost-table td { padding: 11px 12px; text-align: left; overflow-wrap: anywhere; }
.cost-table thead th { font-weight: 650; color: #334155; }
.cost-table tbody tr { border-bottom: 1px solid #e5edf5; }
.cost-table th:last-child, .cost-table td:last-child { text-align: right; }
.cost-table td:last-child { font-variant-numeric: tabular-nums; white-space: nowrap; }
.cost-table tfoot { border-top: 1px solid #cbd8e3; }
.cost-table tfoot th, .cost-table tfoot td { padding-top: 14px; font-size: 15px; font-weight: 750; }
.cost-table .no-cost-items { text-align: left; white-space: normal; color: #526277; }
.document-meta { display: flex; flex-wrap: wrap; gap: 12px 32px; margin: 18px 0 0; padding-top: 15px; border-top: 1px solid #e5edf5; }
.document-meta div { min-width: 120px; }
.document-meta dt { color: #526277; font-size: 12px; }
.document-meta dd { margin: 3px 0 0; color: #334155; font-size: 13px; overflow-wrap: anywhere; }
.payment-note { display: flex; align-items: flex-start; gap: 8px; margin: 16px 0 0; font-size: 13px; line-height: 1.6; }
.payment-note svg { flex-shrink: 0; margin-top: 2px; }
.unpaid-note { color: #89540a; }
.paid-note { color: #166534; }
.receipt-state { display: flex; align-items: flex-start; gap: 16px; padding: 28px; border: 1px solid #d9e2ec; border-radius: 16px; background: #fff; }
.receipt-state > svg { flex-shrink: 0; color: #0f766e; margin-top: 2px; }
.receipt-state h3, .filtered-empty h3 { margin: 0; font-size: 17px; }
.receipt-state p, .filtered-empty p { margin: 6px 0 0; color: #526277; line-height: 1.6; font-size: 14px; }
.receipt-state .outline-button { margin-top: 14px; }
.error-state { border-color: #efbcbc; }
.error-state > svg { color: #991b1b; }
.text-link { display: inline-block; margin-top: 14px; color: #0f766e; text-underline-offset: 4px; }
.detail-state { padding: 14px 0; margin: 0; color: #526277; font-size: 13px; }
.detail-error p { margin: 0 0 10px; color: #991b1b; }
.filtered-empty { padding: 32px 0; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
.receipts-page :is(button, a):focus-visible { outline: 3px solid #0f766e; outline-offset: 3px; }
.receipts-page ::selection { background: #c6eee4; color: #102d3a; }
@media (max-width: 1000px) { .receipt-summary { gap: 14px; } .balance-help { max-width: 200px; line-height: 1.6; } }
@media (max-width: 760px) {
  .balance-panel { align-items: flex-start; flex-direction: column; gap: 14px; padding: 20px; }
  .balance-help { max-width: none; }
  .receipt-summary { grid-template-columns: minmax(0, 1fr) auto; }
  .pet-identity { grid-column: 1 / -1; }
  .receipt-finance { justify-items: start; }
  .detail-toggle { align-self: end; }
  .receipt-content { padding: 16px 18px 4px; }
}
@media (max-width: 420px) {
  .receipts-page { gap: 16px; }
  .receipt-filters { gap: 2px; justify-content: space-between; }
  .receipt-filters button { padding-inline: 5px; font-size: 13px; }
  .balance-amount { font-size: 28px; }
  .balance-amount span { font-size: 18px; }
  .receipt-summary { grid-template-columns: minmax(0, 1fr); }
  .detail-toggle { width: 100%; }
  .pet-avatar { flex-basis: 44px; width: 44px; height: 44px; }
  .cost-table th, .cost-table td { padding-inline: 7px; }
  .document-meta { gap: 12px 20px; }
  .receipt-state { padding: 20px; }
}
@media (prefers-reduced-motion: reduce) { .detail-toggle svg { transition: none; } }
</style>
