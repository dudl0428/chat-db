import React, { useState, useEffect } from 'react';
import { Typography, Spin, Input, Button, notification, Space, Card } from 'antd';
import axios from 'axios';

const { TextArea } = Input;
const { Title } = Typography;

const TableComment = ({ connectionId, database, table }) => {
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [initialComment, setInitialComment] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchComment = async () => {
      if (!connectionId || !database || !table) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await axios.get(`/api/database/${database}/tables/${table}/comment`, {
          params: { connectionId }
        });
        const tableComment = response.data?.comment || '';
        setComment(tableComment);
        setInitialComment(tableComment);
      } catch (error) {
        console.error('Error fetching table comment:', error);
        notification.error({
          message: '加载表注释失败',
          description: error.response?.data?.message || error.message
        });
      } finally {
        setLoading(false);
      }
    };

    fetchComment();
  }, [connectionId, database, table]);

  const handleSaveComment = async () => {
    if (!connectionId || !database || !table) return;

    try {
      setSaving(true);
      await axios.post(`/api/database/${database}/tables/${table}/comment`, {
        connectionId,
        comment
      });
      setInitialComment(comment);
      notification.success({
        message: '保存成功',
        description: '表注释已成功更新'
      });
    } catch (error) {
      console.error('Error saving table comment:', error);
      notification.error({
        message: '保存表注释失败',
        description: error.response?.data?.message || error.message
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Spin tip="加载表注释..." />;
  }

  return (
    <Card bordered={false}>
      <Title level={5}>表注释</Title>
      <Space direction="vertical" style={{ width: '100%' }}>
        <TextArea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="在此输入表注释..."
          autoSize={{ minRows: 4, maxRows: 8 }}
        />
        <div style={{ marginTop: 16 }}>
          <Button 
            type="primary" 
            onClick={handleSaveComment}
            loading={saving}
            disabled={comment === initialComment}
          >
            保存
          </Button>
        </div>
      </Space>
    </Card>
  );
};

export default TableComment; 