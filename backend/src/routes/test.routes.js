const express = require('express');
const router = express.Router();
const auth = require('./auth.middleware');

router.get('/', auth, (req, res) => {
  res.json({
    message: 'เข้าถึงได้',
    user: req.user
  });
});

module.exports = router;
