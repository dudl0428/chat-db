import React, { useState, useEffect } from 'react';
import { Table, Spin, Empty, notification } from 'antd';
import axios from 'axios';

const TableIndexes = ({ connectionId, database, table }) => {
  const [loading, setLoading] = useState(true);
  const [indexes, setIndexes] = useState([]);

  useEffect(() => {
    const fetchIndexes = async () => {
      if (!connectionId || !database || !table) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await axios.get(`/api/database/${database}/tables/${table}/indexes`, {
          params: { connectionId }
        });
        setIndexes(response.data || []);
      } catch (error) {
        console.error('Error fetching table indexes:', error);
        notification.error({
          message: '加载索引失败',
          description: error.response?.data?.message || error.message
        });
        setIndexes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchIndexes();
  }, [connectionId, database, table]);

  const columns = [
    { 
      title: '索引名称', 
      dataIndex: 'name', 
      width: 200 
    },
    { 
      title: '索引类型', 
      dataIndex: 'type', 
      width: 150,
      render: type => {
        switch (type) {
          case 'PRIMARY':
            return '主键';
          case 'UNIQUE':
            return '唯一';
          case 'FULLTEXT':
            return '全文';
          case 'SPATIAL':
            return '空间';
          default:
            return type || '普通';
        }
      }
    },
    { 
      title: '唯一', 
      dataIndex: 'non_unique', 
      width: 100,
      render: nonUnique => nonUnique === 0 ? '是' : '否'
    },
    { 
      title: '列名', 
      dataIndex: 'column_name', 
      width: 200
    },
    { 
      title: '顺序', 
      dataIndex: 'seq_in_index', 
      width: 100
    },
    { 
      title: '排序规则', 
      dataIndex: 'collation', 
      width: 150,
      render: collation => collation === 'A' ? '升序' : 
                          collation === 'D' ? '降序' : 
                          collation || '-'
    },
    { 
      title: '基数', 
      dataIndex: 'cardinality', 
      width: 150
    }
  ];

  if (loading) {
    return <Spin tip="加载索引..." />;
  }

  if (!indexes || indexes.length === 0) {
    return <Empty description="没有找到索引" />;
  }

  return (
    <Table
      columns={columns}
      dataSource={indexes}
      rowKey={(record, index) => `${record.name}_${index}`}
      pagination={false}
      size="small"
      bordered
      className="navicat-table index-table"
    />
  );
};

export default TableIndexes; 