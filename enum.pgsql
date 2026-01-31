CREATE TYPE pet_gender_enum AS ENUM ('ผู้', 'เมีย');
CREATE TYPE user_role_enum AS ENUM ('user','admin');
CREATE TYPE sterile_status_enum AS ENUM ('ทำแล้ว', 'ยังไม่ทำ');
CREATE TYPE appt_status_enum AS ENUM ('รอ', 'ยืนยัน', 'ยกเลิก');
CREATE TYPE symptom_duration_enum AS ENUM ('1-3 วัน', '4-7 วัน', 'มากกว่า 7 วัน');
CREATE TYPE ref_type_enum AS ENUM ('รักษา', 'ผ่าตัด', 'วัคซีน');

-- int