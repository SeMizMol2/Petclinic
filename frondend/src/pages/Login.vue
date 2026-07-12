<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="card-header">
        <p class="eyebrow">Welcome back</p>
        <h1>เข้าสู่ระบบ</h1>
        <p class="subtitle">เข้าสู่ระบบเพื่อจัดการข้อมูลสัตว์เลี้ยง ประวัติการรักษา และบริการของคลินิก</p>
      </div>

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
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'

const router = useRouter()

const username = ref('')
const password = ref('')
const error = ref('')

const login = async () => {
  error.value = ''

  try {
    const response = await axios.post('http://localhost:3000/api/auth/login', {
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
  background:
    radial-gradient(circle at top left, rgba(15, 118, 110, 0.12), transparent 28%),
    linear-gradient(180deg, #f4f7fb 0%, #eef4f8 100%);
}

.auth-card {
  width: 100%;
  max-width: 460px;
  padding: 36px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(217, 226, 236, 0.92);
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.12);
}

.eyebrow {
  margin: 0 0 10px;
  color: #0f766e;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.card-header h1 {
  margin: 0;
  color: #0f172a;
  font-size: 36px;
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
  border-radius: 14px;
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
  border-radius: 14px;
  background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);
  color: #ffffff;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
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
</style>
