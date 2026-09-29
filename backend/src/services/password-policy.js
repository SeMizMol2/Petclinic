const passwordValidationMessage = (password) => {
  if (typeof password !== 'string') return 'รหัสผ่านต้องเป็นข้อความ';
  if (Array.from(password).length < 8 || !password.trim() || Buffer.byteLength(password, 'utf8') > 72) {
    return 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร และไม่เกิน 72 ไบต์';
  }
  return null;
};

module.exports = { passwordValidationMessage };
