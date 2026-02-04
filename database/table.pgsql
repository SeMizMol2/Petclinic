CREATE TABLE tb_user (
    user_id VARCHAR(10) PRIMARY KEY,
    username VARCHAR(50),
    password VARCHAR(255),
    user_role user_role_enum
);

CREATE TABLE tb_owner (
  owner_id VARCHAR(10) PRIMARY KEY,
  user_id VARCHAR(10),
  owner_name VARCHAR(100),
  owner_address TEXT,
  owner_tel VARCHAR(15),

  CONSTRAINT fk_owner_user
    FOREIGN KEY (user_id)
    REFERENCES tb_user(user_id)
    ON DELETE CASCADE
);

CREATE TABLE tb_pet (
  pet_id VARCHAR(10) PRIMARY KEY,
  owner_id VARCHAR(10),
  pet_name VARCHAR(50),
  pet_type VARCHAR(20),
  pet_breed VARCHAR(50),
  pet_gender pet_gender_enum,
  sterile_status sterile_status_enum,
  pet_color VARCHAR(50),
  pet_birthdate DATE,
  drug_allergy TEXT,

  CONSTRAINT fk_pet_owner
    FOREIGN KEY (owner_id)
    REFERENCES tb_owner(owner_id)
    ON DELETE CASCADE
);