const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const auth = require('./auth.middleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../../../uploads/pets');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'pet-' + req.user.user_id + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const imageFileFilter = (_req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith('image/')) {
    cb(null, true);
    return;
  }
  cb(new Error('Only image files are allowed'));
};

const upload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

const getUploadedPetImageUrl = (req) =>
  req.file ? `http://localhost:3000/uploads/pets/${req.file.filename}` : null;

const getOwnerIdByUserId = async (userId) => {
  const ownerResult = await pool.query(
    'SELECT owner_id FROM tb_owner WHERE user_id = $1',
    [userId]
  );

  return ownerResult.rows[0]?.owner_id || null;
};

router.get('/', auth, async (req, res) => {
  try {
    const ownerId = await getOwnerIdByUserId(req.user.user_id);
    if (!ownerId) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลเจ้าของสัตว์เลี้ยง' });
    }

    const pets = await pool.query(
      'SELECT * FROM tb_pet WHERE owner_id = $1 ORDER BY pet_id DESC',
      [ownerId]
    );

    res.json(pets.rows);
  } catch (err) {
    console.error('Error loading pets:', err);
    res.status(500).json({ message: 'ดึงข้อมูลสัตว์เลี้ยงไม่สำเร็จ' });
  }
});

router.post('/', auth, upload.single('petImage'), async (req, res) => {
  try {
    const ownerId = await getOwnerIdByUserId(req.user.user_id);
    if (!ownerId) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลเจ้าของสัตว์เลี้ยง' });
    }

    const {
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

    if (!pet_name || !pet_type || !pet_gender || !sterile_status) {
      return res.status(400).json({ message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบ' });
    }

    const petImage = getUploadedPetImageUrl(req) || pet_image || null;

    const petId = 'P' + Date.now();

    await pool.query(
      `
      INSERT INTO tb_pet (
        pet_id, owner_id, pet_name, pet_image, pet_type, pet_breed,
        pet_gender, sterile_status, pet_color, pet_birthdate, drug_allergy
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      `,
      [
        petId,
        ownerId,
        pet_name,
        petImage,
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
    console.error('Error creating pet:', err);
    res.status(500).json({ message: 'เพิ่มสัตว์เลี้ยงไม่สำเร็จ' });
  }
});

router.put('/:id', auth, upload.single('petImage'), async (req, res) => {
  try {
    const ownerId = await getOwnerIdByUserId(req.user.user_id);
    if (!ownerId) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลเจ้าของสัตว์เลี้ยง' });
    }

    const { id } = req.params;
    const {
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

    if (!pet_name || !pet_type || !pet_gender || !sterile_status) {
      return res.status(400).json({ message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบ' });
    }

    const petImage = getUploadedPetImageUrl(req) || pet_image || null;

    const result = await pool.query(
      `
      UPDATE tb_pet SET
        pet_name = $1,
        pet_image = $2,
        pet_type = $3,
        pet_breed = $4,
        pet_gender = $5,
        sterile_status = $6,
        pet_color = $7,
        pet_birthdate = $8,
        drug_allergy = $9
      WHERE pet_id = $10 AND owner_id = $11
      `,
      [
        pet_name,
        petImage,
        pet_type,
        pet_breed || null,
        pet_gender,
        sterile_status,
        pet_color || null,
        pet_birthdate || null,
        drug_allergy || null,
        id,
        ownerId
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'ไม่พบสัตว์เลี้ยงที่ต้องการแก้ไข' });
    }

    res.json({ message: 'แก้ไขข้อมูลสัตว์เลี้ยงสำเร็จ' });
  } catch (err) {
    console.error('Error updating pet:', err);
    res.status(500).json({ message: 'แก้ไขข้อมูลสัตว์เลี้ยงไม่สำเร็จ' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const ownerId = await getOwnerIdByUserId(req.user.user_id);
    if (!ownerId) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลเจ้าของสัตว์เลี้ยง' });
    }

    const result = await pool.query(
      'DELETE FROM tb_pet WHERE pet_id = $1 AND owner_id = $2',
      [req.params.id, ownerId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'ไม่พบสัตว์เลี้ยงที่ต้องการลบ' });
    }

    res.json({ message: 'ลบสัตว์เลี้ยงสำเร็จ' });
  } catch (err) {
    console.error('Error deleting pet:', err);
    res.status(500).json({ message: 'ลบสัตว์เลี้ยงไม่สำเร็จ' });
  }
});

module.exports = router;
