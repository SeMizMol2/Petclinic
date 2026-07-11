<template>
  <div class="landing-page-wrapper">
    <Navbar :clinic-name="clinic.clinic_name" />
    <main class="content-area">
      <HeroSection />
      <ServiceSection :clinic="clinic" />
    </main>
    <Footer :clinic-name="clinic.clinic_name" />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import axios from 'axios'
import Navbar from '../components/Navbar.vue'
import HeroSection from '../components/HeroSection.vue'
import ServiceSection from '../components/ServiceSection.vue'
import Footer from '../components/Footer.vue'

const clinic = ref({
  clinic_name: 'Pet Clinic',
  address: '',
  tel: '',
  open_hours: ''
})

onMounted(async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/clinic')
    if (res.data) {
      clinic.value = {
        clinic_name: res.data.clinic_name || 'Pet Clinic',
        address: res.data.address || '',
        tel: res.data.tel || '',
        open_hours: res.data.open_hours || ''
      }
    }
  } catch (err) {
    console.error('โหลดข้อมูลคลินิกไม่สำเร็จ:', err)
  }
})
</script>

<style scoped>
.landing-page-wrapper {
  width: 100%;
  min-height: 100vh;
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
