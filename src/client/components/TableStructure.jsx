import React, { useState, useEffect } from 'react';
import { Table, Tabs, Spin } from 'antd';
import { KeyOutlined } from '@ant-design/icons';
import axios from 'axios';

const { TabPane } = Tabs;

const TableStructure = ({ database, table, connectionId }) => {
  const [loading, setLoading] = useState(true);
  const [columns, setColumns] = useState([]);

  useEffect(() => {
    const fetchTableStructure = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `/api/database/${database}/tables/${table}/columns`,
          { params: { connectionId } }
        );
        setColumns(response.data);
      } catch (error) {
        console.error('Error fetching table structure:', error);
      } finally {
        setLoading(false);
      }
    };

    if (database && table && connectionId) {
      fetchTableStructure();
    }
  }, [database, table, connectionId]);

  const structureColumns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text, record) => (
        <span>
          {record.key === 'PRI' && <KeyOutlined style={{ color: '#faad14', marginRight: 8 }} />}
          {text}
        </span>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
    },
    {
      title: '长度',
      dataIndex: 'length',
      key: 'length',
      width: 80,
    },
    {
      title: '小数点',
      dataIndex: 'decimals',
      key: 'decimals',
      width: 80,
    },
    {
      title: '不是 Null',
      dataIndex: 'nullable',
      key: 'nullable',
      width: 100,
      render: (nullable) => !nullable ? '✓' : '',
    },
    {
      title: '虚拟',
      dataIndex: 'virtual',
      key: 'virtual',
      width: 80,
      render: (_, record) => record.extra.includes('VIRTUAL') ? '✓' : '',
    },
    {
      title: '键',
      dataIndex: 'key',
      key: 'key',
      width: 80,
      render: (key) => {
        switch (key) {
          case 'PRI':
            return '主键';
          case 'UNI':
            return '唯一';
          case 'MUL':
            return '索引';
          default:
            return '';
        }
      },
    },
    {
      title: '注释',
      dataIndex: 'comment',
      key: 'comment',
      ellipsis: true,
    },
  ];

  return (
    <Spin spinning={loading}>
      <Tabs defaultActiveKey="structure">
        <TabPane tab="字段" key="structure">
          <Table
            columns={structureColumns}
            dataSource={columns}
            rowKey="name"
            pagination={false}
            size="middle"
            bordered
          />
        </TabPane>
        <TabPane tab="索引" key="indexes">
          {/* 索引信息将在后续实现 */}
        </TabPane>
        <TabPane tab="外键" key="foreignKeys">
          {/* 外键信息将在后续实现 */}
        </TabPane>
      </Tabs>
    </Spin>
  );
};

export default TableStructure; 