<template>
  <nav class="navbar">
    <div class="container navbar-content">
      
      <router-link to="/" class="brand">
        <div class="logo-icon">🧬</div>
        <span class="brand-text">Pet Clinic</span>
      </router-link>

      <div class="auth-buttons">
        <router-link to="/login" class="btn btn-login">
          เข้าสู่ระบบ
        </router-link>
        <router-link to="/register" class="btn btn-register">
          สมัครสมาชิก
        </router-link>
      </div>

    </div>
  </nav>
</template>

<style scoped>
.navbar {
  width: 100%;
  padding: 1.5rem 0;
  position: absolute; /* ลอยอยู่บนสุด */
  top: 0;
  left: 0;
  z-index: 50;
}

.container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 20px;
}

.navbar-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* Logo Styles */
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: white;
}

.logo-icon {
  background: rgba(255, 255, 255, 0.2);
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  backdrop-filter: blur(5px);
}

.brand-text {
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: 0.5px;
}

/* Button Styles */
.auth-buttons {
  display: flex;
  gap: 15px;
}

.btn {
  text-decoration: none;
  padding: 10px 24px;
  border-radius: 50px; /* ปุ่มมน */
  font-weight: 600;
  font-size: 0.95rem;
  transition: all 0.3s ease;
}

.btn-login {
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: transparent;
}

.btn-login:hover {
  background: rgba(255, 255, 255, 0.1);
}

.btn-register {
  background-color: white;
  color: #7c3aed; /* สีม่วงตามธีม */
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.btn-register:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
}
</style>