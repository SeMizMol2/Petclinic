<template>
  <div class="receipt-container">
    <h2>🧾 ประวัติการชำระเงิน / ใบเสร็จรับเงิน</h2>

    <div v-if="receipts.length === 0" class="empty-state">
      ไม่มีประวัติการชำระเงิน
    </div>

    <table v-else class="receipt-table">
      <thead>
        <tr>
          <th>เลขที่ใบเสร็จ</th>
          <th>วันที่ออกบิล</th>
          <th>ยอดรวม (บาท)</th>
          <th>ช่องทางชำระ</th>
          <th>สถานะ</th>
          <th>หลักฐานการโอน</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in receipts" :key="item.receipt_id">
          <td>{{ item.receipt_id }}</td>
          <td>{{ formatDate(item.issue_date) }}</td>
          <td>{{ item.total_amount }}</td>
          <td>{{ item.pay_method || '-' }}</td>
          <td>
            <span :class="['status-badge', isPaid(item) ? 'paid' : 'unpaid']">
              {{ isPaid(item) ? 'ชำระแล้ว' : 'ค้างชำระ' }}
            </span>
          </td>
          <td>
            <span v-if="isPaid(item)">-</span>
            <span v-else-if="item.proof_image">ส่งหลักฐานแล้ว รอตรวจสอบ</span>
            <div v-else class="upload-box">
              <input
                type="file"
                accept="image/*"
                @change="(e) => onFileSelected(e, item.receipt_id)"
              />
              <button
                :disabled="uploadingId === item.receipt_id"
                @click="uploadProof(item.receipt_id)"
              >
                {{ uploadingId === item.receipt_id ? 'กำลังส่ง...' : 'ส่งหลักฐาน' }}
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const receipts = ref([])
const selectedFiles = ref({})
const uploadingId = ref(null)

// ⭐ สถานะจริงในดาต้าเบสเป็นภาษาไทย ไม่ใช่ 'Paid' แบบเดิมที่เช็คผิด
const isPaid = (item) => item.payment_status === 'ชำระเสร็จสิ้น'

// ฟังก์ชันแปลงวันที่ให้อ่านง่าย
const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('th-TH')
}

const authHeader = () => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// ฟังก์ชันดึงใบเสร็จจากหลังบ้าน
const loadReceipts = async () => {
  try {
    const userData = JSON.parse(localStorage.getItem('user'))
    if (!userData) return

    // ⭐ ต้องแนบ token ไปด้วย เพราะ backend เพิ่ม auth middleware แล้ว
    const res = await axios.get(
      `http://localhost:3000/api/receipts/my-receipts/${userData.user_id}`,
      { headers: authHeader() }
    )

    if (res.data.success) {
      receipts.value = res.data.data
    }
  } catch (error) {
    console.error("Error loading receipts:", error)
  }
}

const onFileSelected = (e, receiptId) => {
  selectedFiles.value[receiptId] = e.target.files[0]
}

const uploadProof = async (receiptId) => {
  const file = selectedFiles.value[receiptId]
  if (!file) {
    alert('กรุณาเลือกไฟล์หลักฐานการโอนเงินก่อน')
    return
  }

  try {
    uploadingId.value = receiptId
    const formData = new FormData()
    formData.append('proofImage', file)

    await axios.post(
      `http://localhost:3000/api/receipts/${receiptId}/proof`,
      formData,
      { headers: { ...authHeader(), 'Content-Type': 'multipart/form-data' } }
    )

    alert('ส่งหลักฐานการโอนเงินสำเร็จ กรุณารอแอดมินตรวจสอบ')
    await loadReceipts()
  } catch (error) {
    console.error("Error uploading proof:", error)
    alert('ส่งหลักฐานไม่สำเร็จ กรุณาลองใหม่')
  } finally {
    uploadingId.value = null
  }
}

// สั่งให้โหลดข้อมูลทันทีที่เปิดหน้านี้
onMounted(() => {
  loadReceipts()
})
</script>

<style scoped>
.receipt-container { padding: 20px; font-family: sans-serif; }
.receipt-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
.receipt-table th, .receipt-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
.receipt-table th { background-color: #f3f4f6; }
.empty-state { text-align: center; color: #6b7280; margin-top: 40px; }
.status-badge { padding: 4px 8px; border-radius: 4px; font-size: 0.85em; font-weight: bold; }
.status-badge.paid { background-color: #d1fae5; color: #065f46; }
.status-badge.unpaid { background-color: #fee2e2; color: #991b1b; }
.upload-box { display: flex; flex-direction: column; gap: 6px; }
.upload-box button {
  padding: 4px 10px;
  border-radius: 4px;
  border: none;
  background-color: #2563eb;
  color: white;
  cursor: pointer;
  font-size: 0.85em;
}
.upload-box button:disabled { background-color: #9ca3af; cursor: not-allowed; }
</style>
