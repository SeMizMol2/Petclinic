const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const auth = require('./auth.middleware');
const bcrypt = require('bcryptjs');

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const requireAdmin = (req, res) => {
  if (req.user.role !== 'admin') {
    res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึง' });
    return false;
  }
  return true;
};

const makeId = (prefix, maxLength = 20) => {
  const id = prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  return id.slice(0, maxLength);
};

router.get('/dashboard', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึง' });
    }

    const userCount = await pool.query(
      "SELECT COUNT(*) FROM tb_user WHERE user_role = 'user'"
    );

    const petCount = await pool.query(
      'SELECT COUNT(*) FROM tb_pet'
    );

    const recentUsers = await pool.query(
      `SELECT u.user_id, u.username, u.user_role, o.owner_name, o.owner_tel,
              (SELECT COUNT(*) FROM tb_pet p WHERE p.owner_id = o.owner_id) AS pet_count
       FROM tb_user u
       LEFT JOIN tb_owner o ON u.user_id = o.user_id
       WHERE u.user_role = 'user'
       ORDER BY u.user_id DESC
       LIMIT 5`
    );

    res.json({
      totalUsers: userCount.rows[0].count,
      totalPets: petCount.rows[0].count,
      recentUsers: recentUsers.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์' });
  }
});

router.get('/users', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึง' });
    }

    const users = await pool.query(
      `SELECT u.user_id, u.username, u.user_role,
              o.owner_name, COALESCE(o.owner_email, u.email) AS owner_email, o.owner_tel,
              (SELECT COUNT(*) FROM tb_pet p WHERE p.owner_id = o.owner_id) AS pet_count
       FROM tb_user u
       LEFT JOIN tb_owner o ON u.user_id = o.user_id
       WHERE u.user_role = 'user'
       ORDER BY u.user_id DESC`
    );

    res.json(users.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์' });
  }
});

router.post('/users', auth, async (req, res) => {
  try {
    const { owner_name, email, tel } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (normalizedEmail && !emailPattern.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์ทำรายการ' });
    }

    const time = Date.now();
    const userId = 'U' + time;
    const ownerId = 'O' + time;
    const mockUsername = `guest_${time}`;
    const mockPassword = await bcrypt.hash('123456', 10);

    await pool.query(
      `INSERT INTO tb_user (user_id, username, email, password, user_role)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, mockUsername, normalizedEmail || null, mockPassword, 'user']
    );

    await pool.query(
      `INSERT INTO tb_owner (owner_id, user_id, owner_name, owner_email, owner_tel)
       VALUES ($1, $2, $3, $4, $5)`,
      [ownerId, userId, owner_name, normalizedEmail || null, tel]
    );

    res.json({ message: 'เพิ่มสมาชิกสำเร็จ', username: mockUsername });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(400).json({ message: 'Email already exists' });
    }
    res.status(500).json({ message: 'เพิ่มสมาชิกไม่สำเร็จ' });
  }
});

router.delete('/users/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์ทำรายการ' });
    }

    await pool.query('DELETE FROM tb_user WHERE user_id = $1', [id]);

    res.json({ message: 'ลบผู้ใช้งานสำเร็จ' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'ลบไม่สำเร็จ (อาจมีข้อมูลสัตว์เลี้ยงค้างอยู่)' });
  }
});

router.put('/users/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, owner_name, email, tel } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (normalizedEmail && !emailPattern.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์ทำรายการ' });
    }

    if (username) {
      await pool.query(
        'UPDATE tb_user SET username = $1, email = $2 WHERE user_id = $3',
        [username, normalizedEmail || null, id]
      );
    } else {
      await pool.query('UPDATE tb_user SET email = $1 WHERE user_id = $2', [normalizedEmail || null, id]);
    }

    await pool.query(
      'UPDATE tb_owner SET owner_name = $1, owner_email = $2, owner_tel = $3 WHERE user_id = $4',
      [owner_name, normalizedEmail || null, tel, id]
    );

    res.json({ message: 'แก้ไขข้อมูลสำเร็จ' });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(400).json({ message: 'Email already exists' });
    }
    res.status(500).json({ message: 'แก้ไขไม่สำเร็จ' });
  }
});

router.get('/owners', auth, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const result = await pool.query(`
      SELECT
        o.owner_id,
        o.user_id,
        o.owner_name,
        COALESCE(o.owner_email, u.email) AS owner_email,
        o.owner_tel,
        u.username,
        COALESCE(COUNT(p.pet_id), 0) AS pet_count
      FROM tb_owner o
      LEFT JOIN tb_user u ON o.user_id = u.user_id
      LEFT JOIN tb_pet p ON o.owner_id = p.owner_id
      GROUP BY o.owner_id, u.username, u.email
      ORDER BY o.owner_id DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'โหลดข้อมูลเจ้าของสัตว์ไม่สำเร็จ' });
  }
});

router.post('/owners', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    if (!requireAdmin(req, res)) return;

    const { owner_name, owner_email, owner_tel, username, password } = req.body;
    const normalizedOwnerEmail = normalizeEmail(owner_email);

    if (normalizedOwnerEmail && !emailPattern.test(normalizedOwnerEmail)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    if (!owner_name) {
      return res.status(400).json({ message: 'กรุณากรอกชื่อเจ้าของสัตว์' });
    }

    const userId = makeId('U', 10);
    const ownerId = makeId('O', 20);
    const loginName = username || `guest_${userId.toLowerCase()}`;
    const rawPassword = password || '123456';
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    await client.query('BEGIN');
    await client.query(
      `INSERT INTO tb_user (user_id, username, email, password, user_role)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, loginName, normalizedOwnerEmail || null, hashedPassword, 'user']
    );
    await client.query(
      `INSERT INTO tb_owner (owner_id, user_id, owner_name, owner_email, owner_tel)
       VALUES ($1, $2, $3, $4, $5)`,
      [ownerId, userId, owner_name, normalizedOwnerEmail || null, owner_tel || null]
    );
    await client.query('COMMIT');

    res.status(201).json({
      message: 'เพิ่มเจ้าของสัตว์สำเร็จ',
      owner_id: ownerId,
      username: loginName,
      default_password: rawPassword
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    if (err.code === '23505') {
      return res.status(400).json({ message: 'Email already exists' });
    }
    res.status(500).json({ message: 'เพิ่มเจ้าของสัตว์ไม่สำเร็จ' });
  } finally {
    client.release();
  }
});

router.put('/owners/:id', auth, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const { id } = req.params;
    const { owner_name, owner_email, owner_tel, username } = req.body;
    const normalizedOwnerEmail = normalizeEmail(owner_email);

    if (normalizedOwnerEmail && !emailPattern.test(normalizedOwnerEmail)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    if (!owner_name) {
      return res.status(400).json({ message: 'กรุณากรอกชื่อเจ้าของสัตว์' });
    }

    const result = await pool.query(
      `UPDATE tb_owner
       SET owner_name = $1,
           owner_email = $2,
           owner_tel = $3
       WHERE owner_id = $4
       RETURNING user_id`,
      [owner_name, normalizedOwnerEmail || null, owner_tel || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบเจ้าของสัตว์' });
    }

    if (username && result.rows[0].user_id) {
      await pool.query(
        'UPDATE tb_user SET username = $1, email = $2 WHERE user_id = $3',
        [username, normalizedOwnerEmail || null, result.rows[0].user_id]
      );
    } else if (result.rows[0].user_id) {
      await pool.query('UPDATE tb_user SET email = $1 WHERE user_id = $2', [normalizedOwnerEmail || null, result.rows[0].user_id]);
    }

    res.json({ message: 'แก้ไขเจ้าของสัตว์สำเร็จ' });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(400).json({ message: 'Email already exists' });
    }
    res.status(500).json({ message: 'แก้ไขเจ้าของสัตว์ไม่สำเร็จ' });
  }
});

router.delete('/owners/:id', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    if (!requireAdmin(req, res)) return;

    const { id } = req.params;
    await client.query('BEGIN');

    const owner = await client.query('SELECT user_id FROM tb_owner WHERE owner_id = $1', [id]);
    if (owner.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'ไม่พบเจ้าของสัตว์' });
    }

    if (owner.rows[0].user_id) {
      await client.query('DELETE FROM tb_user WHERE user_id = $1', [owner.rows[0].user_id]);
    } else {
      await client.query('DELETE FROM tb_owner WHERE owner_id = $1', [id]);
    }

    await client.query('COMMIT');
    res.json({ message: 'ลบเจ้าของสัตว์สำเร็จ' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'ลบเจ้าของสัตว์ไม่สำเร็จ' });
  } finally {
    client.release();
  }
});

router.get('/pets', auth, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const result = await pool.query(`
      SELECT
        p.*,
        o.owner_name,
        o.owner_tel
      FROM tb_pet p
      LEFT JOIN tb_owner o ON p.owner_id = o.owner_id
      ORDER BY p.pet_id DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'โหลดข้อมูลสัตว์เลี้ยงไม่สำเร็จ' });
  }
});

router.post('/pets', auth, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const {
      owner_id,
      pet_name,
      pet_type,
      pet_breed,
      pet_gender,
      sterile_status,
      pet_color,
      pet_birthdate,
      drug_allergy,
      pet_image
    } = req.body;

    if (!owner_id || !pet_name || !pet_type || !pet_gender || !sterile_status) {
      return res.status(400).json({ message: 'กรุณากรอกข้อมูลสัตว์เลี้ยงให้ครบ' });
    }

    const petId = makeId('P', 20);
    await pool.query(
      `INSERT INTO tb_pet (
        pet_id, owner_id, pet_name, pet_image, pet_type, pet_breed,
        pet_gender, sterile_status, pet_color, pet_birthdate, drug_allergy
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        petId,
        owner_id,
        pet_name,
        pet_image || null,
        pet_type,
        pet_breed || null,
        pet_gender,
        sterile_status,
        pet_color || null,
        pet_birthdate || null,
        drug_allergy || null
      ]
    );

    res.status(201).json({ message: 'เพิ่มสัตว์เลี้ยงสำเร็จ', pet_id: petId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'เพิ่มสัตว์เลี้ยงไม่สำเร็จ' });
  }
});

router.put('/pets/:id', auth, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const { id } = req.params;
    const {
      owner_id,
      pet_name,
      pet_type,
      pet_breed,
      pet_gender,
      sterile_status,
      pet_color,
      pet_birthdate,
      drug_allergy,
      pet_image
    } = req.body;

    if (!owner_id || !pet_name || !pet_type || !pet_gender || !sterile_status) {
      return res.status(400).json({ message: 'กรุณากรอกข้อมูลสัตว์เลี้ยงให้ครบ' });
    }

    const result = await pool.query(
      `UPDATE tb_pet SET
        owner_id = $1,
        pet_name = $2,
        pet_image = $3,
        pet_type = $4,
        pet_breed = $5,
        pet_gender = $6,
        sterile_status = $7,
        pet_color = $8,
        pet_birthdate = $9,
        drug_allergy = $10
       WHERE pet_id = $11`,
      [
        owner_id,
        pet_name,
        pet_image || null,
        pet_type,
        pet_breed || null,
        pet_gender,
        sterile_status,
        pet_color || null,
        pet_birthdate || null,
        drug_allergy || null,
        id
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'ไม่พบสัตว์เลี้ยง' });
    }

    res.json({ message: 'แก้ไขสัตว์เลี้ยงสำเร็จ' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'แก้ไขสัตว์เลี้ยงไม่สำเร็จ' });
  }
});

router.delete('/pets/:id', auth, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const result = await pool.query('DELETE FROM tb_pet WHERE pet_id = $1', [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'ไม่พบสัตว์เลี้ยง' });
    }

    res.json({ message: 'ลบสัตว์เลี้ยงสำเร็จ' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'ลบสัตว์เลี้ยงไม่สำเร็จ' });
  }
});

router.get('/clinic', auth, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const result = await pool.query(`
      SELECT clinic_id, clinic_name, address, tel, open_hours
      FROM tb_clinic
      ORDER BY clinic_id ASC
      LIMIT 1
    `);

    res.json(result.rows[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'โหลดข้อมูลคลินิกไม่สำเร็จ' });
  }
});

router.put('/clinic', auth, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const {
      clinic_id = '01',
      clinic_name,
      address,
      tel,
      open_hours
    } = req.body;

    if (!clinic_name) {
      return res.status(400).json({ message: 'กรุณากรอกชื่อคลินิก' });
    }

    await pool.query(
      `INSERT INTO tb_clinic (clinic_id, clinic_name, address, tel, open_hours, update_datetime)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (clinic_id)
       DO UPDATE SET
         clinic_name = EXCLUDED.clinic_name,
         address = EXCLUDED.address,
         tel = EXCLUDED.tel,
         open_hours = EXCLUDED.open_hours,
         update_datetime = NOW()`,
      [clinic_id, clinic_name, address || null, tel || null, open_hours || null]
    );

    res.json({ message: 'บันทึกข้อมูลคลินิกสำเร็จ' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'บันทึกข้อมูลคลินิกไม่สำเร็จ' });
  }
});

router.get('/veterinarians', auth, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const result = await pool.query(`
      SELECT
        v.vet_id,
        v.vet_name,
        v.license_no,
        v.vet_tel,
        v.user_id,
        u.username
      FROM tb_veterinarian v
      LEFT JOIN tb_user u ON v.user_id = u.user_id
      ORDER BY v.vet_id DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'โหลดข้อมูลสัตวแพทย์ไม่สำเร็จ' });
  }
});

router.post('/veterinarians', auth, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const { vet_name, license_no, vet_tel, user_id } = req.body;

    if (!vet_name) {
      return res.status(400).json({ message: 'กรุณากรอกชื่อสัตวแพทย์' });
    }

    const vetId = makeId('V', 10);
    await pool.query(
      `INSERT INTO tb_veterinarian (vet_id, vet_name, license_no, vet_tel, user_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [vetId, vet_name, license_no || null, vet_tel || null, user_id || null]
    );

    res.status(201).json({ message: 'เพิ่มข้อมูลสัตวแพทย์สำเร็จ', vet_id: vetId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'เพิ่มข้อมูลสัตวแพทย์ไม่สำเร็จ' });
  }
});

router.put('/veterinarians/:id', auth, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const { id } = req.params;
    const { vet_name, license_no, vet_tel, user_id } = req.body;

    if (!vet_name) {
      return res.status(400).json({ message: 'กรุณากรอกชื่อสัตวแพทย์' });
    }

    const result = await pool.query(
      `UPDATE tb_veterinarian
       SET vet_name = $1,
           license_no = $2,
           vet_tel = $3,
           user_id = $4,
           update_datetime = NOW()
       WHERE vet_id = $5`,
      [vet_name, license_no || null, vet_tel || null, user_id || null, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลสัตวแพทย์' });
    }

    res.json({ message: 'แก้ไขข้อมูลสัตวแพทย์สำเร็จ' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'แก้ไขข้อมูลสัตวแพทย์ไม่สำเร็จ' });
  }
});

router.delete('/veterinarians/:id', auth, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const result = await pool.query('DELETE FROM tb_veterinarian WHERE vet_id = $1', [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลสัตวแพทย์' });
    }

    res.json({ message: 'ลบข้อมูลสัตวแพทย์สำเร็จ' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'ลบข้อมูลสัตวแพทย์ไม่สำเร็จ' });
  }
});

router.get('/surgeries', auth, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const result = await pool.query(`
      SELECT
        s.surg_id,
        s.surg_type,
        s.anesthesia,
        s.result,
        s.service_id,
        svc.service_name,
        s.pet_id,
        p.pet_name,
        s.vet_id,
        v.vet_name,
        s.create_datetime,
        s.update_datetime
      FROM tb_surgery s
      LEFT JOIN tb_service svc ON s.service_id = svc.service_id
      LEFT JOIN tb_pet p ON s.pet_id = p.pet_id
      LEFT JOIN tb_veterinarian v ON s.vet_id = v.vet_id
      ORDER BY s.create_datetime DESC NULLS LAST, s.surg_id DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'โหลดข้อมูลผ่าตัดไม่สำเร็จ' });
  }
});

router.post('/surgeries', auth, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const { surg_type, anesthesia, result: surg_result, service_id, pet_id, vet_id } = req.body;
    if (!surg_type || !pet_id) {
      return res.status(400).json({ message: 'กรุณากรอกประเภทการผ่าตัดและเลือกสัตว์เลี้ยง' });
    }

    const surgId = makeId('SG', 15);
    await pool.query(
      `INSERT INTO tb_surgery (surg_id, surg_type, anesthesia, result, service_id, pet_id, vet_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [surgId, surg_type, anesthesia || null, surg_result || null, service_id || null, pet_id, vet_id || null]
    );

    res.status(201).json({ message: 'เพิ่มข้อมูลผ่าตัดสำเร็จ', surg_id: surgId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'เพิ่มข้อมูลผ่าตัดไม่สำเร็จ' });
  }
});

router.put('/surgeries/:id', auth, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const { id } = req.params;
    const { surg_type, anesthesia, result: surg_result, service_id, pet_id, vet_id } = req.body;
    if (!surg_type || !pet_id) {
      return res.status(400).json({ message: 'กรุณากรอกประเภทการผ่าตัดและเลือกสัตว์เลี้ยง' });
    }

    const result = await pool.query(
      `UPDATE tb_surgery
       SET surg_type = $1,
           anesthesia = $2,
           result = $3,
           service_id = $4,
           pet_id = $5,
           vet_id = $6,
           update_datetime = NOW()
       WHERE surg_id = $7`,
      [surg_type, anesthesia || null, surg_result || null, service_id || null, pet_id, vet_id || null, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลผ่าตัด' });
    }

    res.json({ message: 'แก้ไขข้อมูลผ่าตัดสำเร็จ' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'แก้ไขข้อมูลผ่าตัดไม่สำเร็จ' });
  }
});

router.delete('/surgeries/:id', auth, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const result = await pool.query('DELETE FROM tb_surgery WHERE surg_id = $1', [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลผ่าตัด' });
    }

    res.json({ message: 'ลบข้อมูลผ่าตัดสำเร็จ' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'ลบข้อมูลผ่าตัดไม่สำเร็จ' });
  }
});

router.get('/vaccines', auth, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const result = await pool.query(`
      SELECT
        v.vac_rec_id,
        v.vaccine_name,
        v.lot_number,
        v.vac_date,
        v.service_id,
        svc.service_name,
        v.pet_id,
        p.pet_name,
        v.vet_id,
        vet.vet_name,
        v.create_datetime,
        v.update_datetime
      FROM tb_vaccine_rec v
      LEFT JOIN tb_service svc ON v.service_id = svc.service_id
      LEFT JOIN tb_pet p ON v.pet_id = p.pet_id
      LEFT JOIN tb_veterinarian vet ON v.vet_id = vet.vet_id
      ORDER BY v.vac_date DESC NULLS LAST, v.vac_rec_id DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'โหลดข้อมูลวัคซีนไม่สำเร็จ' });
  }
});

router.post('/vaccines', auth, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const { vaccine_name, lot_number, vac_date, service_id, pet_id, vet_id } = req.body;
    if (!vaccine_name || !vac_date || !pet_id) {
      return res.status(400).json({ message: 'กรุณากรอกชื่อวัคซีน วันที่ฉีด และเลือกสัตว์เลี้ยง' });
    }

    const vacRecId = makeId('VC', 15);
    await pool.query(
      `INSERT INTO tb_vaccine_rec (vac_rec_id, vaccine_name, lot_number, vac_date, service_id, pet_id, vet_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [vacRecId, vaccine_name, lot_number || null, vac_date, service_id || null, pet_id, vet_id || null]
    );

    res.status(201).json({ message: 'เพิ่มข้อมูลวัคซีนสำเร็จ', vac_rec_id: vacRecId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'เพิ่มข้อมูลวัคซีนไม่สำเร็จ' });
  }
});

router.put('/vaccines/:id', auth, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const { id } = req.params;
    const { vaccine_name, lot_number, vac_date, service_id, pet_id, vet_id } = req.body;
    if (!vaccine_name || !vac_date || !pet_id) {
      return res.status(400).json({ message: 'กรุณากรอกชื่อวัคซีน วันที่ฉีด และเลือกสัตว์เลี้ยง' });
    }

    const result = await pool.query(
      `UPDATE tb_vaccine_rec
       SET vaccine_name = $1,
           lot_number = $2,
           vac_date = $3,
           service_id = $4,
           pet_id = $5,
           vet_id = $6,
           update_datetime = NOW()
       WHERE vac_rec_id = $7`,
      [vaccine_name, lot_number || null, vac_date, service_id || null, pet_id, vet_id || null, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลวัคซีน' });
    }

    res.json({ message: 'แก้ไขข้อมูลวัคซีนสำเร็จ' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'แก้ไขข้อมูลวัคซีนไม่สำเร็จ' });
  }
});

router.delete('/vaccines/:id', auth, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const result = await pool.query('DELETE FROM tb_vaccine_rec WHERE vac_rec_id = $1', [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลวัคซีน' });
    }

    res.json({ message: 'ลบข้อมูลวัคซีนสำเร็จ' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'ลบข้อมูลวัคซีนไม่สำเร็จ' });
  }
});

module.exports = router;
