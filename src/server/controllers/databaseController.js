const mysql = require('mysql2/promise');
const connectionController = require('./connectionController');
const dbService = require('../services/databaseService');

/**
 * Get a database connection
 */
const getConnection = async (connectionId) => {
  if (!connectionId) {
    throw new Error('Missing connectionId parameter');
  }
  
  const connectionDetails = connectionController.getConnectionById(connectionId);
  
  if (!connectionDetails) {
    throw new Error('Connection not found');
  }
  
  const connection = await mysql.createConnection({
    host: connectionDetails.host,
    port: parseInt(connectionDetails.port, 10),
    user: connectionDetails.user,
    password: connectionDetails.password || '',
  });
  
  return connection;
};

/**
 * Get all databases for a connection
 */
exports.getDatabases = async (req, res, next) => {
  try {
    const { connectionId } = req.query;
    const connection = await getConnection(connectionId);
    
    // Query to get all databases
    const [results] = await connection.query(`
      SHOW DATABASES
    `);
    
    // Close connection
    await connection.end();
    
    // Format results
    const databases = results.map(row => ({
      name: row.Database,
    }));
    
    return res.json(databases);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all tables in a database
 */
exports.getTables = async (req, res, next) => {
  try {
    const { database } = req.params;
    const { connectionId } = req.query;
    
    const connection = await getConnection(connectionId);
    
    // Switch to the specified database
    await connection.query(`USE \`${database}\``);
    
    // Query to get all tables
    const [results] = await connection.query(`
      SHOW TABLES
    `);
    
    // Close connection
    await connection.end();
    
    // Format results
    const tables = results.map(row => ({
      name: row[`Tables_in_${database}`],
    }));
    
    return res.json(tables);
  } catch (error) {
    next(error);
  }
};

/**
 * Get columns for a specific table
 */
exports.getColumns = async (req, res, next) => {
  try {
    const { database, table } = req.params;
    const { connectionId } = req.query;
    
    const connection = await getConnection(connectionId);
    
    // Switch to the specified database
    await connection.query(`USE \`${database}\``);
    
    // 获取表的所有字段信息
    const [columns] = await connection.query(`
      SELECT 
        COLUMN_NAME as name,
        COLUMN_TYPE as fullType,
        DATA_TYPE as type,
        CHARACTER_MAXIMUM_LENGTH as length,
        IS_NULLABLE as nullable,
        COLUMN_KEY as \`key\`,
        COLUMN_DEFAULT as defaultValue,
        EXTRA as extra,
        COLUMN_COMMENT as comment
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `, [database, table]);
    
    // Close connection
    await connection.end();
    
    // Format results
    const formattedColumns = columns.map(column => ({
      name: column.name,
      type: column.type.toUpperCase(),
      fullType: column.fullType,
      length: column.length,
      nullable: column.nullable === 'YES',
      key: column.key,
      defaultValue: column.defaultValue,
      extra: column.extra,
      comment: column.comment,
    }));
    
    return res.json(formattedColumns);
  } catch (error) {
    next(error);
  }
};

/**
 * Get data from a specific table
 */
exports.getTableData = async (req, res, next) => {
  try {
    const { database, table } = req.params;
    const { connectionId, limit = 100, offset = 0 } = req.query;
    
    const connection = await getConnection(connectionId);
    
    // Switch to the specified database
    await connection.query(`USE \`${database}\``);
    
    // Query to get data from table
    const [rows, fields] = await connection.query(`
      SELECT * FROM \`${table}\` LIMIT ${parseInt(limit, 10)} OFFSET ${parseInt(offset, 10)}
    `);
    
    // Close connection
    await connection.end();
    
    return res.json({
      rows,
      fields,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get table structure
 */
exports.getTableStructure = async (req, res, next) => {
  try {
    const { database, table } = req.params;
    const { connectionId } = req.query;
    
    const connection = await getConnection(connectionId);
    
    // Switch to the specified database
    await connection.query(`USE \`${database}\``);
    
    // Query to get table structure
    const [results] = await connection.query(`
      DESCRIBE \`${table}\`
    `);
    
    // Close connection
    await connection.end();
    
    // Format results
    const structure = results.map(row => ({
      name: row.Field,
      type: row.Type,
      nullable: row.Null === 'YES',
      key: row.Key,
      default: row.Default,
      extra: row.Extra,
    }));
    
    return res.json(structure);
  } catch (error) {
    next(error);
  }
};

/**
 * Execute a SQL query
 */
exports.executeQuery = async (req, res, next) => {
  try {
    const { database } = req.params;
    const { connectionId, query } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Query is required'
      });
    }
    
    const connection = await getConnection(connectionId);
    
    // Switch to the specified database
    await connection.query(`USE \`${database}\``);
    
    // Execute the query
    const [results, fields] = await connection.query(query);
    
    // Close connection
    await connection.end();
    
    // Check if it's a SELECT query
    if (fields) {
      return res.json({
        rows: results,
        fields,
      });
    }
    
    // For non-SELECT queries (INSERT, UPDATE, DELETE, etc.)
    return res.json({
      affectedRows: results.affectedRows,
      insertId: results.insertId,
      message: `Query executed successfully. ${results.affectedRows} rows affected.`
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: `Error executing query: ${error.message}`
    });
  }
};

/**
 * Get schema information for AI
 */
exports.getSchemaInfo = async (req, res, next) => {
  try {
    const { database } = req.params;
    const { connectionId } = req.query;
    
    const connection = await getConnection(connectionId);
    
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
    
    // Close connection
    await connection.end();
    
    return res.json({
      database,
      tables: tableNames,
      schema: schemaInfo
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all views in a database
 */
exports.getViews = async (req, res, next) => {
  try {
    const { database } = req.params;
    const { connectionId } = req.query;
    
    const connection = await getConnection(connectionId);
    
    // Switch to the specified database
    await connection.query(`USE \`${database}\``);
    
    // Query to get all views
    const [results] = await connection.query(`
      SELECT TABLE_NAME as name
      FROM information_schema.VIEWS
      WHERE TABLE_SCHEMA = ?
    `, [database]);
    
    // Close connection
    await connection.end();
    
    return res.json(results);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all functions in a database
 */
exports.getFunctions = async (req, res, next) => {
  try {
    const { database } = req.params;
    const { connectionId } = req.query;
    
    const connection = await getConnection(connectionId);
    
    // Switch to the specified database
    await connection.query(`USE \`${database}\``);
    
    // Query to get all routines (functions and procedures)
    const [results] = await connection.query(`
      SELECT 
        ROUTINE_NAME as name,
        ROUTINE_TYPE as type
      FROM information_schema.ROUTINES
      WHERE ROUTINE_SCHEMA = ?
    `, [database]);
    
    // Close connection
    await connection.end();
    
    return res.json(results);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all events in a database
 */
exports.getEvents = async (req, res, next) => {
  try {
    const { database } = req.params;
    const { connectionId } = req.query;
    
    const connection = await getConnection(connectionId);
    
    // Switch to the specified database
    await connection.query(`USE \`${database}\``);
    
    // Query to get all events
    const [results] = await connection.query(`
      SELECT 
        EVENT_NAME as name,
        STATUS as status,
        EVENT_TYPE as type,
        EXECUTE_AT as executeAt,
        INTERVAL_VALUE as intervalValue,
        INTERVAL_FIELD as intervalField
      FROM information_schema.EVENTS
      WHERE EVENT_SCHEMA = ?
    `, [database]);
    
    // Close connection
    await connection.end();
    
    return res.json(results);
  } catch (error) {
    next(error);
  }
};

// 获取表的索引
exports.getIndexes = async (req, res) => {
  try {
    const { connectionId } = req.query;
    const { database, table } = req.params;
    const connection = await getConnection(connectionId);

    const [indexes] = await connection.query(`
      SELECT 
        INDEX_NAME as name, 
        COLUMN_NAME as column_name,
        SEQ_IN_INDEX as seq_in_index, 
        INDEX_TYPE as type,
        NON_UNIQUE as non_unique,
        COLLATION as collation,
        CARDINALITY as cardinality
      FROM 
        INFORMATION_SCHEMA.STATISTICS 
      WHERE 
        TABLE_SCHEMA = ? AND 
        TABLE_NAME = ?
      ORDER BY 
        INDEX_NAME, SEQ_IN_INDEX
    `, [database, table]);

    res.json(indexes);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: error.message });
  }
};

// 获取表的外键
exports.getForeignKeys = async (req, res) => {
  try {
    const { connectionId } = req.query;
    const { database, table } = req.params;
    const connection = await getConnection(connectionId);

    const [foreignKeys] = await connection.query(`
      SELECT 
        kcu.CONSTRAINT_NAME as constraint_name,
        kcu.COLUMN_NAME as column_name,
        kcu.REFERENCED_TABLE_NAME as referenced_table_name,
        kcu.REFERENCED_COLUMN_NAME as referenced_column_name,
        rc.UPDATE_RULE as update_rule,
        rc.DELETE_RULE as delete_rule
      FROM 
        INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
      JOIN 
        INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc 
      ON 
        kcu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME AND
        kcu.TABLE_SCHEMA = rc.CONSTRAINT_SCHEMA
      WHERE 
        kcu.TABLE_SCHEMA = ? AND 
        kcu.TABLE_NAME = ? AND
        kcu.REFERENCED_TABLE_NAME IS NOT NULL
      ORDER BY 
        kcu.CONSTRAINT_NAME, kcu.ORDINAL_POSITION
    `, [database, table]);

    res.json(foreignKeys);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: error.message });
  }
};

// 获取表的触发器
exports.getTriggers = async (req, res) => {
  try {
    const { connectionId } = req.query;
    const { database, table } = req.params;
    const connection = await getConnection(connectionId);

    const [triggers] = await connection.query(`
      SELECT 
        TRIGGER_NAME as trigger_name,
        EVENT_MANIPULATION as event_manipulation,
        ACTION_TIMING as action_timing,
        ACTION_STATEMENT as action_statement,
        CREATED as created
      FROM 
        INFORMATION_SCHEMA.TRIGGERS
      WHERE 
        TRIGGER_SCHEMA = ? AND 
        EVENT_OBJECT_TABLE = ?
      ORDER BY 
        TRIGGER_NAME
    `, [database, table]);

    res.json(triggers);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: error.message });
  }
};

// 获取表的约束检查
exports.getChecks = async (req, res) => {
  try {
    const { connectionId } = req.query;
    const { database, table } = req.params;
    const connection = await getConnection(connectionId);

    // MySQL 8.0+ 才支持CHECK约束
    const [checks] = await connection.query(`
      SELECT 
        cc.CONSTRAINT_NAME as constraint_name,
        cc.CHECK_CLAUSE as check_clause,
        'ENABLED' as status
      FROM 
        INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
      JOIN 
        INFORMATION_SCHEMA.CHECK_CONSTRAINTS cc
      ON 
        tc.CONSTRAINT_NAME = cc.CONSTRAINT_NAME AND
        tc.CONSTRAINT_SCHEMA = cc.CONSTRAINT_SCHEMA
      WHERE 
        tc.TABLE_SCHEMA = ? AND 
        tc.TABLE_NAME = ? AND
        tc.CONSTRAINT_TYPE = 'CHECK'
      ORDER BY 
        cc.CONSTRAINT_NAME
    `, [database, table]);

    res.json(checks);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: error.message });
  }
};

// 获取表的注释
exports.getTableComment = async (req, res) => {
  try {
    const { connectionId } = req.query;
    const { database, table } = req.params;
    const connection = await getConnection(connectionId);

    const [result] = await connection.query(`
      SELECT 
        TABLE_COMMENT as comment
      FROM 
        INFORMATION_SCHEMA.TABLES
      WHERE 
        TABLE_SCHEMA = ? AND 
        TABLE_NAME = ?
    `, [database, table]);

    res.json(result[0] || { comment: '' });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: error.message });
  }
};

// 更新表的注释
exports.updateTableComment = async (req, res) => {
  try {
    const { connectionId } = req.query;
    const { database, table } = req.params;
    const { comment } = req.body;
    const connection = await getConnection(connectionId);

    await connection.query(`
      ALTER TABLE \`${database}\`.\`${table}\` 
      COMMENT = ?
    `, [comment]);

    res.json({ success: true });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: error.message });
  }
};

// 获取表的SQL定义
exports.getTableSQL = async (req, res) => {
  try {
    const { connectionId } = req.query;
    const { database, table } = req.params;
    const connection = await getConnection(connectionId);

    const [result] = await connection.query(`
      SHOW CREATE TABLE \`${database}\`.\`${table}\`
    `);

    res.json({ sql: result[0]['Create Table'] });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: error.message });
  }
};

// 插入数据
exports.insertTableData = async (req, res) => {
  try {
    const { connectionId } = req.query;
    const { database, table } = req.params;
    const { data } = req.body;
    const connection = await getConnection(connectionId);

    // 切换到指定数据库
    await connection.query(`USE \`${database}\``);

    // 构建INSERT语句
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map(() => '?').join(', ');

    const [result] = await connection.query(`
      INSERT INTO \`${table}\` (${columns.map(c => `\`${c}\``).join(', ')})
      VALUES (${placeholders})
    `, values);

    res.json({
      success: true,
      insertId: result.insertId,
      message: '数据添加成功'
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: error.message });
  }
};

// 更新数据
exports.updateTableData = async (req, res) => {
  try {
    const { connectionId } = req.query;
    const { database, table } = req.params;
    const { data, where } = req.body;
    const connection = await getConnection(connectionId);

    // 切换到指定数据库
    await connection.query(`USE \`${database}\``);

    // 构建UPDATE语句
    const setClause = Object.entries(data)
      .map(([key, _]) => `\`${key}\` = ?`)
      .join(', ');
    const whereClause = Object.entries(where)
      .map(([key, _]) => `\`${key}\` = ?`)
      .join(' AND ');

    const values = [...Object.values(data), ...Object.values(where)];

    const [result] = await connection.query(`
      UPDATE \`${table}\`
      SET ${setClause}
      WHERE ${whereClause}
    `, values);

    res.json({
      success: true,
      affectedRows: result.affectedRows,
      message: `${result.affectedRows}条数据更新成功`
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: error.message });
  }
};

// 删除数据
exports.deleteTableData = async (req, res) => {
  try {
    const { connectionId } = req.query;
    const { database, table } = req.params;
    const { where } = req.body;
    const connection = await getConnection(connectionId);

    // 切换到指定数据库
    await connection.query(`USE \`${database}\``);

    // 构建DELETE语句
    const whereClause = Object.entries(where)
      .map(([key, _]) => `\`${key}\` = ?`)
      .join(' AND ');

    const values = Object.values(where);

    const [result] = await connection.query(`
      DELETE FROM \`${table}\`
      WHERE ${whereClause}
    `, values);

    res.json({
      success: true,
      affectedRows: result.affectedRows,
      message: `${result.affectedRows}条数据删除成功`
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: error.message });
  }
};

// 导出表数据到Excel
exports.exportTableData = async (req, res) => {
  try {
    const { connectionId } = req.query;
    const { database, table } = req.params;
    const connection = await getConnection(connectionId);

    // 切换到指定数据库
    await connection.query(`USE \`${database}\``);

    // 获取所有数据
    const [rows] = await connection.query(`SELECT * FROM \`${table}\``);
    
    // 获取列信息
    const [columns] = await connection.query(`
      SELECT 
        COLUMN_NAME as name,
        COLUMN_COMMENT as comment
      FROM 
        INFORMATION_SCHEMA.COLUMNS 
      WHERE 
        TABLE_SCHEMA = ? AND 
        TABLE_NAME = ?
      ORDER BY 
        ORDINAL_POSITION
    `, [database, table]);

    res.json({
      success: true,
      data: rows,
      columns: columns,
      filename: `${table}_${new Date().toISOString().split('T')[0]}.xlsx`
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: error.message });
  }
}; 