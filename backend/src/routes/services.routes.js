const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const auth = require('./auth.middleware');

router.get('/', auth, async (req, res) => {
    try {
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
        const { service_name, service_desc, service_price } = req.body;

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
            INSERT INTO tb_service (service_id, service_name, service_desc, service_price)
            VALUES ($1, $2, $3, $4)
            `,
            [newId, service_name, service_desc, service_price]
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
        const { id } = req.params;
        const { service_name, service_desc, service_price } = req.body;

        const result = await pool.query(
            `
            UPDATE tb_service
            SET service_name = $1,
                service_desc = $2,
                service_price = $3,
                update_datetime = CURRENT_TIMESTAMP
            WHERE service_id = $4
            `,
            [service_name, service_desc, service_price, id]
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
