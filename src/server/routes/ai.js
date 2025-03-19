const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// 生成SQL查询
router.post('/generate-sql', aiController.generateSQL);

// 执行生成的SQL查询
router.post('/execute-sql', aiController.executeGeneratedSQL);

module.exports = router; 