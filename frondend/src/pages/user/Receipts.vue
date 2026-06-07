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
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in receipts" :key="item.receipt_id">
          <td>{{ item.receipt_id }}</td>
          <td>{{ formatDate(item.issue_date) }}</td>
          <td>{{ item.total_amount }}</td>
          <td>{{ item.pay_method || '-' }}</td>
          <td>
            <span :class="['status-badge', item.payment_status === 'Paid' ? 'paid' : 'unpaid']">
              {{ item.payment_status === 'Paid' ? 'ชำระแล้ว' : 'ค้างชำระ' }}
            </span>
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

// ฟังก์ชันแปลงวันที่ให้อ่านง่าย
const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('th-TH')
}

// ฟังก์ชันดึงใบเสร็จจากหลังบ้าน
const loadReceipts = async () => {
  try {
    // 1. ดึงข้อมูล User ที่ล็อคอินอยู่จาก LocalStorage
    const userData = JSON.parse(localStorage.getItem('user'))
    if (!userData) return

    // 2. ยิง API ไปขอข้อมูลใบเสร็จ
    const res = await axios.get(`http://localhost:3000/api/receipts/my-receipts/${userData.user_id}`)
    
    if (res.data.success) {
      receipts.value = res.data.data
    }
  } catch (error) {
    console.error("Error loading receipts:", error)
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
</style>