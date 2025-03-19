import React, { useState } from 'react';
import { Input, Button, Space, Card, Table, message, Spin } from 'antd';
import axios from 'axios';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { vs2015 } from 'react-syntax-highlighter/dist/esm/styles/hljs';

const { TextArea } = Input;

const AIQueryPanel = ({ connectionId, database }) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [sql, setSQL] = useState('');
  const [queryResult, setQueryResult] = useState(null);
  const [validation, setValidation] = useState(null);

  const handleGenerateSQL = async () => {
    try {
      setLoading(true);
      const response = await axios.post('/api/ai/generate-sql', {
        prompt,
        connectionId,
        database
      });

      setSQL(response.data.sql);
      setValidation(response.data.validation);
      setQueryResult(null);
    } catch (error) {
      message.error('生成SQL失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteSQL = async () => {
    try {
      setLoading(true);
      const response = await axios.post('/api/ai/execute-sql', {
        sql,
        connectionId,
        database
      });

      setQueryResult(response.data.result);
      message.success('查询执行成功');
    } catch (error) {
      message.error('执行SQL失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderValidation = () => {
    if (!validation) return null;

    return (
      <Card title="SQL验证结果" size="small" style={{ marginTop: 16 }}>
        <div style={{ color: validation.isValid ? '#52c41a' : '#ff4d4f' }}>
          {validation.isValid ? '✓ SQL语句有效' : '⚠ SQL语句可能存在问题'}
        </div>
        {validation.errors && validation.errors.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div>错误：</div>
            <ul>
              {validation.errors.map((error, index) => (
                <li key={index} style={{ color: '#ff4d4f' }}>{error}</li>
              ))}
            </ul>
          </div>
        )}
        {validation.suggestions && validation.suggestions.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div>建议：</div>
            <ul>
              {validation.suggestions.map((suggestion, index) => (
                <li key={index}>{suggestion}</li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    );
  };

  const renderQueryResult = () => {
    if (!queryResult) return null;

    const columns = Object.keys(queryResult[0] || {}).map(key => ({
      title: key,
      dataIndex: key,
      key: key,
    }));

    return (
      <Card title="查询结果" size="small" style={{ marginTop: 16 }}>
        <Table
          dataSource={queryResult}
          columns={columns}
          size="small"
          scroll={{ x: true }}
        />
      </Card>
    );
  };

  return (
    <Spin spinning={loading}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Card title="AI 查询助手" size="small">
          <Space direction="vertical" style={{ width: '100%' }}>
            <TextArea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="请输入你的查询需求，例如：查询所有用户的姓名和邮箱"
              autoSize={{ minRows: 3, maxRows: 6 }}
            />
            <Button type="primary" onClick={handleGenerateSQL}>
              生成 SQL
            </Button>
          </Space>
        </Card>

        {sql && (
          <Card title="生成的 SQL" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <SyntaxHighlighter language="sql" style={vs2015}>
                {sql}
              </SyntaxHighlighter>
              <Button type="primary" onClick={handleExecuteSQL}>
                执行 SQL
              </Button>
            </Space>
          </Card>
        )}

        {renderValidation()}
        {renderQueryResult()}
      </Space>
    </Spin>
  );
};

export default AIQueryPanel; 