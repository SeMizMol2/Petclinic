const protectedRecordMessage = 'ไม่สามารถลบได้ เนื่องจากมีประวัตินัดหมาย การรักษา วัคซีน ผ่าตัด หรือเอกสารการชำระเงินที่ต้องเก็บไว้';

const lockPet = async (client, petId, ownerId = null) => {
  const result = await client.query(
    `SELECT pet_id FROM tb_pet
     WHERE pet_id = $1 AND ($2::varchar IS NULL OR owner_id = $2)
     FOR UPDATE`,
    [petId, ownerId]
  );
  return result.rowCount > 0;
};

const petHasHistory = async (client, petId) => {
  const result = await client.query(
    `SELECT
       EXISTS (SELECT 1 FROM tb_appointment WHERE pet_id = $1)
       OR EXISTS (SELECT 1 FROM tb_treatment WHERE pet_id = $1)
       OR EXISTS (SELECT 1 FROM tb_surgery WHERE pet_id = $1)
       OR EXISTS (SELECT 1 FROM tb_vaccine_rec WHERE pet_id = $1)
       AS protected`,
    [petId]
  );
  return result.rows[0].protected;
};

const lockOwnerAndCheckHistory = async (client, ownerId) => {
  const owner = await client.query(
    'SELECT owner_id, user_id FROM tb_owner WHERE owner_id = $1 FOR UPDATE',
    [ownerId]
  );
  if (!owner.rowCount) return { found: false, protected: false };

  await client.query(
    'SELECT pet_id FROM tb_pet WHERE owner_id = $1 ORDER BY pet_id FOR UPDATE',
    [ownerId]
  );
  const result = await client.query(
    `SELECT
       EXISTS (SELECT 1 FROM tb_receipt WHERE owner_id = $1)
       OR EXISTS (
         SELECT 1 FROM tb_pet p WHERE p.owner_id = $1 AND (
           EXISTS (SELECT 1 FROM tb_appointment WHERE pet_id = p.pet_id)
           OR EXISTS (SELECT 1 FROM tb_treatment WHERE pet_id = p.pet_id)
           OR EXISTS (SELECT 1 FROM tb_surgery WHERE pet_id = p.pet_id)
           OR EXISTS (SELECT 1 FROM tb_vaccine_rec WHERE pet_id = p.pet_id)
         )
       ) AS protected`,
    [ownerId]
  );
  return {
    found: true,
    userId: owner.rows[0].user_id,
    protected: result.rows[0].protected
  };
};

module.exports = {
  protectedRecordMessage,
  lockPet,
  petHasHistory,
  lockOwnerAndCheckHistory
};
