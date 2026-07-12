<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="name === 'dashboard'">
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="4" rx="2" />
      <rect x="14" y="10" width="7" height="11" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
    </template>
    <template v-else-if="name === 'reports'">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h6" />
      <path d="M8 9h2" />
    </template>
    <template v-else-if="name === 'users'">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </template>
    <template v-else-if="name === 'user'">
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </template>
    <template v-else-if="name === 'paw'">
      <ellipse cx="12" cy="15" rx="4.8" ry="3.6" />
      <circle cx="7.5" cy="9" r="1.7" />
      <circle cx="11" cy="6.8" r="1.7" />
      <circle cx="14.8" cy="6.8" r="1.7" />
      <circle cx="18.3" cy="9" r="1.7" />
    </template>
    <template v-else-if="name === 'stethoscope'">
      <path d="M4 3v5a4 4 0 0 0 8 0V3" />
      <path d="M8 3v5" />
      <path d="M16 7a4 4 0 0 0 0 8h1a3 3 0 1 1-3 3" />
      <circle cx="17" cy="18" r="3" />
    </template>
    <template v-else-if="name === 'clinic'">
      <path d="M4 21V7a2 2 0 0 1 2-2h8l6 6v10" />
      <path d="M14 5v6h6" />
      <path d="M9 13h6" />
      <path d="M12 10v6" />
    </template>
    <template v-else-if="name === 'calendar'">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
    </template>
    <template v-else-if="name === 'services'">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </template>
    <template v-else-if="name === 'treatment'">
      <path d="M9 12h6" />
      <path d="M12 9v6" />
      <path d="M10 2h4" />
      <path d="M12 2v4" />
      <path d="M7 6h10a2 2 0 0 1 2 2v11a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V8a2 2 0 0 1 2-2Z" />
    </template>
    <template v-else-if="name === 'surgery'">
      <path d="M14.7 6.3a2.5 2.5 0 1 0-3.4-3.6L9.2 4.8" />
      <path d="M14.8 14.8 21 21" />
      <path d="M3 21l6.2-6.2" />
      <path d="M6.6 8.2a2.5 2.5 0 1 0-3.6-3.4L5 6.9" />
      <path d="M8.9 15.1 15 9" />
    </template>
    <template v-else-if="name === 'vaccine'">
      <path d="m18 2 4 4" />
      <path d="m17 7 3-3" />
      <path d="m2 22 8-8" />
      <path d="m14 10 4-4" />
      <path d="m10 14 4-4" />
      <path d="m7 17 4-4" />
    </template>
    <template v-else-if="name === 'receipt'">
      <path d="M6 2h12v20l-3-2-3 2-3-2-3 2z" />
      <path d="M9 7h6" />
      <path d="M9 11h6" />
      <path d="M9 15h4" />
    </template>
    <template v-else-if="name === 'expense'">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M6 12h.01" />
      <path d="M18 12h.01" />
      <path d="M12 10v4" />
    </template>
    <template v-else-if="name === 'logout'">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </template>
    <template v-else-if="name === 'mail'">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </template>
    <template v-else-if="name === 'phone'">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.79.63 2.64a2 2 0 0 1-.45 2.11L8 9.91a16 16 0 0 0 6.09 6.09l1.44-1.29a2 2 0 0 1 2.11-.45c.85.3 1.74.51 2.64.63A2 2 0 0 1 22 16.92z" />
    </template>
    <template v-else-if="name === 'upload'">
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M20 16.5A4.5 4.5 0 0 1 15.5 21h-7A4.5 4.5 0 0 1 4 16.5" />
    </template>
    <template v-else-if="name === 'edit'">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </template>
    <template v-else-if="name === 'trash'">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </template>
    <template v-else-if="name === 'history'">
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 3v6h6" />
      <path d="M12 7v5l4 2" />
    </template>
    <template v-else-if="name === 'dog'">
      <path d="M6 10V7a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v3" />
      <path d="M6 10v5a4 4 0 0 0 4 4h4a4 4 0 0 0 4-4v-5" />
      <path d="M9 12h.01" />
      <path d="M15 12h.01" />
      <path d="M11 15c.5.7 1.5.7 2 0" />
      <path d="M6 8 4 6" />
      <path d="m18 8 2-2" />
    </template>
    <template v-else-if="name === 'cat'">
      <path d="m8 5 2 2 2-3 2 3 2-2" />
      <path d="M7 10a5 5 0 0 1 10 0v3a5 5 0 0 1-10 0z" />
      <path d="M10 13h.01" />
      <path d="M14 13h.01" />
      <path d="M11 16c.4.5 1.6.5 2 0" />
      <path d="M6 14H3" />
      <path d="M21 14h-3" />
    </template>
    <template v-else-if="name === 'rabbit'">
      <path d="M9 8V4a2 2 0 1 1 4 0v4" />
      <path d="M13 8V3a2 2 0 1 1 4 0v6" />
      <path d="M6 13a6 6 0 1 1 12 0v1a6 6 0 1 1-12 0z" />
      <path d="M10 14h.01" />
      <path d="M14 14h.01" />
    </template>
    <template v-else-if="name === 'bird'">
      <path d="M20 14c0 4-3.6 7-8 7-3.8 0-7-2.7-7-6 0-2.6 1.8-4.4 4.3-5.3" />
      <path d="M12 15c-1.8 0-3-1.1-3-2.6 0-2.4 3.2-4.4 7-4.4a9 9 0 0 1 2 .2" />
      <path d="M18 7c1 0 2 .8 2 1.8 0 .7-.5 1.3-1.1 1.6" />
    </template>
    <template v-else-if="name === 'fish'">
      <path d="M3 12s3-5 9-5c4 0 7 5 7 5s-3 5-7 5c-6 0-9-5-9-5Z" />
      <path d="M21 9l-2 3 2 3" />
      <circle cx="12" cy="12" r="1" />
    </template>
    <template v-else>
      <circle cx="12" cy="12" r="9" />
    </template>
  </svg>
</template>

<script setup>
defineProps({
  name: {
    type: String,
    default: 'dashboard'
  },
  size: {
    type: [Number, String],
    default: 20
  }
})
</script>
