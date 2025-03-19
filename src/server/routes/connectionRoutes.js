const express = require('express');
const connectionController = require('../controllers/connectionController');

const router = express.Router();

// Test a database connection
router.post('/test', connectionController.testConnection);

// Create a new connection
router.post('/', connectionController.createConnection);

// Get all saved connections
router.get('/', connectionController.getConnections);

module.exports = router; 