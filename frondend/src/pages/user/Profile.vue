<template>
  <section class="profile-panel" :aria-busy="loading">
    <p v-if="loading" role="status">กำลังโหลดข้อมูลส่วนตัว…</p>
    <div v-else-if="loadError" class="load-error" role="alert">
      <p>{{ loadError }}</p><button type="button" class="secondary" @click="loadProfile">ลองอีกครั้ง</button>
    </div>
    <template v-else>
      <header class="profile-identity">
        <div class="avatar" aria-hidden="true">
          <img v-if="avatarUrl && !imageFailed" :src="avatarUrl" alt="" @error="imageFailed = true" />
          <span v-else>{{ (user.owner_name || user.username || 'U').charAt(0).toUpperCase() }}</span>
        </div>
        <div class="identity-copy">
          <p class="section-kicker">เจ้าของสัตว์เลี้ยง</p>
          <h2>{{ user.owner_name || user.username || 'เจ้าของสัตว์เลี้ยง' }}</h2>
          <p class="username">@{{ user.username || 'ผู้ใช้งาน' }}</p>
          <button type="button" class="photo-button" :disabled="uploading || saving" @click="fileInput?.click()">
            <AppIcon name="upload" :size="16" />{{ uploading ? 'กำลังอัปโหลด…' : 'เปลี่ยนรูป' }}
          </button>
          <input ref="fileInput" class="hidden-input" type="file" accept="image/*" aria-label="เลือกรูปโปรไฟล์" @change="onFileSelected" />
        </div>
        <button v-if="!isEditing" ref="editButton" type="button" class="secondary edit-button" :disabled="uploading || changingPassword" @click="beginEdit">แก้ไขข้อมูล</button>
        <span v-else class="editing-note">กำลังแก้ไขข้อมูล</span>
      </header>
      <p class="photo-help">รูปบันทึกทันทีเมื่ออัปโหลดสำเร็จ · ขนาดไม่เกิน 5 MB</p>
      <p v-if="photoError" class="message error" role="alert">{{ photoError }}</p>
      <p v-if="photoSuccess" class="message success" role="status">{{ photoSuccess }}</p>
      <p v-if="feedback" class="message success" role="status">{{ feedback }}</p>

      <form @submit.prevent="saveProfile">
        <section class="detail-section">
          <h3>ข้อมูลเจ้าของ</h3>
          <div class="field">
            <label for="owner-name">ชื่อ-นามสกุล</label>
            <input v-if="isEditing" id="owner-name" ref="nameInput" v-model="draft.owner_name" maxlength="100" autocomplete="name" :disabled="saving" />
            <p v-else>{{ user.owner_name || 'ยังไม่ได้ระบุชื่อ' }}</p>
          </div>
        </section>
        <section class="detail-section">
          <h3>ข้อมูลติดต่อ</h3>
          <div class="contact-grid">
            <div class="field">
              <label for="owner-email">อีเมล</label>
              <input v-if="isEditing" id="owner-email" v-model="draft.email" type="email" maxlength="100" autocomplete="email" :disabled="saving" />
              <p v-else>{{ user.email || 'ยังไม่ได้ระบุอีเมล' }}</p>
              <p v-if="!isEditing && user.email && !user.email_verified_at" class="email-pending">อีเมลนี้ยังไม่ยืนยัน <button type="button" class="resend-inline" :disabled="resendingEmail" @click="resendVerification">{{ resendingEmail ? 'กำลังส่ง…' : 'ส่งลิงก์ใหม่' }}</button></p>
            </div>
            <div class="field">
              <label for="owner-phone">เบอร์โทรศัพท์</label>
              <input v-if="isEditing" id="owner-phone" v-model="draft.tel" type="tel" maxlength="15" autocomplete="tel" :disabled="saving" />
              <p v-else>{{ user.tel || 'ยังไม่ได้ระบุเบอร์โทรศัพท์' }}</p>
            </div>
          </div>
        </section>
        <footer class="profile-footer">
          <p>ข้อมูลนี้ใช้สำหรับให้คลินิกติดต่อและนัดหมาย</p>
          <p v-if="saveError" class="message error" role="alert">{{ saveError }}</p>
          <div v-if="isEditing" class="form-actions">
            <button type="button" class="secondary" :disabled="saving || uploading" @click="cancelEdit">ยกเลิก</button>
            <button type="submit" class="primary" :disabled="saving || uploading">{{ saving ? 'กำลังบันทึก…' : 'บันทึกข้อมูล' }}</button>
          </div>
        </footer>
      </form>

      <section v-if="!isEditing" class="password-section" aria-labelledby="password-section-title">
        <div class="password-heading">
          <div>
            <h3 id="password-section-title">ความปลอดภัยของบัญชี</h3>
            <p>เปลี่ยนรหัสผ่านด้วยรหัสปัจจุบันของคุณ</p>
          </div>
          <button v-if="!changingPassword" type="button" class="secondary" @click="openPasswordForm">เปลี่ยนรหัสผ่าน</button>
        </div>
        <p v-if="passwordSuccess" class="message success" role="status">{{ passwordSuccess }}</p>
        <form v-if="changingPassword" class="password-form" @submit.prevent="changePassword">
          <div class="password-fields">
            <div class="field">
              <label for="current-password">รหัสผ่านปัจจุบัน</label>
              <input id="current-password" ref="currentPasswordInput" v-model="passwordDraft.current" type="password" autocomplete="current-password" required :disabled="passwordSaving" />
            </div>
            <div class="field">
              <label for="new-password">รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)</label>
              <input id="new-password" v-model="passwordDraft.next" type="password" autocomplete="new-password" minlength="8" required :disabled="passwordSaving" />
            </div>
            <div class="field">
              <label for="confirm-password">ยืนยันรหัสผ่านใหม่</label>
              <input id="confirm-password" v-model="passwordDraft.confirm" type="password" autocomplete="new-password" minlength="8" required :disabled="passwordSaving" />
            </div>
          </div>
          <p v-if="passwordError" class="message error" role="alert">{{ passwordError }}</p>
          <div class="form-actions">
            <button type="button" class="secondary" :disabled="passwordSaving" @click="cancelPasswordForm">ยกเลิก</button>
            <button type="submit" class="primary" :disabled="passwordSaving">{{ passwordSaving ? 'กำลังเปลี่ยนรหัสผ่าน…' : 'บันทึกรหัสผ่านใหม่' }}</button>
          </div>
        </form>
      </section>
    </template>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import axios from 'axios'
import { API_BASE_URL, resolveApiAssetUrl } from '../../api'
import AppIcon from '../../components/AppIcon.vue'

const user = ref({})
const draft = ref({ owner_name: '', email: '', tel: '' })
const loading = ref(true), saving = ref(false), uploading = ref(false), isEditing = ref(false)
const loadError = ref(''), saveError = ref(''), feedback = ref(''), photoError = ref(''), photoSuccess = ref('')
const resendingEmail = ref(false)
const changingPassword = ref(false), passwordSaving = ref(false), passwordError = ref(''), passwordSuccess = ref('')
const passwordDraft = ref({ current: '', next: '', confirm: '' })
const currentPasswordInput = ref(null)
const fileInput = ref(null), nameInput = ref(null), editButton = ref(null)
const previewImage = ref(''), imageFailed = ref(false)
const avatarUrl = computed(() => previewImage.value || resolveApiAssetUrl(user.value.profile_pic))
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` })
const persistSession = () => {
  let previous = {}
  try { previous = JSON.parse(localStorage.getItem('user') || '{}') } catch { /* Preserve a usable session even if cached data is invalid. */ }
  localStorage.setItem('user', JSON.stringify({ ...previous, ...user.value }))
  window.dispatchEvent(new Event('petclinic:profile-updated'))
}
const resetPreview = () => {
  if (previewImage.value) URL.revokeObjectURL(previewImage.value)
  previewImage.value = ''
  imageFailed.value = false
}
const loadProfile = async () => {
  loading.value = true
  loadError.value = ''
  try {
    const { data } = await axios.get(`${API_BASE_URL}/api/user/me`, { headers: headers() })
    user.value = { ...data, email: data.owner_email || '' }
    persistSession()
  } catch {
    loadError.value = 'โหลดข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง'
  } finally { loading.value = false }
}
const beginEdit = async () => {
  draft.value = { owner_name: user.value.owner_name || '', email: user.value.email || '', tel: user.value.tel || '' }
  saveError.value = ''; feedback.value = ''; isEditing.value = true
  await nextTick(); nameInput.value?.focus()
}
const cancelEdit = async () => {
  isEditing.value = false; saveError.value = ''
  draft.value = { owner_name: '', email: '', tel: '' }
  await nextTick(); editButton.value?.focus()
}
const saveProfile = async () => {
  if (saving.value || uploading.value || !isEditing.value) return
  saving.value = true; saveError.value = ''
  const payload = { owner_name: draft.value.owner_name.trim(), owner_email: draft.value.email.trim().toLowerCase(), tel: draft.value.tel.trim() }
  try {
    const { data } = await axios.put(`${API_BASE_URL}/api/user/me`, payload, { headers: headers() })
    user.value = { ...user.value, ...payload, email: payload.owner_email, email_verified_at: data.email_verification_required ? null : user.value.email_verified_at }
    persistSession(); isEditing.value = false
    feedback.value = data.email_verification_required
      ? (data.verification_email_sent ? 'บันทึกแล้ว กรุณายืนยันอีเมลใหม่ก่อนเข้าสู่ระบบครั้งถัดไป' : 'บันทึกแล้ว แต่ส่งลิงก์ยืนยันไม่สำเร็จ กดส่งลิงก์ใหม่ด้านล่าง')
      : 'บันทึกข้อมูลเรียบร้อยแล้ว'
    await nextTick(); editButton.value?.focus()
  } catch (error) { saveError.value = error.response?.data?.message || 'บันทึกไม่สำเร็จ ข้อมูลที่แก้ไขยังอยู่ กรุณาลองอีกครั้ง' }
  finally { saving.value = false }
}
const resendVerification = async () => {
  if (resendingEmail.value) return
  resendingEmail.value = true; saveError.value = ''; feedback.value = ''
  try {
    await axios.post(`${API_BASE_URL}/api/auth/resend-verification`, { email: user.value.email })
    feedback.value = 'หากอีเมลยังรอยืนยัน ระบบส่งลิงก์ใหม่แล้ว กรุณาตรวจกล่องจดหมายและสแปม'
  } catch (error) {
    saveError.value = error.response?.data?.message || 'ส่งลิงก์ใหม่ไม่สำเร็จ กรุณาลองอีกครั้ง'
  } finally { resendingEmail.value = false }
}
const openPasswordForm = async () => {
  passwordError.value = ''; passwordSuccess.value = ''; changingPassword.value = true
  await nextTick(); currentPasswordInput.value?.focus()
}
const cancelPasswordForm = () => {
  if (passwordSaving.value) return
  passwordDraft.value = { current: '', next: '', confirm: '' }
  passwordError.value = ''; changingPassword.value = false
}
const changePassword = async () => {
  if (passwordSaving.value) return
  passwordError.value = ''
  const { current, next, confirm } = passwordDraft.value
  if (next !== confirm) { passwordError.value = 'รหัสผ่านใหม่กับช่องยืนยันไม่ตรงกัน'; return }
  if (next === current) { passwordError.value = 'รหัสผ่านใหม่ต้องต่างจากรหัสผ่านปัจจุบัน'; return }
  passwordSaving.value = true
  try {
    await axios.put(`${API_BASE_URL}/api/user/me/password`, { current_password: current, new_password: next }, { headers: headers() })
    passwordDraft.value = { current: '', next: '', confirm: '' }
    changingPassword.value = false
    passwordSuccess.value = 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว ใช้รหัสใหม่ในการเข้าสู่ระบบครั้งถัดไป'
  } catch (error) {
    passwordError.value = error.response?.data?.message || 'เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาลองอีกครั้ง'
  } finally { passwordSaving.value = false }
}
const onFileSelected = async (event) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file || uploading.value || saving.value) return
  photoError.value = ''; photoSuccess.value = ''
  if (!file.type.startsWith('image/')) { photoError.value = 'กรุณาเลือกไฟล์รูปภาพ'; return }
  if (file.size > 5 * 1024 * 1024) { photoError.value = 'รูปภาพต้องมีขนาดไม่เกิน 5 MB'; return }
  resetPreview(); previewImage.value = URL.createObjectURL(file); uploading.value = true
  const form = new FormData(); form.append('profileImage', file)
  try {
    const { data } = await axios.post(`${API_BASE_URL}/api/user/upload-profile`, form, { headers: headers() })
    if (!data.success || !data.imageUrl) throw new Error('Upload failed')
    user.value.profile_pic = data.imageUrl; persistSession(); photoSuccess.value = 'บันทึกรูปโปรไฟล์เรียบร้อยแล้ว'
  } catch (error) { photoError.value = error.response?.data?.message || 'อัปโหลดไม่สำเร็จ รูปเดิมยังอยู่ กรุณาลองอีกครั้ง' }
  finally { resetPreview(); uploading.value = false }
}
onMounted(loadProfile)
onUnmounted(resetPreview)
</script>

<style scoped>
.profile-panel { max-width: 1040px; padding: 36px 40px; background: #fff; border: 1px solid var(--pc-border, #dae3e9); border-radius: 16px; color: #183343; }
.profile-identity { display: flex; align-items: center; gap: 24px; }
.avatar { width: 104px; height: 104px; border-radius: 50%; overflow: hidden; flex: none; background: #e4f3f0; color: #0f766e; display: grid; place-items: center; font-size: 38px; font-weight: 700; }
.avatar img { width: 100%; height: 100%; object-fit: cover; }
.identity-copy { min-width: 0; flex: 1; }
.section-kicker { margin: 0 0 5px; color: #526a78; font-size: 13px; }
h2 { margin: 0; font-size: 26px; line-height: 1.4; overflow-wrap: anywhere; }
.username { margin: 3px 0 10px; color: #526a78; font-size: 14px; overflow-wrap: anywhere; }
button { font: inherit; cursor: pointer; min-height: 44px; border-radius: 8px; padding: 10px 18px; font-weight: 600; box-shadow: none; }
.secondary { border: 1px solid #cbd9e1; background: #fff; color: #244658; }
.secondary:hover { background: #f3f7f8; }
.primary { border: 1px solid #0f766e; background: #0f766e; color: #fff; }
.primary:hover { background: #095f59; }
.photo-button { display: inline-flex; align-items: center; gap: 7px; padding: 0; border: 0; background: transparent; color: #0f766e; min-height: 32px; }
.photo-button:hover { text-decoration: underline; }
button:disabled { opacity: .55; cursor: wait; }
button:focus-visible, input:focus-visible { outline: 3px solid #4caaa1; outline-offset: 3px; }
.hidden-input { display: none; }
.editing-note { color: #526a78; font-size: 13px; }
.photo-help { margin: 18px 0 24px; color: #526a78; font-size: 12px; line-height: 1.7; }
.detail-section { border-top: 1px solid #e1e8ed; padding: 26px 0 28px; }
h3 { margin: 0 0 20px; font-size: 17px; }
.contact-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
.field { min-width: 0; }
.field label { display: block; color: #526a78; font-size: 13px; margin-bottom: 8px; }
.field p { margin: 0; font-size: 16px; line-height: 1.65; overflow-wrap: anywhere; }
.field .email-pending { margin-top: 6px; color: #a43522; font-size: 13px; }
.resend-inline { min-height: 32px; padding: 0 4px; border: 0; background: transparent; color: #0f766e; text-decoration: underline; }
.field input { width: 100%; box-sizing: border-box; min-height: 46px; border: 1px solid #cbd9e1; background: #fff; border-radius: 8px; padding: 10px 12px; color: #183343; font: inherit; }
.profile-footer { border-top: 1px solid #e1e8ed; padding-top: 20px; }
.profile-footer > p { margin: 0; font-size: 13px; color: #526a78; line-height: 1.7; }
.password-section { border-top: 1px solid #e1e8ed; padding-top: 26px; margin-top: 26px; }
.password-heading { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.password-heading h3 { margin-bottom: 4px; }
.password-heading p { margin: 0; color: #526a78; font-size: 14px; line-height: 1.6; }
.password-form { margin-top: 24px; }
.password-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px 24px; }
.password-fields .field:first-child { grid-column: 1 / -1; }
.form-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; }
.message { padding: 12px 16px; margin: 12px 0; border-radius: 8px; font-size: 14px; line-height: 1.6; }
.success { background: #edf8f3; color: #176345; }
.error, .profile-footer > .error { background: #fff2ef; color: #a43522; }
@media (max-width: 600px) {
  .profile-panel { padding: 24px 20px; border-radius: 12px; }
  .profile-identity { flex-wrap: wrap; gap: 16px; }
  .avatar { width: 76px; height: 76px; font-size: 30px; }
  .identity-copy { flex: 1 1 calc(100% - 92px); }
  h2 { font-size: 21px; }
  .edit-button, .editing-note { margin-left: 92px; }
  .contact-grid { grid-template-columns: 1fr; gap: 24px; }
  .password-heading { align-items: stretch; flex-direction: column; }
  .password-heading button { align-self: flex-start; }
  .password-fields { grid-template-columns: 1fr; }
  .detail-section { padding: 24px 0; }
  .form-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .form-actions button { padding-inline: 8px; }
}
</style>
