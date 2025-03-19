const mysql = require('mysql2/promise');
const connectionService = require('../services/connectionService');

// In-memory store for active connections (in a real app, this would use Redis or similar)
const activeConnections = {};

/**
 * Test a database connection
 */
exports.testConnection = async (req, res) => {
  try {
    const { host, port, user, password, type } = req.body;
    
    if (type !== 'mysql') {
      return res.status(400).json({
        success: false,
        message: '目前仅支持 MySQL 数据库连接'
      });
    }
    
    if (!host || !port || !user) {
      return res.status(400).json({
        success: false,
        message: '缺少必要的连接参数'
      });
    }

    // Test connection
    const result = await connectionService.testConnection({
      host,
      port,
      user,
      password
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: `连接失败: ${result.error}`
      });
    }
    
    // Generate a unique ID and save the connection
    const id = `conn-${Date.now()}`;
    const connectionInfo = {
      id,
      name: req.body.name || `${host}:${port}`,
      host,
      port,
      user,
      password,
      type,
      createdAt: new Date()
    };
    
    // Save the connection
    activeConnections[id] = connectionInfo;
    
    return res.json({
      success: true,
      message: '连接成功',
      connection: {
        ...connectionInfo,
        password: undefined // Don't return password
      }
    });
  } catch (error) {
    console.error('Connection test error:', error);
    return res.status(400).json({
      success: false,
      message: `连接失败: ${error.message}`
    });
  }
};

/**
 * Create a new connection and store it
 */
exports.createConnection = async (req, res, next) => {
  try {
    const { name, host, port, user, password, type } = req.body;
    
    // Generate a unique ID
    const id = `conn-${Date.now()}`;
    
    // Store the connection
    const connection = {
      id,
      name: name || `${host}:${port}`,
      host,
      port,
      user,
      password,
      type,
      createdAt: new Date()
    };
    
    // In a real app, this would be saved to a database
    activeConnections[id] = connection;
    
    return res.status(201).json({
      success: true,
      connection: {
        ...connection,
        password: undefined // Don't return password
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all saved connections
 */
exports.getConnections = async (req, res, next) => {
  try {
    // In a real app, this would fetch from a database
    const connections = Object.values(activeConnections).map(conn => ({
      ...conn,
      password: undefined // Don't return passwords
    }));
    
    return res.json(connections);
  } catch (error) {
    next(error);
  }
};

/**
 * Get a connection by ID (internal use)
 */
exports.getConnectionById = (id) => {
  return activeConnections[id] || null;
}; 