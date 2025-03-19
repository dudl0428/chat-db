/**
 * DatabaseService provides utilities for database operations
 */

/**
 * Format SQL result fields
 */
exports.formatFields = (fields) => {
  return fields.map(field => ({
    name: field.name,
    type: field.type,
    flags: field.flags,
  }));
};

/**
 * Escape database identifiers safely
 */
exports.escapeIdentifier = (identifier) => {
  return `\`${identifier.replace(/`/g, '``')}\``;
};

/**
 * Format schema info for AI context
 */
exports.formatSchemaForAI = (schema) => {
  let result = '';
  
  Object.entries(schema).forEach(([tableName, columns]) => {
    result += `Table: ${tableName}\n`;
    result += `Columns:\n`;
    
    columns.forEach(col => {
      result += `- ${col.name}: ${col.type}`;
      
      if (col.key) {
        result += ` (${col.key})`;
      }
      
      if (!col.nullable) {
        result += ` NOT NULL`;
      }
      
      if (col.default !== null) {
        result += ` DEFAULT ${col.default}`;
      }
      
      result += `\n`;
    });
    
    result += `\n`;
  });
  
  return result;
}; 