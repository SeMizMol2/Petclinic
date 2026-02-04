const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: 'ไม่พบ token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // เก็บ user ไว้ใช้ต่อ
    next();
  } catch (err) {
    return res.status(401).json({ message: 'token ไม่ถูกต้อง' });
  }
};
