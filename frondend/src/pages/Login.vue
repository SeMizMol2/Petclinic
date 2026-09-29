<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="card-header">
        <p class="eyebrow">ยินดีต้อนรับกลับ</p>
        <h1>เข้าสู่ระบบ</h1>
        <p class="subtitle">เข้าสู่ระบบเพื่อจัดการข้อมูลสัตว์เลี้ยง ประวัติการรักษา และบริการของคลินิก</p>
      </div>

      <p v-if="sessionExpired" class="session-notice" role="alert">
        เพื่อความปลอดภัย กรุณาเข้าสู่ระบบอีกครั้ง ข้อมูลของคุณยังอยู่ครบ
      </p>

      <form class="auth-form" @submit.prevent="login">
        <label class="field">
          <span>ชื่อผู้ใช้</span>
          <input v-model.trim="username" type="text" placeholder="Username" required />
        </label>

        <label class="field">
          <span>รหัสผ่าน</span>
          <input v-model="password" type="password" placeholder="กรอกรหัสผ่าน" required />
        </label>

        <button type="submit" class="submit-btn">เข้าสู่ระบบ</button>
      </form>

      <div class="auth-footer">
        <p>ยังไม่มีบัญชี? <router-link to="/register">สมัครสมาชิก</router-link></p>
        <router-link to="/" class="back-link">กลับหน้าแรก</router-link>
      </div>

      <p v-if="error" class="error-msg">{{ error }}</p>
      <router-link v-if="unverifiedEmail" :to="{ path: '/verify-email', query: { email: unverifiedEmail } }" class="verify-link">ส่งลิงก์ยืนยันอีเมลใหม่</router-link>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import axios from 'axios'
import { useRoute, useRouter } from 'vue-router'
import { API_BASE_URL } from '../api'

const router = useRouter()
const route = useRoute()
const sessionExpired = computed(() => route.query.reason === 'session-expired')

const username = ref('')
const password = ref('')
const error = ref('')
const unverifiedEmail = ref('')

const login = async () => {
  error.value = ''
  unverifiedEmail.value = ''

  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      username: username.value,
      password: password.value
    })

    const userData = { ...response.data.user }
    if (!userData.role) userData.role = 'user'

    localStorage.setItem('token', response.data.token)
    localStorage.setItem('user', JSON.stringify(userData))

    alert('เข้าสู่ระบบสำเร็จ')
    router.push(userData.role === 'admin' ? '/admin' : '/user')
  } catch (err) {
    error.value = err.response?.data?.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
    if (err.response?.data?.code === 'EMAIL_NOT_VERIFIED') unverifiedEmail.value = err.response.data.email || ''
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: #eef3f5;
}

.auth-card {
  width: 100%;
  max-width: 460px;
  padding: 34px;
  border-radius: 14px;
  background: #ffffff;
  border: 1px solid var(--pc-border);
  box-shadow: var(--pc-shadow-lg);
}

.eyebrow {
  margin: 0 0 10px;
  color: #0f766e;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
}

.card-header h1 {
  margin: 0;
  color: #0f172a;
  font-size: 32px;
}

.subtitle {
  margin: 12px 0 0;
  color: #64748b;
  line-height: 1.7;
}

.auth-form {
  display: grid;
  gap: 18px;
  margin-top: 26px;
}

.field {
  display: grid;
  gap: 8px;
}

.field span {
  color: #334155;
  font-size: 14px;
  font-weight: 700;
}

.field input {
  width: 100%;
  min-height: 48px;
  padding: 0 14px;
  border-radius: 10px;
  border: 1px solid #d9e2ec;
  background: #ffffff;
  color: #0f172a;
  box-sizing: border-box;
}

.field input:focus {
  outline: none;
  border-color: rgba(15, 118, 110, 0.45);
  box-shadow: 0 0 0 4px rgba(15, 118, 110, 0.12);
}

.submit-btn {
  min-height: 48px;
  border: 0;
  border-radius: 10px;
  background: var(--pc-primary);
  color: #ffffff;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
}

.submit-btn:hover {
  background: var(--pc-primary-hover);
}

.auth-footer {
  text-align: center;
  margin-top: 24px;
  color: #64748b;
}

.auth-footer a {
  color: #0f766e;
  font-weight: 700;
  text-decoration: none;
}

.back-link {
  display: inline-block;
  margin-top: 12px;
}

.error-msg {
  margin-top: 16px;
  padding: 12px 14px;
  border-radius: 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
  text-align: center;
}
.verify-link { display: block; margin-top: 12px; text-align: center; color: #0f766e; font-weight: 700; }

.session-notice {
  margin: 20px 0 0;
  padding: 12px 14px;
  border-radius: 12px;
  background: #ecfdf5;
  color: #065f46;
  line-height: 1.6;
}

@media (max-width: 520px) {
  .auth-page {
    align-items: flex-start;
    padding: 18px 14px;
  }

  .auth-card {
    padding: 26px 20px;
  }

  .card-header h1 {
    font-size: 28px;
  }
}
</style>
