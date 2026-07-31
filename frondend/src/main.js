import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import './index.css'
import axios from 'axios'
import router from './router'
import { API_BASE_URL } from './api'

axios.interceptors.request.use((config) => {
  if (typeof config.url === 'string') {
    config.url = config.url.replace(
      /^http:\/\/(?:localhost|127\.0\.0\.1):3000/,
      API_BASE_URL
    )
  }
  return config
})

const app = createApp(App)

app.use(router)
app.mount('#app')
