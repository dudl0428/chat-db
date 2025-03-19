import React, { useState, useEffect } from 'react';
import { Table, Spin, Empty, notification } from 'antd';
import axios from 'axios';

const TableForeignKeys = ({ connectionId, database, table }) => {
  const [loading, setLoading] = useState(true);
  const [foreignKeys, setForeignKeys] = useState([]);

  useEffect(() => {
    const fetchForeignKeys = async () => {
      if (!connectionId || !database || !table) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await axios.get(`/api/database/${database}/tables/${table}/foreign-keys`, {
          params: { connectionId }
        });
        setForeignKeys(response.data || []);
      } catch (error) {
        console.error('Error fetching foreign keys:', error);
        notification.error({
          message: '加载外键失败',
          description: error.response?.data?.message || error.message
        });
        setForeignKeys([]);
      } finally {
        setLoading(false);
      }
    };

    fetchForeignKeys();
  }, [connectionId, database, table]);

  const columns = [
    { 
      title: '约束名称', 
      dataIndex: 'constraint_name', 
      width: 200 
    },
    { 
      title: '主表名', 
      dataIndex: 'referenced_table_name', 
      width: 200
    },
    { 
      title: '主表列', 
      dataIndex: 'referenced_column_name', 
      width: 200
    },
    { 
      title: '外键列', 
      dataIndex: 'column_name', 
      width: 200
    },
    { 
      title: '更新规则', 
      dataIndex: 'update_rule', 
      width: 150
    },
    { 
      title: '删除规则', 
      dataIndex: 'delete_rule', 
      width: 150
    }
  ];

  if (loading) {
    return <Spin tip="加载外键..." />;
  }

  if (!foreignKeys || foreignKeys.length === 0) {
    return <Empty description="没有找到外键" />;
  }

  return (
    <Table
      columns={columns}
      dataSource={foreignKeys}
      rowKey={(record, index) => `${record.constraint_name}_${index}`}
      pagination={false}
      size="small"
      bordered
      className="navicat-table fk-table"
    />
  );
};

export default TableForeignKeys; 