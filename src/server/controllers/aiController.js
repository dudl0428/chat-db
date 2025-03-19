const { OpenAI } = require('openai');
const connectionController = require('./connectionController');
const deepseekService = require('../services/deepseekService');
const connectionService = require('../services/connectionService');

// Initialize OpenAI client
let openai;
try {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
} catch (error) {
  console.error('Failed to initialize OpenAI:', error);
}

class AIController {
  async generateSQL(req, res) {
    try {
      const { prompt, connectionId, database } = req.body;
      
      if (!prompt || !connectionId || !database) {
        return res.status(400).json({ 
          error: 'Missing required parameters: prompt, connectionId, and database are required' 
        });
      }

      // 获取数据库schema
      const schema = await connectionService.getDatabaseSchema(connectionId, database);
      
      // 生成SQL
      const sql = await deepseekService.generateSQL(prompt, schema);
      
      // 验证生成的SQL
      const validation = await deepseekService.validateSQL(sql, schema);

      res.json({
        sql,
        validation
      });
    } catch (error) {
      console.error('Error in SQL generation:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async executeGeneratedSQL(req, res) {
    try {
      const { sql, connectionId, database } = req.body;
      
      if (!sql || !connectionId || !database) {
        return res.status(400).json({ 
          error: 'Missing required parameters: sql, connectionId, and database are required' 
        });
      }

      // 执行SQL查询
      const result = await connectionService.executeQuery(connectionId, database, sql);
      
      res.json({
        result
      });
    } catch (error) {
      console.error('Error executing SQL:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new AIController(); 