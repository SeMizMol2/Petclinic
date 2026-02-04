<template>
  <div class="landing-page-wrapper">
    <Navbar />
    <main class="content-area">
      <HeroSection />
      <ServiceSection />
    </main>
    <Footer />
  </div>
</template>

<script setup>
import Navbar from '../components/Navbar.vue'
import HeroSection from '../components/HeroSection.vue'
import ServiceSection from '../components/ServiceSection.vue'
import Footer from '../components/Footer.vue'
</script>

<style scoped>
/* ⭐ บังคับพื้นหลัง Gradient ที่นี่ที่เดียว ⭐ */
.landing-page-wrapper {
  width: 100%;
  min-height: 100vh;
  /* ไล่สีจาก ม่วงเข้ม -> ม่วงกลาง -> ชมพู */
  background: linear-gradient(135deg, #4c1d95 0%, #7c3aed 50%, #db2777 100%);
  color: white;
  font-family: 'Inter', sans-serif;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
}

.content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
</style>