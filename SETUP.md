# Petclinic — คู่มือติดตั้งและสรุปสิ่งที่แก้ไข

## วิธีรันโปรเจค

### 1. สร้างฐานข้อมูล PostgreSQL
```bash
createdb petclinic   # หรือชื่ออื่นตามที่ตั้งใน backend/.env (DB_NAME)
psql -d petclinic -f database/enum.pgsql
psql -d petclinic -f database/table.pgsql
```
> ⚠️ ถ้าคุณเคยสร้างตารางจาก `table.pgsql` เวอร์ชันเก่าไว้แล้ว ให้ `DROP TABLE` ทั้งหมดก่อนรันใหม่
> (โครงสร้างตารางมีการแก้ไข เพิ่มคอลัมน์ `owner_address`, `profile_pic` ในตาราง `tb_owner`)

### 2. ตั้งค่า Backend
ไฟล์ `backend/.env` มีค่าคัดลอกมาจากของเดิมให้แล้ว ตรวจสอบให้ตรงกับเครื่องคุณ:
```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=<รหัสผ่าน postgres ของคุณ>
DB_NAME=<ชื่อฐานข้อมูลที่สร้างไว้>
JWT_SECRET=petclinic_secret_key
```

รันเซิร์ฟเวอร์ (ถ้ายังไม่มี `node_modules` ให้ `npm install` ก่อน):
```bash
cd backend
npm install      # ข้ามได้ถ้ามี node_modules มาแล้ว
npm run dev
```
เซิร์ฟเวอร์จะรันที่ `http://localhost:3000`

### 3. ตั้งค่า Frontend
```bash
cd frondend
npm install      # ข้ามได้ถ้ามี node_modules มาแล้ว
npm run dev
```
เว็บจะรันที่ `http://localhost:5173` (ตามที่ Vite แจ้ง)

### Login แอดมิน (ฝังไว้ในโค้ด ไม่ได้เก็บใน DB)
- username: `admin`
- password: `admin1234`

---

## สรุปสิ่งที่แก้ไขในรอบนี้

### 🔴 บั๊กที่บล็อกการใช้งาน (แก้แล้ว)
1. **`database/table.pgsql`** — comma หายหน้า `CONSTRAINT fk_receipt_treatment` ทำให้ SQL รันไม่ผ่านทั้งไฟล์ + จัดลำดับตารางใหม่ให้ `tb_receipt` มาหลัง `tb_treatment` (เพราะอ้าง FK กัน) + เพิ่มคอลัมน์ `owner_address`, `profile_pic` ในตาราง `tb_owner` ที่ backend เรียกใช้จริงแต่ไม่มีในสคีมา
2. **`owner.routes.js`, `treatments.routes.js`** — แก้ `req.user.id` เป็น `req.user.user_id` ให้ตรงกับ JWT payload จริง (ของเดิมจะได้ `undefined` แล้ว query DB พัง)
3. **`history.routes.js`** — เดิมอ้าง `tb_history` ที่ไม่มีอยู่จริงในสคีมา → เปลี่ยนไปดึงจาก `tb_treatment` + `tb_treatment_detail` จริง พร้อมรายละเอียดบริการที่ใช้แต่ละครั้ง

### 🟠 ช่องโหว่ความปลอดภัย (แก้แล้ว)
4. **`receipt.routes.js`** — เดิมไม่มี auth middleware เลย ใครก็เดา `user_id` ดูใบเสร็จคนอื่นได้ → เพิ่ม auth + เช็คว่าต้องเป็นเจ้าของ user_id นั้นเองหรือ admin เท่านั้น

### 🟡 ฟีเจอร์ที่ยังไม่สมบูรณ์ (เติมให้ครบแล้ว)
5. **ระบบใบเสร็จ/รับเงิน** — เดิมมีแค่ดูอย่างเดียว เพิ่ม:
   - `POST /api/receipts` สร้างใบเสร็จจากการรักษา (admin)
   - `PUT /api/receipts/:id/status` อัปเดตสถานะจ่ายเงิน (admin)
   - `POST /api/receipts/:id/proof` อัปโหลดหลักฐานการโอน (user)
   - แก้หน้า `Receipts.vue` ที่เช็คสถานะผิด (`'Paid'` ที่ไม่มีในระบบจริง ต้องเป็น `'ชำระเสร็จสิ้น'`) + เพิ่ม UI อัปโหลดหลักฐาน
6. **ระบบรายจ่าย/หมวดหมู่คลินิก** — เดิมมีตารางใน DB และ Dashboard ดึงไปคำนวณ แต่ไม่มีทางกรอกข้อมูลเข้าเลย เพิ่ม:
   - Backend: `backend/src/routes/expense.routes.js` (CRUD รายจ่าย + หมวดหมู่)
   - Frontend: `frondend/src/pages/admin/Expenses.vue` + เมนูในแถบ Admin
7. **หน้าประวัติการรักษาฝั่ง User** — เดิมใน `Pets.vue` โชว์ **mock data ล้วนๆ** (มีคอมเมนต์ในโค้ดเดิมยืนยันว่ายังไม่เสร็จ) เปลี่ยนให้ดึงจาก API จริง + เพิ่มหน้า `frondend/src/pages/user/History.vue` สำหรับดูประวัติแบบเต็มของสัตว์เลี้ยงแต่ละตัว

### 🧹 อื่นๆ
8. ลบ `import { comma } from 'postcss/lib/list'` ที่หลงเหลือใน `router/index.js` (ร่องรอยจากการแก้บั๊กแบบรีบๆ ไม่ได้ใช้งานจริง)

---

## สิ่งที่ยังแนะนำให้ทำต่อ (ไม่ได้แก้ในรอบนี้ เพราะต้องตัดสินใจเชิง business logic)
- ยังไม่มี route ให้ **admin จัดการสัตว์เลี้ยงโดยตรง** (ตอนนี้ทำได้แค่ดู dropdown)
- Login admin ยัง hardcode ใน code ไม่ได้เก็บในตาราง `tb_user` — ควรย้ายไปเก็บใน DB จริงเพื่อความปลอดภัยระยะยาวและรองรับแอดมินหลายคน
- ยังไม่มีการ validate ขนาด/ประเภทไฟล์ตอนอัปโหลดรูปโปรไฟล์และหลักฐานการโอน (ควรจำกัดชนิดไฟล์เป็นรูปภาพเท่านั้นและจำกัดขนาดไม่ให้ใหญ่เกินไป)
