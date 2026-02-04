<template>
  <section class="service-section">
    <div class="container">
      
      <div class="section-header">
        <h2>ติดต่อเรา</h2>
        <div class="decorative-dots">♦ ♦ ♦ ♦ ♦</div>
      </div>

      <div class="cards-grid">
        
        <div class="card">
          <div class="icon-circle bg-blue">📞</div>
          <h3>เบอร์โทรศัพท์</h3>
          <p>02-0000-0000</p>
        </div>

        <div class="card">
          <div class="icon-circle bg-purple">✉️</div>
          <h3>อีเมล</h3>
          <p>contact@petclinic.com</p>
        </div>

        <div class="card">
          <div class="icon-circle bg-red">📍</div>
          <h3>ที่อยู่</h3>
          <p>123 ถนนสุขุมวิท เขตคลองเตย<br>กรุงเทพฯ</p>
        </div>

      </div>
    </div>
  </section>
</template>

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

/* Grid Layout */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr); /* แบ่ง 3 คอลัมน์ */
  gap: 30px;
}

/* Card Style */
.card {
  background: white;
  border-radius: 20px; /* มุมโค้ง */
  padding: 40px 20px;
  text-align: center;
  color: #333; /* ตัวหนังสือสีเข้ม */
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s;
}

.card:hover {
  transform: translateY(-10px); /* ลอยขึ้นเมื่อเอาเมาส์ชี้ */
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

/* Icons */
.icon-circle {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  margin: 0 auto 10px;
}

.bg-blue { background-color: #eff6ff; color: #3b82f6; }
.bg-purple { background-color: #f5f3ff; color: #8b5cf6; }
.bg-red { background-color: #fef2f2; color: #ef4444; }

/* Responsive */
@media (max-width: 768px) {
  .cards-grid {
    grid-template-columns: 1fr; /* มือถือเรียงแนวตั้ง */
  }
}
</style>