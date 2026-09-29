const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const auth = require('./auth.middleware');

const RECEIPT_STATUS_PAID = '\u0e0a\u0e33\u0e23\u0e30\u0e40\u0e2a\u0e23\u0e47\u0e08\u0e2a\u0e34\u0e49\u0e19';

const ensureAdmin = (req, res) => {
    if (req.user.role !== 'admin') {
        res.status(403).json({ message: '\u0e44\u0e21\u0e48\u0e21\u0e35\u0e2a\u0e34\u0e17\u0e18\u0e34\u0e4c\u0e17\u0e33\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23' });
        return false;
    }
    return true;
};

const nextTreatmentId = async (dbClient) => {
    const result = await dbClient.query(
        `SELECT treatment_id FROM tb_treatment
         WHERE treatment_id ~ '^TR[0-9]+$'
         ORDER BY SUBSTRING(treatment_id FROM 3)::bigint DESC
         LIMIT 1`
    );

    let newId = 'TR001';
    if (result.rows.length > 0) {
        const lastNum = Number.parseInt(result.rows[0].treatment_id.substring(2), 10) + 1;
        newId = `TR${String(lastNum).padStart(3, '0')}`;
    }
    return newId;
};

const normalizePetType = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (['dog', '\u0e2b\u0e21\u0e32', '\u0e2a\u0e38\u0e19\u0e31\u0e02'].includes(normalized)) return 'dog';
    if (['cat', '\u0e41\u0e21\u0e27'].includes(normalized)) return 'cat';
    return normalized ? `other:${normalized}` : '';
};

const normalizePetGender = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (['male', '\u0e1c\u0e39\u0e49', '\u0e40\u0e1e\u0e28\u0e1c\u0e39\u0e49'].includes(normalized)) return 'male';
    if (['female', '\u0e40\u0e21\u0e35\u0e22', '\u0e40\u0e1e\u0e28\u0e40\u0e21\u0e35\u0e22'].includes(normalized)) return 'female';
    return normalized ? `other:${normalized}` : '';
};

const isAllApplicability = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    return !normalized || ['all', '\u0e17\u0e31\u0e49\u0e07\u0e2b\u0e21\u0e14', '\u0e17\u0e38\u0e01\u0e1b\u0e23\u0e30\u0e40\u0e20\u0e17', '\u0e17\u0e38\u0e01\u0e40\u0e1e\u0e28'].includes(normalized);
};

const validateServiceApplicability = async (dbClient, petId, serviceItems) => {
    const petResult = await dbClient.query(
        'SELECT pet_id, pet_name, pet_type, pet_gender FROM tb_pet WHERE pet_id = $1',
        [petId]
    );

    if (petResult.rows.length === 0) {
        return {
            status: 404,
            message: '\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e2a\u0e31\u0e15\u0e27\u0e4c\u0e40\u0e25\u0e35\u0e49\u0e22\u0e07\u0e17\u0e35\u0e48\u0e40\u0e25\u0e37\u0e2d\u0e01'
        };
    }

    const serviceIds = [...new Set(
        (serviceItems || []).map((item) => String(item.service_id || '').trim()).filter(Boolean)
    )];
    if (serviceIds.length === 0) return null;

    const serviceResult = await dbClient.query(
        `
        SELECT service_id, service_name, applicable_pet_type, applicable_pet_gender
        FROM tb_service
        WHERE service_id = ANY($1::varchar[])
        `,
        [serviceIds]
    );

    if (serviceResult.rows.length !== serviceIds.length) {
        return {
            status: 400,
            message: '\u0e1e\u0e1a\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e1a\u0e23\u0e34\u0e01\u0e32\u0e23\u0e17\u0e35\u0e48\u0e44\u0e21\u0e48\u0e21\u0e35\u0e43\u0e19\u0e23\u0e30\u0e1a\u0e1a'
        };
    }

    const pet = petResult.rows[0];
    const petType = normalizePetType(pet.pet_type);
    const petGender = normalizePetGender(pet.pet_gender);
    const incompatible = serviceResult.rows.find((service) => {
        const typeMatches = isAllApplicability(service.applicable_pet_type)
            || normalizePetType(service.applicable_pet_type) === petType;
        const genderMatches = isAllApplicability(service.applicable_pet_gender)
            || normalizePetGender(service.applicable_pet_gender) === petGender;
        return !typeMatches || !genderMatches;
    });

    if (!incompatible) return null;
    return {
        status: 400,
        message: `\u0e1a\u0e23\u0e34\u0e01\u0e32\u0e23 "${incompatible.service_name}" \u0e44\u0e21\u0e48\u0e23\u0e2d\u0e07\u0e23\u0e31\u0e1a ${pet.pet_name} (${pet.pet_type || '-'} / ${pet.pet_gender || '-'})`
    };
};

const isPaidReceiptStatus = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    return normalized === RECEIPT_STATUS_PAID
        || normalized === 'paid'
        || normalized.includes('\u0e0a\u0e33\u0e23\u0e30\u0e41\u0e25\u0e49\u0e27')
        || normalized.includes('\u0e40\u0e2a\u0e23\u0e47\u0e08');
};

const normalizeQuantity = (value) => {
    const quantity = Number(value);
    return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
};

const normalizePrice = (value) => {
    const price = Number(value);
    return Number.isFinite(price) && price >= 0 ? price : 0;
};

const validateTreatmentServices = (services) => {
    if (services == null) return null;
    if (!Array.isArray(services)) return 'รายการบริการต้องเป็นรายการข้อมูล';
    for (const item of services) {
        if (!item || !item.service_id) return 'กรุณาเลือกบริการให้ครบ';
        const quantity = Number(item.quantity);
        const price = Number(item.price);
        if (item.quantity == null || item.quantity === '' || !Number.isInteger(quantity) || quantity <= 0) {
            return 'จำนวนบริการต้องเป็นจำนวนเต็มมากกว่า 0';
        }
        if (item.price == null || item.price === '' || !Number.isFinite(price) || price < 0) {
            return 'ราคาบริการต้องเป็นตัวเลขตั้งแต่ 0 บาทขึ้นไป';
        }
    }
    return null;
};

const calculateServicesTotal = (services) => (services || []).reduce(
    (total, item) => total + (normalizePrice(item.price) * normalizeQuantity(item.quantity)),
    0
);

const hasFinancialChanges = (currentTreatment, currentDetails, submittedPetId, submittedServices) => {
    if (String(currentTreatment.pet_id) !== String(submittedPetId)) return true;

    if (currentDetails.length !== (submittedServices || []).length) return true;

    const currentById = new Map(
        currentDetails.map((item) => [Number(item.detail_id), item])
    );

    return (submittedServices || []).some((item) => {
        const current = currentById.get(Number(item.detail_id));
        if (!current) return true;
        return String(current.service_id) !== String(item.service_id)
            || Number(current.quantity || 0) !== normalizeQuantity(item.quantity)
            || Math.abs(Number(current.price || 0) - normalizePrice(item.price)) > 0.009;
    });
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

const syncUnpaidReceipt = async (dbClient, receipt, treatmentId, petId, totalAmount) => {
    await dbClient.query('SELECT pg_advisory_xact_lock(74018, 1)');
    const ownerResult = await dbClient.query(
        'SELECT owner_id FROM tb_pet WHERE pet_id = $1',
        [petId]
    );

    await dbClient.query(
        `
        UPDATE tb_receipt
        SET total_amount = $1,
            owner_id = $2,
            update_datetime = NOW()
        WHERE receipt_id = $3
        `,
        [totalAmount, ownerResult.rows[0]?.owner_id || null, receipt.receipt_id]
    );

    const details = await dbClient.query(
        `
        SELECT d.detail_id AS t_detail_id, d.service_id, d.quantity, d.price, s.service_name
        FROM tb_treatment_detail d
        LEFT JOIN tb_service s ON d.service_id = s.service_id
        WHERE d.treatment_id = $1
        ORDER BY d.detail_id ASC
        `,
        [treatmentId]
    );

    for (const item of details.rows) {
        const detailId = await nextReceiptDetailId(dbClient);
        await dbClient.query(
            `
            INSERT INTO tb_receipt_detail (
                detail_id,
                receipt_id,
                t_detail_id,
                ref_type,
                description,
                amount,
                create_datetime
            )
            VALUES ($1, $2, $3, 'treatment', $4, $5, NOW())
            `,
            [
                detailId,
                receipt.receipt_id,
                item.t_detail_id,
                item.service_name || item.service_id || 'service item',
                Number(item.price || 0) * Number(item.quantity || 0)
            ]
        );
    }
};

router.get('/pets', auth, async (req, res) => {
    try {
        if (!ensureAdmin(req, res)) return;

        const pets = await pool.query(`
            SELECT p.pet_id, p.pet_name, p.pet_type, p.pet_gender, o.owner_name
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
        if (!ensureAdmin(req, res)) return;

        const services = await pool.query(
            `
            SELECT
                service_id,
                service_name,
                service_price,
                service_type,
                applicable_pet_type,
                applicable_pet_gender
            FROM tb_service
            ORDER BY service_id ASC
            `
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
                r.receipt_id,
                r.payment_status,
                r.pay_method,
                p.pet_name,
                o.owner_name,
                u.username AS doctor_name,
                v.vet_name
            FROM tb_treatment t
            JOIN tb_pet p ON t.pet_id = p.pet_id
            JOIN tb_owner o ON p.owner_id = o.owner_id
            LEFT JOIN tb_user u ON t.user_id = u.user_id
            LEFT JOIN tb_veterinarian v ON t.vet_id = v.vet_id
            LEFT JOIN tb_receipt r ON t.treatment_id = r.treatment_id
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

        const { pet_id, vet_id, symptom, diagnosis, services } = req.body;
        const user_id = req.user.user_id;

        if (!pet_id) {
            return res.status(400).json({ message: '\u0e01\u0e23\u0e38\u0e13\u0e32\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e2a\u0e31\u0e15\u0e27\u0e4c\u0e40\u0e25\u0e35\u0e49\u0e22\u0e07' });
        }

        const servicesError = validateTreatmentServices(services);
        if (servicesError) return res.status(400).json({ message: servicesError });

        const applicabilityError = await validateServiceApplicability(client, pet_id, services);
        if (applicabilityError) {
            return res.status(applicabilityError.status).json({ message: applicabilityError.message });
        }

        await client.query('BEGIN');
        await client.query('SELECT pg_advisory_xact_lock(74018, 2)');
        const newTrId = await nextTreatmentId(client);
        const calculatedTotal = calculateServicesTotal(services);

        await client.query(
            `
            INSERT INTO tb_treatment (treatment_id, pet_id, user_id, vet_id, symptom, diagnosis, total_amount)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            `,
            [newTrId, pet_id, user_id, vet_id || null, symptom || null, diagnosis || null, calculatedTotal]
        );

        for (const item of services || []) {
            await client.query(
                `
                INSERT INTO tb_treatment_detail (treatment_id, service_id, quantity, price)
                VALUES ($1, $2, $3, $4)
                `,
                [newTrId, item.service_id, normalizeQuantity(item.quantity), normalizePrice(item.price)]
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
        const { pet_id, vet_id, symptom, diagnosis, services } = req.body;

        if (!pet_id) {
            return res.status(400).json({ message: '\u0e01\u0e23\u0e38\u0e13\u0e32\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e2a\u0e31\u0e15\u0e27\u0e4c\u0e40\u0e25\u0e35\u0e49\u0e22\u0e07' });
        }

        const servicesError = validateTreatmentServices(services);
        if (servicesError) return res.status(400).json({ message: servicesError });

        await client.query('BEGIN');

        const currentTreatmentResult = await client.query(
            `
            SELECT treatment_id, pet_id, total_amount
            FROM tb_treatment
            WHERE treatment_id = $1
            FOR UPDATE
            `,
            [id]
        );

        if (currentTreatmentResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: '\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e01\u0e32\u0e23\u0e23\u0e31\u0e01\u0e29\u0e32' });
        }

        const receiptResult = await client.query(
            `
            SELECT receipt_id, payment_status, total_amount
            FROM tb_receipt
            WHERE treatment_id = $1
            LIMIT 1
            FOR UPDATE
            `,
            [id]
        );
        const receipt = receiptResult.rows[0] || null;

        const currentDetailsResult = await client.query(
            `
            SELECT detail_id, service_id, quantity, price
            FROM tb_treatment_detail
            WHERE treatment_id = $1
            ORDER BY detail_id ASC
            `,
            [id]
        );

        if (
            receipt
            && isPaidReceiptStatus(receipt.payment_status)
            && hasFinancialChanges(
                currentTreatmentResult.rows[0],
                currentDetailsResult.rows,
                pet_id,
                services
            )
        ) {
            await client.query('ROLLBACK');
            return res.status(409).json({
                message: '\u0e43\u0e1a\u0e40\u0e2a\u0e23\u0e47\u0e08\u0e0a\u0e33\u0e23\u0e30\u0e41\u0e25\u0e49\u0e27 \u0e44\u0e21\u0e48\u0e2a\u0e32\u0e21\u0e32\u0e23\u0e16\u0e40\u0e1b\u0e25\u0e35\u0e48\u0e22\u0e19\u0e2a\u0e31\u0e15\u0e27\u0e4c\u0e40\u0e25\u0e35\u0e49\u0e22\u0e07 \u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e1a\u0e23\u0e34\u0e01\u0e32\u0e23 \u0e08\u0e33\u0e19\u0e27\u0e19 \u0e2b\u0e23\u0e37\u0e2d\u0e23\u0e32\u0e04\u0e32\u0e44\u0e14\u0e49'
            });
        }

        if (receipt && isPaidReceiptStatus(receipt.payment_status)) {
            await client.query(
                `
                UPDATE tb_treatment
                SET vet_id = $1,
                    symptom = $2,
                    diagnosis = $3
                WHERE treatment_id = $4
                `,
                [vet_id || null, symptom || null, diagnosis || null, id]
            );

            await client.query('COMMIT');
            return res.json({
                message: '\u0e41\u0e01\u0e49\u0e44\u0e02\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e01\u0e32\u0e23\u0e23\u0e31\u0e01\u0e29\u0e32\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08 \u0e42\u0e14\u0e22\u0e04\u0e07\u0e22\u0e2d\u0e14\u0e43\u0e1a\u0e40\u0e2a\u0e23\u0e47\u0e08\u0e17\u0e35\u0e48\u0e0a\u0e33\u0e23\u0e30\u0e41\u0e25\u0e49\u0e27\u0e44\u0e27\u0e49',
                financial_locked: true
            });
        }

        const applicabilityError = await validateServiceApplicability(client, pet_id, services);
        if (applicabilityError) {
            await client.query('ROLLBACK');
            return res.status(applicabilityError.status).json({ message: applicabilityError.message });
        }

        if (receipt) {
            await client.query(
                'DELETE FROM tb_receipt_detail WHERE receipt_id = $1',
                [receipt.receipt_id]
            );
        }

        const calculatedTotal = calculateServicesTotal(services);
        await client.query(
            `
            UPDATE tb_treatment
            SET pet_id = $1,
                vet_id = $2,
                symptom = $3,
                diagnosis = $4,
                total_amount = $5
            WHERE treatment_id = $6
            `,
            [pet_id, vet_id || null, symptom || null, diagnosis || null, calculatedTotal, id]
        );

        const existingDetailIds = new Set(currentDetailsResult.rows.map((row) => Number(row.detail_id)));
        const retainedDetailIds = [];

        for (const item of services || []) {
            const detailId = Number(item.detail_id);

            if (Number.isInteger(detailId) && existingDetailIds.has(detailId)) {
                await client.query(
                    `
                    UPDATE tb_treatment_detail
                    SET service_id = $1,
                        quantity = $2,
                        price = $3
                    WHERE detail_id = $4
                      AND treatment_id = $5
                    `,
                    [
                        item.service_id,
                        normalizeQuantity(item.quantity),
                        normalizePrice(item.price),
                        detailId,
                        id
                    ]
                );
                retainedDetailIds.push(detailId);
                continue;
            }

            const insertResult = await client.query(
                `
                INSERT INTO tb_treatment_detail (treatment_id, service_id, quantity, price)
                VALUES ($1, $2, $3, $4)
                RETURNING detail_id
                `,
                [id, item.service_id, normalizeQuantity(item.quantity), normalizePrice(item.price)]
            );
            retainedDetailIds.push(Number(insertResult.rows[0].detail_id));
        }

        if (retainedDetailIds.length > 0) {
            await client.query(
                `
                DELETE FROM tb_treatment_detail
                WHERE treatment_id = $1
                  AND NOT (detail_id = ANY($2::int[]))
                `,
                [id, retainedDetailIds]
            );
        } else {
            await client.query('DELETE FROM tb_treatment_detail WHERE treatment_id = $1', [id]);
        }

        if (receipt) {
            await syncUnpaidReceipt(client, receipt, id, pet_id, calculatedTotal);
        }

        await client.query('COMMIT');
        res.json({
            message: receipt
                ? '\u0e41\u0e01\u0e49\u0e44\u0e02\u0e01\u0e32\u0e23\u0e23\u0e31\u0e01\u0e29\u0e32\u0e41\u0e25\u0e30\u0e2d\u0e31\u0e1b\u0e40\u0e14\u0e15\u0e43\u0e1a\u0e40\u0e2a\u0e23\u0e47\u0e08\u0e04\u0e49\u0e32\u0e07\u0e0a\u0e33\u0e23\u0e30\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08'
                : '\u0e41\u0e01\u0e49\u0e44\u0e02\u0e01\u0e32\u0e23\u0e23\u0e31\u0e01\u0e29\u0e32\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08',
            receipt_synced: Boolean(receipt)
        });
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
        const treatment = await client.query(
            'SELECT treatment_id FROM tb_treatment WHERE treatment_id = $1 FOR UPDATE',
            [req.params.id]
        );
        if (treatment.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'ไม่พบข้อมูลการรักษา' });
        }

        const receipt = await client.query(
            'SELECT receipt_id FROM tb_receipt WHERE treatment_id = $1 LIMIT 1',
            [req.params.id]
        );
        if (receipt.rowCount > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ message: 'การรักษานี้มีใบเสร็จแล้ว จึงลบไม่ได้ หากข้อมูลไม่ถูกต้องให้แก้ไขรายการการรักษาแทน' });
        }

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
        if (!ensureAdmin(req, res)) return;

        const history = await pool.query(`
            SELECT
                t.treatment_id,
                t.treatment_date,
                t.symptom,
                t.diagnosis,
                t.total_amount,
                t.pet_id,
                t.vet_id,
                r.receipt_id,
                r.payment_status,
                r.pay_method,
                p.pet_name,
                o.owner_name,
                u.username AS doctor_name,
                v.vet_name
            FROM tb_treatment t
            JOIN tb_pet p ON t.pet_id = p.pet_id
            JOIN tb_owner o ON p.owner_id = o.owner_id
            LEFT JOIN tb_user u ON t.user_id = u.user_id
            LEFT JOIN tb_veterinarian v ON t.vet_id = v.vet_id
            LEFT JOIN tb_receipt r ON t.treatment_id = r.treatment_id
            ORDER BY t.treatment_date DESC
        `);
        res.json(history.rows);
    } catch (err) {
        console.error('Error fetching history:', err);
        res.status(500).json({ message: 'Error fetching history' });
    }
});

module.exports = router;
