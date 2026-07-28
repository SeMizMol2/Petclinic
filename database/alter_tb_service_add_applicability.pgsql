ALTER TABLE tb_service
    ADD COLUMN IF NOT EXISTS applicable_pet_type VARCHAR(20) NOT NULL DEFAULT 'ทั้งหมด',
    ADD COLUMN IF NOT EXISTS applicable_pet_gender VARCHAR(20) NOT NULL DEFAULT 'ทั้งหมด';

UPDATE tb_service
SET applicable_pet_type = 'สุนัข'
WHERE applicable_pet_type = 'ทั้งหมด'
  AND (service_name ILIKE '%สุนัข%' OR service_name ILIKE '%หมา%');

UPDATE tb_service
SET applicable_pet_type = 'แมว'
WHERE applicable_pet_type = 'ทั้งหมด'
  AND service_name ILIKE '%แมว%';

COMMENT ON COLUMN tb_service.applicable_pet_type
    IS 'ประเภทสัตว์ที่ใช้บริการได้: ทั้งหมด, สุนัข, แมว';

COMMENT ON COLUMN tb_service.applicable_pet_gender
    IS 'เพศสัตว์ที่ใช้บริการได้: ทั้งหมด, ผู้, เมีย';
