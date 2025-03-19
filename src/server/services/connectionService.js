/**
 * ConnectionService provides utilities for database connections
 */

const mysql = require('mysql2/promise');

/**
 * Test a MySQL connection with the provided credentials
 */
exports.testConnection = async ({ host, port, user, password }) => {
  let connection;
  try {
    connection = await mysql.createConnection({
      host,
      port: parseInt(port, 10),
      user,
      password: password || '',
      connectTimeout: 10000, // 10 seconds timeout
    });
    
    await connection.connect();
    
    return { success: true };
  } catch (error) {
    console.error('Database connection error:', error);
    return { 
      success: false, 
      error: error.message 
    };
  } finally {
    if (connection) {
      try {
        await connection.end();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
}; 

/**
 * Get database schema for AI operations
 */
exports.getDatabaseSchema = async (connectionId, database) => {
  const connectionController = require('../controllers/connectionController');
  let connection;
  
  try {
    // Get connection details
    const connectionDetails = connectionController.getConnectionById(connectionId);
    
    if (!connectionDetails) {
      throw new Error('Connection not found');
    }
    
    // Create connection
    connection = await mysql.createConnection({
      host: connectionDetails.host,
      port: parseInt(connectionDetails.port, 10),
      user: connectionDetails.user,
      password: connectionDetails.password || '',
    });
    
    // Switch to the specified database
    await connection.query(`USE \`${database}\``);
    
    // Get all tables
    const [tables] = await connection.query(`
      SHOW TABLES
    `);
    
    const tableNames = tables.map(row => row[`Tables_in_${database}`]);
    
    // Get schema for each table
    const schemaInfo = {};
    
    for (const tableName of tableNames) {
      // Get columns
      const [columns] = await connection.query(`
        DESCRIBE \`${tableName}\`
      `);
      
      // Store columns information
      schemaInfo[tableName] = columns.map(col => ({
        name: col.Field,
        type: col.Type,
        nullable: col.Null === 'YES',
        key: col.Key,
        default: col.Default,
        extra: col.Extra,
      }));
    }
    
    return {
      database,
      tables: tableNames,
      schema: schemaInfo
    };
  } catch (error) {
    console.error('Error fetching database schema:', error);
    throw error;
  } finally {
    if (connection) {
      try {
        await connection.end();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
}; 

/**
 * Execute a SQL query on a specific database
 */
exports.executeQuery = async (connectionId, database, query) => {
  const connectionController = require('../controllers/connectionController');
  let connection;
  
  try {
    // Get connection details
    const connectionDetails = connectionController.getConnectionById(connectionId);
    
    if (!connectionDetails) {
      throw new Error('Connection not found');
    }
    
    // Create connection
    connection = await mysql.createConnection({
      host: connectionDetails.host,
      port: parseInt(connectionDetails.port, 10),
      user: connectionDetails.user,
      password: connectionDetails.password || '',
    });
    
    // Switch to the specified database
    await connection.query(`USE \`${database}\``);
    
    // Execute the query
    const [results, fields] = await connection.query(query);
    
    // For SELECT queries
    if (fields) {
      return {
        rows: results,
        fields,
      };
    }
    
    // For non-SELECT queries (INSERT, UPDATE, DELETE, etc.)
    return {
      affectedRows: results.affectedRows,
      insertId: results.insertId,
      message: `Query executed successfully. ${results.affectedRows} rows affected.`
    };
  } catch (error) {
    console.error('Error executing query:', error);
    throw error;
  } finally {
    if (connection) {
      try {
        await connection.end();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
}; 