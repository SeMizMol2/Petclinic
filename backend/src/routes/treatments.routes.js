const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const auth = require('./auth.middleware');

const ensureAdmin = (req, res) => {
    if (req.user.role !== 'admin') {
        res.status(403).json({ message: '\u0e44\u0e21\u0e48\u0e21\u0e35\u0e2a\u0e34\u0e17\u0e18\u0e34\u0e4c\u0e17\u0e33\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23' });
        return false;
    }
    return true;
};

const nextTreatmentId = async (dbClient) => {
    const result = await dbClient.query(
        'SELECT treatment_id FROM tb_treatment ORDER BY treatment_id DESC LIMIT 1'
    );

    let newId = 'TR001';
    if (result.rows.length > 0) {
        const lastNum = Number.parseInt(result.rows[0].treatment_id.substring(2), 10) + 1;
        newId = `TR${String(lastNum).padStart(3, '0')}`;
    }
    return newId;
};

router.get('/pets', auth, async (req, res) => {
    try {
        const pets = await pool.query(`
            SELECT p.pet_id, p.pet_name, o.owner_name
            FROM tb_pet p
            LEFT JOIN tb_owner o ON p.owner_id = o.owner_id
            ORDER BY p.pet_id DESC
        `);
        res.json(pets.rows);
    } catch (err) {
        console.error('Error fetching pets:', err);
        res.status(500).json({ message: 'Error fetching pets' });
    }
});

router.get('/services', auth, async (req, res) => {
    try {
        const services = await pool.query(
            'SELECT service_id, service_name, service_price FROM tb_service ORDER BY service_id ASC'
        );
        res.json(services.rows);
    } catch (err) {
        console.error('Error fetching services:', err);
        res.status(500).json({ message: 'Error fetching services' });
    }
});

router.get('/:id', auth, async (req, res) => {
    try {
        if (!ensureAdmin(req, res)) return;

        const treatmentResult = await pool.query(
            `
            SELECT
                t.treatment_id,
                t.treatment_date,
                t.pet_id,
                t.user_id,
                t.vet_id,
                t.symptom,
                t.diagnosis,
                t.total_amount,
                p.pet_name,
                o.owner_name,
                u.username AS doctor_name,
                v.vet_name
            FROM tb_treatment t
            JOIN tb_pet p ON t.pet_id = p.pet_id
            JOIN tb_owner o ON p.owner_id = o.owner_id
            LEFT JOIN tb_user u ON t.user_id = u.user_id
            LEFT JOIN tb_veterinarian v ON t.vet_id = v.vet_id
            WHERE t.treatment_id = $1
            `,
            [req.params.id]
        );

        if (treatmentResult.rows.length === 0) {
            return res.status(404).json({ message: '\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e01\u0e32\u0e23\u0e23\u0e31\u0e01\u0e29\u0e32' });
        }

        const detailsResult = await pool.query(
            `
            SELECT
                d.detail_id,
                d.service_id,
                d.quantity,
                d.price,
                s.service_name
            FROM tb_treatment_detail d
            LEFT JOIN tb_service s ON d.service_id = s.service_id
            WHERE d.treatment_id = $1
            ORDER BY d.detail_id ASC
            `,
            [req.params.id]
        );

        res.json({
            ...treatmentResult.rows[0],
            services: detailsResult.rows
        });
    } catch (err) {
        console.error('Error fetching treatment detail:', err);
        res.status(500).json({ message: 'Error fetching treatment detail' });
    }
});

router.post('/', auth, async (req, res) => {
    const client = await pool.connect();
    try {
        if (!ensureAdmin(req, res)) return;

        const { pet_id, vet_id, symptom, diagnosis, services, total_amount } = req.body;
        const user_id = req.user.user_id;

        if (!pet_id) {
            return res.status(400).json({ message: '\u0e01\u0e23\u0e38\u0e13\u0e32\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e2a\u0e31\u0e15\u0e27\u0e4c\u0e40\u0e25\u0e35\u0e49\u0e22\u0e07' });
        }

        await client.query('BEGIN');
        const newTrId = await nextTreatmentId(client);

        await client.query(
            `
            INSERT INTO tb_treatment (treatment_id, pet_id, user_id, vet_id, symptom, diagnosis, total_amount)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            `,
            [newTrId, pet_id, user_id, vet_id || null, symptom || null, diagnosis || null, total_amount || 0]
        );

        for (const item of services || []) {
            await client.query(
                `
                INSERT INTO tb_treatment_detail (treatment_id, service_id, quantity, price)
                VALUES ($1, $2, $3, $4)
                `,
                [newTrId, item.service_id, item.quantity || 1, item.price || 0]
            );
        }

        await client.query('COMMIT');
        res.status(201).json({
            message: '\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e01\u0e32\u0e23\u0e23\u0e31\u0e01\u0e29\u0e32\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08',
            treatment_id: newTrId
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Transaction Error:', err);
        res.status(500).json({ message: '\u0e40\u0e01\u0e34\u0e14\u0e02\u0e49\u0e2d\u0e1c\u0e34\u0e14\u0e1e\u0e25\u0e32\u0e14\u0e43\u0e19\u0e01\u0e32\u0e23\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25' });
    } finally {
        client.release();
    }
});

router.put('/:id', auth, async (req, res) => {
    const client = await pool.connect();
    try {
        if (!ensureAdmin(req, res)) return;

        const { id } = req.params;
        const { pet_id, vet_id, symptom, diagnosis, services, total_amount } = req.body;

        if (!pet_id) {
            return res.status(400).json({ message: '\u0e01\u0e23\u0e38\u0e13\u0e32\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e2a\u0e31\u0e15\u0e27\u0e4c\u0e40\u0e25\u0e35\u0e49\u0e22\u0e07' });
        }

        await client.query('BEGIN');

        const updateResult = await client.query(
            `
            UPDATE tb_treatment
            SET pet_id = $1,
                vet_id = $2,
                symptom = $3,
                diagnosis = $4,
                total_amount = $5,
                update_datetime = NOW()
            WHERE treatment_id = $6
            `,
            [pet_id, vet_id || null, symptom || null, diagnosis || null, total_amount || 0, id]
        );

        if (updateResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: '\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e01\u0e32\u0e23\u0e23\u0e31\u0e01\u0e29\u0e32' });
        }

        await client.query('DELETE FROM tb_treatment_detail WHERE treatment_id = $1', [id]);

        for (const item of services || []) {
            await client.query(
                `
                INSERT INTO tb_treatment_detail (treatment_id, service_id, quantity, price)
                VALUES ($1, $2, $3, $4)
                `,
                [id, item.service_id, item.quantity || 1, item.price || 0]
            );
        }

        await client.query('COMMIT');
        res.json({ message: '\u0e41\u0e01\u0e49\u0e44\u0e02\u0e01\u0e32\u0e23\u0e23\u0e31\u0e01\u0e29\u0e32\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Update Treatment Error:', err);
        res.status(500).json({ message: '\u0e41\u0e01\u0e49\u0e44\u0e02\u0e01\u0e32\u0e23\u0e23\u0e31\u0e01\u0e29\u0e32\u0e44\u0e21\u0e48\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08' });
    } finally {
        client.release();
    }
});

router.delete('/:id', auth, async (req, res) => {
    const client = await pool.connect();
    try {
        if (!ensureAdmin(req, res)) return;

        await client.query('BEGIN');
        await client.query('DELETE FROM tb_treatment_detail WHERE treatment_id = $1', [req.params.id]);
        const result = await client.query(
            'DELETE FROM tb_treatment WHERE treatment_id = $1',
            [req.params.id]
        );

        if (result.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: '\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e01\u0e32\u0e23\u0e23\u0e31\u0e01\u0e29\u0e32' });
        }

        await client.query('COMMIT');
        res.json({ message: '\u0e25\u0e1a\u0e01\u0e32\u0e23\u0e23\u0e31\u0e01\u0e29\u0e32\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Delete Treatment Error:', err);
        res.status(500).json({ message: '\u0e25\u0e1a\u0e01\u0e32\u0e23\u0e23\u0e31\u0e01\u0e29\u0e32\u0e44\u0e21\u0e48\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08' });
    } finally {
        client.release();
    }
});

router.get('/', auth, async (req, res) => {
    try {
        const history = await pool.query(`
            SELECT
                t.treatment_id,
                t.treatment_date,
                t.symptom,
                t.diagnosis,
                t.total_amount,
                t.pet_id,
                t.vet_id,
                p.pet_name,
                o.owner_name,
                u.username AS doctor_name,
                v.vet_name
            FROM tb_treatment t
            JOIN tb_pet p ON t.pet_id = p.pet_id
            JOIN tb_owner o ON p.owner_id = o.owner_id
            LEFT JOIN tb_user u ON t.user_id = u.user_id
            LEFT JOIN tb_veterinarian v ON t.vet_id = v.vet_id
            ORDER BY t.treatment_date DESC
        `);
        res.json(history.rows);
    } catch (err) {
        console.error('Error fetching history:', err);
        res.status(500).json({ message: 'Error fetching history' });
    }
});

module.exports = router;
