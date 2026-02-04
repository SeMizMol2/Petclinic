const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const auth = require('./auth.middleware');


// ================= GET PETS =================
router.get('/', auth, async (req, res) => {
  try {

    const userId = req.user.user_id;

    // หา owner_id จาก user_id
    const ownerResult = await pool.query(
      'SELECT owner_id FROM tb_owner WHERE user_id = $1',
      [userId]
    );

    if (ownerResult.rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบ owner' });
    }

    const ownerId = ownerResult.rows[0].owner_id;

    // ดึงสัตว์เลี้ยง
    const pets = await pool.query(
      'SELECT * FROM tb_pet WHERE owner_id = $1 ORDER BY pet_id',
      [ownerId]
    );

    res.json(pets.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'ดึงข้อมูลไม่สำเร็จ' });
  }
});


// ================= ADD PET =================
router.post('/', auth, async (req, res) => {
  try {

    const userId = req.user.user_id;

    // หา owner
    const ownerResult = await pool.query(
      'SELECT owner_id FROM tb_owner WHERE user_id = $1',
      [userId]
    );

    if (ownerResult.rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบ owner' });
    }

    const ownerId = ownerResult.rows[0].owner_id;

    const {
      pet_name,
      pet_type,
      pet_breed,
      pet_gender,
      sterile_status,
      pet_color,
      pet_birthdate,
      drug_allergy
    } = req.body;

    await pool.query(
      `INSERT INTO tb_pet (
        pet_id, owner_id, pet_name, pet_type, pet_breed,
        pet_gender, sterile_status, pet_color,
        pet_birthdate, drug_allergy
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        'P' + Date.now(),
        ownerId,
        pet_name,
        pet_type,
        pet_breed || null,
        pet_gender,
        sterile_status,
        pet_color || null,
        pet_birthdate || null,
        drug_allergy || null
      ]
    );

    res.json({ message: 'เพิ่มสัตว์เลี้ยงสำเร็จ' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'เพิ่มไม่สำเร็จ' });
  }
});


// ================= UPDATE PET =================
router.put('/:id', auth, async (req, res) => {
  try {

    const { id } = req.params;

    await pool.query(
      `UPDATE tb_pet SET
        pet_name = $1,
        pet_type = $2,
        pet_breed = $3,
        pet_gender = $4,
        sterile_status = $5,
        pet_color = $6,
        pet_birthdate = $7,
        drug_allergy = $8
       WHERE pet_id = $9`,
      [
        req.body.pet_name,
        req.body.pet_type,
        req.body.pet_breed || null,
        req.body.pet_gender,
        req.body.sterile_status,
        req.body.pet_color || null,
        req.body.pet_birthdate || null,
        req.body.drug_allergy || null,
        id
      ]
    );

    res.json({ message: 'แก้ไขสำเร็จ' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'แก้ไขไม่สำเร็จ' });
  }
});


// ================= DELETE PET =================
router.delete('/:id', auth, async (req, res) => {
  try {

    await pool.query(
      'DELETE FROM tb_pet WHERE pet_id = $1',
      [req.params.id]
    );

    res.json({ message: 'ลบสำเร็จ' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'ลบไม่สำเร็จ' });
  }
});

module.exports = router;
