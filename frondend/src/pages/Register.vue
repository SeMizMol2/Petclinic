<template>
  <div class="auth-container">
    <div class="bg-overlay"></div>

    <div class="auth-card">
      <div class="card-header">
        <h2 class="title">สมัครสมาชิก</h2>
        <p class="subtitle">เริ่มต้นใช้งานระบบจัดการคลินิกสัตว์เลี้ยง</p>
      </div>

      <form @submit.prevent="register" class="auth-form">
        <div class="form-group">
          <label class="label">ชื่อผู้ใช้</label>
          <input
            v-model="username"
            type="text"
            class="input-field"
            placeholder="ตั้งชื่อผู้ใช้ของคุณ"
            required
          />
        </div>

        <div class="form-group">
          <label class="label">รหัสผ่าน</label>
          <input
            v-model="password"
            type="password"
            class="input-field"
            placeholder="ตั้งรหัสผ่านที่ปลอดภัย"
            required
          />
        </div>

        <button type="submit" class="btn-submit">
          ลงทะเบียน
        </button>
      </form>

      <div class="auth-footer">
        <p>มีบัญชีอยู่แล้ว? <router-link to="/login" class="link">เข้าสู่ระบบ</router-link></p>
        <router-link to="/" class="back-link">← กลับหน้าหลัก</router-link>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";

export default {
  data() {
    return {
      username: "",
      password: "",
    };
  },
  methods: {
    async register() {
      try {
        await axios.post("http://localhost:3000/api/auth/register", {
          username: this.username,
          password: this.password,
        });

        alert("สมัครสมาชิกสำเร็จ");
        this.$router.push("/login");
      } catch (err) {
        alert(err.response?.data?.message || "สมัครสมาชิกไม่สำเร็จ");
      }
    },
  },
};
</script>

<style scoped>
/* ใช้ CSS ชุดเดียวกับ Login.vue เพื่อความสม่ำเสมอ */
.auth-container {
  min-height: 100vh;
  width: 100%;
  background: linear-gradient(135deg, #4c1d95 0%, #7c3aed 50%, #db2777 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  position: relative;
  font-family: 'Inter', sans-serif;
}

.bg-overlay {
  position: absolute;
  inset: 0;
  background-image: url('https://www.transparenttextures.com/patterns/cubes.png');
  opacity: 0.1;
  pointer-events: none;
}

.auth-card {
  background: white;
  width: 100%;
  max-width: 450px;
  padding: 40px;
  border-radius: 24px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
  position: relative;
  z-index: 10;
  animation: slideUp 0.5s ease-out;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.card-header {
  text-align: center;
  margin-bottom: 30px;
}

.title {
  font-size: 2rem;
  font-weight: 800;
  color: #1f2937;
  margin: 0 0 10px;
  background: linear-gradient(to right, #7c3aed, #db2777);
  -webkit-background-clip: text;
  color: transparent;
}

.subtitle {
  color: #6b7280;
  font-size: 0.95rem;
}

.form-group {
  margin-bottom: 20px;
}

.label {
  display: block;
  font-size: 0.9rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.input-field {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  font-size: 1rem;
  transition: all 0.3s;
  outline: none;
  background: #f9fafb;
  box-sizing: border-box;
}

.input-field:focus {
  border-color: #7c3aed;
  background: white;
  box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.1);
}

.btn-submit {
  width: 100%;
  padding: 14px;
  background: linear-gradient(to right, #7c3aed, #6d28d9);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  margin-top: 10px;
  box-shadow: 0 4px 6px rgba(109, 40, 217, 0.2);
}

.btn-submit:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(109, 40, 217, 0.3);
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

.link:hover {
  text-decoration: underline;
}

.back-link {
  display: block;
  margin-top: 15px;
  color: #9ca3af;
  font-size: 0.85rem;
  text-decoration: none;
  transition: color 0.2s;
}

.back-link:hover {
  color: #4b5563;
}
</style>