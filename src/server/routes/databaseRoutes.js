const express = require('express');
const databaseController = require('../controllers/databaseController');

const router = express.Router();

// Get all databases for a connection
router.get('/', databaseController.getDatabases);

// Get tables for a specific database
router.get('/:database/tables', databaseController.getTables);

// Get views for a specific database
router.get('/:database/views', databaseController.getViews);

// Get functions and procedures for a specific database
router.get('/:database/functions', databaseController.getFunctions);

// Get events for a specific database
router.get('/:database/events', databaseController.getEvents);

// Get columns for a specific table
router.get('/:database/tables/:table/columns', databaseController.getColumns);

// Get data from a specific table
router.get('/:database/tables/:table/data', databaseController.getTableData);

// Get structure of a specific table
router.get('/:database/tables/:table/structure', databaseController.getTableStructure);

// Execute a SQL query
router.post('/:database/query', databaseController.executeQuery);

// Get schema info for AI
router.get('/:database/schema', databaseController.getSchemaInfo);

// 获取表结构
router.get('/:database/tables/:table/columns', (req, res, next) => {
  databaseController.getColumns(req, res, next);
});

// 获取表数据
router.get('/:database/tables/:table/data', (req, res, next) => {
  databaseController.getTableData(req, res, next);
});

// 获取表的索引
router.get('/:database/tables/:table/indexes', (req, res, next) => {
  databaseController.getIndexes(req, res, next);
});

// 获取表的外键
router.get('/:database/tables/:table/foreign-keys', (req, res, next) => {
  databaseController.getForeignKeys(req, res, next);
});

// 获取表的触发器
router.get('/:database/tables/:table/triggers', (req, res, next) => {
  databaseController.getTriggers(req, res, next);
});

// 获取表的约束检查
router.get('/:database/tables/:table/checks', (req, res, next) => {
  databaseController.getChecks(req, res, next);
});

// 获取表的注释
router.get('/:database/tables/:table/comment', (req, res, next) => {
  databaseController.getTableComment(req, res, next);
});

// 更新表的注释
router.post('/:database/tables/:table/comment', (req, res, next) => {
  databaseController.updateTableComment(req, res, next);
});

// 获取表的SQL定义
router.get('/:database/tables/:table/sql', (req, res, next) => {
  databaseController.getTableSQL(req, res, next);
});

// 执行SQL查询
router.post('/:database/query', databaseController.executeQuery);

// 新增数据
router.post('/:database/tables/:table/data', (req, res, next) => {
  databaseController.insertTableData(req, res, next);
});

// 更新数据
router.put('/:database/tables/:table/data', (req, res, next) => {
  databaseController.updateTableData(req, res, next);
});

// 删除数据
router.delete('/:database/tables/:table/data', (req, res, next) => {
  databaseController.deleteTableData(req, res, next);
});

// 导出数据
router.get('/:database/tables/:table/export', (req, res, next) => {
  databaseController.exportTableData(req, res, next);
});

module.exports = router; 