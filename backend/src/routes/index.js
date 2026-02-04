const express = require('express');
const router = express.Router();

const petRoutes = require('./pet.routes');
const authRoutes = require('./auth.routes');

router.use('/pets', petRoutes);
router.use('/auth', authRoutes);
router.use('/test', require('./test.routes'));

module.exports = router;
