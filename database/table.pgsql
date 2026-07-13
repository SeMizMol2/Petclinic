CREATE TABLE tb_user (
    user_id VARCHAR(10) PRIMARY KEY,
    username VARCHAR(50),
    password VARCHAR(255),
    user_role user_role_enum
);

CREATE TABLE tb_owner (
  owner_id VARCHAR(20) PRIMARY KEY,
  user_id VARCHAR(20),
  owner_name VARCHAR(100),
  owner_email VARCHAR(100),
  owner_tel VARCHAR(15),
  profile_pic VARCHAR(255),

  CONSTRAINT fk_owner_user
    FOREIGN KEY (user_id)
    REFERENCES tb_user(user_id)
    ON DELETE CASCADE
);

CREATE TABLE tb_pet (
  pet_id VARCHAR(20) PRIMARY KEY,
  owner_id VARCHAR(20),
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

CREATE TABLE tb_appointment (
    appt_id VARCHAR(20) PRIMARY KEY,
    appt_date DATE NOT NULL,
    appt_time TIME NOT NULL,
    appt_reason TEXT,
    cancel_reason TEXT,
    appt_status VARCHAR(20) CHECK (appt_status IN ('ยืนยัน', 'ยกเลิก')) DEFAULT 'ยืนยัน',
    pet_id VARCHAR(20) NOT NULL,
    create_datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_datetime TIMESTAMP,
    
    CONSTRAINT fk_pet
      FOREIGN KEY (pet_id) 
      REFERENCES tb_pet(pet_id)
      ON DELETE CASCADE
);

CREATE TABLE tb_category (
    category_id VARCHAR(5) PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL,
    type VARCHAR(20) CHECK (type IN ('รายรับ', 'รายจ่าย')) NOT NULL,
    create_datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_datetime TIMESTAMP
);

CREATE TABLE tb_expense (
    exp_id VARCHAR(10) PRIMARY KEY,
    exp_title VARCHAR(100) NOT NULL,
    exp_amount DECIMAL(10,2) NOT NULL,
    exp_date DATE NOT NULL,
    category_id VARCHAR(5),
    user_id VARCHAR(20),
    create_datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_datetime TIMESTAMP,
    
    CONSTRAINT fk_expense_category 
        FOREIGN KEY (category_id) 
        REFERENCES tb_category(category_id) 
        ON DELETE SET NULL,
        
    CONSTRAINT fk_expense_user 
        FOREIGN KEY (user_id) 
        REFERENCES tb_user(user_id) 
        ON DELETE SET NULL
);

CREATE TABLE tb_service (
    service_id VARCHAR(10) PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    service_desc TEXT,
    service_price DECIMAL(10,2) NOT NULL,
    service_image VARCHAR(255),
    create_datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_datetime TIMESTAMP
);

CREATE TABLE tb_treatment (
    treatment_id VARCHAR(15) PRIMARY KEY, 
    pet_id VARCHAR(20) NOT NULL,          
    user_id VARCHAR(20),                  
    symptom TEXT,                         
    diagnosis TEXT,                       
    treatment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    total_amount DECIMAL(10,2) DEFAULT 0, 
    
    CONSTRAINT fk_treatment_pet 
        FOREIGN KEY (pet_id) 
        REFERENCES tb_pet(pet_id) 
        ON DELETE CASCADE,
        
    CONSTRAINT fk_treatment_user 
        FOREIGN KEY (user_id) 
        REFERENCES tb_user(user_id) 
        ON DELETE SET NULL
);

CREATE TABLE tb_treatment_detail (
    detail_id SERIAL PRIMARY KEY,
    treatment_id VARCHAR(15) NOT NULL,    
    service_id VARCHAR(10) NOT NULL,      
    quantity INT DEFAULT 1,               
    price DECIMAL(10,2) NOT NULL,         
    
    CONSTRAINT fk_detail_treatment 
        FOREIGN KEY (treatment_id) 
        REFERENCES tb_treatment(treatment_id) 
        ON DELETE CASCADE,
        
    CONSTRAINT fk_detail_service 
        FOREIGN KEY (service_id) 
        REFERENCES tb_service(service_id) 
        ON DELETE RESTRICT 
);

CREATE TABLE tb_receipt (
    receipt_id VARCHAR(15) PRIMARY KEY,
    issue_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_status VARCHAR(20) CHECK (payment_status IN ('ยังไม่ได้ชำระ', 'ชำระเสร็จสิ้น')) DEFAULT 'ยังไม่ได้ชำระ',
    pay_method VARCHAR(50),
    pay_date TIMESTAMP,
    proof_image VARCHAR(255),
    owner_id VARCHAR(20),
    user_id VARCHAR(20),
    treatment_id VARCHAR(15),
    create_datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_datetime TIMESTAMP,

    CONSTRAINT fk_receipt_owner
        FOREIGN KEY (owner_id)
        REFERENCES tb_owner(owner_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_receipt_user
        FOREIGN KEY (user_id)
        REFERENCES tb_user(user_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_receipt_treatment
        FOREIGN KEY (treatment_id)
        REFERENCES tb_treatment(treatment_id)
        ON DELETE RESTRICT
);

CREATE TABLE tb_receipt_detail (
    detail_id VARCHAR(15) PRIMARY KEY,
    receipt_id VARCHAR(15) NOT NULL,
    t_detail_id INTEGER,
    ref_type VARCHAR(50),
    description VARCHAR(255),
    amount DECIMAL(10,2),
    create_datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_datetime TIMESTAMP,

    CONSTRAINT fk_receipt_detail_receipt
        FOREIGN KEY (receipt_id)
        REFERENCES tb_receipt(receipt_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_receipt_detail_treatment_detail
        FOREIGN KEY (t_detail_id)
        REFERENCES tb_treatment_detail(detail_id)
        ON DELETE SET NULL
);
