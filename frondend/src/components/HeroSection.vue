<template>
  <section class="hero-section">
    <div class="container hero-content">
      <h1 class="headline">ยินดีต้อนรับสู่บริการของเรา</h1>

      <p class="subtitle">
        เราพร้อมให้บริการด้วยทีมงานมืออาชีพ ครอบคลุมการดูแลสุขภาพสัตว์เลี้ยง
        ตั้งแต่การตรวจรักษา วัคซีน ไปจนถึงติดตามประวัติการรักษา
      </p>

      <div class="cta-wrapper">
        <a href="#clinic-contact" class="btn-primary">
          ดูข้อมูลคลินิก
          <span class="arrow-down">⌄</span>
        </a>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero-section {
  padding-top: 120px;
  padding-bottom: 60px;
  text-align: center;
}

.container {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 20px;
}

.headline {
  font-size: 3.5rem;
  font-weight: 800;
  line-height: 1.2;
  margin-bottom: 20px;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.subtitle {
  font-size: 1.1rem;
  line-height: 1.7;
  opacity: 0.92;
  margin-bottom: 40px;
}

.btn-primary {
  background: #ffffff;
  color: #7c3aed;
  text-decoration: none;
  border: none;
  padding: 14px 32px;
  border-radius: 999px;
  font-size: 1.05rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
}

.arrow-down {
  font-size: 1.2rem;
  font-weight: bold;
}

@media (max-width: 768px) {
  .headline {
    font-size: 2.5rem;
  }

  .subtitle {
    font-size: 1rem;
  }
}
</style>
