const express = require('express');
const aiController = require('../controllers/aiController');

const router = express.Router();

// Generate SQL from natural language
router.post('/generate-sql', aiController.generateSQL);

module.exports = router; 