const configuredApiUrl = String(import.meta.env.VITE_API_BASE_URL || '').trim()
const browserApiUrl = `${window.location.protocol}//${window.location.hostname}:3000`

export const API_BASE_URL = (configuredApiUrl || browserApiUrl).replace(/\/$/, '')

export const resolveApiAssetUrl = (value) => {
  const source = String(value || '').trim()
  if (!source) return ''

  if (/^https?:\/\//i.test(source)) {
    try {
      const url = new URL(source)
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        return `${API_BASE_URL}${url.pathname}${url.search}`
      }
      return url.href
    } catch {
      return source
    }
  }

  if (source.startsWith('/uploads/')) return `${API_BASE_URL}${source}`
  if (source.startsWith('uploads/')) return `${API_BASE_URL}/${source}`
  return source.startsWith('/') ? source : `/${source}`
}
