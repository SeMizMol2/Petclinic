import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import './index.css'
import router from './router' // นำเข้า router

const app = createApp(App) // สร้าง App instance แค่ตัวเดียว

app.use(router)            // ติดตั้ง router
app.mount('#app')          // สั่ง mount เข้ากับหน้าเว็บแค่ครั้งเดียว