<template>
  <nav class="navbar">
    <div class="container navbar-content">
      <router-link to="/" class="brand">
        <div class="logo-icon">+</div>
        <span class="brand-text">{{ clinicName || 'Pet Clinic' }}</span>
      </router-link>

      <div class="auth-buttons">
        <router-link to="/login" class="btn btn-login">เข้าสู่ระบบ</router-link>
        <router-link to="/register" class="btn btn-register">สมัครสมาชิก</router-link>
      </div>
    </div>
  </nav>
</template>

<script setup>
defineProps({
  clinicName: {
    type: String,
    default: 'Pet Clinic'
  }
})
</script>

<style scoped>
.navbar {
  width: 100%;
  padding: 1.5rem 0;
  position: absolute;
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
  gap: 16px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: #ffffff;
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
  font-weight: 800;
  backdrop-filter: blur(5px);
}

.brand-text {
  font-size: 1.5rem;
  font-weight: 800;
}

.auth-buttons {
  display: flex;
  gap: 15px;
}

.btn {
  text-decoration: none;
  padding: 10px 24px;
  border-radius: 999px;
  font-weight: 600;
  font-size: 0.95rem;
}

.btn-login {
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: transparent;
}

.btn-register {
  background: #ffffff;
  color: #7c3aed;
}

@media (max-width: 720px) {
  .navbar-content {
    flex-direction: column;
    align-items: stretch;
  }

  .auth-buttons {
    justify-content: flex-end;
  }
}
</style>
