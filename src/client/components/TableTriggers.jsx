import React, { useState, useEffect } from 'react';
import { Table, Spin, Empty, notification } from 'antd';
import axios from 'axios';

const TableTriggers = ({ connectionId, database, table }) => {
  const [loading, setLoading] = useState(true);
  const [triggers, setTriggers] = useState([]);

  useEffect(() => {
    const fetchTriggers = async () => {
      if (!connectionId || !database || !table) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await axios.get(`/api/database/${database}/tables/${table}/triggers`, {
          params: { connectionId }
        });
        setTriggers(response.data || []);
      } catch (error) {
        console.error('Error fetching triggers:', error);
        notification.error({
          message: '加载触发器失败',
          description: error.response?.data?.message || error.message
        });
        setTriggers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTriggers();
  }, [connectionId, database, table]);

  const columns = [
    { 
      title: '触发器名称', 
      dataIndex: 'trigger_name', 
      width: 200 
    },
    { 
      title: '触发事件', 
      dataIndex: 'event_manipulation', 
      width: 150,
      render: event => {
        switch(event) {
          case 'INSERT': return '插入';
          case 'UPDATE': return '更新';
          case 'DELETE': return '删除';
          default: return event;
        }
      }
    },
    { 
      title: '触发时机', 
      dataIndex: 'action_timing', 
      width: 150,
      render: timing => {
        switch(timing) {
          case 'BEFORE': return '之前';
          case 'AFTER': return '之后';
          default: return timing;
        }
      }
    },
    { 
      title: '定义', 
      dataIndex: 'action_statement', 
      ellipsis: true
    },
    { 
      title: '创建时间', 
      dataIndex: 'created', 
      width: 200
    }
  ];

  if (loading) {
    return <Spin tip="加载触发器..." />;
  }

  if (!triggers || triggers.length === 0) {
    return <Empty description="没有找到触发器" />;
  }

  return (
    <Table
      columns={columns}
      dataSource={triggers}
      rowKey={(record, index) => `${record.trigger_name}_${index}`}
      pagination={false}
      size="small"
      bordered
      className="navicat-table trigger-table"
    />
  );
};

export default TableTriggers; 