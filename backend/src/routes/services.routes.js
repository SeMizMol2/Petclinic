const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const auth = require('./auth.middleware');

const ensureAdmin = (req, res) => {
    if (req.user.role !== 'admin') {
        res.status(403).json({ message: 'ไม่มีสิทธิ์ทำรายการนี้' });
        return false;
    }
    return true;
};

const PET_TYPE_VALUES = new Map([
    ['all', '\u0e17\u0e31\u0e49\u0e07\u0e2b\u0e21\u0e14'],
    ['\u0e17\u0e31\u0e49\u0e07\u0e2b\u0e21\u0e14', '\u0e17\u0e31\u0e49\u0e07\u0e2b\u0e21\u0e14'],
    ['\u0e17\u0e38\u0e01\u0e1b\u0e23\u0e30\u0e40\u0e20\u0e17', '\u0e17\u0e31\u0e49\u0e07\u0e2b\u0e21\u0e14'],
    ['dog', '\u0e2a\u0e38\u0e19\u0e31\u0e02'],
    ['\u0e2b\u0e21\u0e32', '\u0e2a\u0e38\u0e19\u0e31\u0e02'],
    ['\u0e2a\u0e38\u0e19\u0e31\u0e02', '\u0e2a\u0e38\u0e19\u0e31\u0e02'],
    ['cat', '\u0e41\u0e21\u0e27'],
    ['\u0e41\u0e21\u0e27', '\u0e41\u0e21\u0e27']
]);

const PET_GENDER_VALUES = new Map([
    ['all', '\u0e17\u0e31\u0e49\u0e07\u0e2b\u0e21\u0e14'],
    ['\u0e17\u0e31\u0e49\u0e07\u0e2b\u0e21\u0e14', '\u0e17\u0e31\u0e49\u0e07\u0e2b\u0e21\u0e14'],
    ['\u0e17\u0e38\u0e01\u0e40\u0e1e\u0e28', '\u0e17\u0e31\u0e49\u0e07\u0e2b\u0e21\u0e14'],
    ['male', '\u0e1c\u0e39\u0e49'],
    ['\u0e1c\u0e39\u0e49', '\u0e1c\u0e39\u0e49'],
    ['\u0e40\u0e1e\u0e28\u0e1c\u0e39\u0e49', '\u0e1c\u0e39\u0e49'],
    ['female', '\u0e40\u0e21\u0e35\u0e22'],
    ['\u0e40\u0e21\u0e35\u0e22', '\u0e40\u0e21\u0e35\u0e22'],
    ['\u0e40\u0e1e\u0e28\u0e40\u0e21\u0e35\u0e22', '\u0e40\u0e21\u0e35\u0e22']
]);

const normalizeApplicability = (typeValue, genderValue) => {
    const type = PET_TYPE_VALUES.get(String(typeValue || 'all').trim().toLowerCase());
    const gender = PET_GENDER_VALUES.get(String(genderValue || 'all').trim().toLowerCase());

    if (!type || !gender) return null;
    return { type, gender };
};

router.get('/public', async (req, res) => {
    try {
        const services = await pool.query(
            `
            SELECT service_id, service_name, service_desc, service_price, service_image
            FROM tb_service
            ORDER BY service_id ASC
            `
        );
        res.json(services.rows);
    } catch (err) {
        console.error('Error Get Public Services:', err);
        res.status(500).json({
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลบริการ'
        });
    }
});

router.get('/', auth, async (req, res) => {
    try {
        if (!ensureAdmin(req, res)) return;

        const services = await pool.query(
            'SELECT * FROM tb_service ORDER BY service_id ASC'
        );
        res.json(services.rows);
    } catch (err) {
        console.error('Error Get Services:', err);
        res.status(500).json({
            message: '\u0e40\u0e01\u0e34\u0e14\u0e02\u0e49\u0e2d\u0e1c\u0e34\u0e14\u0e1e\u0e25\u0e32\u0e14\u0e43\u0e19\u0e01\u0e32\u0e23\u0e14\u0e36\u0e07\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e1a\u0e23\u0e34\u0e01\u0e32\u0e23'
        });
    }
});

router.post('/', auth, async (req, res) => {
    try {
        if (!ensureAdmin(req, res)) return;

        const {
            service_name,
            service_desc,
            service_price,
            service_image,
            applicable_pet_type,
            applicable_pet_gender
        } = req.body;
        const applicability = normalizeApplicability(applicable_pet_type, applicable_pet_gender);
        const normalizedName = String(service_name || '').trim();
        const normalizedPrice = Number(service_price);

        if (!normalizedName || !Number.isFinite(normalizedPrice) || normalizedPrice < 0) {
            return res.status(400).json({
                message: 'กรุณาระบุชื่อบริการและราคาที่ไม่ติดลบให้ถูกต้อง'
            });
        }

        if (!applicability) {
            return res.status(400).json({
                message: '\u0e01\u0e23\u0e38\u0e13\u0e32\u0e23\u0e30\u0e1a\u0e38\u0e1b\u0e23\u0e30\u0e40\u0e20\u0e17\u0e2a\u0e31\u0e15\u0e27\u0e4c\u0e41\u0e25\u0e30\u0e40\u0e1e\u0e28\u0e17\u0e35\u0e48\u0e43\u0e0a\u0e49\u0e1a\u0e23\u0e34\u0e01\u0e32\u0e23\u0e44\u0e14\u0e49\u0e43\u0e2b\u0e49\u0e16\u0e39\u0e01\u0e15\u0e49\u0e2d\u0e07'
            });
        }

        const lastService = await pool.query(
            'SELECT service_id FROM tb_service ORDER BY service_id DESC LIMIT 1'
        );

        let newId = 'SV001';
        if (lastService.rows.length > 0) {
            const lastId = lastService.rows[0].service_id;
            const num = Number.parseInt(lastId.substring(2), 10) + 1;
            newId = `SV${String(num).padStart(3, '0')}`;
        }

        await pool.query(
            `
            INSERT INTO tb_service (
                service_id,
                service_name,
                service_desc,
                service_price,
                service_image,
                applicable_pet_type,
                applicable_pet_gender
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            `,
            [
                newId,
                normalizedName,
                String(service_desc || '').trim() || null,
                normalizedPrice,
                service_image || null,
                applicability.type,
                applicability.gender
            ]
        );

        res.status(201).json({
            message: '\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e1a\u0e23\u0e34\u0e01\u0e32\u0e23\u0e43\u0e2b\u0e21\u0e48\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08',
            service_id: newId
        });
    } catch (err) {
        console.error('Error Create Service:', err);
        res.status(500).json({
            message: '\u0e40\u0e01\u0e34\u0e14\u0e02\u0e49\u0e2d\u0e1c\u0e34\u0e14\u0e1e\u0e25\u0e32\u0e14\u0e43\u0e19\u0e01\u0e32\u0e23\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e1a\u0e23\u0e34\u0e01\u0e32\u0e23'
        });
    }
});

router.put('/:id', auth, async (req, res) => {
    try {
        if (!ensureAdmin(req, res)) return;

        const { id } = req.params;
        const {
            service_name,
            service_desc,
            service_price,
            service_image,
            applicable_pet_type,
            applicable_pet_gender
        } = req.body;
        const applicability = normalizeApplicability(applicable_pet_type, applicable_pet_gender);
        const normalizedName = String(service_name || '').trim();
        const normalizedPrice = Number(service_price);

        if (!normalizedName || !Number.isFinite(normalizedPrice) || normalizedPrice < 0) {
            return res.status(400).json({
                message: 'กรุณาระบุชื่อบริการและราคาที่ไม่ติดลบให้ถูกต้อง'
            });
        }

        if (!applicability) {
            return res.status(400).json({
                message: '\u0e01\u0e23\u0e38\u0e13\u0e32\u0e23\u0e30\u0e1a\u0e38\u0e1b\u0e23\u0e30\u0e40\u0e20\u0e17\u0e2a\u0e31\u0e15\u0e27\u0e4c\u0e41\u0e25\u0e30\u0e40\u0e1e\u0e28\u0e17\u0e35\u0e48\u0e43\u0e0a\u0e49\u0e1a\u0e23\u0e34\u0e01\u0e32\u0e23\u0e44\u0e14\u0e49\u0e43\u0e2b\u0e49\u0e16\u0e39\u0e01\u0e15\u0e49\u0e2d\u0e07'
            });
        }

        const result = await pool.query(
            `
            UPDATE tb_service
            SET service_name = $1,
                service_desc = $2,
                service_price = $3,
                service_image = $4,
                applicable_pet_type = $5,
                applicable_pet_gender = $6,
                update_datetime = CURRENT_TIMESTAMP
            WHERE service_id = $7
            `,
            [
                normalizedName,
                String(service_desc || '').trim() || null,
                normalizedPrice,
                service_image || null,
                applicability.type,
                applicability.gender,
                id
            ]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                message: '\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e1a\u0e23\u0e34\u0e01\u0e32\u0e23'
            });
        }

        res.json({ message: '\u0e41\u0e01\u0e49\u0e44\u0e02\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08' });
    } catch (err) {
        console.error('Error Update Service:', err);
        res.status(500).json({
            message: '\u0e40\u0e01\u0e34\u0e14\u0e02\u0e49\u0e2d\u0e1c\u0e34\u0e14\u0e1e\u0e25\u0e32\u0e14\u0e43\u0e19\u0e01\u0e32\u0e23\u0e41\u0e01\u0e49\u0e44\u0e02\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25'
        });
    }
});

router.delete('/:id', auth, async (req, res) => {
    try {
        if (!ensureAdmin(req, res)) return;

        const { id } = req.params;
        const result = await pool.query(
            'DELETE FROM tb_service WHERE service_id = $1',
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                message: '\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e1a\u0e23\u0e34\u0e01\u0e32\u0e23'
            });
        }

        res.json({ message: '\u0e25\u0e1a\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08' });
    } catch (err) {
        console.error('Error Delete Service:', err);
        if (err.code === '23503' || err.code === '23001') {
            return res.status(409).json({
                message: '\u0e44\u0e21\u0e48\u0e2a\u0e32\u0e21\u0e32\u0e23\u0e16\u0e25\u0e1a\u0e1a\u0e23\u0e34\u0e01\u0e32\u0e23\u0e19\u0e35\u0e49\u0e44\u0e14\u0e49 \u0e40\u0e19\u0e37\u0e48\u0e2d\u0e07\u0e08\u0e32\u0e01\u0e21\u0e35\u0e01\u0e32\u0e23\u0e2d\u0e49\u0e32\u0e07\u0e2d\u0e34\u0e07\u0e43\u0e19\u0e23\u0e30\u0e1a\u0e1a'
            });
        }
        res.status(500).json({
            message: '\u0e40\u0e01\u0e34\u0e14\u0e02\u0e49\u0e2d\u0e1c\u0e34\u0e14\u0e1e\u0e25\u0e32\u0e14\u0e43\u0e19\u0e01\u0e32\u0e23\u0e25\u0e1a\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25'
        });
    }
});

module.exports = router;
