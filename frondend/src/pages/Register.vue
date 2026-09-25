<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="card-header">
        <p class="eyebrow">เริ่มต้นใช้งาน</p>
        <h1>สมัครสมาชิก</h1>
        <p class="subtitle">เริ่มต้นใช้งานระบบคลินิกสัตว์เลี้ยงด้วยบัญชีของคุณ</p>
      </div>

      <form class="auth-form" @submit.prevent="register">
        <label class="field">
          <span>ชื่อผู้ใช้</span>
          <input v-model.trim="username" type="text" placeholder="ตั้งชื่อผู้ใช้" required />
        </label>

        <label class="field">
          <span>อีเมล</span>
          <input v-model.trim="email" type="email" placeholder="example@email.com" required />
          <small>ใช้สำหรับรับการแจ้งเตือนนัดหมายจากคลินิก</small>
        </label>

        <label class="field">
          <span>รหัสผ่าน</span>
          <input v-model="password" type="password" placeholder="ตั้งรหัสผ่านที่ปลอดภัย" required />
        </label>

        <button type="submit" class="submit-btn">ลงทะเบียน</button>
      </form>

      <div class="auth-footer">
        <p>มีบัญชีอยู่แล้ว? <router-link to="/login">เข้าสู่ระบบ</router-link></p>
        <router-link to="/" class="back-link">กลับหน้าแรก</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'

const router = useRouter()
const username = ref('')
const email = ref('')
const password = ref('')

const register = async () => {
  try {
    await axios.post('http://localhost:3000/api/auth/register', {
      username: username.value,
      email: email.value,
      password: password.value
    })

    alert('สมัครสมาชิกสำเร็จ')
    router.push('/login')
  } catch (err) {
    alert(err.response?.data?.message || 'สมัครสมาชิกไม่สำเร็จ')
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

.field small {
  color: #64748b;
  font-size: 13px;
  line-height: 1.5;
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
