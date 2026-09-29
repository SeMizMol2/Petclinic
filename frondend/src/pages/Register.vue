<template>
  <main class="register-page">
    <router-link to="/" class="register-brand"><AppIcon name="paw" :size="28" />โรงพยาบาลสัตว์เมืองเลย</router-link>
    <section class="register-card" aria-labelledby="register-title">
      <template v-if="registered">
        <div class="success-mark"><AppIcon name="services" :size="30" /></div>
        <h1 id="register-title">ตรวจอีเมลเพื่อยืนยันบัญชี</h1>
        <p v-if="emailSent" role="status" class="intro">สมัครสมาชิกแล้ว เราส่งลิงก์ยืนยันไปที่ <strong>{{ email.trim().toLowerCase() }}</strong> ลิงก์ใช้ได้ 24 ชั่วโมง เมื่อยืนยันแล้วจึงเข้าสู่ระบบได้</p>
        <p v-else class="server-error" role="alert">บันทึกบัญชีแล้ว แต่ส่งลิงก์ไปที่ {{ email.trim().toLowerCase() }} ไม่สำเร็จ กดส่งใหม่ด้านล่าง</p>
        <p v-if="resendMessage" :class="resendError ? 'server-error' : 'resend-success'" role="status">{{ resendMessage }}</p>
        <button type="button" class="resend-btn" :disabled="resending" @click="resend">{{ resending ? 'กำลังส่ง…' : 'ส่งลิงก์ยืนยันใหม่' }}</button>
        <router-link to="/login" class="submit-btn success-link">ไปหน้าเข้าสู่ระบบ</router-link>
      </template>
      <template v-else>
        <h1 id="register-title">สมัครสมาชิก</h1>
        <p class="intro">สร้างบัญชีเจ้าของสัตว์เลี้ยง เพื่อดูประวัติและขอนัดหมายกับคลินิก</p>
        <form class="register-form" novalidate :aria-busy="submitting" @submit.prevent="register">
          <div class="field">
            <label for="register-username">ชื่อผู้ใช้</label>
            <input id="register-username" ref="usernameInput" v-model="username" autocomplete="username" maxlength="50" :disabled="submitting" :aria-invalid="!!errors.username" :aria-describedby="errors.username ? 'username-error' : undefined" />
            <p v-if="errors.username" id="username-error" class="field-error">{{ errors.username }}</p>
          </div>
          <div class="field">
            <label for="register-email">อีเมล</label>
            <input id="register-email" ref="emailInput" v-model="email" type="email" autocomplete="email" maxlength="100" :disabled="submitting" :aria-invalid="!!errors.email" :aria-describedby="errors.email ? 'email-error' : undefined" />
            <p v-if="errors.email" id="email-error" class="field-error">{{ errors.email }}</p>
          </div>
          <div class="field">
            <label for="register-password">รหัสผ่าน</label>
            <div class="password-wrap">
              <input id="register-password" ref="passwordInput" v-model="password" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" :disabled="submitting" :aria-invalid="!!errors.password" :aria-describedby="errors.password ? 'password-error' : undefined" />
              <button type="button" :disabled="submitting" :aria-pressed="showPassword" @click="showPassword = !showPassword">{{ showPassword ? 'ซ่อน' : 'แสดง' }}รหัสผ่าน</button>
            </div>
            <p v-if="errors.password" id="password-error" class="field-error">{{ errors.password }}</p>
          </div>
          <div class="field">
            <label for="register-confirm">ยืนยันรหัสผ่าน</label>
            <input id="register-confirm" ref="confirmInput" v-model="confirmPassword" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" :disabled="submitting" :aria-invalid="!!errors.confirm" aria-describedby="confirm-error" />
            <p v-if="errors.confirm" id="confirm-error" class="field-error">{{ errors.confirm }}</p>
          </div>
          <p v-if="serverError" class="server-error" role="alert">{{ serverError }}</p>
          <button type="submit" class="submit-btn" :disabled="submitting">{{ submitting ? 'กำลังสมัครสมาชิก…' : 'ลงทะเบียน' }}</button>
        </form>
        <p class="login-link">มีบัญชีอยู่แล้ว? <router-link to="/login">เข้าสู่ระบบ</router-link></p>
      </template>
    </section>
    <router-link to="/" class="back-link">กลับหน้าแรก</router-link>
  </main>
</template>

<script setup>
import { nextTick, ref } from 'vue'
import axios from 'axios'
import { API_BASE_URL } from '../api'
import AppIcon from '../components/AppIcon.vue'
const username = ref(''), email = ref(''), password = ref(''), confirmPassword = ref('')
const submitting = ref(false), registered = ref(false), showPassword = ref(false)
const emailSent = ref(true), resending = ref(false), resendMessage = ref(''), resendError = ref(false)
const errors = ref({}), serverError = ref('')
const usernameInput = ref(null), emailInput = ref(null), passwordInput = ref(null), confirmInput = ref(null)
const register = async () => {
  if (submitting.value || registered.value) return
  errors.value = {}; serverError.value = ''
  const name = username.value.trim(), address = email.value.trim().toLowerCase()
  if (name.length < 3 || name.length > 50 || /\s|[\u0000-\u001f\u007f]/u.test(name)) errors.value.username = 'กรอกชื่อผู้ใช้ 3–50 ตัวอักษร โดยไม่มีช่องว่าง'
  if (address.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) errors.value.email = 'กรุณากรอกอีเมลให้ถูกต้อง'
  if (Array.from(password.value).length < 8 || !password.value.trim() || new TextEncoder().encode(password.value).length > 72) errors.value.password = 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร '
  if (!confirmPassword.value || confirmPassword.value !== password.value) errors.value.confirm = 'รหัสผ่านทั้งสองช่องต้องตรงกัน'
  if (Object.keys(errors.value).length) {
    await nextTick()
    const inputs = { username: usernameInput, email: emailInput, password: passwordInput, confirm: confirmInput }
    inputs[Object.keys(errors.value)[0]].value?.focus()
    return
  }
  submitting.value = true
  try {
    const { data } = await axios.post(`${API_BASE_URL}/api/auth/register`, { username: name, email: address, password: password.value })
    emailSent.value = data.verification_email_sent === true
    password.value = ''; confirmPassword.value = ''; registered.value = true
    await nextTick(); document.getElementById('register-title')?.setAttribute('tabindex', '-1'); document.getElementById('register-title')?.focus()
  } catch (error) {
    serverError.value = error.response?.data?.message || 'สมัครสมาชิกไม่สำเร็จ กรุณาตรวจการเชื่อมต่อแล้วลองอีกครั้ง'
  } finally { submitting.value = false }
}
const resend = async () => {
  if (resending.value) return
  resending.value = true; resendMessage.value = ''; resendError.value = false
  try {
    await axios.post(`${API_BASE_URL}/api/auth/resend-verification`, { email: email.value.trim().toLowerCase() })
    resendMessage.value = 'หากบัญชียังรอยืนยัน ระบบส่งลิงก์ใหม่แล้ว กรุณาตรวจกล่องจดหมายและสแปม'
    emailSent.value = true
  } catch (error) {
    resendError.value = true
    resendMessage.value = error.response?.data?.message || 'ส่งลิงก์ใหม่ไม่สำเร็จ กรุณาลองอีกครั้ง'
  } finally { resending.value = false }
}
</script>

<style scoped>
.register-page { min-height: 100dvh; box-sizing: border-box; padding: 36px 20px; background: #f3f6f7; color: #122f3e; display: flex; flex-direction: column; align-items: center; gap: 24px; }
.register-brand { display: flex; align-items: center; gap: 10px; color: #122f3e; font-size: 18px; font-weight: 700; text-decoration: none; }
.register-card { width: 100%; max-width: 480px; box-sizing: border-box; padding: 34px; background: #fff; border: 1px solid #dbe4ea; border-radius: 14px; }
h1 { margin: 0; font-size: 28px; line-height: 1.4; }
.intro { margin: 10px 0 0; color: #526575; font-size: 14px; line-height: 1.8; }
.register-form { display: grid; gap: 20px; margin-top: 28px; }
.field { display: grid; gap: 7px; min-width: 0; }
label { font-size: 14px; font-weight: 600; }
input { box-sizing: border-box; width: 100%; min-width: 0; min-height: 46px; padding: 10px 12px; border: 1px solid #cbd9e1; border-radius: 8px; font: inherit; color: #122f3e; background: #fff; }
input[aria-invalid="true"] { border-color: #b53d2b; }
.password-wrap { display: flex; border: 1px solid #cbd9e1; border-radius: 8px; }
.password-wrap input { border: 0; }
.password-wrap button { flex: none; padding: 0 12px; border: 0; background: transparent; color: #0f766e; font: inherit; font-size: 12px; }
.field-error { margin: 0; font-size: 12px; color: #a43522; line-height: 1.6; }
.server-error { margin: 0; padding: 12px; background: #fff0ed; border-radius: 8px; color: #a43522; font-size: 13px; line-height: 1.7; }
.submit-btn { min-height: 46px; padding: 12px 16px; border: 0; border-radius: 8px; color: #fff; background: #0f766e; font: inherit; font-weight: 600; cursor: pointer; }
.submit-btn:hover { background: #095f59; }
button:disabled, input:disabled { opacity: .6; cursor: wait; }
.login-link { margin: 24px 0 0; padding-top: 22px; border-top: 1px solid #e1e8ed; text-align: center; font-size: 14px; color: #526575; }
a { color: #0f766e; text-underline-offset: 4px; }
.back-link { font-size: 13px; }
input:focus-visible, button:focus-visible, a:focus-visible { outline: 3px solid #4caaa1; outline-offset: 3px; }
.success-mark { color: #0f766e; margin-bottom: 18px; }
.success-link { display: block; text-align: center; margin-top: 24px; text-decoration: none; }
.resend-btn { display: block; margin-top: 20px; padding: 0; min-height: 44px; border: 0; background: transparent; color: #0f766e; font: inherit; font-weight: 700; cursor: pointer; text-decoration: underline; text-underline-offset: 4px; }
.resend-success { margin: 16px 0 0; padding: 12px; border-radius: 8px; background: #edf8f3; color: #176345; font-size: 13px; line-height: 1.7; }
@media (max-width: 520px) { .register-page { padding: 24px 14px; gap: 20px; } .register-card { padding: 26px 20px; } .register-brand { font-size: 16px; } }
</style>
