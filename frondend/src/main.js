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

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const authorization = error.config?.headers?.Authorization || error.config?.headers?.authorization
    if (error.response?.status === 401 && authorization && localStorage.getItem('token')) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (router.currentRoute.value.path !== '/login') {
        router.replace({ path: '/login', query: { reason: 'session-expired' } })
      }
    }
    return Promise.reject(error)
  }
)

const app = createApp(App)

app.use(router)
app.mount('#app')
