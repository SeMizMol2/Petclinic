<template>
  <section class="hero-section">
    <div class="container hero-content">
      
      <h1 class="headline">
        ยินดีต้อนรับสู่บริการของเรา
      </h1>

      <p class="subtitle">
        เราพร้อมให้บริการคุณด้วยทีมงานมืออาชีพ พร้อมโซลูชันที่ครบครัน<br />
        สำหรับทุกความต้องการของสัตว์เลี้ยงที่คุณรัก
      </p>

      <div class="cta-wrapper">
        <button class="btn-primary">
          ดูบริการทั้งหมด
          <span class="arrow-down">⌄</span>
        </button>
      </div>

    </div>
  </section>
</template>

<style scoped>
.hero-section {
  padding-top: 120px; /* เว้นที่ให้ Navbar */
  padding-bottom: 60px;
  text-align: center;
}

.container {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 20px;
}

.headline {
  font-size: 3.5rem; /* ขนาดใหญ่สะใจ */
  font-weight: 800;
  line-height: 1.2;
  margin-bottom: 20px;
  text-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.subtitle {
  font-size: 1.1rem;
  font-weight: 300;
  line-height: 1.6;
  opacity: 0.9;
  margin-bottom: 40px;
}

/* ปุ่มหลักตรงกลาง */
.btn-primary {
  background: white;
  color: #7c3aed; /* ม่วง */
  border: none;
  padding: 14px 32px;
  border-radius: 50px;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  transition: transform 0.2s, box-shadow 0.2s;
}

.btn-primary:hover {
  transform: translateY(-3px);
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.2);
}

.arrow-down {
  font-size: 1.2rem;
  font-weight: bold;
}

/* Media Query สำหรับมือถือ */
@media (max-width: 768px) {
  .headline { font-size: 2.5rem; }
  .subtitle { font-size: 1rem; }
}
</style>