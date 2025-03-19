import React, { useState, useEffect } from 'react';
import { Spin, Card, Button, notification, Space, Typography } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import { Editor } from '@monaco-editor/react';
import axios from 'axios';

const { Title } = Typography;

const TableSQLPreview = ({ connectionId, database, table }) => {
  const [loading, setLoading] = useState(true);
  const [sql, setSql] = useState('');

  useEffect(() => {
    const fetchSQLPreview = async () => {
      if (!connectionId || !database || !table) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await axios.get(`/api/database/${database}/tables/${table}/sql`, {
          params: { connectionId }
        });
        setSql(response.data?.sql || '-- 无法生成SQL语句');
      } catch (error) {
        console.error('Error fetching SQL preview:', error);
        notification.error({
          message: '加载SQL预览失败',
          description: error.response?.data?.message || error.message
        });
        setSql('-- 无法获取SQL预览: ' + (error.response?.data?.message || error.message));
      } finally {
        setLoading(false);
      }
    };

    fetchSQLPreview();
  }, [connectionId, database, table]);

  const handleCopySQL = () => {
    if (!sql) return;
    
    navigator.clipboard.writeText(sql)
      .then(() => {
        notification.success({
          message: '复制成功',
          description: 'SQL已复制到剪贴板'
        });
      })
      .catch(err => {
        console.error('无法复制到剪贴板:', err);
        notification.error({
          message: '复制失败',
          description: '无法复制到剪贴板'
        });
      });
  };

  if (loading) {
    return <Spin tip="加载SQL预览..." />;
  }

  return (
    <Card bordered={false}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space style={{ justifyContent: 'space-between', width: '100%' }}>
          <Title level={5}>建表SQL语句</Title>
          <Button 
            type="primary" 
            icon={<CopyOutlined />} 
            onClick={handleCopySQL}
            disabled={!sql}
          >
            复制
          </Button>
        </Space>
        <div style={{ border: '1px solid #d9d9d9', borderRadius: '2px' }}>
          <Editor
            height="400px"
            language="sql"
            theme="vs-dark"
            value={sql}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 12
            }}
          />
        </div>
      </Space>
    </Card>
  );
};

export default TableSQLPreview; 