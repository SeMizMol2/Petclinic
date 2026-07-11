<template>
  <section id="clinic-contact" class="service-section">
    <div class="container">
      <div class="section-header">
        <h2>ติดต่อเรา</h2>
        <div class="decorative-dots">♦ ♦ ♦ ♦ ♦</div>
      </div>

      <div class="cards-grid">
        <div class="card">
          <div class="icon-circle bg-blue">P</div>
          <h3>เบอร์โทรศัพท์</h3>
          <p>{{ clinic.tel || '-' }}</p>
        </div>

        <div class="card">
          <div class="icon-circle bg-purple">T</div>
          <h3>เวลาทำการ</h3>
          <p>{{ clinic.open_hours || '-' }}</p>
        </div>

        <div class="card">
          <div class="icon-circle bg-red">A</div>
          <h3>ที่อยู่</h3>
          <p class="multiline">{{ clinic.address || '-' }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
defineProps({
  clinic: {
    type: Object,
    default: () => ({
      tel: '',
      open_hours: '',
      address: ''
    })
  }
})
</script>

<style scoped>
.service-section {
  padding: 40px 20px 80px;
}

.container {
  max-width: 1100px;
  margin: 0 auto;
}

.section-header {
  text-align: center;
  margin-bottom: 50px;
}

.section-header h2 {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 10px;
}

.decorative-dots {
  color: rgba(255, 255, 255, 0.6);
  font-size: 1.2rem;
  letter-spacing: 5px;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 30px;
}

.card {
  background: #ffffff;
  border-radius: 8px;
  padding: 40px 20px;
  text-align: center;
  color: #333333;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.card h3 {
  font-size: 1.2rem;
  font-weight: 700;
  margin: 15px 0 10px;
  color: #1f2937;
}

.card p {
  color: #6b7280;
  font-size: 1rem;
  line-height: 1.5;
}

.multiline {
  white-space: pre-line;
}

.icon-circle {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  font-weight: 800;
  margin: 0 auto 10px;
}

.bg-blue {
  background: #eff6ff;
  color: #3b82f6;
}

.bg-purple {
  background: #f5f3ff;
  color: #8b5cf6;
}

.bg-red {
  background: #fef2f2;
  color: #ef4444;
}

@media (max-width: 768px) {
  .cards-grid {
    grid-template-columns: 1fr;
  }
}
</style>
