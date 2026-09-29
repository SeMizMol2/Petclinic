const jwt = require('jsonwebtoken');
const pool = require('../database/db');

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: 'ไม่พบ token' });
  }

  const token = authHeader.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return res.status(401).json({ message: 'กรุณาเข้าสู่ระบบใหม่' });

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ message: 'token ไม่ถูกต้อง' });
  }

  if (decoded.system_admin === true) {
    const systemAdminId = process.env.ADMIN_USER_ID || 'admin_001';
    if (decoded.user_id !== systemAdminId || !process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ message: 'บัญชีผู้ใช้ไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่' });
    }
    try {
      const existing = await pool.query('SELECT 1 FROM tb_user WHERE user_id = $1', [systemAdminId]);
      if (existing.rowCount) return res.status(401).json({ message: 'สิทธิ์ของบัญชีเปลี่ยนไป กรุณาเข้าสู่ระบบใหม่' });
      req.user = { user_id: systemAdminId, role: 'admin', system_admin: true };
      return next();
    } catch (err) {
      console.error('Check system admin identity failed:', err);
      return res.status(503).json({ message: 'ตรวจสอบสิทธิ์ไม่สำเร็จ กรุณาลองอีกครั้ง' });
    }
  }

  try {
    const result = await pool.query('SELECT user_role FROM tb_user WHERE user_id = $1', [decoded.user_id]);
    if (!result.rowCount) {
      return res.status(401).json({ message: 'ไม่พบบัญชีผู้ใช้ กรุณาเข้าสู่ระบบใหม่' });
    }
    const currentRole = result.rows[0].user_role;
    if (decoded.role !== currentRole) {
      return res.status(401).json({ message: 'สิทธิ์ของบัญชีเปลี่ยนไป กรุณาเข้าสู่ระบบใหม่' });
    }
    req.user = { user_id: decoded.user_id, role: currentRole };
    return next();
  } catch (err) {
    console.error('Check current user role failed:', err);
    return res.status(503).json({ message: 'ตรวจสอบสิทธิ์ไม่สำเร็จ กรุณาลองอีกครั้ง' });
  }
};
