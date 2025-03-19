import React, { useState, useEffect } from 'react';
import { Table, Spin, Empty, notification } from 'antd';
import axios from 'axios';

const TableChecks = ({ connectionId, database, table }) => {
  const [loading, setLoading] = useState(true);
  const [checks, setChecks] = useState([]);

  useEffect(() => {
    const fetchChecks = async () => {
      if (!connectionId || !database || !table) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await axios.get(`/api/database/${database}/tables/${table}/checks`, {
          params: { connectionId }
        });
        setChecks(response.data || []);
      } catch (error) {
        console.error('Error fetching check constraints:', error);
        notification.error({
          message: '加载CHECK约束失败',
          description: error.response?.data?.message || error.message
        });
        setChecks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchChecks();
  }, [connectionId, database, table]);

  const columns = [
    { 
      title: '约束名称', 
      dataIndex: 'constraint_name', 
      width: 200 
    },
    { 
      title: '检查条件', 
      dataIndex: 'check_clause', 
      ellipsis: true
    },
    { 
      title: '状态', 
      dataIndex: 'status', 
      width: 100,
      render: status => status === 'ENABLED' ? '启用' : '禁用'
    }
  ];

  if (loading) {
    return <Spin tip="加载CHECK约束..." />;
  }

  if (!checks || checks.length === 0) {
    return <Empty description="没有找到CHECK约束" />;
  }

  return (
    <Table
      columns={columns}
      dataSource={checks}
      rowKey={(record, index) => `${record.constraint_name}_${index}`}
      pagination={false}
      size="small"
      bordered
      className="navicat-table check-table"
    />
  );
};

export default TableChecks; 