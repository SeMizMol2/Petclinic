<template>
  <footer class="footer">
    <div class="container footer-content">
      <div class="divider"></div>
      <div class="footer-text">
        <p>&copy; 2026 {{ clinicName || 'Pet Clinic' }} Management System. All rights reserved.</p>
      </div>
    </div>
  </footer>
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
.footer {
  padding: 30px 20px;
  text-align: center;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
}

.container {
  max-width: 1100px;
  margin: 0 auto;
}

.divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.2);
  margin-bottom: 20px;
}
</style>
