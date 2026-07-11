const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const pool = require('../database/db');
const auth = require('./auth.middleware');

const proofUploadDir = path.join(__dirname, '../../../uploads/proofs');
if (!fs.existsSync(proofUploadDir)) {
    fs.mkdirSync(proofUploadDir, { recursive: true });
}

const proofStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, proofUploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `proof-${req.user.user_id}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const uploadProof = multer({ storage: proofStorage });

const RECEIPT_STATUS_UNPAID = '\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e44\u0e14\u0e49\u0e0a\u0e33\u0e23\u0e30';
const RECEIPT_STATUS_PAID = '\u0e0a\u0e33\u0e23\u0e30\u0e40\u0e2a\u0e23\u0e47\u0e08\u0e2a\u0e34\u0e49\u0e19';
const PAY_METHOD_CASH = '\u0e40\u0e07\u0e34\u0e19\u0e2a\u0e14';
const PAY_METHOD_TRANSFER = '\u0e42\u0e2d\u0e19\u0e40\u0e07\u0e34\u0e19';

const ensureAdmin = (req, res) => {
    if (req.user.role !== 'admin') {
        res.status(403).json({
            success: false,
            message: '\u0e44\u0e21\u0e48\u0e21\u0e35\u0e2a\u0e34\u0e17\u0e18\u0e34\u0e4c\u0e40\u0e02\u0e49\u0e32\u0e16\u0e36\u0e07\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e19\u0e35\u0e49'
        });
        return false;
    }
    return true;
};

const normalizeReceiptStatus = (value) => {
    const text = String(value || '').trim().toLowerCase();
    if (!text) return null;
    if (
        text === RECEIPT_STATUS_UNPAID ||
        text === 'unpaid' ||
        text.includes('\u0e04\u0e49\u0e32\u0e07')
    ) {
        return RECEIPT_STATUS_UNPAID;
    }
    if (
        text === RECEIPT_STATUS_PAID ||
        text === 'paid' ||
        text.includes('\u0e40\u0e2a\u0e23\u0e47\u0e08')
    ) {
        return RECEIPT_STATUS_PAID;
    }
    return null;
};

const mapRefTypeToLabel = (refType) => {
    switch (refType) {
        case 'treatment':
            return '\u0e23\u0e31\u0e01\u0e29\u0e32';
        case 'surgery':
            return '\u0e1c\u0e48\u0e32\u0e15\u0e31\u0e14';
        case 'vaccine':
            return '\u0e27\u0e31\u0e04\u0e0b\u0e35\u0e19';
        default:
            return refType || '-';
    }
};

const nextReceiptDetailId = async (dbClient) => {
    const result = await dbClient.query(`
        SELECT detail_id
        FROM tb_receipt_detail
        WHERE detail_id LIKE 'RD%'
        ORDER BY detail_id DESC
        LIMIT 1
    `);

    const lastId = result.rows[0]?.detail_id || 'RD0000000000000';
    const lastNumber = Number(String(lastId).replace(/^RD/, '')) || 0;
    return `RD${String(lastNumber + 1).padStart(13, '0')}`;
};

const buildReceiptDetails = async (dbClient, receiptId, treatmentId) => {
    const existing = await dbClient.query(
        'SELECT COUNT(*)::int AS count FROM tb_receipt_detail WHERE receipt_id = $1',
        [receiptId]
    );

    if (existing.rows[0].count > 0) return;

    const treatmentDetails = await dbClient.query(
        `
        SELECT d.service_id, d.quantity, d.price, s.service_name
        FROM tb_treatment_detail d
        LEFT JOIN tb_service s ON d.service_id = s.service_id
        WHERE d.treatment_id = $1
        ORDER BY d.detail_id ASC
        `,
        [treatmentId]
    );

    for (const item of treatmentDetails.rows) {
        const detailId = await nextReceiptDetailId(dbClient);
        const description = item.service_name || item.service_id || 'service item';
        const amount = Number(item.price || 0) * Number(item.quantity || 0);

        await dbClient.query(
            `
            INSERT INTO tb_receipt_detail (
                detail_id,
                receipt_id,
                ref_id,
                ref_type,
                description,
                amount,
                create_datetime
            )
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            `,
            [detailId, receiptId, treatmentId, 'treatment', description, amount]
        );
    }
};

router.get('/', auth, async (req, res) => {
    try {
        if (!ensureAdmin(req, res)) return;

        const result = await pool.query(`
            SELECT
                r.receipt_id,
                r.issue_date,
                r.total_amount,
                r.payment_status,
                r.pay_method,
                r.pay_date,
                r.proof_image,
                r.treatment_id,
                o.owner_id,
                o.owner_name,
                o.owner_tel,
                p.pet_id,
                p.pet_name
            FROM tb_receipt r
            LEFT JOIN tb_owner o ON r.owner_id = o.owner_id
            LEFT JOIN tb_treatment t ON r.treatment_id = t.treatment_id
            LEFT JOIN tb_pet p ON t.pet_id = p.pet_id
            ORDER BY r.issue_date DESC
        `);

        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('Error fetching receipts:', err);
        res.status(500).json({
            success: false,
            message: '\u0e42\u0e2b\u0e25\u0e14\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e43\u0e1a\u0e40\u0e2a\u0e23\u0e47\u0e08\u0e44\u0e21\u0e48\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08'
        });
    }
});

router.get('/detail/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;

        const receiptResult = await pool.query(
            `
            SELECT
                r.*,
                o.owner_name,
                o.owner_tel,
                o.owner_email,
                p.pet_name,
                p.pet_type,
                p.pet_breed,
                t.symptom,
                t.diagnosis,
                t.treatment_date,
                u.username AS issued_by
            FROM tb_receipt r
            LEFT JOIN tb_owner o ON r.owner_id = o.owner_id
            LEFT JOIN tb_treatment t ON r.treatment_id = t.treatment_id
            LEFT JOIN tb_pet p ON t.pet_id = p.pet_id
            LEFT JOIN tb_user u ON r.user_id = u.user_id
            WHERE r.receipt_id = $1
            `,
            [id]
        );

        if (receiptResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: '\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e43\u0e1a\u0e40\u0e2a\u0e23\u0e47\u0e08'
            });
        }

        const receipt = receiptResult.rows[0];
        if (req.user.role !== 'admin') {
            const ownerResult = await pool.query(
                'SELECT user_id FROM tb_owner WHERE owner_id = $1',
                [receipt.owner_id]
            );
            if (ownerResult.rows.length === 0 || ownerResult.rows[0].user_id !== req.user.user_id) {
                return res.status(403).json({
                    success: false,
                    message: '\u0e44\u0e21\u0e48\u0e21\u0e35\u0e2a\u0e34\u0e17\u0e18\u0e34\u0e4c\u0e40\u0e02\u0e49\u0e32\u0e16\u0e36\u0e07\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e19\u0e35\u0e49'
                });
            }
        }

        let items = [];
        const itemResult = await pool.query(
            `
            SELECT detail_id, receipt_id, ref_id, ref_type, description, amount
            FROM tb_receipt_detail
            WHERE receipt_id = $1
            ORDER BY detail_id ASC
            `,
            [receipt.receipt_id]
        );

        items = itemResult.rows.map((item) => ({
            ...item,
            income_type: mapRefTypeToLabel(item.ref_type)
        }));

        if (items.length === 0 && receipt.treatment_id) {
            const fallbackItems = await pool.query(
                `
                SELECT
                    d.detail_id,
                    '${'\u0e23\u0e31\u0e01\u0e29\u0e32'}' AS income_type,
                    COALESCE(s.service_name, d.service_id, 'service item') AS description,
                    (COALESCE(d.price, 0) * COALESCE(d.quantity, 0)) AS amount
                FROM tb_treatment_detail d
                LEFT JOIN tb_service s ON d.service_id = s.service_id
                WHERE d.treatment_id = $1
                ORDER BY d.detail_id ASC
                `,
                [receipt.treatment_id]
            );
            items = fallbackItems.rows;
        }

        res.json({ success: true, data: { receipt, items } });
    } catch (err) {
        console.error('Error fetching receipt detail:', err);
        res.status(500).json({
            success: false,
            message: '\u0e42\u0e2b\u0e25\u0e14\u0e23\u0e32\u0e22\u0e25\u0e30\u0e40\u0e2d\u0e35\u0e22\u0e14\u0e43\u0e1a\u0e40\u0e2a\u0e23\u0e47\u0e08\u0e44\u0e21\u0e48\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08'
        });
    }
});

router.get('/my-receipts/:user_id', auth, async (req, res) => {
    try {
        const { user_id } = req.params;

        if (req.user.role !== 'admin' && req.user.user_id !== user_id) {
            return res.status(403).json({
                success: false,
                message: '\u0e44\u0e21\u0e48\u0e21\u0e35\u0e2a\u0e34\u0e17\u0e18\u0e34\u0e4c\u0e40\u0e02\u0e49\u0e32\u0e16\u0e36\u0e07\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e19\u0e35\u0e49'
            });
        }

        const result = await pool.query(
            `
            SELECT
                r.receipt_id,
                r.issue_date,
                r.total_amount,
                r.payment_status,
                r.pay_method,
                r.pay_date,
                r.proof_image,
                r.treatment_id
            FROM tb_receipt r
            JOIN tb_owner o ON r.owner_id = o.owner_id
            WHERE o.user_id = $1
            ORDER BY r.issue_date DESC
            `,
            [user_id]
        );

        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('Error fetching user receipts:', err);
        res.status(500).json({
            success: false,
            message: '\u0e14\u0e36\u0e07\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e43\u0e1a\u0e40\u0e2a\u0e23\u0e47\u0e08\u0e44\u0e21\u0e48\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08'
        });
    }
});

router.post('/', auth, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        if (!ensureAdmin(req, res)) {
            await client.query('ROLLBACK');
            return;
        }

        const { treatment_id, pay_method } = req.body;
        if (!treatment_id) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: '\u0e01\u0e23\u0e38\u0e13\u0e32\u0e23\u0e30\u0e1a\u0e38\u0e23\u0e2b\u0e31\u0e2a\u0e01\u0e32\u0e23\u0e23\u0e31\u0e01\u0e29\u0e32'
            });
        }

        const treatmentResult = await client.query(
            `
            SELECT t.total_amount, p.owner_id
            FROM tb_treatment t
            JOIN tb_pet p ON t.pet_id = p.pet_id
            WHERE t.treatment_id = $1
            `,
            [treatment_id]
        );

        if (treatmentResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: '\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e01\u0e32\u0e23\u0e23\u0e31\u0e01\u0e29\u0e32\u0e19\u0e35\u0e49'
            });
        }

        const existingReceipt = await client.query(
            'SELECT * FROM tb_receipt WHERE treatment_id = $1 LIMIT 1',
            [treatment_id]
        );

        if (existingReceipt.rows.length > 0) {
            const receiptRow = existingReceipt.rows[0];
            await buildReceiptDetails(client, receiptRow.receipt_id, treatment_id);
            await client.query('COMMIT');
            return res.json({
                success: true,
                message: '\u0e21\u0e35\u0e43\u0e1a\u0e40\u0e2a\u0e23\u0e47\u0e08\u0e02\u0e2d\u0e07\u0e01\u0e32\u0e23\u0e23\u0e31\u0e01\u0e29\u0e32\u0e19\u0e35\u0e49\u0e41\u0e25\u0e49\u0e27',
                data: receiptRow
            });
        }

        const { total_amount, owner_id } = treatmentResult.rows[0];
        const receiptId = `RC${Date.now()}`;

        await client.query(
            `
            INSERT INTO tb_receipt (
                receipt_id,
                total_amount,
                owner_id,
                user_id,
                treatment_id,
                pay_method
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            `,
            [receiptId, total_amount, owner_id, req.user.user_id, treatment_id, pay_method || null]
        );

        await buildReceiptDetails(client, receiptId, treatment_id);
        const newReceipt = await client.query(
            'SELECT * FROM tb_receipt WHERE receipt_id = $1',
            [receiptId]
        );

        await client.query('COMMIT');
        res.status(201).json({
            success: true,
            message: '\u0e2a\u0e23\u0e49\u0e32\u0e07\u0e43\u0e1a\u0e40\u0e2a\u0e23\u0e47\u0e08\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08',
            data: newReceipt.rows[0]
        });
    } catch (err) {
        try {
            await client.query('ROLLBACK');
        } catch (rollbackErr) {
            console.error('Rollback Create Receipt failed:', rollbackErr);
        }
        console.error('Error Create Receipt:', err);
        res.status(500).json({
            success: false,
            message: '\u0e2a\u0e23\u0e49\u0e32\u0e07\u0e43\u0e1a\u0e40\u0e2a\u0e23\u0e47\u0e08\u0e44\u0e21\u0e48\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08'
        });
    } finally {
        client.release();
    }
});

router.put('/:id/status', auth, async (req, res) => {
    try {
        if (!ensureAdmin(req, res)) return;

        const { id } = req.params;
        const rawStatus = String(req.body.payment_status || '').trim();
        const normalizedStatus = normalizeReceiptStatus(rawStatus) || rawStatus;
        const { pay_method } = req.body;

        if (!rawStatus) {
            return res.status(400).json({
                success: false,
                message: '\u0e2a\u0e16\u0e32\u0e19\u0e30\u0e44\u0e21\u0e48\u0e16\u0e39\u0e01\u0e15\u0e49\u0e2d\u0e07'
            });
        }

        const payDate = normalizedStatus === RECEIPT_STATUS_PAID ? new Date() : null;
        await pool.query(
            `
            UPDATE tb_receipt
            SET payment_status = $1,
                pay_method = COALESCE($2, pay_method),
                pay_date = $3,
                update_datetime = NOW()
            WHERE receipt_id = $4
            `,
            [normalizedStatus, pay_method || null, payDate, id]
        );

        res.json({
            success: true,
            message: '\u0e2d\u0e31\u0e1b\u0e40\u0e14\u0e15\u0e2a\u0e16\u0e32\u0e19\u0e30\u0e01\u0e32\u0e23\u0e0a\u0e33\u0e23\u0e30\u0e40\u0e07\u0e34\u0e19\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08'
        });
    } catch (err) {
        console.error('Error Update Receipt Status:', err);
        res.status(500).json({
            success: false,
            message: '\u0e2d\u0e31\u0e1b\u0e40\u0e14\u0e15\u0e2a\u0e16\u0e32\u0e19\u0e30\u0e44\u0e21\u0e48\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08'
        });
    }
});

router.post('/:id/proof', auth, uploadProof.single('proofImage'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: '\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e44\u0e1f\u0e25\u0e4c'
            });
        }

        const { id } = req.params;
        const imageUrl = `http://localhost:3000/uploads/proofs/${req.file.filename}`;

        await pool.query(
            'UPDATE tb_receipt SET proof_image = $1, update_datetime = NOW() WHERE receipt_id = $2',
            [imageUrl, id]
        );

        res.json({
            success: true,
            imageUrl,
            message: '\u0e2d\u0e31\u0e1b\u0e42\u0e2b\u0e25\u0e14\u0e2b\u0e25\u0e31\u0e01\u0e10\u0e32\u0e19\u0e01\u0e32\u0e23\u0e42\u0e2d\u0e19\u0e40\u0e07\u0e34\u0e19\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08'
        });
    } catch (err) {
        console.error('Error Upload Proof:', err);
        res.status(500).json({
            success: false,
            message: '\u0e2d\u0e31\u0e1b\u0e42\u0e2b\u0e25\u0e14\u0e2b\u0e25\u0e31\u0e01\u0e10\u0e32\u0e19\u0e44\u0e21\u0e48\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08'
        });
    }
});

module.exports = router;
