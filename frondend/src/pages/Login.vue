<template>
  <div class="auth-container">
    <div class="bg-overlay"></div>

    <div class="auth-card">
      <div class="card-header">
        <h2 class="title">ยินดีต้อนรับกลับ</h2>
        <p class="subtitle">เข้าสู่ระบบเพื่อจัดการข้อมูลสัตว์เลี้ยง ประวัติการรักษา และบริการของคลินิก</p>
      </div>

      <form class="auth-form" @submit.prevent="login">
        <div class="form-group">
          <label class="label">ชื่อผู้ใช้</label>
          <input v-model.trim="username" type="text" class="input-field" placeholder="Username" required />
        </div>

        <div class="form-group">
          <label class="label">รหัสผ่าน</label>
          <input v-model="password" type="password" class="input-field" placeholder="••••••••" required />
        </div>

        <button type="submit" class="btn-submit">เข้าสู่ระบบ</button>
      </form>

      <div class="auth-footer">
        <p>ยังไม่มีบัญชี? <router-link to="/register" class="link">สมัครสมาชิก</router-link></p>
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
    if (!userData.role) {
      userData.role = 'user'
    }

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
.auth-container {
  min-height: 100vh;
  width: 100%;
  background: linear-gradient(135deg, #4c1d95 0%, #7c3aed 50%, #db2777 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  position: relative;
  font-family: Inter, sans-serif;
}

.bg-overlay {
  position: absolute;
  inset: 0;
  background-image: url('https://www.transparenttextures.com/patterns/cubes.png');
  opacity: 0.1;
  pointer-events: none;
}

.auth-card {
  background: #ffffff;
  width: 100%;
  max-width: 450px;
  padding: 40px;
  border-radius: 24px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
  position: relative;
  z-index: 1;
}

.card-header {
  text-align: center;
  margin-bottom: 30px;
}

.title {
  margin: 0 0 10px;
  font-size: 2rem;
  font-weight: 800;
  background: linear-gradient(to right, #7c3aed, #db2777);
  -webkit-background-clip: text;
  color: transparent;
}

.subtitle {
  margin: 0;
  color: #6b7280;
  font-size: 0.95rem;
  line-height: 1.6;
}

.form-group {
  margin-bottom: 20px;
}

.label {
  display: block;
  margin-bottom: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  color: #374151;
}

.input-field {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  font-size: 1rem;
  outline: none;
  background: #f9fafb;
  box-sizing: border-box;
}

.input-field:focus {
  border-color: #7c3aed;
  background: #ffffff;
  box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.1);
}

.btn-submit {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(to right, #7c3aed, #6d28d9);
  color: #ffffff;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  margin-top: 10px;
}

.auth-footer {
  text-align: center;
  margin-top: 25px;
  font-size: 0.9rem;
  color: #6b7280;
}

.link {
  color: #7c3aed;
  font-weight: 700;
  text-decoration: none;
}

.back-link {
  display: block;
  margin-top: 15px;
  color: #9ca3af;
  font-size: 0.85rem;
  text-decoration: none;
}

.error-msg {
  color: #ef4444;
  text-align: center;
  margin-top: 15px;
  font-size: 0.9rem;
  background: #fef2f2;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #fee2e2;
}
</style>
