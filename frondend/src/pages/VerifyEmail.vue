<template>
  <main class="verify-page">
    <router-link to="/" class="brand"><AppIcon name="paw" :size="28" />โรงพยาบาลสัตว์เมืองเลย</router-link>
    <section class="card" aria-labelledby="verify-title" aria-busy="verifying">
      <p class="eyebrow">ยืนยันอีเมล</p>
      <h1 id="verify-title">{{ verified ? 'ยืนยันอีเมลสำเร็จ' : 'ยืนยันอีเมลของคุณ' }}</h1>
      <p v-if="verifying" role="status">กำลังตรวจสอบลิงก์…</p>
      <p v-else-if="verified" class="success" role="status">บัญชีพร้อมใช้งานแล้ว เข้าสู่ระบบด้วยชื่อผู้ใช้และรหัสผ่านที่สมัครไว้</p>
      <p v-else-if="verifyError" class="error" role="alert">{{ verifyError }}</p>
      <p v-else>เปิดลิงก์จากอีเมลที่เราเพิ่งส่งให้ หากยังไม่ได้รับหรือหมดอายุ สามารถขอลิงก์ใหม่ได้</p>
      <router-link v-if="verified" to="/login" class="primary-link">เข้าสู่ระบบ</router-link>
      <form v-else class="resend-form" @submit.prevent="resend">
        <label for="verify-email">อีเมลที่ใช้สมัคร</label>
        <input id="verify-email" v-model="email" type="email" autocomplete="email" maxlength="100" required :disabled="resending || verifying" />
        <button type="submit" :disabled="resending || verifying">{{ resending ? 'กำลังส่ง…' : 'ส่งลิงก์ยืนยันใหม่' }}</button>
        <p v-if="resendMessage" :class="resendError ? 'error' : 'success'" role="status">{{ resendMessage }}</p>
      </form>
      <router-link to="/login" class="back-link">กลับหน้าเข้าสู่ระบบ</router-link>
    </section>
  </main>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { API_BASE_URL } from '../api'
import AppIcon from '../components/AppIcon.vue'

const route = useRoute(), router = useRouter()
const email = ref(typeof route.query.email === 'string' ? route.query.email : '')
const verifying = ref(false), verified = ref(false), verifyError = ref('')
const resending = ref(false), resendMessage = ref(''), resendError = ref(false)

onMounted(async () => {
  const token = typeof route.query.token === 'string' ? route.query.token : ''
  if (!token) return
  await router.replace({ path: '/verify-email', query: email.value ? { email: email.value } : {} })
  verifying.value = true
  try {
    await axios.post(`${API_BASE_URL}/api/auth/verify-email`, { token })
    verified.value = true
  } catch (error) {
    verifyError.value = error.response?.data?.message || 'ยืนยันไม่สำเร็จ กรุณาขอลิงก์ใหม่'
  } finally { verifying.value = false }
})

const resend = async () => {
  if (resending.value) return
  resending.value = true; resendMessage.value = ''; resendError.value = false
  try {
    await axios.post(`${API_BASE_URL}/api/auth/resend-verification`, { email: email.value.trim().toLowerCase() })
    resendMessage.value = 'หากบัญชียังรอยืนยัน ระบบส่งลิงก์ใหม่แล้ว กรุณาตรวจกล่องจดหมายและสแปม'
  } catch (error) {
    resendError.value = true
    resendMessage.value = error.response?.data?.message || 'ส่งลิงก์ใหม่ไม่สำเร็จ กรุณาลองอีกครั้ง'
  } finally { resending.value = false }
}
</script>

<style scoped>
.verify-page { min-height: 100dvh; box-sizing: border-box; padding: 36px 20px; background: #f3f6f7; color: #122f3e; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24px; }
.brand { display: flex; align-items: center; gap: 10px; font-size: 18px; font-weight: 700; color: #122f3e; text-decoration: none; }
.card { width: 100%; max-width: 480px; box-sizing: border-box; padding: 34px; background: #fff; border: 1px solid #dbe4ea; border-radius: 14px; }
.eyebrow { margin: 0 0 8px; color: #0f766e; font-size: 12px; font-weight: 700; }
h1 { margin: 0; font-size: 28px; line-height: 1.4; }
.card > p:not(.eyebrow) { line-height: 1.7; color: #526575; }
.resend-form { display: grid; gap: 10px; margin-top: 24px; }
label { font-size: 14px; font-weight: 600; }
input { width: 100%; box-sizing: border-box; min-height: 46px; border: 1px solid #cbd9e1; border-radius: 8px; padding: 10px 12px; font: inherit; }
button, .primary-link { min-height: 46px; box-sizing: border-box; padding: 12px 16px; border: 0; border-radius: 8px; background: #0f766e; color: #fff; font: inherit; font-weight: 700; cursor: pointer; text-align: center; text-decoration: none; }
button:disabled { opacity: .6; cursor: wait; }
.primary-link { display: block; margin-top: 24px; }
.back-link { display: inline-block; margin-top: 20px; color: #0f766e; }
.success, .error { padding: 12px; border-radius: 8px; font-size: 14px; }
.success { background: #edf8f3; color: #176345 !important; }
.error { background: #fff0ed; color: #a43522 !important; }
a:focus-visible, button:focus-visible, input:focus-visible { outline: 3px solid #4caaa1; outline-offset: 3px; }
@media (max-width: 520px) { .verify-page { padding: 24px 14px; } .card { padding: 26px 20px; } h1 { font-size: 24px; } }
</style>
